package models

import "time"

// HealthResponse represents system and service health status.
type HealthResponse struct {
	Status       string `json:"status"`
	Service      string `json:"service"`
	AWGAvailable bool   `json:"awg_available"`
	Version      string `json:"version,omitempty"`
}

// ClientCreateRequest payload for creating an AWG client key.
type ClientCreateRequest struct {
	Name string `json:"name"`
	PSK  bool   `json:"psk,omitempty"`
}

// ClientResponse represents the output when a client is created or retrieved.
type ClientResponse struct {
	Name      string `json:"name"`
	Config    string `json:"config"`
	QRCode    string `json:"qr_code,omitempty"`    // Base64 PNG or SVG data URI
	PublicKey string `json:"public_key,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
}

// ClientListItem represents an entry in the client list.
type ClientListItem struct {
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	Status    string    `json:"status"`
}

// PeerStats details per-peer traffic and handshakes.
type PeerStats struct {
	ClientName    string `json:"client_name"`
	LastHandshake string `json:"last_handshake"`
	RxBytes       int64  `json:"rx_bytes"`
	TxBytes       int64  `json:"tx_bytes"`
	MonthBytes    int64  `json:"month_bytes"`
}

// StatsSummaryResponse represents aggregate AWG statistics.
type StatsSummaryResponse struct {
	ActivePeers int                  `json:"active_peers"`
	Uptime      string               `json:"uptime"`
	TotalRx     int64                `json:"total_rx"`
	TotalTx     int64                `json:"total_tx"`
	Peers       map[string]PeerStats `json:"peers,omitempty"`
}

// BackupResponse holds exported configuration data.
type BackupResponse struct {
	Timestamp  string `json:"timestamp"`
	BackupData string `json:"backup_data"` // base64 / zip archive or conf text
}

// GenericSuccessResponse for deletion and status toggles.
type GenericSuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}
