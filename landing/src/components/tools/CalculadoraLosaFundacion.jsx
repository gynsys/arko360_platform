import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './CalculadoraLosaFundacion.css';

// ============================================
// FOUNDATION SLAB EDITOR - HIBRIDO v2
// Grid Intenso, Snap a la Grilla, Auditoría JSON
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
  const svgRef = useRef(null);

  // Configuración de Losa y Perímetro
  const [shape, setShape] = useState('rectangular');
  const [params, setParams] = useState({
    Lx: 10, Ly: 10,       
    wingX: 4, wingY: 4,   
    wingX2: 4, baseY: 4, barY: 4,
    h: 15                 
  });
  const [offset, setOffset] = useState(0.5); 
  const [material, setMaterial] = useState('bloque_arcilla_15');
  const [wallHeight, setWallHeight] = useState(2.70);
  
  // Parámetros de Diseño Técnico
  const [designParams, setDesignParams] = useState({
    fc: 25,
    fy: 420,
    q_adm: 150, // kN/m2 (~1.5 kg/cm2)
    is_plastered: false // Friso global
  });
  
  // Muros Internos (Tabla)
  const [internalWalls, setInternalWalls] = useState([]);
  
  // Estado de resultados
  const [results, setResults] = useState(null);
  const [lastPayload, setLastPayload] = useState(null); // Para guardar/auditar
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Interacción Canvas (Mouse & Snap)
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null); // Preview de la línea
  
  const snapToGrid = (val) => Math.round(val * 2) / 2; // Snap a 0.5m

  // Escala para el SVG
  const CANVAS_SIZE = 500;
  const MARGIN = 40; // Margen para los ejes
  const EFFECTIVE_SIZE = CANVAS_SIZE - MARGIN * 2;
  const scale = useMemo(() => EFFECTIVE_SIZE / Math.max(params.Lx, params.Ly, 1), [params.Lx, params.Ly]);
  
  // Convertir metros a pixeles SVG
  const toSvg = useCallback((m) => MARGIN + (m * scale), [scale]);
  // Convertir pixeles a metros (con snap opcional)
  const toMeters = useCallback((px, doSnap = false) => {
    let m = (px - MARGIN) / scale;
    if (m < 0) m = 0;
    if (doSnap) m = snapToGrid(m);
    return m;
  }, [scale]);

  // Generar vértices del perímetro según la plantilla y offset
  const getPerimeterVertices = useCallback(() => {
    const { Lx, Ly, wingX, wingY, wingX2, baseY, barY } = params;
    const o = parseFloat(offset) || 0;
    const safeO = Math.min(o, 1.0); 

    let pts = [];
    switch (shape) {
      case 'rectangular':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'L':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: wingY - safeO }, { x: wingX - safeO, y: wingY - safeO }, { x: wingX - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'U':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: Lx - wingX2 + safeO, y: Ly - safeO }, { x: Lx - wingX2 + safeO, y: baseY + safeO }, { x: wingX - safeO, y: baseY + safeO }, { x: wingX - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'T':
        pts = [{ x: wingX + safeO, y: safeO }, { x: Lx - wingX2 - safeO, y: safeO }, { x: Lx - wingX2 - safeO, y: Ly - barY - safeO }, { x: Lx - safeO, y: Ly - barY - safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }, { x: safeO, y: Ly - barY - safeO }, { x: wingX + safeO, y: Ly - barY - safeO }];
        break;
      default: pts = [];
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
        density: matProps.density,
        is_plastered: designParams.is_plastered
      });
    }
    return walls;
  }, [getPerimeterVertices, material, wallHeight, designParams.is_plastered]);

  const allWalls = useMemo(() => {
    const matProps = MATERIALS[material];
    const formattedInternal = internalWalls.map(w => ({
      ...w,
      type: 'interno',
      thickness: matProps.thickness,
      height: parseFloat(wallHeight) || 2.7,
      density: matProps.density,
      is_plastered: designParams.is_plastered
    }));
    return [...perimeterWalls, ...formattedInternal];
  }, [perimeterWalls, internalWalls, material, wallHeight, designParams.is_plastered]);

  const handleParamChange = (field, value) => setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  const handleDesignParamChange = (field, value) => setDesignParams(prev => ({ ...prev, [field]: value }));

  const addInternalWall = (w) => {
    setInternalWalls(prev => [...prev, { id: Date.now(), x1: w.x1 || 0, y1: w.y1 || 0, x2: w.x2 || 1, y2: w.y2 || 1 }]);
  };

  const updateInternalWall = (id, field, value) => {
    setInternalWalls(prev => prev.map(w => w.id === id ? { ...w, [field]: parseFloat(value) || 0 } : w));
  };

  const removeInternalWall = (id) => setInternalWalls(prev => prev.filter(w => w.id !== id));

  // Lógica del Mouse (Tracker y Dibujo con Snap)
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const mx = toMeters(px, true);
    const my = toMeters(py, true);
    setMouseCoord({ x: mx, y: my });

    if (isDrawing && drawStart) {
      setDrawEnd({ x: mx, y: my });
    }
  };

  const handleSvgDoubleClick = () => {
    if (!isDrawing) {
      // Iniciar dibujo
      setIsDrawing(true);
      setDrawStart({ ...mouseCoord });
      setDrawEnd({ ...mouseCoord });
    } else {
      // Finalizar dibujo
      if (drawStart && (drawStart.x !== mouseCoord.x || drawStart.y !== mouseCoord.y)) {
        addInternalWall({ x1: drawStart.x, y1: drawStart.y, x2: mouseCoord.x, y2: mouseCoord.y });
      }
      setIsDrawing(false);
      setDrawStart(null);
      setDrawEnd(null);
    }
  };


  // Botón: Cancelar dibujo con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing]);

  // Ejecutar Análisis
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setLastPayload(null);

    const autoBeams = perimeterWalls.map(w => ({
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
      width: 0.20, height: 0.30, type: 'zuncho', load_factor: 1.2
    }));

    const payload = {
      project: "Losa de Cimentación Híbrida",
      geometry: { Lx: params.Lx, Ly: params.Ly, h: params.h / 100 },
      materials: {
        f_c: designParams.fc, f_y: designParams.fy, cover: 0.05, bar_diam: 0.012,
        gamma_horm: 2400, E: 4700 * Math.sqrt(designParams.fc) * 1e6, nu: 0.2, k: 20e6,
        q_adm: designParams.q_adm * 1000 // Convertir kN/m2 a N/m2
      },
      walls: allWalls.map(w => ({
        x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
        thickness: w.thickness, height: w.height,
        density: w.density, type: w.type, load_factor: 1.5,
        is_plastered: w.is_plastered
      })),
      beams: autoBeams,
      doors: [],
      mesh_nx: 40,
      mesh_ny: 40,
      extra_load: 300 * 9.81
    };

    setLastPayload(payload); // Guardar para auditoría

    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/losa_fundacion/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Descargar JSON de Auditoría
  const downloadAuditJSON = () => {
    if (!lastPayload || !results) return;
    const auditData = {
      timestamp: new Date().toISOString(),
      inputs: lastPayload,
      outputs: results
    };
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria_losa_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Descargar Plano Estructural (HTML)
  const downloadHTML = () => {
    if (!results || !results.svg_plan) return;
    const blob = new Blob([results.svg_plan], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plano_armado_losa_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Guardar en Base de Datos
  const saveToDatabase = async () => {
    if (!lastPayload || !results) return;
    setSaving(true);
    try {
      const runData = {
        nombre_proyecto: lastPayload.project,
        tipo_losa: 'losa_fundacion_hibrida',
        inputs: lastPayload,
        resultados: results
      };
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runData)
      });
      if (!response.ok) throw new Error('Error al guardar en BD');
      alert("¡Cálculo guardado exitosamente!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="calc-losa-container">
      <div className="calc-header">
        <h2>Diseño de Losa de Fundación (Método Híbrido)</h2>
        <p>Configura la losa (Plantillas) y divisiones internas (Tabla o Clics). Incluye JSON de Auditoría.</p>
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
              <div className="param-item"><label>Lx Total (m):</label><input type="number" step="0.5" value={params.Lx} onChange={e => handleParamChange('Lx', e.target.value)} /></div>
              <div className="param-item"><label>Ly Total (m):</label><input type="number" step="0.5" value={params.Ly} onChange={e => handleParamChange('Ly', e.target.value)} /></div>
              
              {(shape === 'L' || shape === 'U') && <div className="param-item"><label>Ancho Ala Izq (m):</label><input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} /></div>}
              {shape === 'L' && <div className="param-item"><label>Ancho Ala Inf (m):</label><input type="number" step="0.1" value={params.wingY} onChange={e => handleParamChange('wingY', e.target.value)} /></div>}
              {shape === 'U' && (
                <>
                  <div className="param-item"><label>Ancho Ala Der (m):</label><input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} /></div>
                  <div className="param-item"><label>Fondo Base (m):</label><input type="number" step="0.1" value={params.baseY} onChange={e => handleParamChange('baseY', e.target.value)} /></div>
                </>
              )}
              {shape === 'T' && (
                <>
                  <div className="param-item"><label>Ancho Tallo Izq (m):</label><input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} /></div>
                  <div className="param-item"><label>Ancho Tallo Der (m):</label><input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} /></div>
                  <div className="param-item"><label>Alto Barra Sup (m):</label><input type="number" step="0.1" value={params.barY} onChange={e => handleParamChange('barY', e.target.value)} /></div>
                </>
              )}
              
              <div className="param-item"><label>Espesor Losa (cm):</label><input type="number" value={params.h} onChange={e => handleParamChange('h', e.target.value)} /></div>
            </div>
          </div>

          <div className="control-group">
            <h3>2. Muros y Suelo</h3>
            <div className="params-grid">
              <div className="param-item"><label>Offset / Retiro (m):</label><input type="number" step="0.05" value={offset} onChange={e => setOffset(e.target.value)} /></div>
              <div className="param-item"><label>Alto Muros (m):</label><input type="number" step="0.1" value={wallHeight} onChange={e => setWallHeight(e.target.value)} /></div>
              <div className="param-item"><label>f'c Concreto (MPa):</label><input type="number" step="1" value={designParams.fc} onChange={e => handleDesignParamChange('fc', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>fy Acero (MPa):</label><input type="number" step="10" value={designParams.fy} onChange={e => handleDesignParamChange('fy', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>Cap. Portante (kN/m²):</label><input type="number" step="10" value={designParams.q_adm} onChange={e => handleDesignParamChange('q_adm', parseFloat(e.target.value))} title="150 kN/m2 es aprox 1.5 kg/cm2" /></div>
            </div>
            
            <div className="param-item" style={{ marginTop: '10px' }}>
              <label>Material Constructivo:</label>
              <select value={material} onChange={e => setMaterial(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                {Object.entries(MATERIALS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="param-item checkbox" style={{ marginTop: '10px' }}>
              <label>
                <input type="checkbox" checked={designParams.is_plastered} onChange={e => handleDesignParamChange('is_plastered', e.target.checked)} />
                Paredes Frisadas (+ Carga Muerta)
              </label>
            </div>
          </div>

          <div className="control-group">
            <h3>3. Muros Internos (Coord. o Clics)</h3>
            <p className="help-text">Doble clic en el gráfico para dibujar (con Snap) o llena la tabla.</p>
            <table className="coords-table">
              <thead>
                <tr>
                  <th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th>
                </tr>
              </thead>
              <tbody>
                {internalWalls.map(w => (
                  <tr key={w.id}>
                    <td><input type="number" step="0.5" value={w.x1} onChange={e => updateInternalWall(w.id, 'x1', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.y1} onChange={e => updateInternalWall(w.id, 'y1', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.x2} onChange={e => updateInternalWall(w.id, 'x2', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.y2} onChange={e => updateInternalWall(w.id, 'y2', e.target.value)} /></td>
                    <td><button className="del-btn" onClick={() => removeInternalWall(w.id)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-btn" onClick={() => addInternalWall({})}>+ Fila Manual</button>
          </div>

          <button className="analyze-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? 'Calculando FEM...' : 'Ejecutar Análisis Estructural'}
          </button>
          {error && <div className="error-box">{error}</div>}

          {/* Botones de Auditoría (Aparecen si hay resultados) */}
          {results && !error && (
            <div className="audit-actions">
              <button className="btn-secondary" onClick={downloadHTML} style={{background: '#e3f2fd', borderColor: '#90caf9'}}>
                📄 Descargar Plano y Tabla (HTML)
              </button>
              <button className="btn-secondary" onClick={downloadAuditJSON}>
                ⬇️ Descargar JSON Auditoría
              </button>
              <button className="btn-success" onClick={saveToDatabase} disabled={saving}>
                💾 {saving ? 'Guardando...' : 'Guardar en Historial'}
              </button>
            </div>
          )}

        </div>

        {/* PANEL DERECHO: VISTA PREVIA Y RESULTADOS */}
        <div className="calc-content">
          <div className="canvas-wrapper hybrid-canvas">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
              <h4>Plano Interactivo (Ejes en metros)</h4>
              <span className="mouse-tracker">📍 X: {mouseCoord.x.toFixed(1)}m, Y: {mouseCoord.y.toFixed(1)}m</span>
            </div>
            
            <svg 
              ref={svgRef}
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              className={`drawing-board ${isDrawing ? 'drawing-mode' : ''}`}
              onMouseMove={handleMouseMove}
              onDoubleClick={handleSvgDoubleClick}
              style={{ cursor: isDrawing ? 'crosshair' : 'pointer' }}
            >
              {/* Ejes X (Ruler Top) */}
              <rect x={0} y={0} width={CANVAS_SIZE} height={MARGIN-5} fill="#f0f0f0" />
              {Array.from({ length: Math.ceil(params.Lx) + 1 }).map((_, i) => (
                <g key={`rx${i}`}>
                  <line x1={toSvg(i)} y1={MARGIN-5} x2={toSvg(i)} y2={MARGIN} stroke="#333" strokeWidth="1.5" />
                  <text x={toSvg(i)} y={MARGIN-10} fontSize="10" textAnchor="middle" fill="#555">{i}</text>
                </g>
              ))}

              {/* Ejes Y (Ruler Left) */}
              <rect x={0} y={0} width={MARGIN-5} height={CANVAS_SIZE} fill="#f0f0f0" />
              {Array.from({ length: Math.ceil(params.Ly) + 1 }).map((_, i) => (
                <g key={`ry${i}`}>
                  <line x1={MARGIN-5} y1={toSvg(i)} x2={MARGIN} y2={toSvg(i)} stroke="#333" strokeWidth="1.5" />
                  <text x={MARGIN-10} y={toSvg(i)+3} fontSize="10" textAnchor="end" fill="#555">{i}</text>
                </g>
              ))}

              {/* Grid Mayor (1m) e Intenso */}
              {Array.from({ length: Math.ceil(params.Lx) + 1 }).map((_, i) => (
                <line key={`vx${i}`} x1={toSvg(i)} y1={MARGIN} x2={toSvg(i)} y2={toSvg(params.Ly)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
              ))}
              {Array.from({ length: Math.ceil(params.Ly) + 1 }).map((_, i) => (
                <line key={`vy${i}`} x1={MARGIN} y1={toSvg(i)} x2={toSvg(params.Lx)} y2={toSvg(i)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
              ))}
              
              {/* Grid Menor (0.5m) */}
              {Array.from({ length: Math.ceil(params.Lx) * 2 }).map((_, i) => (
                <line key={`vx_sub${i}`} x1={toSvg(i*0.5)} y1={MARGIN} x2={toSvg(i*0.5)} y2={toSvg(params.Ly)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />
              ))}
              {Array.from({ length: Math.ceil(params.Ly) * 2 }).map((_, i) => (
                <line key={`vy_sub${i}`} x1={MARGIN} y1={toSvg(i*0.5)} x2={toSvg(params.Lx)} y2={toSvg(i*0.5)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />
              ))}

              {/* Losa Máxima (Bounding Box) */}
              <rect x={MARGIN} y={MARGIN} width={toSvg(params.Lx)-MARGIN} height={toSvg(params.Ly)-MARGIN} fill="rgba(33, 150, 243, 0.03)" stroke="#2196f3" strokeDasharray="5,5" />

              {/* Muros */}
              {allWalls.map(wall => (
                <line key={wall.id}
                  x1={toSvg(wall.x1)} y1={toSvg(wall.y1)}
                  x2={toSvg(wall.x2)} y2={toSvg(wall.y2)}
                  stroke={wall.type === 'perimetral' ? '#e53935' : '#1e88e5'}
                  strokeWidth={Math.max(4, wall.thickness * scale)}
                  strokeLinecap="round"
                />
              ))}

              {/* Pre-visualización de Muro dibujándose */}
              {isDrawing && drawStart && drawEnd && (
                <line 
                  x1={toSvg(drawStart.x)} y1={toSvg(drawStart.y)}
                  x2={toSvg(drawEnd.x)} y2={toSvg(drawEnd.y)}
                  stroke="#ff9800" strokeWidth="4" strokeDasharray="5,5" strokeLinecap="round"
                />
              )}

              {/* Punto indicador de Snap Mouse */}
              <circle cx={toSvg(mouseCoord.x)} cy={toSvg(mouseCoord.y)} r="4" fill="#ff9800" />

            </svg>
            {isDrawing && <div className="drawing-hint">Haz doble clic nuevamente para fijar el muro. Presiona ESC para cancelar.</div>}
          </div>

          {/* Renderizado de Resultados */}
          {results && !error && (
            <div className="results-panel">
              <h3>Resultados del Análisis (ACI 318)</h3>
              <div className="result-cards">
                <div className="res-card">
                  <h4>Asentamiento Máx</h4>
                  <p>{(results.displacements?.w_max_mm || results.max_displacement * 1000).toFixed(2)} mm</p>
                </div>
                <div className="res-card">
                  <h4>Cortante Base</h4>
                  <p>{(results.shear?.Vu_max_kN_m || results.max_shear / 1000).toFixed(1)} kN</p>
                </div>
                {results.soil_pressure && (
                  <div className="res-card">
                    <h4>Presión Suelo</h4>
                    <p style={{ color: results.soil_pressure.ok ? '#2e7d32' : '#c62828' }}>
                      {results.soil_pressure.max_pressure_kN_m2.toFixed(1)} kN/m²
                    </p>
                    <span style={{ fontSize: '10px' }}>vs {results.soil_pressure.q_adm_kN_m2.toFixed(0)} adm</span>
                  </div>
                )}
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
