import React, { useState, useCallback, useMemo } from 'react';
import './CalculadoraLosaFundacion.css';

// ============================================
// FOUNDATION SLAB EDITOR - HIBRIDO (Plantillas + Tabla)
// Conecta con backend Python FastAPI
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const MATERIALS = {
  'bloque_arcilla_10': { name: 'Bloque de Arcilla (10cm)', thickness: 0.10, density: 1200 },
  'bloque_arcilla_12': { name: 'Bloque de Arcilla (12cm)', thickness: 0.12, density: 1200 },
  'bloque_arcilla_15': { name: 'Bloque de Arcilla (15cm)', thickness: 0.15, density: 1200 },
  'bloque_cemento': { name: 'Bloque de Cemento (15cm)', thickness: 0.15, density: 1800 },
  'ladrillo_macizo': { name: 'Ladrillo Macizo (12cm)', thickness: 0.12, density: 1900 },
  'ladrillo_hueco': { name: 'Ladrillo Hueco (12cm)', thickness: 0.12, density: 1400 },
};

const SHAPES = [
  { id: 'rectangular', label: 'Rectangular' },
  { id: 'L', label: 'Forma en L' },
  { id: 'U', label: 'Forma en U' },
  { id: 'T', label: 'Forma en T' },
];

export default function CalculadoraLosaFundacion() {
  // Configuración de Losa y Perímetro
  const [shape, setShape] = useState('rectangular');
  const [params, setParams] = useState({
    Lx: 10, Ly: 10,       // Dimensiones totales
    wingX: 4, wingY: 4,   // Para L, U (wingX1)
    wingX2: 4,            // Para U (pata derecha)
    baseY: 4,             // Para U (base inferior)
    barY: 4,              // Para T (barra superior)
    h: 15                 // Espesor losa en cm
  });
  const [offset, setOffset] = useState(0.15); // Retiro de muros en metros
  const [material, setMaterial] = useState('bloque_arcilla_15');
  const [wallHeight, setWallHeight] = useState(2.70);
  
  // Muros Internos (Tabla)
  const [internalWalls, setInternalWalls] = useState([]);
  
  // Estado de resultados
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Escala para el SVG
  const CANVAS_SIZE = 400;
  const scale = useMemo(() => CANVAS_SIZE / Math.max(params.Lx, params.Ly, 1), [params.Lx, params.Ly]);
  const toSvg = useCallback((m) => m * scale, [scale]);

  // Generar vértices del perímetro según la plantilla y offset
  const getPerimeterVertices = useCallback(() => {
    const { Lx, Ly, wingX, wingY, wingX2, baseY, barY } = params;
    const o = parseFloat(offset) || 0;
    
    // Evitar colapsos matemáticos si el offset es muy grande
    const safeO = Math.min(o, 1.0); 

    let pts = [];
    switch (shape) {
      case 'rectangular':
        pts = [
          { x: safeO, y: safeO },
          { x: Lx - safeO, y: safeO },
          { x: Lx - safeO, y: Ly - safeO },
          { x: safeO, y: Ly - safeO }
        ];
        break;
      case 'L':
        pts = [
          { x: safeO, y: safeO },
          { x: Lx - safeO, y: safeO },
          { x: Lx - safeO, y: wingY - safeO },
          { x: wingX - safeO, y: wingY - safeO },
          { x: wingX - safeO, y: Ly - safeO },
          { x: safeO, y: Ly - safeO }
        ];
        break;
      case 'U':
        pts = [
          { x: safeO, y: safeO },
          { x: Lx - safeO, y: safeO },
          { x: Lx - safeO, y: Ly - safeO },
          { x: Lx - wingX2 + safeO, y: Ly - safeO },
          { x: Lx - wingX2 + safeO, y: baseY + safeO },
          { x: wingX - safeO, y: baseY + safeO },
          { x: wingX - safeO, y: Ly - safeO },
          { x: safeO, y: Ly - safeO }
        ];
        break;
      case 'T':
        pts = [
          { x: wingX + safeO, y: safeO },
          { x: Lx - wingX2 - safeO, y: safeO },
          { x: Lx - wingX2 - safeO, y: Ly - barY - safeO },
          { x: Lx - safeO, y: Ly - barY - safeO },
          { x: Lx - safeO, y: Ly - safeO },
          { x: safeO, y: Ly - safeO },
          { x: safeO, y: Ly - barY - safeO },
          { x: wingX + safeO, y: Ly - barY - safeO }
        ];
        break;
      default:
        pts = [];
    }
    return pts;
  }, [shape, params, offset]);

  // Generar lista de muros perimetrales a partir de los vértices
  const perimeterWalls = useMemo(() => {
    const pts = getPerimeterVertices();
    const matProps = MATERIALS[material];
    const walls = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      walls.push({
        id: `perim_${i}`,
        type: 'perimetral',
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        thickness: matProps.thickness,
        height: parseFloat(wallHeight) || 2.7,
        density: matProps.density
      });
    }
    return walls;
  }, [getPerimeterVertices, material, wallHeight]);

  // Consolidar todos los muros (Perimetrales + Internos)
  const allWalls = useMemo(() => {
    const matProps = MATERIALS[material];
    const formattedInternal = internalWalls.map(w => ({
      ...w,
      type: 'interno',
      thickness: matProps.thickness,
      height: parseFloat(wallHeight) || 2.7,
      density: matProps.density
    }));
    return [...perimeterWalls, ...formattedInternal];
  }, [perimeterWalls, internalWalls, material, wallHeight]);

  const handleParamChange = (field, value) => {
    setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const addInternalWall = () => {
    setInternalWalls(prev => [
      ...prev, 
      { id: Date.now(), x1: 0, y1: 0, x2: 1, y2: 1 }
    ]);
  };

  const updateInternalWall = (id, field, value) => {
    setInternalWalls(prev => prev.map(w => 
      w.id === id ? { ...w, [field]: parseFloat(value) || 0 } : w
    ));
  };

  const removeInternalWall = (id) => {
    setInternalWalls(prev => prev.filter(w => w.id !== id));
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    // Vigas de amarre automáticas en el perímetro
    const autoBeams = perimeterWalls.map(w => ({
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
      width: 0.20, height: 0.30, type: 'zuncho', load_factor: 1.2
    }));

    const payload = {
      project: "Losa de Cimentación Híbrida",
      geometry: {
        Lx: params.Lx,
        Ly: params.Ly,
        h: params.h / 100
      },
      materials: {
        f_c: 25, f_y: 420, cover: 0.05, bar_diam: 0.012,
        gamma_horm: 2400, E: 25e9, nu: 0.2, k: 20e6
      },
      walls: allWalls.map(w => ({
        x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
        thickness: w.thickness, height: w.height,
        density: w.density, type: w.type, load_factor: 1.5
      })),
      beams: autoBeams,
      doors: [],
      mesh_nx: 40,
      mesh_ny: 40,
      extra_load: 300 * 9.81
    };

    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/losa_fundacion/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calc-losa-container">
      <div className="calc-header">
        <h2>Diseño de Losa de Fundación (Método Híbrido)</h2>
        <p>Configura la losa mediante plantillas y añade las divisiones internas usando coordenadas.</p>
      </div>

      <div className="calc-body">
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div className="calc-sidebar">
          
          <div className="control-group">
            <h3>1. Forma de la Losa</h3>
            <div className="shape-selector">
              {SHAPES.map(s => (
                <button 
                  key={s.id} 
                  className={`shape-btn ${shape === s.id ? 'active' : ''}`}
                  onClick={() => setShape(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="params-grid">
              <div className="param-item">
                <label>Lx Total (m):</label>
                <input type="number" step="0.1" value={params.Lx} onChange={e => handleParamChange('Lx', e.target.value)} />
              </div>
              <div className="param-item">
                <label>Ly Total (m):</label>
                <input type="number" step="0.1" value={params.Ly} onChange={e => handleParamChange('Ly', e.target.value)} />
              </div>
              
              {/* Controles condicionales según forma */}
              {(shape === 'L' || shape === 'U') && (
                <div className="param-item">
                  <label>Ancho Ala Izq (m):</label>
                  <input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} />
                </div>
              )}
              {shape === 'L' && (
                <div className="param-item">
                  <label>Ancho Ala Inf (m):</label>
                  <input type="number" step="0.1" value={params.wingY} onChange={e => handleParamChange('wingY', e.target.value)} />
                </div>
              )}
              {shape === 'U' && (
                <>
                  <div className="param-item">
                    <label>Ancho Ala Der (m):</label>
                    <input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} />
                  </div>
                  <div className="param-item">
                    <label>Fondo Base (m):</label>
                    <input type="number" step="0.1" value={params.baseY} onChange={e => handleParamChange('baseY', e.target.value)} />
                  </div>
                </>
              )}
              {shape === 'T' && (
                <>
                  <div className="param-item">
                    <label>Ancho Tallo Izq (m):</label>
                    <input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} />
                  </div>
                  <div className="param-item">
                    <label>Ancho Tallo Der (m):</label>
                    <input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} />
                  </div>
                  <div className="param-item">
                    <label>Alto Barra Sup (m):</label>
                    <input type="number" step="0.1" value={params.barY} onChange={e => handleParamChange('barY', e.target.value)} />
                  </div>
                </>
              )}
              
              <div className="param-item">
                <label>Espesor Losa (cm):</label>
                <input type="number" value={params.h} onChange={e => handleParamChange('h', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="control-group">
            <h3>2. Muros Perimetrales</h3>
            <div className="params-grid">
              <div className="param-item">
                <label>Offset / Retiro (m):</label>
                <input type="number" step="0.05" value={offset} onChange={e => setOffset(e.target.value)} />
              </div>
              <div className="param-item">
                <label>Alto de Muros (m):</label>
                <input type="number" step="0.1" value={wallHeight} onChange={e => setWallHeight(e.target.value)} />
              </div>
            </div>
            <div className="param-item" style={{ marginTop: '10px' }}>
              <label>Material Constructivo:</label>
              <select value={material} onChange={e => setMaterial(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                {Object.entries(MATERIALS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-group">
            <h3>3. Divisiones Internas (Coordenadas)</h3>
            <table className="coords-table">
              <thead>
                <tr>
                  <th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th>
                </tr>
              </thead>
              <tbody>
                {internalWalls.map(w => (
                  <tr key={w.id}>
                    <td><input type="number" step="0.1" value={w.x1} onChange={e => updateInternalWall(w.id, 'x1', e.target.value)} /></td>
                    <td><input type="number" step="0.1" value={w.y1} onChange={e => updateInternalWall(w.id, 'y1', e.target.value)} /></td>
                    <td><input type="number" step="0.1" value={w.x2} onChange={e => updateInternalWall(w.id, 'x2', e.target.value)} /></td>
                    <td><input type="number" step="0.1" value={w.y2} onChange={e => updateInternalWall(w.id, 'y2', e.target.value)} /></td>
                    <td><button className="del-btn" onClick={() => removeInternalWall(w.id)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-btn" onClick={addInternalWall}>+ Añadir Muro Interno</button>
          </div>

          <button className="analyze-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? 'Calculando FEM...' : 'Ejecutar Análisis Estructural'}
          </button>
          {error && <div className="error-box">{error}</div>}
        </div>

        {/* PANEL DERECHO: VISTA PREVIA Y RESULTADOS */}
        <div className="calc-content">
          <div className="canvas-wrapper hybrid-canvas">
            <h4>Vista en Planta (Solo Lectura)</h4>
            <svg 
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              className="drawing-board readonly"
            >
              {/* Grid Básico */}
              {Array.from({ length: Math.ceil(params.Lx) + 1 }).map((_, i) => (
                <line key={`vx${i}`} x1={toSvg(i)} y1={0} x2={toSvg(i)} y2={toSvg(params.Ly)} stroke="#e0e0e0" strokeWidth="1" />
              ))}
              {Array.from({ length: Math.ceil(params.Ly) + 1 }).map((_, i) => (
                <line key={`vy${i}`} x1={0} y1={toSvg(i)} x2={toSvg(params.Lx)} y2={toSvg(i)} stroke="#e0e0e0" strokeWidth="1" />
              ))}

              {/* Losa Máxima (Bounding Box) */}
              <rect x={0} y={0} width={toSvg(params.Lx)} height={toSvg(params.Ly)} fill="rgba(33, 150, 243, 0.05)" stroke="#2196f3" strokeDasharray="5,5" />

              {/* Muros */}
              {allWalls.map(wall => (
                <line key={wall.id}
                  x1={toSvg(wall.x1)} y1={toSvg(wall.y1)}
                  x2={toSvg(wall.x2)} y2={toSvg(wall.y2)}
                  stroke={wall.type === 'perimetral' ? '#e53935' : '#1e88e5'}
                  strokeWidth={Math.max(3, wall.thickness * scale)}
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>

          {/* Renderizado de Resultados */}
          {results && results.status === "success" && (
            <div className="results-panel">
              <h3>Resultados del Análisis (ACI 318)</h3>
              <div className="result-cards">
                <div className="res-card">
                  <h4>Asentamiento Máx</h4>
                  <p>{(results.max_displacement * 1000).toFixed(2)} mm</p>
                </div>
                <div className="res-card">
                  <h4>Cortante Base</h4>
                  <p>{(results.max_shear / 1000).toFixed(1)} kN</p>
                </div>
                <div className="res-card">
                  <h4>Momento Flector</h4>
                  <p>{(results.max_moment / 1000).toFixed(1)} kN·m/m</p>
                </div>
              </div>
              
              {results.svg_plan && (
                <div className="structural-plan">
                  <h4>Plano Estructural Generado</h4>
                  <div className="svg-output" dangerouslySetInnerHTML={{ __html: results.svg_plan }}></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
