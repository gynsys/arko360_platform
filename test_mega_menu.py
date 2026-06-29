import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from app.db.base import get_db
from app.db.models.arko import ArkoAdmin
from app.blog.models import BlogPost

def run():
    db = next(get_db())
    print("DB connection established")
    try:
        ArkoAdmin_slug = "arko360"
        admin_user = db.query(ArkoAdmin).filter(ArkoAdmin.slug_url == ArkoAdmin_slug).first()
        print("Admin user:", admin_user.id if admin_user else "Not found")
        
        menu_items = db.query(BlogPost).filter(
            BlogPost.admin_id == admin_user.id,
            BlogPost.is_published == True,
            BlogPost.is_in_menu == True
        ).order_by(BlogPost.menu_weight.desc()).all()
        print("Menu items count:", len(menu_items))
        
        from app.blog import schemas
        for item in menu_items:
            # Try parsing with Pydantic
            schemas.BlogPostResponse.model_validate(item)
        print("Pydantic validation passed!")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
