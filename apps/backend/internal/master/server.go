package master

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/auth"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/client"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
)

// Config holds Master server configuration.
type Config struct {
	Port      string
	JWTSecret string
}

// Server is the Master Backend API server.
type Server struct {
	cfg     Config
	storage *storage.Storage
	jwtMgr  *auth.JWTManager
	mux     *http.ServeMux
}

// NewServer creates a new Master server instance.
func NewServer(cfg Config, s *storage.Storage) *Server {
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	jwtMgr := auth.NewJWTManager(cfg.JWTSecret, 0)

	srv := &Server{
		cfg:     cfg,
		storage: s,
		jwtMgr:  jwtMgr,
		mux:     http.NewServeMux(),
	}
	srv.routes()
	return srv
}

// Handler returns the HTTP handler with global middleware.
func (s *Server) Handler() http.Handler {
	return s.corsMiddleware(s.jwtMgr.AuthMiddleware(s.mux))
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) routes() {
	// Public Routes
	s.mux.HandleFunc("GET /health", s.handleHealth)
	s.mux.HandleFunc("POST /api/v1/auth/register", s.handleRegister)
	s.mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)

	// User Authenticated Routes
	s.mux.HandleFunc("GET /api/v1/auth/me", auth.RequireAuth(s.handleMe))
	s.mux.HandleFunc("PUT /api/v1/auth/profile", auth.RequireAuth(s.handleUpdateProfile))
	s.mux.HandleFunc("GET /api/v1/nodes", auth.RequireAuth(s.handleListActiveNodes))
	s.mux.HandleFunc("GET /api/v1/keys", auth.RequireAuth(s.handleListUserKeys))
	s.mux.HandleFunc("POST /api/v1/keys", auth.RequireAuth(s.handleCreateKey))
	s.mux.HandleFunc("GET /api/v1/keys/{id}", auth.RequireAuth(s.handleGetKey))
	s.mux.HandleFunc("DELETE /api/v1/keys/{id}", auth.RequireAuth(s.handleDeleteKey))

	// Admin Routes
	s.mux.HandleFunc("GET /api/v1/admin/users", auth.RequireAdmin(s.handleAdminListUsers))
	s.mux.HandleFunc("POST /api/v1/admin/users/{id}/activate", auth.RequireAdmin(s.handleAdminActivateUser))
	s.mux.HandleFunc("POST /api/v1/admin/users/{id}/deactivate", auth.RequireAdmin(s.handleAdminDeactivateUser))
	s.mux.HandleFunc("POST /api/v1/admin/users/{id}/role", auth.RequireAdmin(s.handleAdminSetUserRole))
	s.mux.HandleFunc("DELETE /api/v1/admin/users/{id}", auth.RequireAdmin(s.handleAdminDeleteUser))

	s.mux.HandleFunc("GET /api/v1/admin/nodes", auth.RequireAdmin(s.handleAdminListNodes))
	s.mux.HandleFunc("POST /api/v1/admin/nodes", auth.RequireAdmin(s.handleAdminAddNode))
	s.mux.HandleFunc("DELETE /api/v1/admin/nodes/{id}", auth.RequireAdmin(s.handleAdminDeleteNode))
	s.mux.HandleFunc("POST /api/v1/admin/nodes/{id}/restart", auth.RequireAdmin(s.handleAdminRestartNode))
	s.mux.HandleFunc("GET /api/v1/admin/nodes/{id}/backup", auth.RequireAdmin(s.handleAdminBackupNode))
	s.mux.HandleFunc("POST /api/v1/admin/nodes/{id}/restore", auth.RequireAdmin(s.handleAdminRestoreNode))

	s.mux.HandleFunc("GET /api/v1/admin/keys", auth.RequireAdmin(s.handleAdminListAllKeys))
	s.mux.HandleFunc("GET /api/v1/admin/logs", auth.RequireAdmin(s.handleAdminListAuditLogs))
	s.mux.HandleFunc("POST /api/v1/admin/logs/cleanup", auth.RequireAdmin(s.handleAdminCleanupAuditLogs))

	// Shared / Dashboard Routes
	s.mux.HandleFunc("GET /api/v1/stats/dashboard", auth.RequireAuth(s.handleGetDashboardStats))
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, http.StatusOK, models.HealthResponse{
		Status:  "ok",
		Service: "avari-master",
		Version: "v0.1.0",
	})
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	user, err := s.storage.CreateUser(r.Context(), req.Username, req.Password)
	if err != nil {
		s.logActivity(r, nil, req.Username, models.CategoryAuth, "auth_register_failed", fmt.Sprintf("Ошибка регистрации: %v", err))
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	s.logActivity(r, &user.ID, user.Username, models.CategoryAuth, "auth_register", "Регистрация нового аккаунта (ожидает подтверждения администратора)")

	s.writeJSON(w, http.StatusCreated, map[string]any{
		"message": "Registration successful. Please wait for administrator approval before logging in.",
		"user": models.UserPublic{
			ID:        user.ID,
			Username:  user.Username,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
		},
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	user, err := s.storage.GetUserByUsername(r.Context(), req.Username)
	if err != nil || !auth.CheckPassword(req.Password, user.PasswordHash) {
		s.logActivity(r, nil, req.Username, models.CategoryAuth, "auth_login_failed", "Неудачная попытка входа (неверный пароль или пользователь не найден)")
		s.writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid username or password"})
		return
	}

	if !user.IsActive {
		s.logActivity(r, &user.ID, user.Username, models.CategoryAuth, "auth_login_blocked", "Попытка входа в неактивированный аккаунт")
		s.writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "Your account is pending administrator approval. Please contact support/admin.",
		})
		return
	}

	token, err := s.jwtMgr.GenerateToken(user)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
		return
	}

	s.logActivity(r, &user.ID, user.Username, models.CategoryAuth, "auth_login", "Успешная авторизация в системе")

	s.writeJSON(w, http.StatusOK, models.LoginResponse{
		Token: token,
		User: models.UserPublic{
			ID:        user.ID,
			Username:  user.Username,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
		},
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	user, err := s.storage.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	s.writeJSON(w, http.StatusOK, models.UserPublic{
		ID:        user.ID,
		Username:  user.Username,
		Role:      user.Role,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
	})
}

func (s *Server) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	updatedUser, err := s.storage.UpdateUserProfile(r.Context(), claims.UserID, req.Username, req.Password)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	s.logActivity(r, &updatedUser.ID, updatedUser.Username, models.CategoryProfile, "profile_update", "Обновлены учетные данные профиля")

	token, _ := s.jwtMgr.GenerateToken(updatedUser)

	s.writeJSON(w, http.StatusOK, models.LoginResponse{
		Token: token,
		User: models.UserPublic{
			ID:        updatedUser.ID,
			Username:  updatedUser.Username,
			Role:      updatedUser.Role,
			IsActive:  updatedUser.IsActive,
			CreatedAt: updatedUser.CreatedAt,
		},
	})
}


// User: Nodes & Keys
func (s *Server) handleListActiveNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := s.storage.ListActiveNodesPublic(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	s.writeJSON(w, http.StatusOK, nodes)
}

func (s *Server) handleListUserKeys(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	keys, err := s.storage.ListClientConfigsByUser(r.Context(), claims.UserID)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Fetch node stats to enrich traffic and handshake for user devices
	nodes, _ := s.storage.ListNodes(r.Context())
	statsMap := make(map[int64]*models.StatsSummaryResponse)
	for _, n := range nodes {
		slaveCli := client.NewSlaveClient(n.APIURL, n.APIKey)
		stats, sErr := slaveCli.GetStats(r.Context())
		if sErr == nil && stats != nil {
			statsMap[n.ID] = stats
		}
	}

	for i := range keys {
		if stats, ok := statsMap[keys[i].NodeID]; ok && stats.Peers != nil {
			if p, found := stats.Peers[keys[i].ClientName]; found {
				keys[i].LastHandshake = p.LastHandshake
				keys[i].TotalTrafficBytes = p.RxBytes + p.TxBytes
				keys[i].MonthTrafficBytes = p.MonthBytes
				keys[i].TotalTrafficFormatted = formatBytes(keys[i].TotalTrafficBytes)
				keys[i].MonthTrafficFormatted = formatBytes(keys[i].MonthTrafficBytes)
			}
		}
	}

	s.writeJSON(w, http.StatusOK, keys)
}

func (s *Server) handleCreateKey(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())

	var req models.CreateKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	req.DeviceName = strings.TrimSpace(req.DeviceName)
	if req.DeviceName == "" {
		req.DeviceName = "device"
	}

	node, err := s.storage.GetNodeByID(r.Context(), req.NodeID)
	if err != nil || !node.IsActive {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Selected node is unavailable"})
		return
	}

	// Create unique sanitized client name on the node: e.g. u1_phone
	cleanDevice := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, req.DeviceName)
	clientName := fmt.Sprintf("u%d_%s", claims.UserID, cleanDevice)

	// Call Slave API
	slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
	slaveResp, err := slaveCli.CreateClient(r.Context(), clientName, req.PSK)
	if err != nil {
		s.writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Slave node failed: %v", err)})
		return
	}

	// Save record in DB
	keyRecord, err := s.storage.CreateClientConfig(r.Context(), claims.UserID, node.ID, clientName, req.DeviceName)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	pskDetails := ""
	if req.PSK {
		pskDetails = " [PSK / Shadowrocket]"
	}
	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryKeys, "key_create", fmt.Sprintf("Создан VPN-ключ «%s» (%s)%s на сервере «%s»", req.DeviceName, clientName, pskDetails, node.Name))

	s.writeJSON(w, http.StatusCreated, map[string]any{
		"id":          keyRecord.ID,
		"client_name": clientName,
		"device_name": req.DeviceName,
		"node_id":     node.ID,
		"node_name":   node.Name,
		"node_type":   node.Type,
		"config":      slaveResp.Config,
		"qr_code":     slaveResp.QRCode,
		"created_at":  keyRecord.CreatedAt,
	})
}

func (s *Server) handleGetKey(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid key ID"})
		return
	}

	keyRecord, err := s.storage.GetClientConfigByID(r.Context(), id)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "Key not found"})
		return
	}

	// Verify ownership unless admin
	if keyRecord.UserID != claims.UserID && claims.Role != models.RoleAdmin {
		s.writeJSON(w, http.StatusForbidden, map[string]string{"error": "Access denied"})
		return
	}

	node, err := s.storage.GetNodeByID(r.Context(), keyRecord.NodeID)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "Node not found"})
		return
	}

	slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
	slaveResp, err := slaveCli.GetClient(r.Context(), keyRecord.ClientName)
	if err != nil {
		s.writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Failed to retrieve config from slave: %v", err)})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryKeys, "key_view", fmt.Sprintf("Просмотр конфигурации / QR-кода ключа «%s» (%s)", keyRecord.DeviceName, keyRecord.ClientName))

	s.writeJSON(w, http.StatusOK, map[string]any{
		"id":          keyRecord.ID,
		"client_name": keyRecord.ClientName,
		"device_name": keyRecord.DeviceName,
		"node_id":     node.ID,
		"node_name":   node.Name,
		"node_type":   node.Type,
		"config":      slaveResp.Config,
		"qr_code":     slaveResp.QRCode,
		"created_at":  keyRecord.CreatedAt,
	})
}

func (s *Server) handleDeleteKey(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid key ID"})
		return
	}

	keyRecord, err := s.storage.GetClientConfigByID(r.Context(), id)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "Key not found"})
		return
	}

	if keyRecord.UserID != claims.UserID && claims.Role != models.RoleAdmin {
		s.writeJSON(w, http.StatusForbidden, map[string]string{"error": "Access denied"})
		return
	}

	// Delete from Slave
	node, err := s.storage.GetNodeByID(r.Context(), keyRecord.NodeID)
	if err == nil {
		slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
		_ = slaveCli.DeleteClient(r.Context(), keyRecord.ClientName)
	}

	if err := s.storage.DeleteClientConfig(r.Context(), id); err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryKeys, "key_delete", fmt.Sprintf("Отозван и удален VPN-ключ «%s» (%s)", keyRecord.DeviceName, keyRecord.ClientName))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{
		Success: true,
		Message: "Key successfully deleted",
	})
}

// Admin: Users
func (s *Server) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := s.storage.ListUsers(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	s.writeJSON(w, http.StatusOK, users)
}

func (s *Server) handleAdminActivateUser(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	if err := s.storage.SetUserActive(r.Context(), id, true); err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	targetUser, _ := s.storage.GetUserByID(r.Context(), id)
	targetUsername := ""
	if targetUser != nil {
		targetUsername = targetUser.Username
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_user_activate", fmt.Sprintf("Активирован доступ для пользователя «%s» (ID #%d)", targetUsername, id))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{Success: true, Message: "User activated"})
}

func (s *Server) handleAdminDeactivateUser(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	if err := s.storage.SetUserActive(r.Context(), id, false); err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	targetUser, _ := s.storage.GetUserByID(r.Context(), id)
	targetUsername := ""
	if targetUser != nil {
		targetUsername = targetUser.Username
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_user_deactivate", fmt.Sprintf("Заблокирован доступ для пользователя «%s» (ID #%d)", targetUsername, id))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{Success: true, Message: "User deactivated"})
}

func (s *Server) handleAdminSetUserRole(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	var req models.SetRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if err := s.storage.SetUserRole(r.Context(), id, req.Role); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	targetUser, _ := s.storage.GetUserByID(r.Context(), id)
	targetUsername := ""
	if targetUser != nil {
		targetUsername = targetUser.Username
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_user_role", fmt.Sprintf("Изменена роль пользователя «%s» (ID #%d) на «%s»", targetUsername, id, req.Role))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{
		Success: true,
		Message: fmt.Sprintf("Роль пользователя изменена на %s", req.Role),
	})
}

func (s *Server) handleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	targetUser, _ := s.storage.GetUserByID(r.Context(), id)
	targetUsername := ""
	if targetUser != nil {
		targetUsername = targetUser.Username
	}

	if err := s.storage.DeleteUser(r.Context(), id); err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_user_delete", fmt.Sprintf("Удален пользователь «%s» (ID #%d)", targetUsername, id))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{Success: true, Message: "User deleted"})
}

// Admin: Nodes
func (s *Server) handleAdminListNodes(w http.ResponseWriter, r *http.Request) {
	nodes, err := s.storage.ListNodes(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var res []models.NodeWithStatus
	for _, n := range nodes {
		slaveCli := client.NewSlaveClient(n.APIURL, n.APIKey)
		start := time.Now()
		health, hErr := slaveCli.CheckHealth(r.Context())
		latency := time.Since(start).Milliseconds()
		isOnline := hErr == nil && health != nil && health.Status == "ok"
		if !isOnline {
			latency = 0
		}
		res = append(res, models.NodeWithStatus{
			Node:      n,
			Online:    isOnline,
			LatencyMs: latency,
		})
	}

	s.writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleAdminRestartNode(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid node ID"})
		return
	}

	node, err := s.storage.GetNodeByID(r.Context(), id)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "Node not found"})
		return
	}

	slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
	if err := slaveCli.Restart(r.Context()); err != nil {
		s.writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Restart failed: %v", err)})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_node_restart", fmt.Sprintf("Перезапущен сервис AmneziaWG на узле «%s» (ID #%d)", node.Name, node.ID))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{
		Success: true,
		Message: fmt.Sprintf("Node '%s' AWG service restarted successfully", node.Name),
	})
}

func (s *Server) handleAdminBackupNode(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid node ID"})
		return
	}

	node, err := s.storage.GetNodeByID(r.Context(), id)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "Node not found"})
		return
	}

	slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
	backup, err := slaveCli.Backup(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Backup failed: %v", err)})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_node_backup", fmt.Sprintf("Выгружена резервная копия конфигурации узла «%s» (ID #%d)", node.Name, node.ID))

	s.writeJSON(w, http.StatusOK, backup)
}

func (s *Server) handleAdminRestoreNode(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid node ID"})
		return
	}

	var req models.RestoreNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON body"})
		return
	}
	if req.BackupData == "" {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "backup_data is required"})
		return
	}

	node, err := s.storage.GetNodeByID(r.Context(), id)
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "Node not found"})
		return
	}

	slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
	if err := slaveCli.Restore(r.Context(), req.BackupData); err != nil {
		s.writeJSON(w, http.StatusBadGateway, map[string]string{"error": fmt.Sprintf("Restore failed: %v", err)})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_node_restore", fmt.Sprintf("Восстановлена конфигурация узла «%s» (ID #%d) из резервной копии", node.Name, node.ID))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{
		Success: true,
		Message: fmt.Sprintf("Node '%s' restored successfully from backup", node.Name),
	})
}

func (s *Server) handleAdminAddNode(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	var req models.AddNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.APIURL = strings.TrimSpace(req.APIURL)
	req.APIKey = strings.TrimSpace(req.APIKey)
	req.Type = strings.TrimSpace(req.Type)

	if req.Name == "" || req.APIURL == "" || req.APIKey == "" {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Name, API URL, and API Key are required"})
		return
	}

	if req.Type != "cascade" && req.Type != "direct" {
		req.Type = "direct"
	}

	node, err := s.storage.CreateNode(r.Context(), req.Name, req.Type, req.APIURL, req.APIKey, req.IsMobileOptimized)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	mobileTag := ""
	if node.IsMobileOptimized {
		mobileTag = " [Mobile 443/UDP]"
	}
	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_node_create", fmt.Sprintf("Добавлен новый сервер «%s» (%s%s, URL: %s)", node.Name, node.Type, mobileTag, node.APIURL))

	s.writeJSON(w, http.StatusCreated, node)
}

func (s *Server) handleAdminDeleteNode(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid node ID"})
		return
	}

	node, _ := s.storage.GetNodeByID(r.Context(), id)
	nodeName := ""
	if node != nil {
		nodeName = node.Name
	}

	if err := s.storage.DeleteNode(r.Context(), id); err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_node_delete", fmt.Sprintf("Удален сервер «%s» (ID #%d)", nodeName, id))

	s.writeJSON(w, http.StatusOK, models.GenericSuccessResponse{Success: true, Message: "Node deleted"})
}

func (s *Server) handleAdminListAllKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := s.storage.ListAllClientConfigs(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Filter by search and node_id
	search := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("search")))
	nodeIDStr := strings.TrimSpace(r.URL.Query().Get("node_id"))
	var filterNodeID int64
	if nodeIDStr != "" {
		filterNodeID, _ = strconv.ParseInt(nodeIDStr, 10, 64)
	}

	// Fetch node stats cache to enrich traffic and handshake
	nodes, _ := s.storage.ListNodes(r.Context())
	statsMap := make(map[int64]*models.StatsSummaryResponse)
	for _, n := range nodes {
		slaveCli := client.NewSlaveClient(n.APIURL, n.APIKey)
		stats, sErr := slaveCli.GetStats(r.Context())
		if sErr == nil && stats != nil {
			statsMap[n.ID] = stats
		}
	}

	var filtered []models.ClientConfig
	for _, k := range keys {
		if filterNodeID > 0 && k.NodeID != filterNodeID {
			continue
		}
		if search != "" {
			matchDevice := strings.Contains(strings.ToLower(k.DeviceName), search)
			matchClient := strings.Contains(strings.ToLower(k.ClientName), search)
			matchNode := strings.Contains(strings.ToLower(k.NodeName), search)
			if !matchDevice && !matchClient && !matchNode {
				continue
			}
		}

		// Enrich stats if available
		if stats, ok := statsMap[k.NodeID]; ok && stats.Peers != nil {
			if p, found := stats.Peers[k.ClientName]; found {
				k.LastHandshake = p.LastHandshake
				k.TotalTrafficBytes = p.RxBytes + p.TxBytes
				k.MonthTrafficBytes = p.MonthBytes
				k.TotalTrafficFormatted = formatBytes(k.TotalTrafficBytes)
				k.MonthTrafficFormatted = formatBytes(k.MonthTrafficBytes)
			}
		}

		filtered = append(filtered, k)
	}

	// Pagination
	page := 1
	limit := 10
	if pStr := r.URL.Query().Get("page"); pStr != "" {
		if p, pErr := strconv.Atoi(pStr); pErr == nil && p > 0 {
			page = p
		}
	}
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, lErr := strconv.Atoi(lStr); lErr == nil && l > 0 {
			limit = l
		}
	}

	totalCount := len(filtered)
	totalPages := (totalCount + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	startIndex := (page - 1) * limit
	var pagedKeys []models.ClientConfig
	if startIndex < totalCount {
		endIndex := startIndex + limit
		if endIndex > totalCount {
			endIndex = totalCount
		}
		pagedKeys = filtered[startIndex:endIndex]
	} else {
		pagedKeys = []models.ClientConfig{}
	}

	s.writeJSON(w, http.StatusOK, models.PaginatedKeysResponse{
		Keys:       pagedKeys,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

// Admin: Audit Logs
func (s *Server) handleAdminListAuditLogs(w http.ResponseWriter, r *http.Request) {
	var filter models.AuditLogFilter

	if uidStr := strings.TrimSpace(r.URL.Query().Get("user_id")); uidStr != "" {
		if uid, err := strconv.ParseInt(uidStr, 10, 64); err == nil && uid > 0 {
			filter.UserID = &uid
		}
	}

	filter.Username = strings.TrimSpace(r.URL.Query().Get("username"))
	filter.Category = strings.TrimSpace(r.URL.Query().Get("category"))
	filter.Action = strings.TrimSpace(r.URL.Query().Get("action"))
	filter.FromDate = strings.TrimSpace(r.URL.Query().Get("from"))
	filter.ToDate = strings.TrimSpace(r.URL.Query().Get("to"))

	page := 1
	limit := 50
	if pStr := r.URL.Query().Get("page"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			page = p
		}
	}
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			limit = l
		}
	}
	filter.Page = page
	filter.Limit = limit

	logs, totalCount, err := s.storage.ListAuditLogs(r.Context(), filter)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	s.writeJSON(w, http.StatusOK, models.PaginatedAuditLogsResponse{
		Logs:       logs,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

func (s *Server) handleAdminCleanupAuditLogs(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())

	var req models.CleanupLogsRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	days := req.Days
	if days <= 0 {
		days = 90 // Default 3 months
	}

	deleted, err := s.storage.PurgeAuditLogsOlderThan(r.Context(), days)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.logActivity(r, &claims.UserID, claims.Username, models.CategoryAdmin, "admin_logs_cleanup", fmt.Sprintf("Очищен журнал аудита старше %d дней (удалено записей: %d)", days, deleted))

	s.writeJSON(w, http.StatusOK, models.CleanupLogsResponse{
		Success:      true,
		Message:      fmt.Sprintf("Успешно удалено записей старше %d дней: %d", days, deleted),
		DeletedCount: deleted,
	})
}

func (s *Server) logActivity(r *http.Request, userID *int64, username string, category models.AuditLogCategory, action string, details string) {
	ip := getIPAddress(r)
	if username == "" {
		username = "anonymous"
	}
	logEntry := &models.AuditLog{
		UserID:    userID,
		Username:  username,
		Action:    action,
		Category:  category,
		IPAddress: ip,
		Details:   details,
	}
	_ = s.storage.CreateAuditLog(r.Context(), logEntry)
}

func getIPAddress(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		return host
	}
	return ip
}

func formatBytes(b int64) string {
	if b <= 0 {
		return "0 B"
	}
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

func (s *Server) handleGetDashboardStats(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetUserFromContext(r.Context())

	// 1. Users metrics
	users, err := s.storage.ListUsers(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	totalUsers := len(users)
	activeUsers := 0
	pendingUsers := 0
	for _, u := range users {
		if u.IsActive {
			activeUsers++
		} else {
			pendingUsers++
		}
	}

	// 2. Client configs (total keys)
	allConfigs, err := s.storage.ListAllClientConfigs(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	totalKeys := len(allConfigs)

	// 3. Nodes stats & latency
	nodes, err := s.storage.ListNodes(r.Context())
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	totalNodes := len(nodes)
	onlineNodes := 0
	var totalLatencySum int64
	var latencyCount int64

	var totalTrafficBytes int64
	var monthTrafficBytes int64
	var cascadeTrafficBytes int64
	var directTrafficBytes int64
	activeDevicesOnline := 0

	var nodeDashboardList []models.NodeDashboardInfo

	for _, n := range nodes {
		slaveCli := client.NewSlaveClient(n.APIURL, n.APIKey)
		start := time.Now()
		health, hErr := slaveCli.CheckHealth(r.Context())
		latency := time.Since(start).Milliseconds()

		isOnline := hErr == nil && health != nil && health.Status == "ok"
		if isOnline {
			onlineNodes++
			totalLatencySum += latency
			latencyCount++
		} else {
			latency = 0
		}

		var nodePeerCount int
		var nodeTrafficBytes int64

		stats, sErr := slaveCli.GetStats(r.Context())
		if sErr == nil && stats != nil && stats.Peers != nil {
			nodePeerCount = len(stats.Peers)
			for _, peer := range stats.Peers {
				peerTotal := peer.RxBytes + peer.TxBytes
				nodeTrafficBytes += peerTotal
				totalTrafficBytes += peerTotal
				monthTrafficBytes += peer.MonthBytes

				if n.Type == "cascade" {
					cascadeTrafficBytes += peerTotal
				} else {
					directTrafficBytes += peerTotal
				}

				// Check active handshake
				if peer.LastHandshake != "" && !strings.Contains(strings.ToLower(peer.LastHandshake), "never") && !strings.Contains(strings.ToLower(peer.LastHandshake), "не") {
					activeDevicesOnline++
				}
			}
		}

		nodeDashboardList = append(nodeDashboardList, models.NodeDashboardInfo{
			ID:                    n.ID,
			Name:                  n.Name,
			Type:                  n.Type,
			Online:                isOnline,
			LatencyMs:             latency,
			PeerCount:             nodePeerCount,
			TotalTrafficFormatted: formatBytes(nodeTrafficBytes),
		})
	}

	var avgLatencyMs int64
	if latencyCount > 0 {
		avgLatencyMs = totalLatencySum / latencyCount
	}

	// Calculate topology breakdown percentages
	cascadePct := 50
	directPct := 50
	combinedTraffic := cascadeTrafficBytes + directTrafficBytes
	if combinedTraffic > 0 {
		cascadePct = int((cascadeTrafficBytes * 100) / combinedTraffic)
		directPct = 100 - cascadePct
	}

	systemStatus := "operational"
	if totalNodes > 0 && onlineNodes == 0 {
		systemStatus = "outage"
	} else if totalNodes > 0 && onlineNodes < totalNodes {
		systemStatus = "degraded"
	}

	resp := models.DashboardStatsResponse{
		TotalUsers:            totalUsers,
		ActiveUsers:           activeUsers,
		TotalKeys:             totalKeys,
		ActiveDevicesOnline:   activeDevicesOnline,
		TotalTrafficBytes:     totalTrafficBytes,
		MonthTrafficBytes:     monthTrafficBytes,
		TotalTrafficFormatted: formatBytes(totalTrafficBytes),
		MonthTrafficFormatted: formatBytes(monthTrafficBytes),
		TotalNodes:            totalNodes,
		OnlineNodes:           onlineNodes,
		AvgLatencyMs:          avgLatencyMs,
		SystemStatus:          systemStatus,
		TopologyBreakdown: models.TopologyTrafficBreakdown{
			CascadeTrafficBytes:     cascadeTrafficBytes,
			DirectTrafficBytes:      directTrafficBytes,
			CascadeTrafficFormatted: formatBytes(cascadeTrafficBytes),
			DirectTrafficFormatted:  formatBytes(directTrafficBytes),
			CascadePercentage:       cascadePct,
			DirectPercentage:        directPct,
		},
		Nodes:       nodeDashboardList,
		GeneratedAt: time.Now(),
	}

	// Admin-only insights
	if claims != nil && claims.Role == models.RoleAdmin {
		resp.PendingUsers = pendingUsers
	}

	s.writeJSON(w, http.StatusOK, resp)
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}


