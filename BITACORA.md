# Bitácora de Arko 360 Platform

Este documento registra el estado actual del proyecto y los pasos pendientes para retomar el trabajo en cualquier momento.

## Estado Actual (Última actualización: 2026-06-10)

### ✅ Completado

1. **Herramienta Calculadora de Losas** - Implementado en `landing/src/components/tools/calculadoraLosas/`:
   - Cálculo normativo de Losa Colaborante (Steel Deck), Losa Aligerada y Losa Maciza.
   - Sistema Híbrido de Coordenadas (0,0 en esquina inferior izquierda) para definición de huecos y escaleras.
   - Renderizado SVG dinámico con sistema de máscaras para ocultamiento de vigas, correas y nodos huérfanos.
   - Auditoría JSON (`impactoAberturas`) de cantidades de acero, concreto y deck removido/agregado.

2. **Flujo ETABS en ARKO3D** - Implementado en el visor 3D web:
   - **Selección Masiva y Asignación:** Modales `SelectElementsModal` y `AssignSectionModal` para manipular vigas/columnas en lote.
   - **Wizard Avanzado:** Definición inicial de "Material Predominante" (Acero/Concreto) con preasignación de secciones por defecto.
   - **Tablas de Resultados Estilo ETABS:** Visor tabular que consolida Story, Element, Output Case, y las fuerzas internas ordenadas (P, V2, V3, T, M2, M3).
   - **Multi-Selección:** Soporte nativo para seleccionar múltiples elementos en R3F con tecla Shift/Ctrl.

3. **ARKO3D — Sesión 2026-06-10 (Selección y Navegación 2D):**
   - **Selección por Ventana (Window/Crossing):** Dibuja caja con clic izquierdo. Izq→Der = Window (azul, solo los que están adentro). Der→Izq = Crossing (verde punteado, los que toca). Shift/Ctrl acumula selección.
   - **Controles estilo ETABS:** Clic derecho = orbitar cámara, rueda = panear, clic izquierdo = seleccionar/ventana. Se deshabilitó el menú contextual del navegador en el canvas.
   - **Tip de controles:** Botón "Controles Mouse" en ViewControls con hover tooltip resumen de atajos.
   - **Sin layout en /arko3d:** El Navbar y Footer del sitio se ocultan en la ruta `/arko3d` para pantalla completa.
   - **Bug crítico resuelto — Vista Planta Z=3 (depth buffer):** Ver `ARKO3D_BUGS.md` para detalles completos. La causa raíz fue que los elementos transparentes de nivel Z=6 bloqueaban visualmente y para raycasting los elementos activos de Z=3 debido al depth buffer de WebGL. Solución: omitir completamente del render los elementos de otros niveles en vista 2D (igual que ETABS).
   - **Bug de closure stale en SelectionHandler:** El useEffect del handler de selección capturaba valores de nivel/vista al montar. Ahora lee `useStructureStore.getState()` en cada evento para siempre tener el estado actual.
   - **Bug de formato restraint:** El Wizard generaba `{ dofs: [...] }` pero NodePoint esperaba `{ ux, uy, uz, rx, ry, rz }`. Corregido en `generateStructure`.
   - **Documentación técnica:** Creado `landing/src/components/tools/fea3d/ARKO3D_BUGS.md` con registro detallado de bugs.

2. **Backend desarrollado** - Endpoints completos en `backend/app/api/v1/endpoints/arko.py`:
   - CRUD de blog (GET, POST, PUT, DELETE /api/v1/arko/admin/posts)
   - Autenticación (POST /api/v1/arko/auth/login)
   - Configuración del sitio (GET /api/v1/arko/config, PUT /api/v1/arko/admin/config)
   - Upload de imágenes (POST /api/v1/arko/admin/upload)

2. **Panel Admin frontend** - Implementado con:
   - Navegación lateral (Gestión Blog, Mi Perfil)
   - Página de gestión de blog con lista de artículos
   - Página de perfil con pestañas (Identidad, Apariencia, Contacto, Contenido, Módulos)
   - Botón de guardar en configuración de colores
   - Colores dinámicos conectados a configuración del sitio

3. **Landing Page frontend** - Desplegado con diseño moderno y responsive

4. **Corrección de URLs** - Error de `/api/v1/api/v1/` duplicado corregido en App.jsx y ProfilePage.jsx

5. **Docker configuration** - docker-compose.yml actualizado con:
   - Servicio admin-frontend (puerto 3001)
   - Servicio landing-frontend (puerto 3000)
   - Servicio backend (puerto 8001)
   - Servicio nginx principal (puertos 80, 443)
   - Base de datos PostgreSQL (puerto 5434)

6. **Nginx configuration** - nginx.conf creado para:
   - Servir landing page en arko360.net
   - Servir panel admin en admin.arko360.net
   - Proxy de API al backend

### ✅ Completado - Migración a DigitalOcean

**Estado:** Despliegue completado exitosamente en DigitalOcean

**Pasos completados:**

1. ✅ **Preparar el servidor:**
   - Conectado al servidor DigitalOcean (167.172.115.154)
   - Clonado el repositorio en /var/www/arko360_platform

2. ✅ **Configurar variables de entorno:**
   - Creado `.env` en admin/ con `VITE_API_URL=https://api.arko360.net/api/v1`
   - Creado `.env` en landing/ con `VITE_API_URL=https://api.arko360.net/api/v1`

3. ✅ **Construir y levantar contenedores:**
   - Construido con `docker compose build`
   - Levantado con `docker compose up -d`
   - Contenedores corriendo:
     - admin-frontend: puerto 3001
     - landing-frontend: puerto 3000
     - backend: puerto 8001
     - nginx: puerto 8080 (no usado, se usa nginx de GynSys)

4. ✅ **Configurar DNS en Namecheap:**
   - Configurados registros A para arko360.net, www.arko360.net, admin.arko360.net apuntando a 167.172.115.154

5. ✅ **Configurar nginx de GynSys:**
   - Agregadas configuraciones para arko360.net, www.arko360.net, admin.arko360.net en /etc/nginx/conf.d/arko360.conf del contenedor appgynsys-nginx-1
   - Configurado proxy:
     - arko360.net -> localhost:3000 (landing)
     - admin.arko360.net -> localhost:3001 (admin)
     - api.arko360.net -> localhost:8001 (backend)

6. ✅ **Configurar SSL (HTTPS):**
   - Obtenidos certificados SSL con certbot para arko360.net, www.arko360.net, admin.arko360.net
   - Actualizada configuración de nginx para usar HTTPS con redirección de HTTP a HTTPS
   - Recargado nginx en contenedor appgynsys-nginx-1

### 📝 Próximos pasos después del despliegue

1. **Conectar Panel Admin al Backend:**
   - Conectar la página de gestión de blog con los endpoints CRUD
   - Conectar la página de perfil con los endpoints de configuración
   - Implementar autenticación JWT en el frontend

2. **Funcionalidades pendientes:**
   - CRUD completo de artículos de blog
   - Gestión de perfil (logo, datos de contacto)
   - Integración de herramientas de ingeniería
   - Ajuste del generador de IA para contenido de arquitectura

### 🔗 Enlaces importantes

- **Repositorio:** https://github.com/gynsys/arko360_platform
- **Landing Page:** https://arko360.net
- **Panel Admin:** https://admin.arko360.net
- **Backend API:** https://api.arko360.net
- **Servidor DigitalOcean:** 167.172.115.154

### 🐛 Problemas conocidos

1. **Netlify:** Excedidos los créditos del plan gratis, migrando a Docker en DigitalOcean
2. **URL duplicada:** Corregido el error de `/api/v1/api/v1/` en las llamadas a API

### 📦 Stack tecnológico

- **Frontend (Admin):** React 18, Vite, TailwindCSS
- **Frontend (Landing):** React 18, Vite, Vanilla CSS
- **Backend:** FastAPI, Python
- **Base de datos:** PostgreSQL 14
- **Infraestructura:** Docker, Nginx, DigitalOcean
