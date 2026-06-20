# Arko 360 Platform

Plataforma integral de ingeniería estructural y gestión de proyectos, diseñada para automatizar cálculos normativos y generar presupuestos instantáneos mediante herramientas interactivas.

## Estructura del Proyecto

El repositorio sigue un formato monorepo que contiene:

- `landing/`: Frontend principal desarrollado en React 18 y Vite. Contiene la herramienta **ARKO3D** (Calculadora de Losas y Pórticos) con renderizado paramétrico interactivo (Three.js y SVG).
- `admin/` / `super-admin-frontend/`: Paneles de gestión y CMS para el contenido de la plataforma.
- `backend/`: API desarrollada en FastAPI (Python) para gestionar usuarios, configuraciones y alojar el **Motor Matemático FEM**.

## Despliegue

La plataforma está dockerizada y configurada para ser desplegada en un servidor en la nube (ej. DigitalOcean). 
Utiliza NGINX como reverse proxy para enrutar los dominios (`arko360.net`, `admin.arko360.net`, `api.arko360.net`).

Para reconstruir y subir cambios en producción, ejecutar:
```bash
./deploy.bat
```

## ARKO3D - Motor de Elementos Finitos (FEM)

ARKO3D es la herramienta de diseño estructural en la nube integrada en Arko360. Su arquitectura se divide en:

1. **Frontend Visual (React + Three.js):** 
   - Generación de mallas paramétricas (`Auto Meshing`) adaptativas a partir de formas arbitrarias.
   - Representación interactiva 3D de elementos estructurales (Pórticos y Losas/Shells).
   - Asignación visual de Cargas Puntuales, Lineales y Cargas de Área (Parches de Equipos).
   - Motor de "Heatmaps" (Mapas de Calor) para la representación topológica de los esfuerzos internos ($M_{11}$, $M_{22}$, etc.).

2. **Backend Matemático (Python + SciPy):**
   - Solver matricial disperso (Sparse Matrix Solver) ultra-rápido de 6 grados de libertad por nudo.
   - **Formulación Frame (3D):** Elementos finitos de barra 3D considerando deformación axial, cortante, flexión y torsión.
   - **Formulación Shell:** Elemento finito híbrido "Quad de 4 Nudos" (Placa + Membrana) formulado matemáticamente para cálculos de deflexiones y esfuerzos internos en losas.
   - **Grid Integration:** Algoritmo avanzado que subdivide "Parches de Carga" (Áreas de Equipos) en cientos de micro-cargas virtuales, y utiliza funciones de forma bilineales ($N_i$) para transferirlas armónicamente a los nudos de la malla sin usar costosos recortes de polígonos.

## Bitácora de Desarrollo (Hitos y Planes)

El desarrollo del motor ARKO3D se rige por un marco de planificación estructurada. A continuación la bitácora de planes actuales:

- [x] **Plan 1: Desarrollo del Módulo de Galpones (Naves Industriales).**
  - Generador paramétrico de pórticos industriales a dos aguas.
  - Generación de cargas de viento.
  - *Estado: Implementado y funcional.*

- [x] **Plan 2: Desarrollo de Elementos Shell (Cálculo de Losas).**
  - Incorporación del elemento finito Shell Quad de 4 nudos en el backend.
  - Implementación del Auto-Meshing en frontend.
  - Creación del sistema de renderizado de Mapas de Calor interactivos.
  - *Estado: Implementado.*

- [x] **Plan 3: Cargas de Área sobre Losas (Grid Integration).**
  - Sistema para aplicar cargas distribuidas locales ("Parches" para simular equipos pesados sin castigar los nudos con cargas súper-puntuales).
  - Matemáticas de subdivisión de parches y funciones de forma bilineales interpoladas.
  - *Estado: Implementado.*

## Base de Datos (PostgreSQL)

La plataforma utiliza una base de datos PostgreSQL alojada y gestionada dentro de contenedores de Docker.

### Estructura de Tablas y Esquemas
La base de datos se denomina `arko360` y se particiona conceptualmente en varias áreas:
- **Gynsys / Plataforma Médica (Heredado):** Tablas originales de pacientes, citas y doctores (SaaS).
- **Arko Admin (`arko_admins`):** Usuarios superadministradores que pueden acceder al CMS generador de plantillas en `superadmin.arko360.net`.
- **Landing Sites (`landing_sites`):** Entidades de los clientes a los cuales se les generó una página web independiente. Contiene el "slug" (ej. `/mi-empresa`), las configuraciones de diseño (`site_config` almacenado como JSONB) y las credenciales individuales de los clientes.

### Tecnologías Utilizadas
- **ORM:** `SQLAlchemy` para mapeo objeto-relacional desde Python (FastAPI).
- **Tipos de datos avanzados:** Uso intensivo de `JSONB` para almacenar las configuraciones flexibles (colores, imágenes, textos del header, testimonios) que cada cliente configura desde su panel y que la landing page dibuja de forma dinámica.

### Migraciones y Conexiones
Para conectarse y gestionar la base de datos en producción:
- El contenedor se llama `arko360_platform-db-1`.
- Los datos son persistentes a través del volumen `arko_db_data`.
- Ejecutar queries manuales en producción: `docker exec -it arko360_platform-db-1 psql -U arko_user -d arko360`.

