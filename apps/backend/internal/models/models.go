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

// ClientConfig represents a user's VPN key reference in the database.
type ClientConfig struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	NodeID     int64     `json:"node_id"`
	ClientName string    `json:"client_name"` // e.g. "u1_iphone"
	DeviceName string    `json:"device_name"` // e.g. "iPhone"
	NodeName   string    `json:"node_name,omitempty"`
	NodeType   string    `json:"node_type,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
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
