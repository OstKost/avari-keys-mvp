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
	node1, err := store.CreateNode(ctx, "Cascade Node", "cascade", "http://127.0.0.1:8081", "token1")
	if err != nil {
		t.Fatalf("failed to create node: %v", err)
	}
	node2, err := store.CreateNode(ctx, "Direct Node", "direct", "http://127.0.0.1:8082", "token2")
	if err != nil {
		t.Fatalf("failed to create node: %v", err)
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
