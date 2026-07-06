# Desarrollo de la Calculadora de Losa de Fundación y Memoria de Cálculo

## 1. Visión General
El objetivo central fue desarrollar una herramienta web interactiva para el diseño estructural y cálculo de materiales (cómputos métricos) de Losas de Fundación, basada en el Modelo Elástico de Winkler y resuelta numéricamente mediante el Método de Diferencias Finitas.

## 2. Desarrollo del Motor Backend (Python / FastAPI)
- **Tecnología**: Numpy y Scipy.
- **Implementación Matemática**:
  - Solución del modelo de placa sobre fundación elástica de Winkler ($D \nabla^4 w + k w = q$).
  - Uso del esquema de "estrellas" de diferencias finitas (13 puntos) para discretizar y resolver la ecuación diferencial parcial de 4to orden que rige a las placas.
  - Generación dinámica de "bandas de diseño" a partir de muros trazados por el usuario para calcular los aceros de flexión local (Ecuación de Whitney iterativa).
- **Problemas Encontrados y Solucionados**:
  - *Cuantías Ficticias*: La ecuación de flexión pura de Whitney devolvía a veces cantidades minúsculas de acero en zonas con momentos bajísimos, lo cual contradice la lógica constructiva.
  - *Solución*: Se implementó una lógica de superposición donde el acero Mínimo normativo por temperatura ($As = \rho \cdot b \cdot h$) actúa como una malla base obligatoria (bottom/top). Las bandas sólo instancian acero extra de flexión cuando la demanda ($As\_flexion$) supera el umbral de dicho mínimo.

## 3. Desarrollo del Frontend (React / Tailwind)
- **Interactividad Visual**: Se construyó un canvas interactivo donde el usuario dibuja libremente o escoge plantillas perimetrales (L, U, T, rectángulo) para la losa. Puede editar vértices, agregar columnas y trazar tabiquería interna.
- **Mapas de Calor de Ingeniería**: Usando los tensores del backend, se renderiza un `canvas` que interpola deformaciones, presiones de suelo y cortantes, actuando como un visualizador de software de ingeniería tipo ETABS/SAP2000.
- **Problemas Encontrados y Solucionados**:
  - *Fallas de Tooltips*: El puntero ("tooltip") de los mapas de calor perdía precisión o se salía de la pantalla en dispositivos con zoom o scroll alterado debido al uso de posicionamiento CSS incorrecto.
  - *Solución*: Se ajustó la lógica cambiando el rastreo del cursor a coordenadas estrictamente relativas (`position: absolute`) sobre un contenedor madre, haciéndolo 100% responsivo y preciso. Se eliminaron visualizaciones redundantes (mapas de acero) favoreciendo la interactividad flotante pura.
  - *Refinamiento Responsivo (Móvil)*: Componentes como el dosificador o paneles de diseño usaban márgenes o grids rígidos (ej. `grid-cols-3` o `p-6`) que cortaban textos y asfixiaban la UI en celular. Se implementó un diseño `flex-wrap` y paddings dinámicos (`p-4 sm:p-6`) solucionando los recortes.

## 4. Arquitectura de Reportes y Memoria
- **Evolución del Requerimiento**: Inicialmente los Cómputos Métricos (cantidades para compras/presupuestos) y la Memoria de Cálculo Estructural (didáctica matemática) estaban mezclados en un solo componente y exportador PDF. Luego surgió el requerimiento de presentarlos vía HTML web nativo.
- **Problemas Encontrados y Solucionados**:
  - *Bloat y Confusión Didáctica*: Al unir la lista de materiales (cabillas por kg, bloques) con ecuaciones diferenciales, la memoria carecía de lógica de lectura para el cliente.
  - *Solución*: "Separation of Concerns" total. Se dividieron los flujos mediante dos lógicas independientes:
    1. **Cómputos Métricos** (`descargarComputosHtml`): Concentrado únicamente en cuantificaciones (concreto, acero, mampostería, acabados).
    2. **Memoria Estructural** (`descargarMemoriaCalculoHtml`): Un compendio netamente ingenieril, centrado en demostrar las hipótesis del proyecto.

## 5. Refinamiento Didáctico Extremo de la Memoria (Transparencia Algorítmica)
Para combatir el efecto "caja negra", el usuario solicitó máxima exposición de los métodos. Se enriqueció la memoria de cálculo HTML de la siguiente forma:
- **Visibilidad de la Malla (Mesh)**: Se programó la exposición de la grilla teórica, imprimiendo automáticamente la separación nodal ($\Delta x, \Delta y$) en metros, así como el tamaño final de la matriz $N \times N$ analizada en el sistema algebraico ($A \cdot w = b$).
- **Diagramas de Flujo y Teoría**: Se insertaron gráficas ASCII demostrativas que resumen las 5 etapas del motor de cálculo interno (desde las condiciones de borde hasta el post-proceso normativo ACI-318).
- **Trazabilidad de Cargas**: Se desglosó mediante tablas cómo cada muro trazado es evaluado individualmente para estimar su peso propio (Espesor $\times$ Altura $\times$ Densidad), su longitud, y su resultante Lineal ($kN/m$).
- **Transparencia en el Acero**: Se expuso la iteración del diseño en bandas. Por cada banda, la memoria documenta el Momento Máximo evaluado y su respuesta en cuantía. Adicionalmente, se insertó una nota explicativa aclarando *por qué* en muros de poco impacto la cuantía de flexión exigida es $0.00 cm²/m$, explicando que el control del diseño lo rige la malla general por contracción y temperatura.
