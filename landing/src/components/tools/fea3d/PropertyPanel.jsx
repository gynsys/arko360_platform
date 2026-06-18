import React, { useState, useRef } from 'react';
import { useStructureStore } from './useStructureStore';
import { Trash2, Info, Layers, Plus, Save, Copy } from 'lucide-react';
import { FixedIcon, PinnedIcon, RollerIcon, FreeIcon } from './RestraintIcons';
import { OpeningType } from './SlabOpeningGenerator';
import toast from 'react-hot-toast';

// Helper: obtiene etiquetas de unidades desde la cadena de unidades global
function getUnitLabels(unitsStr) {
  const u = (unitsStr || 'm, kgf, C').toLowerCase();
  const isUS = u.includes('ft');
  const isSI = u.includes('kn');
  return {
    length: isUS ? 'ft' : 'm',
    force:  isUS ? 'kip' : (isSI ? 'kN' : 'kgf'),
    distLoad: isUS ? 'kip/ft²' : (isSI ? 'kN/m²' : 'kgf/m²'),
  };
}

function getLoadConversionFactor(unitsStr) {
  const u = (unitsStr || 'm, kgf, C').toLowerCase();
  if (u.includes('ft')) return (1 / 453.59237) * (0.3048 * 0.3048);
  if (u.includes('kn')) return 1 / 101.97162;
  return 1;
}

const STANDARD_USAGES = [
  { id: 'residencial', name: 'Residencial', cm: 250, cv: 200 },
  { id: 'oficinas', name: 'Oficinas', cm: 250, cv: 250 },
  { id: 'comercial', name: 'Comercial', cm: 300, cv: 500 },
  { id: 'estacionamiento', name: 'Estacionamiento', cm: 300, cv: 250 },
  { id: 'techo', name: 'Techo / Cubierta', cm: 200, cv: 100 },
];

function determineUsage(cm, cv, factor) {
  const round4 = (v) => Math.round(v * 10000) / 10000;
  for (const usage of STANDARD_USAGES) {
    if (round4(cm) === round4(usage.cm * factor) && round4(cv) === round4(usage.cv * factor)) {
      return usage.id;
    }
  }
  return 'personalizado';
}


function OpeningEditor({ opening, updateOpening, removeOpening, addOpening }) {
  // Estado local independiente: key={o.id} en el padre fuerza remount al cambiar abertura
  const [local, setLocal] = useState(opening);

  const setField = (field, value) => {
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  const setParam = (field, value) => {
    setLocal(prev => ({ ...prev, params: { ...prev.params, [field]: value } }));
  };

  const handleApply = () => {
    const o = local;
    const parsed = {
      offsetX: parseFloat(o.offsetX) || 0,
      offsetY: parseFloat(o.offsetY) || 0,
      type: o.type,
      params: {}
    };
    for (const key in o.params) {
      parsed.params[key] = parseFloat(o.params[key]) || 0;
    }
    updateOpening(o.id, parsed);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-md p-3 text-xs mb-3">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-indigo-400 flex items-center gap-1">
          HUECO {local.type}
          <button onClick={() => removeOpening(local.id)} className="text-red-400 hover:text-red-300 ml-1" title="Eliminar Abertura"><Trash2 size={12} /></button>
        </span>
        <button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center gap-1" title="Aplicar Cambios a este hueco">
          <Save size={12} /> Aplicar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <span className="text-[10px] text-slate-500 block mb-1">Offset X (min X)</span>
          <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" value={local.offsetX} onChange={(e) => setField('offsetX', e.target.value)} />
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-1">Offset Y (min Y)</span>
          <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" value={local.offsetY} onChange={(e) => setField('offsetY', e.target.value)} />
        </div>
      </div>

      <div className="mb-2">
        <span className="text-[10px] text-slate-500 block mb-1">Forma</span>
        <select
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
          value={local.type}
          onChange={(e) => {
            const newType = e.target.value;
            let newParams = { width: 1, length: 1 };
            if (newType === OpeningType.L_SHAPE) newParams = { width1: 1, width2: 1, length1: 3, length2: 3 };
            if (newType === OpeningType.U_SHAPE) newParams = { width1: 1, width2: 1, length1: 3, length2: 3, landingWidth: 1 };
            setField('type', newType);
            setField('params', newParams);
          }}
        >
          <option value={OpeningType.LINEAR}>Rectangular</option>
          <option value={OpeningType.L_SHAPE}>Forma "L"</option>
          <option value={OpeningType.U_SHAPE}>Forma "U"</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(local.type === OpeningType.LINEAR || local.type === OpeningType.DUCT || local.type === OpeningType.ELEVATOR) && (
          <>
            <div><span className="text-[10px] text-slate-500 block mb-1">Ancho (X)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.width ?? ''} onChange={e => setParam('width', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Largo (Y)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.length ?? ''} onChange={e => setParam('length', e.target.value)} /></div>
          </>
        )}
        {local.type === OpeningType.L_SHAPE && (
          <>
            <div><span className="text-[10px] text-slate-500 block mb-1">Ancho V(X)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.width1 ?? ''} onChange={e => setParam('width1', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Ancho H(Y)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.width2 ?? ''} onChange={e => setParam('width2', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Largo T(X)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.length1 ?? ''} onChange={e => setParam('length1', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Largo T(Y)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.length2 ?? ''} onChange={e => setParam('length2', e.target.value)} /></div>
          </>
        )}
        {local.type === OpeningType.U_SHAPE && (
          <>
            <div><span className="text-[10px] text-slate-500 block mb-1">Rama Izq</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.width1 ?? ''} onChange={e => setParam('width1', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Rama Der</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.width2 ?? ''} onChange={e => setParam('width2', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Descanso(Y)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.landingWidth ?? ''} onChange={e => setParam('landingWidth', e.target.value)} /></div>
            <div><span className="text-[10px] text-slate-500 block mb-1">Ancho(X)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.length1 ?? ''} onChange={e => setParam('length1', e.target.value)} /></div>
            <div className="col-span-2"><span className="text-[10px] text-slate-500 block mb-1">Largo T(Y)</span><input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" value={local.params.length2 ?? ''} onChange={e => setParam('length2', e.target.value)} /></div>
          </>
        )}
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const { 
    selectedIds, nodes, elements, shells, loads, openings, metadata, 
    updateNode, updateShell, addLoad, updateLoad, deleteLoad, 
    deleteNode, deleteElement, deleteShell, addOpening, updateOpening, 
    removeOpening, generateMeshForShell,
    materials, sections, updateMaterial, updateSection, updateElement,
    replicateColumnProperties, replicateBeamProperties, addSection
  } = useStructureStore();
  const units = getUnitLabels(metadata?.units);
  const loadFactor = getLoadConversionFactor(metadata?.units);

  
  if (selectedIds.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Info className="mx-auto mb-2 opacity-20" size={48} />
        <p className="text-sm">Selecciona elementos en el canvas para ver o editar sus propiedades</p>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="bg-slate-900 h-full p-4 text-white overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold">Selección Múltiple</h2>
        </div>
        <div className="p-8 text-center text-slate-400 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
          <Layers className="mx-auto mb-3 text-blue-500" size={32} />
          <p className="text-2xl font-bold text-white mb-1">{selectedIds.length}</p>
          <p className="text-xs uppercase font-bold tracking-widest">Elementos Seleccionados</p>
          <p className="text-xs mt-4 opacity-60">Usa el menú "Assign" para aplicar propiedades a la selección.</p>
        </div>
      </div>
    );
  }

  const selectedId = selectedIds[0];
  const node = nodes.find(n => n.id === selectedId);
  const element = elements.find(e => e.id === selectedId);
  const shell = shells.find(s => s.id === selectedId);

  const n1_el = element ? nodes.find(n => n.id === element.nodes[0]) : null;
  const n2_el = element ? nodes.find(n => n.id === element.nodes[1]) : null;
  const isCol = element && n1_el && n2_el && Math.abs(n1_el.x - n2_el.x) < 1e-3 && Math.abs(n1_el.y - n2_el.y) < 1e-3;
  const section = element ? sections.find(s => s.id === element.section_id) : null;
  const matId = element?.material_id || section?.material_id || '';
  const material = materials.find(m => m.id === matId);

  const elementLoads = loads.filter(l => l.target_id === selectedId);
  const shellOpenings = shell ? openings.filter(o => o.hostSlabId === selectedId) : [];

  const cantileverId = shell?.cantileverId || element?.cantileverId;
  const cantNode = cantileverId ? nodes.find(n => n.cantilever && n.cantilever.cantileverId === cantileverId) : null;
  const cantileverInfo = cantNode ? cantNode.cantilever : null;

  let axisLabel = '';
  if (cantileverInfo) {
    if (cantileverInfo.axisType === 'X') {
      const uniqueX = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.x * 10) / 10))].sort((a, b) => a - b);
      const index = uniqueX.findIndex(val => Math.abs(val - cantileverInfo.axisVal) < 0.15);
      axisLabel = index >= 0 ? `Eje ${index + 1}` : `${cantileverInfo.axisVal}m`;
    } else {
      const uniqueY = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.y * 10) / 10))].sort((a, b) => a - b);
      const index = uniqueY.findIndex(val => Math.abs(val - cantileverInfo.axisVal) < 0.15);
      axisLabel = index >= 0 ? `Eje ${String.fromCharCode(65 + index)}` : `${cantileverInfo.axisVal}m`;
    }
  }

  const handleDimensionChange = (newParams) => {
    if (!element || !section) return;

    let A = 0, Ix = 0, Iy = 0, J = 0;
    const type = section.type || 'Rectangular';
    
    if (type === 'Rectangular') {
      const b = newParams.b !== undefined ? newParams.b : (section.params?.b || 0);
      const h = newParams.h !== undefined ? newParams.h : (section.params?.h || 0);
      A = b * h;
      Ix = (b * Math.pow(h, 3)) / 12;
      Iy = (h * Math.pow(b, 3)) / 12;
      J = Ix + Iy;
    } else if (type === 'Circular') {
      const d = newParams.d !== undefined ? newParams.d : (section.params?.d || 0);
      A = Math.PI * Math.pow(d, 2) / 4;
      Ix = Math.PI * Math.pow(d, 4) / 64;
      Iy = Ix;
      J = Math.PI * Math.pow(d, 4) / 32;
    } else {
      // Ala Ancha / I-Shape
      const h = newParams.h !== undefined ? newParams.h : (section.params?.h || section.params?.ht || 0);
      const b = newParams.b !== undefined ? newParams.b : (section.params?.b || section.params?.w2 || 0);
      A = section.A;
      Ix = section.Ix;
      Iy = section.Iy;
      J = section.J;
    }

    const matId = element.material_id || section.material_id || '4000Psi';

    // Generar nombre descriptivo
    let prefix = isCol ? 'COL' : 'VIGA';
    let newName = '';
    if (type === 'Rectangular') {
      newName = `${prefix}_${Math.round((newParams.b ?? section.params?.b ?? 0)*100)}x${Math.round((newParams.h ?? section.params?.h ?? 0)*100)}`;
    } else if (type === 'Circular') {
      newName = `${prefix}_D${Math.round((newParams.d ?? section.params?.d ?? 0)*100)}`;
    } else {
      newName = `${prefix}_I_${Math.round((newParams.b ?? section.params?.b ?? 0)*100)}x${Math.round((newParams.h ?? section.params?.h ?? 0)*100)}`;
    }

    // Buscar si ya existe una sección con el mismo nombre y material
    const existing = sections.find(s => s.name === newName && s.type === type && s.material_id === matId);

    if (existing) {
      updateElement(element.id, { section_id: existing.id });
    } else {
      const newSecId = `SEC_${Date.now()}`;
      addSection({
        id: newSecId,
        name: newName,
        type: type,
        material_id: matId,
        params: { ...section.params, ...newParams },
        A,
        Ix,
        Iy,
        J
      });
      updateElement(element.id, { section_id: newSecId });
    }
  };

  if (!node && !element && !shell) return null;

  return (
    <div className="bg-slate-900 h-full p-4 text-white overflow-y-auto">
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold">Propiedades</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.dispatchEvent(new Event('open-replicate-modal'))}
            className="p-2 bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
            title="Replicar Elemento(s)"
          >
            <Copy size={18} />
          </button>
          <button 
            onClick={() => {
              if (node) deleteNode(node.id);
              if (element) deleteElement(element.id);
              if (shell) deleteShell(shell.id);
            }}
            className="p-2 bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all"
            title="Eliminar Objeto"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {node && (
        <div className="space-y-6">
          <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-xl">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">NODO</p>
            <p className="text-2xl font-mono">ID: {node.id}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {['x', 'y', 'z'].map(axis => (
              <div key={axis}>
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">{axis} (m)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                  value={node[axis]}
                  onChange={(e) => updateNode(node.id, { [axis]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 block mb-2">Asignar Apoyo (Restraints)</label>
            <div className="flex gap-2 justify-center py-2 bg-slate-900 rounded-lg border border-slate-700">
              <button 
                onClick={() => updateNode(node.id, { restraint: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true }})}
                className="p-2 border border-slate-600 hover:border-blue-500 hover:bg-blue-900/30 bg-slate-800 rounded-lg flex flex-col items-center gap-1 transition-all" title="Empotrado"
              >
                <FixedIcon className="w-6 h-6 text-slate-300" />
              </button>
              <button 
                onClick={() => updateNode(node.id, { restraint: { ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }})}
                className="p-2 border border-slate-600 hover:border-emerald-500 hover:bg-emerald-900/30 bg-slate-800 rounded-lg flex flex-col items-center gap-1 transition-all" title="Articulado"
              >
                <PinnedIcon className="w-6 h-6 text-slate-300" />
              </button>
              <button 
                onClick={() => updateNode(node.id, { restraint: { ux: false, uy: false, uz: true, rx: false, ry: false, rz: false }})}
                className="p-2 border border-slate-600 hover:border-orange-500 hover:bg-orange-900/30 bg-slate-800 rounded-lg flex flex-col items-center gap-1 transition-all" title="Rodillo"
              >
                <RollerIcon className="w-6 h-6 text-slate-300" />
              </button>
              <button 
                onClick={() => updateNode(node.id, { restraint: null })}
                className="p-2 border border-slate-600 hover:border-red-500 hover:bg-red-900/30 bg-slate-800 rounded-lg flex flex-col items-center gap-1 transition-all" title="Libre"
              >
                <FreeIcon className="w-6 h-6 text-slate-300" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 block mb-2">Cargas Asignadas</label>
            {elementLoads.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-800/50 p-2 rounded">No hay cargas asignadas a este nudo.</p>
            ) : (
              <div className="space-y-2">
                {elementLoads.map((l, idx) => (
                  <div key={idx} className="bg-slate-800 border border-slate-700 rounded-md p-2 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-blue-400 uppercase flex items-center gap-1">
                        PUNTUAL (NODO)
                        <button onClick={() => deleteLoad(l.id)} className="text-red-400 hover:text-red-300 ml-2" title="Eliminar Carga"><Trash2 size={12} /></button>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-slate-300 text-[11px] bg-slate-900 p-1 rounded">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Fx:</span>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5" 
                          value={l.fx !== undefined ? l.fx : (l.direction === 'X' ? l.magnitude : 0)} 
                          onChange={(e) => updateLoad(l.id, { fx: parseFloat(e.target.value) || 0, direction: undefined, magnitude: undefined })} 
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Fy:</span>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5" 
                          value={l.fy !== undefined ? l.fy : (l.direction === 'Y' ? l.magnitude : 0)} 
                          onChange={(e) => updateLoad(l.id, { fy: parseFloat(e.target.value) || 0, direction: undefined, magnitude: undefined })} 
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Fz:</span>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5" 
                          value={l.fz !== undefined ? l.fz : (l.direction === 'Z' ? l.magnitude : 0)} 
                          onChange={(e) => updateLoad(l.id, { fz: parseFloat(e.target.value) || 0, direction: undefined, magnitude: undefined })} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

         {element && (() => {
        return (
          <div className="space-y-5">
            <div className={`${isCol ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-emerald-600/10 border border-emerald-500/20'} p-3 rounded-xl`}>
              <p className={`${isCol ? 'text-indigo-400' : 'text-emerald-400'} text-xs font-bold uppercase tracking-wider`}>
                {isCol ? 'ELEMENTO COLUMNA' : 'ELEMENTO VIGA'}
              </p>
              <p className="text-2xl font-mono text-white">ID: {element.id}</p>
            </div>
            
            <div className="space-y-1 text-slate-300 text-xs bg-slate-900 border border-slate-800 p-2 rounded-lg">
              <p>Nudos: <span className="font-mono text-white">{element.nodes.join(' → ')}</span></p>
              {n1_el && n2_el && (
                <p>Longitud: <span className="text-white font-mono">
                  {Math.sqrt(Math.pow(n1_el.x - n2_el.x, 2) + Math.pow(n1_el.y - n2_el.y, 2) + Math.pow(n1_el.z - n2_el.z, 2)).toFixed(2)}m
                </span></p>
              )}
            </div>

            {/* Configuración de Sección */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil (Sección)</h3>
              
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Sección Asignada</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono outline-none focus:border-blue-500"
                  value={element.section_id || ''}
                  onChange={(e) => {
                    const secId = e.target.value;
                    const sec = sections.find(s => s.id === secId);
                    updateElement(element.id, { 
                      section_id: secId,
                      material_id: sec ? sec.material_id : element.material_id
                    });
                  }}
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
              </div>

              {section && section.type === 'Rectangular' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-800/20 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Ancho b (m)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      value={section.params?.b || 0}
                      onChange={(e) => {
                        handleDimensionChange({ b: parseFloat(e.target.value) || 0 });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Alto h (m)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      value={section.params?.h || 0}
                      onChange={(e) => {
                        handleDimensionChange({ h: parseFloat(e.target.value) || 0 });
                      }}
                    />
                  </div>
                </div>
              )}

              {section && section.type === 'Circular' && (
                <div className="bg-slate-800/20 p-2.5 rounded-lg border border-slate-800">
                  <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Diámetro d (m)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    value={section.params?.d || 0}
                    onChange={(e) => {
                      handleDimensionChange({ d: parseFloat(e.target.value) || 0 });
                    }}
                  />
                </div>
              )}

              {section && (section.type === 'I-Shape' || section.type === 'I/Wide Flange') && (
                <div className="grid grid-cols-2 gap-3 bg-slate-800/20 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Alto h (m)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      value={section.params?.h || section.params?.ht || 0}
                      onChange={(e) => {
                        handleDimensionChange({ h: parseFloat(e.target.value) || 0 });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Ancho Ala b (m)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      value={section.params?.b || section.params?.w2 || 0}
                      onChange={(e) => {
                        handleDimensionChange({ b: parseFloat(e.target.value) || 0 });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Configuración de Material */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Propiedades del Material</h3>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Material Asignado</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono outline-none"
                  value={element.material_id || section?.material_id || ''}
                  onChange={(e) => updateElement(element.id, { material_id: e.target.value })}
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
              </div>

              {material && (
                <div className="grid grid-cols-2 gap-3 bg-slate-800/20 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Tipo</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      value={material.type || 'Concrete'}
                      onChange={(e) => updateMaterial(material.id, { type: e.target.value })}
                    >
                      <option value="Concrete">Concreto</option>
                      <option value="Steel">Acero</option>
                    </select>
                  </div>

                  <div>
                    {material.type === 'Concrete' ? (
                      <>
                        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">F'c (kg/cm²)</label>
                        <input 
                          type="number" 
                          step="10"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                          value={material.fc ? Math.round(material.fc / 10000) : 280}
                          onChange={(e) => {
                            const fc_cm2 = parseFloat(e.target.value) || 0;
                            const fc = fc_cm2 * 10000;
                            const E_cm2 = 15100 * Math.sqrt(fc_cm2);
                            const E = E_cm2 * 10000;
                            const G = E / (2 * (1 + (material.U || 0.2)));
                            updateMaterial(material.id, { fc, E, G });
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Fy (kg/cm²)</label>
                        <input 
                          type="number" 
                          step="100"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                          value={material.Fy ? Math.round(material.Fy / 10000) : 2530}
                          onChange={(e) => {
                            const Fy_cm2 = parseFloat(e.target.value) || 0;
                            const Fy = Fy_cm2 * 10000;
                            updateMaterial(material.id, { Fy });
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sección de Replicación / Cargas específica */}
            {isCol ? (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Replicar Propiedades</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => replicateColumnProperties(element.id, false)}
                    className="bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    title="Replicar sección y material a todas las columnas del mismo piso"
                  >
                    <Copy size={13} /> Por Piso
                  </button>
                  <button
                    onClick={() => replicateColumnProperties(element.id, true)}
                    className="bg-blue-900/40 border border-blue-500/30 text-blue-300 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    title="Replicar sección y material a todas las columnas del modelo"
                  >
                    <Copy size={13} /> Todo el Edificio
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                {/* Tipo de Viga */}
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Función de la Viga</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    value={element.beam_type || 'carga'}
                    onChange={(e) => updateElement(element.id, { beam_type: e.target.value })}
                  >
                    <option value="carga">Viga de Carga</option>
                    <option value="secundaria">Viga Secundaria</option>
                  </select>
                </div>

                {/* Replicación */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Replicar Propiedades</label>
                  <button
                    onClick={() => replicateBeamProperties(element.id)}
                    className="w-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    title="Replicar sección y material a todas las vigas del mismo piso con igual función estructural"
                  >
                    <Copy size={13} /> Replicar por Piso (Mismo Tipo)
                  </button>
                </div>

                {/* Cargas Asignadas en Vigas */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-400 block mb-2">Cargas Asignadas</label>
                  {elementLoads.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-800/50 p-2 rounded">No hay cargas asignadas a este elemento.</p>
                  ) : (
                    <div className="space-y-2">
                      {elementLoads.map((l, idx) => (
                        <div key={idx} className="bg-slate-800 border border-slate-700 rounded-md p-2 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-blue-400 uppercase flex items-center gap-1">
                              {l.type === 'distributed' ? 'Distribuida' : 'Puntual'}
                              <button onClick={() => deleteLoad(l.id)} className="text-red-400 hover:text-red-300 ml-2" title="Eliminar Carga"><Trash2 size={12} /></button>
                            </span>
                            {l.type === 'point_frame' && (
                              <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                                <span>Pos:</span>
                                <input 
                                  type="text" 
                                  className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-white" 
                                  value={l.offset} 
                                  onChange={(e) => updateLoad(l.id, { offset: parseFloat(e.target.value) || 0 })} 
                                />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-slate-300 text-[11px] bg-slate-900 p-1 rounded font-mono">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">Fx:</span>
                              <input 
                                type="text" 
                                className="w-full bg-slate-850 border border-slate-700 rounded px-1 py-0.5" 
                                value={l.fx} 
                                onChange={(e) => updateLoad(l.id, { fx: parseFloat(e.target.value) || 0 })} 
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">Fy:</span>
                              <input 
                                type="text" 
                                className="w-full bg-slate-850 border border-slate-700 rounded px-1 py-0.5" 
                                value={l.fy} 
                                onChange={(e) => updateLoad(l.id, { fy: parseFloat(e.target.value) || 0 })} 
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">Fz:</span>
                              <input 
                                type="text" 
                                className="w-full bg-slate-850 border border-slate-700 rounded px-1 py-0.5" 
                                value={l.fz} 
                                onChange={(e) => updateLoad(l.id, { fz: parseFloat(e.target.value) || 0 })} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {shell && (
        <div className="space-y-6">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Losa (Shell)</span>
            <span className="text-sm font-mono text-indigo-200">{shell.id}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Espesor ({units.length})</label>
              <input 
                type="number" 
                step="any"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={shell.thickness}
                onChange={(e) => updateShell(shell.id, { thickness: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Uso</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                value={determineUsage(shell.loads.CM, shell.loads.CV, loadFactor)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== 'personalizado') {
                    const usage = STANDARD_USAGES.find(u => u.id === val);
                    if (usage) {
                      updateShell(shell.id, {
                        loads: {
                          ...shell.loads,
                          CM: parseFloat((usage.cm * loadFactor).toFixed(4)),
                          CV: parseFloat((usage.cv * loadFactor).toFixed(4))
                        }
                      });
                    }
                  }
                }}
              >
                {STANDARD_USAGES.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">CM ({units.distLoad})</label>
              <input 
                type="number" 
                step="any"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={shell.loads.CM}
                onChange={(e) => updateShell(shell.id, { loads: { ...shell.loads, CM: parseFloat(e.target.value) || 0 } })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">CV ({units.distLoad})</label>
              <input 
                type="number" 
                step="any"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={shell.loads.CV}
                onChange={(e) => updateShell(shell.id, { loads: { ...shell.loads, CV: parseFloat(e.target.value) || 0 } })}
              />
            </div>
          </div>

          {/* Sección de Cargas Puntuales en Losa */}
          <div className="pt-4 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cargas Puntuales (Pz)</label>
            <div className="flex gap-2 items-end mb-2">
              <div className="flex-1">
                <label className="text-[10px] uppercase text-slate-500 mb-1 block">Pos X ({units.length})</label>
                <input type="number" step="0.1" id="shell_px" defaultValue="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase text-slate-500 mb-1 block">Pos Y ({units.length})</label>
                <input type="number" step="0.1" id="shell_py" defaultValue="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase text-slate-500 mb-1 block">Fz ({units.force})</label>
                <input type="number" step="any" id="shell_fz" defaultValue="-1000" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
              </div>
              <button 
                onClick={() => {
                  const pxInput = document.getElementById('shell_px');
                  const pyInput = document.getElementById('shell_py');
                  const px = parseFloat(pxInput.value) || 0;
                  const py = parseFloat(pyInput.value) || 0;
                  const fz = parseFloat(document.getElementById('shell_fz').value) || 0;

                  // Validar que la carga esté dentro del área de la losa
                  const shellNodes = shell.nodes.map(nid => useStructureStore.getState().nodes.find(n => n.id === nid)).filter(Boolean);
                  if (shellNodes.length > 0) {
                    const minX = Math.min(...shellNodes.map(n => n.x));
                    const maxX = Math.max(...shellNodes.map(n => n.x));
                    const minY = Math.min(...shellNodes.map(n => n.y));
                    const maxY = Math.max(...shellNodes.map(n => n.y));
                    let invalid = false;
                    if (px < minX || px > maxX) {
                      toast.error(`⚠️ Pos X=${px} fuera del rango de la losa [${minX.toFixed(2)}, ${maxX.toFixed(2)}]. Se ha reseteado.`, { duration: 5000 });
                      pxInput.value = ((minX + maxX) / 2).toFixed(2);
                      invalid = true;
                    }
                    if (py < minY || py > maxY) {
                      toast.error(`⚠️ Pos Y=${py} fuera del rango de la losa [${minY.toFixed(2)}, ${maxY.toFixed(2)}]. Se ha reseteado.`, { duration: 5000 });
                      pyInput.value = ((minY + maxY) / 2).toFixed(2);
                      invalid = true;
                    }
                    if (invalid) return;
                  }

                  addLoad({
                    id: 'L-' + Math.random().toString(36).substr(2, 5),
                    type: 'point_shell',
                    target_id: shell.id,
                    offset_x: px,
                    offset_y: py,
                    fz: fz,
                    load_case: 'CV'
                  });
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded text-xs font-bold transition-colors"
              >
                +
              </button>
            </div>
            
            <div className="space-y-1 mb-4">
              {loads.filter(l => l.target_id === shell.id && l.type === 'point_shell').map(l => (
                <div key={l.id} className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-300">
                    ({l.offset_x}, {l.offset_y}) ➔ Fz: {l.fz}
                  </span>
                  <button onClick={() => deleteLoad(l.id)} className="text-red-400 hover:text-red-300"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>

            {/* Cargas de Área (Parches) */}
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Cargas de Área (Parches)</label>
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Inicio X</label>
                  <input type="number" step="0.1" id="area_px1" defaultValue="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Inicio Y</label>
                  <input type="number" step="0.1" id="area_py1" defaultValue="0" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Fin X</label>
                  <input type="number" step="0.1" id="area_px2" defaultValue="1" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Fin Y</label>
                  <input type="number" step="0.1" id="area_py2" defaultValue="1" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] uppercase text-slate-500 mb-1 block">Qz ({units.force}/{units.length}²)</label>
                  <input type="number" step="10" id="area_qz" defaultValue="-500" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                </div>
                <button 
                  onClick={() => {
                    const px1 = parseFloat(document.getElementById('area_px1').value) || 0;
                    const py1 = parseFloat(document.getElementById('area_py1').value) || 0;
                    const px2 = parseFloat(document.getElementById('area_px2').value) || 0;
                    const py2 = parseFloat(document.getElementById('area_py2').value) || 0;
                    const qz = parseFloat(document.getElementById('area_qz').value) || 0;
                    addLoad({
                      id: 'L-' + Math.random().toString(36).substr(2, 5),
                      type: 'area_shell',
                      target_id: shell.id,
                      offset_x: px1,
                      offset_y: py1,
                      end_x: px2,
                      end_y: py2,
                      fz: qz,
                      load_case: 'CV'
                    });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  + Parche
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              {loads.filter(l => l.target_id === shell.id && l.type === 'area_shell').map(l => (
                <div key={l.id} className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-300 truncate">
                    [{l.offset_x}, {l.offset_y}] a [{l.end_x}, {l.end_y}] ➔ Qz: {l.fz}
                  </span>
                  <button onClick={() => deleteLoad(l.id)} className="text-red-400 hover:text-red-300 ml-2"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* Sección de Auto Meshing */}
          <div className="pt-4 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Auto Meshing (Elementos Finitos)</label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] uppercase text-slate-500 mb-1 block">Tamaño Máximo ({units.length})</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                  value={shell.meshSize || 1.0}
                  onChange={(e) => updateShell(shell.id, { meshSize: parseFloat(e.target.value) || 1.0 })}
                />
              </div>
              <button 
                onClick={() => generateMeshForShell(shell.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
              >
                Generar Malla
              </button>
            </div>
            {shell.mesh && (
              <p className="text-[10px] text-emerald-400 mt-2">
                Malla generada: {shell.mesh.elements.length} elementos, {shell.mesh.nodes.length} nudos.
              </p>
            )}
          </div>

          {/* Sección de Aberturas */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Aberturas</label>
              <button 
                onClick={() => addOpening({
                  hostSlabId: shell.id,
                  offsetX: 0,
                  offsetY: 0,
                  type: OpeningType.LINEAR,
                  params: { width: 1, length: 3 }
                })}
                className="text-indigo-400 hover:text-white bg-indigo-900/30 hover:bg-indigo-600 p-1 rounded transition-colors"
                title="Añadir Abertura por defecto"
              >
                <Plus size={14} />
              </button>
            </div>
            
            {shellOpenings.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-800/50 p-2 rounded">No hay aberturas en esta losa.</p>
            ) : (
              <div className="space-y-3">
                {shellOpenings.map(o => (
                  <OpeningEditor key={o.id} opening={o} updateOpening={updateOpening} removeOpening={removeOpening} addOpening={addOpening} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tarjeta de Volado (si aplica) */}
      {cantileverInfo && (
        <div className="pt-6 border-t border-slate-800 mt-6">
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              📐 Configuración del Volado
            </h3>
            <p className="text-[10px] text-slate-400">
              Eje de referencia: <span className="font-mono text-white font-bold">{axisLabel}</span> (Coord: {cantileverInfo.axisVal}m)
            </p>
            <p className="text-[10px] text-slate-400">
              Dirección de proyección: <span className="font-mono text-white font-bold">{cantileverInfo.dir}</span>
            </p>
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Longitud del Volado ({units.length})</label>
              <input 
                type="number" 
                step="0.05"
                min="0.1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                value={cantileverInfo.length}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > 0) {
                    useStructureStore.getState().updateCantileverLength(cantileverId, val);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}