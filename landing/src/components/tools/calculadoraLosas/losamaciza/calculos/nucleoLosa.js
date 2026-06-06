import { N } from '../config/unidades';
import { FACTORES, calcEspesorDiseno, calcEspesorMinimo } from '../config/materiales';

// Momentos para losa en una dirección (método de coeficientes ACI)
export const calcMomentosUnaDireccion = (wu, luzMayor, luzMenor, nTramosX, nTramosY) => {
  let mPosX = (wu * luzMenor * luzMayor ** 2) / 14;
  let mNegX = (wu * luzMenor * luzMayor ** 2) / 11;
  let mPosY = (wu * luzMenor ** 2) / 14;
  let mNegY = (wu * luzMenor ** 2) / 11;

  if (nTramosX === 1) {
    mPosX = (wu * luzMenor * luzMayor ** 2) / 8;
    mNegX = 0;
  }
  if (nTramosY === 1) {
    mPosY = (wu * luzMayor * luzMenor ** 2) / 8;
    mNegY = 0;
  }
  return { mPosX, mNegX, mPosY, mNegY };
};

// Momentos para losa en dos direcciones (método del portico equivalente / coeficientes directos)
export const calcMomentosDosDirecciones = (wu, luzMayor, luzMenor) => {
  const wuPanel = wu * luzMenor;
  const MoX = (wuPanel * luzMayor ** 2) / 8;
  const MoY = (wu * luzMayor * luzMenor ** 2) / 8;

  return {
    mNegX: 0.65 * MoX,
    mPosX: 0.35 * MoX,
    mNegY: 0.65 * MoY,
    mPosY: 0.35 * MoY,
  };
};

// Carga última y de servicio
export const calcCargas = (hM, cmExtra, cv, densidadConcreto) => {
  const pesoPropio = hM * densidadConcreto; // kN/m² si densidad está en kN/m³... o kg/m² si no
  // NOTA: Si densidadConcreto = 2400 kg/m³, pesoPropio está en kg/m². 
  // Para kN/m² debería ser 24 kN/m³. Ajusta según tu convención.
  const wD = pesoPropio + cmExtra;
  const wu = FACTORES.CARGA_MUERTA * wD + FACTORES.CARGA_VIVA * cv;
  const wServicio = wD + cv;
  return { pesoPropio, wD, wu, wServicio };
};

// Parámetros geométricos de la losa
export const calcGeometria = (grid) => {
  const luzX = N(grid?.luzX);
  const luzY = N(grid?.luzY);
  const filas = Math.max(N(grid?.filas), 1);
  const cols = Math.max(N(grid?.cols), 1);

  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);
  const areaTotal = luzX * nTramosX * luzY * nTramosY;

  const luzMayor = Math.max(luzX, luzY);
  const luzMenor = Math.min(luzX, luzY);
  const ratio = luzMayor / (luzMenor || 1);
  const esDosDirecciones = ratio <= FACTORES.DIRECCIONES;

  return {
    luzX, luzY, filas, cols,
    nTramosX, nTramosY,
    areaTotal,
    luzMayor, luzMenor,
    ratio, esDosDirecciones,
  };
};

// Datos de entrada normalizados
export const normalizarEntrada = (datos) => ({
  fc: N(datos?.fc),          // kg/cm2
  fy: N(datos?.fy),          // kg/cm2
  cmExtra: N(datos?.cmExtra), // kg/m2
  cv: N(datos?.cv),          // kg/m2
  recubrimiento: N(datos?.recubrimiento) / 100, // cm to m
});
