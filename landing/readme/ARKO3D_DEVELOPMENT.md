# ARKO3D — Motor de Análisis Estructural 🏗️

> Módulo de Análisis de Elementos Finitos (FEM) integrado en la plataforma Arko 360.
> Ruta en producción: **`arko360.net/arko3d`**

---

## 📋 1. Prompt Maestro de ARKO3D

El siguiente prompt es el contexto raíz que define el alcance, la arquitectura y las restricciones técnicas del módulo. Úsalo siempre al iniciar una nueva sesión de desarrollo sobre este módulo.

```
CONTEXTO: Estamos desarrollando el módulo ARKO3D dentro de la plataforma arko360.net.
ARKO3D es un motor de análisis estructural por Elementos Finitos (FEM) embebido
directamente en el navegador, similar a SAP2000/ETABS pero en versión web SaaS.

STACK TÉCNICO CONFIRMADO:
- Frontend: React 18 + Vite, Vanilla CSS (NO Tailwind)
- Visualización 3D: @react-three/fiber + @react-three/drei + three.js
- Estado Global: Zustand (useStructureStore.js)
- Backend Solver: FastAPI (Python) con numpy + scipy
- Comunicación: @tanstack/react-query + axios
- Ruta de la app: /arko3d (en la landing page de arko360.net)
- Despliegue: DigitalOcean via docker-compose + deploy.bat
- Base de datos: PostgreSQL (tablas arko_* independientes)
- Inicialización de BD: init_db.py con create_all() (NO Alembic)

CARPETA DEL MÓDULO: landing/src/components/tools/fea3d/

ARCHIVOS EXISTENTES:
1. FEA3DContainer.jsx   — Layout principal (3 columnas: wizard | canvas | propiedades)
2. StructureCanvas.jsx  — Visor 3D con React Three Fiber
3. TemplateWizard.jsx   — Modal inicial para generar la geometría base
4. PropertyPanel.jsx    — Panel derecho de propiedades del elemento seleccionado
5. useStructureStore.js — Store Zustand con estado global (nudos, elementos, materiales)
6. useSolver.js         — Hook para comunicación con el backend FastAPI
7. utils.js             — Helpers de geometría y conversión de unidades

REGLAS DE ORO DEL MÓDULO:
1. La geometría se define en metros (m). El solver recibe metros directamente.
2. Los nudos tienen coordenadas (x, y, z) donde Z es la altura (vertical).
3. Los elementos son "frames" con nodo inicial y nodo final.
4. Los apoyos se definen como arreglos de 6 DOFs booleanos [Fx, Fy, Fz, Mx, My, Mz].
5. El canvas usa OrbitControls; la cámara usa up=[0,0,1] (Z-up).
6. NUNCA usar <float32Array> como JSX en R3F. Usar THREE.BufferAttribute imperativo.
7. La retícula del canvas está en el plano XY (rotación PI/2 en X).
8. Los colores de elementos: gris=#94a3b8 (normal), amarillo=#facc15 (seleccionado).
9. Los nodos: azul=#60a5fa (libre), rojo=#ef4444 (con apoyo), amarillo=#facc15 (seleccionado).
```

---

## 🗂️ 2. Mapa de Archivos del Módulo

```
landing/src/components/tools/fea3d/
├── FEA3DContainer.jsx      ← Layout: 3 columnas (Wizard | Canvas 3D | Panel)
├── StructureCanvas.jsx     ← Visor 3D (R3F): nudos como esferas, elementos como líneas
├── TemplateWizard.jsx      ← Modal inicial de configuración de plantilla
├── PropertyPanel.jsx       ← Panel derecho: editar nudo/elemento seleccionado
├── ResultsTableModal.jsx   ← Tablas de resultados formato ETABS
├── SelectElementsModal.jsx ← Selección masiva de elementos (tipo/sección/material)
├── AssignSectionModal.jsx  ← Asignación de propiedades a selección
├── useStructureStore.js    ← Zustand store: nodes, elements, materials, sections, loads
├── useSolver.js            ← Hook de comunicación con API FastAPI
└── utils.js                ← Helpers: geometría, unidades

backend/app/
├── engine/
│   ├── solvers.py          ← StructuralSolver: ensamble K, F y resolución
│   ├── fem_frame.py        ← Matrices de rigidez de elemento 3D
│   └── design_engine.py    ← Verificaciones normativas (en desarrollo)
├── api/v1/endpoints/
│   └── solver.py           ← Endpoint POST /api/v1/arko3d/{project_id}/solve
└── schemas/
    └── fea3d.py            ← Pydantic schemas: Topology, Node, Element, Load
```

---

## ✅ 3. Estado Actual del Desarrollo

### Completado ✅

| Componente | Descripción | Estado |
|---|---|---|
| `TemplateWizard.jsx` | Modal de generación. **¡NUEVO!** Pide Material Predominante (Concreto/Acero) y secciones de Viga/Columna obligatorias. | ✅ |
| `useStructureStore.js` | Store Zustand con: `generateStructure()`, `addShell()`, `deleteShell()`, `updateShell()`, `exportProject()`, `importProject()`, `addLoad()`, `updateNode()`, `deleteNode()`, `updateElement()`, `deleteElement()`, modo dibujo (`isDrawingShell`, `drawingNodes`, `addNodeToDrawing`). | ✅ |
| `StructureCanvas.jsx` | Visor 3D con R3F. Nudos como esferas de colores, elementos como líneas. Shells visualizados con `BufferGeometry` triangulada (2 triángulos por quad). Fix del error `Float32Array`. Modo dibujo de losas integrado. Deselección rápida al hacer clic en el fondo (`onPointerMissed`). | ✅ |
| `PropertyPanel.jsx` | Panel derecho. Maneja selección múltiple. Al clic en nudo: edita X,Y,Z y asigna cargas. Al clic en elemento: muestra info. Al clic en shell: edita espesor y cargas. Botón **Eliminar** para nudos, elementos o shells. | ✅ |
| `FEA3DContainer.jsx` | Layout base. Toolbar con Abrir/Guardar, SELECT, ASSIGN, botones de definición y tablas. | ✅ |
| `Select & Assign` | `SelectElementsModal.jsx` y `AssignSectionModal.jsx` implementados para selección masiva y asignación rápida de secciones estilo ETABS. | ✅ |
| `ResultsTableModal.jsx` | Tablas estilo ETABS. Muestra Story, Element, Output Case y fuerzas ordenadas: P, V2, V3, T, M2, M3. | ✅ |
| `ShellPanel.jsx` | Modal de formulario para definir losa maciza: selectores de 4 nudos, espesor, material, cargas CM/CV. Muestra área estimada y carga factorizada en tiempo real. | ✅ |
| Limpieza Inteligente | Al eliminar elementos o losas, si algún nudo asociado queda huérfano (sin conexión a ninguna entidad), se elimina automáticamente de la estructura (`cleanupOrphans`). | ✅ |
| Guardar / Abrir | Export `.arko3d` (JSON) vía `exportProject()` en el store y `FileReader` para importar. Botones en toolbar. | ✅ |
| Backend `solvers.py` | Motor FEM completo: ensamble de la matriz de rigidez global K, vector de fuerzas F, resolución sparse. | ✅ |
| Backend `fem_frame.py` | Matrices locales de elemento frame 3D con 12 DOF. | ✅ |
| Backend `solver.py` | Endpoint FastAPI para recibir topología y devolver desplazamientos. | ✅ |
| Fix `Float32Array` | Corrección del error R3F usando `THREE.BufferAttribute` en `useMemo`. | ✅ |

### En Desarrollo 🔨

| Feature | Descripción | Prioridad |
|---|---|---|
| `DataEntryPanel.jsx` | Panel CRUD izquierdo estilo ETABS: tablas de edición de nudos y cargas. | 🔴 Alta |
| Botón "Ejecutar Análisis" | Conectar el solver Python desde el frontend vía `useSolver.js`. | 🔴 Alta |
| Visualización de resultados | Diagrama de deformada, diagramas M, V, N sobre los elementos. | 🟡 Media |
| Persistencia de proyectos | Guardar/cargar modelos en PostgreSQL (tabla `arko_projects_3d`). | 🟡 Media |

### Pendiente 📋

- [ ] Verificaciones normativas (ACI 318, AISC 360) en `design_engine.py`
- [ ] Exportar resultados a PDF
- [ ] Asignación de cargas distribuidas desde el panel
- [ ] Selector de norma (ACI, AISC, NSR-10)
- [ ] Autenticación: guardar proyectos por usuario

---

## 🚀 4. Cómo Desplegar Cambios al Servidor

```powershell
# Desde C:\Users\pablo\Documents\arko360_platform
.\deploy.bat
# Ingresa el mensaje del commit cuando lo pida
# El script hace: git add . → git commit → git push → SSH al servidor → docker compose up --build → python init_db.py
```

> ⚠️ Para que el backend incluya las nuevas dependencias (numpy, scipy),
> asegúrate de que estén en `backend/requirements.txt` antes de hacer deploy.

---

## 🔑 5. Prompt de Implementación: Wizard Editable (SIGUIENTE TAREA)

Ver sección 6 abajo con el prompt preciso para esta feature.

---

## 📐 6. PROMPT DE IMPLEMENTACIÓN — Wizard Editable

> Copia este prompt completo al inicio de la siguiente sesión de trabajo sobre ARKO3D.

```
TAREA: Implementar el "Wizard Editable" en el módulo ARKO3D de arko360.net.

CONTEXTO:
Actualmente el TemplateWizard.jsx se muestra como un modal al cargar la página y,
al hacer clic en "Generar Modelo", cierra el modal (setShowModal(false)) y ya no se
puede volver a abrir. El usuario necesita poder regresar al wizard en cualquier momento
para modificar la geometría del edificio sin perder los datos que ya ingresó.

OBJETIVO:
Agregar un botón "Editar Modelo" visible en la interfaz principal que abra el wizard
nuevamente. Al reabrirlo, debe mostrar la configuración actual del modelo (numFloors,
numBaysX, etc.) para que el usuario solo cambie lo que necesita. Al confirmar,
regenera la estructura SIN resetear secciones, materiales o cargas asignadas
(solo actualiza nudos y elementos).

ARCHIVOS A MODIFICAR:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHIVO 1: useStructureStore.js
RUTA: landing/src/components/tools/fea3d/useStructureStore.js
CAMBIOS:
1. Agregar nuevo campo en el store: `wizardConfig` con los últimos parámetros usados.
   Estado inicial: null (significa que no se ha generado ningún modelo aún).
2. Modificar la función `generateStructure(config)` para que también guarde:
   `set({ ..., wizardConfig: config })`
   Esto permite que el wizard muestre los valores actuales al reabrirse.

RESULTADO: El store queda con un campo nuevo:
   wizardConfig: null | { type, numFloors, numBaysX, numBaysY, floorHeight, bayWidthX, bayWidthY }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHIVO 2: TemplateWizard.jsx
RUTA: landing/src/components/tools/fea3d/TemplateWizard.jsx
CAMBIOS:
1. El componente ya NO controla su visibilidad con estado interno `showModal`.
   En su lugar, recibir dos props:
   - `isOpen: boolean` — controla si el modal se muestra
   - `onClose: () => void` — función para cerrar el modal desde el padre
2. Al montar (useEffect con [isOpen]), si `isOpen === true` y `wizardConfig` en el store
   no es null, inicializar el estado local `config` con los valores de `wizardConfig`.
   Esto prerrellena el formulario con la configuración actual.
3. El botón "GENERAR MODELO" llama a `generateStructure(config)` y luego `onClose()`.
4. Agregar un botón "✕ Cancelar" en la esquina superior derecha del modal que llama a
   `onClose()` sin regenerar. Solo visible si ya existe un modelo (wizardConfig !== null).

IMPORTANTE: Si wizardConfig es null (primer uso), NO mostrar botón Cancelar
(el usuario DEBE generar un modelo para continuar).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHIVO 3: FEA3DContainer.jsx
RUTA: landing/src/components/tools/fea3d/FEA3DContainer.jsx
CAMBIOS:
1. Agregar estado local: `const [wizardOpen, setWizardOpen] = useState(true)` 
   (true = mostrar en el primer render).
2. Pasar props al TemplateWizard:
   - `isOpen={wizardOpen}`
   - `onClose={() => setWizardOpen(false)}`
3. Agregar una barra de herramientas superior (toolbar) con:
   - Botón "Editar Modelo" (ícono: Settings o Sliders de lucide-react)
     → Al hacer clic: `setWizardOpen(true)`
   - Texto con el resumen del modelo actual (ej: "2 Pisos · 2x2 Vanos")
     → Leer de `wizardConfig` del store.
   - Botón "Ejecutar Análisis" (ícono: Play o Zap de lucide-react) — solo visible si
     hay elementos en el store. Por ahora puede ser un placeholder con `console.log`.
4. La toolbar debe tener estilo: fondo `bg-slate-800`, altura fija ~48px, bordes
   `border-b border-slate-700`, y usar Tailwind/clases inline de Vanilla CSS del proyecto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHIVO 4 (OPCIONAL): useStructureStore.js — Funciones CRUD adicionales
Si en la misma sesión se implementa DataEntryPanel, agregar estas funciones al store:

  addNode: (node) => set(state => ({
    nodes: [...state.nodes, { ...node, id: Date.now() }]
  })),
  deleteNode: (id) => set(state => ({
    nodes: state.nodes.filter(n => n.id !== id),
    elements: state.elements.filter(e => !e.nodes.includes(id))
  })),
  addElement: (element) => set(state => ({
    elements: [...state.elements, { ...element, id: Date.now() }]
  })),
  deleteElement: (id) => set(state => ({
    elements: state.elements.filter(e => e.id !== id)
  })),
  addMaterial: (material) => set(state => ({
    materials: [...state.materials, material]
  })),
  addSection: (section) => set(state => ({
    sections: [...state.sections, section]
  })),

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITERIOS DE VERIFICACIÓN:
1. Al cargar /arko3d el wizard aparece solo (primer uso).
2. Al hacer clic en "GENERAR MODELO", el wizard cierra y el canvas 3D muestra el modelo.
3. Al hacer clic en "Editar Modelo" (toolbar), el wizard reabre con los valores anteriores.
4. Cambiar numFloors de 2 a 3 y volver a "GENERAR MODELO" → el canvas muestra 3 pisos.
5. El botón "✕ Cancelar" funciona sin modificar el modelo.
6. La toolbar muestra el resumen correcto del modelo.

REGLAS TÉCNICAS A RESPETAR:
- NO usar Tailwind si el proyecto usa Vanilla CSS. Revisar index.css del proyecto primero.
- SIEMPRE importar lucide-react al top del archivo si se usan sus íconos.
- NO crear funciones duplicadas en useStructureStore.js.
- Usar const [state, setState] = React.useState() para estado local del wizard.
- La toolbar ocupa el 100% del ancho sobre el canvas, NO dentro del canvas.
```

---

*Documento creado: 2026-06-09 | Última actualización: 2026-06-10*
*Autor: Antigravity AI + Pablo (Ingeniería Arko 360)*

---

## 7. Formato de Archivo `.arko3d`

Los proyectos ARKO3D se exportan/importan como archivos JSON con extensión `.arko3d`.
La función `exportProject()` del store los genera; `importProject()` los consume.

### Estructura JSON

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Edificio Torre A",
    "author": "",
    "units": "m, kgf, C"
  },
  "nodes": [
    { "id": 1, "x": 0.0, "y": 0.0, "z": 0.0, "restraint": { "dofs": [true, true, true, true, true, true] } },
    { "id": 2, "x": 5.0, "y": 0.0, "z": 0.0, "restraint": null }
  ],
  "elements": [
    { "id": 1, "type": "frame", "nodes": [1, 2], "section_id": "COL_DEF", "material_id": "CONC_28" }
  ],
  "shells": [
    {
      "id": "S-1749500000000",
      "type": "shell",
      "nodes": [1, 2, 3, 4],
      "thickness": 0.20,
      "material_id": "CONC_28",
      "loads": { "CM": 2.0, "CV": 1.5 }
    }
  ],
  "materials": [
    { "id": "CONC_28", "E": 25000000000, "G": 10000000000, "nu": 0.2, "density": 2400 }
  ],
  "sections": [
    { "id": "COL_DEF", "A": 0.16, "Ix": 0.002, "Iy": 0.002, "J": 0.003, "params": { "b": 0.4, "h": 0.4 } },
    { "id": "BEAM_DEF", "A": 0.12, "Ix": 0.001, "Iy": 0.0005, "J": 0.001, "params": { "b": 0.3, "h": 0.4 } }
  ],
  "wizardConfig": {
    "type": "3d_frame",
    "numFloors": 2,
    "numBaysX": 2,
    "numBaysY": 2,
    "floorHeight": 3.0,
    "bayWidthX": 5.0,
    "bayWidthY": 5.0
  }
}
```

### Reglas de compatibilidad

- El campo `version` debe ser `"1.0"` para los archivos generados actualmente.
- `nodes` y `elements` son **obligatorios** para la importación (validación mínima en UI).
- `shells`, `materials`, `sections` y `wizardConfig` son opcionales y pueden ser arrays/objetos vacíos.
- Los IDs de nudos son enteros. Los IDs de shells son strings con formato `S-{timestamp}`.
- Los apoyos (`restraint`) siguen el orden `[Fx, Fy, Fz, Mx, My, Mz]` en booleanos.
- Las unidades (`units`) viajan como un string libre en la `metadata` (e.g. `"m, kgf, C"` o `"m, kN, C"`). Sirve de referencia para la interfaz, el usuario debe proveer los valores consistentes con la unidad elegida.
