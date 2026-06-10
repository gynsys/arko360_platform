import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.arko_base import arko_engine, ArkoBase
from app.db.models.arko import ArkoUser, ArkoProject3D

def run():
    print("Creating tables if they don't exist...")
    ArkoBase.metadata.create_all(bind=arko_engine)
    
    with arko_engine.connect() as conn:
        print("Checking if user_id exists in arko_projects_3d...")
        try:
            conn.execute(text("ALTER TABLE arko_projects_3d ADD COLUMN user_id INTEGER REFERENCES arko_users(id);"))
            conn.commit()
            print("Added user_id column.")
        except Exception as e:
            print(f"Error (maybe column already exists): {e}")

if __name__ == "__main__":
    run()
