package runner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
)

// MockRunner is an in-memory implementation of AWGRunner for development and testing.
type MockRunner struct {
	mu      sync.RWMutex
	clients map[string]*models.ClientResponse
	healthy bool
}

// NewMockRunner creates a new instance of MockRunner.
func NewMockRunner(healthy bool) *MockRunner {
	return &MockRunner{
		clients: make(map[string]*models.ClientResponse),
		healthy: healthy,
	}
}

func (m *MockRunner) CheckHealth(ctx context.Context) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.healthy
}

func (m *MockRunner) AddClient(ctx context.Context, name string) (*models.ClientResponse, error) {
	if err := ValidateClientName(name); err != nil {
		return nil, err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	config := fmt.Sprintf(`[Interface]
Address = 10.7.0.%d/32
PrivateKey = aMockPrivateKeyForTestingPurposesOnly12345=
Jc = 4
Jmin = 40
Jmax = 70
S1 = 15
S2 = 25
H1 = 1
H2 = 2
H3 = 3
H4 = 4

[Peer]
PublicKey = aMockServerPublicKeyForTestingPurposes67890=
Endpoint = 198.51.100.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`, len(m.clients)+3)

	mockQR := fmt.Sprintf("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='black'/><text x='10' y='50' fill='white'>QR:%s</text></svg>", name)

	res := &models.ClientResponse{
		Name:      name,
		Config:    config,
		QRCode:    mockQR,
		PublicKey: fmt.Sprintf("mockPubKey-%s", name),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	m.clients[name] = res
	return res, nil
}

func (m *MockRunner) RemoveClient(ctx context.Context, name string) error {
	if err := ValidateClientName(name); err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.clients[name]; !exists {
		return fmt.Errorf("client '%s' not found", name)
	}
	delete(m.clients, name)
	return nil
}

func (m *MockRunner) GetClient(ctx context.Context, name string) (*models.ClientResponse, error) {
	if err := ValidateClientName(name); err != nil {
		return nil, err
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	res, exists := m.clients[name]
	if !exists {
		return nil, fmt.Errorf("client '%s' not found", name)
	}
	return res, nil
}

func (m *MockRunner) ListClients(ctx context.Context) ([]models.ClientListItem, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []models.ClientListItem
	for name := range m.clients {
		list = append(list, models.ClientListItem{
			Name:      name,
			CreatedAt: time.Now().UTC(),
			Status:    "active",
		})
	}
	return list, nil
}

func (m *MockRunner) GetStats(ctx context.Context) (map[string]any, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return map[string]any{
		"active_peers": len(m.clients),
		"uptime":       "3d 12h 4m",
		"rx_bytes":     104857600,
		"tx_bytes":     524288000,
	}, nil
}
