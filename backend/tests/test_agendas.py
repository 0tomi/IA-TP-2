from fastapi.testclient import TestClient


def test_create_agenda(client: TestClient):
    response = client.post("/agendas", json={"name": "Trabajo"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Trabajo"
    assert data["id"] is not None


def test_get_agenda(client: TestClient):
    created = client.post("/agendas", json={"name": "Personal"}).json()
    response = client.get(f"/agendas/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Personal"


def test_get_agenda_not_found(client: TestClient):
    response = client.get("/agendas/999")
    assert response.status_code == 404


def test_list_agendas(client: TestClient):
    client.post("/agendas", json={"name": "A"})
    client.post("/agendas", json={"name": "B"})
    response = client.get("/agendas")
    assert response.status_code == 200
    assert len(response.json()) >= 2


def test_update_agenda(client: TestClient):
    created = client.post("/agendas", json={"name": "Vieja"}).json()
    response = client.patch(f"/agendas/{created['id']}", json={"name": "Nueva"})
    assert response.status_code == 200
    assert response.json()["name"] == "Nueva"


def test_delete_agenda(client: TestClient):
    created = client.post("/agendas", json={"name": "Temporal"}).json()
    response = client.delete(f"/agendas/{created['id']}")
    assert response.status_code == 204
    assert client.get(f"/agendas/{created['id']}").status_code == 404
