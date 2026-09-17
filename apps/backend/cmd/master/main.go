package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/master"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
)

func main() {
	port := os.Getenv("MASTER_PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/avari-master.db"
	}

	jwtSecret := os.Getenv("JWT_SECRET")

	store, err := storage.NewSQLiteStorage(dbPath)
	if err != nil {
		log.Fatalf("[MASTER] Failed to initialize SQLite database: %v", err)
	}
	defer store.Close()

	cfg := master.Config{
		Port:      port,
		JWTSecret: jwtSecret,
	}

	srv := master.NewServer(cfg, store)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[MASTER] Server listening on http://0.0.0.0:%s", port)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatalf("[MASTER] Server startup failed: %v", err)
	}
}
