"""Tests for deepagents-web."""

import pytest
from fastapi.testclient import TestClient

from deepagents_web.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def test_health_endpoint(client):
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_redirects(client):
    """Test that root redirects to static index."""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307


def test_list_skills_endpoint(client):
    """Test the list skills endpoint."""
    response = client.get("/api/skills")
    assert response.status_code == 200
    data = response.json()
    assert "skills" in data
    assert isinstance(data["skills"], list)


def test_list_sessions_endpoint(client):
    """Test the list sessions endpoint."""
    response = client.get("/api/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "sessions" in data
    assert isinstance(data["sessions"], list)
