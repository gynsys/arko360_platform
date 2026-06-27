# ARKO3D — Registro de Bugs y Soluciones

Documento técnico que registra los bugs encontrados en el módulo ARKO3D (`/arko3d`), su causa raíz y la solución aplicada. Sirve como referencia para no repetir los mismos errores.

---

## 🐛 BUG #001 — Vista Planta: Los elementos del nivel Z=3 no se renderizan ni se pueden seleccionar

**Fecha:** 2026-06-10  
**Estado:** ✅ Resuelto  
**Archivos afectados:** `StructureCanvas.jsx`

### Síntomas
- En la vista **Planta (XY)**, al navegar al nivel `Z=3` de un edificio de 2 pisos (Z=0, Z=3, Z=6):
  - Las vigas y nodos del nivel Z=3 aparecían casi invisibles o no se veían.
  - No se podía seleccionar ningún elemento (clic individual ni ventana de selección).
  - Al hacer clic, el elemento no cambiaba de color a amarillo (indicador de selección).
  - En cambio, en `Z=6` todo funcionaba perfectamente: nodos azules brillantes, vigas visibles, selección correcta.
- En `Z=0`, los nodos se veían pero al seleccionarlos no cambiaban de color.

### Diagnóstico — Proceso de depuración

Se añadió un `console.log` temporal en el render para verificar los valores del store:

```js
console.log('[ARKO3D DEBUG] cameraView=XY, activeLevel=', activeLevel, 'uniqueZ levels=', uniqueZs);
console.log('[ARKO3D DEBUG] Nodos activos en nivel:', activeNodes.length, '/', nodes.length);
```

**Resultado del log en Z=3:**
```
activeLevel = 3       ✅ (el store es correcto)
Nodos activos = 9/27  ✅ (la lógica isNodeActive identifica bien los nodos)
```

Esto descartó que el problema fuera de lógica. La causa era puramente de **renderizado 3D (depth buffer de OpenGL/WebGL)**.

### Causa Raíz

La vista Planta (XY) usa una **cámara ortográfica** posicionada en:
```
camera.position = (cx, cy, activeLevel + 100)
camera.target   = (cx, cy, activeLevel)
```

Para `Z=3`, la cámara estaba en `z = 103` mirando hacia `z = 3`.

Los elementos del nivel `Z=6` (que debían aparecer como "fantasmas" para dar contexto) estaban a `z=6`, es decir, **más cerca de la cámara** que los elementos de `Z=3`.

Aunque los elementos de `Z=6` eran transparentes (opacity=0.15) y tenían `depthWrite=false`, el GPU los pintaba **sobre** los elementos de `Z=3` porque:
1. `depthWrite=false` → No escriben al depth buffer.
2. Pero **sí leen** el depth buffer (`depthTest=true` por defecto).
3. Como están a `z=6 < z=103` (más cerca de la cámara), **pasan el depth test**.
4. Se renderizan encima de los elementos `Z=3` (que estaban a `z=3 < z=6` = más lejos de la cámara).
5. Resultado: los elementos activos de `Z=3` quedaban "enterrados" visualmente bajo la capa semi-transparente de `Z=6`.

**Para la selección:** el mismo problema afectaba el raycasting — los meshes de `Z=6` interceptaban el rayo antes de llegar a `Z=3`.

**Para `Z=0` (color no cambia):** El formato del `restraint` generado por el Wizard era `{ dofs: [true,true,true,true,true,true] }` pero el componente `NodePoint` esperaba `{ ux, uy, uz, rx, ry, rz }`. Esto hacía que todos los nodos base se vieran sin apoyo visible, aunque ese era un bug secundario.

### Solución Aplicada

**En `StructureCanvas.jsx`:** Se cambió la estrategia de "atenuar" los elementos de otros niveles a **simplemente no renderizarlos** en vista 2D:

```jsx
// ANTES (causaba el bug de depth buffer):
const active = isNodeActive(n);
return <NodePoint ... isFaded={!active} />;

// DESPUÉS (solución correcta - igual que ETABS):
const active = isNodeActive(n);
if (!active && cameraView !== '3D') return null;  // Simplemente no renderizar
return <NodePoint ... isFaded={false} />;
```

Lo mismo se aplicó para `FrameElement` y `ShellMesh`.

**En `useStructureStore.js`:** Se corrigió el formato del `restraint` del Wizard:

```js
// ANTES:
restraint: z === 0 ? { dofs: [true, true, true, true, true, true] } : null

// DESPUÉS:
restraint: z === 0 ? { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } : null
```

**Bug de closure stale en `SelectionHandler`:** El `useEffect` del handler de selección capturaba `cameraView` y `activeLevel` al montar el componente. Al navegar entre niveles, los listeners del mouse seguían filtrando con el `activeLevel` viejo. Solución: leer el estado fresco directamente del store en el momento del evento:

```js
// ANTES: closure stale
const onPointerUp = (e) => {
  // Usaba cameraView y activeLevel capturados en el useEffect inicial
};

// DESPUÉS: siempre lee el estado más reciente
const onPointerUp = (e) => {
  const state = useStructureStore.getState(); // Fresco en cada evento
  const { cameraView: freshView, activeLevel: freshLevel, ... } = state;
};
```

**Bug de verificación de profundidad en cámara ortográfica:** El check `if (p.z > 1 || p.z < -1) return false` en la proyección del selection box estaba diseñado para cámara perspectiva. Con cámara ortográfica el NDC-Z puede caer fuera del rango [-1, 1] para puntos válidos. Se eliminó ese check.

### Lección Aprendida

> En motores 3D (Three.js/WebGL), hacer un objeto "transparente" no lo hace invisible para el depth buffer. Si un objeto transparente está **más cerca de la cámara** que el objeto opaco que quieres mostrar, los bloqueará visualmente.
>
> La solución correcta para vistas de plano 2D en software estructural es **omitir completamente** los elementos de otros niveles del render, no atenuarlos. Esto coincide con la práctica de ETABS, SAP2000 y similar.

---

## 🔧 MEJORAS IMPLEMENTADAS (sesión 2026-06-10)

| Mejora | Archivo | Descripción |
|--------|---------|-------------|
| Selección por ventana (Window/Crossing) | `StructureCanvas.jsx`, `useStructureStore.js`, `FEA3DContainer.jsx` | Dibuja caja con mouse (Izq→Der = Window azul, Der→Izq = Crossing verde) |
| Controles estilo ETABS | `StructureCanvas.jsx` | Clic derecho = orbitar, rueda = panear, clic izquierdo = seleccionar |
| Tip de controles | `ViewControls.jsx` | Hover sobre "Controles Mouse" muestra resumen de atajos |
| Navegación 2D | `ViewControls.jsx`, `useStructureStore.js` | Botones Planta / Elev XZ / Elev YZ con navegación por niveles (↑↓) |
| Sin footer/header en /arko3d | `App.jsx` | La ruta /arko3d oculta el Navbar y Footer del sitio |
| Selección acumulativa | `StructureCanvas.jsx` | Shift/Ctrl + ventana suma a la selección existente |

---

## 🐛 BUG #003 — Loop Infinito en Frontend (requestAnimationFrame)

**Fecha:** 2026-06-27  
**Estado:** ✅ Resuelto  
**Archivos afectados:** `StructureCanvas.jsx`

### Síntomas
- Al ejecutar el análisis, la pantalla se congelaba y el navegador reportaba violaciones de `requestAnimationFrame` que tomaban >60ms.
- El servidor remoto cerraba la conexión por timeout (90s) porque el cliente dejaba de responder.

### Causa Raíz
La generación de la geometría de los bordes (`THREE.EdgesGeometry(extrudedGeometry, 15)`) para visualizar los perfiles 3D se estaba recalculando en cada frame renderizado (unas 60 veces por segundo) para cientos de elementos. Esto saturaba por completo el hilo principal del navegador.

### Solución
Se envolvió el cálculo de la geometría en un hook `useMemo` para asegurar que solo se calcule una vez por elemento cuando se renderiza por primera vez.

---

## 🐛 BUG #004 — Frontend de Producción apuntando a localhost:8000

**Fecha:** 2026-06-27  
**Estado:** ✅ Resuelto  
**Archivos afectados:** `.env` en droplet, `api.js`

### Síntomas
- Error CORS y `ERR_CONNECTION_REFUSED` al intentar hacer login o fetch de la API.
- La consola mostraba peticiones apuntando a `localhost:8000` a pesar de estar en producción (`arko360.net`).

### Causa Raíz
Los frontends en Vite (landing y admin) "hornean" las variables de entorno (`VITE_API_URL`) en el JavaScript estático al momento de ejecutar `npm run build`. El contenedor del droplet se construyó sin un archivo `.env` local, por lo que usó los valores por defecto (localhost).

### Solución
Se crearon archivos `.env` en los directorios correspondientes del servidor con `VITE_API_URL=https://api.arko360.net/api/v1` y se ordenó una reconstrucción de la imagen y contenedores de docker para el frontend.

---

## 🐛 BUG #005 — Diagramas de Momento discontinuos ("en zig-zag") y columnas sin momentos en Galpones Tapered

**Fecha:** 2026-06-27  
**Estado:** ✅ Resuelto  
**Archivos afectados:** `backend/app/engine/solvers.py`

### Síntomas
- Al calcular un galpón con secciones de alma variable (Tapered), el diagrama de momento en las vigas del techo no era continuo (formaba una serie de "corbatines" o zig-zags saltando de +25 a -20 abruptamente en cada nudo).
- Las columnas mostraban momentos casi nulos a pesar de estar rígidamente conectadas a la viga de techo.

### Causa Raíz
El motor ensamblaba la matriz global usando la rigidez exacta (`get_tapered_3d_frame_local_stiffness`) a partir de una condensación estática, obteniendo deformaciones (`u_loc`) precisas. 
Sin embargo, **al recuperar las fuerzas internas** (`f_loc_end = k_loc @ u_loc`), el solver estaba usando erróneamente la matriz prismática genérica (`get_3d_frame_local_stiffness`). 
Como el frontend inicializaba las secciones tapered con valores prismáticos mínimos por defecto (`A: 0.02, Ix: 0.001`), el solver multiplicaba desplazamientos reales por una rigidez casi nula, rompiendo por completo el equilibrio de fuerzas estáticas en el nudo y provocando discontinuidades matemáticas.

### Solución
Se modificó `solvers.py` para usar exactamente la misma función `get_tapered_3d_frame_local_stiffness` durante la recuperación de fuerzas para cualquier sección de tipo `Tapered`. Esto garantizó el equilibrio nodal y restauró la continuidad perfecta de los diagramas de momento y cortante.
