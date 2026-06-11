import React, { useState } from 'react';
import { X, ArrowDownToLine, Info } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function AssignFrameLoadsModal({ onClose }) {
  const { selectedIds, elements, manageFrameLoads, clearSelection, metadata, setMetadata } = useStructureStore();
  
  const unitParts = (metadata?.units || 'm, kN, C').split(',');
  const forceUnit = unitParts[1]?.trim() || 'kN';
  const lengthUnit = unitParts[0]?.trim() || 'm';
  
  const selectedElementIds = selectedIds.filter(id => elements.some(e => e.id === id));
  
  const [loadType, setLoadType] = useState('distributed'); // 'distributed', 'point_frame'
  const [loadData, setLoadData] = useState({
    fx: 0, fy: 0, fz: 0, offset: 0.5
  });
  
  const [action, setAction] = useState('add'); // 'add', 'replace', 'delete'

  const handleAssign = () => {
    manageFrameLoads(selectedElementIds, loadData, action, loadType);
    
    if (action === 'delete') {
      toast.success(`Cargas eliminadas en ${selectedElementIds.length} elementos`);
    } else {
      toast.success(`Cargas asignadas a ${selectedElementIds.length} elementos`);
    }
    
    clearSelection();
    onClose();
  };

  const handleChange = (e) => {
    setLoadData({ ...loadData, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  if (selectedElementIds.length === 0) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] p-6 text-center">
          <p className="mb-4 text-slate-600">No hay vigas o columnas seleccionadas para asignar cargas.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Cerrar</button>
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
            <ArrowDownToLine size={16} /> Assign Frame Loads
          </div>
          <div className="flex items-center gap-3">
            <select
              value={metadata?.units || 'm, kN, C'}
              onChange={(e) => setMetadata({ units: e.target.value })}
              className="bg-blue-700 border border-blue-500 text-white text-xs px-2 py-0.5 rounded focus:outline-none cursor-pointer"
            >
              <option value="m, kgf, C">MKS (m, kgf)</option>
              <option value="m, kN, C">SI (m, kN)</option>
              <option value="ft, kip, F">US (ft, kip)</option>
            </select>
            <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Aplicar carga a <span className="font-bold text-blue-600">{selectedElementIds.length}</span> elementos.
          </p>

          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
              className={`flex-1 py-1 text-xs font-bold rounded ${loadType === 'distributed' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setLoadType('distributed')}
            >
              Carga Distribuida Uniforme
            </button>
            <button 
              className={`flex-1 py-1 text-xs font-bold rounded ${loadType === 'point_frame' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setLoadType('point_frame')}
            >
              Carga Puntual
            </button>
          </div>
          
          <div className="space-y-3 bg-white border border-slate-200 p-3 rounded-lg">
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
              {loadType === 'distributed' ? `Uniform Loads [${forceUnit}/${lengthUnit}]` : `Point Forces [${forceUnit}]`}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Global X</label>
                <input type="number" step="any" name="fx" value={loadData.fx} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Global Y</label>
                <input type="number" step="any" name="fy" value={loadData.fy} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Global Z</label>
                <input type="number" step="any" name="fz" value={loadData.fz} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
              </div>
            </div>

            {loadType === 'point_frame' && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Location</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 mb-1 block">Relative Distance (0 to 1)</label>
                    <input type="number" step="0.1" min="0" max="1" name="offset" value={loadData.offset} onChange={handleChange} disabled={action === 'delete'} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-blue-500" />
                  </div>
                  <div className="flex-1 text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 flex items-start gap-1">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>0 es el inicio de la viga, 0.5 el centro, 1 es el final.</span>
                  </div>
                </div>
              </div>
            )}
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
