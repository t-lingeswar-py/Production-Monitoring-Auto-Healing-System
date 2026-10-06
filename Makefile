.PHONY: help install up down restart logs test chaos-db chaos-mem chaos-crash recover

help:
	@echo "Production Monitoring & Auto-Healing System Commands:"
	@echo "  make install     - Install node dependencies across all services"
	@echo "  make up          - Start the complete Docker stack"
	@echo "  make down        - Stop all Docker containers"
	@echo "  make restart     - Restart Docker stack"
	@echo "  make logs        - Tail Docker container logs"
	@echo "  make test        - Run auto-healing verification test suite"
	@echo "  make chaos-db    - Inject DB disconnect anomaly"
	@echo "  make chaos-mem   - Inject memory leak anomaly"
	@echo "  make chaos-crash - Inject service crash anomaly"
	@echo "  make recover     - Reset system anomalies manually"

install:
	npm run install:all

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

test:
	npm test

chaos-db:
	curl -X POST http://localhost:3000/api/chaos/db-disconnect

chaos-mem:
	curl -X POST http://localhost:3000/api/chaos/leak-memory

chaos-crash:
	curl -X POST http://localhost:3000/api/chaos/crash

recover:
	curl -X POST http://localhost:3000/api/chaos/recover
