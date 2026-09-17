package storage

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math/big"
	"os"
	"path/filepath"
	"strings"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

// Storage wraps the SQLite database.
type Storage struct {
	db *sql.DB
}

// NewSQLiteStorage initializes the SQLite database at dbPath and runs migrations.
func NewSQLiteStorage(dbPath string) (*Storage, error) {
	if dbPath == "" {
		dbPath = "./data/avari-master.db"
	}

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory %s: %w", dir, err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Pragmas for performance and concurrency
	if _, err := db.Exec(`
		PRAGMA journal_mode=WAL;
		PRAGMA foreign_keys=ON;
		PRAGMA busy_timeout=5000;
	`); err != nil {
		return nil, fmt.Errorf("failed to set sqlite pragmas: %w", err)
	}

	s := &Storage{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	if err := s.ensureAdminUser(); err != nil {
		return nil, fmt.Errorf("failed to ensure admin user: %w", err)
	}

	return s, nil
}

func (s *Storage) Close() error {
	return s.db.Close()
}

func (s *Storage) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		is_active INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS nodes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL, -- 'cascade' or 'direct'
		api_url TEXT NOT NULL,
		api_key TEXT NOT NULL,
		is_active INTEGER NOT NULL DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS client_configs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		node_id INTEGER NOT NULL,
		client_name TEXT NOT NULL,
		device_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
	);
	`
	_, err := s.db.Exec(schema)
	return err
}

func (s *Storage) ensureAdminUser() error {
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM users WHERE role = 'admin'`).Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	adminUsername := os.Getenv("ADMIN_USER")
	if adminUsername == "" {
		adminUsername = "Forve"
	}

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = generateRandomPassword(16)
		log.Printf("\n======================================================\n"+
			"[MASTER AUTH] Default Admin Account Created!\n"+
			"Username: %s\n"+
			"Password: %s\n"+
			"Save this password in a secure place.\n"+
			"======================================================\n", adminUsername, adminPassword)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	_, err = s.db.Exec(`
		INSERT INTO users (username, password_hash, role, is_active)
		VALUES (?, ?, ?, 1)
	`, adminUsername, string(hash), string(models.RoleAdmin))

	return err
}

func generateRandomPassword(length int) string {
	const charset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*"
	res := make([]byte, length)
	for i := range res {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		res[i] = charset[n.Int64()]
	}
	return string(res)
}

// User methods
func (s *Storage) CreateUser(ctx context.Context, username, password string) (*models.User, error) {
	username = strings.TrimSpace(username)
	if len(username) < 3 {
		return nil, errors.New("username must be at least 3 characters")
	}
	if len(password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO users (username, password_hash, role, is_active)
		VALUES (?, ?, 'user', 0)
	`, username, string(hash))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return nil, errors.New("username already exists")
		}
		return nil, err
	}

	id, _ := res.LastInsertId()
	return s.GetUserByID(ctx, id)
}

func (s *Storage) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	var u models.User
	var role string
	var isActive int
	err := s.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, role, is_active, created_at
		FROM users WHERE id = ?
	`, id).Scan(&u.ID, &u.Username, &u.PasswordHash, &role, &isActive, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.Role = models.Role(role)
	u.IsActive = isActive == 1
	return &u, nil
}

func (s *Storage) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	var u models.User
	var role string
	var isActive int
	err := s.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, role, is_active, created_at
		FROM users WHERE username = ?
	`, strings.TrimSpace(username)).Scan(&u.ID, &u.Username, &u.PasswordHash, &role, &isActive, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.Role = models.Role(role)
	u.IsActive = isActive == 1
	return &u, nil
}

func (s *Storage) ListUsers(ctx context.Context) ([]models.UserPublic, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, username, role, is_active, created_at
		FROM users ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.UserPublic
	for rows.Next() {
		var u models.UserPublic
		var role string
		var isActive int
		if err := rows.Scan(&u.ID, &u.Username, &role, &isActive, &u.CreatedAt); err != nil {
			return nil, err
		}
		u.Role = models.Role(role)
		u.IsActive = isActive == 1
		list = append(list, u)
	}
	return list, nil
}

func (s *Storage) SetUserActive(ctx context.Context, id int64, active bool) error {
	isActiveVal := 0
	if active {
		isActiveVal = 1
	}
	res, err := s.db.ExecContext(ctx, `UPDATE users SET is_active = ? WHERE id = ?`, isActiveVal, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

func (s *Storage) SetUserRole(ctx context.Context, id int64, role models.Role) error {
	if role != models.RoleAdmin && role != models.RoleUser {
		return errors.New("invalid role")
	}
	res, err := s.db.ExecContext(ctx, `UPDATE users SET role = ? WHERE id = ?`, string(role), id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

func (s *Storage) UpdateUserProfile(ctx context.Context, id int64, username, password string) (*models.User, error) {
	u, err := s.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}

	username = strings.TrimSpace(username)
	if username != "" {
		if len(username) < 3 {
			return nil, errors.New("username must be at least 3 characters")
		}
		u.Username = username
	}

	if strings.TrimSpace(password) != "" {
		if len(password) < 6 {
			return nil, errors.New("password must be at least 6 characters")
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		u.PasswordHash = string(hash)
	}

	_, err = s.db.ExecContext(ctx, `
		UPDATE users SET username = ?, password_hash = ? WHERE id = ?
	`, u.Username, u.PasswordHash, id)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return nil, errors.New("username already exists")
		}
		return nil, err
	}

	return u, nil
}

func (s *Storage) DeleteUser(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}


// Node methods
func (s *Storage) CreateNode(ctx context.Context, name, nodeType, apiURL, apiKey string) (*models.Node, error) {
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO nodes (name, type, api_url, api_key, is_active)
		VALUES (?, ?, ?, ?, 1)
	`, name, nodeType, apiURL, apiKey)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.GetNodeByID(ctx, id)
}

func (s *Storage) GetNodeByID(ctx context.Context, id int64) (*models.Node, error) {
	var n models.Node
	var isActive int
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, type, api_url, api_key, is_active, created_at
		FROM nodes WHERE id = ?
	`, id).Scan(&n.ID, &n.Name, &n.Type, &n.APIURL, &n.APIKey, &isActive, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	n.IsActive = isActive == 1
	return &n, nil
}

func (s *Storage) ListNodes(ctx context.Context) ([]models.Node, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, type, api_url, api_key, is_active, created_at
		FROM nodes ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Node
	for rows.Next() {
		var n models.Node
		var isActive int
		if err := rows.Scan(&n.ID, &n.Name, &n.Type, &n.APIURL, &n.APIKey, &isActive, &n.CreatedAt); err != nil {
			return nil, err
		}
		n.IsActive = isActive == 1
		list = append(list, n)
	}
	return list, nil
}

func (s *Storage) ListActiveNodesPublic(ctx context.Context) ([]models.NodePublic, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, type, is_active, created_at
		FROM nodes WHERE is_active = 1 ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.NodePublic
	for rows.Next() {
		var n models.NodePublic
		var isActive int
		if err := rows.Scan(&n.ID, &n.Name, &n.Type, &isActive, &n.CreatedAt); err != nil {
			return nil, err
		}
		n.IsActive = isActive == 1
		list = append(list, n)
	}
	return list, nil
}

func (s *Storage) DeleteNode(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM nodes WHERE id = ?`, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("node not found")
	}
	return nil
}

// ClientConfig methods
func (s *Storage) CreateClientConfig(ctx context.Context, userID, nodeID int64, clientName, deviceName string) (*models.ClientConfig, error) {
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO client_configs (user_id, node_id, client_name, device_name)
		VALUES (?, ?, ?, ?)
	`, userID, nodeID, clientName, deviceName)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.GetClientConfigByID(ctx, id)
}

func (s *Storage) GetClientConfigByID(ctx context.Context, id int64) (*models.ClientConfig, error) {
	var c models.ClientConfig
	err := s.db.QueryRowContext(ctx, `
		SELECT c.id, c.user_id, c.node_id, c.client_name, c.device_name, c.created_at, n.name, n.type
		FROM client_configs c
		JOIN nodes n ON c.node_id = n.id
		WHERE c.id = ?
	`, id).Scan(&c.ID, &c.UserID, &c.NodeID, &c.ClientName, &c.DeviceName, &c.CreatedAt, &c.NodeName, &c.NodeType)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Storage) ListClientConfigsByUser(ctx context.Context, userID int64) ([]models.ClientConfig, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.user_id, c.node_id, c.client_name, c.device_name, c.created_at, n.name, n.type
		FROM client_configs c
		JOIN nodes n ON c.node_id = n.id
		WHERE c.user_id = ?
		ORDER BY c.id DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ClientConfig
	for rows.Next() {
		var c models.ClientConfig
		if err := rows.Scan(&c.ID, &c.UserID, &c.NodeID, &c.ClientName, &c.DeviceName, &c.CreatedAt, &c.NodeName, &c.NodeType); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}

func (s *Storage) ListAllClientConfigs(ctx context.Context) ([]models.ClientConfig, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.user_id, c.node_id, c.client_name, c.device_name, c.created_at, n.name, n.type
		FROM client_configs c
		JOIN nodes n ON c.node_id = n.id
		ORDER BY c.id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ClientConfig
	for rows.Next() {
		var c models.ClientConfig
		if err := rows.Scan(&c.ID, &c.UserID, &c.NodeID, &c.ClientName, &c.DeviceName, &c.CreatedAt, &c.NodeName, &c.NodeType); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}

func (s *Storage) DeleteClientConfig(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM client_configs WHERE id = ?`, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("client config not found")
	}
	return nil
}
