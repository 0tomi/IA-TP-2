BACKEND_DIR := backend

.PHONY: help install dev test lint lint-fix

help:
	@echo "Comandos disponibles:"
	@echo "  make install    Instala dependencias del backend"
	@echo "  make dev        Levanta el servidor de desarrollo"
	@echo "  make test       Corre los tests"
	@echo "  make lint       Valida el código con Ruff"
	@echo "  make lint-fix   Corrige errores automáticos con Ruff"

install:
	cd $(BACKEND_DIR) && poetry install

dev:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload

test:
	cd $(BACKEND_DIR) && poetry run pytest tests/ -v

lint:
	cd $(BACKEND_DIR) && poetry run ruff check .

lint-fix:
	cd $(BACKEND_DIR) && poetry run ruff check . --fix
