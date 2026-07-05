import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
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
  { id: 'libre', label: 'Libre / Manual' },
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
  
  // Guardado y Carga de Base de Datos
  const [projectName, setProjectName] = useState("Losa Híbrida");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [savedRuns, setSavedRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState(null);
  
  // Muros Internos (Tabla)
  const [internalWalls, setInternalWalls] = useState([]);
  
  // Estado de resultados
  const [results, setResults] = useState(null);
  const [lastPayload, setLastPayload] = useState(null); // Para guardar/auditar
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Aberturas (Puertas y Ventanas) Drag & Drop
  const [openings, setOpenings] = useState([]);

  // Hover interactivo (bidireccional SVG <-> Tabla)
  const [hoveredWallId, setHoveredWallId] = useState(null);

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
    if (shape === 'libre') return []; // Sin auto-perímetro en modo libre
    
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
  }, [getPerimeterVertices, material, wallHeight, designParams.is_plastered, shape]);

  const allWalls = useMemo(() => {
    const matProps = MATERIALS[material];
    const formattedInternal = internalWalls.map(w => ({
      ...w,
      type: w.type || 'interno',
      thickness: matProps.thickness,
      height: parseFloat(wallHeight) || 2.7,
      density: matProps.density,
      is_plastered: designParams.is_plastered
    }));
    return [...perimeterWalls, ...formattedInternal];
  }, [perimeterWalls, internalWalls, material, wallHeight, designParams.is_plastered]);

  const convertToManual = () => {
    if (shape === 'libre') return;
    const perimeterCopy = perimeterWalls.map((w, i) => ({
      id: `man_${Date.now()}_${i}`,
      type: 'perimetral',
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2
    }));
    
    // Migrar aberturas
    setOpenings(prev => prev.map(op => {
      const perimMatch = perimeterCopy.find((_, idx) => op.wall_id === `perim_${idx}`);
      if (perimMatch) return { ...op, wall_id: perimMatch.id };
      return op;
    }));
    
    setInternalWalls(prev => [...perimeterCopy, ...prev]);
    setShape('libre');
  };

  const handleParamChange = (field, value) => setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  const handleDesignParamChange = (field, value) => setDesignParams(prev => ({ ...prev, [field]: value }));

  const addInternalWall = (w) => {
    setInternalWalls(prev => [...prev, { id: Date.now(), type: 'interno', x1: w.x1 || 0, y1: w.y1 || 0, x2: w.x2 || 1, y2: w.y2 || 1 }]);
  };

  const updateInternalWall = (id, field, value) => {
    setInternalWalls(prev => prev.map(w => w.id === id ? { ...w, [field]: (field === 'type' ? value : (parseFloat(value) || 0)) } : w));
  };

  const removeInternalWall = (id) => {
    setInternalWalls(prev => prev.filter(w => w.id !== id));
    setOpenings(prev => prev.filter(op => op.wall_id !== id));
  };

  const removeOpening = (id) => {
    setOpenings(prev => prev.filter(op => op.id !== id));
  };

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

  // Lógica Drag and Drop para Aberturas
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('type', type);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (!type) return;

    const rect = svgRef.current.getBoundingClientRect();
    const dropX = toMeters(e.clientX - rect.left);
    const dropY = toMeters(e.clientY - rect.top, false);

    // Encontrar muro más cercano
    let closestWall = null;
    let minD = Infinity;
    let projDist = 0;

    allWalls.forEach(w => {
      // Distancia punto a segmento
      const l2 = (w.x2 - w.x1)**2 + (w.y2 - w.y1)**2;
      let t = 0;
      if (l2 > 0) {
        t = Math.max(0, Math.min(1, ((dropX - w.x1)*(w.x2 - w.x1) + (dropY - w.y1)*(w.y2 - w.y1)) / l2));
      }
      const pX = w.x1 + t * (w.x2 - w.x1);
      const pY = w.y1 + t * (w.y2 - w.y1);
      const d = Math.sqrt((dropX - pX)**2 + (dropY - pY)**2);

      if (d < minD) {
        minD = d;
        closestWall = w;
        projDist = Math.sqrt((pX - w.x1)**2 + (pY - w.y1)**2);
      }
    });

    // Si está a menos de 1 metro del muro, hace snap
    if (minD < 1.0 && closestWall) {
      const isDoor = type.startsWith('door');
      const width_m = isDoor ? 1.0 : 1.5;
      const height_m = isDoor ? 2.1 : 1.2;
      
      // Ajustar si se sale del muro
      const length = Math.sqrt((closestWall.x2 - closestWall.x1)**2 + (closestWall.y2 - closestWall.y1)**2);
      let start_m = projDist - width_m / 2;
      if (start_m < 0) start_m = 0;
      if (start_m + width_m > length) start_m = length - width_m;

      setOpenings(prev => [...prev, {
        id: `op_${Date.now()}`,
        wall_id: closestWall.id,
        type: type,
        start_m, width_m, height_m
      }]);
      toast.success(`${isDoor ? 'Puerta' : 'Ventana'} añadida`);
    } else {
      toast.error("Debes soltar la abertura sobre un muro.");
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

    const payload = {
      project: projectName,
      geometry: { Lx: params.Lx, Ly: params.Ly, h: params.h / 100 },
      materials: {
        f_c: designParams.fc, f_y: designParams.fy, cover: 0.05, bar_diam: 0.012,
        gamma_horm: 2400, E: 4700 * Math.sqrt(designParams.fc) * 1e6, nu: 0.2, k: 20e6,
        q_adm: designParams.q_adm * 1000 
      },
      walls: allWalls.map(w => ({
        x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
        thickness: w.thickness, height: w.height,
        density: w.density, type: w.type, load_factor: 1.5,
        is_plastered: w.is_plastered,
        openings: openings.filter(op => op.wall_id === w.id).map(op => ({
          type: op.type, start_m: op.start_m, width_m: op.width_m, height_m: op.height_m
        }))
      })),
      beams: perimeterWalls.map(w => ({
        x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
        width: 0.20, height: 0.30, type: 'zuncho', load_factor: 1.2
      })),
      mesh_nx: 40,
      mesh_ny: 40,
      extra_load: 300 * 9.81
    };

    setLastPayload(payload);

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

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter(d => d.tipo_losa === 'losa_fundacion_hibrida');
        setSavedRuns(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRuns(false);
    }
  };

  const loadRun = (run) => {
    setProjectName(run.nombre_proyecto);
    const inp = run.inputs;
    if (inp) {
      if (inp.geometry) setParams(prev => ({ ...prev, Lx: inp.geometry.Lx, Ly: inp.geometry.Ly, h: inp.geometry.h * 100 }));
      if (inp.materials) setDesignParams(prev => ({ ...prev, fc: inp.materials.f_c, fy: inp.materials.f_y, q_adm: inp.materials.q_adm / 1000 }));
      if (inp.walls) {
        const manualWalls = inp.walls.map((w, idx) => ({
          id: `db_${idx}`,
          type: w.type,
          x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2
        }));
        setInternalWalls(manualWalls);
        setShape('libre');
        
        const ops = [];
        inp.walls.forEach((w, idx) => {
          if (w.openings) {
            w.openings.forEach(op => {
              ops.push({ id: `op_db_${Date.now()}_${Math.random()}`, wall_id: `db_${idx}`, ...op });
            });
          }
        });
        setOpenings(ops);
      }
    }
    setResults(run.resultados);
    setLastPayload(run.inputs);
    setShowOpenModal(false);
  };

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

  const downloadHTML = () => {
    if (!results || !results.svg_plan) return;
    
    let tableRows = '';
    if (results.bands) {
      results.bands.forEach((b, i) => {
        const px = b.bar_x?.diam_mm > 0 ? `Ø${b.bar_x.diam_mm}@${(b.bar_x.sep_m*100).toFixed(0)}cm` : "Mínimo";
        const py = b.bar_y?.diam_mm > 0 ? `Ø${b.bar_y.diam_mm}@${(b.bar_y.sep_m*100).toFixed(0)}cm` : "Mínimo";
        tableRows += `<tr>
          <td>M${i+1}</td>
          <td>${b.type === 'perimetral' ? 'Perimetral' : 'Interno'}</td>
          <td>${b.band_width.toFixed(2)} m</td>
          <td>${b.Mx_design_kNm_m.toFixed(2)}</td>
          <td>${b.My_design_kNm_m.toFixed(2)}</td>
          <td>${b.Asx_cm2_m.toFixed(2)}</td>
          <td>${b.Asy_cm2_m.toFixed(2)}</td>
          <td>${px}</td>
          <td>${py}</td>
          <td style="color:#2e7d32;font-weight:bold;">OK</td>
        </tr>`;
      });
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plano de Armado — Losa de Cimentación</title>
<style>
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #222; background: #fff; max-width: 1000px; margin: 0 auto; padding: 20px;}
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; margin-bottom: 30px;}
  th { text-align: left; padding: 10px; border-bottom: 2px solid #ddd; color: #555; font-weight: 600; white-space: nowrap; background: #f5f5f5;}
  td { padding: 10px; border-bottom: 1px solid #eee; white-space: nowrap; }
  tr:hover td { background: #fafafa; }
  .svg-container { display: flex; justify-content: center; background: #fafafa; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin-bottom: 20px;}
</style>
</head>
<body>
  <h2>Reporte de Plano y Armado - Losa Híbrida</h2>
  <div class="svg-container">
    ${results.svg_plan}
  </div>
  <h3>Tabla de Armado de Bandas</h3>
  <table>
    <thead>
      <tr>
        <th>Muro</th><th>Tipo</th><th>Ancho banda</th>
        <th>Mx diseño<br>(kN·m/m)</th><th>My diseño<br>(kN·m/m)</th>
        <th>Asx<br>(cm²/m)</th><th>Asy<br>(cm²/m)</th>
        <th>Prop. X</th><th>Prop. Y</th><th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plano_armado_losa_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      if (response.ok) {
        const saved = await response.json();
        console.log("Corrida guardada:", saved);
        toast.success("¡Cálculo guardado exitosamente!");
        fetchRuns();
      } else {
        toast.error("Error al guardar el cálculo.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const saveAsToDatabase = async (customName) => {
    if (!lastPayload || !results) return;
    setSaving(true);
    try {
      const runData = {
        nombre_proyecto: customName || projectName,
        tipo_losa: 'losa_fundacion_hibrida',
        inputs: { ...lastPayload, project: customName || projectName },
        resultados: results
      };
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runData)
      });
      if (response.ok) {
        setProjectName(customName || projectName);
        toast.success(`¡Guardado como "${customName}"!`);
        fetchRuns();
      } else {
        toast.error('Error al guardar.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de red al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRun = async (e, runId) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este cálculo? Esta acción no se puede deshacer.')) return;
    setDeletingRunId(runId);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs/${runId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Cálculo eliminado.');
        setSavedRuns(prev => prev.filter(r => r.id !== runId));
      } else {
        toast.error('Error al eliminar.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de red al eliminar.');
    } finally {
      setDeletingRunId(null);
    }
  };

  return (
    <div className="calc-losa-container">
      {/* MODAL PARA ABRIR PROYECTO */}
      {showSaveAsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h3>Guardar Como</h3>
            <p style={{color:'#666', fontSize:'13px', marginBottom:'12px'}}>Escribe un nombre para este cálculo:</p>
            <input
              type="text"
              value={saveAsName}
              onChange={e => setSaveAsName(e.target.value)}
              placeholder="Ej: Losa Casa Principal"
              className="project-name-input"
              style={{width:'100%', marginBottom:'16px'}}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && saveAsName.trim()) { saveAsToDatabase(saveAsName.trim()); setShowSaveAsModal(false); } }}
            />
            <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={() => setShowSaveAsModal(false)}>Cancelar</button>
              <button className="btn-success" disabled={!saveAsName.trim() || saving} onClick={() => { saveAsToDatabase(saveAsName.trim()); setShowSaveAsModal(false); }}>
                {saving ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Abrir Proyecto Guardado</h3>
            {loadingRuns ? <p>Cargando...</p> : (
              <ul className="runs-list">
                {savedRuns.length === 0 && <p>No hay cálculos guardados.</p>}
                {savedRuns.map(run => (
                  <li key={run.id} onClick={() => loadRun(run)} className="run-item">
                    <div className="run-item-info">
                      <strong>{run.nombre_proyecto}</strong>
                      <small>{new Date(run.created_at).toLocaleString()}</small>
                    </div>
                    <button
                      className="del-btn"
                      title="Eliminar cálculo"
                      disabled={deletingRunId === run.id}
                      onClick={(e) => deleteRun(e, run.id)}
                      style={{flexShrink: 0}}
                    >
                      {deletingRunId === run.id ? '...' : '🗑️'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn-secondary" style={{marginTop: '16px'}} onClick={() => setShowOpenModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      <div className="calc-header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h2>Diseño de Losa de Fundación (Método Híbrido)</h2>
            <p>Configura la losa (Plantillas) y divisiones internas (Tabla o Clics). Incluye JSON de Auditoría.</p>
          </div>
          <div className="header-actions">
            <input 
              type="text" 
              value={projectName} 
              onChange={e => setProjectName(e.target.value)} 
              placeholder="Nombre del Proyecto"
              className="project-name-input"
            />
            <button className="btn-secondary" onClick={() => { setShowOpenModal(true); fetchRuns(); }}>
              📂 Abrir Proyecto
            </button>
          </div>
        </div>
      </div>

      <div className="calc-body">
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div className="calc-sidebar">
          
          <div className="control-group">
            <h3>1. Forma de la Losa</h3>
            <div className="shape-selector" style={{marginBottom: '12px'}}>
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
            
            {shape !== 'libre' && (
              <button 
                className="btn-secondary" 
                onClick={convertToManual} 
                style={{width: '100%', background: '#fff3e0', color: '#e65100', borderColor: '#ffcc80', fontWeight: 'bold'}}
              >
                🔗 Desvincular Perímetro (Editar aberturas)
              </button>
            )}

            <div className="params-grid" style={{marginTop: '16px'}}>
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
                  <th>Tipo</th><th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th>
                </tr>
              </thead>
              <tbody>
                {internalWalls.map(w => (
                  <tr 
                    key={w.id} 
                    className={hoveredWallId === w.id ? 'highlighted-row' : ''}
                    onMouseEnter={() => setHoveredWallId(w.id)}
                    onMouseLeave={() => setHoveredWallId(null)}
                  >
                    <td>
                      <select value={w.type} onChange={e => updateInternalWall(w.id, 'type', e.target.value)} style={{width:'50px', padding:'2px', fontSize:'10px'}}>
                        <option value="interno">Int.</option>
                        <option value="perimetral">Per.</option>
                      </select>
                    </td>
                    <td><input type="number" step="0.5" value={w.x1} onChange={e => updateInternalWall(w.id, 'x1', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.y1} onChange={e => updateInternalWall(w.id, 'y1', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.x2} onChange={e => updateInternalWall(w.id, 'x2', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.y2} onChange={e => updateInternalWall(w.id, 'y2', e.target.value)} /></td>
                    <td><button className="del-btn" onClick={() => removeInternalWall(w.id)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tabla de Aberturas (si hay) */}
            {openings.length > 0 && (
               <div className="structural-table" style={{marginTop: '24px'}}>
                 <h4>Vanos y Aberturas (Drag & Drop)</h4>
                 <table className="coords-table">
                   <thead><tr><th>Vano</th><th>Muro ID</th><th>Inicio (m)</th><th>Ancho (m)</th><th>Alto (m)</th><th></th></tr></thead>
                   <tbody>
                     {openings.map(op => {
                       let label = '🪟 Ventana';
                       if (op.type === 'door_left') label = '🚪 Puerta (Izq)';
                       if (op.type === 'door_right') label = '🚪 Puerta (Der)';
                       return (
                       <tr key={op.id}>
                         <td>{label}</td>
                         <td>{String(op.wall_id).substring(0,8)}</td>
                         <td>{op.start_m.toFixed(2)}</td>
                         <td>{op.width_m.toFixed(2)}</td>
                         <td>{op.height_m.toFixed(2)}</td>
                         <td><button className="del-btn" onClick={() => removeOpening(op.id)}>X</button></td>
                       </tr>
                     )})}
                   </tbody>
                 </table>
               </div>
            )}
            
            <button className="add-btn" onClick={() => addInternalWall({})}>+ Añadir Muro Interno</button>
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
                ⬇️ JSON Auditoría
              </button>
              <button className="btn-success" onClick={saveToDatabase} disabled={saving}>
                💾 {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                className="btn-secondary"
                style={{borderColor:'#4caf50', color:'#2e7d32'}}
                onClick={() => { setSaveAsName(projectName); setShowSaveAsModal(true); }}
                disabled={!lastPayload || !results}
              >
                📂 Guardar Como
              </button>
            </div>
          )}

        </div>

        {/* PANEL DERECHO: VISTA PREVIA Y RESULTADOS */}
        <div className="calc-content">
          <div className="canvas-wrapper hybrid-canvas">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
              <h4>Plano Interactivo (Ejes en metros)</h4>
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <div className="drag-toolbox" style={{display:'flex', gap:'8px'}}>
                  <div draggable onDragStart={(e) => handleDragStart(e, 'door_left')} className="drag-item" title="Puerta Izquierda">🚪 P. Izq</div>
                  <div draggable onDragStart={(e) => handleDragStart(e, 'door_right')} className="drag-item" title="Puerta Derecha">🚪 P. Der</div>
                  <div draggable onDragStart={(e) => handleDragStart(e, 'window')} className="drag-item" title="Ventana">🪟 Ventana</div>
                </div>
                <span className="mouse-tracker">📍 X: {mouseCoord.x.toFixed(1)}m, Y: {mouseCoord.y.toFixed(1)}m</span>
              </div>
            </div>
            
            <svg 
              ref={svgRef}
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              className={`drawing-board ${isDrawing ? 'drawing-mode' : ''}`}
              onMouseMove={handleMouseMove}
              onDoubleClick={handleSvgDoubleClick}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
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
              {allWalls.map(w => {
                const isHovered = hoveredWallId === w.id;
                const strokeColor = isHovered ? '#ff9800' : (w.type === 'perimetral' ? '#e53935' : '#1e88e5');
                const strokeW = Math.max(isHovered ? 8 : 4, w.thickness * scale + (isHovered ? 4 : 0));

                return (
                <g key={w.id} 
                   onMouseEnter={() => setHoveredWallId(w.id)}
                   onMouseLeave={() => setHoveredWallId(null)}
                   style={{ cursor: 'pointer' }}
                >
                    {isHovered && (
                      <line 
                        x1={toSvg(w.x1)} y1={toSvg(w.y1)} 
                        x2={toSvg(w.x2)} y2={toSvg(w.y2)} 
                        stroke="#ffe0b2" 
                        strokeWidth={strokeW + 6} strokeLinecap="round" 
                      />
                    )}
                    <line 
                      x1={toSvg(w.x1)} y1={toSvg(w.y1)} 
                      x2={toSvg(w.x2)} y2={toSvg(w.y2)} 
                      stroke={strokeColor} 
                      strokeWidth={strokeW} strokeLinecap="round" 
                    />
                    {openings.filter(op => op.wall_id === w.id).map(op => {
                      const len = Math.sqrt((w.x2-w.x1)**2 + (w.y2-w.y1)**2);
                      const t1 = op.start_m / len;
                      const t2 = (op.start_m + op.width_m) / len;
                      const ox1 = toSvg(w.x1 + t1 * (w.x2 - w.x1));
                      const oy1 = toSvg(w.y1 + t1 * (w.y2 - w.y1));
                      const ox2 = toSvg(w.x1 + t2 * (w.x2 - w.x1));
                      const oy2 = toSvg(w.y1 + t2 * (w.y2 - w.y1));
                      
                      const thickPx = Math.max(4, w.thickness * scale);
                      const w_px = Math.sqrt((ox2-ox1)**2 + (oy2-oy1)**2);
                      const ux = (ox2-ox1)/w_px || 0;
                      const uy = (oy2-oy1)/w_px || 0;
                      const vx = -uy;
                      const vy = ux;

                      if (op.type.startsWith('door')) {
                        const isLeft = op.type === 'door_left';
                        const hx = isLeft ? ox1 : ox2;
                        const hy = isLeft ? oy1 : oy2;
                        const ex = isLeft ? ox2 : ox1;
                        const ey = isLeft ? oy2 : oy1;
                        
                        const lx = hx + vx * w_px;
                        const ly = hy + vy * w_px;
                        
                        // Sweep flag depends on direction
                        const sweep = isLeft ? 1 : 0;
                        
                        return (
                          <g key={op.id}>
                            {/* Blanco para borrar el muro */}
                            <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#fafafa" strokeWidth={thickPx + 2} strokeLinecap="butt" />
                            {/* Hoja de la puerta */}
                            <line x1={hx} y1={hy} x2={lx} y2={ly} stroke="#333" strokeWidth="2" strokeLinecap="square" />
                            {/* Arco de apertura */}
                            <path d={`M ${lx} ${ly} A ${w_px} ${w_px} 0 0 ${sweep} ${ex} ${ey}`} fill="none" stroke="#666" strokeWidth="1.5" strokeDasharray="4,4" />
                          </g>
                        );
                      } else {
                        // Ventana
                        const f1x1 = ox1 + vx * (thickPx/2); const f1y1 = oy1 + vy * (thickPx/2);
                        const f1x2 = ox2 + vx * (thickPx/2); const f1y2 = oy2 + vy * (thickPx/2);
                        const f2x1 = ox1 - vx * (thickPx/2); const f2y1 = oy1 - vy * (thickPx/2);
                        const f2x2 = ox2 - vx * (thickPx/2); const f2y2 = oy2 - vy * (thickPx/2);
                        
                        return (
                          <g key={op.id}>
                            {/* Blanco para borrar el muro */}
                            <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#fafafa" strokeWidth={thickPx + 2} strokeLinecap="butt" />
                            {/* Bordes del muro */}
                            <line x1={f1x1} y1={f1y1} x2={f1x2} y2={f1y2} stroke="#333" strokeWidth="1" />
                            <line x1={f2x1} y1={f2y1} x2={f2x2} y2={f2y2} stroke="#333" strokeWidth="1" />
                            {/* Cristales (corredera) */}
                            <line x1={ox1 + vx*2} y1={oy1 + vy*2} x2={ox2 + vx*2} y2={oy2 + vy*2} stroke="#5bc0de" strokeWidth="2" />
                            <line x1={ox1 - vx*2} y1={oy1 - vy*2} x2={ox2 - vx*2} y2={oy2 - vy*2} stroke="#5bc0de" strokeWidth="2" />
                          </g>
                        );
                      }
                    })}
                  </g>
                );
              })}

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

              {/* Render de la Tabla en React */}
              {results.bands && (
                <div className="structural-table" style={{marginTop: '24px', overflowX: 'auto'}}>
                  <h4>Tabla de Armado de Bandas</h4>
                  <table className="coords-table" style={{marginTop: '8px', minWidth: '700px'}}>
                    <thead>
                      <tr style={{background: '#f5f5f5'}}>
                        <th>Muro</th><th>Tipo</th><th>Ancho banda</th>
                        <th>Mx diseño</th><th>My diseño</th>
                        <th>Asx (cm²/m)</th><th>Asy (cm²/m)</th>
                        <th>Prop. X</th><th>Prop. Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.bands.map((b, i) => {
                        const px = b.bar_x?.diam_mm > 0 ? `Ø${b.bar_x.diam_mm}@${(b.bar_x.sep_m*100).toFixed(0)}cm` : "Mínimo";
                        const py = b.bar_y?.diam_mm > 0 ? `Ø${b.bar_y.diam_mm}@${(b.bar_y.sep_m*100).toFixed(0)}cm` : "Mínimo";
                        return (
                          <tr key={i}>
                            <td>M{i+1}</td>
                            <td>{b.type === 'perimetral' ? 'Perim.' : 'Interno'}</td>
                            <td>{b.band_width.toFixed(2)} m</td>
                            <td>{b.Mx_design_kNm_m.toFixed(2)}</td>
                            <td>{b.My_design_kNm_m.toFixed(2)}</td>
                            <td>{b.Asx_cm2_m.toFixed(2)}</td>
                            <td>{b.Asy_cm2_m.toFixed(2)}</td>
                            <td>{px}</td>
                            <td>{py}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
