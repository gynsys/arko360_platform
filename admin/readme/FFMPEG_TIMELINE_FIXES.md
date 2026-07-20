# Correcciones: FFmpeg WASM + Timeline Track History
**Fecha:** Julio 2026
**Modulo:** admin -> Social Generator -> Editor de Video

---

## 1. Problema Original: "Error al cargar el motor de video (FFmpeg)"

### Diagnostico
FFmpeg WebAssembly requiere SharedArrayBuffer del navegador. Para que funcione, el servidor
DEBE enviar estos dos headers HTTP en todas las respuestas:

    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp

Sin ellos, el navegador bloquea silenciosamente la carga del WASM y la promesa
ffmpegInstance.load() nunca resuelve ni rechaza -- se queda colgada indefinidamente.

### Causa adicional: CDN externo bloqueado
Inicialmente el codigo cargaba FFmpeg desde unpkg.com (CDN externo). Algunos navegadores
y redes bloquean imports de Workers desde origenes cruzados, causando el error:
"failed to import ffmpeg-core.js"

---

## 2. Correcciones Aplicadas

### 2.1 Servir FFmpeg localmente (sin CDN)

Los archivos de nucleo se copiaron desde node_modules a la carpeta public/:

    admin/public/ffmpeg/ffmpeg-core.js   (~112 KB)
    admin/public/ffmpeg/ffmpeg-core.wasm (~30 MB)

En VideoEditorModal.jsx se cambio la URL de carga:

    // ANTES (CDN externo - fallaba por CORS)
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js'

    // DESPUES (local - sin dependencia de red externa)
    const baseURL = `${window.location.origin}/ffmpeg`;
    coreURL: `${baseURL}/ffmpeg-core.js`
    wasmURL: `${baseURL}/ffmpeg-core.wasm`

### 2.2 Headers COOP/COEP -- ARQUITECTURA DE DOS NGINX

IMPORTANTE: La arquitectura tiene DOS capas de nginx:
  - Nginx HOST (admin.arko360.net.conf) -- el que recibe las peticiones de internet
  - Nginx Docker (admin/nginx.conf) -- interno al contenedor, sus headers se pierden en proxy

Los headers DEBEN agregarse al nginx del HOST:

Archivo en servidor: /etc/nginx/sites-enabled/admin.arko360.net.conf

    server {
        server_name admin.arko360.net;

        # REQUERIDO para FFmpeg WASM (SharedArrayBuffer)
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;

        location / {
            proxy_pass http://localhost:3001;
            ...
        }
    }

Para aplicar en el servidor:
    scp admin.arko360.net.conf root@167.172.115.154:/etc/nginx/sites-available/admin.arko360.net.conf
    nginx -t
    nginx -s reload

### 2.3 Vite Dev Server (desarrollo local)

En vite.config.js se agregaron los headers para desarrollo local:

    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },

---

## 3. Feature: Timeline / Track History de Textos

### Descripcion
Sistema de linea de tiempo para controlar aparicion/desaparicion de textos en video.

### Archivos modificados
- components/TimelinePanel.jsx    -- nuevo componente con tracks arrastrables
- components/SlideCanvas.jsx      -- textos y elementos respetan startTime/endTime
- hooks/useVideoExport.js         -- exportacion multipaso con captura por intervalos
- index.jsx                       -- integracion del panel, estado videoTime

### Propiedades anadidas a la estructura de slide
    slide.titleStartTime     // segundos en que aparece el titulo
    slide.titleEndTime       // segundos en que desaparece el titulo
    slide.contentStartTime   // segundos en que aparece el contenido
    slide.contentEndTime     // segundos en que desaparece el contenido
    el.startTime             // para elementos extra
    el.endTime

---

## 4. Arquitectura del Servidor

    Internet
       |
    Nginx HOST (puerto 80/443)          <-- aqui van los headers COOP/COEP
    admin.arko360.net.conf
       | proxy_pass localhost:3001
    Nginx Docker (puerto 3001->80)      <-- este nginx NO aplica headers al exterior
    admin/nginx.conf
       | serve static files
    dist/
       +-- ffmpeg/
           +-- ffmpeg-core.js
           +-- ffmpeg-core.wasm         <-- 30MB, se cachea en el navegador
