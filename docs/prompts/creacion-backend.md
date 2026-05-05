Actuá como arquitecto backend y ayudante técnico para un trabajo práctico universitario de Inteligencia Artificial.

Necesito que generes un plan de implementación para el backend de una aplicación sencilla usando Python, FastAPI, SQLModel y SQLite.

Contexto del proyecto:
- Es un trabajo práctico de facultad, por lo tanto la solución debe ser clara, simple y mantenible, sin sobreingeniería.
- El proyecto ya tiene esta estructura inicial de carpetas:
  - backend/
  - frontend/
  - Chatbot/
- En esta etapa se trabajará únicamente dentro de la carpeta backend/.
- El backend será consumido por un chatbot hecho con Rasa, ubicado en la carpeta Chatbot/.
- Rasa estará separado del backend y ejecutará acciones que llamarán a esta API.
- La aplicación sirve para organizar tiempos mediante agendas y eventos.
- Un usuario podrá crear agendas, tipos de eventos y eventos con fecha/hora de inicio y fin.
- Por ahora no es obligatorio implementar login.
- Puede contemplarse una API Key simple como mejora opcional, pero no JWT salvo que se justifique claramente.

Tecnologías obligatorias para backend/:
- Python
- FastAPI
- SQLModel
- SQLite

Objetivo del plan:
Generar un plan paso a paso para implementar el backend dentro de la carpeta backend/, incluyendo estructura interna de carpetas, modelos, endpoints, validaciones, servicios y pruebas básicas.

Entidades iniciales:
1. Agenda:
   - id
   - name
   - description opcional

2. EventType:
   - id
   - name
   - color opcional

3. Event:
   - id
   - title
   - description opcional
   - start_datetime
   - end_datetime
   - agenda_id
   - event_type_id
   - status opcional

Reglas de negocio mínimas:
- Un evento debe tener título.
- La fecha/hora de fin debe ser posterior a la fecha/hora de inicio.
- Un evento debe pertenecer a una agenda existente.
- Un evento debe tener un tipo de evento existente.
- Opcional: impedir solapamiento de eventos dentro de una misma agenda.

Endpoints esperados:
- CRUD completo de agendas.
- CRUD completo de tipos de evento.
- CRUD completo de eventos.
- Listado de eventos con filtros por:
  - agenda_id
  - event_type_id
  - rango de fechas: from y to
  - status, si se implementa

Estructura sugerida dentro de backend/:
- app/main.py
- app/database.py
- app/models.py
- app/schemas.py
- app/routers/agendas.py
- app/routers/event_types.py
- app/routers/events.py
- app/services/events_service.py
- requirements.txt
- README.md

El plan debe incluir:
1. Decisiones técnicas y justificación breve.
2. Estructura interna recomendada para backend/.
3. Definición de modelos.
4. Definición de schemas de entrada y salida.
5. Endpoints necesarios.
6. Reglas de validación.
7. Flujo de integración con Rasa desde la carpeta Chatbot/.
8. Orden recomendado de implementación.
9. Pruebas básicas a realizar.
10. Posibles mejoras opcionales, separadas claramente de lo obligatorio.

Restricciones:
- No trabajar sobre frontend/ ni Chatbot/ en esta etapa.
- No proponer arquitectura excesivamente compleja.
- No usar PostgreSQL, Docker, Redis, Celery ni autenticación avanzada salvo como mejora opcional.
- No generar código completo todavía.
- El resultado debe ser un plan de implementación concreto, ordenado y ejecutable por un estudiante.
- Priorizar claridad antes que sofisticación.
