import React from 'react';
import { calcBarraYSep, calcFlexion, calcCortante } from './utilidades';
import { renderGrid, renderSeccion } from './visualizacion';

export function calcularLosaLigera(grid, datos, aligeradaConfig, costos) {
  const { filas, cols, luzX, luzY } = grid;
  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);
  const areaTotal = luzX * nTramosX * luzY * nTramosY;

  const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
  const esDosDirecciones = ratio <= 2;
  const luzMayor = Math.max(luzX, luzY);
  const luzMenor = Math.min(luzX, luzY);

  const h = Math.max(Math.ceil((luzMayor * 100) / 16), 15) / 100;
  const { anchoNervio, espesorRoseta, anchoBloque, tipoBloque, dirNervios } = aligeradaConfig;

  // Determinar dirección de nervios
  let nerviosEnX = false, nerviosEnY = false;
  if (dirNervios === 'auto') {
    if (esDosDirecciones) {
      nerviosEnX = true;
      nerviosEnY = true;
    } else {
      nerviosEnX = luzX >= luzY;
      nerviosEnY = luzY > luzX;
    }
  } else if (dirNervios === 'x') { nerviosEnX = true; }
  else if (dirNervios === 'y') { nerviosEnY = true; }
  else if (dirNervios === 'ambos') { nerviosEnX = true; nerviosEnY = true; }

  // Volumen de concreto por m²
  const volM2 = (espesorRoseta / 100) + ((anchoNervio / 100) * (h - espesorRoseta / 100) * (100 / anchoBloque));
  const pesoPropio = volM2 * 2400;

  // Peso de bloques
  const pesoBloqueM2 = tipoBloque === 'arcilla' ? 25 : 0.5;

  const wD = pesoPropio + datos.cmExtra + pesoBloqueM2;
  const wu = 1.2 * wD + 1.6 * datos.cv;
  const wServicio = wD + datos.cv;

  // Momentos - viga continua en dirección de nervios
  const calcMomentosNervios = (luz, nTramos, wuLineal) => {
    const tramos = [];
    for (let i = 0; i < nTramos; i++) {
      const isExtremo = (i === 0 || i === nTramos - 1);
      let mPos, mNegIzq, mNegDer;
      if (nTramos === 1) {
        mPos = (wuLineal * luz * luz) / 8;
        mNegIzq = 0; mNegDer = 0;
      } else if (isExtremo) {
        mPos = (wuLineal * luz * luz) / 14;
        mNegIzq = (wuLineal * luz * luz) / 16;
        mNegDer = (wuLineal * luz * luz) / 11;
      } else {
        mPos = (wuLineal * luz * luz) / 16;
        mNegIzq = (wuLineal * luz * luz) / 11;
        mNegDer = (wuLineal * luz * luz) / 11;
      }
      tramos.push({ id: i, luz, mPos, mNegIzq, mNegDer, isExtremo });
    }
    return tramos;
  };

  const cargaPorNervioX = wu * (anchoBloque / 100);
  const cargaPorNervioY = wu * (anchoBloque / 100);

  const tramosX = nerviosEnX ? calcMomentosNervios(luzX, nTramosX, cargaPorNervioX) : [];
  const tramosY = nerviosEnY ? calcMomentosNervios(luzY, nTramosY, cargaPorNervioY) : [];

  const maxMomentoX = nerviosEnX ? Math.max(...tramosX.map(t => Math.max(t.mPos, t.mNegIzq, t.mNegDer))) : 0;
  const maxMomentoY = nerviosEnY ? Math.max(...tramosY.map(t => Math.max(t.mPos, t.mNegIzq, t.mNegDer))) : 0;
  const maxMomento = Math.max(maxMomentoX, maxMomentoY);

  // Diseño a flexión del nervio
  const dNervio = (h * 100) - datos.recubrimiento;
  const bNervio = anchoNervio;
  const flex = calcFlexion(maxMomento, bNervio, dNervio, datos.fc, datos.fy);

  // Cortante en nervio
  const Vc = 0.53 * Math.sqrt(datos.fc) * bNervio * dNervio;
  const φVc = 0.75 * Vc;
  const vuMax = (wu * anchoBloque / 100 * Math.max(luzX, luzY)) / 2;
  const cortante = calcCortante(Vc, φVc, vuMax);

  const h_min = (luzMayor * 100) / 16;
  const cumpleEspesor = (h * 100) >= h_min;

  // Materiales
  const volConcreto = areaTotal * volM2;
  const numNerviosX = nerviosEnX ? Math.ceil((luzY * nTramosY) / (anchoBloque / 100)) * nTramosX : 0;
  const numNerviosY = nerviosEnY ? Math.ceil((luzX * nTramosX) / (anchoBloque / 100)) * nTramosY : 0;
  const kgAceroX = nerviosEnX ? (flex.As_req / 10000) * luzX * numNerviosX * 7850 * 1.3 : 0;
  const kgAceroY = nerviosEnY ? (flex.As_req / 10000) * luzY * numNerviosY * 7850 * 1.3 : 0;
  const kgAcero = kgAceroX + kgAceroY;

  // Malla en roseta
  const kgMalla = (0.142 / 10000) * areaTotal * 7850 * 1.1;

  // Bloques
  const areaPorBloque = (anchoBloque / 100) * (luzX < luzY ? luzX : luzY);
  const numBloques = Math.ceil(areaTotal / areaPorBloque);

  const costoBloques = numBloques * (tipoBloque === 'arcilla' ? costos.bloqueArcillaUnd : costos.bloqueEPSUnd);
  const costoTotal = (volConcreto * costos.concretoM3) + (kgAcero * costos.aceroKg) + costoBloques + (kgMalla * costos.aceroKg);

  return {
    h: (h * 100).toFixed(1),
    h_min: h_min.toFixed(1),
    pesoPropio: pesoPropio.toFixed(0),
    wu: wu.toFixed(2),
    wServicio: wServicio.toFixed(2),
    d: dNervio.toFixed(1),
    maxMomentoX: maxMomentoX.toFixed(2),
    maxMomentoY: maxMomentoY.toFixed(2),
    maxMomento: maxMomento.toFixed(2),
    As_req: flex.As_req.toFixed(2),
    As_min: flex.As_min.toFixed(2),
    ρ: flex.rho.toFixed(6),
    εt: flex.εt.toFixed(5),
    εty: flex.εty.toFixed(5),
    tensionControlada: flex.tensionControlada,
    Vc: cortante.Vc.toFixed(0),
    φVc: cortante.φVc.toFixed(0),
    vuMax: cortante.vuMax.toFixed(2),
    cumpleCortante: cortante.cumpleCortante,
    cumpleEspesor,
    deflexion: null,
    s_max: Math.min(3 * h * 100, 45.7).toFixed(1),
    volConcreto: volConcreto.toFixed(2),
    kgAcero: kgAcero.toFixed(0),
    numBloques,
    costoTotal: costoTotal.toFixed(2),
    costoM2: (costoTotal / areaTotal).toFixed(2),
    kgMalla: kgMalla.toFixed(0),
    aligeradaData: {
      nerviosEnX, nerviosEnY,
      numNerviosX, numNerviosY,
      tramosX, tramosY,
      maxMomentoX, maxMomentoY, maxMomento,
      dNervio, bNervio, As_req: flex.As_req, As_min: flex.As_min, rho: flex.rho, Ru: flex.Ru,
      volM2,
      kgMalla,
    },
  };
}

export default function LosaLigera({ aligeradaConfig, onConfigChange }) {
  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Configuración Losa Aligerada</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Tipo de bloque
          </label>
          <select
            name="tipoBloque"
            value={aligeradaConfig.tipoBloque}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="eps">EPS (Poliestireno)</option>
            <option value="arcilla">Arcilla</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Ancho bloque (cm)
          </label>
          <input
            type="number"
            name="anchoBloque"
            value={aligeradaConfig.anchoBloque}
            onChange={onConfigChange}
            step="5"
            min="30"
            max="60"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Ancho nervio (cm)
          </label>
          <input
            type="number"
            name="anchoNervio"
            value={aligeradaConfig.anchoNervio}
            onChange={onConfigChange}
            step="1"
            min="8"
            max="15"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Espesor roseta (cm)
          </label>
          <input
            type="number"
            name="espesorRoseta"
            value={aligeradaConfig.espesorRoseta}
            onChange={onConfigChange}
            step="0.5"
            min="3"
            max="7"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Dirección de nervios
          </label>
          <select
            name="dirNervios"
            value={aligeradaConfig.dirNervios}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="auto">Automático (según luces)</option>
            <option value="x">Dirección X</option>
            <option value="y">Dirección Y</option>
            <option value="ambos">Ambas direcciones</option>
          </select>
        </div>
      </div>

      {/* SVG RETÍCULA */}
      {renderGrid(grid, resultados, 'aligerada', null, aligeradaConfig)}

      {/* SVG SECCIÓN TRANSVERSAL */}
      {renderSeccion(resultados, 'aligerada', null, aligeradaConfig)}
    </div>
  );
}
