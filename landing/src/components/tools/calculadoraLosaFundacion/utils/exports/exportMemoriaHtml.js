export const descargarMemoriaCalculoHtml = ({
  results,
  payload,
  columns,
  projectName,
  toast
}) => {
  if (!results || !results.settlements) {
    toast.error("Ejecuta el análisis primero para generar la memoria.");
    return;
  }
  const E_MPa = payload.materials.E / 1e6;
  const h_slab = payload.geometry.h;
  const nu = payload.materials.nu || 0.2;
  const E_kgf_cm2 = E_MPa * 10.197;
  const D_kgfm = (payload.materials.E * Math.pow(h_slab, 3)) / (12 * (1 - Math.pow(nu, 2))) / 9.81;

  const w_max_mm = results.heatmaps?.w_max_mm || results.displacements?.w_max_mm || 0;
  const p_max = results.soil_pressure?.max_pressure_kN_m2 || 0;
  const q_max_kgcm2 = (p_max / 98.0665).toFixed(3);
  const q_adm_kgcm2 = (payload.materials.q_adm / 98066.5).toFixed(2);
  const soil_ok = results.soil_pressure?.ok;
  const mx_max = results.moments?.Mx_max_kNm_m || 0;
  const my_max = results.moments?.My_max_kNm_m || 0;
  
  const b_cm = 100;
  const h_cm = h_slab * 100;
  const As_min = results.As_min_cm2_m || (0.0018 * b_cm * h_cm);
  
  let max_as_x = 0; let max_as_y = 0;
  if (results.bands) {
    results.bands.forEach(b => {
      if (b.Asx_cm2_m > max_as_x) max_as_x = b.Asx_cm2_m;
      if (b.Asy_cm2_m > max_as_y) max_as_y = b.Asy_cm2_m;
    });
  }

  const nx = results.heatmaps?.nx || 21;
  const ny = results.heatmaps?.ny || 21;
  const dx = payload.geometry.Lx / (nx - 1);
  const dy = payload.geometry.Ly / (ny - 1);
  const matrixSize = nx * ny;
  
  let murosHtml = '';
  let ejemploMuro = '';
  if (payload.walls && payload.walls.length > 0) {
    payload.walls.forEach((w, i) => {
      const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
      const Peso_Pared = w.thickness * w.height * w.density; // Carga muerta muro
      const q_corona = 0.10 * 0.13 * 2400; // kgf/m
      const D_techo = 15; // kgf/m2 (Lámina galvanizada liviana + tubos)
      const L_techo = 40; // kgf/m2 (Carga Viva COVENIN techo no accesible)
      const Ancho_Trib = 2.5; // m (Promedio conservador)
      const Carga_Techo = (D_techo + L_techo) * Ancho_Trib;
      const F_lineal = Peso_Pared + Carga_Techo + q_corona;
      
      if (i === 0) {
        ejemploMuro = `<br><em>Ejemplo Cálculo Muro M1: F_lineal = Peso Pared + Viga Corona + Carga Techo.<br>
        Peso Pared = ${w.thickness.toFixed(2)}m (espesor) × ${w.height.toFixed(2)}m (altura) × ${w.density} kgf/m³ (densidad) = ${Peso_Pared.toFixed(2)} kgf/m<br>
        Viga Corona = 0.10m × 0.13m × 2400 kgf/m³ = ${q_corona.toFixed(2)} kgf/m<br>
        Carga Techo = [15 kgf/m² (D) + 40 kgf/m² (L)] × ${Ancho_Trib}m (ancho tributario) = ${Carga_Techo.toFixed(2)} kgf/m<br>
        F_lineal total = ${F_lineal.toFixed(2)} kgf/m</em>`;
      }
      murosHtml += `<tr><td>Muro M${i+1} (${w.type})</td><td>${len.toFixed(2)} m</td><td>${Peso_Pared.toFixed(2)} kgf/m</td><td>${q_corona.toFixed(2)} kgf/m</td><td>${F_lineal.toFixed(2)} kgf/m</td></tr>`;
    });
  }

  const fy_MPa = payload.materials.f_y; // MPa
  const d_m = h_slab - 0.05; // 5 cm de recubrimiento

  let columnasHtml = '';
  if (payload.columns && payload.columns.length > 0) {
    columnasHtml = `
  <h3>4.3 Cargas Puntuales (Machones / Columnas)</h3>
  <p>Las cargas puntuales provenientes de machones o columnas estructurales se distribuyen sobre la losa utilizando funciones de forma bi-lineales que interpolan la carga hacia los nudos adyacentes más cercanos al parche de carga.</p>
  <table>
    <thead>
      <tr><th>Identificador</th><th>Ubicación (X, Y)</th><th>Dimensión</th><th>Carga Asignada (kgf)</th><th>Carga Factorizada (kgf)</th></tr>
    </thead>
    <tbody>
      ${payload.columns.map((c, i) => `<tr>
        <td>Machón C${i+1}</td>
        <td>(${columns[i].x.toFixed(2)}, ${columns[i].y.toFixed(2)})</td>
        <td>${(c.width * 100).toFixed(0)}x${(c.length * 100).toFixed(0)} cm</td>
        <td>${c.load_kgf.toFixed(2)}</td>
        <td>${(c.load_kgf * 1.5).toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
    `;
  }

  let bandasHtml = '';
  let seccion7Html = '';
  let punchingHtml = '';

  if (results.punching && results.punching.length > 0) {
    punchingHtml = `
  <h3>5.3 Verificación de Punzonamiento (Corte Bidireccional)</h3>
  <p>Según la sección 22.6 del ACI 318-19, se verifica el esfuerzo cortante en el perímetro crítico (a una distancia d/2) alrededor de machones y esquinas de muros:</p>
  <table>
    <thead>
      <tr><th>Elemento</th><th>V<sub>u</sub> (kgf)</th><th>V<sub>c</sub> (kgf)</th><th>φV<sub>c</sub> (kgf)</th><th>Ratio (V<sub>u</sub>/φV<sub>c</sub>)</th><th>Estado</th></tr>
    </thead>
    <tbody>
      ${results.punching.map(p => {
        const statusColor = p.ok ? '#4caf50' : '#f44336';
        const statusText = p.ok ? 'CUMPLE OK' : 'NO CUMPLE FAIL';
        return `<tr>
          <td>${p.id}</td>
          <td>${(p.Vu_kN * 101.9716).toFixed(1)}</td>
          <td>${(p.Vc_kN * 101.9716).toFixed(1)}</td>
          <td>${(p.phiVc_kN * 101.9716).toFixed(1)}</td>
          <td>${p.ratio !== undefined ? p.ratio.toFixed(2) : '-'}</td>
          <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  `;
  }
  
  if (results.bands && results.bands.length > 0) {
    const b0 = results.bands[0];
    const a_x_cm = b0.a_x_cm || 0;
    
    seccion7Html = `
<div class="card">
  <h2>7. Demostración Analítica (Banda Crítica)</h2>
  <p>A continuación, se desarrolla paso a paso el cálculo matemático del bloque de compresiones de Whitney para la <strong>Banda ${b0.id}</strong> (la primera franja evaluada bajo el Muro ${b0.type}).</p>
  
  <ul>
    <li>Ubicación física: Eje del Muro ${b0.type} (banda de ${b0.band_width.toFixed(2)} m de ancho).</li>
    <li>Cargas incidentes: Carga lineal del muro + Viga de Corona + Carga Techo (distribuidas en los nodos adyacentes a la traza).</li>
    <li>Esfuerzo resultante FDM: Momento de diseño en X (Mux) = <strong>${(b0.Mx_design_kNm_m * 101.9716).toFixed(2)} kgf·m/m</strong></li>
  </ul>

  <h3>7.1 Resolución de la Ecuación Cuadrática (Bloque de Whitney)</h3>
  <div class="formula">
    Ecuación de equilibrio: Mu = φ · As · fy · (d - a/2)<br>
    Profundidad del bloque equivalente (a): a = (As · fy) / (0.85 · f'c · b)<br><br>
    Sustituyendo iterativamente (algoritmo interno):<br>
    a = <strong>${a_x_cm.toFixed(2)} cm</strong><br>
    As_teórico = (${b0.Mx_design_kNm_m.toFixed(2)} × 10) / [ 0.90 · ${fy_MPa} · (${d_m.toFixed(2)} - ${a_x_cm.toFixed(2)}/200) ]<br>
    As_teórico = <strong>${b0.Asx_calc_cm2_m.toFixed(2)} cm²/m</strong>
  </div>

  <h3>7.2 Verificación Normativa y Selección Comercial</h3>
  <div class="formula">
    Acero Mínimo (Norma ACI): As_min = <strong>${As_min.toFixed(2)} cm²/m</strong><br>
    Condicional de Diseño: As_definitivo = max(${b0.Asx_calc_cm2_m.toFixed(2)}, ${As_min.toFixed(2)}) = <strong>${b0.Asx_cm2_m.toFixed(2)} cm²/m</strong><br><br>
    <em>Selección del software:</em> Al cruzar la demanda con la base de datos de aceros, el sistema propone:<br>
    <strong>Cabilla de Ø${b0.bar_x.diam_mm} mm @ ${(b0.bar_x.sep_m * 100).toFixed(0)} cm</strong> (Área provista > Área demandada).
  </div>
</div>`;
    
    results.bands.forEach((b, i) => {
      // Mostrar la fórmula de Whitney y la regla del máximo basándonos en los datos calculados en el backend
      const prop_x = b.bar_x.diam_mm > 0 ? `Cabilla de Ø${b.bar_x.diam_mm} mm @ ${(b.bar_x.sep_m * 100).toFixed(0)} cm` : "Acero mínimo normativo";
      const prop_y = b.bar_y.diam_mm > 0 ? `Cabilla de Ø${b.bar_y.diam_mm} mm @ ${(b.bar_y.sep_m * 100).toFixed(0)} cm` : "Acero mínimo normativo";
      
      bandasHtml += `<li style="margin-bottom:10px;"><strong>Banda ${b.id} (Muro ${b.type}):</strong><br>
        Mu_x = ${(b.Mx_design_kNm_m * 101.9716).toFixed(2)} kgf·m/m, Mu_y = ${(b.My_design_kNm_m * 101.9716).toFixed(2)} kgf·m/m <br>
        <span style="color:#0d47a1;">&rarr; (Dir X) a = ${b.a_x_cm ? b.a_x_cm.toFixed(2) : 0} cm &rarr; As_x (teórico) = ${b.Asx_calc_cm2_m.toFixed(2)} cm²/m</span><br>
        <span style="color:#1b5e20;">&rarr; <strong>As_x (definitivo) = max( As_x_teórico, As_min ) = ${b.Asx_cm2_m.toFixed(2)} cm²/m</strong> &rarr; Propuesta: <em>${prop_x}</em></span><br>
        <span style="color:#0d47a1; margin-top:4px; display:inline-block;">&rarr; (Dir Y) a = ${b.a_y_cm ? b.a_y_cm.toFixed(2) : 0} cm &rarr; As_y (teórico) = ${b.Asy_calc_cm2_m.toFixed(2)} cm²/m</span><br>
        <span style="color:#1b5e20;">&rarr; <strong>As_y (definitivo) = max( As_y_teórico, As_min ) = ${b.Asy_cm2_m.toFixed(2)} cm²/m</strong> &rarr; Propuesta: <em>${prop_y}</em></span>
      </li>`;
    });
  } else {
    bandasHtml = `<li>No hay bandas a evaluar o diseño libre.</li>`;
  }

  const bandasCriticas = results.bands ? results.bands.filter(b => b.Asx_cm2_m > As_min + 0.05 || b.Asy_cm2_m > As_min + 0.05) : [];
  let conclusionHtml = '';
  if (bandasCriticas.length === 0) {
    conclusionHtml = 'Debido a la ligereza de la vivienda, la mayoría de las franjas internas se rigen por el acero mínimo de confinamiento y temperatura (As_min).';
  } else {
    const ids = bandasCriticas.map(b => b.id);
    const idsText = ids.length === 1 ? `Banda ${ids[0]}` : `Bandas ${ids.slice(0, -1).join(', ')} y ${ids[ids.length - 1]}`;
    conclusionHtml = `Debido a la ligereza de la vivienda, la mayoría de las franjas internas se rigen por el acero mínimo de confinamiento y temperatura (As_min). Sin embargo, en los muros perimetrales críticos (${idsText}), el acero por FLEXIÓN rige el diseño, requiriendo refuerzos adicionales.`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Memoria de Cálculo - ${projectName}</title>
  <script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; }
    h1, h2, h3 { color: #1e1e2f; }
    .card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .formula { background: #e3f2fd; padding: 12px; border-left: 4px solid #1976d2; font-family: monospace; font-size: 14px; margin: 10px 0; color: #0d47a1; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #1976d2; color: white; }
  </style>
</head>
<body>
  <h1>Losa de Fundación por Diferencias Finitas</h1>
  <p><strong>Proyecto: ${projectName}</strong></p>

  <div class="card">
    <h2>1. Introducción al Problema</h2>
    <p>Una losa de fundación es una placa de concreto que transmite las cargas de una estructura al suelo. Existen varios criterios y métodos teóricos para abordarlo:</p>
    <ul>
      <li><strong>Método Rígido Convencional:</strong> Asume que la losa es infinitamente rígida y que la presión del suelo es plana o lineal. Es muy conservador, impreciso para losas grandes o cargas asimétricas, y sobrestima cuantías de acero.</li>
      <li><strong>Método Elástico Flexible (Winkler):</strong> Asume que el suelo es una cama de resortes elásticos independientes (k). La losa se flexiona y la presión del suelo varía dependiendo de la deformación en cada punto.</li>
      <li><strong>Método de Elementos/Diferencias Finitas:</strong> Es la técnica matemática computacional para resolver las complejas ecuaciones diferenciales de la placa elástica flexible, encontrando los esfuerzos en cada milímetro de la estructura.</li>
    </ul>
    <p>Nuestra plataforma utiliza un <strong>Motor de Diferencias Finitas basado en el Modelo de Winkler</strong>, garantizando resultados óptimos, hiper-precisos y económicos frente al método rígido convencional.</p>
  </div>

  <div class="card">
    <h2>2. Ecuación Gobernante</h2>
    <h3>2.1 Placa sobre Fundación Elástica (Modelo de Winkler)</h3>
    <div class="formula">
      D · ∇⁴w(x,y) + k · w(x,y) = q(x,y)
    </div>
    <table>
      <thead>
        <tr><th>Símbolo</th><th>Descripción</th><th>Unidades</th></tr>
      </thead>
      <tbody>
        <tr><td>w(x,y)</td><td>Deformación vertical</td><td>m</td></tr>
        <tr><td>q(x,y)</td><td>Carga distribuida aplicada</td><td>kgf/m²</td></tr>
        <tr><td>k</td><td>Coeficiente de balasto (Winkler)</td><td>kgf/cm³</td></tr>
        <tr><td>D</td><td>Rigidez a la flexión de la placa</td><td>kgf·m</td></tr>
      </tbody>
    </table>

    <h3>2.2 Rigidez a la Flexión</h3>
    <div class="formula">
      D = E · h³ / [12(1 - ν²)]
    </div>
    <p>Donde E = módulo de elasticidad, h = espesor, ν = Poisson</p>
    <div class="formula">
      D = (${E_kgf_cm2.toFixed(0)} kgf/cm² · ${h_slab.toFixed(2)}³ m³) / (12 · (1 - ${nu}²)) = ${D_kgfm.toFixed(2)} kgf·m
    </div>
  </div>

  <div class="card">
    <h2>3. Formulación por Elementos Finitos (FEM) y Flujo de Cálculo</h2>
    <p>Para analizar el comportamiento estructural de la losa, el motor utiliza el <strong>Método de Elementos Finitos (FEM)</strong> en lugar de aproximaciones tradicionales por diferencias finitas. Esto nos permite modelar losas de forma libre y condiciones de carga complejas con gran precisión física.</p>
    
    <h3>3.1 El Grado de Libertad Nodal y Discretización</h3>
    <p>La losa se subdivide en una cuadrícula regular de elementos cuadriláteros planos (Quad Plate Elements) de Mindlin. Cada nodo posee <strong>3 grados de libertad (DOF)</strong>:</p>
    <ul>
      <li>Desplazamiento vertical en Z: <code>w</code> (m)</li>
      <li>Rotación alrededor del eje X: <code>θ_x</code> (rad)</li>
      <li>Rotación alrededor del eje Y: <code>θ_y</code> (rad)</li>
    </ul>
    <p>Para una grilla de <strong>${nx} × ${ny}</strong> subdivisiones (nodos totales: <strong>${matrixSize}</strong>), el sistema de ecuaciones posee un tamaño matricial de <strong>${matrixSize * 3} × ${matrixSize * 3}</strong> grados de libertad.</p>

    <h3>3.2 Matriz de Rigidez Local del Elemento (12x12)</h3>
    <p>Cada elemento cuadrilátero de 4 nodos acopla la flexión y rigidez a cortante mediante una matriz de rigidez elástica de 12x12:</p>
    <div class="formula" style="font-size:12px; overflow-x:auto;">
      [K_elem] = ∫ [B]^T [D_placa] [B] dA
    </div>
    <p style="font-size:13px; color:#555;">Donde [B] relaciona las curvaturas con los desplazamientos nodales e interpolaciones bilineales, y [D_placa] es la rigidez del material constitutivo de la losa.</p>

    <h3>3.3 Acoplamiento del Suelo elástico (Winkler)</h3>
    <p>El suelo se introduce directamente en la diagonal de la matriz de rigidez global. Cada resorte de suelo añade rigidez vertical en el DOF traslacional del nodo:</p>
    <div class="formula">
      K_suelo = k_balasto · A_tributaria
    </div>
    <p><strong>Ejemplo de Montaje Nodal:</strong> Para un nodo interior con un área tributaria de ${dx.toFixed(2)}m × ${dy.toFixed(2)}m = ${(dx * dy).toFixed(4)} m² y un balasto de ${(payload.materials.k / 9806.65).toFixed(2)} kgf/cm³ (equivalente a ${(payload.materials.k).toExponential(2)} N/m³), la rigidez vertical añadida al sistema en ese nodo es:</p>
    <div class="formula">
      K_diagonal = ${(payload.materials.k).toExponential(2)} N/m³ × ${(dx * dy).toFixed(4)} m² = ${(payload.materials.k * dx * dy).toExponential(2)} N/m
    </div>

    <h3>3.4 Diagrama del Flujo de Cálculo FEM</h3>
    <pre class="formula" style="background:#f1f5f9; color:#334155; font-size:12px; line-height:1.2; overflow-x:auto;">
┌─────────────────────────────────────────┐
│  1. DEFINICIÓN DE GEOMETRÍA Y PROPIEDADES│
│     • Lx, Ly, espesor (h), material (E, ν)│
│     • Suelo (resorte k) y coordenadas   │
├─────────────────────────────────────────┤
│  2. MESHING / DISCRETIZACIÓN            │
│     • Generar nodos y cuadriláteros     │
│     • Asignar coordenadas globales      │
├─────────────────────────────────────────┤
│  3. ENSAMBLAJE MATRICIAL GLOBAL         │
│     • Rigidez de placa (Quad 12x12)     │
│     • Rigidez de vigas de amarre (6x6)  │
│     • Agregar resortes de suelo Winkler │
│       K_diag += k * Area_tributaria     │
├─────────────────────────────────────────┤
│  4. ASAMBLEA DEL VECTOR DE CARGAS {F}    │
│     • Peso propio y sobrecarga en nodos │
│     • Muros y machones puntuales        │
├─────────────────────────────────────────┤
│  5. RESOLVER SISTEMA RALO               │
│     • [K_global] · {U} = {F}            │
│     • Solución directa (spsolve)        │
├─────────────────────────────────────────┤
│  6. POST-PROCESAMIENTO Y DISEÑO         │
│     • Presiones = k * w                 │
│     • Momentos flectores (Mx, My)       │
│     • Armado ACI 318 (Whitney)          │
└─────────────────────────────────────────┘
    </pre>
  </div>

  <div class="card">
    <h2>4. Análisis de Cargas del Proyecto</h2>
    <p>La losa recibe solicitaciones mediante cargas uniformemente distribuidas en su superficie y cargas lineales transmitidas por la superestructura (muros). A continuación, se detalla el modelado matemático.</p>
    
    <h3>4.1 Cargas Uniformes sobre la Losa (q)</h3>
    <p>Estas cargas actúan sobre todos los nodos interiores de la placa (kgf/m²):</p>
    <table>
      <thead>
        <tr><th>Componente</th><th>Descripción</th><th>Cálculo Normativo</th><th>Valor (kgf/m²)</th></tr>
      </thead>
      <tbody>
        <tr><td>Peso Propio</td><td>Masa del concreto endurecido</td><td>${h_slab.toFixed(2)} m × 2400 kgf/m³</td><td>${(h_slab * 2400).toFixed(2)}</td></tr>
        <tr><td>Acabados / Piso</td><td>Mortero y cerámicas</td><td>Valor normativo estándar</td><td>100.00</td></tr>
        <tr><td>Sobrecarga Uso</td><td>Uso residencial / vivienda</td><td>Valor normativo estándar</td><td>200.00</td></tr>
        <tr style="font-weight:bold; background:#e3f2fd;">
          <td colspan="3" style="text-align:right;">Carga Uniforme de Servicio q(x,y) =</td>
          <td>${(h_slab * 2400 + 300).toFixed(2)} kgf/m²</td>
        </tr>
      </tbody>
    </table>

    <h3>4.2 Cargas Lineales (Paredes y Vigas de Corona)</h3>
    <p>El motor distribuye el peso de la mampostería, las vigas de amarre y el techo sobre la trayectoria de los muros. Se asume que <strong>todas</strong> las paredes llevan una Viga de Corona en hormigón armado de 10×13 cm para amarre perimetral y central, que transmite su masa linealmente a la placa.</p>
    <div class="formula">
      q(i,j) = (F_lineal) / (Δx · Δy) · (longitud de influencia en el nodo)
      ${ejemploMuro}
    </div>
    <table>
      <thead>
        <tr><th>Identificador</th><th>Longitud</th><th>Mampostería</th><th>Viga Corona</th><th>Carga Lineal Total (kgf/m)</th></tr>
      </thead>
      <tbody>
        ${murosHtml || '<tr><td colspan="5">No hay muros definidos para cargar linealmente.</td></tr>'}
      </tbody>
    </table>
    ${columnasHtml}
  </div>

  <div class="card">
    <h2>5. Solución Numérica y Modelo Geotécnico</h2>
    <p>Tras plantear el sistema matricial <strong>[A]·{w} = {q}</strong> y resolverlo matemáticamente, obtenemos el vector de deformaciones locales {w} para cada nodo de la malla.</p>
    
    <h3>5.1 Criterio de Rigidez de la Losa (Longitud Característica)</h3>
    <p>Para justificar el uso del modelo de Winkler (coeficiente de balasto), debemos analizar la flexibilidad relativa entre la losa y el suelo mediante el parámetro elástico <strong>lc</strong> (Longitud característica):</p>
    <div class="formula">
      l_c = √[ (E · h³) / (12 · (1 - ν²) · k) ]<br>
      Sustituyendo:<br>
      E = ${(E_MPa).toFixed(2)} MPa = ${(payload.materials.E).toExponential(3)} N/m²<br>
      k = ${(payload.materials.k).toExponential(3)} N/m³<br>
      l_c = ${results.rigidity?.l_c_m ? results.rigidity.l_c_m.toFixed(2) : '1.50'} m
    </div>
    <p style="font-size:13px; color:#555;"><i>Interpretación: Si la separación entre los muros de carga es significativamente mayor a π·lc, la placa exhibirá una clara flexión (comportamiento flexible) confirmando la precisión del análisis por Elementos/Diferencias Finitas. Si es menor, la losa actúa como cuerpo rígido asentándose uniformemente.</i></p>

    <h3>5.2 Deformación y Presión de Suelo</h3>
    <div class="formula">
      w_max = max({w}) = ${w_max_mm.toFixed(3)} mm<br><br>
      q_max = k · w_max<br>
      q_max = ${(payload.materials.k / 9806.65).toFixed(2)} kgf/cm³ · ${w_max_mm.toFixed(3)} mm (ajustado a cm) = <strong>${q_max_kgcm2} kgf/cm²</strong>
    </div>
    <p>Condición Normativa de Suelo: <strong style="color:${soil_ok?'#4caf50':'#f44336'}">${soil_ok ? `CUMPLE (q_max ${q_max_kgcm2} < Capacidad Admisible ${q_adm_kgcm2} kgf/cm²)` : `FALLA (q_max ${q_max_kgcm2} > Capacidad Admisible ${q_adm_kgcm2} kgf/cm²)`}</strong></p>

    <h3>5.2 Esfuerzos Internos</h3>
    <div class="formula" style="font-size: 13px;">
      M_x = -D · [ (∂²w / ∂x²) + ν · (∂²w / ∂y²) ]<br>
      M_y = -D · [ (∂²w / ∂y²) + ν · (∂²w / ∂x²) ]
    </div>
    <p>Los momentos flectores máximos (Mx, My) dictarán el requerimiento de acero principal, y ocurren sistemáticamente debajo y en las cercanías de los muros o columnas más pesadas (los picos de tensión de la matriz):</p>
    <ul>
      <li>Momento Flector Máximo en X (Mxx): <strong>${(mx_max * 101.97).toFixed(2)} kgf·m/m</strong></li>
      <li>Momento Flector Máximo en Y (Myy): <strong>${(my_max * 101.97).toFixed(2)} kgf·m/m</strong></li>
    </ul>

    <div style="margin-top:20px; margin-bottom:20px; border: 1px solid #eee; padding:10px; border-radius: 8px; background: #fff;">
      <h4 style="text-align:center; margin-top:0; margin-bottom:5px; color:#1e1e2f;">Mapa de Calor Interactivo: Esfuerzos Internos</h4>
      <p style="text-align:center; font-size:12px; color:#666; margin-bottom: 10px;">
        <strong>Guía de Interpretación:</strong> Los colores cálidos (<span style="color:#e65100;font-weight:bold;">Rojo</span>) indican un Momento Flector Negativo (tracción en la cara superior, requiere acero superior). Ocurren exactamente <strong>debajo</strong> de los muros pesados.<br>
        Los colores fríos (<span style="color:#0d47a1;font-weight:bold;">Azul</span>) representan Momentos Positivos (tracción en el lecho inferior de la placa), presentándose en los "vanos" o espacios vacíos entre muros a causa del abombamiento del suelo.<br>
        Las zonas (<span style="color:#009688;font-weight:bold;">Verde/Cian</span>) denotan esfuerzos neutros cercanos a cero.
      </p>
      <div id="plotly-heatmap" style="width:100%; height:450px;"></div>
    </div>

    ${punchingHtml}
  </div>

  <div class="card">
    <h2>6. Diseño del Armado (ACI 318-19)</h2>
    
    <h3>Acero Mínimo por Contracción y Temperatura (Sec. 24.4):</h3>
    <p>La norma ACI 318-19, sección 24.4.3.2, establece que para losas donde se empleen barras corrugadas (fy = ${Math.round(fy_MPa * 10.197)} kgf/cm²), la cuantía mínima de refuerzo (ρ_min) en cada dirección no debe ser menor a 0.0018 para resistir los esfuerzos térmicos y de retracción de fraguado.</p>
    <div class="formula">
      As_min = ρ_min · b · h = 0.0018 · 100 cm · ${h_cm.toFixed(0)} cm = ${As_min.toFixed(2)} cm²/m
    </div>
    <p><strong>Acero Requerido por Flexión en Franjas Críticas (Whitney):</strong></p>
    <div class="formula">
      As_flexion = Mu / [ φ · fy · (d - a/2) ]<br><br>
      Evaluación de bandas (bajo muros):<br>
      <ul>
        ${bandasHtml}
      </ul>
      <br>
      Máximo esfuerzo demandado en iteración X: ${max_as_x.toFixed(2)} cm²/m<br>
      Máximo esfuerzo demandado en iteración Y: ${max_as_y.toFixed(2)} cm²/m
    </div>
    <p style="font-size:13px; color:#555;"><i>Nota Técnica: Si los esfuerzos flectores de la losa son bajos y la ecuación de Whitney arroja una cuantía menor que el mínimo normativo, el algoritmo reporta el valor bruto en flexión puramente iterativa, pero rige el acero normativo.</i></p>
    
    <h3>Guía de Interpretación Práctica para el Estudiante:</h3>
    <p>Para traducir el área de acero calculada (As definitivo) a un plano de construcción real, se selecciona un diámetro comercial de barra y se determina su separación (s) en centímetros utilizando la siguiente relación geométrica:</p>
    <div class="formula">
      s (cm) = [ Área_nominal_barra (cm²) / As_requerido (cm²/m) ] × 100
    </div>
    <p><strong>Ejemplo Numérico:</strong> Supongamos que el cálculo arrojó un As definitivo de <strong>3.85 cm²/m</strong> y decidimos utilizar barras comerciales de <strong>Ø7 mm</strong>.</p>
    <ul>
      <li>El área nominal de una barra de Ø7 mm es: <code>A_bar = (π · 0.7²) / 4 ≈ 0.385 cm²</code></li>
      <li>Aplicando la ecuación: <code>s = (0.385 / 3.85) × 100 = 10 cm</code></li>
      <li><strong>Resultado Práctico:</strong> Cabilla de Ø7 mm @ 10 cm. Por normativas y practicidad de construcción, esta separación teórica siempre se redondea hacia abajo al múltiplo conservador más cercano (ej. 10 cm, 12.5 cm, 15 cm) para garantizar siempre un área provista mayor o igual a la demandada.</li>
    </ul>

    <p><strong>Conclusión Estructural:</strong> <span style="color:${bandasCriticas.length === 0 ? '#4caf50' : '#ff9800'}; font-weight:bold;">${conclusionHtml}</span></p>
  </div>
  
  ${seccion7Html}

  <div class="card">
    <h2>8. Diagrama de Flujo de Decisión para Armado</h2>
    <p>La lógica paramétrica del software para asignar el refuerzo definitivo y su espaciamiento sigue este diagrama algorítmico normativo:</p>
    <div class="mermaid" style="text-align: center; margin-top: 20px;">
      graph TD
      A[Inicio: Calcular Mu por FDM] --> B(Resolver Ecuación de Whitney)
      B --> C{¿As_teórico > As_min?}
      C -- SÍ --> D[El diseño se rige por FLEXIÓN]
      D --> E[Asignar As_definitivo = As_teórico]
      C -- NO --> F[El diseño se rige por RETRACCIÓN/TEMPERATURA]
      F --> G[Asignar As_definitivo = As_min]
      E --> H[Calcular separación s con diámetro comercial]
      G --> H
      H --> I[Redondear s hacia abajo al múltiplo más cercano]
      I --> J(Fin: Armado Propuesto)
      
      style C fill:#f9f,stroke:#333,stroke-width:2px
      style D fill:#ffcc80,stroke:#e65100,stroke-width:2px
      style F fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
    </div>
  </div>

  <script>
    mermaid.initialize({startOnLoad:true});
    if (${results.heatmaps ? 'true' : 'false'}) {
      var mx_data = ${JSON.stringify(results.heatmaps?.Mx_kNm || [])};
      var my_data = ${JSON.stringify(results.heatmaps?.My_kNm || [])};
      var vu_data = ${JSON.stringify(results.heatmaps?.Vu_kN || [])};
      var nx = ${results.heatmaps?.nx || 21};
      var ny = ${results.heatmaps?.ny || 21};
      var Lx = ${payload.geometry.Lx};
      var Ly = ${payload.geometry.Ly};
      
      var x_vals = [];
      for(var i=0; i<=nx; i++) x_vals.push((i * Lx / nx).toFixed(2));
      var y_vals = [];
      for(var j=0; j<=ny; j++) y_vals.push((j * Ly / ny).toFixed(2));
      
      var traceMx = {
        z: mx_data, x: x_vals, y: y_vals,
        type: 'heatmap', colorscale: 'Jet',
        hovertemplate: 'X: %{x} m<br>Y: %{y} m<br>Mxx: %{z:.2f} kgf·m/m<extra></extra>',
        name: 'Mxx'
      };
      var traceMy = {
        z: my_data, x: x_vals, y: y_vals,
        type: 'heatmap', colorscale: 'Jet', visible: false,
        hovertemplate: 'X: %{x} m<br>Y: %{y} m<br>Myy: %{z:.2f} kgf·m/m<extra></extra>',
        name: 'Myy'
      };
      var traceVu = {
        z: vu_data, x: x_vals, y: y_vals,
        type: 'heatmap', colorscale: 'Portland', visible: false,
        hovertemplate: 'X: %{x} m<br>Y: %{y} m<br>Vu: %{z:.2f} kgf/m<extra></extra>',
        name: 'Vu'
      };
      
      var layout = {
        margin: { t: 40, b: 40, l: 40, r: 20 },
        xaxis: { title: 'Losa en X (m)', range: [0, Lx] },
        yaxis: { title: 'Losa en Y (m)', range: [0, Ly], scaleanchor: 'x', scaleratio: 1 },
        updatemenus: [{
          y: 1.15, x: 0.5, xanchor: 'center', yanchor: 'top', direction: 'right',
          buttons: [
            { method: 'update', args: [{'visible': [true, false, false]}], label: 'Mxx (kgf·m/m)' },
            { method: 'update', args: [{'visible': [false, true, false]}], label: 'Myy (kgf·m/m)' },
            { method: 'update', args: [{'visible': [false, false, true]}], label: 'Vu (kgf/m)' }
          ]
        }]
      };
      
      Plotly.newPlot('plotly-heatmap', [traceMx, traceMy, traceVu], layout, {responsive: true});
    }
  </script>
</body>
</html>`;
  
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  } else {
    toast.error("Por favor permite las ventanas emergentes (pop-ups) para ver la memoria.");
  }
};
