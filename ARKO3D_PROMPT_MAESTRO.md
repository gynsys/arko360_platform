# Prompt Maestro - ARKO3D Platform

## 1. Visión y Objetivo Principal
El objetivo de **ARKO3D** es construir una plataforma web de Ingeniería Estructural (Análisis de Elementos Finitos - FEA) directamente en el navegador, ofreciendo una experiencia de usuario (UX) similar a ETABS o SAP2000, pero moderna, accesible y en la nube.

La herramienta debe permitir al ingeniero:
1. Modelar geometrías 3D (Nodos, Vigas, Columnas, Losas).
2. Asignar propiedades (Materiales, Secciones, Restricciones).
3. Aplicar cargas (Puntuales, Distribuidas, Área) y definir combinaciones de carga normativas (ACI, AISC).
4. Ejecutar el análisis estructural usando un motor matricial (Stiffness Method) en el backend (FastAPI).
5. Visualizar diagramas de cortante, momento, deformación y reacciones de manera continua e interactiva.

## 2. Estado Actual (Lo que hemos hecho)
- **Interfaz 3D Web:** Motor renderizado usando React Three Fiber (R3F) con vistas predefinidas (Planta, Elevación, 3D).
- **Herramientas de Selección:** Selección por clic y ventana (Window/Crossing, Izquierda->Derecha, Derecha->Izquierda). Multi-selección acumulativa.
- **Asignaciones Masivas:** Aplicación de cargas, restricciones (apoyos con íconos ETABS) y secciones a múltiples elementos simultáneamente.
- **Visualización de Resultados:** Diagramas interactivos continuos para vigas concatenadas, marcando valores máximos y mínimos absolutos de todo el tramo.
- **Motor de Cálculo Lineal:** Backend implementado en Python (FastAPI/SciPy) que ensambla matrices de rigidez 3D espaciales (6 GDL por nodo) considerando deformaciones por cortante (Timoshenko/Euler-Bernoulli) y torsion.
- **Transferencia de Cargas:** Las losas (Shells) transfieren cargas a los pórticos a través de áreas tributarias perimetrales.

## 3. Hoja de Ruta (Lo que falta)
1. **Diseño Estructural (Design Mode):** Implementar la capacidad de diseñar y verificar miembros de acero (AISC 360) y concreto armado (ACI 318) basados en las combinaciones de resultados envolventes.
2. **Generación de Reportes:** Módulo para exportar la memoria de cálculo en PDF con gráficos, tablas de reacciones y desglose normativo.
3. **Análisis Dinámico:** Capacidad de introducir espectros de respuesta para análisis sísmico dinámico modal espectral.
4. **Elementos Finitos de Área (Shells avanzados):** Reemplazar la transferencia por área tributaria con un elemento finito de placa gruesa real (ej. MITC4) si se requiere análisis de losas planas.
5. **Autosave y Cloud:** Sincronización continua e inteligente de modelos guardados contra el backend PostgreSQL.

---
*Este documento se utilizará como punto de partida para cualquier agente o desarrollador que retome el proyecto, para entender la arquitectura y el objetivo a largo plazo.*
