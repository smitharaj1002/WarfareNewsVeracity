# backend/test_app.py
import json
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# --------------------------
# ✅ /check endpoint tests
# --------------------------

def test_check_valid_text(client):
    response = client.post("/check", json={"text": "NASA successfully lands rover on Mars."})
    assert response.status_code == 200
    data = response.get_json()
    assert "verdict" in data
    assert "confidence" in data

def test_check_empty_text(client):
    response = client.post("/check", json={"text": ""})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

def test_check_invalid_format(client):
    response = client.post("/check", data="just a string")
    assert response.status_code == 400 or response.status_code == 415

# -------------------------------
# ✅ /fact-check endpoint tests
# -------------------------------

def test_fact_check_valid(client):
    response = client.post("/fact-check", json={"query": "Ukraine war"})
    assert response.status_code == 200
    data = response.get_json()
    assert "claims" in data
    assert isinstance(data["claims"], list)

def test_fact_check_empty(client):
    response = client.post("/fact-check", json={"query": ""})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

def test_fact_check_invalid_format(client):
    response = client.post("/fact-check", data="invalid format")
    assert response.status_code == 400 or response.status_code == 415
