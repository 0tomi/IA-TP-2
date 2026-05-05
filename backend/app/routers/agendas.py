from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Agenda
from app.schemas import AgendaCreate, AgendaRead, AgendaUpdate

router = APIRouter(prefix="/agendas", tags=["agendas"])


@router.get("", response_model=list[AgendaRead])
def list_agendas(session: Session = Depends(get_session)):
    return session.exec(select(Agenda)).all()


@router.post("", response_model=AgendaRead, status_code=status.HTTP_201_CREATED)
def create_agenda(data: AgendaCreate, session: Session = Depends(get_session)):
    agenda = Agenda(**data.model_dump())
    session.add(agenda)
    session.commit()
    session.refresh(agenda)
    return agenda


@router.get("/{agenda_id}", response_model=AgendaRead)
def get_agenda(agenda_id: int, session: Session = Depends(get_session)):
    agenda = session.get(Agenda, agenda_id)
    if not agenda:
        raise HTTPException(status_code=404, detail="Agenda not found")
    return agenda


@router.patch("/{agenda_id}", response_model=AgendaRead)
def update_agenda(
    agenda_id: int, data: AgendaUpdate, session: Session = Depends(get_session)
):
    agenda = session.get(Agenda, agenda_id)
    if not agenda:
        raise HTTPException(status_code=404, detail="Agenda not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agenda, field, value)
    agenda.updated_at = datetime.now(UTC).replace(tzinfo=None)

    session.add(agenda)
    session.commit()
    session.refresh(agenda)
    return agenda


@router.delete("/{agenda_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agenda(agenda_id: int, session: Session = Depends(get_session)):
    agenda = session.get(Agenda, agenda_id)
    if not agenda:
        raise HTTPException(status_code=404, detail="Agenda not found")
    session.delete(agenda)
    session.commit()
