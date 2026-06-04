import React, { useState } from 'react';
import { buscarPerfilOptimo, buscarAlternativas, CATALOGO_PERFILES } from './catalogoPerfiles';

const PESO_STEEL_DECK_M2 = {
  22: 7.3, 20: 9.1, 18: 11.4, 16: 14.6,
};

const CAPACIDAD_MOMENTO_DECK_KGM = {
  22: 450, 20: 620, 18: 850, 16: 1150,
};

const CAPACIDAD_CORTANTE_DECK_KGM = {
  22: 2200, 20: 2800, 18: 3500, 16: 4500,
};

const PESO_LINEAL_VIGA = {
  'W12x26': 38.7, 'W10x22': 32.9, 'W8x18': 26.8, 'W6x15': 22.3,
  'C6x10.5': 15.6, 'C5x9': 13.4, 'C4x7.25': 10.8,
};

export function calcularLosaColaborante(grid, datos, steelDeckConfig, costos) {
  const { filas, cols, luzX, luzY } = grid;
  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);
  const areaTotal = luzX * nTramosX * luzY * nTramosY;

  const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
  const esDosDirecciones = ratio <= 2;
  const luzMayor = Math.max(luzX, luzY);
  const luzMenor = Math.min(luzX, luzY);

  const { espesorConcreto, calibre, sepCorreas, tipoVigaPrincipal, tipoCorrea, densidadStuds, alturaDeck } = steelDeckConfig;
  const h = (espesorConcreto + alturaDeck) / 100;

  // Peso propio del sistema compuesto
  const pesoConcreto = (espesorConcreto / 100) * 2400;
  const pesoDeck = PESO_STEEL_DECK_M2[calibre] || 9;
  const pesoCorreas = (PESO_LINEAL_VIGA[tipoCorrea] || 15) / sepCorreas;
  const pesoVigas = (PESO_LINEAL_VIGA[tipoVigaPrincipal] || 30) / (esDosDirecciones ? Math.min(luzX, luzY) : Math.max(luzX, luzY));

  const pesoPropio = pesoConcreto + pesoDeck + pesoCorreas + pesoVigas + 15;

  const wD = pesoPropio + datos.cmExtra;
  const wu = 1.2 * wD + 1.6 * datos.cv;
  const wServicio = wD + datos.cv;

  // Verificación del deck en fase de construcción
  const wConstruccion = pesoConcreto + 100;
  const luzDeck = sepCorreas;
  const mConstruccion = (wConstruccion * luzDeck * luzDeck) / 8;
  const vConstruccion = (wConstruccion * luzDeck) / 2;
  const capMoment = CAPACIDAD_MOMENTO_DECK_KGM[calibre] || 450;
  const capCortante = CAPACIDAD_CORTANTE_DECK_KGM[calibre] || 2200;
  const cumpleDeck = mConstruccion <= capMoment && vConstruccion <= capCortante;
  const deflDeck = (5 * (wConstruccion / 100) * Math.pow(luzDeck * 100, 4)) / (384 * 2_000_000 * 15);
  const cumpleDeflDeck = deflDeck <= (luzDeck * 100) / 180;

  // Momentos de la losa compuesta
  const wuLosa = wu;
  const luzLosa = Math.min(luzX, luzY);
  const mPosLosa = (wuLosa * luzLosa * luzLosa) / 14;
  const mNegLosa = (wuLosa * luzLosa * luzLosa) / 11;

  // Conectores de corte
  const longVigasPrincipalesX = (filas) * (luzX * nTramosX);
  const longVigasPrincipalesY = (cols) * (luzY * nTramosY);
  const totalStuds = Math.ceil((longVigasPrincipalesX + longVigasPrincipalesY) * densidadStuds);

  // Materiales
  const areaDeck = areaTotal * 1.15;
  const volConcreto = areaTotal * (espesorConcreto / 100);
  const kgCorreas = (PESO_LINEAL_VIGA[tipoCorrea] || 15) * (
    Math.ceil((luzX * nTramosX) / sepCorreas) * (luzY * nTramosY) +
    Math.ceil((luzY * nTramosY) / sepCorreas) * (luzX * nTramosX)
  );
  const kgVigas = (PESO_LINEAL_VIGA[tipoVigaPrincipal] || 30) * (longVigasPrincipalesX + longVigasPrincipalesY);
  const kgMalla = (0.142 / 10000) * areaTotal * 7850 * 1.1;

  const costoTotal =
    (volConcreto * costos.concretoM3) +
    (areaDeck * costos.steelDeckM2) +
    (kgMalla * costos.aceroKg) +
    (kgCorreas * costos.correaKg) +
    (kgVigas * costos.vigaPrincipalKg) +
    (totalStuds * costos.studUnd);

  return {
    h: h.toFixed(1),
    h_min: '--',
    pesoPropio: pesoPropio.toFixed(0),
    wu: wu.toFixed(2),
    wServicio: wServicio.toFixed(2),
    d: (espesorConcreto - 2).toFixed(1),
    maxMomentoX: mPosLosa.toFixed(2),
    maxMomentoY: mNegLosa.toFixed(2),
    maxMomento: Math.max(mPosLosa, mNegLosa).toFixed(2),
    As_req: 'Malla temp.',
    As_min: '0.142 cm²/m',
    ρ: 'N/A',
    εt: 'N/A',
    εty: 'N/A',
    tensionControlada: true,
    Vc: capCortante.toFixed(0),
    φVc: (capCortante * 0.75).toFixed(0),
    vuMax: vConstruccion.toFixed(2),
    cumpleCortante: cumpleDeck,
    cumpleEspesor: cumpleDeflDeck,
    deflexion: { δ: deflDeck.toFixed(3), δLim: (luzDeck * 100 / 180).toFixed(2), cumple: cumpleDeflDeck },
    s_max: '30.0',
    volConcreto: volConcreto.toFixed(2),
    kgAcero: (kgMalla + kgCorreas + kgVigas).toFixed(0),
    numBloques: totalStuds,
    costoTotal: costoTotal.toFixed(2),
    costoM2: (costoTotal / areaTotal).toFixed(2),
    steelDeckData: {
      espesorConcreto, calibre, sepCorreas, tipoVigaPrincipal, tipoCorrea,
      densidadStuds, alturaDeck,
      mConstruccion, vConstruccion, capMoment, capCortante,
      cumpleDeck, deflDeck, cumpleDeflDeck,
      mPosLosa, mNegLosa,
      totalStuds,
      kgCorreas, kgVigas, kgMalla, areaDeck,
      longVigasPrincipalesX, longVigasPrincipalesY,
    },
  };
}

export default function LosaColaborante({ steelDeckConfig, onConfigChange }) {
  const [showPerfilSelector, setShowPerfilSelector] = useState(false);
  const [perfilTipo, setPerfilTipo] = useState('IPE');
  const [I_req, setI_req] = useState(100);
  const [Z_req, setZ_req] = useState(20);

  const handleBuscarPerfil = () => {
    const perfil = buscarPerfilOptimo(perfilTipo, I_req, Z_req);
    if (perfil) {
      alert(`Perfil recomendado: ${perfil.nombre}\nIx: ${perfil.Ix} cm⁴\nZx: ${perfil.Zx} cm³\nPeso: ${perfil.peso} kg/m`);
    } else {
      alert('Ningún perfil cumple los requisitos');
    }
  };

  const handleBuscarAlternativas = () => {
    const alternativas = buscarAlternativas(perfilTipo, I_req, Z_req, 5);
    if (alternativas.length > 0) {
      const msg = alternativas.map(p => 
        `${p.nombre}: Ix=${p.Ix}, Zx=${p.Zx}, Peso=${p.peso} kg/m`
      ).join('\n');
      alert(`Alternativas:\n${msg}`);
    } else {
      alert('Ningún perfil cumple los requisitos');
    }
  };

  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Configuración Losa Colaborante (Steel Deck)</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Espesor concreto (cm)
          </label>
          <input
            type="number"
            name="espesorConcreto"
            value={steelDeckConfig.espesorConcreto}
            onChange={onConfigChange}
            step="0.5"
            min="4"
            max="12"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Calibre deck
          </label>
          <select
            name="calibre"
            value={steelDeckConfig.calibre}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="22">22 (7.3 kg/m²)</option>
            <option value="20">20 (9.1 kg/m²)</option>
            <option value="18">18 (11.4 kg/m²)</option>
            <option value="16">16 (14.6 kg/m²)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Separación correas (m)
          </label>
          <input
            type="number"
            name="sepCorreas"
            value={steelDeckConfig.sepCorreas}
            onChange={onConfigChange}
            step="0.1"
            min="0.9"
            max="2.5"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Altura deck (cm)
          </label>
          <input
            type="number"
            name="alturaDeck"
            value={steelDeckConfig.alturaDeck}
            onChange={onConfigChange}
            step="0.5"
            min="5"
            max="10"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Viga principal
          </label>
          <select
            name="tipoVigaPrincipal"
            value={steelDeckConfig.tipoVigaPrincipal}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="W12x26">W12x26</option>
            <option value="W10x22">W10x22</option>
            <option value="W8x18">W8x18</option>
            <option value="W6x15">W6x15</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Correa
          </label>
          <select
            name="tipoCorrea"
            value={steelDeckConfig.tipoCorrea}
            onChange={onConfigChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="C6x10.5">C6x10.5</option>
            <option value="C5x9">C5x9</option>
            <option value="C4x7.25">C4x7.25</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '13px', color: '#555', marginBottom: '4px', display: 'block' }}>
            Densidad studs (studs/m)
          </label>
          <input
            type="number"
            name="densidadStuds"
            value={steelDeckConfig.densidadStuds}
            onChange={onConfigChange}
            step="0.5"
            min="1"
            max="4"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
      </div>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        border: '1px solid #e0e0e0' 
      }}>
        <h5 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '14px' }}>
          🔍 Buscador de Perfiles
        </h5>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#555', marginBottom: '4px', display: 'block' }}>
              Tipo de perfil
            </label>
            <select
              value={perfilTipo}
              onChange={(e) => setPerfilTipo(e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            >
              <option value="IPE">IPE (I Beams)</option>
              <option value="HEA">HEA (Wide Flange)</option>
              <option value="TUBO_RECT">Tubo Rectangular</option>
              <option value="TUBO_CUAD">Tubo Cuadrado</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#555', marginBottom: '4px', display: 'block' }}>
              I requerido (cm⁴)
            </label>
            <input
              type="number"
              value={I_req}
              onChange={(e) => setI_req(parseFloat(e.target.value))}
              step="10"
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#555', marginBottom: '4px', display: 'block' }}>
              Z requerido (cm³)
            </label>
            <input
              type="number"
              value={Z_req}
              onChange={(e) => setZ_req(parseFloat(e.target.value))}
              step="5"
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleBuscarPerfil}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Buscar Óptimo
          </button>
          <button
            onClick={handleBuscarAlternativas}
            style={{
              padding: '8px 16px',
              backgroundColor: '#27ae60',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Ver Alternativas
          </button>
        </div>

        <div style={{ marginTop: '12px', fontSize: '11px', color: '#666' }}>
          <strong>Perfiles disponibles:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
            <li>IPE: 80 a 600</li>
            <li>HEA: 100 a 600</li>
            <li>Tubo Rectangular: 50x30 a 300x150</li>
            <li>Tubo Cuadrado: 40x40 a 150x150</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
