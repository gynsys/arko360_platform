import sys
import os
import json

# Ajustar path para que Python encuentre 'app' si se ejecuta dentro del contenedor en /app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.services.preprocessing_service import preprocess_apu_data

def test_preprocessing():
    db = SessionLocal()
    description = "concreto pobre fc=100"
    
    try:
        print(f"Probando preprocesamiento para: '{description}'")
        payload = preprocess_apu_data(
            db=db,
            description=description,
            categoria=None,
            tipo_actividad=None
        )
        
        # Imprimir el resultado formateado
        print("\n--- RESULTADO DEL PREPROCESAMIENTO ---")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error durante la prueba: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_preprocessing()
