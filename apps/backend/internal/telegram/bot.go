package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
)

// Bot manages Telegram notifications and command interaction.
type Bot struct {
	token               string
	botUsername         string
	adminSecret         string
	enabled             bool
	notifyOnNodeDown    bool
	notifyOnNodeRecover bool
	notifyOnNewUser     bool

	httpClient  *http.Client
	storage     *storage.Storage
	nodeLister  func(ctx context.Context) ([]models.NodeWithStatus, error)
	statsLister func(ctx context.Context) (*models.DashboardStatsResponse, error)

	stopChan  chan struct{}
	isRunning bool
	wg        sync.WaitGroup
	mu        sync.RWMutex
}

// Config holds Telegram bot parameters.
type Config struct {
	Token               string
	BotUsername         string
	AdminSecret         string
	AdminChatID         string
	Enabled             bool
	NotifyOnNodeDown    bool
	NotifyOnNodeRecover bool
	NotifyOnNewUser     bool
	Storage             *storage.Storage
	NodeLister          func(ctx context.Context) ([]models.NodeWithStatus, error)
	StatsLister         func(ctx context.Context) (*models.DashboardStatsResponse, error)
}

// NewBot creates a new Telegram Bot instance.
func NewBot(cfg Config) *Bot {
	bot := &Bot{
		token:               cfg.Token,
		botUsername:         cfg.BotUsername,
		adminSecret:         cfg.AdminSecret,
		enabled:             cfg.Enabled || cfg.Token != "",
		notifyOnNodeDown:    true,
		notifyOnNodeRecover: true,
		notifyOnNewUser:     true,
		httpClient:          &http.Client{Timeout: 35 * time.Second},
		storage:             cfg.Storage,
		nodeLister:          cfg.NodeLister,
		statsLister:         cfg.StatsLister,
	}

	if bot.botUsername == "" {
		bot.botUsername = "AvariElfBot"
	}

	// Auto-register initial admin chat if provided in env
	if cfg.AdminChatID != "" && cfg.Storage != nil {
		if id, err := strconv.ParseInt(cfg.AdminChatID, 10, 64); err == nil && id != 0 {
			_ = cfg.Storage.SaveTelegramChat(context.Background(), models.TelegramChat{
				ChatID:        id,
				Username:      "env_admin",
				FirstName:     "Env Admin",
				IsAdmin:       true,
				AlertsEnabled: true,
			})
		}
	}

	return bot
}

// IsEnabled returns true if the bot is enabled and token is present.
func (b *Bot) IsEnabled() bool {
	if b == nil {
		return false
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.enabled && b.token != ""
}

// GetSettings returns the current Telegram settings snapshot.
func (b *Bot) GetSettings() models.TelegramSettings {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return models.TelegramSettings{
		Enabled:             b.enabled,
		BotToken:            b.token,
		BotUsername:         b.botUsername,
		AdminSecret:         b.adminSecret,
		NotifyOnNodeDown:    b.notifyOnNodeDown,
		NotifyOnNodeRecover: b.notifyOnNodeRecover,
		NotifyOnNewUser:     b.notifyOnNewUser,
	}
}

// ValidateToken tests the token against Telegram getMe endpoint and returns bot username.
func (b *Bot) ValidateToken(token string) (username string, firstName string, err error) {
	if token == "" {
		return "", "", fmt.Errorf("token cannot be empty")
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/getMe", token)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("network error connecting to Telegram API: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("invalid token (Telegram API returned status %d): %s", resp.StatusCode, string(body))
	}

	var meResp struct {
		OK     bool `json:"ok"`
		Result struct {
			ID        int64  `json:"id"`
			IsBot     bool   `json:"is_bot"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
		} `json:"result"`
	}

	if err := json.Unmarshal(body, &meResp); err != nil || !meResp.OK {
		return "", "", fmt.Errorf("failed to parse Telegram getMe response: %w", err)
	}

	return meResp.Result.Username, meResp.Result.FirstName, nil
}

// UpdateConfig updates bot credentials and hot-reloads the polling worker.
func (b *Bot) UpdateConfig(ctx context.Context, s models.TelegramSettings) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	tokenChanged := b.token != s.BotToken
	enabledChanged := b.enabled != s.Enabled

	b.token = strings.TrimSpace(s.BotToken)
	b.botUsername = strings.TrimSpace(s.BotUsername)
	b.adminSecret = strings.TrimSpace(s.AdminSecret)
	b.enabled = s.Enabled
	b.notifyOnNodeDown = s.NotifyOnNodeDown
	b.notifyOnNodeRecover = s.NotifyOnNodeRecover
	b.notifyOnNewUser = s.NotifyOnNewUser

	if b.botUsername == "" {
		b.botUsername = "AvariElfBot"
	}

	// Hot reload polling worker if token or enabled status changed
	if tokenChanged || enabledChanged {
		if b.isRunning {
			close(b.stopChan)
			b.wg.Wait()
			b.isRunning = false
			log.Printf("[TELEGRAM] Stopped previous polling worker")
		}

		if b.enabled && b.token != "" {
			b.stopChan = make(chan struct{})
			b.isRunning = true
			b.wg.Add(1)
			go b.pollUpdates(ctx)
			log.Printf("[TELEGRAM] Hot-reloaded and started polling worker for @%s", b.botUsername)
		}
	}

	return nil
}

// Start launches the background polling worker.
func (b *Bot) Start(ctx context.Context) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if !b.enabled || b.token == "" {
		log.Println("[TELEGRAM] Bot token not provided or bot disabled, Telegram notifications inactive")
		return
	}

	if b.isRunning {
		return
	}

	b.stopChan = make(chan struct{})
	b.isRunning = true
	b.wg.Add(1)
	go b.pollUpdates(ctx)
	log.Printf("[TELEGRAM] Bot @%s started successfully (Polling)", b.botUsername)
}

// Stop gracefully terminates the polling loop.
func (b *Bot) Stop() {
	b.mu.Lock()
	defer b.mu.Unlock()

	if !b.isRunning {
		return
	}

	close(b.stopChan)
	b.wg.Wait()
	b.isRunning = false
	log.Printf("[TELEGRAM] Bot @%s stopped", b.botUsername)
}

// tgUpdate represents incoming Telegram Update.
type tgUpdate struct {
	UpdateID int64 `json:"update_id"`
	Message  *struct {
		MessageID int64 `json:"message_id"`
		From      *struct {
			ID        int64  `json:"id"`
			IsBot     bool   `json:"is_bot"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
		} `json:"from"`
		Chat struct {
			ID        int64  `json:"id"`
			Type      string `json:"type"`
			Title     string `json:"title,omitempty"`
			Username  string `json:"username,omitempty"`
			FirstName string `json:"first_name,omitempty"`
		} `json:"chat"`
		Text string `json:"text"`
		Date int64  `json:"date"`
	} `json:"message"`
}

type tgUpdatesResponse struct {
	OK     bool       `json:"ok"`
	Result []tgUpdate `json:"result"`
}

func (b *Bot) pollUpdates(ctx context.Context) {
	defer b.wg.Done()

	var offset int64 = 0

	for {
		b.mu.RLock()
		token := b.token
		stopCh := b.stopChan
		b.mu.RUnlock()

		if token == "" {
			return
		}

		select {
		case <-stopCh:
			return
		case <-ctx.Done():
			return
		default:
		}

		url := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates?timeout=25&offset=%d", token, offset)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			time.Sleep(3 * time.Second)
			continue
		}

		resp, err := b.httpClient.Do(req)
		if err != nil {
			select {
			case <-stopCh:
				return
			case <-time.After(3 * time.Second):
				continue
			}
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			time.Sleep(3 * time.Second)
			continue
		}

		var updateRes tgUpdatesResponse
		if err := json.Unmarshal(body, &updateRes); err != nil || !updateRes.OK {
			time.Sleep(2 * time.Second)
			continue
		}

		for _, upd := range updateRes.Result {
			offset = upd.UpdateID + 1
			if upd.Message != nil && upd.Message.Text != "" {
				b.handleIncomingMessage(ctx, upd.Message.Chat.ID, upd.Message.From, upd.Message.Text)
			}
		}
	}
}

func (b *Bot) handleIncomingMessage(ctx context.Context, chatID int64, from *struct {
	ID        int64  `json:"id"`
	IsBot     bool   `json:"is_bot"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}, text string) {
	username := ""
	firstName := ""
	if from != nil {
		username = from.Username
		firstName = from.FirstName
	}

	text = strings.TrimSpace(text)
	parts := strings.Fields(text)
	if len(parts) == 0 {
		return
	}

	command := strings.ToLower(parts[0])
	if idx := strings.Index(command, "@"); idx != -1 {
		command = command[:idx]
	}

	b.mu.RLock()
	adminSecret := b.adminSecret
	botUsername := b.botUsername
	b.mu.RUnlock()

	switch command {
	case "/start":
		if len(parts) > 1 && adminSecret != "" && parts[1] == adminSecret {
			b.registerChat(ctx, chatID, username, firstName, true)
			_ = b.SendMessage(chatID, "✨ <b>Добро пожаловать в Avari Keys Alerts!</b>\n\nВаш чат успешно привязан с правами <b>Администратора</b>.\nВы будете получать оповещения о доступности серверов и событиях системы.\n\nИспользуйте /status для проверки серверов или /help для списка команд.", "HTML")
			return
		}

		b.registerChat(ctx, chatID, username, firstName, true)
		msg := "🌿 <b>Avari Keys Monitor Bot (@" + botUsername + ")</b>\n\n" +
			"Бот активен и готов присылать мгновенные уведомления о состоянии серверов AmneziaWG (Cascade & Direct).\n\n" +
			"<b>Доступные команды:</b>\n" +
			"📊 /status — Состояние и пинг всех серверов\n" +
			"🌐 /nodes — Список серверов и маршрутизация\n" +
			"🔔 /test — Проверить доставку уведомления\n" +
			"❓ /help — Справка по командам"
		_ = b.SendMessage(chatID, msg, "HTML")

	case "/bind":
		if len(parts) > 1 && adminSecret != "" && parts[1] == adminSecret {
			b.registerChat(ctx, chatID, username, firstName, true)
			_ = b.SendMessage(chatID, "✅ <b>Успешно!</b> Чат привязан к системе оповещений администратора.", "HTML")
		} else if adminSecret == "" {
			b.registerChat(ctx, chatID, username, firstName, true)
			_ = b.SendMessage(chatID, "✅ Чат зарегистрирован в списке получателей уведомлений.", "HTML")
		} else {
			_ = b.SendMessage(chatID, "❌ Неверный секретный ключ привязки. Используйте: <code>/bind &lt;secret&gt;</code>", "HTML")
		}

	case "/status":
		b.handleStatusCommand(ctx, chatID)

	case "/nodes":
		b.handleNodesCommand(ctx, chatID)

	case "/test":
		_ = b.SendTestAlert(chatID)

	case "/help":
		msg := "📖 <b>Справка Avari Keys Bot</b>\n\n" +
			"• <b>/status</b> — Текущий статус серверов, задержка (пинг), общее кол-во ключей\n" +
			"• <b>/nodes</b> — Список узлов и их конфигурация\n" +
			"• <b>/test</b> — Тестовое оповещение о сбое и восстановлении\n" +
			"• <b>/start</b> — Перезапустить бота / обновить профиль"
		_ = b.SendMessage(chatID, msg, "HTML")

	default:
		_ = b.SendMessage(chatID, "Неизвестная команда. Введите /help для списка команд.", "")
	}
}

func (b *Bot) registerChat(ctx context.Context, chatID int64, username, firstName string, isAdmin bool) {
	if b.storage == nil {
		return
	}
	_ = b.storage.SaveTelegramChat(ctx, models.TelegramChat{
		ChatID:        chatID,
		Username:      username,
		FirstName:     firstName,
		IsAdmin:       isAdmin,
		AlertsEnabled: true,
	})
}

func (b *Bot) handleStatusCommand(ctx context.Context, chatID int64) {
	if b.nodeLister == nil {
		_ = b.SendMessage(chatID, "⚠️ Сервис мониторинга узлов недоступен.", "")
		return
	}

	nodes, err := b.nodeLister(ctx)
	if err != nil {
		_ = b.SendMessage(chatID, fmt.Sprintf("⚠️ Ошибка получения статуса узлов: %v", err), "")
		return
	}

	onlineCount := 0
	totalCount := len(nodes)

	var sb strings.Builder
	sb.WriteString("📊 <b>Статус узлов Avari Keys</b>\n")
	sb.WriteString("━━━━━━━━━━━━━━━━━━━━━\n\n")

	for _, n := range nodes {
		statusEmoji := "🟢"
		statusText := fmt.Sprintf("Online (%d ms)", n.LatencyMs)
		if !n.Online {
			statusEmoji = "🔴"
			statusText = "Offline / Не отвечает"
		} else {
			onlineCount++
		}

		typeLabel := "Direct"
		if n.Type == "cascade" {
			typeLabel = "Cascade"
		}

		sb.WriteString(fmt.Sprintf("%s <b>%s</b> [%s]\n", statusEmoji, n.Name, typeLabel))
		sb.WriteString(fmt.Sprintf("   └ Статус: <code>%s</code>\n", statusText))
		if n.CountryCode != "" {
			sb.WriteString(fmt.Sprintf("   └ Страна: <code>%s</code>\n", n.CountryCode))
		}
		sb.WriteString("\n")
	}

	sb.WriteString("━━━━━━━━━━━━━━━━━━━━━\n")
	sb.WriteString(fmt.Sprintf("Всего серверов: <b>%d/%d онлайн</b>\n", onlineCount, totalCount))
	sb.WriteString(fmt.Sprintf("🕒 Проверено: <code>%s</code>", time.Now().Format("02.01.2006 15:04:05")))

	_ = b.SendMessage(chatID, sb.String(), "HTML")
}

func (b *Bot) handleNodesCommand(ctx context.Context, chatID int64) {
	if b.nodeLister == nil {
		_ = b.SendMessage(chatID, "⚠️ Данные узлов недоступны.", "")
		return
	}

	nodes, err := b.nodeLister(ctx)
	if err != nil {
		_ = b.SendMessage(chatID, fmt.Sprintf("⚠️ Ошибка: %v", err), "")
		return
	}

	var sb strings.Builder
	sb.WriteString("🌐 <b>Список серверов Avari Keys</b>\n")
	sb.WriteString("━━━━━━━━━━━━━━━━━━━━━\n\n")

	for i, n := range nodes {
		mob := ""
		if n.IsMobileOptimized {
			mob = " 📱 [Mobile Opt]"
		}
		sb.WriteString(fmt.Sprintf("<b>%d. %s</b>%s\n", i+1, n.Name, mob))
		sb.WriteString(fmt.Sprintf("   • ID: <code>#%d</code>\n", n.ID))
		sb.WriteString(fmt.Sprintf("   • Тип: <code>%s</code>\n", n.Type))
		if n.CountryCode != "" {
			sb.WriteString(fmt.Sprintf("   • Страна: <code>%s</code>\n", n.CountryCode))
		}
		sb.WriteString(fmt.Sprintf("   • URL: <code>%s</code>\n", n.APIURL))
		sb.WriteString("\n")
	}

	_ = b.SendMessage(chatID, sb.String(), "HTML")
}

// SendMessage sends an individual text message via Telegram API.
func (b *Bot) SendMessage(chatID int64, text string, parseMode string) error {
	b.mu.RLock()
	token := b.token
	enabled := b.enabled
	b.mu.RUnlock()

	if !enabled || token == "" {
		return fmt.Errorf("telegram bot is not configured or disabled")
	}

	payload := map[string]any{
		"chat_id": chatID,
		"text":    text,
	}
	if parseMode != "" {
		payload["parse_mode"] = parseMode
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	resp, err := b.httpClient.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send telegram message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// BroadcastAlert sends an alert to all registered subscribers.
func (b *Bot) BroadcastAlert(text string) error {
	if !b.IsEnabled() || b.storage == nil {
		return nil
	}

	chats, err := b.storage.ListTelegramChats(context.Background())
	if err != nil {
		return err
	}

	var lastErr error
	for _, c := range chats {
		if !c.AlertsEnabled {
			continue
		}
		if err := b.SendMessage(c.ChatID, text, "HTML"); err != nil {
			log.Printf("[TELEGRAM] Failed to send alert to chat %d: %v", c.ChatID, err)
			lastErr = err
		}
	}
	return lastErr
}

// NotifyNodeDown sends a critical downtime alert.
func (b *Bot) NotifyNodeDown(node models.Node, reason string) {
	b.mu.RLock()
	notify := b.notifyOnNodeDown
	b.mu.RUnlock()

	if !notify {
		return
	}

	msg := fmt.Sprintf(
		"🚨 <b>[Avari Alert] СЕРВЕР НЕДОСТУПЕН!</b>\n"+
			"━━━━━━━━━━━━━━━━━━━━━\n"+
			"📍 <b>Сервер:</b> %s (ID #%d)\n"+
			"🌐 <b>Тип:</b> %s\n"+
			"🏳️ <b>Локация:</b> %s\n"+
			"🔗 <b>API URL:</b> <code>%s</code>\n"+
			"⚠️ <b>Ошибка:</b> <code>%s</code>\n"+
			"⏱ <b>Время:</b> %s\n\n"+
			"<i>Проверьте статус сервера или перезапустите службу AWG в панели управления.</i>",
		node.Name,
		node.ID,
		node.Type,
		node.CountryCode,
		node.APIURL,
		reason,
		time.Now().Format("02.01.2006 15:04:05"),
	)
	_ = b.BroadcastAlert(msg)
}

// NotifyNodeRecovered sends a recovery notification.
func (b *Bot) NotifyNodeRecovered(node models.Node, latencyMs int64) {
	b.mu.RLock()
	notify := b.notifyOnNodeRecover
	b.mu.RUnlock()

	if !notify {
		return
	}

	msg := fmt.Sprintf(
		"✅ <b>[Avari Alert] СЕРВЕР СНОВА ОНЛАЙН!</b>\n"+
			"━━━━━━━━━━━━━━━━━━━━━\n"+
			"📍 <b>Сервер:</b> %s (ID #%d)\n"+
			"🌐 <b>Тип:</b> %s\n"+
			"⚡ <b>Задержка:</b> %d ms\n"+
			"⏱ <b>Время восстановления:</b> %s\n\n"+
			"<i>Сервер успешно отвечает на запросы и готов к обслуживанию клиентов.</i>",
		node.Name,
		node.ID,
		node.Type,
		latencyMs,
		time.Now().Format("02.01.2006 15:04:05"),
	)
	_ = b.BroadcastAlert(msg)
}

// NotifyNewUser sends an alert about new user registration pending approval.
func (b *Bot) NotifyNewUser(user models.User) {
	b.mu.RLock()
	notify := b.notifyOnNewUser
	b.mu.RUnlock()

	if !notify {
		return
	}

	msg := fmt.Sprintf(
		"👤 <b>[Avari Keys] Новый пользователь!</b>\n"+
			"━━━━━━━━━━━━━━━━━━━━━\n"+
			"Пользователь: <b>@%s</b> (ID #%d)\n"+
			"Статус: 🟡 <b>Ожидает модерации</b>\n"+
			"Дата: %s\n\n"+
			"<i>Перейдите в панель администратора для активации учетной записи.</i>",
		user.Username,
		user.ID,
		user.CreatedAt.Format("02.01.2006 15:04:05"),
	)
	_ = b.BroadcastAlert(msg)
}

// SendTestAlert sends a test message to a specific chat or broadcasts.
func (b *Bot) SendTestAlert(chatID int64) error {
	b.mu.RLock()
	botUsername := b.botUsername
	b.mu.RUnlock()

	msg := fmt.Sprintf(
		"🔔 <b>[Avari Test Alert] Проверка связи с ботом @%s</b>\n"+
			"━━━━━━━━━━━━━━━━━━━━━\n"+
			"✅ Бот успешно подключен к Master-серверу.\n"+
			"📡 Оповещения о статусе серверов и падениях настроены.\n"+
			"⏱ <b>Время:</b> %s",
		botUsername,
		time.Now().Format("02.01.2006 15:04:05"),
	)

	if chatID != 0 {
		return b.SendMessage(chatID, msg, "HTML")
	}
	return b.BroadcastAlert(msg)
}
