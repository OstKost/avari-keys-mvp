package telegram_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/telegram"
)

func setupTestStorage(t *testing.T) (*storage.Storage, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "tg-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := storage.NewSQLiteStorage(dbPath)
	if err != nil {
		t.Fatalf("failed to create sqlite storage: %v", err)
	}
	return store, func() {
		_ = store.Close()
		_ = os.RemoveAll(tmpDir)
	}
}

func TestTelegramBotSendMessageAndAlerts(t *testing.T) {
	var sentMessages []map[string]any
	var mu sync.Mutex

	// Mock Telegram API Server
	mockTG := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()

		if strings.Contains(r.URL.Path, "sendMessage") {
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			sentMessages = append(sentMessages, payload)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"ok": true, "result": {"message_id": 123}}`))
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok": true, "result": []}`))
	}))
	defer mockTG.Close()

	store, cleanup := setupTestStorage(t)
	defer cleanup()

	ctx := context.Background()
	_ = store.SaveTelegramChat(ctx, models.TelegramChat{
		ChatID:        999,
		Username:      "tester",
		FirstName:     "Tester",
		IsAdmin:       true,
		AlertsEnabled: true,
	})

	cfg := telegram.Config{
		APIURL:      mockTG.URL,
		Token:       "dummy_token",
		BotUsername: "TestElfBot",
		Storage:     store,
	}

	bot := telegram.NewBot(cfg)
	if !bot.IsEnabled() {
		t.Fatalf("expected bot to be enabled with token")
	}

	// 1. Test Node Down Notification
	node := models.Node{
		ID:          1,
		Name:        "NL Cascade",
		Type:        "cascade",
		CountryCode: "NLD",
		APIURL:      "https://node1.example.com",
	}

	bot.NotifyNodeDown(node, "connection timeout")

	// 2. Test Node Recovered Notification
	bot.NotifyNodeRecovered(node, 42)

	// 3. Test New User Notification
	user := models.User{
		ID:        7,
		Username:  "gandalf",
		CreatedAt: time.Now(),
	}
	bot.NotifyNewUser(user)
}

func TestTelegramBotSecurityAndLinking(t *testing.T) {
	var sentMessages []map[string]any
	var mu sync.Mutex

	mockTG := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()

		if strings.Contains(r.URL.Path, "sendMessage") {
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			sentMessages = append(sentMessages, payload)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"ok": true, "result": {"message_id": 123}}`))
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok": true, "result": []}`))
	}))
	defer mockTG.Close()

	store, cleanup := setupTestStorage(t)
	defer cleanup()

	ctx := context.Background()

	// Create test user and activate them
	user, err := store.CreateUser(ctx, "aragorn", "sword123")
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}
	_ = store.SetUserActive(ctx, user.ID, true)

	// Generate a link token for the user
	linkToken, err := store.GetOrCreateTelegramLinkToken(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get link token: %v", err)
	}

	cfg := telegram.Config{
		APIURL:      mockTG.URL,
		Token:       "secret_token_123",
		BotUsername: "AvariElfBot",
		AdminSecret: "AdminAccessSecretCode",
		Storage:     store,
	}
	bot := telegram.NewBot(cfg)

	// Helper to get last sent message text
	getLastMessageText := func() string {
		mu.Lock()
		defer mu.Unlock()
		if len(sentMessages) == 0 {
			return ""
		}
		return sentMessages[len(sentMessages)-1]["text"].(string)
	}

	unknownChatID := int64(100200300)

	// 1. Unknown user sends /start without token -> must receive decoy "Привет! Как дела?"
	bot.ProcessMessage(ctx, unknownChatID, "stranger", "Stranger", "/start")
	if getLastMessageText() != "Привет! Как дела?" {
		t.Fatalf("expected decoy response 'Привет! Как дела?', got: %q", getLastMessageText())
	}

	// 2. Unknown user sends /status -> must receive decoy "Привет! Как дела?"
	bot.ProcessMessage(ctx, unknownChatID, "stranger", "Stranger", "/status")
	if getLastMessageText() != "Привет! Как дела?" {
		t.Fatalf("expected decoy response 'Привет! Как дела?', got: %q", getLastMessageText())
	}

	// 3. Unknown user sends /billing -> must receive decoy "Привет! Как дела?"
	bot.ProcessMessage(ctx, unknownChatID, "stranger", "Stranger", "/billing")
	if getLastMessageText() != "Привет! Как дела?" {
		t.Fatalf("expected decoy response 'Привет! Как дела?', got: %q", getLastMessageText())
	}

	// 4. Unknown user sends /help or random text -> must receive decoy "Привет! Как дела?"
	bot.ProcessMessage(ctx, unknownChatID, "stranger", "Stranger", "Привет, ты бот?")
	if getLastMessageText() != "Привет! Как дела?" {
		t.Fatalf("expected decoy response 'Привет! Как дела?', got: %q", getLastMessageText())
	}

	// 5. Unknown user sends /start with invalid link token -> must receive decoy "Привет! Как дела?"
	bot.ProcessMessage(ctx, unknownChatID, "stranger", "Stranger", "/start link_invalidtoken999")
	if getLastMessageText() != "Привет! Как дела?" {
		t.Fatalf("expected decoy response 'Привет! Как дела?', got: %q", getLastMessageText())
	}

	// Verify unknown user is NOT saved in database
	chats, _ := store.ListTelegramChats(ctx)
	if len(chats) != 0 {
		t.Fatalf("expected 0 registered chats for unknown user, got %d", len(chats))
	}

	// 6. User connects using legitimate individual link token: /start link_<token>
	validUserChatID := int64(555666777)
	bot.ProcessMessage(ctx, validUserChatID, "king_aragorn", "Aragorn", "/start link_"+linkToken)
	lastText := getLastMessageText()
	if !strings.Contains(lastText, "Ваш чат успешно привязан к аккаунту <b>aragorn</b>") {
		t.Fatalf("expected welcome message for aragorn, got: %q", lastText)
	}

	// Token must be consumed
	_, err = store.GetUserByTelegramLinkToken(ctx, linkToken)
	if err == nil {
		t.Fatalf("expected link token to be consumed after successful linking")
	}

	// 7. Now linked user sends /start -> gets authorized main menu
	bot.ProcessMessage(ctx, validUserChatID, "king_aragorn", "Aragorn", "/start")
	lastText = getLastMessageText()
	if !strings.Contains(lastText, "Avari Keys Bot") || !strings.Contains(lastText, "/billing") {
		t.Fatalf("expected authorized main menu, got: %q", lastText)
	}

	// 8. Linked user sends /billing -> gets billing status
	bot.ProcessMessage(ctx, validUserChatID, "king_aragorn", "Aragorn", "/billing")
	lastText = getLastMessageText()
	if !strings.Contains(lastText, "Статус взносов") {
		t.Fatalf("expected billing info, got: %q", lastText)
	}

	// 9. Admin links with admin secret code: /start AdminAccessSecretCode
	adminChatID := int64(999888111)
	bot.ProcessMessage(ctx, adminChatID, "superadmin", "Admin", "/start AdminAccessSecretCode")
	lastText = getLastMessageText()
	if !strings.Contains(lastText, "правами <b>Администратора</b>") {
		t.Fatalf("expected admin welcome message, got: %q", lastText)
	}

	// Verify chat is saved with IsAdmin = true
	adminChat, err := store.GetTelegramChatByChatID(ctx, adminChatID)
	if err != nil || adminChat == nil || !adminChat.IsAdmin {
		t.Fatalf("expected admin chat to be saved as admin, got: %+v, err: %v", adminChat, err)
	}

	// 10. Linked user logs out: /logout
	bot.ProcessMessage(ctx, validUserChatID, "king_aragorn", "Aragorn", "/logout")
	lastText = getLastMessageText()
	if !strings.Contains(lastText, "Ваш Telegram-чат успешно отвязан") {
		t.Fatalf("expected logout confirmation message, got: %q", lastText)
	}

	// Verify chat is deleted from DB
	unlinkedChat, _ := store.GetTelegramChatByChatID(ctx, validUserChatID)
	if unlinkedChat != nil {
		t.Fatalf("expected chat to be deleted after /logout")
	}

	// Now that user is logged out, subsequent message must receive decoy response
	bot.ProcessMessage(ctx, validUserChatID, "king_aragorn", "Aragorn", "/start")
	if getLastMessageText() != "Привет! Как дела?" {
		t.Fatalf("expected decoy response 'Привет! Как дела?' after logout, got: %q", getLastMessageText())
	}
}
