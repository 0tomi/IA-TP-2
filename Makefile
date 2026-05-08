BACKEND_DIR  := backend
FRONTEND_DIR := frontend
RASABOT_DIR  := rasa_bot

.PHONY: help install install-backend install-frontend install-rasa \
         dev dev-backend dev-frontend dev-rasa dev-rasa-actions \
         build test test-rasa lint lint-fix lint-frontend seed-dev

help:
	@echo "Comandos disponibles:"
	@echo ""
	@echo "  Instalación:"
	@echo "    make install          Instala dependencias de backend, frontend y rasa bot"
	@echo "    make install-backend Solo backend (Poetry)"
	@echo "    make install-frontend Solo frontend (npm)"
	@echo "    make install-rasa     Solo rasa bot (Poetry)"
	@echo ""
	@echo "  Desarrollo:"
	@echo "    make dev             Levanta backend, frontend, rasa y action server"
	@echo "    make dev-backend     Solo backend  → http://localhost:8000"
	@echo "    make dev-frontend    Solo frontend → http://localhost:5173"
	@echo "    make dev-rasa        Solo rasa bot → http://localhost:5005"
	@echo "    make dev-rasa-actions Solo action server de Rasa → http://localhost:5055"
	@echo ""
	@echo "  Otros:"
	@echo "    make build            Compila el frontend para producción"
	@echo "    make test             Corre los tests del backend"
	@echo "    make test-rasa        Corre los tests de Rasa (core + NLU)"
	@echo "    make lint             Valida el código del backend con Ruff"
	@echo "    make lint-fix         Corrige errores automáticos con Ruff"
	@echo "    make lint-frontend   Valida el código del frontend con ESLint"
	@echo "    make seed-dev        Pobla la DB con 50+ eventos de desarrollo"

# ── Instalación ───────────────────────────────────────────────────────────────

install: install-backend install-frontend install-rasa

install-backend:
	cd $(BACKEND_DIR) && poetry lock && poetry install
	cd $(BACKEND_DIR) && poetry run python seed.py

install-frontend:
	cd $(FRONTEND_DIR) && npm install
	@if [ ! -f $(FRONTEND_DIR)/.env ]; then \
		cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env; \
		echo "Creado $(FRONTEND_DIR)/.env desde .env.example"; \
	fi

install-rasa:
	cd $(RASABOT_DIR) && poetry lock && poetry install
	cd $(RASABOT_DIR) && poetry run rasa train

# ── Desarrollo ────────────────────────────────────────────────────────────────

dev:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload &
	cd $(FRONTEND_DIR) && npm run dev &
	cd $(RASABOT_DIR) && poetry run rasa run --m models --enable-api --cors "*" --port 5005 &
	cd $(RASABOT_DIR) && poetry run rasa run actions --port 5055

dev-backend:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload

dev-frontend:
	cd $(FRONTEND_DIR) && npm run dev

dev-rasa:
	cd $(RASABOT_DIR) && poetry run rasa run --m models --enable-api --cors "*" --port 5005

dev-rasa-actions:
	cd $(RASABOT_DIR) && poetry run rasa run actions --port 5055

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	cd $(FRONTEND_DIR) && npm run build

# ── Tests y calidad ───────────────────────────────────────────────────────────

test:
	cd $(BACKEND_DIR) && poetry run pytest tests/ -v

test-rasa:
	cd $(RASABOT_DIR) && poetry run rasa test core --stories tests/test_stories.yml
	cd $(RASABOT_DIR) && poetry run rasa test nlu --nlu data/nlu.yml

lint:
	cd $(BACKEND_DIR) && poetry run ruff check .

lint-fix:
	cd $(BACKEND_DIR) && poetry run ruff check . --fix

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint

# ── Seed ──────────────────────────────────────────────────────────────────────

seed-dev:
	cd $(BACKEND_DIR) && poetry run python seed-dev.py
