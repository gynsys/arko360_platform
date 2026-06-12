# Sistema de Auditoría Escalonada de ARKO3D

Al ser ARKO3D una plataforma en pleno desarrollo ("Living Project"), su sistema de cálculo está sujeto a constantes adiciones (nuevos elementos finitos, nuevas normativas de diseño, análisis dinámicos). Por esta razón, la auditoría no es simplemente un reporte estático, sino una **arquitectura escalable** de trazabilidad de cálculos.

## 1. Filosofía de la Auditoría Transparente
ARKO3D adopta la política de "Caja de Cristal" (Glass Box). El usuario (o un revisor par) debe poder inspeccionar cada paso matemático que toma el algoritmo para llegar a los resultados. Esto genera confianza en la herramienta y facilita la detección de anomalías durante el desarrollo continuo.

## 2. Arquitectura de Exportación (JSON Audit Blob)
Actualmente, el motor en Python (`backend/app/engine/solvers.py`) exporta un archivo `auditoria_arko3d_[timestamp].json`. Este esquema JSON está diseñado para crecer:

### Nivel 1: Datos Topológicos y Dimensionales
- `nodes_count`, `elements_count`, `shells_count`: Verificación rápida de la integridad geométrica importada al solver.
- `ndof` (Número de Grados de Libertad): Crucial para auditar el tamaño del problema matemático ($N \times N$).

### Nivel 2: Matrices del Solver (Escalabilidad Futura)
En fases futuras, cuando el usuario active el "Deep Audit Mode", el JSON incluirá o anexará:
- **`K_global` (Sparse Matrix Dump):** Salida en formato COO o CSV anexo de la matriz global ensamblada para ser importada en MATLAB, Python o Excel para revisión matemática independiente.
- **`Load_Vectors`:** El vector $F$ detallado por cada caso de carga antes de la combinación.
- **`Penalty_Nodes`:** Lista explícita de índices alterados por el Penalty Method ($1e30$) para imponer condiciones de apoyo.

### Nivel 3: Auditoría Normativa (Strategy Pattern Logs)
Conforme se implementen los módulos de diseño (ej. ACI 318-19 en `design_codes/aci_318.py`), la auditoría incluirá sub-bloques por elemento. Por ejemplo:
```json
"design_audit": {
  "element_102": {
    "code": "ACI 318-19",
    "governing_section": "Sec 22.5.1.1",
    "equation_used": "φVc = φ * 2 * λ * sqrt(f'c) * bw * d",
    "variables": {
      "f'c": 28,
      "bw": 300,
      "d": 450,
      "φ": 0.75
    },
    "result": 125.4,
    "demand": 130.2,
    "utilization": 1.03
  }
}
```
Esto permitirá que tanto la **IA Copilot** como el ingeniero humano entiendan de dónde salió cada número.

## 3. Próximos Pasos en el Desarrollo de la Auditoría
1. **Endpoint REST para Auditoría:** Exponer una ruta `/api/v1/projects/{id}/audit_log` para que el frontend descargue la bitácora directamente desde la UI sin entrar al servidor.
2. **Integración con AI Copilot:** El módulo de Groq/Gemini ingerirá la sección `design_audit` para responder preguntas del usuario como: *"¿Por qué falla la viga 102 en cortante?"*.
3. **Control de Versiones del Solver:** El archivo de auditoría deberá registrar el hash o versión del motor de cálculo (`solver_version: "v1.2.0-beta"`) para replicar cálculos pasados.
