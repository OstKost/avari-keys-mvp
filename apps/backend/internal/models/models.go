package models

import "time"

// Role represents a user role.
type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

// User represents a user account in the system.
type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// UserPublic represents user data safe for API responses.
type UserPublic struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Role      Role      `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// Node represents a managed Slave API node (Cascade or Direct).
type Node struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // "cascade" or "direct"
	APIURL    string    `json:"api_url"`
	APIKey    string    `json:"-"` // Hidden in public responses
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// NodePublic represents safe node info for regular users.
type NodePublic struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// NodeWithStatus represents node with live connectivity & ping.
type NodeWithStatus struct {
	Node
	Online    bool  `json:"online"`
	LatencyMs int64 `json:"latency_ms"`
}

// ClientConfig represents a user's VPN key reference in the database and audit logs.
type ClientConfig struct {
	ID                    int64     `json:"id"`
	UserID                int64     `json:"user_id"`
	NodeID                int64     `json:"node_id"`
	ClientName            string    `json:"client_name"` // e.g. "u1_iphone"
	DeviceName            string    `json:"device_name"` // e.g. "iPhone"
	NodeName              string    `json:"node_name,omitempty"`
	NodeType              string    `json:"node_type,omitempty"`
	LastHandshake         string    `json:"last_handshake,omitempty"`
	TotalTrafficBytes     int64     `json:"total_traffic_bytes,omitempty"`
	MonthTrafficBytes     int64     `json:"month_traffic_bytes,omitempty"`
	TotalTrafficFormatted string    `json:"total_traffic_formatted,omitempty"`
	MonthTrafficFormatted string    `json:"month_traffic_formatted,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
}

// PaginatedKeysResponse for Admin key audit list.
type PaginatedKeysResponse struct {
	Keys       []ClientConfig `json:"keys"`
	TotalCount int            `json:"total_count"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

// Auth DTOs
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string     `json:"token"`
	User  UserPublic `json:"user"`
}

type CreateKeyRequest struct {
	NodeID     int64  `json:"node_id"`
	DeviceName string `json:"device_name"`
}

type AddNodeRequest struct {
	Name   string `json:"name"`
	Type   string `json:"type"` // "cascade" or "direct"
	APIURL string `json:"api_url"`
	APIKey string `json:"api_key"`
}

type RestoreNodeRequest struct {
	BackupData string `json:"backup_data"`
}

type UpdateProfileRequest struct {
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

type SetRoleRequest struct {
	Role Role `json:"role"`
}
