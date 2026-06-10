import React, { useState } from 'react';
import { X, Box } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function AssignSectionModal({ onClose }) {
  const { sections, selectedIds, elements, updateElement, clearSelection } = useStructureStore();
  
  // Filtrar solo los frames seleccionados
  const selectedFrameIds = selectedIds.filter(id => elements.some(e => e.id === id));
  
  const [targetSectionId, setTargetSectionId] = useState(sections[0]?.id || '');

  const handleAssign = () => {
    if (!targetSectionId) {
      toast.error('Selecciona una sección primero');
      return;
    }

    const section = sections.find(s => s.id === targetSectionId);
    if (!section) return;

    // Asignar sección y material (la sección tiene un material_id asociado)
    selectedFrameIds.forEach(id => {
      updateElement(id, { 
        section_id: targetSectionId,
        material_id: section.material_id 
      });
    });

    toast.success(`Sección ${section.name} asignada a ${selectedFrameIds.length} elementos`);
    clearSelection();
    onClose();
  };

  if (selectedFrameIds.length === 0) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] p-6 text-center">
          <p className="mb-4 text-slate-600">No hay elementos Frame (Vigas/Columnas) seleccionados para asignar una sección.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <Box size={16} /> Assign Frame Section
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Aplicar sección a <span className="font-bold text-blue-600">{selectedFrameIds.length}</span> elementos.
          </p>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Sección Disponible</label>
            <div className="border border-slate-300 rounded-md bg-white max-h-48 overflow-y-auto">
              {sections.map(s => (
                <div 
                  key={s.id}
                  onClick={() => setTargetSectionId(s.id)}
                  className={`px-3 py-2 text-sm cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                    targetSectionId === s.id ? 'bg-blue-100 text-blue-800 font-bold border-l-4 border-l-blue-600' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {s.name} <span className="text-xs font-normal text-slate-400 ml-2">({s.type})</span>
                </div>
              ))}
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
