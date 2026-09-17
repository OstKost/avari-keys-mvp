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

// GenericSuccessResponse for deletion and status toggles.
type GenericSuccessResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}
