# Bitácora: Cambios Profundos en Social Generator (Lazy Loading y Audio MP4)

Este documento detalla las correcciones y cambios de arquitectura realizados en el módulo de `Social Generator` para resolver dos problemas críticos:
1. **Errores 502 Bad Gateway (OOM Kill)** al cargar proyectos.
2. **Problemas con la reproducción y sincronización de audios** en los videos `.mp4` exportados.

---

## 1. Problema de Rendimiento (502 Bad Gateway / OOM Kill)

### El Problema Original
Anteriormente, al guardar un proyecto en el carrusel/video, las imágenes personalizadas y videos insertados se convertían a **cadenas de texto en Base64** y se almacenaban directamente en la columna `content` de la tabla `SocialCarousel`.
Esto provocaba que algunos proyectos llegaran a pesar **más de 20 MB** cada uno. 

Cuando el usuario abría la plataforma e intentaba listar sus proyectos (`GET /carousels`), SQLAlchemy cargaba la columna `content` de *absolutamente todos* los proyectos al mismo tiempo. Al procesar cientos de megabytes de texto JSON en memoria RAM, el servidor (Docker) colapsaba, siendo abortado por el OOM Killer (Out Of Memory) del sistema operativo, y resultando en un error `502 Bad Gateway` en el frontend.

### La Solución Implementada
Se implementó una solución en dos etapas para resolver permanentemente el colapso de memoria sin perder la compatibilidad con los proyectos viejos:

1. **Migración a Archivos Físicos (URLs en vez de Base64):**
   - Se creó el endpoint `POST /api/v1/uploads/social-media` (`uploads.py`).
   - El frontend ahora sube el archivo (imagen o video) mediante `multipart/form-data` en lugar de leerlo como Base64.
   - El servidor guarda el archivo en el sistema de archivos (`/media/social_media/...`) y devuelve una URL pública que es la que se guarda en el JSON del proyecto.

2. **Carga Perezosa (Lazy Loading) de Proyectos:**
   - **Backend:** Se modificó `crud.py` para usar `defer(SocialCarousel.content)` en el método `get_carousels_by_ArkoAdmin`. Esto evita que la base de datos lea y cargue en memoria el contenido pesado al listar proyectos.
   - Se crearon esquemas separados: `SocialCarouselListResponse` (sin el campo `content`) y `SocialCarouselResponse` (completo).
   - Se añadió el endpoint `GET /carousels/{id}`.
   - **Frontend:** Al hacer clic en un proyecto en `ProjectGrid.jsx`, el método `handleLoadProject` ahora hace una solicitud asíncrona para obtener el proyecto completo antes de inyectarlo en el `CanvasEngine`.

---

## 2. Problemas con la Reproducción de Audios en MP4 Generados

### F. Recorte Intuitivo de Imágenes con `react-image-crop`
- **Mejora:** Se reemplazó la experiencia anterior por la librería `react-image-crop`.
- **Ventajas:** Proporciona un marco interactivo con tiradores visibles en esquinas y bordes laterales/verticales que el usuario puede arrastrar directamente como en Microsoft Office o Photoshop, admitiendo también formatos preset (1:1, 4:5, 3:4, 16:9, 9:16) y modo **Libre**.

### El Problema Original
Existía un comportamiento defectuoso en la exportación de video (`useVideoExport.js`) respecto a las pistas de audio:
1. **Audio Global vs Audio Local:** El audio global sobreescribía los audios locales de cada diapositiva en la exportación, o viceversa, provocando que no se pudiera tener una pista de fondo general (Global) simultánea a efectos especiales específicos en una sola diapositiva (Local).
2. **Sincronización de Tiempos:** Cuando se ajustaba el inicio o duración de un audio local en la "Línea de Tiempo" (`TimelinePanel`), la exportación del MP4 los ignoraba. El audio empezaba a sonar inmediatamente apenas iniciaba la diapositiva, arruinando los efectos de entrada.

### La Solución Implementada
Se reconstruyó la lógica del mezclador de audios (`exportBgAudio` y `exportLocalAudio`) dentro de `useVideoExport.js` y `index.jsx`:

1. **Separación de Pistas (Audio Paralelo):**
   - Se separaron estrictamente las variables en el estado: `content.videoSettings.globalAudio` (pista de fondo para todo el proyecto) y `slide.audio` (pista exclusiva de una diapositiva).
   - En `useVideoExport.js`, `exportBgAudio` se reproduce una sola vez al inicio de la captura y fluye a través de todas las diapositivas ininterrumpidamente.

2. **Control Estricto de Tiempos (Audio Timeline):**
   - Se agregó la barra rosa en `TimelinePanel.jsx` que lee y escribe `slide.audioStartTime` y `slide.audioEndTime`.
   - **El cambio crítico en exportación:** Dentro del loop `renderFrame(timestamp)` en `useVideoExport.js`, se añadió lógica para evaluar en cada *frame* si `slideElapsed` (el tiempo transcurrido en la diapositiva actual) está dentro del rango `[audioStartTime, audioEndTime]`. 
   - El audio local (`exportLocalAudio`) ahora hace `.play()` y `.pause()` dinámicamente en tiempo real durante la grabación de los frames, lo que garantiza que el MP4 final respete *exactamente* lo que el usuario dibujó en la línea de tiempo.

### Resumen de la Lógica de Renderizado de Audio (Fragmento)
```javascript
// Dentro de useVideoExport.js -> renderFrame()
const currentScene = scenes[slideIdx];
if (currentScene && currentPlayingAudioSrc) {
  const aStart = currentScene.audioStartTime !== undefined ? currentScene.audioStartTime : 0;
  const aEnd = currentScene.audioEndTime !== undefined ? currentScene.audioEndTime : slideDur;
  
  if (slideElapsed >= aStart && slideElapsed <= aEnd) {
    if (exportLocalAudio.paused) exportLocalAudio.play();
  } else {
    if (!exportLocalAudio.paused) exportLocalAudio.pause();
  }
}
```

## Conclusión
Estas modificaciones garantizan la estabilidad del servidor ante proyectos legados extremadamente pesados y dotan al generador de video de un nivel de producción profesional, permitiendo verdaderas pistas de fondo y efectos especiales precisos sin solapamientos.

---

## 3. Bitácora de Depuración Avanzada: Estado de Audios, Sincronización y Renderizado MP4

### A. Solución de Carrera de Estados (Race Conditions en React) al Eliminar Pistas
- **Problema:** Al hacer clic en el botón de eliminar audio en la línea de tiempo, se invocaban dos setters de estado independientes en React (`setSelectedAudio(null)` y `setCustomAudioUrl(null)`). Como ambos partían del mismo snapshot de `generatedContent`, el segundo commit de estado sobreescribía al primero, dejando el audio intacto en la vista.
- **Solución:** Se consolidaron todas las operaciones de eliminación en una **actualización atómica** utilizando el callback funcional de `setGeneratedContent(prev => ...)`:
  ```javascript
  setGeneratedContent(prev => {
    if (!prev?.video_slides) return prev;
    const targetIdx = activeSlideIdx < prev.video_slides.length ? activeSlideIdx : 0;
    const newSlides = [...prev.video_slides];
    newSlides[targetIdx] = {
      ...newSlides[targetIdx],
      audio: null,
      customAudioUrl: null,
    };
    return { ...prev, video_slides: newSlides };
  });
  ```

### B. Descalce entre `currentVideoSlide` y `designer.canvas.currentSlidePage`
- **Problema:** El reproductor automático de video mantenía su propio contador `currentVideoSlide`. Cuando el usuario estaba pausado editando una diapositiva en particular (ej. diapositiva 3), `designer.canvas.currentSlidePage` valía 3, pero `currentVideoSlide` mantenía 0. Las mutaciones de audio se aplicaban sobre `currentVideoSlide` (diapositiva 0), lo que provocaba que la diapositiva en pantalla jamás borrara su pista rosa de audio.
- **Solución:** Se creó `activeSlideIdx` que conmuta dinámicamente:
  ```javascript
  const activeSlideIdx = isPlaying 
    ? currentVideoSlide 
    : (designer.canvas?.currentSlidePage !== undefined ? designer.canvas.currentSlidePage : currentVideoSlide);
  ```
  Esto garantizó que tanto el panel lateral como la línea de tiempo y sus eliminadores operaran sobre la diapositiva que el usuario está viendo activamente.

### C. Desactivación de Autoplay en Carga de Proyectos / Reels
- **Problema:** Cada vez que se abría un reel guardado o se refrescaba la aplicación, `useVideoPlayback` inicializaba `isPlaying = true`, iniciando la reproducción inmediatamente sin acción del usuario.
- **Solución:** Se cambió el valor inicial de `isPlaying` a `false` en `useVideoPlayback.js` y se añadió `setIsPlaying(false)` dentro de `handleLoadProject` en `index.jsx`.

### D. Eliminador con Toast Inline en la Pista
- **Funcionalidad:** En lugar de lanzar popups modals agresivos, el botón 🗑️ de la pista transforma temporalmente la barra del audio en un toast de confirmación integrado (Inline Toast) con los botones `Confirmar` y `Cancelar`, deteniendo la propagación de eventos (`e.stopPropagation()`).

### E. Visualización de Duración Total para Audio Global
- **Mejora:** La pista morada de `Fondo (Global)` en la línea de tiempo ahora muestra la etiqueta de tiempo calculada sobre el total del proyecto (ej. `0.0s - 28.0s (Global)`), evitando confundir al usuario haciendo parecer que el audio global solo dura 2.0s como la escena individual.

### H. Inyección de Cabecera de Duración (`fix-webm-duration`)
- **Problema Descubierto:** La API nativa `MediaRecorder` de los navegadores (Chrome/Edge/Firefox) codifica videos en tiempo real sin escribir la cabecera `Duration` en los metadatos del contenedor WebM/MP4 (dejando la duración como desconocida/`--:--`). Al abrir estos archivos en el **Reproductor de Windows** o VLC, el reproductor intentaba calcular la duración dividiendo el tamaño del archivo entre la tasa de bits inicial, mostrando tiempos erróneos e inflados (1:39, 5:00) o deshabilitando la barra de tiempo.
- **Solución:** Se integró la librería `fix-webm-duration`. Ahora, al finalizar la grabación, se inyecta la marca exacta de milisegundos (`totalDuration * 1000`) directamente en el bloque EBML del archivo justo antes de descargarlo. El Reproductor de Windows ahora muestra la barra de tiempo exacta (ej. `00:18` o `00:28`) y permite adelantar/retroceder sin errores.

### I. Corrección del Estado "suspended" en AudioContext
- **Problema:** Si la instanciación de `new AudioContext()` se pospone hasta después de tareas asíncronas (`await html2canvas`), las políticas de seguridad del navegador (Chrome/Edge/Safari) cambian el estado del mezclador a `"suspended"`, resultando en un MP4 completamente mudo.
- **Solución:** Se restauró la instanciación de `new AudioContext()` al primer milisegundo del evento de clic del usuario (`handleExportVideo`), manteniendo el mezclador en estado `"running"` y asegurando una salida de audio limpia tanto para audio de fondo como para audios locales de diapositivas.

### J. Estiramiento y Escalado de Imágenes con `re-resizable`
- **Mejora:** Se reemplazó el control manual escalar único por la librería `re-resizable` directamente sobre el lienzo (`SlideCanvas.jsx`).
- **Funcionalidad:** Al seleccionar una imagen en la diapositiva, se activan **8 tiradores interactivos** (*arriba, abajo, izquierda, derecha y las 4 esquinas*). Arrastrar los bordes laterales/verticales modifica el ancho (`width`) y alto (`height`) de forma independiente, permitiendo estirar, ensanchar o escalar la imagen libremente. El exportador de MP4 (`useVideoExport.js`) soporta dimensiones independientes dibujando la proporción exacta estirada en el video final.
- **Aislamiento de Eventos (`e.stopPropagation()`):** Se solucionó el conflicto donde arrastrar un tirador de estiramiento desplazaba simultáneamente la posición `x, y` de la imagen por propagación de eventos (`onMouseDown`). Ahora, agarrar un tirador aísla la acción exclusivamente al redimensionado de bordes sin mover la imagen de su lugar.

### K. Atenuación de Doble Clic en Imágenes vs Edición de Textos
- **Problema:** Al hacer doble clic en una imagen o elemento del lienzo, el evento propagaba hasta el contenedor principal de la diapositiva (`SlideCanvas.jsx`), abriendo indebidamente el modal "Editar Diapositiva" (editor de textos de título/contenido).
- **Solución:** Se añadió un gestor `onDoubleClick` con `e.stopPropagation()` directamente sobre los contenedores de imágenes. Ahora, hacer doble clic en una foto abre **directamente el modal de recortar imagen (`react-image-crop`)**, y evita abrir por error el editor de texto.

### L. Ajuste de Proporción (`object-cover`), Escalado Armónico (`lockAspectRatio`) y Reducción del Grosor de Tiradores (`re-resizable`)
- **Problema:** Al encoger o estirar los bordes laterales o verticales de las imágenes o videos con los tiradores de `re-resizable`, la imagen cambiaba su relación de aspecto respecto al contenedor, lo que provocaba un re-escalado/zoom interno al alternar el eje dominante de `cover`. Además, los bordes visuales eran demasiado gruesos (4px a 8px).
- **Solución:**
  1. **Ajuste Proporcional:** Se cambió `backgroundSize: '100% 100%'` por `backgroundSize: 'cover'` (para imágenes) y `object-fill` por `object-cover` (para videos) en [SlideCanvas.jsx](file:///c:/Users/pablo/Documents/arko360_platform/admin/src/modules/biblioarko/pages/social-generator/components/SlideCanvas.jsx).
  2. **Bloqueo de Relación de Aspecto (`lockAspectRatio={true}`):** Se activó `lockAspectRatio={true}` en `<Resizable>` para que tanto el estiramiento horizontal como el vertical mantengan la proporción exacta del marco. El marco y la imagen escalan en sincronía uniforme en cualquier dirección sin causar recortes o zoom interno.
  3. **Renderizado de Exportación:** Se adaptó la función `drawSlide` en [useVideoExport.js](file:///c:/Users/pablo/Documents/arko360_platform/admin/src/modules/biblioarko/pages/social-generator/hooks/useVideoExport.js) con cálculo de recorte de 9 parámetros en el canvas para mantener `object-cover` al grabar el archivo MP4.
  4. **Reducción de Grosor a la Mitad:** Se redujo el grosor de los tiradores laterales de **4px a 2px** (`height: 2px`, `width: 2px`) y los tiradores de las esquinas de **8px a 6px**, suavizando la línea de selección a `ring-1 ring-indigo-500/60 shadow-md`.
  5. **Barra de Acciones Externa:** Se reubicó la barra de herramientas flotante (`.slide-actions`) a la derecha, fuera del lienzo de la diapositiva (`left-full ml-4`), asignando un contenedor con fondo índigo (`bg-indigo-600`) a cada botón para despejar la vista de edición.
  6. **Barra Contextual Vertical Izquierda:** Se reestructuró `ContextualBar.jsx` para mostrar los controles de edición de forma vertical a la izquierda de la diapositiva (`right-full mr-4 top-1/2 -translate-y-1/2`), logrando un espacio de trabajo simétrico en escritorio.









