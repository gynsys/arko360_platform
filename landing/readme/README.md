# Ingeniería Arko 360 - Landing Page

Esta es la documentación oficial para la Landing Page de **Ingeniería Arko 360**. Este proyecto es parte del ecosistema **arko360_platform**, un proyecto totalmente independiente de GynSys con su propio dominio (arko360.net) y su propia infraestructura.

---

## 🏗️ 1. Arquitectura General del Proyecto

**arko360_platform** es un proyecto monorepositorio que contiene:

- **landing/**: Frontend público (React + Vite) - Desplegado en Netlify en `arko360.net`
- **admin/**: Panel de administración (React + Vite) - Desplegado en Netlify en `admin.arko360.net`
- **backend/**: API REST (FastAPI) - Desplegado en Docker en DigitalOcean (puerto 8001)

**Aislamiento Total:**
- Base de datos PostgreSQL separada (puerto 5434)
- Autenticación JWT independiente (`arko_token`)
- Dominio propio: `arko360.net` y `admin.arko360.net`
- Repositorio Git independiente: `github.com/gynsys/arko360_platform`

---

## 🎨 2. Stack Tecnológico de la Landing Page

El proyecto está construido bajo una arquitectura moderna pero deliberadamente simple, enfocada en rendimiento y alto impacto visual:

- **Framework Core:** React 18
- **Build Tool:** Vite (rápido, HMR instantáneo)
- **Estilos:** Vanilla CSS (Puro). **NO SE USA TAILWIND**. Todo el diseño está centralizado en un Design System personalizado en `index.css`.
- **Animaciones:** Framer Motion (para entradas suaves al hacer scroll y modales)
- **Iconografía:** Lucide React (ligeros, consistentes y vectoriales)
- **Formularios:** React Hook Form (para validación eficiente del formulario de contacto sin re-renders innecesarios)
- **Enrutamiento Base:** `/` (Configurado en `vite.config.js` - proyecto independiente)
- **Despliegue:** Netlify (automático via Git push)

---

## 📂 3. Estructura de Directorios

```text
arko360_platform/
├── landing/                # Frontend público (arko360.net)
│   ├── dist/              # (Generado) Código compilado de producción
│   ├── public/            # Assets estáticos (Logo, imágenes)
│   │   └── images/        # Logo y assets de imagen
│   ├── src/
│   │   ├── components/    # Componentes UI (Navbar, Hero, About, Portfolio, etc.)
│   │   │   ├── tools/     # Herramientas de ingeniería (Calculadora de Losas, etc.)
│   │   │   │   └── calculadoraLosas/  # Calculadora de losas (maciza, aligerada, colaborante)
│   │   │   │       ├── CalculadoraLosas.jsx  # Componente principal
│   │   │   │       ├── LosaMaciza.jsx        # Losa maciza (ACI 318-19)
│   │   │   │       ├── LosaLigera.jsx        # Losa aligerada (ACI 318-19)
│   │   │   │       ├── LosaColaborante.jsx   # Losa colaborante (ACI 318-19 + AISC 360-16)
│   │   │   │       ├── visualizacion.jsx     # Funciones de visualización SVG
│   │   │   │       ├── catalogoPerfiles.js    # Catálogo de perfiles AISC (W, C)
│   │   │   │       └── utilidades.js         # Funciones de cálculo compartidas
│   │   ├── hooks/         # Custom Hooks (ej. useContactForm.js)
│   │   ├── services/      # Conexiones externas (api.js para envíos de correo)
│   │   ├── App.jsx        # Contenedor principal que ensambla la Landing
│   │   ├── main.jsx       # Punto de entrada de React
│   │   └── index.css      # DESIGN SYSTEM: Core de estilos y utilidades
│   ├── netlify.toml       # Configuración de despliegue en Netlify
│   ├── vite.config.js     # Configuración de compilación de Vite
│   └── package.json       # Dependencias
│
├── admin/                  # Panel de administración (admin.arko360.net)
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/    # AdminLayout, AdminHeader
│   │   ├── pages/
│   │   │   └── admin/     # BlogManagementPage, ProfilePage
│   │   └── App.jsx        # Rutas del panel admin
│   ├── netlify.toml       # Configuración de despliegue en Netlify
│   └── package.json       # Dependencias
│
├── backend/                # API REST (FastAPI)
│   ├── app/
│   │   ├── main.py        # Punto de entrada de FastAPI
│   │   ├── api/           # Rutas de la API
│   │   └── models/        # Modelos de base de datos
│   └── docker-compose.yml # Configuración de contenedores
│
└── docker-compose.yml      # Orquestación de contenedores (backend + db)
```

---

## 🎨 4. Design System (`index.css`)

Todo el aspecto visual se controla desde `src/index.css`. Antes de crear CSS inline o clases nuevas, se deben aprovechar las variables y utilidades ya existentes.

### Paleta de Colores (Variables CSS)
Basados en el logo oficial:
- **Azul Principal:** `--primary: #1A6BB5;` (Se usa en botones primarios, acentos y overlays).
- **Gris/Negro:** `--secondary: #3D3D3D;` (Se usa en títulos principales `h1`, `h2`).
- **Fondos:** `--bg: #F8FAFC;` (Gris súper claro para secciones alternas) y `--white: #FFFFFF;`.
- **Textos:** `--text: #1F2937;` (Párrafos) y `--text-muted: #6B7280;` (Subtítulos).

### Utilidades Globales
Existen clases predefinidas para agilizar el desarrollo:
- `.container`: Centra el contenido a un máximo de `1200px` con padding lateral.
- `.section`: Aplica un padding vertical generoso (`96px`) estándar para cada bloque de la página.
- `.section-tag`: Genera la etiqueta pequeña redondeada con fondo azul translúcido (ej. "Sobre Nosotros").
- `.section-title`: Formato para los títulos de sección (fuente condensada, negrita, tamaño fluido responsivo).
- Botones: `.btn`, `.btn-primary`, `.btn-outline`, `.btn-white`.

---

## 📱 5. Reglas del Responsive Web Design (RWD)

El proyecto es "Mobile-First" mentalmente, pero adaptado usando Media Queries tradicionales (`@media (max-width: 768px)`).
Si vas a modificar componentes, ten en cuenta:

1. **Flexbox/Grid:** Los contenedores principales usan `display: grid` o `display: flex; flex-wrap: wrap`.
2. **Fuentes Fluidas:** Los tamaños de letra principales usan `clamp()` (ej. `font-size: clamp(32px, 5vw, 52px)`), por lo que se achican automáticamente sin necesidad de media queries.
3. **Navbar:** Tiene un script que detecta si el usuario está arriba (menú transparente con logo blanco) o si ha hecho scroll (menú blanco con logo original). En móviles (`< 768px`), el logo se reduce a `42px` para no deformar la barra superior.

---

## 🚀 6. Flujo de Desarrollo Local

Si necesitas agregar una nueva sección (ej. "Preguntas Frecuentes"):

1. Entra a la carpeta: `cd C:\Users\pablo\Documents\arko360_platform\landing`
2. Inicia el servidor de Vite: `npm run dev`
3. Abre tu navegador en `http://localhost:5174/` (Nota: El path base es `/`).
4. Crea tu nuevo componente en `src/components/FAQ.jsx`.
5. Impórtalo en `src/App.jsx`.
6. Añade los estilos al final de `src/index.css` (o respeta las reglas de componentes existentes).

---

## 🌐 7. Proceso de Despliegue a Producción

**arko360_platform** es un proyecto totalmente independiente con despliegue automático en Netlify via Git push.

### Despliegue de la Landing Page (arko360.net)

Para actualizar el sitio en vivo, simplemente:

```powershell
# 1. Ve a la carpeta de la landing page
cd C:\Users\pablo\Documents\arko360_platform\landing

# 2. Compila el código (Minifica React y CSS)
npm run build

# 3. Commitea y sube los cambios a GitHub
cd ..
git add landing/
git commit -m "feat(landing): descripción de lo que cambiaste"
git push
```

**¿Cómo funciona?**
- Netlify detecta automáticamente el push a GitHub
- Lee la configuración en `landing/netlify.toml`
- Ejecuta `npm run build` en el servidor de Netlify
- Despliega el contenido de `landing/dist/` a `arko360.net`

### Despliegue del Panel Admin (admin.arko360.net)

El proceso es idéntico para el panel admin:

```powershell
# 1. Ve a la carpeta del panel admin
cd C:\Users\pablo\Documents\arko360_platform\admin

# 2. Compila el código
npm run build

# 3. Commitea y sube los cambios a GitHub
cd ..
git add admin/
git commit -m "feat(admin): descripción de lo que cambiaste"
git push
```

### Despliegue del Backend (DigitalOcean)

El backend se despliega en contenedores Docker en DigitalOcean:

```powershell
# 1. Usa el script ssh_runner.py desde appgynsys
cd C:\Users\pablo\Documents\appgynsys

# 2. Ejecuta comandos en el servidor
python ssh_runner.py "cd /root/arko360_platform && docker-compose pull && docker-compose up -d"
```

---

## 📧 8. Configuración de Formularios

El formulario de contacto (`src/components/Contact.jsx`) usa `src/hooks/useContactForm.js` para enviar datos. 
Actualmente, las llamadas apuntan a un mock o una ruta API configurada en `api.js`. Si vas a conectarlo a un backend real (ej. SendGrid o un webhook), debes:

1. Abrir `src/services/api.js`.
2. Modificar la función `submitContactForm` para que haga un `fetch()` o `axios.post()` a tu servidor real.
3. Asegurarte de que la API retorne una respuesta 200 OK para que el formulario muestre la pantalla verde de "¡Mensaje Enviado!".

---

## 🔗 9. Enlaces Importantes

- **Landing Page:** https://arko360.net
- **Panel Admin:** https://admin.arko360.net
- **Backend API:** https://api.arko360.net (puerto 8001)
- **Repositorio:** https://github.com/gynsys/arko360_platform
- **Servidor DigitalOcean:** 167.172.115.154

---
*Documento actualizado el 2 de Junio de 2026 - Proyecto arko360_platform independiente.*
