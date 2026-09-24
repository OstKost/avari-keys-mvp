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
