import sys, os
sys.path.append('/app')
from app.db.arko_base import ArkoSessionLocal
from app.db.models.arko import ArkoAdmin
with ArkoSessionLocal() as db:
    admins = db.query(ArkoAdmin).all()
    if not admins:
        print("No admins found.")
    for a in admins:
        print(f"Admin: {a.email}")
