# Bitácora de Arko 360 Platform

Este documento registra el estado actual del proyecto y los pasos pendientes para retomar el trabajo en cualquier momento.

## Estado Actual (Última actualización: 2026-06-03)

### ✅ Completado

1. **Backend desarrollado** - Endpoints completos en `backend/app/api/v1/endpoints/arko.py`:
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

### ⏳ Pendiente - Migración a DigitalOcean

**Estado:** Configuración de Docker completada, pendiente despliegue en DigitalOcean

**Pasos para desplegar en DigitalOcean:**

1. **Preparar el servidor:**
   ```bash
   # Conectar al servidor DigitalOcean
   ssh root@167.172.115.154

   # Clonar el repositorio si no existe
   cd /var/www
   git clone https://github.com/gynsys/arko360_platform.git
   cd arko360_platform
   ```

2. **Configurar variables de entorno:**
   - Crear `.env` en admin/ con `VITE_API_URL=https://api.arko360.net/api/v1`
   - Crear `.env` en landing/ con `VITE_API_URL=https://api.arko360.net/api/v1`

3. **Construir y levantar contenedores:**
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

4. **Configurar dominios:**
   - Asegurar que arko360.net apunte a la IP del servidor
   - Asegurar que admin.arko360.net apunte a la IP del servidor
   - Configurar DNS en el proveedor de dominios

5. **Configurar SSL (HTTPS):**
   - Instalar certbot en el servidor
   - Obtener certificados SSL para arko360.net y admin.arko360.net
   - Actualizar nginx.conf para usar HTTPS

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
