package monitor

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/client"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/models"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/storage"
	"github.com/OstKost/avari-keys-mvp/apps/backend/internal/telegram"
)

// HealthChecker periodically verifies node availability and sends alerts on state changes.
type HealthChecker struct {
	storage     *storage.Storage
	bot         *telegram.Bot
	interval    time.Duration
	nodeTimeout time.Duration
	logActivity func(category models.AuditLogCategory, action string, details string)

	nodeStates map[int64]bool // nodeID -> isOnline
	mu         sync.RWMutex
	stopChan   chan struct{}
	wg         sync.WaitGroup
}

// Config for HealthChecker.
type Config struct {
	Storage     *storage.Storage
	Bot         *telegram.Bot
	Interval    time.Duration
	Timeout     time.Duration
	LogActivity func(category models.AuditLogCategory, action string, details string)
}

// NewHealthChecker creates a new background node monitor.
func NewHealthChecker(cfg Config) *HealthChecker {
	interval := cfg.Interval
	if interval <= 0 {
		interval = 30 * time.Second
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	return &HealthChecker{
		storage:     cfg.Storage,
		bot:         cfg.Bot,
		interval:    interval,
		nodeTimeout: timeout,
		logActivity: cfg.LogActivity,
		nodeStates:  make(map[int64]bool),
		stopChan:    make(chan struct{}),
	}
}

// Start runs the background monitoring loop.
func (h *HealthChecker) Start(ctx context.Context) {
	h.wg.Add(1)
	go h.run(ctx)
	log.Printf("[MONITOR] HealthChecker started (interval: %v, timeout: %v)", h.interval, h.nodeTimeout)
}

// Stop stops the HealthChecker.
func (h *HealthChecker) Stop() {
	close(h.stopChan)
	h.wg.Wait()
	log.Println("[MONITOR] HealthChecker stopped")
}

func (h *HealthChecker) run(ctx context.Context) {
	defer h.wg.Done()

	// Initial check on startup after short delay
	select {
	case <-time.After(2 * time.Second):
		h.checkNodes(ctx, true)
	case <-h.stopChan:
		return
	case <-ctx.Done():
		return
	}

	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	// Periodic billing reminder check (every 12 hours)
	billingTicker := time.NewTicker(12 * time.Hour)
	defer billingTicker.Stop()

	for {
		select {
		case <-h.stopChan:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			h.checkNodes(ctx, false)
		case <-billingTicker.C:
			if h.bot != nil {
				_ = h.bot.BroadcastBillingReminders(ctx)
			}
		}
	}
}

func (h *HealthChecker) checkNodes(ctx context.Context, isInitial bool) {
	if h.storage == nil {
		return
	}

	nodes, err := h.storage.ListNodes(ctx)
	if err != nil {
		log.Printf("[MONITOR] Failed to list nodes: %v", err)
		return
	}

	for _, node := range nodes {
		if !node.IsActive {
			continue
		}

		pingCtx, cancel := context.WithTimeout(ctx, h.nodeTimeout)
		slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
		start := time.Now()
		health, hErr := slaveCli.CheckHealth(pingCtx)
		latency := time.Since(start).Milliseconds()
		cancel()

		isOnline := hErr == nil && health != nil && health.Status == "ok"

		h.mu.Lock()
		wasOnline, existed := h.nodeStates[node.ID]
		h.nodeStates[node.ID] = isOnline
		h.mu.Unlock()

		if !existed {
			// First time tracking this node
			if !isOnline && !isInitial {
				// Immediately notify if initial check failed after startup
				if h.bot != nil && h.bot.IsEnabled() {
					errReason := "Не отвечает (таймаут или ошибка подключения)"
					if hErr != nil {
						errReason = hErr.Error()
					}
					h.bot.NotifyNodeDown(node, errReason)
				}
			}
			continue
		}

		// State transition: Online -> Offline
		if wasOnline && !isOnline {
			errReason := "Не отвечает (таймаут или ошибка подключения)"
			if hErr != nil {
				errReason = hErr.Error()
			}
			log.Printf("[MONITOR] 🚨 Node DOWN: #%d %s (%s) - %s", node.ID, node.Name, node.APIURL, errReason)

			if h.logActivity != nil {
				h.logActivity(models.CategorySystem, "node_down", fmt.Sprintf("Сервер «%s» (#%d) стал недоступен: %s", node.Name, node.ID, errReason))
			}

			if h.bot != nil && h.bot.IsEnabled() {
				h.bot.NotifyNodeDown(node, errReason)
			}
		}

		// State transition: Offline -> Online
		if !wasOnline && isOnline {
			log.Printf("[MONITOR] ✅ Node RECOVERED: #%d %s (%s) - %dms", node.ID, node.Name, node.APIURL, latency)

			if h.logActivity != nil {
				h.logActivity(models.CategorySystem, "node_recovered", fmt.Sprintf("Сервер «%s» (#%d) восстановил работу (пинг: %d ms)", node.Name, node.ID, latency))
			}

			if h.bot != nil && h.bot.IsEnabled() {
				h.bot.NotifyNodeRecovered(node, latency)
			}
		}
	}
}

// CheckAllNodes returns real-time status and latency for all nodes.
func (h *HealthChecker) CheckAllNodes(ctx context.Context) ([]models.NodeWithStatus, error) {
	if h.storage == nil {
		return nil, fmt.Errorf("storage is not initialized")
	}

	nodes, err := h.storage.ListNodes(ctx)
	if err != nil {
		return nil, err
	}

	res := make([]models.NodeWithStatus, len(nodes))
	var wg sync.WaitGroup

	for i, n := range nodes {
		wg.Add(1)
		go func(idx int, node models.Node) {
			defer wg.Done()
			pingCtx, cancel := context.WithTimeout(ctx, h.nodeTimeout)
			defer cancel()

			slaveCli := client.NewSlaveClient(node.APIURL, node.APIKey)
			start := time.Now()
			health, hErr := slaveCli.CheckHealth(pingCtx)
			latency := time.Since(start).Milliseconds()

			isOnline := hErr == nil && health != nil && health.Status == "ok"
			if !isOnline {
				latency = 0
			}

			h.mu.Lock()
			h.nodeStates[node.ID] = isOnline
			h.mu.Unlock()

			res[idx] = models.NodeWithStatus{
				Node:      node,
				Online:    isOnline,
				LatencyMs: latency,
			}
		}(i, n)
	}

	wg.Wait()
	return res, nil
}
