package runner

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
)

// RealRunner executes manage_amneziawg.sh via os/exec.
type RealRunner struct {
	scriptPath string
	configsDir string

	mu             sync.RWMutex
	lastHealthTime time.Time
	lastHealthVal  bool
}

// NewRealRunner creates a new RealRunner instance.
func NewRealRunner(scriptPath, configsDir string) *RealRunner {
	if scriptPath == "" {
		scriptPath = "/root/awg/manage_amneziawg.sh"
	}
	if configsDir == "" {
		configsDir = "/root/awg/clients"
	}
	return &RealRunner{
		scriptPath: scriptPath,
		configsDir: configsDir,
	}
}

func (r *RealRunner) CheckHealth(ctx context.Context) bool {
	if _, err := os.Stat(r.scriptPath); err != nil {
		return false
	}

	r.mu.RLock()
	if time.Since(r.lastHealthTime) < 15*time.Second {
		val := r.lastHealthVal
		r.mu.RUnlock()
		return val
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Since(r.lastHealthTime) < 15*time.Second {
		return r.lastHealthVal
	}

	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "status")
	healthy := cmd.Run() == nil

	r.lastHealthVal = healthy
	r.lastHealthTime = time.Now()
	return healthy
}

func (r *RealRunner) AddClient(ctx context.Context, name string, psk bool) (*models.ClientResponse, error) {
	if err := ValidateClientName(name); err != nil {
		return nil, err
	}

	args := []string{r.scriptPath, "add", name, "--yes"}
	if psk {
		args = append(args, "--psk")
	}

	cmd := exec.CommandContext(ctx, "bash", args...)
	cmd.Dir = filepath.Dir(r.scriptPath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("manage_amneziawg.sh add failed: %w (stderr: %s)", err, stderr.String())
	}

	return r.GetClient(ctx, name)
}

func (r *RealRunner) RemoveClient(ctx context.Context, name string) error {
	if err := ValidateClientName(name); err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "remove", name, "--yes")
	cmd.Dir = filepath.Dir(r.scriptPath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("manage_amneziawg.sh remove failed: %w (stderr: %s)", err, stderr.String())
	}
	return nil
}

func (r *RealRunner) GetClient(ctx context.Context, name string) (*models.ClientResponse, error) {
	if err := ValidateClientName(name); err != nil {
		return nil, err
	}

	scriptDir := filepath.Dir(r.scriptPath)
	// 1. Candidate paths where manage_amneziawg.sh stores .conf files
	candidatePaths := []string{
		filepath.Join("/root/awg", fmt.Sprintf("%s.conf", name)),
		filepath.Join("/root/awg/clients", fmt.Sprintf("%s.conf", name)),
		filepath.Join(r.configsDir, fmt.Sprintf("%s.conf", name)),
		filepath.Join(scriptDir, fmt.Sprintf("%s.conf", name)),
		filepath.Join(scriptDir, "clients", fmt.Sprintf("%s.conf", name)),
		filepath.Join("/opt/avari-keys", fmt.Sprintf("%s.conf", name)),
		filepath.Join("/root", fmt.Sprintf("%s.conf", name)),
		filepath.Join("/etc/amnezia/amneziawg", fmt.Sprintf("%s.conf", name)),
		filepath.Join("/etc/amnezia/amneziawg/clients", fmt.Sprintf("%s.conf", name)),
	}

	var rawConfig string
	var foundPath string
	for _, p := range candidatePaths {
		if confBytes, err := os.ReadFile(p); err == nil && len(confBytes) > 0 {
			rawConfig = string(confBytes)
			foundPath = p
			break
		}
	}

	if foundPath == "" {
		return nil, fmt.Errorf("client configuration file '%s.conf' not found in standard directories (/root/awg, /root/awg/clients, /root, /etc/amnezia/amneziawg)", name)
	}

	cleanConfig := SanitizeAWGConfig(rawConfig)
	if cleanConfig == "" || !strings.Contains(cleanConfig, "[Interface]") || !strings.Contains(cleanConfig, "[Peer]") {
		return nil, fmt.Errorf("file '%s' does not contain a valid WireGuard/AmneziaWG configuration block ([Interface] and [Peer])", foundPath)
	}

	// 2. Read or generate QR code
	qrBase64 := ""
	candidateQRPatterns := []string{
		filepath.Join("/root/awg", fmt.Sprintf("%s.png", name)),
		filepath.Join("/root/awg/clients", fmt.Sprintf("%s.png", name)),
		filepath.Join(r.configsDir, fmt.Sprintf("%s.png", name)),
		filepath.Join(scriptDir, fmt.Sprintf("%s.png", name)),
		filepath.Join(scriptDir, "clients", fmt.Sprintf("%s.png", name)),
		filepath.Join("/opt/avari-keys", fmt.Sprintf("%s.png", name)),
		filepath.Join("/root", fmt.Sprintf("%s.png", name)),
	}
	for _, qp := range candidateQRPatterns {
		if qrBytes, qrErr := os.ReadFile(qp); qrErr == nil && len(qrBytes) > 0 {
			qrBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(qrBytes)
			break
		}
	}

	if qrBase64 == "" {
		// Try qrencode if available using the sanitized config
		qrCmd := exec.CommandContext(ctx, "qrencode", "-t", "PNG", "-o", "-", cleanConfig)
		var qrOut bytes.Buffer
		qrCmd.Stdout = &qrOut
		if qrCmd.Run() == nil && qrOut.Len() > 0 {
			qrBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(qrOut.Bytes())
		}
	}

	return &models.ClientResponse{
		Name:      name,
		Config:    cleanConfig,
		QRCode:    qrBase64,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (r *RealRunner) ListClients(ctx context.Context) ([]models.ClientListItem, error) {
	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "list")
	cmd.Dir = filepath.Dir(r.scriptPath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("manage_amneziawg.sh list failed: %w (stderr: %s)", err, stderr.String())
	}

	lines := strings.Split(stdout.String(), "\n")
	var clients []models.ClientListItem
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "===") {
			continue
		}
		fields := strings.Fields(trimmed)
		if len(fields) > 0 {
			clients = append(clients, models.ClientListItem{
				Name:      fields[0],
				CreatedAt: time.Now().UTC(),
				Status:    "active",
			})
		}
	}
	return clients, nil
}

func (r *RealRunner) GetStats(ctx context.Context) (*models.StatsSummaryResponse, error) {
	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "stats", "--json")
	cmd.Dir = filepath.Dir(r.scriptPath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	res := &models.StatsSummaryResponse{
		Peers: make(map[string]models.PeerStats),
	}

	if err := cmd.Run(); err != nil {
		// Fallback simple stats
		return res, nil
	}

	_ = json.Unmarshal(stdout.Bytes(), res)
	return res, nil
}

func (r *RealRunner) RestartAWG(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "systemctl", "restart", "awg-quick@awg0")
	if err := cmd.Run(); err != nil {
		// Fallback: try restart via manage_amneziawg.sh if script supports it
		cmd2 := exec.CommandContext(ctx, "bash", r.scriptPath, "restart")
		if err2 := cmd2.Run(); err2 != nil {
			return fmt.Errorf("failed to restart AWG service: %w", err)
		}
	}
	return nil
}

func (r *RealRunner) BackupAWG(ctx context.Context) (*models.BackupResponse, error) {
	// Create tar.gz of configsDir
	tarCmd := exec.CommandContext(ctx, "tar", "-czf", "-", "-C", filepath.Dir(r.configsDir), filepath.Base(r.configsDir))
	var out bytes.Buffer
	tarCmd.Stdout = &out
	if err := tarCmd.Run(); err != nil {
		return nil, fmt.Errorf("backup failed: %w", err)
	}

	return &models.BackupResponse{
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		BackupData: base64.StdEncoding.EncodeToString(out.Bytes()),
	}, nil
}

func (r *RealRunner) RestoreAWG(ctx context.Context, backupData string) error {
	dataBytes, err := base64.StdEncoding.DecodeString(backupData)
	if err != nil {
		return fmt.Errorf("invalid backup base64 data: %w", err)
	}

	tarCmd := exec.CommandContext(ctx, "tar", "-xzf", "-", "-C", filepath.Dir(r.configsDir))
	tarCmd.Stdin = bytes.NewReader(dataBytes)
	if err := tarCmd.Run(); err != nil {
		return fmt.Errorf("restore failed: %w", err)
	}

	return nil
}

func (r *RealRunner) SwitchEgress(ctx context.Context, devName string) error {
	devName = strings.TrimSpace(devName)
	if devName != "awg1" && devName != "awg3" {
		return fmt.Errorf("invalid egress interface '%s': must be awg1 or awg3", devName)
	}

	cmd := exec.CommandContext(ctx, "ip", "route", "replace", "default", "dev", devName, "table", "100")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ip route replace failed: %w (stderr: %s)", err, stderr.String())
	}
	return nil
}

func (r *RealRunner) GetEgressStatus(ctx context.Context) (*models.EgressStatusResponse, error) {
	cmd := exec.CommandContext(ctx, "ip", "-4", "route", "show", "table", "100")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	active := "awg1"
	if err := cmd.Run(); err == nil {
		outStr := stdout.String()
		if strings.Contains(outStr, "dev awg3") {
			active = "awg3"
		} else if strings.Contains(outStr, "dev awg1") {
			active = "awg1"
		}
	}

	return &models.EgressStatusResponse{
		ActiveInterface:     active,
		AvailableInterfaces: []string{"awg1", "awg3"},
		Details:             fmt.Sprintf("Current default dev in table 100 is %s", active),
	}, nil
}

