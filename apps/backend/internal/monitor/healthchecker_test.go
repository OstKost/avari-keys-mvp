package monitor_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/monitor"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/telegram"
)

func setupTestStorage(t *testing.T) (*storage.Storage, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "monitor-test-*")
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

func TestHealthCheckerTransitions(t *testing.T) {
	var isNodeOnline atomic.Bool
	isNodeOnline.Store(true)

	// Mock Slave Node
	mockSlave := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isNodeOnline.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"error"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"avari-slave","version":"v0.1.0"}`))
	}))
	defer mockSlave.Close()

	store, cleanup := setupTestStorage(t)
	defer cleanup()

	ctx := context.Background()
	node, err := store.CreateNode(ctx, "Test Node", "cascade", "NLD", "https://aeza.net", mockSlave.URL, "dummy_key", true)
	if err != nil {
		t.Fatalf("failed to create test node: %v", err)
	}

	bot := telegram.NewBot(telegram.Config{
		Token:       "", // Disabled for this test
		BotUsername: "TestBot",
		Storage:     store,
	})

	checker := monitor.NewHealthChecker(monitor.Config{
		Storage:  store,
		Bot:      bot,
		Interval: 50 * time.Millisecond,
		Timeout:  100 * time.Millisecond,
	})

	// 1. Check all nodes while online
	statuses, err := checker.CheckAllNodes(ctx)
	if err != nil {
		t.Fatalf("failed to check nodes: %v", err)
	}
	if len(statuses) != 1 || !statuses[0].Online {
		t.Fatalf("expected 1 online node, got %+v", statuses)
	}

	// 2. Set node offline
	isNodeOnline.Store(false)
	statusesAfter, err := checker.CheckAllNodes(ctx)
	if err != nil {
		t.Fatalf("failed to check nodes: %v", err)
	}
	if len(statusesAfter) != 1 || statusesAfter[0].Online {
		t.Fatalf("expected 1 offline node, got %+v", statusesAfter)
	}

	_ = node
}
