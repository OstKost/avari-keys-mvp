package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/runner"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/slave"
)

func main() {
	port := os.Getenv("SLAVE_PORT")
	if port == "" {
		port = "8081"
	}

	apiKey := os.Getenv("SLAVE_API_KEY")
	useMock := os.Getenv("AWG_USE_MOCK") == "true" || os.Getenv("AWG_USE_MOCK") == "1"

	var awgRunner runner.AWGRunner
	if useMock {
		log.Println("[SLAVE] Running in MOCK mode (simulating manage_amneziawg.sh)")
		awgRunner = runner.NewMockRunner(true)
	} else {
		scriptPath := os.Getenv("AWG_SCRIPT_PATH")
		if scriptPath == "" {
			scriptPath = "/root/awg/manage_amneziawg.sh"
		}
		configsDir := os.Getenv("AWG_CONFIGS_DIR")
		if configsDir == "" {
			configsDir = "/root/awg/clients"
		}
		awgRunner = runner.NewRealRunner(scriptPath, configsDir)
	}

	cfg := slave.Config{
		APIKey: apiKey,
		Port:   port,
	}

	srv := slave.NewServer(cfg, awgRunner)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[SLAVE] Server listening on http://0.0.0.0:%s", port)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatalf("[SLAVE] Server startup failed: %v", err)
	}
}
