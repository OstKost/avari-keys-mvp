package slave_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/runner"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/slave"
)

func setupTestSlave() (*slave.Server, string) {
	apiKey := "test-secret-token-12345"
	mockRunner := runner.NewMockRunner(true)
	srv := slave.NewServer(slave.Config{
		APIKey: apiKey,
		Port:   "8081",
	}, mockRunner)
	return srv, apiKey
}

func TestDecoyPage(t *testing.T) {
	srv, _ := setupTestSlave()
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()

	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Node Gateway") {
		t.Fatalf("expected decoy HTML content, got %s", rec.Body.String())
	}
}

func TestHealthCheck(t *testing.T) {
	srv, _ := setupTestSlave()
	req := httptest.NewRequest("GET", "/health", nil)
	rec := httptest.NewRecorder()

	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}

	var res models.HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode health JSON: %v", err)
	}
	if res.Status != "ok" || !res.AWGAvailable {
		t.Fatalf("unexpected health response: %+v", res)
	}
}

func TestAuthMiddleware(t *testing.T) {
	srv, apiKey := setupTestSlave()

	// 1. Missing API Key -> 401
	req := httptest.NewRequest("GET", "/api/v1/clients", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d", rec.Code)
	}

	// 2. Invalid API Key -> 401
	req = httptest.NewRequest("GET", "/api/v1/clients", nil)
	req.Header.Set("X-API-Key", "wrong-key")
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d", rec.Code)
	}

	// 3. Valid X-API-Key -> 200
	req = httptest.NewRequest("GET", "/api/v1/clients", nil)
	req.Header.Set("X-API-Key", apiKey)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}

	// 4. Valid Authorization Bearer -> 200
	req = httptest.NewRequest("GET", "/api/v1/clients", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}
}

func TestClientLifecycle(t *testing.T) {
	srv, apiKey := setupTestSlave()

	clientName := "alice-phone"

	// 1. Create client
	body, _ := json.Marshal(models.ClientCreateRequest{Name: clientName, PSK: true})
	req := httptest.NewRequest("POST", "/api/v1/clients", bytes.NewReader(body))
	req.Header.Set("X-API-Key", apiKey)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var created models.ClientResponse
	if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
		t.Fatalf("failed to decode client response: %v", err)
	}
	if created.Name != clientName || !strings.Contains(created.Config, "[Interface]") || !strings.Contains(created.Config, "PresharedKey") {
		t.Fatalf("invalid client response or missing PSK: %+v", created)
	}

	// 2. Get client details
	req = httptest.NewRequest("GET", "/api/v1/clients/"+clientName, nil)
	req.Header.Set("X-API-Key", apiKey)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}

	// 3. List clients
	req = httptest.NewRequest("GET", "/api/v1/clients", nil)
	req.Header.Set("X-API-Key", apiKey)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	var list []models.ClientListItem
	if err := json.NewDecoder(rec.Body).Decode(&list); err != nil {
		t.Fatalf("failed to decode client list: %v", err)
	}
	if len(list) != 1 || list[0].Name != clientName {
		t.Fatalf("expected 1 client in list, got %+v", list)
	}

	// 4. Delete client
	req = httptest.NewRequest("DELETE", "/api/v1/clients/"+clientName, nil)
	req.Header.Set("X-API-Key", apiKey)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}

	// 5. Verify client no longer exists
	req = httptest.NewRequest("GET", "/api/v1/clients/"+clientName, nil)
	req.Header.Set("X-API-Key", apiKey)
	rec = httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 Not Found after deletion, got %d", rec.Code)
	}
}

func TestStatsEndpoint(t *testing.T) {
	srv, apiKey := setupTestSlave()

	req := httptest.NewRequest("GET", "/api/v1/stats", nil)
	req.Header.Set("X-API-Key", apiKey)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}
}
