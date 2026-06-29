import sys
import os
import traceback
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from app.blog.schemas import BlogPostCreate
from pydantic import ValidationError

def test_validation():
    payload = {
        "title": "Nuevo articulo de prueba",
        "content": "<p>Hola</p>",
        "summary": "",
        "cover_image": "",
        "is_published": False,
        "is_in_menu": False,
        "menu_weight": "0", # React sends string for number input
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
    
    try:
        obj = BlogPostCreate(**payload)
        print("Validation SUCCESS!")
        print(obj.model_dump())
    except ValidationError as e:
        print("Validation FAILED!")
        print(e.json())
    except Exception as e:
        print("Error:")
        traceback.print_exc()

if __name__ == "__main__":
    test_validation()
