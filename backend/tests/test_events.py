import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def base_data(client: TestClient):
    agenda = client.post("/agendas", json={"name": "Principal"}).json()
    et = client.post("/event-types", json={"name": "Reunión"}).json()
    return {"agenda_id": agenda["id"], "event_type_id": et["id"]}


def make_event(base, **kwargs):
    payload = {
        "title": "Evento Test",
        "start_datetime": "2026-06-01T10:00:00",
        "end_datetime": "2026-06-01T11:00:00",
        "agenda_id": base["agenda_id"],
        "event_type_id": base["event_type_id"],
    }
    payload.update(kwargs)
    return payload


def test_create_event(client: TestClient, base_data):
    response = client.post("/events", json=make_event(base_data))
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Evento Test"
    assert data["agenda"] is not None
    assert data["event_type"] is not None


def test_create_event_end_before_start_returns_422(client: TestClient, base_data):
    payload = make_event(
        base_data,
        start_datetime="2026-06-01T11:00:00",
        end_datetime="2026-06-01T10:00:00",
    )
    response = client.post("/events", json=payload)
    assert response.status_code == 422


def test_create_event_invalid_agenda_returns_404(client: TestClient, base_data):
    payload = make_event(base_data, agenda_id=9999)
    response = client.post("/events", json=payload)
    assert response.status_code == 404


def test_create_event_invalid_event_type_returns_404(client: TestClient, base_data):
    payload = make_event(base_data, event_type_id=9999)
    response = client.post("/events", json=payload)
    assert response.status_code == 404


def test_get_event_not_found(client: TestClient):
    response = client.get("/events/999")
    assert response.status_code == 404


def test_filter_by_agenda(client: TestClient, base_data):
    other_agenda = client.post("/agendas", json={"name": "Otra"}).json()
    client.post("/events", json=make_event(base_data, title="En principal"))
    client.post("/events", json=make_event(
        base_data,
        agenda_id=other_agenda["id"],
        title="En otra",
        start_datetime="2026-06-02T10:00:00",
        end_datetime="2026-06-02T11:00:00",
    ))
    response = client.get(f"/events?agenda_id={base_data['agenda_id']}")
    assert response.status_code == 200
    results = response.json()
    assert all(e["agenda_id"] == base_data["agenda_id"] for e in results)


def test_filter_by_month_year(client: TestClient, base_data):
    client.post("/events", json=make_event(
        base_data,
        title="Junio",
        start_datetime="2026-06-15T10:00:00",
        end_datetime="2026-06-15T11:00:00",
    ))
    client.post("/events", json=make_event(
        base_data,
        title="Julio",
        start_datetime="2026-07-15T10:00:00",
        end_datetime="2026-07-15T11:00:00",
    ))
    response = client.get("/events?month=6&year=2026")
    assert response.status_code == 200
    results = response.json()
    assert all("06" in e["start_datetime"] for e in results)


def test_overlap_returns_409(client: TestClient, base_data):
    client.post("/events", json=make_event(
        base_data,
        start_datetime="2026-06-01T10:00:00",
        end_datetime="2026-06-01T12:00:00",
    ))
    response = client.post("/events", json=make_event(
        base_data,
        start_datetime="2026-06-01T11:00:00",
        end_datetime="2026-06-01T13:00:00",
    ))
    assert response.status_code == 409


def test_delete_agenda_cascades_events(client: TestClient, base_data):
    event = client.post("/events", json=make_event(base_data)).json()
    client.delete(f"/agendas/{base_data['agenda_id']}")
    response = client.get(f"/events/{event['id']}")
    assert response.status_code == 404
