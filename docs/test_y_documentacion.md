# Tests y documentación del backend

## Levantar el backend

```bash
make dev-backend
```

Corre `uvicorn` con hot-reload en `http://localhost:8000`. Los logs aparecen en la terminal en tiempo real.

---

## Swagger — documentación automática

FastAPI genera estas UIs sin configuración adicional:

| URL | Descripción |
|-----|-------------|
| `http://localhost:8000/docs` | Swagger UI — interactiva, permite ejecutar requests desde el browser |
| `http://localhost:8000/redoc` | ReDoc — más legible, solo lectura |
| `http://localhost:8000/openapi.json` | Schema OpenAPI en JSON crudo |

Cada endpoint definido con `@router.get`, `@router.post`, etc. aparece en Swagger con sus parámetros, tipos esperados y ejemplos de respuesta. Para probar: expandir un endpoint → "Try it out" → completar campos → "Execute".

---

## Opciones para probar la API en vivo

### A) Swagger UI (más rápido, sin instalar nada)

1. `make dev-backend`
2. Abrir `http://localhost:8000/docs`
3. Expandir cualquier endpoint → "Try it out" → completar body → "Execute"

### B) Archivo `.http` con VS Code REST Client

Instalar la extensión **REST Client** de VS Code, luego crear `requests.http` en la raíz del proyecto:

```http
### Listar agendas
GET http://localhost:8000/agendas

### Crear agenda
POST http://localhost:8000/agendas
Content-Type: application/json

{
  "name": "Mi Agenda de Prueba"
}

### Listar tipos de evento
GET http://localhost:8000/event-types

### Crear tipo de evento
POST http://localhost:8000/event-types
Content-Type: application/json

{
  "name": "Clase",
  "color": "#3498DB"
}

### Crear evento
POST http://localhost:8000/events
Content-Type: application/json

{
  "title": "Reunión de equipo",
  "start_datetime": "2026-05-10T10:00:00",
  "end_datetime": "2026-05-10T11:00:00",
  "agenda_id": 1,
  "event_type_id": 1
}

### Listar eventos del mes actual
GET http://localhost:8000/events?month=5&year=2026

### Listar eventos por agenda
GET http://localhost:8000/events?agenda_id=1

### Obtener evento por ID
GET http://localhost:8000/events/1

### Actualizar evento (parcial)
PATCH http://localhost:8000/events/1
Content-Type: application/json

{
  "title": "Reunión de equipo (actualizada)"
}

### Eliminar evento
DELETE http://localhost:8000/events/1

### Eliminar agenda (cascade: borra todos sus eventos)
DELETE http://localhost:8000/agendas/1
```

Cada bloque `###` muestra un botón "Send Request" arriba de la línea. El resultado aparece en un panel lateral.

### C) `pytest` automatizado (tests de integración)

No requieren el servidor corriendo — usan una DB SQLite en memoria.

```bash
make test
```

Corren los tests en `backend/tests/`. Son los tests de regresión: verifican que la lógica de negocio (validaciones, cascade delete, detección de solapamiento, filtros por fecha) siga funcionando correctamente después de cualquier cambio.

---

## Cuándo usar cada uno

| Herramienta | Cuándo usarla |
|-------------|---------------|
| Swagger UI | Exploración inicial, probar endpoints nuevos manualmente |
| `.http` | Secuencias de requests reproducibles, compartir con el equipo |
| `pytest` | Validar que nada se rompió después de un cambio (CI/CD) |
