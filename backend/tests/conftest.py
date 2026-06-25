from collections.abc import Iterator
import os

import pytest
from fastapi.testclient import TestClient


os.environ.setdefault("VITAKIOSK_LOAD_DOTENV", "false")


@pytest.fixture
def client() -> Iterator[TestClient]:
    from backend.app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def reset_mock_stores() -> Iterator[None]:
    from backend.app.dependencies import escalation_store, purchasing_store

    purchasing_store.clear()
    escalation_store.clear()
    yield
    purchasing_store.clear()
    escalation_store.clear()
