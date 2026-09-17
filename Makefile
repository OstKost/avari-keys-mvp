.PHONY: all build test lint clean dev-ui dev-ui-mock dev-master dev-slave-mock

all: build

build: build-backend build-frontend

build-backend:
	@echo "==> Building Go binaries..."
	mkdir -p dist
	cd apps/backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o ../../dist/avari-master ./cmd/master
	cd apps/backend && CGO_ENABLED=0 go build -ldflags="-s -w" -o ../../dist/avari-slave ./cmd/slave

build-frontend:
	@echo "==> Building Frontend SPA..."
	if [ -d "apps/frontend" ] && [ -f "apps/frontend/package.json" ]; then \
		cd apps/frontend && npm run build ; \
	fi

test:
	@echo "==> Running backend contract & unit tests..."
	cd apps/backend && go test -v -race ./...

lint:
	@echo "==> Linting backend & frontend..."
	cd apps/backend && go vet ./...
	if [ -d "apps/frontend" ] && [ -f "apps/frontend/package.json" ]; then \
		cd apps/frontend && npm run lint 2>/dev/null || true ; \
	fi

clean:
	@echo "==> Cleaning build artifacts..."
	rm -rf dist/ apps/frontend/dist/ data/*.db

# ==========================================
# 🛠 Dev Environment Targets
# ==========================================

# 1. Запуск автономного Frontend с заглушками (без бэкенда вообще)
dev-ui-mock:
	@echo "==> Starting Frontend in Mock/Demo mode at http://localhost:3000..."
	cd apps/frontend && npm run dev:mock

# 2. Запуск стандартного Frontend (с проксированием к Master API на :8080)
dev-ui:
	@echo "==> Starting Frontend at http://localhost:3000 (proxying to :8080)..."
	cd apps/frontend && npm run dev

# 3. Запуск Slave API в Mock-режиме (на порту 8081, эмулирует manage_amneziawg.sh)
dev-slave-mock:
	@echo "==> Starting Slave API in Mock mode on :8081..."
	cd apps/backend && AWG_USE_MOCK=true SLAVE_PORT=8081 SLAVE_API_KEY=slave-dev-token go run ./cmd/slave

# 4. Запуск Master Backend API (на порту 8080, логин Forve / пароль admin)
dev-master:
	@echo "==> Starting Master API on :8080 (Admin: Forve / Password: admin)..."
	cd apps/backend && MASTER_PORT=8080 ADMIN_USER=Forve ADMIN_PASSWORD=admin go run ./cmd/master
