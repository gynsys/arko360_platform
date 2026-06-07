# Arko 360 Platform

Plataforma integral de ingeniería estructural y gestión de proyectos, diseñada para automatizar cálculos normativos y generar presupuestos instantáneos mediante herramientas interactivas.

## Estructura del Proyecto

El repositorio sigue un formato monorepo que contiene:

- `landing/`: Frontend principal desarrollado en React 18 y Vite. Contiene la Calculadora de Losas (Steel Deck, Aligerada, Maciza) con renderizado paramétrico SVG interactivo.
- `admin/` / `super-admin-frontend/`: Paneles de gestión y CMS para el contenido de la plataforma.
- `backend/`: API desarrollada en FastAPI (Python) para gestionar usuarios, configuraciones y el CMS.

## Despliegue

La plataforma está dockerizada y configurada para ser desplegada en un servidor en la nube (ej. DigitalOcean). 
Utiliza NGINX como reverse proxy para enrutar los dominios (`arko360.net`, `admin.arko360.net`, `api.arko360.net`).

Para reconstruir y subir cambios en producción, ejecutar:
```bash
./deploy.bat
```
*(Requiere acceso SSH configurado hacia el servidor de DigitalOcean).*

## Herramientas de Ingeniería (Calculadoras)

Ubicadas en `landing/src/components/tools/`, las calculadoras permiten diseño rápido:
- Renderizado SVG en tiempo real (grilla bidimensional).
- Detección de nodos y elementos con sistema "smart" de aberturas y huecos.
- Desglose y cálculo de metrados normativos de materiales (ACI 318, AISC 360).
