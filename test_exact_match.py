import sys
import json
sys.path.append('/app/app')
from app.db.base import SessionLocal
from app.services.preprocessing_service import preprocess_apu_data
from app.api.v1.endpoints.cost360 import generate_ai_apu_route
from app.schemas.cost360 import AiApuGenerateRequest

db = SessionLocal()

# 1. Test Exact Match detection
desc_exacta = "S/C DE CONCRETO POBRE PARA ASIENTO Y/O NIVELACION DE FUNDACIONES"
print(f"Test Exact Match: '{desc_exacta}'")
payload = preprocess_apu_data(db, desc_exacta)
print("MODO DETECTADO:", payload['modo'])
if payload['modo'] == 'partida_exacta_encontrada':
    print("CODIGO EXACTO:", payload['partida_exacta_codigo'])

# 2. Test Router Short-circuit
request = AiApuGenerateRequest(
    description=desc_exacta,
    categoria=None,
    tipo_actividad=None
)
result = generate_ai_apu_route(request, db)
print("\nROUTER RESULT (Short-circuit):")
print(json.dumps(result, ensure_ascii=False, indent=2))
