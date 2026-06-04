import React from 'react';
import { AREAS_BARRA, calcBarraYSep, calcFlexion, calcCortante, calcDeflexion } from './utilidades';

export function calcularLosaMaciza(grid, datos, macizaConfig, costos) {
  const { filas, cols, luzX, luzY } = grid;
  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);
  const areaTotal = luzX * nTramosX * luzY * nTramosY;

  const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
  const esDosDirecciones = ratio <= 2;
  const luzMayor = Math.max(luzX, luzY);
  const luzMenor = Math.min(luzX, luzY);

  // Espesor
  const h = Math.max(Math.ceil((luzMayor * 100) / 20), 10) / 100;
  const pesoPropio = h * 2400;

  const wD = pesoPropio + datos.cmExtra;
  const wu = 1.2 * wD + 1.6 * datos.cv;
  const wServicio = wD + datos.cv;

  // Momentos según ACI 318-19
  let mPosX, mNegX, mPosY, mNegY;

  if (esDosDirecciones) {
    const wuPanel = wu * luzMenor;
    const MoX = (wuPanel * Math.pow(luzMayor, 2)) / 8;
    const MoY = (wu * luzMayor * Math.pow(luzMenor, 2)) / 8;

    mNegX = 0.65 * MoX * 0.65;
    mPosX = 0.35 * MoX * 0.65;
    mNegY = 0.65 * MoY * 0.65;
    mPosY = 0.35 * MoY * 0.65;
  } else {
    const wuLineal = wu * luzMenor;
    mPosX = (wuLineal * Math.pow(luzMayor, 2)) / 14;
    mNegX = (wuLineal * Math.pow(luzMayor, 2)) / 11;
    mPosY = (wu * Math.pow(luzMenor, 2)) / 14;
    mNegY = (wu * Math.pow(luzMenor, 2)) / 11;
  }

  if (nTramosX === 1 && !esDosDirecciones) {
    mPosX = (wu * luzMenor * Math.pow(luzMayor, 2)) / 8;
    mNegX = 0;
  }
  if (nTramosY === 1 && !esDosDirecciones) {
    mPosY = (wu * luzMayor * Math.pow(luzMenor, 2)) / 8;
    mNegY = 0;
  }

  const maxMomentoX = Math.max(mPosX, mNegX);
  const maxMomentoY = Math.max(mPosY, mNegY);
  const maxMomento = Math.max(maxMomentoX, maxMomentoY);

  // Diseño a flexión
  const d = (h * 100) - datos.recubrimiento;
  const b = 100;

  const flexX = calcFlexion(maxMomentoX, b, d, datos.fc, datos.fy);
  const flexY = calcFlexion(maxMomentoY, b, d, datos.fc, datos.fy);
  const flexGov = calcFlexion(maxMomento, b, d, datos.fc, datos.fy);

  // Selección de barras
  const armadoDir = (AsReq, diametroPos, diametroNeg) => {
    const areaPos = AREAS_BARRA[diametroPos];
    const areaNeg = AREAS_BARRA[diametroNeg];
    const pos = calcBarraYSep(AsReq, areaPos);
    const neg = calcBarraYSep(AsReq * 1.3, areaNeg);
    return { pos, neg, diametroPos, diametroNeg };
  };

  const armX = armadoDir(flexX.As_req, macizaConfig.diametroPosX, macizaConfig.diametroNegX);
  const armY = armadoDir(flexY.As_req, macizaConfig.diametroPosY, macizaConfig.diametroNegY);

  // Cortante
  const Vc = 0.53 * Math.sqrt(datos.fc) * b * d;
  const φVc = 0.75 * Vc;
  const vuMax = (wu * luzMayor) / 2;
  const cortante = calcCortante(Vc, φVc, vuMax);

  // Materiales
  const volConcreto = areaTotal * h;
  const kgAceroX = (flexX.As_req / 10000) * areaTotal * 7850 * 1.15;
  const kgAceroY = esDosDirecciones ? (flexY.As_req / 10000) * areaTotal * 7850 * 1.15 : 0;
  const kgAcero = kgAceroX + kgAceroY;

  const costoTotal = (volConcreto * costos.concretoM3) + (kgAcero * costos.aceroKg);

  // Verificaciones
  const h_min = (luzMayor * 100) / 20;
  const cumpleEspesor = (h * 100) >= h_min;
  const s_max = Math.min(3 * (h * 100), 45.7);

  let deflexion = null;
  if (!cumpleEspesor) {
    deflexion = calcDeflexion(wServicio, luzMayor, h * 100, datos.fc);
  }

  return {
    h: (h * 100).toFixed(1),
    h_min: h_min.toFixed(1),
    pesoPropio: pesoPropio.toFixed(0),
    wu: wu.toFixed(2),
    wServicio: wServicio.toFixed(2),
    d: d.toFixed(1),
    maxMomentoX: maxMomentoX.toFixed(2),
    maxMomentoY: maxMomentoY.toFixed(2),
    maxMomento: maxMomento.toFixed(2),
    As_reqX: flexX.As_req.toFixed(2),
    As_reqY: flexY.As_req.toFixed(2),
    As_min: flexX.As_min.toFixed(2),
    ρ: flexGov.rho.toFixed(6),
    εt: flexGov.εt.toFixed(5),
    εty: flexGov.εty.toFixed(5),
    tensionControlada: flexGov.tensionControlada,
    Vc: cortante.Vc.toFixed(0),
    φVc: cortante.φVc.toFixed(0),
    vuMax: cortante.vuMax.toFixed(2),
    cumpleCortante: cortante.cumpleCortante,
    cumpleEspesor,
    deflexion,
    s_max: s_max.toFixed(1),
    volConcreto: volConcreto.toFixed(2),
    kgAcero: kgAcero.toFixed(0),
    costoTotal: costoTotal.toFixed(2),
    costoM2: (costoTotal / areaTotal).toFixed(2),
    armX: {
      posSep: armX.pos.sep,
      negSep: armX.neg.sep,
      posDiam: armX.diametroPos,
      negDiam: armX.diametroNeg,
      posCant: (armX.pos.cantidadPorMetro * areaTotal).toFixed(0),
      negCant: (armX.neg.cantidadPorMetro * areaTotal * 0.5).toFixed(0),
    },
    armY: {
      posSep: armY.pos.sep,
      negSep: armY.neg.sep,
      posDiam: armY.diametroPos,
      negDiam: armY.diametroNeg,
      posCant: (armY.pos.cantidadPorMetro * areaTotal).toFixed(0),
      negCant: (armY.neg.cantidadPorMetro * areaTotal * 0.5).toFixed(0),
    },
    macizaData: {
      mPosX, mNegX, mPosY, mNegY,
      maxMomentoX, maxMomentoY, maxMomento,
      flexX, flexY,
      armX, armY,
      d, b,
    },
  };
}

export default function LosaMaciza({ grid, datos, macizaConfig, costos, onConfigChange }) {
  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Configuración Losa Maciza</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Diámetro barras X (positivo)
          </label>
          <select
            name="diametroPosX"
            value={macizaConfig.diametroPosX}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="3/8">3/8"</option>
            <option value="1/2">1/2"</option>
            <option value="5/8">5/8"</option>
            <option value="3/4">3/4"</option>
            <option value="1">1"</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Diámetro barras X (negativo)
          </label>
          <select
            name="diametroNegX"
            value={macizaConfig.diametroNegX}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="3/8">3/8"</option>
            <option value="1/2">1/2"</option>
            <option value="5/8">5/8"</option>
            <option value="3/4">3/4"</option>
            <option value="1">1"</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Diámetro barras Y (positivo)
          </label>
          <select
            name="diametroPosY"
            value={macizaConfig.diametroPosY}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="3/8">3/8"</option>
            <option value="1/2">1/2"</option>
            <option value="5/8">5/8"</option>
            <option value="3/4">3/4"</option>
            <option value="1">1"</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Diámetro barras Y (negativo)
          </label>
          <select
            name="diametroNegY"
            value={macizaConfig.diametroNegY}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="3/8">3/8"</option>
            <option value="1/2">1/2"</option>
            <option value="5/8">5/8"</option>
            <option value="3/4">3/4"</option>
            <option value="1">1"</option>
          </select>
        </div>
      </div>
    </div>
  );
}
