# Bitácora de Solución: Gestor de Redes (Generador de MP4)

A continuación se documentan todos los problemas resueltos y las funcionalidades implementadas en el módulo `social-generator` para garantizar que la vista del diseñador sea 100% fiel al archivo exportado y sin anomalías de reproducción.

## 1. Correcciones en el Exportador de MP4 (`useVideoExport.js`)

**El motor de exportación fue reestructurado para eliminar inconsistencias (como el bug en la duración y el eco de audio):**

*   **Inconsistencia de tiempos (Bug del Lazy-Loading):**
    *   **Problema:** Si el usuario no reproducía la vista previa de una diapositiva con video antes de exportar, el generador no registraba la duración real del video y le asignaba 5 segundos por defecto (creando un MP4 corto, ej. 40s). Si sí la veía, exportaba la duración real (ej. 3m30s).
    *   **Solución:** Se implementó una lectura directa de la duración cruda (`vid.duration`) durante la fase de preparación de la exportación en caso de que la caché del estado (`pos.endTime`) estuviera vacía. Ahora el algoritmo es determinista e inmutable frente a interacciones previas.
*   **Eco y tartamudeo en el Audio Exportado:**
    *   **Problema:** Al hacer la transición entre diapositivas, el ciclo rápido de grabación (`requestAnimationFrame` a 60fps) disparaba la función `startSlideMedia()` múltiples veces en ráfaga (por un margen matemático de 0.05s). Esto provocaba que el audio local y el video arrancaran varias veces simultáneamente.
    *   **Solución:** Se introdujo una variable de estado (`startedMediaForSlide`) para garantizar estrictamente una única llamada de reproducción por cada diapositiva en transición.
*   **Diferencias de tamaño/recorte (Object-Contain vs Object-Cover):**
    *   **Problema:** En el diseñador, los videos se adaptaban a su caja sin recortarse (`object-contain`). Sin embargo, el motor Canvas del MP4 los dibujaba expandiéndolos para rellenar toda la pantalla (`object-cover`). Esto causaba que el video en el MP4 se viera más "cerca" y superpuesto a elementos (un problema viejo que volvió a ocurrir).
    *   **Solución:** Se aplicó un cálculo de relación de aspecto en el método `ctx.drawImage()` para emular perfectamente el comportamiento `object-contain` original.

## 2. Correcciones en la Reproducción e Interfaz (`index.jsx` y `SlideCanvas.jsx`)

**Mejoramos la edición para que la línea de tiempo se controle intuitivamente.**

*   **Eliminación del Bucle Automático (Auto-Loop):**
    *   **Problema:** Al llegar al final de la línea de tiempo, el video se regresaba a cero y volvía a empezar indefinidamente.
    *   **Solución:** Se alteró la lógica para que, al alcanzar el tiempo máximo, el reproductor se pause automáticamente (`setIsPlaying(false)`) y el cursor espere en el segundo cero.
*   **Bug de "Fotograma Congelado" al Rebobinar:**
    *   **Problema:** Al detener la reproducción y regresar a cero, la interfaz marcaba el inicio pero el DOM nativo (Chrome) no actualizaba el video, dejando en pantalla la última escena del video.
    *   **Solución:** Se forzó una sincronización precisa `vidNode.currentTime = targetTime` en un `useEffect` para forzar al navegador a "repintar" el fotograma sin abrumar el hilo principal (`Math.abs > 0.1`).
*   **Bug de Estados Mezclados al Eliminar Imágenes/Videos:**
    *   **Problema:** Al eliminar un recurso de una diapositiva, los metadatos internos (`imageSizes` e `imageRotations`) de los demás recursos no se indexaban bien. Esto causaba que un video nuevo heredara la rotación o recorte del elemento eliminado.
    *   **Solución:** Se reescribió la función `handleRemoveImage` con `shiftStateProperties` para desplazar los índices del arreglo y purgar el estado obsoleto de la memoria temporal.

## 3. Nuevas Herramientas UI Añadidas

*   **Control de Tamaño de Texto (+ / -):** Se agregaron botones dedicados en el panel para ajustar dinámicamente el tamaño de la fuente para el cuerpo de texto y títulos.
*   **Duplicación de Contenido Principal:** Se habilitó un botón en la interfaz para permitir clonar o duplicar el elemento seleccionado del diseño.
