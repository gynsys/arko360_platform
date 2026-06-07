import React from 'react';
import { useStructureStore } from './useStructureStore';

export function PropertyPanel() {
  const { selectedId, nodes, elements, updateNode, addLoad } = useStructureStore();
  
  const node = nodes.find(n => n.id === selectedId);
  const element = elements.find(e => e.id === selectedId);

  if (!node && !element) return <div className="p-4 text-slate-500">Seleccione un objeto</div>;

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 h-full p-4 text-white overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 border-b border-slate-600 pb-2">Propiedades</h2>

      {node && (
        <div className="space-y-4">
          <p className="text-blue-400 font-bold">NODO ID: {node.id}</p>
          <div className="grid grid-cols-3 gap-2">
            {['x', 'y', 'z'].map(axis => (
              <div key={axis}>
                <label className="text-xs uppercase text-slate-400">{axis}</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-sm"
                  value={node[axis]}
                  onChange={(e) => updateNode(node.id, { [axis]: parseFloat(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-700">
            <h4 className="text-sm font-bold mb-2">Asignar Carga</h4>
            <input id="q_mag" type="number" placeholder="Magnitud (N)" className="w-full bg-slate-900 mb-2 p-1 text-sm rounded"/>
            <button 
              className="w-full bg-green-600 hover:bg-green-500 py-1 rounded font-bold text-xs"
              onClick={() => addLoad({ target_id: node.id, type: 'point', direction: 'Z', magnitude: -parseFloat(document.getElementById('q_mag').value) })}
            >ASIGNAR CARGA Z</button>
          </div>
        </div>
      )}

      {element && (
        <div className="space-y-4">
          <p className="text-green-400 font-bold">ELEMENTO ID: {element.id}</p>
          <p className="text-xs text-slate-400">Tipo: {element.type}</p>
          <div className="pt-4 border-t border-slate-700">
             <button className="w-full bg-blue-600 py-1 rounded text-xs font-bold">Ver Diagramas</button>
          </div>
        </div>
      )}
    </div>
  );
}