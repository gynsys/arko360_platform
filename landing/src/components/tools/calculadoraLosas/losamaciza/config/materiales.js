import { U } from './unidades';

// Factores normativos
export const FACTORES = {
  CARGA_MUERTA: 1.2,
  CARGA_VIVA: 1.6,
  DIRECCIONES: 2.0,         // luz mayor / luz menor ≤ 2 → dos direcciones
  PHI_CORTANTE: 0.75,
  VC_COEF: 0.53,            // 0.53·√fc (MPa) para cortante por ancho unitario
  LIMITE_FLECHA: 360,
  LIMITE_SEP_ACERO_CM: 45.7,
  DESPERDICIO_ACERO: 1.15,  // 15% de desperdicio/traslape
  ESPESOR_MIN_M: 0.10,
  RECUBRIMIENTO_MIN_M: 0.04,
  ANCHO_DISENO_MM: 1000,    // 1 metro de ancho de diseño
};

// Densidades
export const DENSIDAD = {
  ACERO: 7850 * U.kg_m3,      // kg/m³
  CONCRETO: 2400 * U.kg_m3,   // kg/m³
};

// Áreas de barras en mm² (según diámetro nominal pulgadas)
export const AREAS_BARRA = {
  '3/8': 71,
  '1/2': 129,
  '5/8': 199,
  '3/4': 284,
  '1': 519,
};

export const DIAMETROS_VALIDOS = ['3/8', '1/2', '5/8', '3/4', '1'];

// Espesor mínimo normativo: luz/20 para losa maciza (m)
export const calcEspesorMinimo = (luzMayorM) => luzMayorM / 20;

// Espesor de diseño: ceil(luz/20) en cm, convertido a m, pero no menor al mínimo absoluto
export const calcEspesorDiseno = (luzMayorM) => {
  const hMinM = calcEspesorMinimo(luzMayorM);
  const hMinCm = Math.ceil(hMinM * 100);
  const hAbsMinCm = Math.ceil(FACTORES.ESPESOR_MIN_M * 100);
  return Math.max(hMinCm, hAbsMinCm) / 100;
};
