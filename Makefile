COMPOSE ?= docker compose
DB_SERVICE ?= mongodb

.PHONY: help start-db stop-db restart-db db-status db-logs db-shell db-clean migrate-db install-server start-server test-server

help:
	@echo "Available targets:"
	@echo "  start-db        Start the MongoDB container in the background"
	@echo "  stop-db         Stop the MongoDB container (keeps data)"
	@echo "  restart-db      Restart the MongoDB container"
	@echo "  db-status       Show the status of the MongoDB container"
	@echo "  db-logs         Tail logs from the MongoDB container"
	@echo "  db-shell        Open a mongosh shell inside the container"
	@echo "  db-clean        Stop the container and delete its volumes (DESTRUCTIVE)"
	@echo "  migrate-db      Load data/*.json and data/chapters/*.json into MongoDB"
	@echo "  install-server  Create/refresh the Python venv and install server deps"
	@echo "  start-server    Run the FastAPI dev server on http://localhost:8000"
	@echo "  test-server     Run the pytest suite for the FastAPI server"

start-db:
	$(COMPOSE) up -d $(DB_SERVICE)

stop-db:
	$(COMPOSE) stop $(DB_SERVICE)

restart-db: stop-db start-db

db-status:
	$(COMPOSE) ps $(DB_SERVICE)

db-logs:
	$(COMPOSE) logs -f $(DB_SERVICE)

db-shell:
	$(COMPOSE) exec $(DB_SERVICE) mongosh

db-clean:
	$(COMPOSE) down -v

migrate-db:
	node scripts/migrate-to-mongo.mjs

install-server:
	cd server && uv sync

start-server:
	cd server && uv run fastapi dev app/main.py --host 127.0.0.1 --port 8000

test-server:
	cd server && uv run pytest
