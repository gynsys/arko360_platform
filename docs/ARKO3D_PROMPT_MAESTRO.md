# Prompt Maestro - ARKO3D Platform

Este documento es el manifiesto fundacional y hoja de ruta viva de ARKO3D. Al estar en pleno desarrollo, este documento es **escalable**, por lo que crecerá orgánicamente a medida que se implementen nuevas fases.

## 0. Visión y Objetivo Principal (El Prompt Original)
> **Objective:** Design a full-stack, scalable, multi-tenant SaaS MVP for the modeling, 3D visualization, and finite element analysis (FEA) of civil structures. The MVP focuses on reinforced concrete frames (beams/columns) and shear/retaining walls. Steel design and flat slab shells are architected behind a Strategy Pattern but deferred to Phase 2.

### 0.1 Diseño UI/UX y Lenguaje Visual (CRÍTICO PARA LA IA)
- **Filosofía de Diseño:** Herramienta profesional "Dark-mode first", alta densidad de datos, revelación progresiva y feedback inmediato (<100ms).
- **Colores Clave (Tailwind):** Fondo canvas `#0F172A` (slate-950), Paneles `#1E293B` (slate-800), Acentos primarios en azul (`#3B82F6`), Estados (Success, Warning, Danger) para utilización y mapas de calor (Blue -> Cyan -> Green -> Yellow -> Red -> Crimson).
- **Tipografía:** Inter/system-ui para UI, *JetBrains Mono* para datos numéricos y coordenadas.
- **Micro-interacciones:** OrbitControls con amortiguación, selecciones con brillo punteado animado, modales con desenfoque de fondo.

### 0.2 Arquitectura y Tech Stack
- **Frontend:** React 18+ (TS), Vite, TailwindCSS, React Three Fiber (R3F), Zustand (manejo de estado ultrarrápido), React Query (estado servidor), TanStack Table, Recharts.
- **Backend:** FastAPI (Python), Pydantic v2, Numpy + SciPy (matrices dispersas COO/CSC), Celery + Redis (colas asíncronas para solver FEA).
- **Base de Datos:** PostgreSQL 15+ con JSONB (Topología, cargas, resultados) y RLS para multi-tenancy.
- **Patrón Strategy (Diseño):** ACI 318-19 para concreto (Fase 1), AISC 360-16 para acero (Fase 2).

---

## 1. Estado Actual (Lo que tenemos hecho)

A partir de la visión original, hemos alcanzado los siguientes hitos de la Fase 1:
- **Motor de Cálculo Propio:** Backend implementado en Python (FastAPI/SciPy) que ensambla matrices de rigidez 3D espaciales (6 GDL por nodo). Manejo nativo del Stiffness Method con aplicación de "Penalty Method" para condiciones de frontera.
- **Interfaz 3D Web (R3F):** Canvas 3D completamente operativo con vistas ortogonales, controles ETABS-like, y selección híbrida (Click + Box Window/Crossing).
- **Asignaciones Masivas:** Aplicación de cargas nodales/distribuidas, restricciones (con íconos estandarizados) y secciones a múltiples elementos simultáneamente.
- **Visualización de Resultados:** Diagramas interactivos continuos para vigas, que concatenan diagramas de elementos colineales para mostrar la envolvente de la línea continua.
- **Transferencia de Cargas:** Lógica de shells/losas implementada parcialmente para trasladar cargas a pórticos mediante áreas tributarias.

## 2. Hoja de Ruta Viva (Lo que nos falta)

### Fase 1.5 (Consolidación)
- [ ] **Módulo de Diseño (Strategy Pattern):** Terminar la clase abstracta `DesignCodeStrategy` y conectar ACI 318-19 para arrojar ratios de utilización.
- [ ] **Visor de Heatmap:** Colorear las líneas 3D en base al ratio de utilización (Azul a Rojo).
- [ ] **AI Copilot Estructural:** Chat integrado con LLM (Groq/Gemini) que lea el JSONB de resultados y sugiera mejoras sin mutar directamente la topología (requiere botón de "Aplicar").

### Fase 2 (Escalabilidad y Nuevos Módulos)
- [ ] Módulo AISC 360-16 (Steel Design).
- [ ] Elementos Finitos avanzados para shells (MITC4 o DKT) en lugar de áreas tributarias simples.
- [ ] Exportación avanzada PDF / CSV / JSON de memorias de cálculo.
- [ ] Análisis Dinámico / Espectro de Respuesta.
