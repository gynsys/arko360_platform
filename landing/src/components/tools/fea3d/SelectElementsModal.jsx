import React, { useState } from 'react';
import { X, Filter } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function SelectElementsModal({ onClose }) {
  const { elements, shells, sections, materials, setSelectedIds } = useStructureStore();
  const [filterType, setFilterType] = useState('Type'); // Type, Section, Material
  const [targetType, setTargetType] = useState('All'); 
  const [targetSection, setTargetSection] = useState(sections[0]?.id || '');
  const [targetMaterial, setTargetMaterial] = useState(materials[0]?.id || '');

  const handleSelect = () => {
    let ids = [];

    if (filterType === 'Type') {
      if (targetType === 'All') {
        ids = [...elements.map(e => e.id), ...shells.map(s => s.id)];
      } else if (targetType === 'Frame') {
        ids = elements.map(e => e.id);
      } else if (targetType === 'Shell') {
        ids = shells.map(s => s.id);
      }
    } else if (filterType === 'Section') {
      ids = elements.filter(e => e.section_id === targetSection).map(e => e.id);
    } else if (filterType === 'Material') {
      const elIds = elements.filter(e => e.material_id === targetMaterial).map(e => e.id);
      const shIds = shells.filter(s => s.material_id === targetMaterial).map(s => s.id);
      ids = [...elIds, ...shIds];
    }

    setSelectedIds(ids);
    toast.success(`${ids.length} elementos seleccionados`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <Filter size={16} /> Select Elements
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 font-medium">Select by Properties:</p>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Filter By</label>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="Type">Element Type</option>
              <option value="Section">Frame Section</option>
              <option value="Material">Material Property</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Value</label>
            
            {filterType === 'Type' && (
              <select 
                value={targetType} 
                onChange={e => setTargetType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All Elements</option>
                <option value="Frame">Frames (Vigas/Columnas)</option>
                <option value="Shell">Shells (Losas/Muros)</option>
              </select>
            )}

            {filterType === 'Section' && (
              <select 
                value={targetSection} 
                onChange={e => setTargetSection(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {filterType === 'Material' && (
              <select 
                value={targetMaterial} 
                onChange={e => setTargetMaterial(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
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
            onClick={handleSelect} 
            className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
