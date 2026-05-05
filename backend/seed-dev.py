from datetime import timedelta
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models import Agenda, EventType, Event


POOL_EVENTOS = [
    {"title": "Revisión de Sprint Planning", "description": "Revisar avance del sprint actual y planificar las historias de usuario para el siguiente sprint. Preparar backlog priorizado.", "type": "Reunión", "hour_start": 9, "hour_end": 11},
    {"title": "Actualización de documentación API", "description": "Actualizar los endpoints de la API REST con los nuevos cambios del módulo de autenticación. Incluir ejemplos de requests y responses.", "type": "Tarea", "hour_start": 14, "hour_end": 16},
    {"title": "Llamada con cliente - Demo quarterly", "description": "Presentación de resultados trimestrales al cliente. Mostrar métricas de uso, mejoras implementadas y roadmap del próximo trimestre.", "type": "Reunión", "hour_start": 15, "hour_end": 17},
    {"title": "Revisión de código - Module Auth", "description": "Code review del pull request #234 que implementa el nuevo sistema de autenticación con JWT.", "type": "Tarea", "hour_start": 10, "hour_end": 12},
    {"title": "dentify team sync", "description": "Reunión semanal de sincronización del equipo de desarrollo. Revisión de blockers, estimación develocity y planificación de parches.", "type": "Reunión", "hour_start": 10, "hour_end": 11},
    {"title": "Backup de base de datos", "description": "Ejecutar script de backup completo de la base de datos de producción. Verificar integridad de los archivos yarchivar en storage seguro.", "type": "Tarea", "hour_start": 2, "hour_end": 4},
    {"title": "Presentación arquitectura microservices", "description": "Preparar presentación sobre la nueva arquitectura basada en microservicios para la reunión con stakeholders técnicos.", "type": "Personal", "hour_start": 16, "hour_end": 18},
    {"title": "Testing suite - Endpoint /users", "description": "Completar suite de tests para el endpoint de usuarios. Alcanzar coverage mínimo del 85%.", "type": "Tarea", "hour_start": 9, "hour_end": 13},
    {"title": "Llamada de emergencia - Prod issue", "description": "Incident call con el equipo de operaciones. Error críticos en el servicio de pagos que requiere atención inmediata.", "type": "Reunión", "hour_start": 20, "hour_end": 22},
    {"title": "Refactorización service layer", "description": "Refactorizar la capa de servicios del módulo de inventarios para implementar el patrón Repository.", "type": "Tarea", "hour_start": 14, "hour_end": 17},
    {"title": "One-on-one con developer junior", "description": "Sesión de mentorship con el nuevo desarrollador. Revisar código, responder dudas y establecer goals del mes.", "type": "Personal", "hour_start": 11, "hour_end": 12},
    {"title": "Auditoría de seguridad mensual", "description": "Ejecutar scanner de vulnerabilidades y revisar logs de acceso. Documentar hallazgos y crear ticket parafixes críticos.", "type": "Tarea", "hour_start": 9, "hour_end": 12},
    {"title": "Kickoff proyecto nuevo cliente", "description": "Reunión de inicio con el nuevo cliente. Presentar equipo, establecer canales de comunicación y definir milestones.", "type": "Reunión", "hour_start": 10, "hour_end": 12},
    {"title": "Despliegue a staging", "description": "Desplegar última versión del backend al ambiente de staging. Ejecutar smoke tests y verificar rollback procedure.", "type": "Tarea", "hour_start": 17, "hour_end": 19},
    {"title": "Review diseño UI - Dashboard", "description": "Sesión de design review con el equipo de UX. Aprobar mockups del nuevo dashboard de métricas.", "type": "Reunión", "hour_start": 14, "hour_end": 15},
    {"title": "Optimización queries database", "description": "Analizar y optimizar las 10 queries más lentas identificadas por el profiler. Implementar índices necesarios.", "type": "Tarea", "hour_start": 15, "hour_end": 18},
    {"title": "Certificación AWS - Study time", "description": "Tiempo dedicado a estudio para la certificación AWS Solutions Architect. Practicar con labs y exams de simulación.", "type": "Personal", "hour_start": 19, "hour_end": 21},
    {"title": "Reunión de planeación trimestral", "description": "Planeación de OKRs y roadmap tecnológico del próximo trimestre. Definir prioridades de ingeniería.", "type": "Reunión", "hour_start": 9, "hour_end": 13},
    {"title": "Migrate CI/CD pipeline", "description": "Migrar pipeline de CI/CD de Jenkins a GitHub Actions. Mantener backwards compatibility durante transición.", "type": "Tarea", "hour_start": 14, "hour_end": 18},
    {"title": "Sprint retrospective", "description": "Facilitar la retrospectiva del sprint. Recolectar feedback, identificar mejoras en procesos y definir action items.", "type": "Reunión", "hour_start": 15, "hour_end": 16},
    {"title": "Implementación caching Redis", "description": "Implementar capa de caché con Redis para endpoints de alta frecuencia. Definir TTLs y invalidation strategy.", "type": "Tarea", "hour_start": 10, "hour_end": 14},
    {"title": "Cliente: Workshop Vue.js", "description": "Workshop de Vue.js 3 para el equipo frontend del cliente. Cubrir Composition API y Pinia store.", "type": "Reunión", "hour_start": 9, "hour_end": 17},
    {"title": "Code freeze - Release v2.5", "description": "Iniciar code freeze para la versión 2.5. Solo hotfixes permitidos. Notificar a todos los equipos.", "type": "Tarea", "hour_start": 18, "hour_end": 19},
    {"title": "Arquitectura Event-Driven", "description": "Investigar y documentar patrones de arquitectura event-driven para el nuevo sistema de notificaciones.", "type": "Personal", "hour_start": 20, "hour_end": 22},
    {"title": "Sesión de pair programming", "description": "Pair programming con el equipo backend para implementar feature de export a CSV.", "type": "Reunión", "hour_start": 14, "hour_end": 17},
    {"title": "Docker Compose setup", "description": "Actualizar Docker Compose para incluir todos los servicios: app, postgres, redis, nginx. Optimizar networks.", "type": "Tarea", "hour_start": 11, "hour_end": 14},
    {"title": "Almuerzo con equipo de producto", "description": "Team lunch con el equipo de producto. Conversación informal sobre roadmap y feedback sobre colaboración.", "type": "Personal", "hour_start": 13, "hour_end": 14},
    {"title": "Database schema migration", "description": "Ejecutar migration para agregar tablas de audit log. Mantener backward compatibility.", "type": "Tarea", "hour_start": 22, "hour_end": 23},
    {"title": "Performance testing", "description": "Ejecutar k6 load test con 1000 concurrent users. Analizar resultados y documentar bottlenecks.", "type": "Tarea", "hour_start": 15, "hour_end": 18},
    {"title": "Security penetration test", "description": "Review de resultados del pentest externo. Priorizar hallazgos críticos y asignar a developers.", "type": "Reunión", "hour_start": 10, "hour_end": 11},
    {"title": "Migration docs to Notion", "description": "Migrar documentación técnica de Confluence a Notion. Actualizar estructura y permisos.", "type": "Tarea", "hour_start": 9, "hour_end": 12},
    {"title": "API versioning strategy", "description": "Definir estrategia de versionado de API (URL vs header). Escribir ADR y presentar a equipo.", "type": "Personal", "hour_start": 16, "hour_end": 17},
    {"title": "Bug bash - Release candidate", "description": "Sesión de bug hunting en el release candidate. Invitar a QA, producto y devs a probar flujos críticos.", "type": "Reunión", "hour_start": 14, "hour_end": 16},
    {"title": "GraphQL schema design", "description": "Diseñar schema de GraphQL para el nuevo módulo de analytics. Definir types, queries y mutations.", "type": "Tarea", "hour_start": 10, "hour_end": 13},
    {"title": "Technical debt triage", "description": "Revisar backlog de technical debt. Priorizar items que impactan performance y seguridad. Crear epic.", "type": "Reunión", "hour_start": 11, "hour_end": 12},
    {"title": "Setup monitoring - Datadog", "description": "Configurar dashboard de Datadog para el nuevo servicio. Agregar custom metrics y alerts.", "type": "Tarea", "hour_start": 14, "hour_end": 17},
    {"title": "Catch-up con manager", "description": "One-on-one mensual con el engineering manager. Discuss career growth, feedback y próximos pasos.", "type": "Personal", "hour_start": 16, "hour_end": 17},
    {"title": "Database replication setup", "description": "Configurar replicación asíncrona de PostgreSQL para disaster recovery. Testear failover.", "type": "Tarea", "hour_start": 22, "hour_end": 2},
    {"title": "Stakeholder presentation", "description": "Presentar estado del proyecto a stakeholders ejecutivos. Demo de features completados y timeline.", "type": "Reunión", "hour_start": 10, "hour_end": 11},
    {"title": "Implementación feature flags", "description": "Integrar sistema de feature flags con LaunchDarkly. Permitir releases graduales y rollback rápido.", "type": "Tarea", "hour_start": 14, "hour_end": 18},
    {"title": "Gym - CrossFit class", "description": "Clase de CrossFit en el gimnasio. Rutina de fuerza y conditioning del día.", "type": "Personal", "hour_start": 7, "hour_end": 8},
    {"title": "Load balancer config review", "description": "Revisar configuración de HAProxy. Verificar rules, health checks y SSL termination.", "type": "Tarea", "hour_start": 15, "hour_end": 17},
    {"title": "Design system workshop", "description": "Workshop interno sobre tokens de diseño y components library. Práctica con Storybook.", "type": "Reunión", "hour_start": 9, "hour_end": 12},
    {"title": "Profiling session - Python", "description": "Profile aplicación Python con py-spy. Identificar memory leaks yCPU hotspots.", "type": "Tarea", "hour_start": 11, "hour_end": 14},
    {"title": "Hiring interviews - Backend dev", "description": "Entrevistar candidatos para posición de backend developer. Review técnico y cultural.", "type": "Reunión", "hour_start": 14, "hour_end": 16},
    {"title": "Dependency audit", "description": "Auditar dependencias del proyecto con npm audit y safety. Actualizar packages vulnerables.", "type": "Tarea", "hour_start": 10, "hour_end": 11},
    {"title": "WebSocket implementation", "description": "Implementar WebSocket para actualizaciones en tiempo real en el dashboard de usuarios.", "type": "Tarea", "hour_start": 14, "hour_end": 19},
    {"title": "Familia - Cena de cumpleaños", "description": "Cena de cumpleaños de mamá en casa. Llevar regalo y ayudar con decoración.", "type": "Personal", "hour_start": 20, "hour_end": 23},
    {"title": "Integration tests - CI pipeline", "description": "Escribir integración tests para el flujo de checkout. Agregar al pipeline de CI.", "type": "Tarea", "hour_start": 9, "hour_end": 13},
    {"title": "Contract testing con Pact", "description": "Implementar contract tests entre servicios usando Pact. Asegurar backwards compatibility.", "type": "Tarea", "hour_start": 14, "hour_end": 17},
    {"title": "Q&A session - Architecture decision", "description": "Sesión de Q&A para explicar ADR de usar event sourcing. Responder preguntas del equipo.", "type": "Reunión", "hour_start": 16, "hour_end": 17},
    {"title": "Kubernetes deployment", "description": "Deploy aplicación a cluster Kubernetes. Configurar HPA, resource limits y probes.", "type": "Tarea", "hour_start": 15, "hour_end": 19},
    {"title": "Meditación y descanso", "description": "Sesión de meditación guiada con Headspace. 20 minutos de breathing exercises.", "type": "Personal", "hour_start": 12, "hour_end": 12},
    {"title": "OWASP security review", "description": "Review de seguridad usando OWASP Top 10. Verificar que no haya vulnerabilidades known.", "type": "Tarea", "hour_start": 10, "hour_end": 14},
    {"title": "Retrospective action items", "description": "Implementar mejoras definidas en última retrospectiva: new git flow, PR templates, pair schedule.", "type": "Tarea", "hour_start": 9, "hour_end": 11},
    {"title": "Open source contribution", "description": "贡献 a proyecto open source. Crear PR para docs o bug fix en library que usamos.", "type": "Personal", "hour_start": 18, "hour_end": 20},
    {"title": "Post-mortem incident", "description": "Documentar post-mortem del incidente de ayer. Identificar root cause y preventive actions.", "type": "Reunión", "hour_start": 9, "hour_end": 10},
    {"title": "Terraform modules refactor", "description": "Refactorizar módulos de Terraform para reducir duplicación. Extraer common patterns.", "type": "Tarea", "hour_start": 14, "hour_end": 18},
    {"title": "Coffee chat - Tech lead", "description": "Conversación informal con el tech lead sobre carrera, arquitectura y mejores prácticas.", "type": "Personal", "hour_start": 15, "hour_end": 16},
]

STATUSES = ["pending", "pending", "pending", "pending", "pending", "pending", "confirmed", "confirmed", "confirmed", "cancelled"]


def _get_or_create_agenda(session: Session) -> int:
    agenda = session.exec(select(Agenda)).first()
    if not agenda:
        agenda = Agenda(name="Mi Agenda")
        session.add(agenda)
        session.commit()
        session.refresh(agenda)
    return agenda.id


def _get_event_type_id_by_name(session: Session, name: str) -> int | None:
    et = session.exec(select(EventType).where(EventType.name == name)).first()
    return et.id if et else None


def _get_event_type_ids(session: Session) -> list[int]:
    return [et.id for et in session.exec(select(EventType)).all()]


def run_seed_dev(event_count: int = 55):
    create_db_and_tables()

    with Session(engine) as session:
        agenda_id = _get_or_create_agenda(session)
        event_type_ids = _get_event_type_ids(session)

        if not event_type_ids:
            print("ERROR: No hay event types. Ejecutar seed.py primero.")
            return

        existing = session.exec(select(Event)).all()
        if existing:
            print(f"DB ya tiene {len(existing)} eventos. Limpiando...")
            for e in existing:
                session.delete(e)
            session.commit()

        from datetime import datetime, timedelta
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        base_date = today - timedelta(days=15)

        eventos_creados = 0
        for i, evento in enumerate(POOL_EVENTOS[:event_count]):
            day_offset = i // 3 + (i % 7)
            start_date = base_date + timedelta(days=day_offset)
            hour_start = evento["hour_start"]
            hour_end = evento["hour_end"]

            start_dt = start_date.replace(hour=hour_start % 24, minute=0)
            end_dt = start_date.replace(hour=hour_end % 24, minute=0)

            if hour_end <= hour_start:
                end_dt = end_dt + timedelta(days=1)

            duration_hours = (end_dt - start_dt).total_seconds() / 3600
            if duration_hours < 0.5:
                end_dt = start_dt + timedelta(hours=1)

            event_type_id = event_type_ids[i % len(event_type_ids)]

            event = Event(
                title=evento["title"],
                description=evento["description"],
                start_datetime=start_dt,
                end_datetime=end_dt,
                agenda_id=agenda_id,
                event_type_id=event_type_id,
                status=STATUSES[i % len(STATUSES)],
            )
            session.add(event)
            eventos_creados += 1

        session.commit()
        print(f"Seeded {eventos_creados} eventos de desarrollo.")


if __name__ == "__main__":
    run_seed_dev()