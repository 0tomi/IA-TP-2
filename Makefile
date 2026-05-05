BACKEND_DIR  := backend
FRONTEND_DIR := frontend

.PHONY: help install install-backend install-frontend \
        dev dev-backend dev-frontend \
        build test lint lint-fix

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

# ── Instalación ───────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	cd $(BACKEND_DIR) && poetry install

install-frontend:
	cd $(FRONTEND_DIR) && npm install

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
