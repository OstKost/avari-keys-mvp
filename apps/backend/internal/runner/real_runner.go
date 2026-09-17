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

func (r *RealRunner) AddClient(ctx context.Context, name string) (*models.ClientResponse, error) {
	if err := ValidateClientName(name); err != nil {
		return nil, err
	}

	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "add", name)
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

func (r *RealRunner) GetStats(ctx context.Context) (map[string]any, error) {
	cmd := exec.CommandContext(ctx, "bash", r.scriptPath, "stats", "--json")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		// Fallback simple stats
		return map[string]any{"status": "active"}, nil
	}

	var stats map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &stats); err != nil {
		return map[string]any{"raw": stdout.String()}, nil
	}
	return stats, nil
}
