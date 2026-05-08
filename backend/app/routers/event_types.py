from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Event, EventType
from app.schemas import EventTypeCreate, EventTypeRead, EventTypeUpdate

router = APIRouter(prefix="/event-types", tags=["event-types"])


@router.get("", response_model=list[EventTypeRead])
def list_event_types(session: Session = Depends(get_session)):
    return session.exec(select(EventType)).all()


@router.post("", response_model=EventTypeRead, status_code=status.HTTP_201_CREATED)
def create_event_type(data: EventTypeCreate, session: Session = Depends(get_session)):
    event_type = EventType(**data.model_dump())
    session.add(event_type)
    session.commit()
    session.refresh(event_type)
    return event_type


@router.get("/{event_type_id}", response_model=EventTypeRead)
def get_event_type(event_type_id: int, session: Session = Depends(get_session)):
    event_type = session.get(EventType, event_type_id)
    if not event_type:
        raise HTTPException(status_code=404, detail="EventType not found")
    return event_type


@router.patch("/{event_type_id}", response_model=EventTypeRead)
def update_event_type(
    event_type_id: int, data: EventTypeUpdate, session: Session = Depends(get_session)
):
    event_type = session.get(EventType, event_type_id)
    if not event_type:
        raise HTTPException(status_code=404, detail="EventType not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event_type, field, value)
    event_type.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    session.add(event_type)
    session.commit()
    session.refresh(event_type)
    return event_type


@router.delete("/{event_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_type(event_type_id: int, session: Session = Depends(get_session)):
    event_type = session.get(EventType, event_type_id)
    if not event_type:
        raise HTTPException(status_code=404, detail="EventType not found")

    has_events = session.exec(
        select(Event).where(Event.event_type_id == event_type_id).limit(1)
    ).first()
    if has_events:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="EventType has associated events and cannot be deleted",
        )

    session.delete(event_type)
    session.commit()
