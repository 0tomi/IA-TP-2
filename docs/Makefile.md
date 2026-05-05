# Makefile — Guía del proyecto

## ¿Qué es un Makefile?

`make` es una herramienta estándar en sistemas Unix que permite definir **comandos con nombre** (llamados *targets*) y ejecutarlos con `make <target>`. No hay nada mágico: cada target es básicamente un alias para uno o varios comandos de shell.

La ventaja en un monorepo es tener **un único punto de entrada** desde la raíz del proyecto, sin tener que recordar qué herramienta usa cada componente ni desde qué carpeta correrla.

---

## Estado actual

El Makefile cubre **backend** (FastAPI + Poetry) y **frontend** (Vite + React + TypeScript + npm).

```
make install          → instala dependencias de backend y frontend
make install-backend  → solo backend  (poetry install)
make install-frontend → solo frontend (npm install)

make dev              → levanta backend y frontend en paralelo
make dev-backend      → solo backend  → http://localhost:8000
make dev-frontend     → solo frontend → http://localhost:5173

make build            → compila el frontend para producción (tsc + vite build)

make test             → corre pytest con output verbose
make lint             → valida código del backend con Ruff (sin modificar)
make lint-fix         → aplica correcciones automáticas de Ruff
make help             → muestra todos los comandos disponibles
```

---

## Cómo funciona el Makefile

```makefile
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
```
Variables locales. Si alguna vez se mueve una carpeta, se actualiza en un solo lugar.

```makefile
.PHONY: help install dev test lint lint-fix ...
```
Le dice a `make` que estos targets **no son archivos**. Sin esto, si existiera un archivo llamado `test` en la raíz, `make test` no haría nada porque creería que el archivo ya está "actualizado".

```makefile
install: install-backend install-frontend
```
Un target puede depender de otros targets. `make install` ejecuta `install-backend` y luego `install-frontend` en ese orden.

```makefile
install-backend:
	cd $(BACKEND_DIR) && poetry install
```
Cada línea indentada debajo de un target se ejecuta en una **subshell separada**. Por eso el `cd` y el comando van unidos con `&&` — si fueran dos líneas distintas, el `cd` de la primera no afectaría a la segunda.

```makefile
dev:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload &
	cd $(FRONTEND_DIR) && npm run dev
```
El `&` al final de la primera línea manda el proceso al background. El frontend queda en foreground y recibe el `Ctrl+C`. El backend muere solo cuando se cierra la terminal o se mata manualmente con `kill`.

---

## Cómo agregar Rasa (Chatbot)

Rasa usa un entorno virtual propio. Lo más simple es un `venv` dentro de `Chatbot/` con un `requirements.txt`.

Agregar al Makefile:

```makefile
CHATBOT_DIR := Chatbot

install: install-backend install-frontend install-chatbot

install-chatbot:
	cd $(CHATBOT_DIR) && pip install -r requirements.txt

dev-chatbot:
	cd $(CHATBOT_DIR) && rasa run --enable-api

dev-actions:
	cd $(CHATBOT_DIR) && rasa run actions
```

> Rasa necesita dos procesos corriendo en paralelo: el servidor principal (`rasa run`) y el servidor de acciones (`rasa run actions`). Son independientes entre sí.

Actualizar `dev` para incluirlo:

```makefile
dev:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload &
	cd $(CHATBOT_DIR) && rasa run --enable-api &
	cd $(CHATBOT_DIR) && rasa run actions &
	cd $(FRONTEND_DIR) && npm run dev
```

---

## Alternativa con `overmind` (logs separados por proceso)

Con `&` todos los procesos comparten la misma terminal y los logs se mezclan. `overmind` resuelve eso: cada proceso tiene su propio panel con color distinto, y `Ctrl+C` mata todo limpiamente.

Instalación: `brew install overmind`

**Procfile** (en la raíz del repo):
```
backend:  cd backend && poetry run uvicorn app.main:app --reload
frontend: cd frontend && npm run dev
chatbot:  cd Chatbot && rasa run --enable-api
actions:  cd Chatbot && rasa run actions
```

**Makefile:**
```makefile
dev:
	overmind start
```

Ver logs de un proceso específico: `overmind connect backend`

---

## Resumen de la evolución del Makefile

| Etapa | Estado | Targets clave |
|---|---|---|
| Backend | Hecho | `install-backend`, `dev-backend`, `test`, `lint` |
| Frontend | Hecho | `install-frontend`, `dev-frontend`, `build` |
| Chatbot (Rasa) | Pendiente | `install-chatbot`, `dev-chatbot`, `dev-actions` |
| Todo integrado | Pendiente | `dev` (levanta los 3 a la vez) |
