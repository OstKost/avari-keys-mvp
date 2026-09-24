package runner

import (
	"strings"
	"testing"
)

func TestSanitizeAWGConfig(t *testing.T) {
	rawTerminalOutput := "\x1b[0;32m========================================\x1b[0m\n" +
		"\x1b[1;33mAmneziaWG Client Configuration: u1_phone\x1b[0m\n" +
		"========================================\n" +
		"\n" +
		"[Interface]\n" +
		"Address = 10.7.0.5/32\n" +
		"PrivateKey = aValidPrivateKeyStringHere1234567890=\n" +
		"DNS = 1.1.1.1, 8.8.8.8\n" +
		"Jc = 4\n" +
		"Jmin = 40\n" +
		"Jmax = 70\n" +
		"S1 = 15\n" +
		"S2 = 25\n" +
		"H1 = 1\n" +
		"H2 = 2\n" +
		"H3 = 3\n" +
		"H4 = 4\n" +
		"\n" +
		"[Peer]\n" +
		"PublicKey = aValidPublicKeyStringHere0987654321=\n" +
		"PresharedKey = aValidPresharedKeyString567890=\n" +
		"Endpoint = 198.51.100.1:51820\n" +
		"AllowedIPs = 0.0.0.0/0, ::/0\n" +
		"PersistentKeepalive = 25\n" +
		"\n" +
		"\x1b[0;36mQR Code:\x1b[0m\n" +
		"█████████████████████████\n" +
		"██ ▄▄▄▄▄ █▀▄█ ▄▄▄▄▄ ██\n" +
		"██ █   █ █ █  █   █ ██\n" +
		"██ ▀▀▀▀▀ █ █  ▀▀▀▀▀ ██\n" +
		"█████████████████████████\n" +
		"Configuration file saved to /root/clients/u1_phone.conf\n"

	clean := SanitizeAWGConfig(rawTerminalOutput)

	if strings.Contains(clean, "QR Code") {
		t.Errorf("SanitizeAWGConfig should not contain QR Code marker: %s", clean)
	}
	if strings.Contains(clean, "███") {
		t.Errorf("SanitizeAWGConfig should not contain ASCII QR code blocks: %s", clean)
	}
	if strings.Contains(clean, "====") {
		t.Errorf("SanitizeAWGConfig should not contain banner borders: %s", clean)
	}
	if strings.Contains(clean, "\x1b[") {
		t.Errorf("SanitizeAWGConfig should not contain ANSI sequences: %s", clean)
	}
	if !strings.HasPrefix(clean, "[Interface]") {
		t.Errorf("SanitizeAWGConfig should start with [Interface], got:\n%s", clean)
	}
	if !strings.Contains(clean, "PrivateKey = aValidPrivateKeyStringHere1234567890=") {
		t.Errorf("SanitizeAWGConfig missing PrivateKey: %s", clean)
	}
	if !strings.Contains(clean, "[Peer]") {
		t.Errorf("SanitizeAWGConfig missing [Peer]: %s", clean)
	}
	if !strings.Contains(clean, "PersistentKeepalive = 25") {
		t.Errorf("SanitizeAWGConfig missing PersistentKeepalive: %s", clean)
	}
}

func TestSanitizeAWGConfig_CleanInput(t *testing.T) {
	cleanInput := `[Interface]
Address = 10.8.0.2/32
PrivateKey = testKey=

[Peer]
PublicKey = serverKey=
Endpoint = 1.2.3.4:51820
AllowedIPs = 0.0.0.0/0`

	result := SanitizeAWGConfig(cleanInput)
	if result != cleanInput {
		t.Errorf("Expected unchanged clean config, got:\n%s", result)
	}
}
