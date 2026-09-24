package storage_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
)

func createTestDB(t *testing.T) (*storage.Storage, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "avari-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	dbPath := filepath.Join(tmpDir, "test.db")

	os.Setenv("ADMIN_USER", "Forve")
	os.Setenv("ADMIN_PASSWORD", "SuperAdminSecret123!")

	store, err := storage.NewSQLiteStorage(dbPath)
	if err != nil {
		t.Fatalf("failed to create sqlite storage: %v", err)
	}

	cleanup := func() {
		_ = store.Close()
		_ = os.RemoveAll(tmpDir)
	}
	return store, cleanup
}

func TestAdminUserCreatedOnInit(t *testing.T) {
	store, cleanup := createTestDB(t)
	defer cleanup()

	ctx := context.Background()
	admin, err := store.GetUserByUsername(ctx, "Forve")
	if err != nil {
		t.Fatalf("expected admin user 'Forve' to exist: %v", err)
	}
	if admin.Role != models.RoleAdmin || !admin.IsActive {
		t.Fatalf("invalid admin attributes: %+v", admin)
	}
}

func TestUserRegistrationAndModeration(t *testing.T) {
	store, cleanup := createTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// 1. Create user -> is_active should be false (0)
	user, err := store.CreateUser(ctx, "bob", "secretpassword")
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}
	if user.IsActive {
		t.Fatalf("newly registered user must have is_active=false")
	}

	// 2. Activate user
	if err := store.SetUserActive(ctx, user.ID, true); err != nil {
		t.Fatalf("failed to activate user: %v", err)
	}

	updated, err := store.GetUserByID(ctx, user.ID)
	if err != nil || !updated.IsActive {
		t.Fatalf("expected user to be active after update")
	}

	// 3. Deactivate user
	if err := store.SetUserActive(ctx, user.ID, false); err != nil {
		t.Fatalf("failed to deactivate user: %v", err)
	}

	deactivated, err := store.GetUserByID(ctx, user.ID)
	if err != nil || deactivated.IsActive {
		t.Fatalf("expected user to be inactive")
	}
}

func TestNodesAndConfigsStorage(t *testing.T) {
	store, cleanup := createTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// 1. Create nodes
	node1, err := store.CreateNode(ctx, "Cascade Node", "cascade", "NLD", "https://aeza.net", "http://127.0.0.1:8081", "token1", true)
	if err != nil {
		t.Fatalf("failed to create node: %v", err)
	}
	if !node1.IsMobileOptimized || node1.CountryCode != "NLD" || node1.ProviderURL != "https://aeza.net" {
		t.Fatalf("invalid node1 attributes: %+v", node1)
	}
	node2, err := store.CreateNode(ctx, "Direct Node", "direct", "DEU", "https://hetzner.com", "http://127.0.0.1:8082", "token2", false)
	if err != nil {
		t.Fatalf("failed to create node: %v", err)
	}
	if node2.IsMobileOptimized || node2.CountryCode != "DEU" || node2.ProviderURL != "https://hetzner.com" {
		t.Fatalf("invalid node2 attributes: %+v", node2)
	}

	// Update node test
	updatedNode2, err := store.UpdateNode(ctx, node2.ID, "Direct Node Updated", "direct", "FIN", "https://hetzner.com/vps", "http://127.0.0.1:8085", "", true)
	if err != nil {
		t.Fatalf("failed to update node: %v", err)
	}
	if updatedNode2.Name != "Direct Node Updated" || updatedNode2.CountryCode != "FIN" || updatedNode2.APIURL != "http://127.0.0.1:8085" || !updatedNode2.IsMobileOptimized {
		t.Fatalf("invalid updated node attributes: %+v", updatedNode2)
	}
	if updatedNode2.APIKey != "token2" {
		t.Fatalf("expected APIKey to be preserved when empty in update, got: %s", updatedNode2.APIKey)
	}

	nodes, err := store.ListNodes(ctx)
	if err != nil || len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}

	// 2. Create client configs
	user, _ := store.CreateUser(ctx, "carol", "password123")
	cfg1, err := store.CreateClientConfig(ctx, user.ID, node1.ID, "u2_iphone", "iPhone")
	if err != nil {
		t.Fatalf("failed to create client config: %v", err)
	}

	cfg2, err := store.CreateClientConfig(ctx, user.ID, node2.ID, "u2_macbook", "MacBook")
	if err != nil {
		t.Fatalf("failed to create client config: %v", err)
	}

	userConfigs, err := store.ListClientConfigsByUser(ctx, user.ID)
	if err != nil || len(userConfigs) != 2 {
		t.Fatalf("expected 2 configs for user, got %d", len(userConfigs))
	}

	// 3. Delete config
	if err := store.DeleteClientConfig(ctx, cfg1.ID); err != nil {
		t.Fatalf("failed to delete config: %v", err)
	}

	remaining, _ := store.ListClientConfigsByUser(ctx, user.ID)
	if len(remaining) != 1 || remaining[0].ID != cfg2.ID {
		t.Fatalf("expected 1 remaining config, got %+v", remaining)
	}
}

func TestAuditLogsStorageAndPurge(t *testing.T) {
	store, cleanup := createTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// 1. Create audit logs
	admin, err := store.GetUserByUsername(ctx, "Forve")
	if err != nil {
		t.Fatalf("failed to get admin user: %v", err)
	}

	alice, err := store.CreateUser(ctx, "alice", "alicepassword123")
	if err != nil {
		t.Fatalf("failed to create alice: %v", err)
	}

	uid1 := admin.ID
	uid2 := alice.ID

	log1 := &models.AuditLog{
		UserID:    &uid1,
		Username:  "Forve",
		Action:    "auth_login",
		Category:  models.CategoryAuth,
		IPAddress: "127.0.0.1",
		Details:   "Admin logged in",
	}
	if err := store.CreateAuditLog(ctx, log1); err != nil {
		t.Fatalf("failed to create audit log: %v", err)
	}
	if log1.ID == 0 {
		t.Fatalf("expected log ID to be set")
	}

	log2 := &models.AuditLog{
		UserID:    &uid2,
		Username:  "alice",
		Action:    "key_create",
		Category:  models.CategoryKeys,
		IPAddress: "192.168.1.50",
		Details:   "Created key for iPhone",
	}
	if err := store.CreateAuditLog(ctx, log2); err != nil {
		t.Fatalf("failed to create audit log: %v", err)
	}

	// 2. Query all logs
	logs, count, err := store.ListAuditLogs(ctx, models.AuditLogFilter{Limit: 50})
	if err != nil {
		t.Fatalf("failed to list audit logs: %v", err)
	}
	if count != 2 || len(logs) != 2 {
		t.Fatalf("expected 2 logs, got %d (count: %d)", len(logs), count)
	}

	// 3. Filter by Category
	authLogs, authCount, err := store.ListAuditLogs(ctx, models.AuditLogFilter{Category: string(models.CategoryAuth)})
	if err != nil || authCount != 1 || len(authLogs) != 1 {
		t.Fatalf("expected 1 auth log, got %d", authCount)
	}
	if authLogs[0].Username != "Forve" {
		t.Fatalf("expected Forve, got %s", authLogs[0].Username)
	}

	// 4. Filter by UserID
	aliceLogs, aliceCount, err := store.ListAuditLogs(ctx, models.AuditLogFilter{UserID: &uid2})
	if err != nil || aliceCount != 1 || len(aliceLogs) != 1 {
		t.Fatalf("expected 1 alice log, got %d", aliceCount)
	}

	// 5. Purge logs
	deleted, err := store.PurgeAuditLogsOlderThan(ctx, 90)
	if err != nil {
		t.Fatalf("failed to purge logs: %v", err)
	}
	// Recent logs should not be purged
	if deleted != 0 {
		t.Fatalf("expected 0 deleted logs for fresh entries, got %d", deleted)
	}
}

func TestBillingStorage(t *testing.T) {
	store, cleanup := createTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// 1. Create a user
	user, err := store.CreateUser(ctx, "charlie", "password123")
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// 2. Initial billing status (30 days from creation, not due)
	status, err := store.GetBillingStatus(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get billing status: %v", err)
	}
	if status.IsDue {
		t.Fatalf("expected fresh user not to be due, got isDue=true")
	}
	if status.DaysRemaining <= 0 {
		t.Fatalf("expected days remaining > 0, got %d", status.DaysRemaining)
	}
	if len(status.History) != 0 {
		t.Fatalf("expected empty history, got %d", len(status.History))
	}

	// 3. Record payment ("Оплачено")
	rec, err := store.RecordPayment(ctx, user.ID, user.Username, 0, "Оплачено за сентябрь")
	if err != nil {
		t.Fatalf("failed to record payment: %v", err)
	}
	if rec.ID == 0 || rec.Status != "confirmed" {
		t.Fatalf("invalid record: %+v", rec)
	}

	// 4. Verify updated billing status
	statusAfterPay, err := store.GetBillingStatus(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get updated status: %v", err)
	}
	if len(statusAfterPay.History) != 1 {
		t.Fatalf("expected 1 history record, got %d", len(statusAfterPay.History))
	}
	if statusAfterPay.LastPaidAt == nil {
		t.Fatalf("expected lastPaidAt to be set")
	}

	// 5. Snooze reminder (1 day / next day)
	if err := store.SnoozeBillingReminder(ctx, user.ID, 1); err != nil {
		t.Fatalf("failed to snooze: %v", err)
	}
	statusSnooze, err := store.GetBillingStatus(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get status after snooze: %v", err)
	}
	if statusSnooze.SnoozedUntil == nil {
		t.Fatalf("expected snoozedUntil to be set")
	}

	// 6. Admin summary
	adminSummary, err := store.GetAllBillingRecords(ctx)
	if err != nil {
		t.Fatalf("failed to get admin billing summary: %v", err)
	}
	if adminSummary.TotalPayments != 1 {
		t.Fatalf("expected 1 total payment, got %d", adminSummary.TotalPayments)
	}
}

func TestTelegramChatsStorage(t *testing.T) {
	store, cleanup := createTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// 1. Save chat
	chat := models.TelegramChat{
		ChatID:        123456789,
		Username:      "avari_admin",
		FirstName:     "Elven Admin",
		IsAdmin:       true,
		AlertsEnabled: true,
	}

	if err := store.SaveTelegramChat(ctx, chat); err != nil {
		t.Fatalf("failed to save telegram chat: %v", err)
	}

	// 2. List chats
	chats, err := store.ListTelegramChats(ctx)
	if err != nil {
		t.Fatalf("failed to list telegram chats: %v", err)
	}
	if len(chats) != 1 {
		t.Fatalf("expected 1 chat, got %d", len(chats))
	}
	if chats[0].ChatID != 123456789 || chats[0].Username != "avari_admin" {
		t.Fatalf("unexpected chat data: %+v", chats[0])
	}

	// 3. Disable alerts
	if err := store.SetTelegramAlertsEnabled(ctx, 123456789, false); err != nil {
		t.Fatalf("failed to set alerts enabled: %v", err)
	}
	chats, _ = store.ListTelegramChats(ctx)
	if chats[0].AlertsEnabled {
		t.Fatalf("expected alerts to be disabled")
	}

	// 4. Delete chat
	if err := store.DeleteTelegramChat(ctx, 123456789); err != nil {
		t.Fatalf("failed to delete telegram chat: %v", err)
	}
	chats, _ = store.ListTelegramChats(ctx)
	if len(chats) != 0 {
		t.Fatalf("expected 0 chats after delete, got %d", len(chats))
	}
}


