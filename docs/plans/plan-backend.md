# Plan: Backend FastAPI — IA-TP-2

## Context

Trabajo práctico universitario de IA. El backend sirve de núcleo a un chatbot Rasa que organiza tiempos: agendas, tipos de evento y eventos con fecha/hora. El frontend y el chatbot Rasa son componentes separados; en esta etapa solo se trabaja dentro de `backend/`.

Objetivo: API REST clara, simple y mantenible. Sin sobreingeniería.

---

## 1. Decisiones técnicas

| Decisión | Justificación |
|---|---|
| FastAPI | Async-ready, documentación automática (Swagger/OpenAPI), validación via Pydantic integrada |
| SQLModel | Une SQLAlchemy + Pydantic; los modelos de DB y los schemas comparten código — menos duplicación |
| SQLite | Suficiente para un TP; cero configuración, archivo único |
| Poetry | Gestión de dependencias y entornos virtuales más robusta que pip puro |
| Sin auth | Fuera de scope; se puede agregar API Key simple como mejora |
| Sin Docker | Innecesario para el alcance del TP |

---

## 2. Estructura interna de `backend/`

```
backend/
├── app/
│   ├── main.py              # App FastAPI, incluye routers, CORS
│   ├── database.py          # Engine SQLite, sesión, función get_session
│   ├── models.py            # Tablas DB con SQLModel (herencia de SQLModel, table=True)
│   ├── schemas.py           # Schemas de entrada/salida (SQLModel sin table=True)
│   ├── routers/
│   │   ├── agendas.py
│   │   ├── event_types.py
│   │   └── events.py
│   └── services/
│       └── events_service.py  # Lógica de negocio: validaciones, solapamiento
├── tests/
│   ├── test_agendas.py
│   ├── test_event_types.py
│   └── test_events.py
├── seed.py                    # Datos iniciales: agendas y tipos de evento por defecto
├── pyproject.toml             # Configuración de Poetry
└── README.md
```

---

## 3. Modelos (SQLModel, `table=True`)

### Agenda
```
id: int (PK, autoincrement)
name: str (not null)
description: Optional[str]
created_at: datetime (default=now)
updated_at: datetime (default=now, onupdate=now)
```

### EventType
```
id: int (PK, autoincrement)
name: str (not null)
color: Optional[str]   # hex string, ej: "#FF5733"
created_at: datetime (default=now)
updated_at: datetime (default=now, onupdate=now)
```

### Event
```
id: int (PK, autoincrement)
title: str (not null)
description: Optional[str]
start_datetime: datetime (not null)
end_datetime: datetime (not null)
agenda_id: int (FK → Agenda.id, not null)
event_type_id: int (FK → EventType.id, not null)
status: Optional[str]  # ej: "pending", "done", "cancelled"
created_at: datetime (default=now)
updated_at: datetime (default=now, onupdate=now)
```

Relaciones definidas con `Relationship` de SQLModel para poder navegar `event.agenda`, `event.event_type`.

---

## 4. Schemas (entrada / salida)

Patrón por entidad: `Create`, `Update`, `Read`.

### Agenda
- `AgendaCreate`: name, description?
- `AgendaUpdate`: name?, description?
- `AgendaRead`: id, name, description?

### EventType
- `EventTypeCreate`: name, color?
- `EventTypeUpdate`: name?, color?
- `EventTypeRead`: id, name, color?

### Event
- `EventCreate`: title, description?, start_datetime, end_datetime, agenda_id, event_type_id, status?
- `EventUpdate`: todos opcionales excepto restricciones
- `EventRead`: todos los campos + `agenda: AgendaRead` + `event_type: EventTypeRead`

---

## 5. Endpoints

### Agendas — `/agendas`
| Método | Path | Descripción |
|---|---|---|
| GET | `/agendas` | Listar todas |
| POST | `/agendas` | Crear |
| GET | `/agendas/{id}` | Obtener por ID |
| PATCH | `/agendas/{id}` | Actualizar parcial |
| DELETE | `/agendas/{id}` | Eliminar |

### EventTypes — `/event-types`
| Método | Path | Descripción |
|---|---|---|
| GET | `/event-types` | Listar todos |
| POST | `/event-types` | Crear |
| GET | `/event-types/{id}` | Obtener por ID |
| PATCH | `/event-types/{id}` | Actualizar parcial |
| DELETE | `/event-types/{id}` | Eliminar |

### Events — `/events`
| Método | Path | Descripción |
|---|---|---|
| GET | `/events` | Listar con filtros opcionales |
| POST | `/events` | Crear |
| GET | `/events/{id}` | Obtener por ID |
| PATCH | `/events/{id}` | Actualizar parcial |
| DELETE | `/events/{id}` | Eliminar |

**Query params para GET `/events`:**
- `agenda_id: int?`
- `event_type_id: int?`
- `month: int?` + `year: int?` — agrupación por mes/año (forma principal de recuperar eventos)
- `from_dt: datetime?` + `to_dt: datetime?` — rango libre como alternativa
- `status: str?`

> Si se pasa `month`/`year`, se ignoran `from_dt`/`to_dt`. Si no se pasa ninguno, devuelve todos.

---

## 6. Reglas de validación

### En schema (Pydantic/SQLModel, antes de llegar al servicio):
- `title` no puede ser vacío ni solo espacios → `@validator` o `Field(min_length=1)`
- `end_datetime > start_datetime` → validador `@model_validator` en `EventCreate`

### En servicio / router (contra DB):
- `agenda_id` debe existir → `404 Not Found` si no existe
- `event_type_id` debe existir → `404 Not Found` si no existe
- Al eliminar **Agenda**: cascade delete de todos sus eventos (comportamiento definido a nivel SQLAlchemy `cascade="all, delete-orphan"`)
- Al eliminar **EventType**: verificar si tiene eventos asociados → `409 Conflict` (no cascade, para no borrar eventos accidentalmente)

### Opcional:
- Detección de solapamiento: query en `events_service.py` que busca eventos en la misma agenda donde `start_datetime < nuevo.end_datetime AND end_datetime > nuevo.start_datetime`

---

## 7. Flujo de integración con Rasa

Rasa vive en `Chatbot/`. Sus `custom actions` (archivo `actions.py` de Rasa) hacen HTTP requests al backend.

```
Usuario → Rasa NLU → Intent detectado
        → Rasa Core → Action server
        → actions.py → requests.post/get/patch/delete → http://localhost:8000/...
        → Respuesta al usuario
```

**Operaciones que Rasa necesita del backend:**

| Intención del usuario | Método | Endpoint |
|---|---|---|
| Crear evento | `POST` | `/events` |
| Editar evento | `PATCH` | `/events/{id}` |
| Eliminar evento | `DELETE` | `/events/{id}` |
| Consultar eventos del día | `GET` | `/events?agenda_id=X&from_dt=...&to_dt=...` |
| Listar agendas | `GET` | `/agendas` |
| Crear agenda | `POST` | `/agendas` |
| Editar agenda | `PATCH` | `/agendas/{id}` |
| Eliminar agenda (y sus eventos) | `DELETE` | `/agendas/{id}` |
| Listar tipos de evento | `GET` | `/event-types` |
| Crear tipo de evento | `POST` | `/event-types` |
| Editar tipo de evento | `PATCH` | `/event-types/{id}` |
| Eliminar tipo de evento | `DELETE` | `/event-types/{id}` |

**No hay acoplamiento de código**: Rasa solo usa HTTP. El backend no sabe que existe Rasa.

**CORS**: Configurar en `main.py` con `CORSMiddleware` para permitir requests locales (o `allow_origins=["*"]` en desarrollo).

---

## 8. Orden de implementación

1. `pyproject.toml` → `poetry init` + agregar dependencias (`fastapi`, `sqlmodel`, `uvicorn`, `pytest`, `httpx`)
2. `app/database.py` → engine SQLite, `get_session`
3. `app/models.py` → las 3 tablas con SQLModel
4. `app/schemas.py` → Create/Update/Read para cada entidad
5. `app/routers/agendas.py` → CRUD completo (el más simple, sin dependencias)
6. `app/routers/event_types.py` → CRUD completo
7. `app/main.py` → registrar los dos routers, probar con Swagger
8. `app/services/events_service.py` → validaciones de negocio para Event
9. `app/routers/events.py` → CRUD + filtros, delegando lógica al servicio
10. `seed.py` → datos iniciales (agenda por defecto + tipos de evento base)
11. `tests/` → tests básicos con `TestClient` de FastAPI
12. `README.md` → instrucciones de setup y uso

---

## 9. Pruebas básicas

Usar `pytest` + `httpx` + `TestClient` de FastAPI con DB SQLite en memoria. Ejecutar con `poetry run pytest`.

### Por entidad:
- Crear entidad válida → `201` con datos correctos
- Obtener entidad inexistente → `404`
- Crear evento con `end_datetime < start_datetime` → `422`
- Crear evento con `agenda_id` inexistente → `404`
- Filtrar eventos por `agenda_id` → solo devuelve los de esa agenda
- Filtrar eventos por rango de fechas → solo devuelve eventos dentro del rango

**Archivo de fixture**: conftest.py con sesión de DB en memoria compartida entre tests.

---

## 10. Datos iniciales (seed)

`seed.py` se ejecuta una vez después de crear las tablas. Inserta datos solo si la DB está vacía.

**Agenda por defecto:**
- `"Mi Agenda"` — agenda principal del usuario

**Tipos de evento por defecto:**

| name | color |
|---|---|
| Reunión | #4A90D9 |
| Tarea | #F5A623 |
| Recordatorio | #7ED321 |
| Personal | #9B59B6 |
| Otro | #95A5A6 |

El startup de la app llama a `seed()` desde `main.py` en el evento `on_startup`, o bien se ejecuta manualmente con `poetry run python seed.py`.

---

## 11. Mejoras opcionales (separadas del mínimo obligatorio)

| Mejora | Estado | Descripción |
|---|---|---|
| Detección de solapamiento | Incluir | Query en `events_service.py`; devuelve `409` si hay colisión en la misma agenda |
| Timestamps | Incluir | `created_at`, `updated_at` en los 3 modelos; se setean automáticamente |
| Logging | Incluir | `logging` estándar de Python; middleware que loguea método, path y status code por request |
| Agrupación por mes/año | Incluir | Query params `month: int` y `year: int` en `GET /events` como alternativa al rango libre `from_dt`/`to_dt` |
| API Key | Descartar | Fuera de scope para este TP |
| Paginación | Descartar | Reemplazada por filtrado mes/año, suficiente para el caso de uso |
| Soft delete | Descartar | Innecesario para el alcance del TP |

---

## Archivos críticos a crear

- `backend/pyproject.toml`
- `backend/seed.py`
- `backend/app/main.py`
- `backend/app/database.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routers/agendas.py`
- `backend/app/routers/event_types.py`
- `backend/app/routers/events.py`
- `backend/app/services/events_service.py`
- `backend/tests/conftest.py`
- `backend/tests/test_agendas.py`
- `backend/tests/test_event_types.py`
- `backend/tests/test_events.py`

---

## Verificación

1. `poetry install` → instalar dependencias
2. `poetry run uvicorn app.main:app --reload` → arrancar en `http://localhost:8000`
3. Abrir `http://localhost:8000/docs` → Swagger UI con todos los endpoints
4. Verificar que el seed cargó: `GET /agendas` devuelve "Mi Agenda", `GET /event-types` devuelve los 5 tipos
5. Probar CRUD manual desde Swagger
6. `poetry run pytest tests/` → todos los tests pasan
7. Simular un request de Rasa: `curl -X POST http://localhost:8000/events -H "Content-Type: application/json" -d '{"title":"Reunión","start_datetime":"2026-05-10T10:00:00","end_datetime":"2026-05-10T11:00:00","agenda_id":1,"event_type_id":1}'`
8. Verificar cascade: eliminar la agenda creada → confirmar que sus eventos también desaparecen
