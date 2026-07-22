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
- **Solución:** Se integró la librería `fix-webm-duration`. Ahora, al finalizar la grabación, se inyecta la marca exacto de milisegundos (`totalDuration * 1000`) directamente en el bloque EBML del archivo justo antes de descargarlo. El Reproductor de Windows ahora muestra la barra de tiempo exacta (ej. `00:18` o `00:28`) y permite adelantar/retroceder sin errores.



