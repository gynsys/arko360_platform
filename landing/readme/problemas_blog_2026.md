# Resolución de Problemas del Sistema de Blog (Sesión de Mantenimiento)
**Fecha:** 29 de Junio de 2026

Este documento detalla los problemas encontrados, las interacciones para su diagnóstico y las soluciones aplicadas al sistema de blog (tanto en el panel de administración como en el sitio público).

## Problema 1: Error al subir imágenes en el cuerpo del artículo
**Síntoma:** Al intentar insertar una imagen directamente en el cuerpo del post usando el editor (ReactQuill), el sistema fallaba mostrando el error: `index-DIJrhkPa.js:324 Error uploading image: Error: No url in response`.
**Interacción y Diagnóstico:**
- Analizamos el componente frontend `ImageUploader` y la configuración de `ReactQuill`. Vimos que el editor esperaba que el backend respondiera con un JSON conteniendo una propiedad `url` (la ruta de la imagen).
- Al revisar el backend en `/api/v1/arko/admin/upload`, descubrimos que la API estaba retornando `{"filename": "..."}` en lugar de `{"url": "..."}`.
**Solución:**
1. Modificamos el endpoint de subida de imágenes en el backend para que su respuesta JSON incluyera el campo `url` devolviendo la ruta `/uploads/{filename}`.
2. Actualizamos el "image handler" del editor `ReactQuill` en el frontend para que lea correctamente esa URL relativa y le concatene el dominio de la API de producción (`API_URL`), permitiendo que las imágenes se rendericen perfectamente dentro del editor y del artículo final.

## Problema 2: Inserción de artículos con HTML complejo y estilos en conflicto
**Síntoma:** El usuario tenía un artículo (`articulo_sismicidad_venezuela.html`) que contenía etiquetas complejas (como `<table>`) y estilos en línea (`<style>`). Al intentar pegarlo en el editor Quill de forma manual, el artículo perdía su formato y "no se veía bien" ya que el editor limpiaba o alteraba dichas etiquetas para proteger el diseño.
**Interacción y Diagnóstico:**
- El usuario solicitó que realizáramos nosotros la inserción del artículo directamente para preservar la calidad del mismo.
- Descubrimos que el archivo HTML original poseía un bloque `<style>` en el `<head>` y referencias a una imagen local inexistente (`mapa_sismicidad_venezuela_v2.png`).
**Solución:**
1. Creamos un script en Python (`format_article.py`) que actuó como un "parser" automatizado. Este script extrajo el cuerpo (`<body>`), removió las etiquetas `<style>` e `<img>` conflictivas para limpiar el código, y estructuró el contenido en un formato JSON listo para la API.
2. Generamos un Token JWT válido conectándonos directamente al endpoint de autenticación del administrador.
3. Usamos `Invoke-RestMethod` mediante PowerShell para enviar el JSON a la API real de producción (`POST /api/v1/blog/`), insertando exitosamente el artículo en la base de datos bajo el slug `venezuela-sismica-el-pais-que-olvido-que-la-tierra-tiembla`.

## Problema 3: Error "Artículo no encontrado" en la web pública
**Síntoma:** Aunque el artículo fue insertado con éxito en la base de datos, al navegar a la URL del artículo público (`/biblio/venezuela-sismica-el-pais-que-olvido-que-la-tierra-tiembla`), la página mostraba el mensaje "Artículo no encontrado" y el usuario no podía leerlo.
**Interacción y Diagnóstico:**
- Confirmamos primero haciendo un `GET` a la API pública (`/api/v1/blog/public/post/...`) que el artículo efectivamente existía y la base de datos estaba respondiendo correctamente.
- Al revisar el código del frontend en `landing/src/components/BiblioArticle.jsx`, descubrimos la raíz de todos los males: la página de detalles del artículo estaba *completamente desconectada del backend*. Estaba programada ("hardcoded") para buscar los artículos en un archivo estático de prueba llamado `cmsData.js`. Por lo tanto, nunca iba a encontrar los artículos nuevos creados en la base de datos.
**Solución:**
1. **Conexión de la API:** Modificamos el archivo `landing/src/services/api.js` agregando una nueva función asíncrona `getArticleBySlug` para consultar el endpoint real.
2. **Refactorización del Componente:** Reescribimos `BiblioArticle.jsx` para que use esta nueva función de la API. Ahora descarga dinámicamente los datos y los renderiza utilizando `dangerouslySetInnerHTML`.
3. **Formateo Estilístico:** Para evitar que el HTML puro insertado (las tablas y subtítulos del Artículo 2) se viera genérico, agregamos reglas de CSS dinámicas al archivo `index.css` (bajo la clase `.article-content`). Esto garantiza que cualquier HTML crudo que insertes ahora heredará hermosas tipografías, márgenes, estilos de tabla y colores oficiales de Arko360 de manera automática.
