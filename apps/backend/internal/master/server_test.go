package master_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/master"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/runner"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/slave"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
)

func setupTestEnvironment(t *testing.T) (*master.Server, *httptest.Server, *storage.Storage, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "avari-master-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	dbPath := filepath.Join(tmpDir, "master.db")

	os.Setenv("ADMIN_USER", "Forve")
	os.Setenv("ADMIN_PASSWORD", "AdminPass123!")

	store, err := storage.NewSQLiteStorage(dbPath)
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}

	// Setup mock slave server
	slaveToken := "slave-secret-123"
	mockRunner := runner.NewMockRunner(true)
	slaveSrv := slave.NewServer(slave.Config{
		APIKey: slaveToken,
		Port:   "8081",
	}, mockRunner)
	slaveHttpSrv := httptest.NewServer(slaveSrv.Handler())

	// Add mock slave node to DB
	_, err = store.CreateNode(context.Background(), "Mock Cascade Node", "cascade", slaveHttpSrv.URL, slaveToken)
	if err != nil {
		t.Fatalf("failed to create mock node: %v", err)
	}

	masterSrv := master.NewServer(master.Config{
		Port:      "8080",
		JWTSecret: "test-jwt-secret-xyz",
	}, store)

	cleanup := func() {
		slaveHttpSrv.Close()
		_ = store.Close()
		_ = os.RemoveAll(tmpDir)
	}

	return masterSrv, slaveHttpSrv, store, cleanup
}

func TestCompleteUserAndKeyFlow(t *testing.T) {
	masterSrv, _, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	handler := masterSrv.Handler()

	// 1. Register a new user
	regBody, _ := json.Marshal(models.RegisterRequest{
		Username: "alice",
		Password: "alicePassword123!",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(regBody))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for register, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	// 2. Try login as alice before activation -> Expect 403 Forbidden
	loginBody, _ := json.Marshal(models.LoginRequest{
		Username: "alice",
		Password: "alicePassword123!",
	})
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(loginBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden before activation, got %d", rec.Code)
	}

	// 3. Login as admin Forve
	adminLoginBody, _ := json.Marshal(models.LoginRequest{
		Username: "Forve",
		Password: "AdminPass123!",
	})
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(adminLoginBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for admin login, got %d", rec.Code)
	}

	var adminLoginResp models.LoginResponse
	_ = json.NewDecoder(rec.Body).Decode(&adminLoginResp)
	adminToken := adminLoginResp.Token

	// 4. Admin lists users and activates alice
	req = httptest.NewRequest("GET", "/api/v1/admin/users", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var users []models.UserPublic
	_ = json.NewDecoder(rec.Body).Decode(&users)
	var aliceID int64
	for _, u := range users {
		if u.Username == "alice" {
			aliceID = u.ID
			break
		}
	}
	if aliceID == 0 {
		t.Fatalf("alice was not found in users list")
	}

	// Activate alice
	req = httptest.NewRequest("POST", "/api/v1/admin/users/"+string(rune('0'+aliceID))+"/activate", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on user activation, got %d", rec.Code)
	}

	// 5. Login as alice after activation -> Expect 200 OK
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(loginBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for alice login, got %d", rec.Code)
	}

	var aliceLoginResp models.LoginResponse
	_ = json.NewDecoder(rec.Body).Decode(&aliceLoginResp)
	aliceToken := aliceLoginResp.Token

	// 6. Alice lists active nodes
	req = httptest.NewRequest("GET", "/api/v1/nodes", nil)
	req.Header.Set("Authorization", "Bearer "+aliceToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var nodes []models.NodePublic
	_ = json.NewDecoder(rec.Body).Decode(&nodes)
	if len(nodes) == 0 {
		t.Fatalf("expected at least 1 active node")
	}
	nodeID := nodes[0].ID

	// 7. Alice creates a key on the node
	keyReqBody, _ := json.Marshal(models.CreateKeyRequest{
		NodeID:     nodeID,
		DeviceName: "iPad-Pro",
	})
	req = httptest.NewRequest("POST", "/api/v1/keys", bytes.NewReader(keyReqBody))
	req.Header.Set("Authorization", "Bearer "+aliceToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for key creation, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var createdKey map[string]any
	_ = json.NewDecoder(rec.Body).Decode(&createdKey)
	if createdKey["qr_code"] == nil || createdKey["config"] == nil {
		t.Fatalf("expected config and qr_code in response, got %+v", createdKey)
	}

	// 8. Alice lists her keys
	req = httptest.NewRequest("GET", "/api/v1/keys", nil)
	req.Header.Set("Authorization", "Bearer "+aliceToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var myKeys []models.ClientConfig
	_ = json.NewDecoder(rec.Body).Decode(&myKeys)
	if len(myKeys) != 1 || myKeys[0].DeviceName != "iPad-Pro" {
		t.Fatalf("expected 1 key for alice, got %+v", myKeys)
	}
}
