# Documentación y Soporte Teórico - ARKO3D Platform

## PARTE 1: Manual de Usuario

### 1. Interfaz y Controles
ARKO3D ofrece un visor 3D interactivo para estructuras.
- **Órbita 3D:** Mantenga presionado el **clic derecho** y mueva el ratón.
- **Paneo:** Mantenga presionado el **clic central** (rueda del ratón).
- **Zoom:** Gire la rueda del ratón.
- **Selección Individual:** Clic izquierdo sobre cualquier elemento (nodo, viga o losa).
- **Selección por Ventana:** Mantenga el **clic izquierdo** y arrastre:
  - *Izquierda a Derecha (Azul):* Ventana de Inclusión. Solo selecciona elementos 100% dentro de la caja.
  - *Derecha a Izquierda (Verde):* Ventana de Cruce (Crossing). Selecciona cualquier elemento que la caja toque.
- **Multi-selección:** Mantenga la tecla `Shift` o `Ctrl` al hacer clic o al crear una ventana de selección para agregar o quitar de la selección actual.

### 2. Flujo de Trabajo (Método ETABS)
La barra superior sigue un flujo lógico de ingeniería:
1. **File:** Administrar el modelo localmente (.arko3d) o en la nube, abrir el Wizard inicial.
2. **Define:** Crear y configurar Materiales (concreto, acero), Secciones (rectangulares, I, T, etc.) y Combinaciones de Carga.
3. **Draw:** Herramientas para trazar nuevos elementos en pantalla.
4. **Assign:** Aplicar propiedades a los elementos seleccionados en pantalla. Primero selecciona las vigas, luego haz clic en `Assign -> Asignar Secciones` o `Assign -> Cargas`.
5. **Analyze:** Corre el solver matricial para obtener desplazamientos y fuerzas internas.
6. **Display:** Visualizar los diagramas tridimensionales de Cortante, Momento, Torsión y Axial, o exportar las tablas de resultados.

---

## PARTE 2: Soporte Teórico de Cálculos

### 1. Método de Análisis
ARKO3D emplea el **Método de la Rigidez Directa (Direct Stiffness Method)** para resolver sistemas estructurales lineales en 3D. 

El modelo matemático general establece que:
$$ [K] \cdot \{U\} = \{F\} $$
Donde:
- $[K]$ es la matriz de rigidez global de la estructura.
- $\{U\}$ es el vector de desplazamientos nodales desconocidos.
- $\{F\}$ es el vector de fuerzas nodales aplicadas (y fuerzas de empotramiento perfecto equivalentes).

### 2. Grados de Libertad (GDL)
Se asume un modelo espacial (Pórtico 3D) en el cual cada nodo posee **6 Grados de Libertad**:
- 3 Traslaciones: $u_x, u_y, u_z$
- 3 Rotaciones: $\theta_x, \theta_y, \theta_z$

### 3. Matriz de Rigidez Local del Elemento Viga/Columna
Para cada elemento frame, se formula una matriz de rigidez local de $12 \times 12$ basada en la teoría de flexión de vigas tridimensionales. 
Incluye los aportes de:
- Rigidez Axial: $\frac{EA}{L}$
- Rigidez a Torsión: $\frac{GJ}{L}$
- Rigidez a Flexión (Ejes Mayor y Menor): Términos $\frac{12EI}{L^3}$, $\frac{6EI}{L^2}$ y $\frac{4EI}{L}$ según la teoría de vigas de Euler-Bernoulli.

### 4. Transformación de Coordenadas
Dado que los elementos están orientados arbitrariamente en el espacio tridimensional, la matriz de rigidez local $[k_{loc}]$ se transforma a las coordenadas globales usando una matriz de transformación geométrica $[T]$ de $12 \times 12$:
$$ [K_{glob}] = [T]^T [k_{loc}] [T] $$
La matriz $[T]$ se calcula utilizando los cosenos directores basados en las coordenadas $(X,Y,Z)$ de los nodos inicial $i$ y final $j$, así como el "Ángulo Beta" definido por el usuario para orientar la sección transversal principal.

### 5. Transferencia de Cargas de Losas (Áreas Tributarias)
Al utilizar elementos "Shell" como losas que distribuyen carga, el solver identifica perimetralmente las vigas conectadas al borde de la losa y calcula un área tributaria geométrica. La presión de la losa ($kgf/m^2$ de CM y CV) se transforma en cargas equivalentes lineares sobre las vigas de soporte adyacentes.

### 6. Sistema de Solución y Reacciones
Una vez ensamblada $[K]$ y vector $[F]$, se aplica un "Penalty Method" u "Homogeneous Boundary Conditions" multiplicando por un valor masivo ($10^{30}$) las diagonales de la matriz correspondientes a los Grados de Libertad restringidos por los apoyos (Empotramientos, Articulaciones). 
Luego, la ecuación se resuelve utilizando las rutinas optimizadas de `scipy.sparse.linalg.spsolve` debido al carácter esparcido (sparse) y simétrico de las matrices estructurales.

Finalmente, las fuerzas internas se recuperan a lo largo de 11 estaciones equidistantes por elemento mediante:
$$ \{f_{local}\} = [k_{local}] \{u_{local}\} - \{f_{FEP}\} $$
