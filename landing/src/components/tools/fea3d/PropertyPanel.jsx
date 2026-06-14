import React, { useState, useRef } from 'react';
import { useStructureStore } from './useStructureStore';
import { Trash2, Info, Layers, Plus, Save } from 'lucide-react';
import { FixedIcon, PinnedIcon, RollerIcon, FreeIcon } from './RestraintIcons';
import { OpeningType } from './SlabOpeningGenerator';

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

function OpeningEditor({ opening, updateOpening, removeOpening }) {
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
          <button onClick={() => removeOpening(local.id)} className="text-red-400 hover:text-red-300 ml-2" title="Eliminar Abertura"><Trash2 size={12} /></button>
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
  const { selectedIds, nodes, elements, shells, loads, openings, metadata, updateNode, updateShell, addLoad, updateLoad, deleteLoad, deleteNode, deleteElement, deleteShell, addOpening, updateOpening, removeOpening } = useStructureStore();
  const units = getUnitLabels(metadata?.units);
  
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

  const elementLoads = loads.filter(l => l.target_id === selectedId);
  const shellOpenings = shell ? openings.filter(o => o.hostSlabId === selectedId) : [];

  if (!node && !element && !shell) return null;

  return (
    <div className="bg-slate-900 h-full p-4 text-white overflow-y-auto">
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold">Propiedades</h2>
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

      {element && (
        <div className="space-y-4">
          <div className="bg-emerald-600/10 border border-emerald-500/20 p-3 rounded-xl">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">ELEMENTO FRAME</p>
            <p className="text-2xl font-mono">ID: {element.id}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Nudos: {element.nodes.join(' → ')}</p>
            <p className="text-sm text-slate-400">Sección: <span className="text-white font-mono">{element.section_id}</span></p>
          </div>
          
          <div className="pt-4 border-t border-slate-800">
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
                    <div className="grid grid-cols-3 gap-1 text-slate-300 text-[11px] bg-slate-900 p-1 rounded">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Fx:</span>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5" 
                          value={l.fx} 
                          onChange={(e) => updateLoad(l.id, { fx: parseFloat(e.target.value) || 0 })} 
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Fy:</span>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5" 
                          value={l.fy} 
                          onChange={(e) => updateLoad(l.id, { fy: parseFloat(e.target.value) || 0 })} 
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Fz:</span>
                        <input 
                          type="text" 
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.5" 
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

      {shell && (
        <div className="space-y-6">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Losa (Shell)</span>
            <span className="text-sm font-mono text-indigo-200">{shell.id}</span>
          </div>

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
                  <OpeningEditor key={o.id} opening={o} updateOpening={updateOpening} removeOpening={removeOpening} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}