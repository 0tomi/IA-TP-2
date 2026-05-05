from fastapi.testclient import TestClient


def test_create_event_type(client: TestClient):
    response = client.post("/event-types", json={"name": "Reunión", "color": "#4A90D9"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Reunión"
    assert data["color"] == "#4A90D9"


def test_get_event_type_not_found(client: TestClient):
    response = client.get("/event-types/999")
    assert response.status_code == 404


def test_update_event_type(client: TestClient):
    created = client.post("/event-types", json={"name": "Tarea"}).json()
    response = client.patch(f"/event-types/{created['id']}", json={"color": "#FF0000"})
    assert response.status_code == 200
    assert response.json()["color"] == "#FF0000"


def test_delete_event_type_with_events_returns_409(client: TestClient):
    agenda = client.post("/agendas", json={"name": "Test"}).json()
    et = client.post("/event-types", json={"name": "Tipo"}).json()
    client.post("/events", json={
        "title": "Evento",
        "start_datetime": "2026-06-01T10:00:00",
        "end_datetime": "2026-06-01T11:00:00",
        "agenda_id": agenda["id"],
        "event_type_id": et["id"],
    })
    response = client.delete(f"/event-types/{et['id']}")
    assert response.status_code == 409


def test_delete_event_type(client: TestClient):
    created = client.post("/event-types", json={"name": "Borrable"}).json()
    response = client.delete(f"/event-types/{created['id']}")
    assert response.status_code == 204
