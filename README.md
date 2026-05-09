<div align="center">

# 🤖 IA — Trabajo Práctico 2

**Sistema de gestión de agenda personal operado mediante un chatbot conversacional**

*Trabajo Práctico 2 · Cátedra de Inteligencia Artificial*

![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

</div>

---

## Descripción

Este proyecto implementa un asistente conversacional que permite al usuario gestionar su agenda personal mediante lenguaje natural. El sistema cuenta con una API REST, una interfaz web de chat y, próximamente, un chatbot entrenado con Rasa.

---

## Stack tecnológico

| Componente | Tecnología | Descripción |
|-----------|-----------|-------------|
| **Backend** | FastAPI + SQLModel | API REST con documentación automática (Swagger/OpenAPI) |
| **Base de datos** | SQLite | Embebida, sin configuración adicional |
| **Dependencias** | Poetry | Gestión de entornos virtuales |
| **Linter backend** | Ruff | Linter y formatter para Python |
| **Frontend** | React 18 + TypeScript | Interfaz web del chat |
| **Bundler** | Vite | Dev server y build de producción |
| **Linter frontend** | ESLint | Validación de código TypeScript/React |

---

## Requisitos previos

- Python **3.10**
- [Poetry](https://python-poetry.org/docs/#installation) — `pip install poetry`
- Node.js **18+** y npm

---

## Configuración (.env)

El proyecto soporta el uso de un LLM como fallback para la interpretación de fechas complejas. Para esto, debés configurar tus API keys en el archivo `.env` dentro de la carpeta `rasa_bot/`.

Creá un archivo `.env` tomando como base `rasa_bot/.env.example`:

```bash
# En rasa_bot/.env
GEMINI_API_KEY="tu_api_key_de_gemini"
GEMINI_MODEL="gemini-1.5-flash" # Modelos soportados: gemini-1.5-flash, gemini-2.5-flash, gemini-1.5-pro, etc.

# Opcional: Minimax
# MINIMAX_API_KEY="tu_api_key_de_minimax"
```
> **Nota:** El archivo `.env` está ignorado en `.gitignore` por seguridad. No lo comitees.

---

## Comandos

> Todos los comandos se ejecutan desde la raíz del proyecto.

### Instalación

```bash
make install            # Instala dependencias de backend, frontend y rasa bot
make install-backend    # Solo backend (Poetry)
make install-frontend   # Solo frontend (npm)
make install-rasa       # Solo rasa bot (Poetry)
```

### Desarrollo

```bash
make dev                # Levanta backend, frontend, rasa y action server
make dev-backend        # Solo backend  →  http://localhost:8000
make dev-frontend       # Solo frontend →  http://localhost:5173
make dev-rasa           # Solo rasa bot →  http://localhost:5005
make dev-rasa-actions   # Solo action server de Rasa → http://localhost:5055
```

### Calidad de código

```bash
make lint               # Valida el backend con Ruff
make lint-fix           # Corrige errores automáticos con Ruff
make lint-frontend      # Valida el frontend con ESLint
make test               # Corre los tests del backend con pytest
make test-rasa          # Corre los tests de Rasa (core + NLU)
make train-rasa         # Entrena el modelo de Rasa
```

### Base de datos

```bash
make seed-dev           # Pobla la DB con 55+ eventos de desarrollo realistas
```

> Limpia los eventos existentes y recrea el conjunto de datos de desarrollo. Útil para resetear el estado de la DB al probar el calendario.

### Build

```bash
make build              # Compila el frontend para producción
```

---

## Documentación

Consultá la carpeta [`/docs`](./docs/) para más detalles:

| Archivo | Contenido |
|--------|-----------|
| [`Makefile.md`](./docs/Makefile.md) | Cómo funciona el Makefile y cómo agregar nuevos componentes |
| [`test_y_documentacion.md`](./docs/test_y_documentacion.md) | Cómo probar la API con Swagger, REST Client y pytest |
