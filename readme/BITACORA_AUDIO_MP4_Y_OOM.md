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
