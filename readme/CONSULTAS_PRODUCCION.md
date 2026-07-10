# Consultas a la Base de Datos en Producción

Esta bitácora documenta el proceso y los comandos necesarios para realizar consultas en vivo a la base de datos de producción (contenedor de Docker en el servidor remoto).

## Requisitos
1. Acceso por SSH al servidor (IP `167.172.115.154`) a través del usuario `root` usando la llave local `id_ed25519`.
2. El script envoltorio local `ssh_runner.py` que se encuentra en la raíz del proyecto, el cual facilita la ejecución de comandos.

## Proceso de Ejecución
Para realizar una consulta, seguimos una metodología en dos pasos: primero copiamos un script local de Python hacia el contenedor de Docker que ejecuta el backend, y luego lo ejecutamos de forma remota.

### 1. El Script de Consulta (`query_db.py`)
Puedes utilizar el script adjunto o crear uno nuevo. Un ejemplo estándar para consultar la tabla de cálculos de losa (`LosaCalculationRun`):

```python
import sys
sys.path.append("/app")

from app.db.arko_base import ArkoSessionLocal
from app.db.models.calculadora import LosaCalculationRun
import json

db = ArkoSessionLocal()
# Buscar todos los proyectos que coincidan con "flaco3"
runs = db.query(LosaCalculationRun).filter(LosaCalculationRun.nombre_proyecto.ilike("%flaco3%")).all()

for p in runs:
    print(f"Run ID: {p.id}, Title: {p.nombre_proyecto}")
    if p.inputs:
        data = p.inputs
        if isinstance(data, str):
            data = json.loads(data)
        
        # Extraer parámetros relevantes (ej: columnas)
        columns = data.get("columns", [])
        if columns:
            print("Machones encontrados:")
            for c in columns:
                print(c)
        else:
            print("No se encontraron machones.")
db.close()
```

### 2. Comandos de Despliegue
Desde una terminal local en la raíz del repositorio, ejecuta los siguientes comandos usando `ssh_runner.py`:

**Paso A:** Sube el script al host remoto:
```bash
python ssh_runner.py --upload readme/query_db.py /var/www/arko360_platform/backend/query_db.py
```

**Paso B:** Copia el script del host hacia el contenedor Docker (`arko360_platform-backend-1`):
```bash
python ssh_runner.py "docker cp /var/www/arko360_platform/backend/query_db.py arko360_platform-backend-1:/app/query_db.py"
```

**Paso C:** Ejecuta el script dentro del contenedor:
```bash
python ssh_runner.py "docker exec arko360_platform-backend-1 python /app/query_db.py"
```

## Solución al problema de Carga de Machones (1000 kgf)
Se detectó que en proyectos guardados antiguamente (como "losa flaco3"), el valor de la carga puntual del machón (`load_kgf`) quedó serializado estáticamente en la base de datos con el valor inicial de `1000 kgf`. 
Al modificar la función de construcción del payload (revirtiendo el "Bug 4" de la auditoría externa), se **fuerza matemáticamente** el recálculo sobre la marcha usando la densidad del concreto:
`load_kgf = ancho * largo * alto * 2500`

De esta manera, el valor de 1000 kgf almacenado queda obsoleto y el servidor calculará la memoria de cálculo en base al volumen geométrico interactivo (ej: 0.15 * 0.15 * 2.7 * 2500 = 151.875 kgf), manteniéndose fiel a la física y a los cambios del usuario.
