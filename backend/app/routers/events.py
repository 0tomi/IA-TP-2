from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Event
from app.schemas import EventCreate, EventRead, EventUpdate
from app.services import events_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    agenda_id: int | None = Query(None),
    event_type_id: int | None = Query(None),
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000),
    from_dt: datetime | None = Query(None),
    to_dt: datetime | None = Query(None),
    status: str | None = Query(None),
    session: Session = Depends(get_session),
):
    query = select(Event)

    if agenda_id is not None:
        query = query.where(Event.agenda_id == agenda_id)
    if event_type_id is not None:
        query = query.where(Event.event_type_id == event_type_id)
    if status is not None:
        query = query.where(Event.status == status)

    if month is not None and year is not None:
        from calendar import monthrange
        _, last_day = monthrange(year, month)
        range_start = datetime(year, month, 1)
        range_end = datetime(year, month, last_day, 23, 59, 59)
        query = query.where(Event.start_datetime >= range_start, Event.start_datetime <= range_end)
    elif from_dt is not None or to_dt is not None:
        if from_dt:
            query = query.where(Event.start_datetime >= from_dt)
        if to_dt:
            query = query.where(Event.end_datetime <= to_dt)

    events = session.exec(query).all()
    return events


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(data: EventCreate, session: Session = Depends(get_session)):
    return events_service.create_event(session, data)


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int, data: EventUpdate, session: Session = Depends(get_session)
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return events_service.update_event(session, event, data)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(event)
    session.commit()
