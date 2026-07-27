# Bitácora de Resolución: "El Bug del Video Fantasma" (Tiempo en Escena Incorrecto)

**Fecha:** 27 de Julio de 2026
**Módulo:** Creador/Editor de Reels y Carruseles (`social-generator`)

## Descripción del Problema
Los videos insertados en el editor reportaban una duración incorrecta en la línea de tiempo (por ejemplo, 3.7 segundos en lugar de 45 segundos). Adicionalmente, el comportamiento errático se agravaba al eliminar videos: si se borraba un video y otro video tomaba su lugar, este último "heredaba" misteriosamente la duración incorrecta del video borrado.

### Síntomas reportados:
- La línea de tiempo no sumaba la duración correcta si el video pasaba el límite.
- En el Modal de Edición de Video, la propiedad `Fin` y `Tiempo total en escena` mostraba 3.7s aunque el video midiera 26s o 45s.
- Al eliminar un video en la posición 0, el video en la posición 1 subía a la posición 0 y de repente su tiempo bajaba a 3.7s.

## Diagnóstico y Causa Raíz
El problema se originó por cómo React y nuestro sistema de gestión de estado manejan las transformaciones (tamaño, rotación, recorte, duración).

El estado de los elementos insertados (imágenes y videos) se guarda en un objeto centralizado llamado `imagePositions`, que es gestionado por el hook `useDragTransform`. Las llaves (`keys`) de este objeto se basan en los índices del arreglo, por ejemplo: `0-0` (Slide 0, Elemento 0), `0-1` (Slide 0, Elemento 1).

### Problema 1: Inserción y Herencia de Basura
Al subir un archivo, la función `handleAddImageToVideoSlide` agregaba la nueva URL al arreglo `customImages` y creaba una nueva entrada en `imagePositions`. Sin embargo, el código esparcía los valores anteriores de la posición (haciendo un `spread` del `prev`), lo cual causaba que un video insertado en un índice previamente ocupado heredara las propiedades fantasma de ese índice (incluyendo el `endTime` y `trimEnd` que limitaba su duración).

### Problema 2: El Desplazamiento Fantasma al Borrar (Array Shifting)
Al presionar "Borrar", se eliminaba el archivo del arreglo `customImages`. Esto causaba que los elementos a la derecha se desplazaran hacia la izquierda (Ej. el video del índice 1 pasaba al índice 0). Sin embargo, **el objeto de estados (`imagePositions`) no se desplazaba en paralelo**. 
El video de 45 segundos, que ahora ocupaba el índice 0, empezaba a leer los datos de `imagePositions['0-0']`, el cual contenía los 3.7 segundos del video recién borrado.

## Intentos de Solución e Iteraciones

1. **Detectar duración en el instante de subida:** Inicialmente se intentó forzar la detección del video usando un elemento HTMLVideoElement en memoria (`tempVid`) dentro de `handleAddImageToVideoSlide`. Esto fallaba (retornando 0) en algunos contextos asíncronos del navegador, causando que se recurriera al default `slideDuration` (3.7s aprox). **(Descartado)**

2. **Dejar que el DOM lea la duración natural:** Se concluyó que lo correcto era dejar que `<video>` en `SlideCanvas.jsx` leyera naturalmente su evento `onLoadedMetadata` para definir su propio `endTime` y `trimEnd`. Esto es lo ideal, pero fallaba porque el objeto de configuración venía ya contaminado con el estado heredado (el paso 1), lo que bloqueaba la lectura natural.

3. **La Solución Definitiva:**
   - **Purgar basura al agregar:** Se modificó `handleAddImageToVideoSlide` para inicializar explícitamente el estado con datos limpios (sin `spread` de datos fantasma) al crear un nuevo registro.
   - **Desplazar (Shift) estados al eliminar:** Se reescribió `handleRemoveImage`. Ahora, cuando se borra el elemento en el índice `i`, un ciclo `for` traslada secuencialmente la configuración del índice `i+1` al índice `i`, asegurando que cada elemento arrastre su propio estado al desplazarse hacia la izquierda, y eliminando cualquier rastro de variables colgadas.

## Archivos Modificados
- `admin/src/modules/biblioarko/pages/social-generator/index.jsx`
  - Refactor de `handleAddImageToVideoSlide` (eliminación de herencia).
  - Refactor de `handleRemoveImage` (implementación de array shifting para llaves de estado).
- `admin/src/modules/biblioarko/pages/social-generator/components/SlideCanvas.jsx`
  - Traslado del botón de editar video a la barra lateral.
- `admin/src/modules/biblioarko/pages/social-generator/components/ContextualBar.jsx`
  - Inclusión del botón contextual para invocar `onEditVideo`.
