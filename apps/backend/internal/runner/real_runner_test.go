package runner

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestBuildClientMappings(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "awg-mappings-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scriptPath := filepath.Join(tmpDir, "manage_amneziawg.sh")
	_ = os.WriteFile(scriptPath, []byte("#!/bin/bash\nexit 0\n"), 0755)

	clientsDir := filepath.Join(tmpDir, "clients")
	_ = os.MkdirAll(clientsDir, 0755)

	// Create a dummy server config awg0.conf
	serverConf := `[Interface]
Address = 10.7.0.1/24
PrivateKey = ServerPrivKey=
ListenPort = 51820

### Client u1_phone
[Peer]
PublicKey = Client1PubKey12345=
PresharedKey = PresharedKey1=
AllowedIPs = 10.7.0.2/32

# Client u2_laptop
[Peer]
PublicKey = Client2PubKey67890=
AllowedIPs = 10.7.0.3/32, 10.7.0.4/32
`
	_ = os.WriteFile(filepath.Join(tmpDir, "awg0.conf"), []byte(serverConf), 0644)

	// Create a dummy client config u3_tablet.conf
	clientConf := `[Interface]
Address = 10.7.0.5/32
PrivateKey = TabletPrivKey=
[Peer]
PublicKey = ServerPubKey=
`
	_ = os.WriteFile(filepath.Join(clientsDir, "u3_tablet.conf"), []byte(clientConf), 0644)

	runner := NewRealRunner(scriptPath, clientsDir)
	pubkeys, ips, known := runner.buildClientMappings()

	if pubkeys["Client1PubKey12345="] != "u1_phone" {
		t.Errorf("expected pubkey mapping for u1_phone, got '%s'", pubkeys["Client1PubKey12345="])
	}
	if pubkeys["Client2PubKey67890="] != "u2_laptop" {
		t.Errorf("expected pubkey mapping for u2_laptop, got '%s'", pubkeys["Client2PubKey67890="])
	}
	if ips["10.7.0.2"] != "u1_phone" {
		t.Errorf("expected ip mapping for 10.7.0.2 -> u1_phone, got '%s'", ips["10.7.0.2"])
	}
	if ips["10.7.0.3"] != "u2_laptop" {
		t.Errorf("expected ip mapping for 10.7.0.3 -> u2_laptop, got '%s'", ips["10.7.0.3"])
	}
	if ips["10.7.0.5"] != "u3_tablet" {
		t.Errorf("expected ip mapping for 10.7.0.5 -> u3_tablet, got '%s'", ips["10.7.0.5"])
	}
	if !known["u1_phone"] || !known["u2_laptop"] || !known["u3_tablet"] {
		t.Errorf("expected all 3 clients in knownClients map: %+v", known)
	}

	// Test GetStats with no live kernel interface (falls back to known clients with zero values)
	stats, err := runner.GetStats(context.Background())
	if err != nil {
		t.Fatalf("GetStats returned unexpected error: %v", err)
	}
	if stats == nil || len(stats.Peers) != 3 {
		t.Fatalf("expected 3 peers in stats (from known clients), got %+v", stats)
	}
	if stats.Peers["u1_phone"].LastHandshake != "Никогда" || stats.Peers["u1_phone"].IsOnline {
		t.Errorf("expected offline status with 'Никогда', got %+v", stats.Peers["u1_phone"])
	}
}
