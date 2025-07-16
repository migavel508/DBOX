
.PHONY: setup start stop clean logs test frontend-only

# Setup and start the entire system
setup:
	@echo "Setting up SecureBlockchain Vault..."
	chmod +x scripts/*.sh
	./scripts/setup.sh

# Start services
start:
	@echo "Starting services..."
	docker-compose up -d

# Stop services
stop:
	@echo "Stopping services..."
	docker-compose down

# Clean everything
clean:
	@echo "Cleaning up..."
	docker-compose down -v
	docker system prune -f
	rm -rf fabric-config/crypto-config
	rm -rf wallet
	rm -rf api/uploads
	rm -rf api/logs

# View logs
logs:
	docker-compose logs -f

# Run tests
test:
	./scripts/run-tests.sh

# Quick restart
restart: stop start

# Status check
status:
	docker-compose ps
	curl -s http://localhost:3000/health | jq .

# Deploy only
deploy:
	docker-compose up -d --build

# Run frontend only (for development)
frontend-only:
	@echo "Starting frontend only..."
	npm run dev

# Build frontend
build-frontend:
	npm run build
