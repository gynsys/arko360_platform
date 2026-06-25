import React, { useState } from 'react';
import { X, Box } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function AssignSectionModal({ onClose }) {
  const { sections, selectedIds, elements, nodes, updateElement, clearSelection } = useStructureStore();
  
  // Filtrar solo los frames seleccionados
  const selectedFrameIds = selectedIds.filter(id => elements.some(e => e.id === id));
  
  const [targetSectionId, setTargetSectionId] = useState(sections[0]?.id || '');
  const [applyToSymmetric, setApplyToSymmetric] = useState(true);

  const handleAssign = () => {
    if (!targetSectionId) {
      toast.error('Selecciona una sección primero');
      return;
    }

    const section = sections.find(s => s.id === targetSectionId);
    if (!section) return;

    // Obtener elementos seleccionados reales
    const selectedElements = selectedFrameIds.map(id => elements.find(e => e.id === id));
    
    // Set final a aplicar
    const elementsToUpdate = new Set(selectedFrameIds);

    if (applyToSymmetric) {
      // Para cada elemento seleccionado, encontrar equivalentes en otros pórticos (mismo X, Z)
      selectedElements.forEach(selEl => {
        const n1 = nodes.find(n => n.id === selEl.nodes[0]);
        const n2 = nodes.find(n => n.id === selEl.nodes[1]);
        if (!n1 || !n2) return;
        
        const midX = (n1.x + n2.x) / 2;
        const midZ = (n1.z + n2.z) / 2;
        
        elements.forEach(el => {
           if (el.type !== 'frame') return;
           const en1 = nodes.find(n => n.id === el.nodes[0]);
           const en2 = nodes.find(n => n.id === el.nodes[1]);
           if (!en1 || !en2) return;
           
           const eMidX = (en1.x + en2.x) / 2;
           const eMidZ = (en1.z + en2.z) / 2;
           
           if (Math.abs(midX - eMidX) < 1e-3 && Math.abs(midZ - eMidZ) < 1e-3) {
             elementsToUpdate.add(el.id);
           }
        });
      });
    }

    // Asignar sección y material
    elementsToUpdate.forEach(id => {
      updateElement(id, { 
        section_id: targetSectionId,
        material_id: section.material_id 
      });
    });

    toast.success(`Sección ${section.name} asignada a ${elementsToUpdate.size} elementos`);
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
          
          <div className="flex items-center gap-2 mt-2 bg-slate-100 p-2 border border-slate-200 rounded">
            <input 
              type="checkbox" 
              id="applyToSymmetric" 
              checked={applyToSymmetric} 
              onChange={(e) => setApplyToSymmetric(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="applyToSymmetric" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Propagar a todos los pórticos paralelos
            </label>
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
