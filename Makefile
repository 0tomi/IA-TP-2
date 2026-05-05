BACKEND_DIR  := backend
FRONTEND_DIR := frontend

.PHONY: help install install-backend install-frontend \
         dev dev-backend dev-frontend \
         build test lint lint-fix lint-frontend seed-dev

help:
	@echo "Comandos disponibles:"
	@echo ""
	@echo "  Instalación:"
	@echo "    make install          Instala dependencias de backend y frontend"
	@echo "    make install-backend  Solo backend (Poetry)"
	@echo "    make install-frontend Solo frontend (npm)"
	@echo ""
	@echo "  Desarrollo:"
	@echo "    make dev              Levanta backend y frontend en paralelo"
	@echo "    make dev-backend      Solo backend  → http://localhost:8000"
	@echo "    make dev-frontend     Solo frontend → http://localhost:5173"
	@echo ""
	@echo "  Otros:"
	@echo "    make build            Compila el frontend para producción"
	@echo "    make test             Corre los tests del backend"
	@echo "    make lint             Valida el código del backend con Ruff"
	@echo "    make lint-fix         Corrige errores automáticos con Ruff"
	@echo "    make lint-frontend   Valida el código del frontend con ESLint"
	@echo "    make seed-dev        Pobla la DB con 50+ eventos de desarrollo"

# ── Instalación ───────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	cd $(BACKEND_DIR) && poetry lock && poetry install
	cd $(BACKEND_DIR) && poetry run python seed.py

install-frontend:
	cd $(FRONTEND_DIR) && npm install
	@if [ ! -f $(FRONTEND_DIR)/.env ]; then \
		cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env; \
		echo "Creado $(FRONTEND_DIR)/.env desde .env.example"; \
	fi

# ── Desarrollo ────────────────────────────────────────────────────────────────

dev:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload &
	cd $(FRONTEND_DIR) && npm run dev

dev-backend:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload

dev-frontend:
	cd $(FRONTEND_DIR) && npm run dev

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	cd $(FRONTEND_DIR) && npm run build

# ── Tests y calidad ───────────────────────────────────────────────────────────

test:
	cd $(BACKEND_DIR) && poetry run pytest tests/ -v

lint:
	cd $(BACKEND_DIR) && poetry run ruff check .

lint-fix:
	cd $(BACKEND_DIR) && poetry run ruff check . --fix

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint

# ── Seed ──────────────────────────────────────────────────────────────────────

seed-dev:
	cd $(BACKEND_DIR) && poetry run python seed-dev.py