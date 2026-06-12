import React, { useState } from 'react';
import { X, Lock, Check } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';
import { FixedIcon, PinnedIcon, RollerIcon, FreeIcon } from './RestraintIcons';

export function AssignRestraintsModal({ onClose }) {
  const { selectedIds, nodes, updateNode, clearSelection } = useStructureStore();
  
  const selectedNodeIds = selectedIds.filter(id => nodes.some(n => n.id === id));
  
  const [restraints, setRestraints] = useState({
    ux: false, uy: false, uz: false,
    rx: false, ry: false, rz: false
  });

  const handleToggle = (key) => {
    setRestraints({ ...restraints, [key]: !restraints[key] });
  };

  const handleAssign = () => {
    // If all are false, restraint is null
    const isAnyRestraint = Object.values(restraints).some(v => v);
    const restraintVal = isAnyRestraint ? restraints : null;
    
    selectedNodeIds.forEach(id => {
      updateNode(id, { restraint: restraintVal });
    });
    
    toast.success(`Restricciones asignadas a ${selectedNodeIds.length} nudos`);
    clearSelection();
    onClose();
  };

  if (selectedNodeIds.length === 0) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] p-6 text-center">
          <p className="mb-4 text-slate-600">No hay nudos seleccionados para asignar restricciones.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[350px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <Lock size={16} /> Assign Restraints
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Aplicar apoyo a <span className="font-bold text-blue-600">{selectedNodeIds.length}</span> nudos.
          </p>

          <div className="flex gap-3 justify-center py-4 bg-slate-100 rounded-lg border border-slate-200">
            <button 
              onClick={() => setRestraints({ ux: true, uy: true, uz: true, rx: true, ry: true, rz: true })}
              className="p-3 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 bg-white rounded-lg flex flex-col items-center gap-1 transition-all" title="Empotrado"
            >
              <FixedIcon className="w-8 h-8 text-slate-700" />
            </button>
            <button 
              onClick={() => setRestraints({ ux: true, uy: true, uz: true, rx: false, ry: false, rz: false })}
              className="p-3 border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 bg-white rounded-lg flex flex-col items-center gap-1 transition-all" title="Articulado"
            >
              <PinnedIcon className="w-8 h-8 text-slate-700" />
            </button>
            <button 
              onClick={() => setRestraints({ ux: false, uy: false, uz: true, rx: false, ry: false, rz: false })}
              className="p-3 border-2 border-slate-300 hover:border-orange-500 hover:bg-orange-50 bg-white rounded-lg flex flex-col items-center gap-1 transition-all" title="Rodillo"
            >
              <RollerIcon className="w-8 h-8 text-slate-700" />
            </button>
            <button 
              onClick={() => setRestraints({ ux: false, uy: false, uz: false, rx: false, ry: false, rz: false })}
              className="p-3 border-2 border-slate-300 hover:border-red-500 hover:bg-red-50 bg-white rounded-lg flex flex-col items-center gap-1 transition-all" title="Libre"
            >
              <FreeIcon className="w-8 h-8 text-slate-700" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-white border border-slate-200 p-4 rounded-lg">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Translación</label>
              {['ux', 'uy', 'uz'].map(k => (
                <div key={k} onClick={() => handleToggle(k)} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${restraints[k] ? 'bg-blue-600 border-blue-600' : 'border-slate-400'}`}>
                    {restraints[k] && <Check size={12} className="text-white" />}
                  </div>
                  <span className="uppercase">Trans {k.replace('u', '')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Rotación</label>
              {['rx', 'ry', 'rz'].map(k => (
                <div key={k} onClick={() => handleToggle(k)} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${restraints[k] ? 'bg-blue-600 border-blue-600' : 'border-slate-400'}`}>
                    {restraints[k] && <Check size={12} className="text-white" />}
                  </div>
                  <span className="uppercase">Rot {k.replace('r', '')}</span>
                </div>
              ))}
            </div>
            {/* hidden inputs to handle clicks on the custom checkboxes above */}
            {['ux', 'uy', 'uz', 'rx', 'ry', 'rz'].map(k => (
              <input key={`input-${k}`} type="checkbox" className="hidden" checked={restraints[k]} onChange={() => handleToggle(k)} />
            ))}
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
