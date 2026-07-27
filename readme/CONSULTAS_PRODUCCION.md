# Consultas a la Base de Datos en Producción

Esta bitácora documenta el procedimiento estándar y los comandos necesarios para consultar, inspeccionar y re-evaluar proyectos guardados en la base de datos de producción (contenedor Docker en el servidor remoto).

---

## 1. Requisitos
1. **Llave SSH**: Acceso al servidor remoto (`167.172.115.154`) como usuario `root` usando `C:/Users/pablo/.ssh/id_ed25519`.
2. **Script Envoltorio Local**: `ssh_runner.py` en la raíz del proyecto.

---

## 2. Metodología de Consulta

Las consultas a la base de datos siguen un proceso en **3 pasos simples**:

```powershell
# Paso A: Subir el script de Python al host remoto
python ssh_runner.py --upload readme/mi_consulta.py /var/www/arko360_platform/backend/mi_consulta.py

# Paso B: Copiar el script del host al contenedor de backend Docker
python ssh_runner.py "docker cp /var/www/arko360_platform/backend/mi_consulta.py arko360_platform-backend-1:/app/mi_consulta.py"

# Paso C: Ejecutar la consulta dentro del contenedor Docker
python ssh_runner.py "docker exec arko360_platform-backend-1 python /app/mi_consulta.py"
```

> **Nota sobre PowerShell (Windows):** Si deseas encadenar los comandos en una sola línea, utiliza `;` como separador en lugar de `&&`.

---

## 3. Plantillas de Consulta

### Plantilla A: Consultar un Proyecto Específico por Nombre

Usa `filter(LosaCalculationRun.nombre_proyecto.ilike("%NombreProyecto%"))` para buscar un proyecto en la tabla `LosaCalculationRun`:

```python
import sys
sys.path.append("/app")

import json
from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun

db = ArkoSessionLocal()
nombre_busqueda = "Valle Cielo"
runs = db.query(LosaCalculationRun).filter(
    LosaCalculationRun.nombre_proyecto.ilike(f"%{nombre_busqueda}%")
).order_by(LosaCalculationRun.id.desc()).all()

print(f"Total registros encontrados para '{nombre_busqueda}': {len(runs)}")

for r in runs:
    print(f"\n--- Run ID: {r.id} | Proyecto: '{r.nombre_proyecto}' | Fecha: {r.created_at} ---")
    
    results = getattr(r, 'resultados', None)
    if isinstance(results, str):
        results = json.loads(results)

    if isinstance(results, dict) and "bands" in results:
        bands = results.get("bands", [])
        print(f"Total muros/bandas: {len(bands)}")
        for idx, b in enumerate(bands):
            # Convertir kNm/m a kgf·m/m (factor 101.9716)
            mx = b.get('Mx_design_kNm_m', 0) * 101.9716
            my = b.get('My_design_kNm_m', 0) * 101.9716
            asx = b.get('Asx_cm2_m', 0)
            asy = b.get('Asy_cm2_m', 0)
            print(f"  Muro M{idx+1} ({b.get('type')}): Mx = {mx:.2f} kgf·m/m | My = {my:.2f} kgf·m/m | Asx = {asx:.2f} | Asy = {asy:.2f}")

db.close()
```

---

### Plantilla B: Re-evaluar Modelo Guardado con el Motor FEM (`analyze_slab`)

Si deseas ejecutar el solucionador de elementos finitos directamente sobre los inputs guardados en la BD usando la API backend:

```python
import sys
sys.path.append("/app")

import json
from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
from app.schemas.calculadora import SlabModelInput
from app.api.v1.endpoints.calculadora import analyze_slab

db = ArkoSessionLocal()
run = db.query(LosaCalculationRun).filter(
    LosaCalculationRun.nombre_proyecto.ilike("%Valle Cielo%")
).order_by(LosaCalculationRun.id.desc()).first()

if run and run.inputs:
    payload = run.inputs
    if isinstance(payload, str):
        payload = json.loads(payload)

    # Validar Pydantic schema y ejecutar analizador
    input_model = SlabModelInput.model_validate(payload)
    results = analyze_slab(input_model)

    print(f"Resultados FEM para Run ID {run.id}:")
    for idx, b in enumerate(results.get('bands', [])):
        mx = b.get('Mx_design_kNm_m', 0) * 101.9716
        my = b.get('My_design_kNm_m', 0) * 101.9716
        print(f"  Muro M{idx+1}: Mx = {mx:.2f} kgf·m/m | My = {my:.2f} kgf·m/m")

db.close()
```

---

## 4. Historial de Ajustes Relevantes
- **Serialización de Machones (Carga Puntual)**: Las corridas antiguas almacenaban un valor por defecto de 1000 kgf en el JSON de inputs. El backend actual re-calcula las cargas puntuales dinámicamente según el volumen del machón ($V = \text{ancho} \times \text{largo} \times \text{alto} \times 2500\text{ kg/m}^3$).
- **Conversión de Unidades de Momentos**: En la BD se guardan en $kN\cdot m/m$. Para visualizar en $kgf\cdot m/m$, multiplicar por `101.9716`.
