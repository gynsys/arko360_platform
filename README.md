# Arko 360 Platform

Plataforma integral de ingeniería estructural y gestión de proyectos, diseñada para automatizar cálculos normativos y generar presupuestos instantáneos mediante herramientas interactivas.

## Estructura del Proyecto

El repositorio sigue un formato monorepo que contiene:

- `landing/`: Frontend principal desarrollado en React 18 y Vite. Contiene la herramienta **ARKO3D** (Calculadora de Losas y Pórticos) con renderizado paramétrico interactivo (Three.js y SVG), y la **Calculadora de Pared de Mampostería** para presupuestos.
- `admin/` / `super-admin-frontend/`: Paneles de gestión y CMS para el contenido de la plataforma.
- `backend/`: API desarrollada en FastAPI (Python) para gestionar usuarios, configuraciones, autenticación, persistencia de presupuestos y alojar el **Motor Matemático FEM**.

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

## Resolución de Problemas y Ejecución Remota (Troubleshooting)

Al ejecutar comandos remotos desde el entorno local de Windows usando `ssh_runner.py`, es común encontrarse con los siguientes obstáculos (documentados para ahorrar tokens y tiempo futuro):

1. **Escapado de Comillas en PowerShell:** Evitar enviar consultas SQL con comillas simples y dobles anidadas directamente en el argumento de línea de comandos, ya que PowerShell corrompe el escapado (ej. fallará la consulta `SELECT * FROM tabla WHERE campo='valor'`). 
   - *Solución:* Crear un script `.sql` local, usar `python ssh_runner.py --upload script.sql /ruta/script.sql`, copiarlo al contenedor (`docker cp`) y ejecutarlo allí (`docker exec ... psql ... -f script.sql`).
2. **Ejecución de Scripts de Python vía Piped stdin:** Evitar usar tuberías (`cat script.py | docker compose exec -T backend python -`) desde Windows. El comando `cat` en PowerShell (`Get-Content`) envía saltos de línea con codificaciones incompatibles o se pierden variables de entorno como `PYTHONPATH`, arrojando errores de `ModuleNotFoundError`.
   - *Solución:* Modificar directamente la base de datos con SQL si es rápido, o en su defecto subir el archivo `.py` correctamente al servidor y ejecutarlo localmente dentro del contenedor indicando la ruta.

## Migración del Social Generator (GynSys a Arko360)

Durante la mañana se abordó la portabilidad de la interfaz y la lógica del Generador de Carruseles (heredado de GynSys) hacia Arko360. A continuación, las iteraciones y problemas resueltos:

1. **Migración de UI y Lógica:** Se confirmó la necesidad de traer el código fuente del generador desde GynSys hacia Arko360 (`admin/src/modules/biblioarko/pages/social-generator`).
2. **Vestigios de GynSys (Hardcoded Data):** La plantilla del carrusel (`SlideCanvas.jsx`) mantenía incrustado el nombre "Dra. Mariel Herrera" como autor por defecto en el header.
   - *Solución:* Se extrajo la configuración hacia el panel de administración global.
3. **Configuración Dinámica en Panel Admin:**
   - Se modificó `ProfilePage.jsx` para incluir un panel de "Generador de Redes Sociales" que permite establecer el `socialAuthorName` y subir una imagen de `socialBackgroundImage`.
   - Se trasladó la imagen `Arko 3.png` a la carpeta `admin/public/` para integrarla al sistema.
   - Se conectó `social-generator/index.jsx` para que descargara la configuración real (`siteConfig`) del endpoint `/arko/admin/config` en lugar de usar datos simulados (mock store).
4. **Problemas Técnicos de Inyección de Código (Python vs PowerShell):**
   - *Problema:* Al intentar inyectar un nuevo bloque JSX en `ProfilePage.jsx` usando un script `python -c` de una línea, el símbolo de comillas triples (`'''`) fue malinterpretado por PowerShell, causando un `SyntaxError`.
   - *Solución:* Se abandonó el enfoque del comando `python -c` y se utilizaron herramientas nativas de reemplazo de texto (`replace_file_content`) logrando inyectar el nuevo componente UI de forma atómica y segura.

## Módulo de Presupuestos (ArkoCost)

Durante el desarrollo de la hoja interactiva de presupuestos (`BudgetWorksheetPage.jsx`), se resolvieron múltiples desafíos de UI/UX y estado de React:

1. **Gestión de Estados Numéricos (Modales):**
   - *Problema:* Los inputs numéricos (como porcentajes e inflación) borraban los decimales mientras el usuario escribía, o se forzaban a `NaN`/`0` si el usuario borraba el contenido, impidiendo una edición fluida.
   - *Solución:* Se modificaron todos los `onChange` para guardar el valor puro del evento (`e.target.value` como String) en el estado local de React. La conversión matemática (ej. `parseFloat`) se delega exclusivamente al motor de validación del backend o al momento del submit.

2. **Renderizado de Modales por encima del Contexto de Apilamiento (Z-Index):**
   - *Problema:* El diseño requería que los menús superiores (Navbar) y el encabezado de la página quedaran fijos, lo cual crea nuevos contextos de apilamiento en CSS (Stacking Contexts). Esto causaba que los modales anidados dentro de la página no se pudieran centrar correctamente sobre toda la pantalla usando `fixed inset-0`.
   - *Solución:* Se extrajeron TODOS los modales fuera del árbol del DOM del componente usando **React Portals (`createPortal(..., document.body)`)**, permitiendo que cubran la pantalla completa y bloqueen la navegación de fondo de forma nativa.

3. **Arquitectura de Layout y Encabezados Pegajosos (Sticky Headers):**
   - *Desafío:* Mantener fijo tanto el nombre del presupuesto como los encabezados de la tabla de partidas (`CÓDIGO, DESCRIPCIÓN, TOTAL`) mientras se escrolea la larga lista de APUs.
   - *Iteración 1 (Flexbox Restringido):* Se intentó encapsular la tabla en un contenedor `flex-1 overflow-y-auto` con una altura máxima calculada. *Fallo:* Conflictos con el cálculo de `min-h-0` en componentes padres, causando que la tabla se desbordara y la página entera hiciera scroll, perdiendo el encabezado pegajoso.
   - *Iteración 2 (Posición Fija):* Se aisló toda la hoja en una capa `fixed inset-0`. *Fallo:* Comportamiento restrictivo y problemas de UX percibidos.
   - *Solución Definitiva (Scroll Global + Dynamic Sticky):* Se abandonó el confinamiento de flexbox. Se permitió a la tabla expandirse libremente y utilizar la **barra de desplazamiento global de la ventana** (mucho más robusto). Para fijar los encabezados:
     - El **Encabezado de la Página** usa `position: sticky top-[65px]` (justo debajo del Navbar).
     - El **Encabezado de la Tabla** usa un `position: sticky` con un offset `top` calculado dinámicamente mediante un **`ResizeObserver`** en React. Esto permite medir en tiempo real la altura del encabezado de la página y anclar la tabla matemáticamente debajo de él, logrando un flujo perfecto sin importar los cambios de resolución o el dispositivo.
