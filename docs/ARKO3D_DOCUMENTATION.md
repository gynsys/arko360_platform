# Documentación Oficial de ARKO3D Platform (v1.0)

Esta documentación está diseñada para ser un recurso **escalable**. A medida que ARKO3D se expande (fases 1.5, 2.0+), nuevas secciones, módulos y estrategias de cálculo serán añadidas a este manual.

## 1. Arquitectura General y Tech Stack
ARKO3D está construido como un **SaaS multi-tenant escalable**, dividiendo responsabilidades estrictas entre el cliente y el servidor:
- **Frontend (UI & 3D):** React 18 (Vite), React Three Fiber (R3F) para el WebGL, Zustand para la topología en tiempo real, y TanStack Query para sincronización de servidor.
- **Backend (API & Solver):** FastAPI (Python 3.11+) con Pydantic v2 y SQLModel. El backend maneja cargas asíncronas con Celery/Redis para evitar bloquear la API principal durante los cálculos intensivos de Elementos Finitos.
- **Data Layer:** PostgreSQL 15+ aprovechando campos JSONB para guardar topologías dinámicas sin atarse a esquemas rígidos, y RLS (Row-Level Security) para aislamiento de tenants.

## 2. Manual de Usuario: Interfaz y Flujo de Trabajo

### 2.1 Filosofía de Navegación "Dark-Mode First"
La plataforma prioriza la densidad de datos para ingenieros.
- **Toolbar Overlay:** En la esquina superior izquierda sobre el canvas 3D. Controla modos de selección (V), dibujado de nodos (N), vigas (B) y shells (W).
- **Panel de Propiedades (Right Sidebar):** Dividido en pestañas (Model, Loads, Results, AI).
- **AI Copilot (Bottom Panel):** Chat asistente (Groq/Gemini) que provee contexto, explica fallas y sugiere rediseños automáticamente basándose en la topología.

### 2.2 Flujo Operativo Estándar
1. **Modelado (Draw):** Herramientas de trazo en pantalla mediante raycasting a grillas 2D/3D.
2. **Asignación (Assign):** Las propiedades (Material, Sección, Apoyos) se aplican seleccionando los elementos y utilizando los modales o paneles laterales.
3. **Cargas (Loads):** Creación de Load Cases (DL, LL, WL) y Load Combinations (1.2DL + 1.6LL), seguidas de la aplicación gráfica sobre nodos o marcos.
4. **Análisis (Analyze):** Ejecución asíncrona del solver Python. La UI muestra progreso y bloquea mutaciones hasta recibir el JSONB de resultados.

## 3. Soporte Teórico de los Algoritmos de Cálculo (Escalable)

El motor de ARKO3D es modular, separando la formulación de Elementos Finitos de la Verificación de Códigos de Diseño (Design Codes).

### 3.1 Módulo A: Motor FEA Core (Frame + Shell)
Se basa en el **Método de la Rigidez Directa (Direct Stiffness Method)**.

- **Elemento Frame 3D (fem_frame.py):** Implementa la teoría de vigas de Euler-Bernoulli/Timoshenko en el espacio. Cada elemento aporta una matriz local de $12 \times 12$. Las propiedades gruesas ($A_g, I_g$) se utilizan en esta fase para preservar la linealidad elástica.
- **Transformación Espacial:** La matriz local se rota usando cosenos directores espaciales y un ángulo $\beta$ definido por el usuario para obtener la matriz global $[K_{glob}] = [T]^T [k_{loc}] [T]$.
- **Elementos de Área (Membrane/Shell):**
  - *Fase 1:* Muros de contención y corte se modelan con cuadriláteros isoparamétricos de 4 nodos (Q4) para esfuerzo/deformación plana (2 GDL/nodo).
  - *Fase 2 (Escalabilidad):* Incorporación de elementos de placa gruesa Mindlin-Reissner (DKT o MITC4) con 5/6 GDL/nodo para losas planas.
- **Ensamble y Solución (solvers.py):** La matriz global sparse es ensamblada usando formato `scipy.sparse.coo_matrix` y convertida a CSC para solución eficiente. Se aplica el Penalty Method ($10^{30}$ en la diagonal) para los apoyos, y el sistema $[K]\{U\} = \{F\}$ es resuelto por algoritmos directos (UMFPACK `spsolve`) o iterativos (CG con precondicionadores de Jacobi) según el tamaño del problema.

### 3.2 Módulo B: Validadores de Códigos de Diseño (Strategy Pattern)
Para garantizar la escalabilidad, ARKO3D aplica un **Patrón Strategy (Strategy Pattern)** para el diseño, desacoplado del solver FEA.

- El solver FEA arroja fuerzas elásticas (Momentos $M_u$, Cortantes $V_u$).
- La clase abstracta `DesignCodeStrategy` es implementada por archivos específicos:
  - `aci_318.py` (Fase 1): Cálculo de capacidad $\phi M_n$, cortante $\phi V_c + \phi V_s$, y verificaciones de estabilidad global. Aquí se aplican modificadores de inercia agrietada y criterios límite.
  - `aisc_360.py` (Fase 2): Diseño de acero para fluencia, pandeo local, pandeo flexotorsional (LTB).
- **Salida Escalable:** Una tabla de "Ratios de Utilización" de Demanda/Capacidad (Demanda / $\phi R_n$).

## 4. Expansión Futura y Documentación Viva
Cualquier desarrollador que integre una nueva teoría matemática, tipo de carga, o código constructivo deberá documentar sus asunciones fundamentales en este archivo, agregando subsecciones a los Módulos A y B.
