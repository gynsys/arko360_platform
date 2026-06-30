# BitÃ¡cora de Arko 360 Platform

Este documento registra el estado actual del proyecto y los pasos pendientes para retomar el trabajo en cualquier momento.

## Estado Actual (Ãltima actualizaciÃ³n: 2026-06-10)

### â Completado

1. **Herramienta Calculadora de Losas** - Implementado en `landing/src/components/tools/calculadoraLosas/`:
   - CÃ¡lculo normativo de Losa Colaborante (Steel Deck), Losa Aligerada y Losa Maciza.
   - Sistema HÃ­brido de Coordenadas (0,0 en esquina inferior izquierda) para definiciÃ³n de huecos y escaleras.
   - Renderizado SVG dinÃ¡mico con sistema de mÃ¡scaras para ocultamiento de vigas, correas y nodos huÃ©rfanos.
   - AuditorÃ­a JSON (`impactoAberturas`) de cantidades de acero, concreto y deck removido/agregado.

2. **Flujo ETABS en ARKO3D** - Implementado en el visor 3D web:
   - **SelecciÃ³n Masiva y AsignaciÃ³n:** Modales `SelectElementsModal` y `AssignSectionModal` para manipular vigas/columnas en lote.
   - **Wizard Avanzado:** DefiniciÃ³n inicial de "Material Predominante" (Acero/Concreto) con preasignaciÃ³n de secciones por defecto.
   - **Tablas de Resultados Estilo ETABS:** Visor tabular que consolida Story, Element, Output Case, y las fuerzas internas ordenadas (P, V2, V3, T, M2, M3).
   - **Multi-SelecciÃ³n:** Soporte nativo para seleccionar mÃºltiples elementos en R3F con tecla Shift/Ctrl.

3. **ARKO3D â SesiÃ³n 2026-06-10 (SelecciÃ³n y NavegaciÃ³n 2D):**
   - **SelecciÃ³n por Ventana (Window/Crossing):** Dibuja caja con clic izquierdo. IzqâDer = Window (azul, solo los que estÃ¡n adentro). DerâIzq = Crossing (verde punteado, los que toca). Shift/Ctrl acumula selecciÃ³n.
   - **Controles estilo ETABS:** Clic derecho = orbitar cÃ¡mara, rueda = panear, clic izquierdo = seleccionar/ventana. Se deshabilitÃ³ el menÃº contextual del navegador en el canvas.
   - **Tip de controles:** BotÃ³n "Controles Mouse" en ViewControls con hover tooltip resumen de atajos.
   - **Sin layout en /arko3d:** El Navbar y Footer del sitio se ocultan en la ruta `/arko3d` para pantalla completa.
   - **Bug crÃ­tico resuelto â Vista Planta Z=3 (depth buffer):** Ver `ARKO3D_BUGS.md` para detalles completos. La causa raÃ­z fue que los elementos transparentes de nivel Z=6 bloqueaban visualmente y para raycasting los elementos activos de Z=3 debido al depth buffer de WebGL. SoluciÃ³n: omitir completamente del render los elementos de otros niveles en vista 2D (igual que ETABS).
   - **Bug de closure stale en SelectionHandler:** El useEffect del handler de selecciÃ³n capturaba valores de nivel/vista al montar. Ahora lee `useStructureStore.getState()` en cada evento para siempre tener el estado actual.
   - **Bug de formato restraint:** El Wizard generaba `{ dofs: [...] }` pero NodePoint esperaba `{ ux, uy, uz, rx, ry, rz }`. Corregido en `generateStructure`.
   - **DocumentaciÃ³n tÃ©cnica:** Creado `landing/src/components/tools/fea3d/ARKO3D_BUGS.md` con registro detallado de bugs.

4. **ARKO3D â SesiÃ³n 2026-06-27 (OptimizaciÃ³n y CorrecciÃ³n MatemÃ¡tica FEA):**
   - **Bug crÃ­tico de Loop Infinito (requestAnimationFrame):** Se envolviÃ³ `THREE.EdgesGeometry` en un `useMemo` en `StructureCanvas.jsx` para evitar el recÃ¡lculo a 60fps de los bordes 3D, lo cual congelaba el navegador y generaba un timeout del servidor.
   - **CORS y API apuntando a localhost:** Se inyectÃ³ `VITE_API_URL` en los archivos `.env` de producciÃ³n para los frontends en Docker, forzando un re-build y asegurando que las peticiones se dirijan correctamente a `api.arko360.net`.
   - **Diagramas de Esfuerzos Discontinuos (Galpones Tapered):** Corregida la recuperaciÃ³n de fuerzas internas (`f_loc_end`) en `solvers.py`. Anteriormente se ensamblaba con la rigidez de Tapered, pero se recuperaban fuerzas usando la rigidez de viga prismÃ¡tica con parÃ¡metros base diminutos. Ahora se utiliza consistentemente `get_tapered_3d_frame_local_stiffness`, restaurando el equilibrio de nudos y mostrando diagramas de momento continuos reales (y momentos precisos en columnas).
   - Todo documentado detalladamente en `ARKO3D_BUGS.md`.

5. **Backend desarrollado** - Endpoints completos en `backend/app/api/v1/endpoints/arko.py`:
   - CRUD de blog (GET, POST, PUT, DELETE /api/v1/arko/admin/posts)
   - AutenticaciÃ³n (POST /api/v1/arko/auth/login)
   - ConfiguraciÃ³n del sitio (GET /api/v1/arko/config, PUT /api/v1/arko/admin/config)
   - Upload de imÃ¡genes (POST /api/v1/arko/admin/upload)

6. **Panel Admin frontend** - Implementado con:
   - NavegaciÃ³n lateral (GestiÃ³n Blog, Mi Perfil)
   - PÃ¡gina de gestiÃ³n de blog con lista de artÃ­culos
   - PÃ¡gina de perfil con pestaÃ±as (Identidad, Apariencia, Contacto, Contenido, MÃ³dulos)
   - BotÃ³n de guardar en configuraciÃ³n de colores
   - Colores dinÃ¡micos conectados a configuraciÃ³n del sitio

7. **Landing Page frontend** - Desplegado con diseÃ±o moderno y responsive

8. **CorrecciÃ³n de URLs** - Error de `/api/v1/api/v1/` duplicado corregido en App.jsx y ProfilePage.jsx

9. **Docker configuration** - docker-compose.yml actualizado con:
   - Servicio admin-frontend (puerto 3001)
   - Servicio landing-frontend (puerto 3000)
   - Servicio backend (puerto 8001)
   - Servicio nginx principal (puertos 80, 443)
   - Base de datos PostgreSQL (puerto 5434)

10. **Nginx configuration** - nginx.conf creado para:
   - Servir landing page en arko360.net
   - Servir panel admin en admin.arko360.net
   - Proxy de API al backend

### â Completado - MigraciÃ³n a DigitalOcean

**Estado:** Despliegue completado exitosamente en DigitalOcean

**Pasos completados:**

1. â **Preparar el servidor:**
   - Conectado al servidor DigitalOcean (167.172.115.154)
   - Clonado el repositorio en /var/www/arko360_platform

2. â **Configurar variables de entorno:**
   - Creado `.env` en admin/ con `VITE_API_URL=https://api.arko360.net/api/v1`
   - Creado `.env` en landing/ con `VITE_API_URL=https://api.arko360.net/api/v1`

3. â **Construir y levantar contenedores:**
   - Construido con `docker compose build`
   - Levantado con `docker compose up -d`
   - Contenedores corriendo:
     - admin-frontend: puerto 3001
     - landing-frontend: puerto 3000
     - backend: puerto 8001
     - nginx: puerto 8080 (no usado, se usa nginx de GynSys)

4. â **Configurar DNS en Namecheap:**
   - Configurados registros A para arko360.net, www.arko360.net, admin.arko360.net apuntando a 167.172.115.154

5. â **Configurar nginx de GynSys:**
   - Agregadas configuraciones para arko360.net, www.arko360.net, admin.arko360.net en /etc/nginx/conf.d/arko360.conf del contenedor appgynsys-nginx-1
   - Configurado proxy:
     - arko360.net -> localhost:3000 (landing)
     - admin.arko360.net -> localhost:3001 (admin)
     - api.arko360.net -> localhost:8001 (backend)

6. â **Configurar SSL (HTTPS):**
   - Obtenidos certificados SSL con certbot para arko360.net, www.arko360.net, admin.arko360.net
   - Actualizada configuraciÃ³n de nginx para usar HTTPS con redirecciÃ³n de HTTP a HTTPS
   - Recargado nginx en contenedor appgynsys-nginx-1

### ð PrÃ³ximos pasos despuÃ©s del despliegue

1. **Conectar Panel Admin al Backend:**
   - Conectar la pÃ¡gina de gestiÃ³n de blog con los endpoints CRUD
   - Conectar la pÃ¡gina de perfil con los endpoints de configuraciÃ³n
   - Implementar autenticaciÃ³n JWT en el frontend

2. **Funcionalidades pendientes:**
   - CRUD completo de artÃ­culos de blog
   - GestiÃ³n de perfil (logo, datos de contacto)
   - IntegraciÃ³n de herramientas de ingenierÃ­a
   - Ajuste del generador de IA para contenido de arquitectura

### ð Enlaces importantes

- **Repositorio:** https://github.com/gynsys/arko360_platform
- **Landing Page:** https://arko360.net
- **Panel Admin:** https://admin.arko360.net
- **Backend API:** https://api.arko360.net
- **Servidor DigitalOcean:** 167.172.115.154

### ð Problemas conocidos

1. **Netlify:** Excedidos los crÃ©ditos del plan gratis, migrando a Docker en DigitalOcean
2. **URL duplicada:** Corregido el error de `/api/v1/api/v1/` en las llamadas a API

### ð¦ Stack tecnolÃ³gico

- **Frontend (Admin):** React 18, Vite, TailwindCSS
- **Frontend (Landing):** React 18, Vite, Vanilla CSS
- **Backend:** FastAPI, Python
- **Base de datos:** PostgreSQL 14
- **Infraestructura:** Docker, Nginx, DigitalOcean

- [x] **Resolución de Problemas del Blog (2026-06-29):**
  - **Error subida de imágenes en Quill:** Ajustado el backend para retornar 'url' en lugar de 'filename'. Arreglado el parseo de la ruta en el uploader de ReactQuill.
  - **Migración artículo HTML (Sismicidad):** Creado parser y script de inyección para convertir HTML estático de descargas e insertarlo por API en la DB, aislando estilos perjudiciales.
  - **Desconexión del Frontend:** 'BiblioArticle.jsx' extraía datos falsos estáticos ('cmsData'). Refactorizado para usar la API en vivo ('getArticleBySlug' en 'api.js') con 'dangerouslySetInnerHTML' y clases globales (.article-content) limpias añadidas en 'index.css'. Documentación detallada añadida en 'readme/problemas_blog_2026.md'.

