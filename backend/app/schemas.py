from datetime import datetime

from pydantic import model_validator
from sqlmodel import SQLModel

# ── Agenda ────────────────────────────────────────────────────────────────────

class AgendaCreate(SQLModel):
    name: str
    description: str | None = None


class AgendaUpdate(SQLModel):
    name: str | None = None
    description: str | None = None


class AgendaRead(SQLModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


# ── EventType ─────────────────────────────────────────────────────────────────

class EventTypeCreate(SQLModel):
    name: str
    color: str | None = None


class EventTypeUpdate(SQLModel):
    name: str | None = None
    color: str | None = None


class EventTypeRead(SQLModel):
    id: int
    name: str
    color: str | None
    created_at: datetime
    updated_at: datetime


# ── Event ─────────────────────────────────────────────────────────────────────

class EventCreate(SQLModel):
    title: str
    description: str | None = None
    start_datetime: datetime
    end_datetime: datetime
    agenda_id: int
    event_type_id: int
    status: str | None = None

    @model_validator(mode="after")
    def end_after_start(self) -> "EventCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self


class EventUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    agenda_id: int | None = None
    event_type_id: int | None = None
    status: str | None = None

    @model_validator(mode="after")
    def end_after_start(self) -> "EventUpdate":
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                raise ValueError("end_datetime must be after start_datetime")
        return self


class EventRead(SQLModel):
    id: int
    title: str
    description: str | None
    start_datetime: datetime
    end_datetime: datetime
    agenda_id: int
    event_type_id: int
    status: str | None
    created_at: datetime
    updated_at: datetime
    agenda: AgendaRead | None = None
    event_type: EventTypeRead | None = None
