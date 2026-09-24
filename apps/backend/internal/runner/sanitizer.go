package runner

import (
	"bufio"
	"regexp"
	"strings"
)

var ansiRegex = regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]`)

// SanitizeAWGConfig parses raw output or file content and extracts strictly
// the valid WireGuard / AmneziaWG configuration block ([Interface] ... [Peer] ...),
// stripping ANSI codes, terminal headers, banners, and ASCII QR codes.
func SanitizeAWGConfig(raw string) string {
	if raw == "" {
		return ""
	}

	// 1. Remove ANSI escape sequences
	clean := ansiRegex.ReplaceAllString(raw, "")
	clean = strings.ReplaceAll(clean, "\r\n", "\n")
	clean = strings.ReplaceAll(clean, "\r", "\n")

	// 2. Locate starting [Interface] section
	scanner := bufio.NewScanner(strings.NewReader(clean))
	var resultLines []string
	inConfig := false
	seenPeer := false

	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		if !inConfig {
			if strings.EqualFold(trimmed, "[Interface]") {
				inConfig = true
				resultLines = append(resultLines, "[Interface]")
			}
			continue
		}

		// Once inside config:
		// Check for end of config markers (ASCII QR code, banners, informational notes)
		if strings.HasPrefix(trimmed, "QR Code") ||
			strings.HasPrefix(trimmed, "Scan ") ||
			strings.HasPrefix(trimmed, "===") ||
			strings.HasPrefix(trimmed, "---") ||
			strings.ContainsAny(trimmed, "█▀▄░▒▓") {
			break
		}

		if strings.EqualFold(trimmed, "[Peer]") {
			seenPeer = true
			resultLines = append(resultLines, "[Peer]")
			continue
		}

		if strings.EqualFold(trimmed, "[Interface]") {
			resultLines = append(resultLines, "[Interface]")
			continue
		}

		// Comments and empty lines
		if trimmed == "" {
			if len(resultLines) > 0 && resultLines[len(resultLines)-1] != "" {
				resultLines = append(resultLines, "")
			}
			continue
		}

		if strings.HasPrefix(trimmed, "#") {
			resultLines = append(resultLines, trimmed)
			continue
		}

		// Key = Value pairs
		if strings.Contains(trimmed, "=") {
			resultLines = append(resultLines, trimmed)
			continue
		}

		// If we encounter non-conf text after [Peer] has already been parsed, stop
		if seenPeer {
			break
		}
	}

	// Trim trailing blank lines
	for len(resultLines) > 0 && resultLines[len(resultLines)-1] == "" {
		resultLines = resultLines[:len(resultLines)-1]
	}

	if len(resultLines) == 0 {
		return strings.TrimSpace(clean)
	}

	return strings.Join(resultLines, "\n")
}
