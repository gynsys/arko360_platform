/**
 * Motor de Cálculo de Viento - COVENIN 2003-89
 * Procedimiento Analítico Simplificado para SPRFV (Sistemas Principales Resistentes a Fuerzas de Viento)
 *
 * Referencia: Norma Venezolana COVENIN 2003-89 "Acción del Viento sobre las Construcciones"
 *
 * Convenciones de Signos de Coeficientes Cp:
 *   Positivo (+): Presión hacia adentro de la superficie (empuje)
 *   Negativo (-): Succión hacia afuera de la superficie (jalado)
 */

// ---------------------------------------------------------------------------
// 1. FACTOR DE EXPOSICIÓN Kz (Tabla 1 - COVENIN 2003-89)
//    Kz se evalúa a la altura media de la cubierta h (m)
//    Fórmula: Kz = 2.01 * (z/zg)^(2/alpha)
//    Parámetros por categoría de exposición.
// ---------------------------------------------------------------------------

/** @type {Record<string, {alpha: number, zg: number}>} */
const EXPOSURE_PARAMS = {
  // Centros de ciudad con edificios altos (terrain roughness D en ASCE, similar Cat.1 COVENIN)
  A: { alpha: 3.0, zg: 457 },
  // Zonas urbanas y suburbanas, zonas forestales (terrain roughness C)
  B: { alpha: 4.5, zg: 365 },
  // Campo abierto con obstáculos dispersos (terrain roughness B)
  C: { alpha: 7.0, zg: 274 },
  // Costa y terreno plano sin obstáculos (terrain roughness A)
  D: { alpha: 10.0, zg: 213 },
};

/**
 * Calcula el Factor de Exposición Kz a una altura z dada.
 * @param {number} z - Altura de evaluación (m). Mínimo 4.5 m según norma.
 * @param {'A'|'B'|'C'|'D'} exposure - Categoría de exposición
 * @returns {number} Kz
 */
export function calcKz(z, exposure) {
  const params = EXPOSURE_PARAMS[exposure] || EXPOSURE_PARAMS['B'];
  const { alpha, zg } = params;
  const zEval = Math.max(z, 4.5); // Mínimo normativo
  const kz = 2.01 * Math.pow(zEval / zg, 2 / alpha);
  return Math.round(kz * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// 2. FACTOR DE RÁFAGA G (Sección 6.5.8 - Procedimiento simplificado)
//    Para estructuras rígidas (freq. natural > 1 Hz, típico en galpones), G = 0.85
// ---------------------------------------------------------------------------

/**
 * Factor de ráfaga para galpones rígidos convencionales.
 * @returns {number} G = 0.85
 */
export function calcG() {
  return 0.85;
}

// ---------------------------------------------------------------------------
// 3. PRESIÓN DINÁMICA DE VELOCIDAD q (kgf/m²)
//    Fórmula COVENIN: q = 0.00482 * Kz * V^2
//    Donde V está en km/h y q resulta en kgf/m²
// ---------------------------------------------------------------------------

/**
 * Calcula la presión dinámica de velocidad.
 * @param {number} V - Velocidad básica del viento (km/h)
 * @param {number} Kz - Factor de exposición
 * @returns {number} q en kgf/m²
 */
export function calcQ(V, Kz) {
  return 0.00482 * Kz * Math.pow(V, 2);
}

// ---------------------------------------------------------------------------
// 4. COEFICIENTES DE PRESIÓN EXTERNA Cp (Figura 6-6 - COVENIN 2003-89)
//    Para edificios con cubierta a dos aguas (galpones industriales)
//    Se devuelven coeficientes para: Barlovento (W) y Sotavento (L) del techo
//    y para paredes Barlovento (W) y Sotavento (L).
//
//    Convención: h = altura media del techo, L = profundidad paralela al viento
// ---------------------------------------------------------------------------

/**
 * Interpola linealmente entre dos puntos.
 * @param {number} x0 
 * @param {number} y0 
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x 
 * @returns {number}
 */
function interp(x0, y0, x1, y1, x) {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
}

/**
 * Calcula los Coeficientes de Presión Externa Cp para techo a dos aguas
 * según COVENIN 2003-89 (equivalente a ASCE 7 Fig 6-6).
 *
 * @param {number} theta - Ángulo de inclinación del techo en grados
 * @param {number} h - Altura media de la cubierta (m) = (alero + cumbrera) / 2
 * @param {number} L - Profundidad del galpón PARALELA a la dirección del viento (m)
 * @returns {{ roof_W: number, roof_L: number, wall_W: number, wall_L: number }}
 */
export function calcCpGable(theta, h, L) {
  const ratio = h / L; // Relación h/L

  // ---------- TECHO - BARLOVENTO ----------
  // Tabla interpolada de COVENIN 2003-89 / ASCE 7-16 Figura 27.4-1
  // Datos: [theta, Cp_barlovento_h/L<=0.25, Cp_barlovento_h/L=0.5, Cp_barlovento_h/L>=1.0]
  const roofW_table = [
    //  θ      h/L≤0.25   h/L=0.5   h/L≥1.0
    [  0,     -0.70,     -0.70,    -0.70 ],
    [  5,     -0.70,     -0.70,    -0.70 ],
    [ 10,     -0.70,     -0.70,    -0.70 ],
    [ 15,     -0.70,     -0.60,    -0.60 ],
    [ 20,     -0.70,     -0.20,    -0.20 ],
    [ 25,     -0.30,      0.20,     0.20 ],
    [ 30,      0.20,      0.30,     0.30 ],
    [ 35,      0.20,      0.40,     0.40 ],
    [ 45,      0.20,      0.40,     0.40 ],
    [ 60,      0.20,      0.40,     0.40 ],
    [ 75,      0.20,      0.40,     0.40 ],
  ];

  // ---------- TECHO - SOTAVENTO ----------
  // Cp sotavento no depende de h/L (valor constante por rango de theta)
  const roofL_table = [
    [ 0, -0.30], [ 5, -0.30], [10, -0.30],
    [15, -0.50], [20, -0.50], [25, -0.50],
    [30, -0.50], [35, -0.50], [45, -0.50],
    [60, -0.00], [75,  0.00],
  ];

  // Función para interpolar sobre tablas por theta
  const interpByTheta = (table, t) => {
    for (let i = 0; i < table.length - 1; i++) {
      if (t >= table[i][0] && t <= table[i + 1][0]) {
        const frac = (t - table[i][0]) / (table[i + 1][0] - table[i][0]);
        return table[i][1] + (table[i + 1][1] - table[i][1]) * frac;
      }
    }
    // Fuera de rango
    return t <= table[0][0] ? table[0][1] : table[table.length - 1][1];
  };

  // Interpolar Cp techo barlovento entre columnas de h/L
  const interpRoofW = (t) => {
    const low  = interpByTheta(roofW_table.map(r => [r[0], r[1]]), t); // h/L ≤ 0.25
    const mid  = interpByTheta(roofW_table.map(r => [r[0], r[2]]), t); // h/L = 0.5
    const high = interpByTheta(roofW_table.map(r => [r[0], r[3]]), t); // h/L ≥ 1.0

    const clampedRatio = Math.min(Math.max(ratio, 0.25), 1.0);
    if (clampedRatio <= 0.5) {
      return interp(0.25, low, 0.5, mid, clampedRatio);
    } else {
      return interp(0.5, mid, 1.0, high, clampedRatio);
    }
  };

  const roof_W = Math.round(interpRoofW(theta) * 1000) / 1000;
  const roof_L = Math.round(interpByTheta(roofL_table, theta) * 1000) / 1000;

  // ---------- PAREDES ----------
  // Valores constantes para cualquier ángulo de techo (Tabla 1 COVENIN 2003-89)
  const wall_W = 0.80;  // Barlovento: siempre +0.8 (presión)
  const wall_L_table = [ // Sotavento depende de relación L/B
    [0.25, -0.50],
    [0.50, -0.50],
    [1.00, -0.50],
    [2.00, -0.30],
    [4.00, -0.20],
  ];
  // L/B: L es la profundidad (dirección del viento), B es la dimensión perpendicular
  // Ambas dimensiones vienen del wizardConfig. Por defecto L/B ~ ratio L/B
  // Usamos L/L≈1 para simplificar aquí (el modal puede proveer numBaysY*bayWidthY como B)
  const wall_L = -0.50; // Conservador

  return { roof_W, roof_L, wall_W, wall_L };
}

// ---------------------------------------------------------------------------
// 5. FUNCIÓN PRINCIPAL: Calcula todas las presiones para un galpón
//    Devuelve presiones de diseño (kgf/m²) listas para multiplicar por área
// ---------------------------------------------------------------------------

/**
 * Calcula las presiones de viento COVENIN para un galpón a dos aguas.
 *
 * @param {object} params
 * @param {number} params.V - Velocidad básica del viento (km/h)
 * @param {'A'|'B'|'C'|'D'} params.exposure - Categoría de exposición
 * @param {number} params.eaveHeight - Altura de alero (m)
 * @param {number} params.ridgeHeight - Altura de cumbrera (m)
 * @param {number} params.spanX - Luz del galpón en X (m) - perpendicular a cumbrera
 * @param {number} params.bayY - Modulación de pórticos en Y (m) - paralelo a cumbrera
 * @returns {{
 *   Kz: number, G: number, q: number, theta: number,
 *   cp: {roof_W: number, roof_L: number, wall_W: number, wall_L: number},
 *   pressures: {
 *     roof_W_kgfm2: number, roof_L_kgfm2: number,
 *     wall_W_kgfm2: number, wall_L_kgfm2: number
 *   }
 * }}
 */
export function calcWindCOVENIN({ V, exposure, eaveHeight, ridgeHeight, spanX, bayY }) {
  // Altura media de la cubierta
  const h_mean = (eaveHeight + ridgeHeight) / 2;

  // Ángulo de inclinación del techo (grados)
  const halfSpan = spanX / 2;
  const rise = ridgeHeight - eaveHeight;
  const theta = Math.round(Math.atan(rise / halfSpan) * (180 / Math.PI) * 10) / 10;

  // Factores normativos
  const Kz = calcKz(h_mean, exposure);
  const G  = calcG();
  const q  = calcQ(V, Kz);

  // Coeficientes de presión
  const cp = calcCpGable(theta, h_mean, spanX);

  // Presiones finales p = q * G * Cp (kgf/m²)
  // Signo respeta la convención: positivo = hacia la superficie (presión), negativo = succi‌ón
  const pressures = {
    roof_W_kgfm2:  Math.round(q * G * cp.roof_W * 100) / 100,
    roof_L_kgfm2:  Math.round(q * G * cp.roof_L * 100) / 100,
    wall_W_kgfm2:  Math.round(q * G * cp.wall_W * 100) / 100,
    wall_L_kgfm2:  Math.round(q * G * cp.wall_L * 100) / 100,
  };

  return { Kz, G, q, theta, cp, pressures };
}
