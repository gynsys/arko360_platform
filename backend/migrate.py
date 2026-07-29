import os
import sys

# Add backend dir to pythonpath
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.base import engine

def run():
    print("Running migration...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE budgets ADD COLUMN admin_percent FLOAT DEFAULT 15.0"))
            print("Added admin_percent")
        except Exception as e:
            print("admin_percent error:", e)
            
        try:
            conn.execute(text("ALTER TABLE budgets ADD COLUMN profit_percent FLOAT DEFAULT 10.0"))
            print("Added profit_percent")
        except Exception as e:
            print("profit_percent error:", e)
            
        conn.commit()

if __name__ == "__main__":
    run()
