import sys
sys.path.append('/app/app')
from app.db.base import SessionLocal
from app.services.preprocessing_service import preprocess_apu_data

db = SessionLocal()
payload = preprocess_apu_data(db, 'concreto pobre fc=100')
print("Partidas encontradas en top 10:")
for p in payload['detalle_partidas']:
    print(p['codigo'], p['descripcion'])
