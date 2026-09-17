.PHONY: all build test lint clean dev-master dev-slave dev-frontend

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
		cd apps/frontend && npm run lint ; \
	fi

clean:
	@echo "==> Cleaning build artifacts..."
	rm -rf dist/ apps/frontend/dist/ data/*.db
