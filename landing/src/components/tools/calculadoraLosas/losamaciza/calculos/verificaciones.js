import { N, toMM } from '../config/unidades';
import { FACTORES } from '../config/materiales';

// NOTA: Estas funciones se importan de tu utilidades.js existente.
// Se asume que esperan:
//   M en kN·m, b y d en mm, fc y fy en MPa
// Y devuelven objetos con As_req en mm²
import { calcFlexion, calcCortante, calcDeflexion, calcBarraYSep } from '../../utilidades';

// Wrapper con unidades explícitas
export const verificarFlexion = (mMomentoKNm, bMM, dMM, fcMPa, fyMPa) => {
  if (!mMomentoKNm || !bMM || !dMM || !fcMPa || !fyMPa) {
    return { As_req: 0, As_min: 0, rho: 0, et: 0, ety: 0, tensionControlada: false };
  }
  const res = calcFlexion(mMomentoKNm, bMM, dMM, fcMPa, fyMPa);
  return { ...res, et: res.εt, ety: res.εty };
};

export const verificarCortante = (wu, luzMayorM, fcKgCm2, bMM, dMM) => {
  const fcMPa = fcKgCm2 / 10;
  const Vc_N = FACTORES.VC_COEF * Math.sqrt(Math.max(fcMPa, 0)) * bMM * dMM; // N (fc en MPa, b,d en mm)
  const phiVc_N = FACTORES.PHI_CORTANTE * Vc_N;
  const vuMax_kg = (wu * luzMayorM) / 2; // kg
  const vuMax_N = vuMax_kg * 9.81; // N
  // Devolver todo en kN para mantener consistencia
  return calcCortante(Vc_N / 1000, phiVc_N / 1000, vuMax_N / 1000);
};

export const verificarDeflexion = (wServicio, luzMayorM, hMM, fcMPa) => {
  return calcDeflexion(wServicio, luzMayorM, hMM, fcMPa);
};

// Selección de barras con metrado real
export const seleccionarBarras = (AsReqMM2, diametroPos, diametroNeg, factorNeg = 1.3) => {
  const areaPos = N(calcBarraYSep?.AREAS_BARRA?.[diametroPos]) || 0; // Ajusta si AREAS_BARRA está en otro lado
  const areaNeg = N(calcBarraYSep?.AREAS_BARRA?.[diametroNeg]) || 0;

  // Si tus utilidades ya exportan AREAS_BARRA, impórtalo directamente
  // Aquí uso un fallback por si no está disponible
  const getArea = (d) => {
    const areas = { '3/8': 71, '1/2': 129, '5/8': 199, '3/4': 284, '1': 519 };
    return areas[d] || 0;
  };

  const aPos = getArea(diametroPos);
  const aNeg = getArea(diametroNeg);

  const pos = aPos > 0 ? calcBarraYSep(AsReqMM2, aPos) : { sep: null, cantidadPorMetro: 0 };
  const neg = aNeg > 0 ? calcBarraYSep(AsReqMM2 * factorNeg, aNeg) : { sep: null, cantidadPorMetro: 0 };

  return {
    pos: { sep: pos.sep, cantidadPorMetro: N(pos.cantidadPorMetro) },
    neg: { sep: neg.sep, cantidadPorMetro: N(neg.cantidadPorMetro) },
    diametroPos,
    diametroNeg,
  };
};
