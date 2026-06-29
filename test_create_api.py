import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import get_db
from app.api.v1.endpoints.arko import get_current_arko_admin

def mock_get_current_user():
    class MockUser:
        id = 1
        is_active = True
    return MockUser()

app.dependency_overrides[get_current_arko_admin] = mock_get_current_user

client = TestClient(app)

def run():
    print("Testing create post API...")
    payload = {
        "title": "Nuevo articulo de prueba 2026",
        "content": "<p>Hola</p>",
        "summary": "Resumen",
        "cover_image": "http://example.com/img.png",
        "is_published": True,
        "is_in_menu": True,
        "menu_weight": 0,
        "menu_icon": "",
        "seo_config": {
            "meta_title": "",
            "meta_description": "",
            "focus_keyword": "",
            "canonical_url": "",
            "schema_type": "Article",
            "robots_index": True,
            "robots_follow": True,
            "social_title": "",
            "social_description": "",
            "social_image": ""
        }
    }
    response = client.post("/api/v1/blog/", json=payload)
    print("Status code:", response.status_code)
    print("Response body:", response.json())

if __name__ == "__main__":
    run()
