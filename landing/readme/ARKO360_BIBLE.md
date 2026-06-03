# La Biblia de Arko 360 🏗️

Este documento registra la arquitectura, decisiones técnicas y el historial de iteraciones en la construcción del ecosistema **Arko 360** como un proyecto totalmente independiente.

## 1. Concepto y Arquitectura 🏛️

**Objetivo:** Desarrollar una plataforma propia para la empresa de arquitectura e ingeniería (Arko 360) como un proyecto totalmente independiente con su propio dominio, repositorio e infraestructura.

**Independencia Total:**
- **Dominio Propio:** `arko360.net` (landing page) y `admin.arko360.net` (panel admin)
- **Repositorio Independiente:** `github.com/gynsys/arko360_platform`
- **Infraestructura Separada:** Backend en Docker en DigitalOcean (puerto 8001), base de datos PostgreSQL separada (puerto 5434)
- **Aislamiento de Datos:** Las tablas de la base de datos de Arko (`arko_posts`, `arko_projects`, `arko_admins`) son completamente independientes.
- **Aislamiento de Autenticación:** Arko 360 utiliza un JWT propio (`arko_token`) emitido y validado exclusivamente contra la tabla `arko_admins`.
- **Despliegue Independiente:** Frontend desplegado en Netlify con Git push automático.

---

## 2. Historial de Iteraciones y Desafíos Resueltos ⚙️

### Iteración 1: Calculadora de Diseño de Mezclas (Tesis de Ingeniería)
- **Desafío:** Extraer y portar la lógica matemática de un archivo Excel validado en la tesis de ingeniería civil del usuario (`app diseño de mezclas.xlsx`).
- **Solución:**
  - Se analizó el Excel utilizando scripts de Python locales (OpenPyXL) para extraer el motor de cálculo basado en regresiones lineales e interpolaciones logarítmicas, en lugar de utilizar simples tablas estáticas.
  - Se construyó el componente `MixDesignCalculator.jsx` en React que procesa Volumen, Resistencia ($f'_c$), Asentamiento, y Propiedades Físicas de Agregados para entregar resultados precisos en milisegundos.
  - **Estado:** ✅ Completado, testeado y subido a producción (`30249cdb`).

### Iteración 2: El Modelo de Datos y el Laberinto de Alembic
- **Desafío:** Modelar el backend de Arko (Posts y Proyectos) e inyectarlo en la base de datos PostgreSQL de producción.
- **Incidencias (Troubleshooting Alembic):**
  - **Bloqueo Local:** El servidor local de Docker PostgreSQL estaba apagado (`Connection refused` en el puerto 5433), imposibilitando la generación local de migraciones.
  - **Generación Remota:** Decidimos utilizar `ssh_runner.py` para generar la migración `alembic revision --autogenerate` directamente dentro del contenedor del VPS.
  - **Problema de Ramas Múltiples:** Descubrimos que el árbol de migraciones de producción (Alembic) estaba roto (`Multiple head revisions are present`) debido a que archivos antiguos generados (`c6aa46e17027` y `3787361c3e45`) habían sido purgados por un comando `git clean -fd`.
  - **Solución Definitiva:**
    1. Se recrearon localmente las migraciones perdidas (archivos *dummy*) y se pushearon a Git para reparar el grafo de dependencias de Alembic.
    2. Se creó un script manual en Python (`fix_alembic.py` y `fix2.py`) usando SQLAlchemy para apuntar la tabla de control `alembic_version` al *head* correcto.
    3. Ante la rebeldía del autogenerate, aplicamos inyección directa de SQL (DDL) mediante `fix_arko.py` para construir la tabla `arko_admins` e insertar el campo `seo_config`.
  - **Estado:** ✅ Completado. Las tablas están sanas en producción.

### Iteración 4: Error de Despliegue Estático ("Ni calculadora ni icono")
- **Desafío:** El usuario no podía ver las nuevas rutas de Arko 360 (Calculadora) ni el ícono de acceso al Dashboard en la Landing Page de GynSys, a pesar de que el código fuente local fue actualizado y pusheado a Git.
- **Análisis del Error Raíz (Post-Mortem):**
  - **Error:** Se realizó un despliegue manual mediante `scp -r frontend/dist/*` hacia el servidor VPS (`/var/www/html/`).
  - **Causa:** ¡Nunca se ejecutó `npm run build` en la carpeta `frontend` antes del `scp`! Como la carpeta `dist` está en el `.gitignore`, GitHub no la versiona. El servidor de producción estaba recibiendo una carpeta `dist` antigua que **no contenía** el componente `MixDesignCalculator.jsx` ni el nuevo Header compilado.
  - **Lección Aprendida:** Jamás confiar en hacer `scp` directo de un directorio ignorado (`dist`) sin compilar explícitamente (`npm run build`) justo antes de subir los archivos estáticos.
- **Solución:**
  1. Se compiló el frontend de GynSys correctamente.
  2. Se movió el ícono React Icon (`LayoutDashboard`) al **Header** de `LandingPage.jsx` para acceso directo al admin.
  3. Se resubió la carpeta `dist` actualizada.
- **Estado:** ✅ Completado y documentado en la Biblia.

### Iteración 3: Sistema de Autenticación Propio
- **Desafío:** Garantizar que GynSys y Arko no crucen credenciales de seguridad.
- **Solución:**
  - Backend: Se creó `get_current_arko_admin` y `/api/v1/arko/auth/login`. Este endpoint valida exclusivamente contra `arko_admins` e inyecta el `token_type: arko_admin`.
  - Frontend: Se creó el archivo `ArkoLogin.jsx` que almacena el token de sesión en `localStorage.getItem('arko_token')` (totalmente al margen de la sesión médica de `access_token` de GynSys).
  - Se configuró la cuenta semilla de producción: `admin@arko360.com` / `Arko360.admin`.
  - **Estado:** ✅ Completado y desplegado.

---

## 3. Estado Actual (Dónde Estamos) 📍

1. **Independencia Total:** Proyecto totalmente separado de GynSys con dominio propio (arko360.net) y repositorio independiente (github.com/gynsys/arko360_platform).
2. **Landing Page:** Desplegada en Netlify (arko360.net) con diseño moderno y responsive.
3. **Panel Admin:** Implementado y desplegado en Netlify (admin.arko360.net) con:
   - Navegación lateral (Gestión Blog, Mi Perfil)
   - Página de gestión de blog con lista de artículos
   - Página de perfil con pestañas (Identidad, Apariencia, Contacto, Contenido, Módulos)
4. **Backend:** Operativo en Docker en DigitalOcean (puerto 8001) con endpoints protegidos para Arko.
5. **Base de Datos:** PostgreSQL separada (puerto 5434) con tablas independientes.
6. **Autenticación:** Sistema JWT propio (`arko_token`) completamente aislado de GynSys.

## 4. Próximos Pasos (Roadmap) 🚀

- [ ] **Conexión del Panel Admin al Backend:** Conectar las páginas del panel admin (Gestión Blog, Mi Perfil) con los endpoints del backend de Arko.
- [ ] **CRUD de Artículos de Blog:** Implementar funcionalidad completa para crear, editar, eliminar y publicar artículos.
- [ ] **Gestión de Perfil:** Implementar funcionalidad para actualizar la información de la empresa (logo, datos de contacto, etc.).
- [ ] **Ajuste del Generador de IA:** Adaptar el *prompt* maestro (que originalmente generaba "Casos Clínicos Médicos") para que redacte "Proyectos de Arquitectura", "Diseño Estructural" y "Consejos de Construcción".
- [ ] **Integración de Herramientas:** Integrar la calculadora de diseño de mezclas y otras herramientas de ingeniería en el panel admin.
