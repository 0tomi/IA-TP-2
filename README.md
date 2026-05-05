<div align="center">

# 🤖 IA — Trabajo Práctico 2

**Sistema de gestión de agenda personal operado mediante un chatbot conversacional**

*Trabajo Práctico 2 · Cátedra de Inteligencia Artificial*

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
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

- Python **3.11+**
- [Poetry](https://python-poetry.org/docs/#installation) — `pip install poetry`
- Node.js **18+** y npm

---

## Comandos

> Todos los comandos se ejecutan desde la raíz del proyecto.

### Instalación

```bash
make install            # Instala dependencias de backend y frontend
make install-backend    # Solo backend (Poetry)
make install-frontend   # Solo frontend (npm)
```

### Desarrollo

```bash
make dev                # Levanta backend y frontend en paralelo
make dev-backend        # Solo backend  →  http://localhost:8000
make dev-frontend       # Solo frontend →  http://localhost:5173
```

### Calidad de código

```bash
make lint               # Valida el backend con Ruff
make lint-fix           # Corrige errores automáticos con Ruff
make lint-frontend      # Valida el frontend con ESLint
make test               # Corre los tests del backend con pytest
```

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
