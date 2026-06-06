import { N, toMM, toCM, fmt, fmtInt } from '../config/unidades';
import { FACTORES, DENSIDAD, calcEspesorDiseno, calcEspesorMinimo } from '../config/materiales';
import {
  calcGeometria,
  normalizarEntrada,
  calcCargas,
  calcMomentosUnaDireccion,
  calcMomentosDosDirecciones,
} from './nucleoLosa';
import { verificarFlexion, verificarCortante, verificarDeflexion, seleccionarBarras } from './verificaciones';
import { calcularMetradoDireccion, calcularCostos } from './metrado';

export const calcularLosaMaciza = (grid, datos, macizaConfig, costos) => {
  // 1. Geometría
  const geo = calcGeometria(grid);
  if (geo.areaTotal <= 0 || geo.luzMayor <= 0) return null;

  // 2. Materiales y cargas
  const params = normalizarEntrada(datos);
  const h = calcEspesorDiseno(geo.luzMayor);
  const hMin = calcEspesorMinimo(geo.luzMayor);
  const { pesoPropio, wD, wu, wServicio } = calcCargas(h, params.cmExtra, params.cv, DENSIDAD.CONCRETO);

  // 3. Momentos
  const momentos = geo.esDosDirecciones
    ? calcMomentosDosDirecciones(wu, geo.luzMayor, geo.luzMenor)
    : calcMomentosUnaDireccion(wu, geo.luzMayor, geo.luzMenor, geo.nTramosX, geo.nTramosY);

  const maxMomentoX = Math.max(momentos.mPosX, momentos.mNegX);
  const maxMomentoY = Math.max(momentos.mPosY, momentos.mNegY);
  const maxMomento = Math.max(maxMomentoX, maxMomentoY);

  // 4. Flexión (unidades: b y d en mm, momentos en kN·m)
  const d = Math.max(toMM(h) - toMM(params.recubrimiento), 1); // mm
  const b = toMM(1); // 1000 mm = 1 m de ancho de diseño

  const flexX = verificarFlexion(maxMomentoX, b, d, params.fc, params.fy);
  const flexY = verificarFlexion(maxMomentoY, b, d, params.fc, params.fy);
  const flexGov = verificarFlexion(maxMomento, b, d, params.fc, params.fy);

  // 5. Armado
  const armX = seleccionarBarras(N(flexX.As_req), macizaConfig?.diametroPosX, macizaConfig?.diametroNegX, 1.3);
  const armY = seleccionarBarras(N(flexY.As_req), macizaConfig?.diametroPosY, macizaConfig?.diametroNegY, 1.3);

  // 6. Cortante
  const cortante = verificarCortante(wu, geo.luzMayor, params.fc, b, d);

  // 7. Deflexión
  const deflexionObj = verificarDeflexion(wServicio, geo.luzMayor, toCM(h), params.fc);
  const deflexion = N(deflexionObj.δ) * 10; // Convertir de cm a mm
  const limiteDeflexion = N(deflexionObj.δLim) * 10; // Convertir de cm a mm
  const cumpleDeflexion = deflexion <= limiteDeflexion;
  const ratioDeflexion = limiteDeflexion > 0 ? deflexion / limiteDeflexion : 0;

  // 8. Metrado
  const volConcreto = geo.areaTotal * h;

  const metradoX = calcularMetradoDireccion(
    armX, geo.areaTotal, geo.luzX, geo.luzY, geo.nTramosY
  );
  const metradoY = geo.esDosDirecciones
    ? calcularMetradoDireccion(armY, geo.areaTotal, geo.luzY, geo.luzX, geo.nTramosX)
    : { pos: {}, neg: {}, pesoTotal: 0 };

  const kgAcero = metradoX.pesoTotal + metradoY.pesoTotal;

  // 9. Costos
  const { costoTotal, costoM2 } = (() => {
    const c = calcularCostos(volConcreto, kgAcero, costos);
    return {
      costoTotal: c.costoTotal,
      costoM2: geo.areaTotal > 0 ? c.costoTotal / geo.areaTotal : 0,
    };
  })();

  // 10. Verificaciones globales
  const cumpleEspesor = toMM(h) >= toMM(hMin);
  const sMax = Math.min(3 * toMM(h), FACTORES.LIMITE_SEP_ACERO_CM * 10); // mm

  const getAreaMM2 = (d) => {
    const areas = { '3/8': 71, '1/2': 129, '5/8': 199, '3/4': 284, '1': 519 };
    return areas[d] || 0;
  };
  const asProvX = armX.pos.sep > 0 ? (100 / armX.pos.sep) * getAreaMM2(macizaConfig?.diametroPosX) : 0;
  const asProvY = armY.pos.sep > 0 ? (100 / armY.pos.sep) * getAreaMM2(macizaConfig?.diametroPosY) : 0;
  const asProvGov = Math.max(asProvX, asProvY);

  const ratioCortante = N(cortante.phiVc) > 0 ? N(cortante.vuMax) / N(cortante.phiVc) : 0;
  const ratioEspesor = toMM(h) > 0 ? toMM(hMin) / toMM(h) : 0;
  const ratioFlexion = asProvGov > 0 ? N(flexGov.As_req) / asProvGov : 0;
  
  const cumpleAcero = asProvGov >= N(flexGov.As_min);
  const cumpleSeparacion = armX.pos.sep * 10 <= sMax && armY.pos.sep * 10 <= sMax; // sep is in cm
  const ratioSeparacion = armX.pos.sep > 0 ? (armX.pos.sep * 10) / sMax : 0;

  return {
    // Geometría y cargas
    h: fmt(toCM(h), 1),
    h_min: fmt(toCM(hMin), 1),
    pesoPropio: fmtInt(pesoPropio),
    wu: fmt(wu, 2),
    wServicio: fmt(wServicio, 2),
    d: fmt(d, 1),
    areaTotal: fmt(geo.areaTotal, 2),
    ratio: fmt(geo.ratio, 2),
    esDosDirecciones: geo.esDosDirecciones,

    // Momentos
    maxMomentoX: fmt(maxMomentoX, 2),
    maxMomentoY: fmt(maxMomentoY, 2),
    maxMomento: fmt(maxMomento, 2),

    // Flexión
    As_reqX: fmt(N(flexX.As_req), 2),
    As_reqY: fmt(N(flexY.As_req), 2),
    As_min: fmt(N(flexGov.As_min), 2),
    rho: fmt(N(flexGov.rho), 6),
    et: fmt(N(flexGov.et), 5),
    ety: fmt(N(flexGov.ety), 5),
    tensionControlada: Boolean(flexGov.tensionControlada),

    // Cortante
    Vc: fmtInt(N(cortante.Vc)),
    phiVc: fmtInt(N(cortante.phiVc)),
    vuMax: fmt(N(cortante.vuMax), 2),
    cumpleCortante: Boolean(cortante.cumpleCortante),
    ratioCortante: fmt(ratioCortante, 2),

    // Deflexión
    deflexion: fmt(deflexion, 2),
    limiteDeflexion: fmt(limiteDeflexion, 2),
    cumpleDeflexion,
    ratioDeflexion: fmt(ratioDeflexion, 2),

    // Verificaciones
    cumpleEspesor,
    ratioEspesor: fmt(ratioEspesor, 2),
    cumpleAcero,
    cumpleSeparacion,
    ratioFlexion: fmt(ratioFlexion, 2),
    ratioSeparacion: fmt(ratioSeparacion, 2),
    s_max: fmt(sMax, 1),
    cumpleGlobal: cumpleEspesor && Boolean(cortante.cumpleCortante) && cumpleDeflexion && cumpleAcero && cumpleSeparacion,

    // Materiales
    volConcreto: fmt(volConcreto, 2),
    kgAcero: fmtInt(kgAcero),
    costoTotal: fmt(costoTotal, 2),
    costoM2: fmt(costoM2, 2),

    // Metrado detallado (serializable)
    metradoX: {
      posSep: metradoX.pos.sep ?? null,
      negSep: metradoX.neg.sep ?? null,
      posDiam: metradoX.pos.diametro ?? null,
      negDiam: metradoX.neg.diametro ?? null,
      posCant: metradoX.pos.cantidad ?? 0,
      negCant: metradoX.neg.cantidad ?? 0,
      posPeso: fmt(metradoX.pos.peso, 2),
      negPeso: fmt(metradoX.neg.peso, 2),
    },
    metradoY: {
      posSep: metradoY.pos.sep ?? null,
      negSep: metradoY.neg.sep ?? null,
      posDiam: metradoY.pos.diametro ?? null,
      negDiam: metradoY.neg.diametro ?? null,
      posCant: metradoY.pos.cantidad ?? 0,
      negCant: metradoY.neg.cantidad ?? 0,
      posPeso: fmt(metradoY.pos.peso, 2),
      negPeso: fmt(metradoY.neg.peso, 2),
    },
  };
};
