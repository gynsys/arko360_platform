# Bitácora de Arquitectura Futura: Losas de Fundación Irregulares

## Contexto Actual (Versión 1)
Actualmente, el motor de cálculo matemático (Diferencias Finitas) en `FoundationSlabDesigner.py` asume estrictamente que la losa de fundación es un rectángulo perfecto de dimensiones `Lx` y `Ly`.
El lienzo interactivo permite al usuario dibujar explícitamente líneas de "Borde de Losa", pero el frontend calcula la caja delimitadora (Bounding Box) de esas líneas y se la envía al backend como una losa rectangular.

## Requerimiento a Futuro
Los usuarios necesitan diseñar losas con formas irregulares (forma de L, U, asimétricas, trapezoidales, etc.) y/o aplicar retiros y "offsets" variables que no resultan en una forma rectangular.

## Arquitectura Propuesta (Versión 2)

Para lograr resolver formas irregulares sin reescribir todo el algoritmo de diferencias finitas desde cero, se utilizará un enfoque de **Enmascaramiento de Rigidez (Stiffness Masking)** combinado con **Ray Casting**:

### 1. Frontend (Captura de Polígono)
El usuario dibujará un polígono cerrado (o un conjunto de líneas de "Borde de Losa").
El frontend enviará este polígono al backend como un arreglo de vértices (coordenadas x, y).

### 2. Backend (Malla Matemática)
El backend calculará la caja delimitadora (Bounding Box) del polígono y generará la misma malla rectangular de `Lx` x `Ly` que genera actualmente.

### 3. Ray Casting (Análisis Espacial)
Antes de ensamblar la matriz de rigidez global ($K$), el servidor iterará sobre cada nodo `(x, y)` de la malla y ejecutará un algoritmo de "Punto en Polígono" (Ray Casting).
- Si el nodo está **DENTRO** del polígono: Se asume que hay losa. Su rigidez se calcula normalmente y recibe cargas.
- Si el nodo está **FUERA** del polígono: Se asume que es "tierra".

### 4. Enmascaramiento de Rigidez (Stiffness Masking)
Para los nodos que caen "afuera" del polígono de la losa, debemos evitar que generen singularidades matemáticas en la matriz:
- **Técnica de Penalización:** A los grados de libertad de esos nodos (desplazamiento vertical $w$, rotaciones $\theta_x, \theta_y$) se les asignará un valor de rigidez gigantesco (ej. $10^{12}$) en la diagonal principal de la matriz $K$.
- **Fuerzas Cero:** Se asegurará que el vector de fuerzas $F$ sea $0$ en esos nodos.
- **Resultado:** Matemáticamente, esos nodos externos tendrán desplazamiento y deformación cero. Las fuerzas y momentos solo fluirán a través de los nodos internos que sí pertenecen al polígono de la losa.

## Esfuerzo Estimado
- Modificación del algoritmo en Python para soportar `matplotlib.path.Path` o algoritmos propios de punto-en-polígono (Ray casting).
- Modificación de la función `_build_system()` en `FoundationSlabDesigner.py` para enmascarar los nodos en la matriz LIL dispersa.
- Pruebas unitarias intensivas para asegurar que el condicionamiento de la matriz (Condition Number) no se degrade al usar valores de penalización altos, o en su defecto, implementar una reducción de matriz (condensación estática) para remover completamente los grados de libertad externos.
