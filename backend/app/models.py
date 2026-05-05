from datetime import UTC, datetime

from sqlmodel import Field, Relationship, SQLModel


def now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Agenda(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(min_length=1)
    description: str | None = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

    events: list["Event"] = Relationship(
        back_populates="agenda",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class EventType(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(min_length=1)
    color: str | None = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

    events: list["Event"] = Relationship(back_populates="event_type")


class Event(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(min_length=1)
    description: str | None = None
    start_datetime: datetime
    end_datetime: datetime
    agenda_id: int = Field(foreign_key="agenda.id")
    event_type_id: int = Field(foreign_key="eventtype.id")
    status: str | None = None
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

    agenda: Agenda | None = Relationship(back_populates="events")
    event_type: EventType | None = Relationship(back_populates="events")
