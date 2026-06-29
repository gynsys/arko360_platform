import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from app.db.base import get_db
from app.blog.models import BlogPost

def run():
    db = next(get_db())
    print("DB connection established")
    try:
        post_data = {
            "title": "Test Post",
            "slug": "test-post",
            "content": "Test content",
            "is_published": False,
            "seo_config": None,  # This is what Pydantic model_dump() includes
            "admin_id": 1
        }
        db_post = BlogPost(**post_data)
        db.add(db_post)
        db.commit()
        print("Success! Post created.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()

if __name__ == "__main__":
    run()
