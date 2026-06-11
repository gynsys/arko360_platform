import React, { useState } from 'react';
import { X, ArrowDownToLine } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function AssignLoadsModal({ onClose }) {
  const { selectedIds, nodes, manageNodeLoads, clearSelection, metadata, setMetadata } = useStructureStore();
  
  // Separar las unidades del string "m, kN, C" -> forceUnit = "kN"
  const unitParts = (metadata?.units || 'm, kN, C').split(',');
  const forceUnit = unitParts[1]?.trim() || 'kN';
  const momentUnit = forceUnit === 'kip' ? 'kip·ft' : forceUnit === 'kgf' ? 'kgf·m' : 'kN·m';
  
  // Filtrar solo los nodos seleccionados
  const selectedNodeIds = selectedIds.filter(id => nodes.some(n => n.id === id));
  
  const [loadData, setLoadData] = useState({
    fx: 0, fy: 0, fz: 0, mx: 0, my: 0, mz: 0
  });
  
  const [action, setAction] = useState('add'); // 'add', 'replace', 'delete'

  const handleAssign = () => {
    manageNodeLoads(selectedNodeIds, loadData, action);
    
    if (action === 'delete') {
      toast.success(`Cargas eliminadas en ${selectedNodeIds.length} nudos`);
    } else {
      toast.success(`Cargas asignadas a ${selectedNodeIds.length} nudos`);
    }
    
    clearSelection();
    onClose();
  };

  const handleChange = (e) => {
    setLoadData({ ...loadData, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  if (selectedNodeIds.length === 0) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] p-6 text-center">
          <p className="mb-4 text-slate-600">No hay nudos seleccionados para asignar cargas.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[450px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <ArrowDownToLine size={16} /> Assign Joint Loads (Forces)
          </div>
          <div className="flex items-center gap-3">
            {/* Selector de unidades en el header */}
            <select
              value={metadata?.units || 'm, kN, C'}
              onChange={(e) => setMetadata({ units: e.target.value })}
              className="bg-blue-700 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none cursor-pointer"
            >
              <option value="m, kgf, C">MKS (kgf)</option>
              <option value="m, kN, C">SI (kN)</option>
              <option value="ft, kip, F">US (kip)</option>
            </select>
            <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Aplicar carga a <span className="font-bold text-blue-600">{selectedNodeIds.length}</span> nudos.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Forces [{forceUnit}]</label>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Force Global X</label>
                <input type="number" step="any" name="fx" value={loadData.fx} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Force Global Y</label>
                <input type="number" step="any" name="fy" value={loadData.fy} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Force Global Z</label>
                <input type="number" step="any" name="fz" value={loadData.fz} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Moments [{momentUnit}]</label>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Moment Global X</label>
                <input type="number" step="any" name="mx" value={loadData.mx} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Moment Global Y</label>
                <input type="number" step="any" name="my" value={loadData.my} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Moment Global Z</label>
                <input type="number" step="any" name="mz" value={loadData.mz} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="action" value="add" checked={action === 'add'} onChange={() => setAction('add')} className="text-blue-600" />
                Add to Existing Loads
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="action" value="replace" checked={action === 'replace'} onChange={() => setAction('replace')} className="text-blue-600" />
                Replace Existing Loads
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="action" value="delete" checked={action === 'delete'} onChange={() => setAction('delete')} className="text-blue-600" />
                Delete Existing Loads
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-3 flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-200 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAssign} 
            className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
