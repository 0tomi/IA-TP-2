from sqlmodel import Session, select

from app.database import engine
from app.models import Agenda, EventType

DEFAULT_AGENDA = "Mi Agenda"

DEFAULT_EVENT_TYPES = [
    {"name": "Reunión", "color": "#4A90D9"},
    {"name": "Tarea", "color": "#F5A623"},
    {"name": "Recordatorio", "color": "#7ED321"},
    {"name": "Personal", "color": "#9B59B6"},
    {"name": "Otro", "color": "#95A5A6"},
]


def run_seed():
    with Session(engine) as session:
        if not session.exec(select(Agenda)).first():
            session.add(Agenda(name=DEFAULT_AGENDA))

        if not session.exec(select(EventType)).first():
            for et in DEFAULT_EVENT_TYPES:
                session.add(EventType(**et))

        session.commit()


if __name__ == "__main__":
    from app.database import create_db_and_tables
    create_db_and_tables()
    run_seed()
    print("Seed completado.")
