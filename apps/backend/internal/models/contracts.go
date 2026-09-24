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
	QRCode    string `json:"qr_code,omitempty"`     // Base64 PNG or SVG data URI for AWG
	VPNURI    string `json:"vpn_uri,omitempty"`     // AmneziaVPN URI (vpn://...)
	VPNQRCode string `json:"vpn_qr_code,omitempty"` // Base64 PNG or SVG data URI for AmneziaVPN
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

// SwitchEgressRequest payload for switching cascade egress interface.
type SwitchEgressRequest struct {
	Interface string `json:"interface"` // e.g. "awg1" or "awg3"
}

// EgressStatusResponse represents the active and available egress routes for a cascade node.
type EgressStatusResponse struct {
	ActiveInterface     string   `json:"active_interface"`
	AvailableInterfaces []string `json:"available_interfaces"`
	Details             string   `json:"details,omitempty"`
}

