// Sistema base: longitudes = m, fuerzas = kN, esfuerzos = MPa (N/mm²)
export const U = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  MPa: 1,
  kN: 1,
  kg_m3: 1,
};

// Conversores explícitos
export const toMM = (m) => m / U.mm;        // m → mm
export const toM = (mm) => mm * U.mm;       // mm → m
export const toM2 = (mm2) => mm2 * 1e-6;    // mm² → m²
export const toMM2 = (m2) => m2 * 1e6;      // m² → mm²
export const toCM = (m) => m / U.cm;        // m → cm

// Normalización defensiva
export const N = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Redondeo para salida (no para cálculos intermedios)
export const fmt = (v, dec = 2) => Number(v).toFixed(dec);
export const fmtInt = (v) => Math.round(v).toString();
