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
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
)

// RealRunner executes manage_amneziawg.sh via os/exec.
type RealRunner struct {
	scriptPath string
	configsDir string
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
	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "status")
	return cmd.Run() == nil
}

func (r *RealRunner) AddClient(ctx context.Context, name string, psk bool) (*models.ClientResponse, error) {
	if err := ValidateClientName(name); err != nil {
		return nil, err
	}

	args := []string{r.scriptPath, "add", name}
	if psk {
		args = append(args, "--psk")
	}

	cmd := exec.CommandContext(ctx, "bash", args...)
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

	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "remove", name)
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

	// 1. Read config file from configsDir/<name>.conf
	confPath := filepath.Join(r.configsDir, fmt.Sprintf("%s.conf", name))
	confBytes, err := os.ReadFile(confPath)
	if err != nil {
		// Fallback: try reading via `manage_amneziawg.sh show <name>`
		cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "show", name)
		var out bytes.Buffer
		cmd.Stdout = &out
		if cmdErr := cmd.Run(); cmdErr == nil && out.Len() > 0 {
			confBytes = out.Bytes()
		} else {
			return nil, fmt.Errorf("could not read client config for '%s': %w", name, err)
		}
	}

	// 2. Read or generate QR code
	qrBase64 := ""
	qrPath := filepath.Join(r.configsDir, fmt.Sprintf("%s.png", name))
	if qrBytes, qrErr := os.ReadFile(qrPath); qrErr == nil {
		qrBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(qrBytes)
	} else {
		// Try qrencode if available
		qrCmd := exec.CommandContext(ctx, "qrencode", "-t", "PNG", "-o", "-", string(confBytes))
		var qrOut bytes.Buffer
		qrCmd.Stdout = &qrOut
		if qrCmd.Run() == nil && qrOut.Len() > 0 {
			qrBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(qrOut.Bytes())
		}
	}

	return &models.ClientResponse{
		Name:      name,
		Config:    string(confBytes),
		QRCode:    qrBase64,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (r *RealRunner) ListClients(ctx context.Context) ([]models.ClientListItem, error) {
	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "list")
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
