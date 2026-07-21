# Documentación del Editor de Video HTML5 y Línea de Tiempo (Social Generator)

Este documento detalla las decisiones técnicas, la arquitectura y la implementación de las mejoras realizadas en el módulo de generación de contenido social (`social-generator`), específicamente en lo referente a la edición de video, manipulación del tiempo y renderizado en el lienzo.

## 1. El Problema Original
La versión anterior utilizaba la librería `@ffmpeg/ffmpeg` (WebAssembly) en el cliente para recortar y ajustar la velocidad de los videos. Esto presentaba graves problemas:
- **Lentitud extrema:** El usuario tenía que esperar la descarga del `ffmpeg-core.js` y el procesamiento del video tardaba demasiado.
- **Errores en Producción:** Errores de ruta (`failed to import ffmpeg-core.js`) y cuelgues del navegador (`AbortError`).
- **Problemas de UI/UX:** Al arrastrar la regla del tiempo se seleccionaba el texto (números azules), y los videos insertados no actualizaban el ancho total de la línea de tiempo. Además, el `autoPlay` de los videos rompía la capacidad de arrastrarlos (Drag & Drop) por el lienzo.

## 2. Decisiones Técnicas y Solución
Se decidió **eliminar FFmpeg por completo** y delegar todo el procesamiento visual (recorte y velocidad) a la API nativa de `<video>` de HTML5 en tiempo real.
En lugar de generar un archivo `.mp4` nuevo en cada edición, simplemente guardamos los parámetros (`trimStart`, `trimEnd`, `speed`) en el estado global (`imagePositions`) y los aplicamos en el momento de reproducción y exportación.

## 3. Archivos Modificados y su Nueva Lógica

### A. `admin/src/modules/biblioarko/pages/social-generator/components/VideoEditorModal.jsx`
- **Cambio principal:** Se eliminaron las dependencias de `@ffmpeg/ffmpeg` y `@ffmpeg/util`.
- **Implementación:**
  - El modal ahora abre de manera **instantánea**.
  - Usa una etiqueta `<video>` estándar para previsualizar el archivo original.
  - Al cambiar el input de "Velocidad", actualizamos directamente `videoRef.current.playbackRate = speed` para escuchar y ver el cambio en el modal.
  - Al hacer clic en "Aplicar Ajustes", pasamos los valores puros al componente padre: `onApply({ trimStart, trimEnd, speed })`.

### B. `admin/src/modules/biblioarko/pages/social-generator/index.jsx`
- **Cambio principal:** Integración del estado del Video Editor con la Línea de Tiempo.
- **Implementación:**
  - Al llamar a `handleEditVideo`, le pasamos el estado inicial (`initialState`) guardado en `transformer.state.imagePositions` al Modal para que "recuerde" los ajustes si el usuario lo vuelve a abrir.
  - En la función `onApply` del Modal, calculamos la duración física real que tendrá el video: `computedDuration = (trimEnd - trimStart) / speed`.
  - Guardamos el nuevo `endTime` (`startTime + computedDuration`) en `imagePositions`, lo cual permite que la línea de tiempo se expanda automáticamente para reflejar el nuevo tamaño del video.
  - Lanzamos un `showToast('Ajustes de video aplicados')` y cerramos el modal, invitando al usuario a usar el **Live Preview** del lienzo principal.

### C. `admin/src/modules/biblioarko/pages/social-generator/components/TimelinePanel.jsx`
- **Cambio principal:** Corrección de UI y ajuste de escala.
- **Implementación:**
  - Se agregó la clase de Tailwind `select-none` al contenedor de la regla (ruler) para prevenir que los números (`1s, 2s, 3s...`) se pinten de azul al hacer scrub (arrastrar).
  - Se incrementó el tamaño de fuente y el contraste visual de los números (`text-[10px] font-bold text-gray-600`) para mejor legibilidad.
  - El ancho del track ahora lee directamente `slideDuration`, que a su vez se nutre del `maxVidDur` (el cual lee el `endTime` de nuestro video).

### D. `admin/src/modules/biblioarko/pages/social-generator/components/SlideCanvas.jsx`
- **Cambio principal:** Motor de reproducción HTML5 integrado y corrección del Drag & Drop.
- **Implementación:**
  - **Live Preview (`useEffect`):** Un hook escucha los cambios en `currentTime` (el scrub de la línea de tiempo) y en la variable booleana `isPlaying`.
  - Cuando el usuario le da "Play", el efecto calcula dinámicamente el `targetTime` del video en función del `currentTime` global y la velocidad: `targetTime = trimStart + (currentTime - vStart) * speed`.
  - Luego ejecuta `vidNode.play()` o `vidNode.pause()` y sincroniza el tiempo exacto.
  - **Ajuste automático inicial (`onLoadedMetadata`):** Se añadió el evento `onLoadedMetadata` a la etiqueta `<video>`. Si el video es recién insertado (su `endTime` es `undefined`), el Canvas lee su duración intrínseca (`e.target.duration`) y despacha una actualización a `setImagePositions`. Esto soluciona el fallo donde la línea de tiempo se quedaba "corta" tras insertar un video largo.
  - **Fallo de Arrastre Solucionado:** Se eliminaron las propiedades `autoPlay` y `loop` de la etiqueta `<video>` del slide. Antes, el `autoPlay` forzaba una desincronización en el renderizado que causaba la pérdida de foco al intentar hacer drag & drop. Ahora el video respeta estrictamente los eventos de mouse de la capa superior.

## 4. Consideraciones Futuras para el Mantenimiento
- **Exportación Resuelta (`useVideoExport.js`):** Anteriormente se consideraba que el backend o FFmpeg debía leer los parámetros. Esto ya fue resuelto a nivel de Frontend. El script `useVideoExport.js` ahora lee directamente `v.pos.trimStart` y `v.pos.speed` de cada elemento de video incrustado y aplica `v.vid.currentTime` y `v.vid.playbackRate` justo antes de grabar cada frame, asegurando que el video `.mp4` resultante sea pixel-perfect y con las velocidades de reproducción correctas.
- **Sincronización:** Si se añaden más elementos animados, se debe seguir utilizando `currentTime` y `isPlaying` pasados desde `index.jsx` como única "fuente de la verdad" del tiempo global, tal como se implementó en `SlideCanvas.jsx`.

## 5. Actualizaciones Recientes y Fixes UX
- **Línea de Tiempo Expansible (`TimelinePanel.jsx` & `index.jsx`):**
  - **Problema:** El usuario no podía arrastrar elementos (textos, logos, audios) más allá de la duración base (`slideDuration`), limitando la capacidad de poner elementos en "cascada" en el tiempo.
  - **Solución:** Se implementó el cálculo dinámico de `actualDuration` basado en el `endTime` máximo entre todos los elementos de la diapositiva. Adicionalmente, para evitar un ciclo infinito de re-escala visual (feedback loop) durante el "Drag & Drop", se implementó un `dragContext` (usando `useRef`) que congela la relación píxeles-por-segundo justo en el `onPointerDown`, permitiendo arrastrar elementos fuera de los límites para estirar la regla de tiempo de manera fluida.
  
- **Corrección de la Barra de Desplazamiento (`useMobileFullscreen.js`):**
  - **Problema:** Un bug generalizado causaba que la barra de desplazamiento lateral del navegador (scrollbar) desapareciera al redimensionar de móvil a escritorio.
  - **Solución:** Se corrigió el hook para que restaure los valores de estilos del body a su estado por defecto estricto (`''`) en lugar de usar `'auto'` (lo cual sobreescribía clases globales de Tailwind). Además, se añadió la limpieza obligatoria (`cleanup`) en el `useEffect` tanto en el evento `unmount` como al detectar `!isMobile`.
