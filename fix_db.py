
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS material_inflation FLOAT DEFAULT 0.0;"))
    conn.execute(text("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS labor_inflation FLOAT DEFAULT 0.0;"))
    conn.execute(text("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS equipment_inflation FLOAT DEFAULT 0.0;"))
    conn.commit()
    print("Added inflation columns successfully.")
