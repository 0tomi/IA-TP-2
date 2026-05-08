from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Agenda, Event, EventType
from app.schemas import EventCreate, EventUpdate


def validate_foreign_keys(
    session: Session, agenda_id: int, event_type_id: int
) -> None:
    if not session.get(Agenda, agenda_id):
        raise HTTPException(status_code=404, detail="Agenda not found")
    if not session.get(EventType, event_type_id):
        raise HTTPException(status_code=404, detail="EventType not found")


def check_overlap(
    session: Session,
    agenda_id: int,
    start_dt: datetime,
    end_dt: datetime,
    exclude_event_id: int | None = None,
) -> None:
    query = select(Event).where(
        Event.agenda_id == agenda_id,
        Event.start_datetime < end_dt,
        Event.end_datetime > start_dt,
    )
    if exclude_event_id is not None:
        query = query.where(Event.id != exclude_event_id)

    overlap = session.exec(query).first()
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Event overlaps with existing event '{overlap.title}' "
            f"({overlap.start_datetime} – {overlap.end_datetime})",
        )


def create_event(session: Session, data: EventCreate) -> Event:
    validate_foreign_keys(session, data.agenda_id, data.event_type_id)
    check_overlap(session, data.agenda_id, data.start_datetime, data.end_datetime)

    event = Event(**data.model_dump())
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def update_event(session: Session, event: Event, data: EventUpdate) -> Event:
    updates = data.model_dump(exclude_unset=True)

    agenda_id = updates.get("agenda_id", event.agenda_id)
    event_type_id = updates.get("event_type_id", event.event_type_id)
    validate_foreign_keys(session, agenda_id, event_type_id)

    start_dt = updates.get("start_datetime", event.start_datetime)
    end_dt = updates.get("end_datetime", event.end_datetime)
    check_overlap(session, agenda_id, start_dt, end_dt, exclude_event_id=event.id)

    for field, value in updates.items():
        setattr(event, field, value)
    event.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    session.add(event)
    session.commit()
    session.refresh(event)
    return event
