# Bitácora de Refactorización Modular — Calculadora de Losa de Fundación

## 1. Visión General
El componente principal de la Calculadora de Losas de Fundación (`CalculadoraLosaFundacion.jsx`) alcanzó **4,463 líneas de código** en un único archivo monolítico. Esta alta densidad de código dificultaba el mantenimiento, la depuración y la colaboración.

Se ejecutó un plan de **Refactorización Integral en 5 Fases** orientado a la separación estricta de responsabilidades (*Separation of Concerns*), reutilización de componentes y extracción de Custom Hooks.

---

## 2. Fases de la Refactorización

### 📦 Fase 1: Utilidades y Constantes sin Estado
Se identificaron y extrajeron las constantes de configuración y las funciones puras sin estado React a módulos dedicados bajo `src/components/tools/calculadoraLosaFundacion/`:
- `constants/slabConstants.js`: Constantes del sistema (`API_BASE`, `MATERIALS`, `FALLBACK_PRECIOS`, `SHAPES`).
- `utils/budgetCalculator.js`: Lógica de cómputo y presupuesto (`generarPresupuesto`).
- `utils/rebarVerifier.js`: Funciones numéricas de verificación de acero (`verifyRebarSpacing`, `verifyBeamRebar`, `getLiveSvgDetails`).
- `utils/geometryUtils.js`: Operaciones vectoriales puras (`rotatePoint`, `getRotatedWalls`).

### 📑 Fase 2: Generadores de Exportación y Reportes
Los módulos de exportación de archivos y reportes representaban más de 1,100 líneas del archivo original. Se extrajeron a `utils/exports/`, eliminando el acceso a variables por *closure* y convirtiéndolos en funciones independientes con parámetros explícitos:
- `utils/exports/exportExcel.js`: Exportador de presupuesto en formato ExcelJS (`descargarExcel`).
- `utils/exports/exportPdf.js`: Exportador PDF de cotización (`descargarPDFPresupuesto`).
- `utils/exports/exportComputosHtml.js`: Generador de informe HTML imprimible para cómputos métricos.
- `utils/exports/exportMemoriaHtml.js`: Generador de Memoria de Cálculo Estructural didáctica con mapas de calor de esfuerzos.
- `utils/exports/exportAuditJson.js`: Exportador de auditoría en formato JSON estructurado MKS.

### 🎨 Fase 3: Componentes Visuales y Modales de Herramientas
Se independizaron los elementos visuales de la interfaz de usuario en componentes React reutilizables bajo `components/`:
- `components/DraggableModal.jsx`: Modal flotante con soporte de arrastre (`drag & drop`).
- `components/RebarSelectors.jsx`: Selectores dinámicos e interactivos de acero (`InteractiveRebarSelect`, `InteractiveBeamRebarSelect`).
- `components/toolModals/`: Colección de 7 modales flotantes de configuración:
  - `GeometryModal.jsx` (Forma y dimensiones de losa)
  - `MaterialsModal.jsx` (Materiales de mampostería y altura de pared)
  - `FemModal.jsx` (Parámetros FEM: $f'_c$, $f_y$, $q_{adm}$, recubrimiento, malla)
  - `WallsModal.jsx` (Tabla interactiva de muros)
  - `ColumnsModal.jsx` (Configuración de machones/columnas)
  - `OpeningsModal.jsx` (Gestión de puertas y ventanas)
  - `LayersModal.jsx` (Gestión de capas de arquitectura/estructura e importación de planos de fondo)

### 2D Lienzo SVG y Modal de Resultados (Fase 4)
Se extrajeron los dos bloques JSX más extensos del editor:
- `components/SlabCanvas.jsx` (~655 líneas): Área de trabajo interactiva SVG, barra superior de herramientas de dibujo (muros perimetrales, internos, muros de contención, vigas de apoyo, offset, rotación), reglas graduadas X/Y, cuadrícula de dibujo, O-Snap a vértices/muros, renderizado de aberturas (barrido de puertas y ventanas) y HUD flotante de longitud exacta.
- `components/ResultsModal.jsx` (~455 líneas): Modal de resultados del análisis ACI 318, tarjetas KPI de asentamiento/presión/corte, detalles transversales dinámicos SVG, mapas de calor de momentos/deformaciones y tablas de armado por bandas.

### ⚛️ Custom Hooks y Orquestación Principal (Fase 5)
Toda la lógica de estado y efectos fue encapsulada en 4 Custom Hooks especializados en `hooks/`:
- `hooks/useSlabState.jsx`: Gestión centralizada del estado del proyecto, geometría, auth, capas y resultados.
- `hooks/useSlabHistory.jsx`: Control de la pila de deshacer/rehacer (*Undo/Redo*) con límite de 50 estados.
- `hooks/useCanvasInteraction.jsx`: Lógica de zoom, pan, O-Snap, movimiento de cursor, cálculo de offset/rotación y manejadores de eventos del teclado/ratón.
- `hooks/useSlabApi.jsx`: Construcción de payloads JSON, ejecución del análisis estructural en el motor FastAPI, y funciones CRUD para guardar/abrir/eliminar proyectos en base de datos.
- `components/SlabHeader.jsx` & `components/SlabSidebar.jsx`: Componentes UI para la barra superior de acciones y la barra lateral de herramientas.

---

## 3. Resumen de Impacto y Métricas

| Métrica | Estado Anterior | Estado Actual |
| :--- | :--- | :--- |
| **Líneas de Código en `CalculadoraLosaFundacion.jsx`** | `4,463 líneas` | **`320 líneas`** |
| **Porcentaje de Reducción** | 0% | **~93% de reducción** |
| **Archivos Modulares Creados** | 1 archivo monolítico | **24 módulos desacoplados** |
| **Compilación de Producción (`npm run build`)** | Exitoso | **Exitoso (`✓ 3074 modules transformed` en 35.9s)** |

---

## 4. Estructura de Directorios Resultante

```
src/components/tools/calculadoraLosaFundacion/
├── components/
│   ├── DraggableModal.jsx
│   ├── RebarSelectors.jsx
│   ├── ResultsModal.jsx
│   ├── SlabCanvas.jsx
│   ├── SlabHeader.jsx
│   ├── SlabSidebar.jsx
│   └── toolModals/
│       ├── ColumnsModal.jsx
│       ├── FemModal.jsx
│       ├── GeometryModal.jsx
│       ├── LayersModal.jsx
│       ├── MaterialsModal.jsx
│       ├── OpeningsModal.jsx
│       └── WallsModal.jsx
├── constants/
│   └── slabConstants.js
├── hooks/
│   ├── useCanvasInteraction.jsx
│   ├── useSlabApi.jsx
│   ├── useSlabHistory.jsx
│   └── useSlabState.jsx
└── utils/
    ├── budgetCalculator.js
    ├── geometryUtils.js
    ├── rebarVerifier.js
    └── exports/
        ├── exportAuditJson.js
        ├── exportComputosHtml.js
        ├── exportExcel.js
        ├── exportMemoriaHtml.js
        └── exportPdf.js
```
