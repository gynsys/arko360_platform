import sys
from app.db.arko_base import ArkoSessionLocal
from app.db.models.material import MaterialPrice

def seed():
    db = ArkoSessionLocal()
    materials = [
        {"nombre": "Bloque de Arcilla (15cm)", "unidad": "und", "precio_usd": 0.65},
        {"nombre": "Bloque de Arcilla (12cm)", "unidad": "und", "precio_usd": 0.64},
        {"nombre": "Cemento Portland (Saco 42.5kg)", "unidad": "saco", "precio_usd": 13.46},
        {"nombre": "Arena Lavada", "unidad": "m3", "precio_usd": 45.24},
        {"nombre": "Piedra Picada", "unidad": "m3", "precio_usd": 51.04},
        {"nombre": "Cabilla 5.2mm", "unidad": "und", "precio_usd": 1.58},
        {"nombre": "Cabilla 8mm", "unidad": "und", "precio_usd": 5.90},
        {"nombre": "Cabilla 10mm", "unidad": "und", "precio_usd": 5.82},
        {"nombre": "Polvillo", "unidad": "saco", "precio_usd": 53.36},
        {"nombre": "Pego", "unidad": "saco", "precio_usd": 3.89},
        {"nombre": "Lija", "unidad": "hoja", "precio_usd": 1.50},
        {"nombre": "Pasta Profesional (Cuñete)", "unidad": "cuñete", "precio_usd": 17.48},
        {"nombre": "Pintura Caucho (Galón)", "unidad": "galón", "precio_usd": 11.00},
        
        {"nombre": "Lámina Cielo Raso (0.61 x 1.22m)", "unidad": "und", "precio_usd": 7.21},
        {"nombre": "Perfil Principal 3.66m", "unidad": "und", "precio_usd": 9.05},
        {"nombre": "Perfil Secundario 1.22m", "unidad": "und", "precio_usd": 3.08},
        {"nombre": "Perfil Secundario 0.61m", "unidad": "und", "precio_usd": 1.54},
        {"nombre": "Ángulo Perimetral 3.05m", "unidad": "und", "precio_usd": 5.88},
        {"nombre": "Alambre Galvanizado", "unidad": "kg", "precio_usd": 6.00},
        {"nombre": "Clavos para Concreto (Bolsa 100und)", "unidad": "bolsa", "precio_usd": 5.20},
        {"nombre": "Fulminantes (Caja 100und)", "unidad": "caja", "precio_usd": 17.00},
    ]
    
    for m in materials:
        existing = db.query(MaterialPrice).filter(MaterialPrice.nombre == m["nombre"]).first()
        if not existing:
            new_mat = MaterialPrice(nombre=m["nombre"], unidad=m["unidad"], precio_usd=m["precio_usd"])
            db.add(new_mat)
    
    db.commit()
    print("Materials seeded successfully.")

if __name__ == "__main__":
    seed()
