import toast from 'react-hot-toast';
import { API_BASE } from '../constants/slabConstants';

export function useSlabApi({
  projectName, setProjectName,
  params, setParams,
  designParams, setDesignParams,
  wallHeight, setWallHeight,
  internalWalls, setInternalWalls,
  columns, setColumns,
  openings, setOpenings,
  material, setMaterial,
  offset, setOffset,
  slabOffset, setSlabOffset,
  shape, setShape,
  allWalls,
  results, setResults,
  lastPayload, setLastPayload,
  loading, setLoading,
  saving, setSaving,
  error, setError,
  savedRuns, setSavedRuns,
  loadingRuns, setLoadingRuns,
  deletingRunId, setDeletingRunId,
  currentRunId, setCurrentRunId,
  showOpenModal, setShowOpenModal,
  showSaveAsModal, setShowSaveAsModal,
  setAuthModalOpen
}) {

  // Construir el payload con el estado actual
  const buildCurrentPayload = () => {
    const structuralWalls = allWalls.filter(w => w.type === 'perimetral' || w.type === 'interno');
    const losaLines = allWalls.filter(w => w.type === 'losa');
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (losaLines.length > 0) {
      losaLines.forEach(w => {
        if (w.x1 < minX) minX = w.x1;
        if (w.x2 < minX) minX = w.x2;
        if (w.x1 > maxX) maxX = w.x1;
        if (w.x2 > maxX) maxX = w.x2;
        if (w.y1 < minY) minY = w.y1;
        if (w.y2 < minY) minY = w.y2;
        if (w.y1 > maxY) maxY = w.y1;
        if (w.y2 > maxY) maxY = w.y2;
      });
    } else if (structuralWalls.length > 0) {
      structuralWalls.forEach(w => {
        if (w.x1 < minX) minX = w.x1;
        if (w.x2 < minX) minX = w.x2;
        if (w.x1 > maxX) maxX = w.x1;
        if (w.x2 > maxX) maxX = w.x2;
        if (w.y1 < minY) minY = w.y1;
        if (w.y2 < minY) minY = w.y2;
        if (w.y1 > maxY) maxY = w.y1;
        if (w.y2 > maxY) maxY = w.y2;
      });
      const numericOffset = parseFloat(slabOffset) || 0;
      minX -= numericOffset;
      maxX += numericOffset;
      minY -= numericOffset;
      maxY += numericOffset;
    } else {
      minX = 0; minY = 0; maxX = 10; maxY = 10;
    }
    
    const slabLx = maxX - minX;
    const slabLy = maxY - minY;
    const offsetX = minX;
    const offsetY = minY;

    return {
      project: projectName,
      geometry: { Lx: slabLx, Ly: slabLy, h: params.h / 100 },
      materials: {
        f_c_kgcm2: designParams.fc,
        f_c: designParams.fc / 10.197,
        f_y: designParams.fy / 10.197,
        bar_diam: 0.012,
        gamma_horm: 2400, 
        E: 4700 * Math.sqrt(designParams.fc / 10.197) * 1e6, 
        nu: 0.2, k: 20e6,
        q_adm: designParams.q_adm * 98066.5,
        band_width_m: designParams.band_width_m > 0 ? designParams.band_width_m : 0,
        custom_mesh_cm2_m: designParams.custom_mesh_cm2_m || 0,
        cover: (designParams.cover || 5) / 100
      },
      walls: structuralWalls.map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        thickness: w.thickness, height: w.height,
        density: w.density, type: w.type, load_factor: 1.5,
        is_plastered: w.is_plastered,
        openings: openings.filter(op => op.wall_id === w.id).map(op => ({
          type: op.type, start_m: op.start_m, width_m: op.width_m, height_m: op.height_m
        }))
      })),
      retaining_walls: allWalls.filter(w => w.type === 'retaining_wall').map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        thickness: w.thickness || 0.3, 
        soil_height: w.soil_height || 1.4,
        soil_density: w.soil_density || 18000.0, 
        phi: w.phi || 30.0,
        perimeter_wall_height: w.perimeter_wall_height || 2.5,
        id: String(w.id)
      })),
      support_beams: allWalls.filter(w => w.type === 'support_beam').map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        width: w.thickness || 0.3, depth: w.depth || 0.5,
        id: String(w.id)
      })),
      beams: allWalls.filter(w => w.type === 'perimetral' || w.type === 'interno').map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        width: 0.20, height: 0.30, type: 'zuncho', load_factor: 1.2
      })),
      columns: columns.map(c => ({
        x: c.x - offsetX, y: c.y - offsetY, width: c.width, length: c.length, height: c.height, load_kgf: c.load_kgf
      })),
      mesh_nx: 40,
      mesh_ny: 40,
      extra_load: 300 * 9.81,
      _canvas_state: {
        shape, params, designParams, wallHeight, internalWalls, openings, columns, material, offset
      }
    };
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setLastPayload(null);

    const payload = buildCurrentPayload();
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
    setLoadingRuns(true);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('arko_token')}` }
      });
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
    setCurrentRunId(run.id);

    const inp = run.inputs;
    if (inp && inp._canvas_state) {
      const st = inp._canvas_state;
      setShape(st.shape || 'rectangular');
      if (st.params) setParams(st.params);
      if (st.designParams) setDesignParams(st.designParams);
      if (st.wallHeight) setWallHeight(st.wallHeight);
      if (st.internalWalls) setInternalWalls(st.internalWalls);
      if (st.openings) setOpenings(st.openings);
      if (st.columns) setColumns(st.columns);
      if (st.material) setMaterial(st.material);
      if (st.offset !== undefined) setOffset(st.offset);
    } else if (inp) {
      if (inp.geometry) setParams(prev => ({ ...prev, Lx: inp.geometry.Lx, Ly: inp.geometry.Ly, h: inp.geometry.h * 100 }));
      if (inp.materials) {
        const fc_kgcm2 = inp.materials.f_c_kgcm2 || +(inp.materials.f_c * 10.197).toFixed(0);
        const fy_kgcm2 = +(inp.materials.f_y * 10.197).toFixed(0);
        const q_adm_kgcm2 = +(inp.materials.q_adm / 98066.5).toFixed(2);
        const bw = inp.materials.band_width_m || 0;
        setDesignParams(prev => ({ ...prev, fc: fc_kgcm2, fy: fy_kgcm2, q_adm: q_adm_kgcm2, band_width_m: bw }));
      }
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
          <td>${(b.Mx_design_kNm_m * 101.9716).toFixed(2)}</td>
          <td>${(b.My_design_kNm_m * 101.9716).toFixed(2)}</td>
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
  ${results.svg_details ? `
  <h3>Detalles Constructivos Transversales</h3>
  <div class="svg-container">
    ${results.svg_details}
  </div>
  ` : ''}
  <h3>Tabla de Armado de Bandas</h3>
  <table>
    <thead>
      <tr>
        <th>Muro</th><th>Tipo</th><th>Ancho banda</th>
        <th>Mx diseño<br>(kgf·m/m)</th><th>My diseño<br>(kgf·m/m)</th>
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
    if (!results) return;
    const freshPayload = buildCurrentPayload();
    setSaving(true);
    try {
      const runData = {
        nombre_proyecto: projectName,
        tipo_losa: 'losa_fundacion_hibrida',
        inputs: freshPayload,
        resultados: results
      };
      const method = currentRunId ? 'PUT' : 'POST';
      const endpoint = currentRunId ? `${API_BASE}/calculadora-losas/runs/${currentRunId}` : `${API_BASE}/calculadora-losas/runs`;
      
      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('arko_token')}`
        },
        body: JSON.stringify(runData)
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentRunId(data.id);
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
    if (!results) return;
    const freshPayload = buildCurrentPayload();
    setSaving(true);
    try {
      const runData = {
        nombre_proyecto: customName || projectName,
        tipo_losa: 'losa_fundacion_hibrida',
        inputs: { ...freshPayload, project: customName || projectName },
        resultados: results
      };
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('arko_token')}`
        },
        body: JSON.stringify(runData)
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentRunId(data.id);
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
    if (!window.confirm('¿Eliminar este cálculo? Esta acción no se puede deshacer.')) return;
    setDeletingRunId(runId);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs/${runId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('arko_token')}` }
      });
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

  const handleNewProject = () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontWeight: '600' }}>¿Deseas iniciar un proyecto nuevo?</span>
        <span style={{ fontSize: '13px', color: '#666' }}>Se perderán los cambios no guardados.</span>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              setProjectName('Nuevo Proyecto');
              setShape('Rectangular');
              setParams({ Lx: 10, Ly: 10, wingX: 4, wingY: 4, wingX2: 4, baseY: 4, barY: 4, h: 15 });
              setOffset(0.5);
              setSlabOffset(0.0);
              setInternalWalls([]);
              setColumns([]);
              setOpenings([]);
              setResults(null);
              setError(null);
              setCurrentRunId(null);
              toast.success('Nuevo proyecto iniciado');
            }}
            style={{ padding: '4px 12px', background: '#e53935', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            Sí, reiniciar
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '4px 12px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  const handleCloseProject = () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontWeight: '600' }}>¿Deseas cerrar la herramienta?</span>
        <span style={{ fontSize: '13px', color: '#666' }}>Asegúrate de haber guardado tus cambios.</span>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              if (onBack) onBack();
            }}
            style={{ padding: '4px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            Sí, salir
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '4px 12px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  return {
    buildCurrentPayload,
    runAnalysis,
    fetchRuns,
    loadRun,
    saveToDatabase,
    saveAsToDatabase,
    deleteRun,
    handleNewProject,
    handleCloseProject,
    downloadHTML
  };
}
