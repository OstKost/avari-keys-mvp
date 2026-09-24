package master_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
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
	_, err = store.CreateNode(context.Background(), "Mock Cascade Node", "cascade", "NLD", "https://aeza.net", slaveHttpSrv.URL, slaveToken, true)
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

	// 7. Alice creates a key on the node with PSK enabled (Shadowrocket)
	keyReqBody, _ := json.Marshal(models.CreateKeyRequest{
		NodeID:     nodeID,
		DeviceName: "iPad-Pro",
		PSK:        true,
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
	configStr, ok := createdKey["config"].(string)
	if !ok || !strings.Contains(configStr, "PresharedKey") {
		t.Fatalf("expected config to contain PresharedKey for Shadowrocket, got: %v", createdKey["config"])
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

func TestAdminAuditLogsFlow(t *testing.T) {
	masterSrv, _, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	handler := masterSrv.Handler()

	// 1. Login as admin
	adminLoginBody, _ := json.Marshal(models.LoginRequest{
		Username: "Forve",
		Password: "AdminPass123!",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(adminLoginBody))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for admin login, got %d", rec.Code)
	}

	var adminLoginResp models.LoginResponse
	_ = json.NewDecoder(rec.Body).Decode(&adminLoginResp)
	adminToken := adminLoginResp.Token

	// 2. Perform user registration to generate logs
	regBody, _ := json.Marshal(models.RegisterRequest{
		Username: "log_user",
		Password: "password123!",
	})
	req = httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(regBody))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for register, got %d", rec.Code)
	}

	// 3. Admin gets audit logs
	req = httptest.NewRequest("GET", "/api/v1/admin/logs?limit=50", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for admin logs, got %d", rec.Code)
	}

	var logsResp models.PaginatedAuditLogsResponse
	_ = json.NewDecoder(rec.Body).Decode(&logsResp)

	if logsResp.TotalCount < 2 {
		t.Fatalf("expected at least 2 logs (login and register), got %d", logsResp.TotalCount)
	}
	if len(logsResp.Logs) < 2 {
		t.Fatalf("expected at least 2 logs returned, got %d", len(logsResp.Logs))
	}

	// 4. Admin filters by category
	req = httptest.NewRequest("GET", "/api/v1/admin/logs?category=auth", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for category filter, got %d", rec.Code)
	}

	var filteredResp models.PaginatedAuditLogsResponse
	_ = json.NewDecoder(rec.Body).Decode(&filteredResp)
	for _, l := range filteredResp.Logs {
		if l.Category != models.CategoryAuth {
			t.Fatalf("expected category auth, got %s", l.Category)
		}
	}

	// 5. Admin calls cleanup endpoint
	cleanupBody, _ := json.Marshal(models.CleanupLogsRequest{Days: 90})
	req = httptest.NewRequest("POST", "/api/v1/admin/logs/cleanup", bytes.NewReader(cleanupBody))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for logs cleanup, got %d", rec.Code)
	}

	var cleanupResp models.CleanupLogsResponse
	_ = json.NewDecoder(rec.Body).Decode(&cleanupResp)
	if !cleanupResp.Success {
		t.Fatalf("expected cleanup success")
	}
}

func TestDashboardStatsEndpoint(t *testing.T) {
	masterSrv, _, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	handler := masterSrv.Handler()

	// 1. Admin login
	adminLoginBody, _ := json.Marshal(models.LoginRequest{
		Username: "Forve",
		Password: "AdminPass123!",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(adminLoginBody))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var adminLoginResp models.LoginResponse
	_ = json.NewDecoder(rec.Body).Decode(&adminLoginResp)
	adminToken := adminLoginResp.Token

	// 2. Query Dashboard Stats as Admin
	req = httptest.NewRequest("GET", "/api/v1/stats/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for dashboard stats, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var statsResp models.DashboardStatsResponse
	_ = json.NewDecoder(rec.Body).Decode(&statsResp)

	if statsResp.TotalUsers < 1 {
		t.Fatalf("expected at least 1 user (admin), got %d", statsResp.TotalUsers)
	}
	if statsResp.TotalNodes < 1 {
		t.Fatalf("expected at least 1 node, got %d", statsResp.TotalNodes)
	}
	if statsResp.SystemStatus == "" {
		t.Fatalf("expected system status to be non-empty")
	}
}

func TestAdminNodeEditFlow(t *testing.T) {
	masterSrv, slaveHttpSrv, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	handler := masterSrv.Handler()

	// 1. Admin login
	adminLoginBody, _ := json.Marshal(models.LoginRequest{
		Username: "Forve",
		Password: "AdminPass123!",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(adminLoginBody))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var adminLoginResp models.LoginResponse
	_ = json.NewDecoder(rec.Body).Decode(&adminLoginResp)
	adminToken := adminLoginResp.Token

	// 2. Add a new node with CountryCode and ProviderURL
	addNodeBody, _ := json.Marshal(models.AddNodeRequest{
		Name:              "Direct Frankfurt S2",
		Type:              "direct",
		CountryCode:       "DEU",
		ProviderURL:       "https://hetzner.com",
		APIURL:            slaveHttpSrv.URL,
		APIKey:            "slave-secret-123",
		IsMobileOptimized: false,
	})
	req = httptest.NewRequest("POST", "/api/v1/admin/nodes", bytes.NewReader(addNodeBody))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for add node, got %d", rec.Code)
	}

	var createdNode models.Node
	_ = json.NewDecoder(rec.Body).Decode(&createdNode)
	if createdNode.CountryCode != "DEU" || createdNode.ProviderURL != "https://hetzner.com" {
		t.Fatalf("invalid created node data: %+v", createdNode)
	}

	// 3. Edit node via PUT /api/v1/admin/nodes/{id}
	updateNodeBody, _ := json.Marshal(models.UpdateNodeRequest{
		Name:              "Direct Frankfurt S2 (Renamed)",
		Type:              "direct",
		CountryCode:       "DEU",
		ProviderURL:       "https://console.hetzner.cloud",
		APIURL:            slaveHttpSrv.URL,
		APIKey:            "", // Keep existing key
		IsMobileOptimized: true,
	})
	req = httptest.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/nodes/%d", createdNode.ID), bytes.NewReader(updateNodeBody))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for update node, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var updatedNode models.Node
	_ = json.NewDecoder(rec.Body).Decode(&updatedNode)
	if updatedNode.Name != "Direct Frankfurt S2 (Renamed)" || !updatedNode.IsMobileOptimized || updatedNode.ProviderURL != "https://console.hetzner.cloud" {
		t.Fatalf("invalid updated node data: %+v", updatedNode)
	}
}

func TestAdminCascadeEgressSwitchFlow(t *testing.T) {
	srv, _, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	handler := srv.Handler()

	// 1. Login as admin
	adminLoginBody, _ := json.Marshal(models.LoginRequest{
		Username: "Forve",
		Password: "AdminPass123!",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(adminLoginBody))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var loginResp models.LoginResponse
	_ = json.NewDecoder(rec.Body).Decode(&loginResp)
	adminToken := loginResp.Token

	// 2. Get initial egress status for cascade node (ID: 1)
	req = httptest.NewRequest("GET", "/api/v1/admin/nodes/1/egress", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for get egress, got %d: %s", rec.Code, rec.Body.String())
	}
	var egressResp models.EgressStatusResponse
	if err := json.NewDecoder(rec.Body).Decode(&egressResp); err != nil {
		t.Fatalf("failed to decode egress status: %v", err)
	}
	if egressResp.ActiveInterface != "awg1" {
		t.Fatalf("expected initial active interface 'awg1', got '%s'", egressResp.ActiveInterface)
	}

	// 3. Switch egress to awg3
	switchBody, _ := json.Marshal(models.SwitchEgressRequest{Interface: "awg3"})
	req = httptest.NewRequest("POST", "/api/v1/admin/nodes/1/egress", bytes.NewReader(switchBody))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for switch egress, got %d: %s", rec.Code, rec.Body.String())
	}

	// 4. Verify egress status is now awg3
	req = httptest.NewRequest("GET", "/api/v1/admin/nodes/1/egress", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}
	_ = json.NewDecoder(rec.Body).Decode(&egressResp)
	if egressResp.ActiveInterface != "awg3" {
		t.Fatalf("expected active interface 'awg3' after switch, got '%s'", egressResp.ActiveInterface)
	}
}




