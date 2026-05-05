# Makefile — Guía del proyecto

## ¿Qué es un Makefile?

`make` es una herramienta estándar en sistemas Unix que permite definir **comandos con nombre** (llamados *targets*) y ejecutarlos con `make <target>`. No hay nada mágico: cada target es básicamente un alias para uno o varios comandos de shell.

La ventaja en un monorepo es tener **un único punto de entrada** desde la raíz del proyecto, sin tener que recordar qué herramienta usa cada componente ni desde qué carpeta correrla.

---

## Estado actual

El Makefile actual solo cubre el **backend**. Los demás componentes se agregan a medida que se implementan.

```
make install   → instala dependencias del backend (poetry install)
make dev       → levanta uvicorn en modo desarrollo con hot-reload
make test      → corre pytest con output verbose
make lint      → valida código con Ruff (sin modificar archivos)
make lint-fix  → aplica correcciones automáticas de Ruff
make help      → muestra todos los comandos disponibles
```

---

## Cómo funciona el Makefile actual

```makefile
BACKEND_DIR := backend
```
Variable local. Permite cambiar la ruta del backend en un solo lugar si alguna vez se mueve la carpeta.

```makefile
.PHONY: help install dev test lint lint-fix
```
Le dice a `make` que estos targets **no son archivos**. Sin esto, si existiera un archivo llamado `test` en la raíz, `make test` no haría nada porque creería que el archivo ya está "actualizado".

```makefile
install:
	cd $(BACKEND_DIR) && poetry install
```
Cada línea indentada debajo de un target se ejecuta en una **subshell separada**. Por eso el `cd` y el comando van unidos con `&&` — si fueran dos líneas distintas, el `cd` de la primera no afectaría a la segunda.

---

## Cómo agregar el Frontend

Cuando el frontend esté listo (asumiendo Vite + Node):

```makefile
FRONTEND_DIR := frontend

install:
	cd $(BACKEND_DIR) && poetry install
	cd $(FRONTEND_DIR) && npm install

dev-frontend:
	cd $(FRONTEND_DIR) && npm run dev

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint
```

---

## Cómo agregar Rasa (Chatbot)

Rasa usa un entorno virtual propio. Lo más simple es un `venv` dentro de `Chatbot/`:

```makefile
CHATBOT_DIR := Chatbot

install:
	cd $(BACKEND_DIR) && poetry install
	cd $(FRONTEND_DIR) && npm install
	cd $(CHATBOT_DIR) && pip install -r requirements.txt

dev-chatbot:
	cd $(CHATBOT_DIR) && rasa run --enable-api

dev-actions:
	cd $(CHATBOT_DIR) && rasa run actions
```

> Rasa necesita dos procesos corriendo en paralelo: el servidor principal (`rasa run`) y el servidor de acciones (`rasa run actions`). Son independientes.

---

## Levantar todo a la vez

Una vez que los tres componentes estén listos, se puede agregar un target `dev` unificado.

### Opción A — `&` simple (sin dependencias extra)

```makefile
dev:
	cd $(BACKEND_DIR) && poetry run uvicorn app.main:app --reload &
	cd $(FRONTEND_DIR) && npm run dev &
	cd $(CHATBOT_DIR) && rasa run --enable-api &
	cd $(CHATBOT_DIR) && rasa run actions
```

**Pros:** cero instalación adicional.  
**Contras:** los logs de los 4 procesos se mezclan en la misma terminal. Para detenerlos hay que hacer `Ctrl+C` varias veces o matar los procesos manualmente.

### Opción B — `overmind` (recomendada para desarrollo)

`overmind` es una herramienta que lee un `Procfile` y levanta cada proceso en una pestaña separada con logs por colores. Se instala con `brew install overmind`.

**Procfile** (en la raíz):
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

Con esto, `make dev` levanta todo. `Ctrl+C` mata todo limpiamente. Los logs se pueden ver por separado con `overmind connect <nombre>`.

---

## Resumen de la evolución esperada del Makefile

| Etapa | Targets disponibles |
|---|---|
| Ahora (solo backend) | `install`, `dev`, `test`, `lint`, `lint-fix` |
| + Frontend | `install`, `dev-frontend`, `lint-frontend` |
| + Chatbot | `install`, `dev-chatbot`, `dev-actions` |
| Todo integrado | `dev` (levanta los 3 a la vez) |
