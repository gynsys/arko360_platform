import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.services.preprocessing_service import preprocess_apu_data

def get_payload():
    db = SessionLocal()
    payload = preprocess_apu_data(db=db, description="concreto pobre fc=100")
    
    with open('/tmp/payload.json', 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    db.close()

if __name__ == "__main__":
    get_payload()
