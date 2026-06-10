import React from 'react';
import { useStructureStore } from './useStructureStore';
import { Trash2, Info, Layers } from 'lucide-react';

export function PropertyPanel() {
  const { selectedIds, nodes, elements, shells, updateNode, updateShell, addLoad, deleteNode, deleteElement, deleteShell } = useStructureStore();
  
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
            <label className="text-xs font-bold text-slate-400 block mb-2">Asignar Carga Puntual (kN)</label>
            <div className="flex gap-2 mb-2">
              <select id="q_dir" className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white">
                <option value="X">Eje Global X</option>
                <option value="Y">Eje Global Y</option>
                <option value="Z">Eje Global Z</option>
              </select>
              <input id="q_mag" type="number" placeholder="Magnitud" defaultValue="-10" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"/>
            </div>
            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
              onClick={() => {
                const mag = parseFloat(document.getElementById('q_mag').value);
                const dir = document.getElementById('q_dir').value;
                if (!isNaN(mag)) {
                  addLoad({ target_id: node.id, type: 'point', direction: dir, magnitude: mag, load_case: 'CV' });
                }
              }}
            >
              Asignar Carga al Nudo
            </button>
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
        </div>
      )}

      {shell && (
        <div className="space-y-6">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-xl">
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider">LOSA (SHELL)</p>
            <p className="text-2xl font-mono">ID: {shell.id}</p>
          </div>

          <div>
            <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">Espesor (m)</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
              value={shell.thickness}
              onChange={(e) => updateShell(shell.id, { thickness: parseFloat(e.target.value) || 0.1 })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">CM (kN/m²)</label>
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                value={shell.loads.CM}
                onChange={(e) => updateShell(shell.id, { loads: { ...shell.loads, CM: parseFloat(e.target.value) || 0 } })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500 font-bold mb-1 block">CV (kN/m²)</label>
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                value={shell.loads.CV}
                onChange={(e) => updateShell(shell.id, { loads: { ...shell.loads, CV: parseFloat(e.target.value) || 0 } })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}