from fastapi.testclient import TestClient

from main import SURUM, app

istemci = TestClient(app)


def test_health_ok():
    yanit = istemci.get("/health")
    assert yanit.status_code == 200
    assert yanit.json() == {"durum": "ok", "surum": SURUM}
