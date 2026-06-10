import React, { useState } from 'react';
import { X, Plus, Copy, Trash2 } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function DefineSectionsModal({ onClose }) {
  const { sections, materials, addSection, updateSection, deleteSection } = useStructureStore();
  const [editingSec, setEditingSec] = useState(null);

  const [formData, setFormData] = useState({});

  const handleEdit = (sec) => {
    setFormData({ ...sec });
    setEditingSec(sec.id);
  };

  const handleAdd = () => {
    setFormData({
      id: `SEC_${Date.now()}`,
      name: 'Nueva Sección',
      type: 'Rectangular', // Rectangular, Circular, I-Shape
      material_id: materials.length > 0 ? materials[0].id : '',
      params: { b: 0.3, h: 0.4, d: 0.3, tw: 0.01, tf: 0.015 },
      A: 0.12,
      Ix: 0.0016,
      Iy: 0.0009,
      J: 0.002
    });
    setEditingSec('new');
  };

  const handleSave = () => {
    if (!formData.name || !formData.id) {
      toast.error('El nombre y el ID son obligatorios.');
      return;
    }

    if (editingSec === 'new') {
      if (sections.find(s => s.id === formData.id)) {
        toast.error('Ya existe una sección con ese ID.');
        return;
      }
      addSection(formData);
      toast.success('Sección agregada.');
    } else {
      updateSection(editingSec, formData);
      toast.success('Sección actualizada.');
    }
    setEditingSec(null);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar esta sección?')) {
      deleteSection(id);
      toast.success('Sección eliminada.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => {
      const newParams = { ...prev.params, [name]: numValue };
      const newSec = { ...prev, params: newParams };
      
      // Auto-calcular propiedades groseras si es rectangular
      if (newSec.type === 'Rectangular') {
        const { b, h } = newParams;
        newSec.A = b * h;
        newSec.Ix = (b * Math.pow(h, 3)) / 12;
        newSec.Iy = (h * Math.pow(b, 3)) / 12;
        newSec.J = newSec.Ix + newSec.Iy; // Aproximación
      }
      
      return newSec;
    });
  };

  if (editingSec) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[600px] flex flex-col">
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-t-md">
            <div className="font-bold text-sm">Frame Section Property Data</div>
            <button onClick={() => setEditingSec(null)} className="hover:text-blue-200"><X size={16} /></button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {/* Columna Izquierda: General */}
              <div className="space-y-4">
                <div className="border border-slate-300 p-3 rounded relative">
                  <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">General Data</span>
                  <div className="mb-2">
                    <label className="block mb-1">Section Name</label>
                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full" />
                  </div>
                  <div className="mb-2">
                    <label className="block mb-1">Section ID</label>
                    <input type="text" name="id" value={formData.id || ''} onChange={handleChange} disabled={editingSec !== 'new'} className="border border-slate-300 px-2 py-1 w-full bg-slate-100" />
                  </div>
                  <div className="mb-2">
                    <label className="block mb-1">Material</label>
                    <select name="material_id" value={formData.material_id || ''} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full">
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Shape Type</label>
                    <select name="type" value={formData.type || 'Rectangular'} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full">
                      <option value="Rectangular">Rectangular</option>
                      <option value="Circular">Circular</option>
                      <option value="I-Shape">I-Shape / Wide Flange</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Dimensiones */}
              <div className="space-y-4">
                <div className="border border-slate-300 p-3 rounded relative h-full">
                  <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Dimensions</span>
                  
                  {formData.type === 'Rectangular' && (
                    <>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Depth (t3), h</label>
                        <input type="number" name="h" value={formData.params?.h || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Width (t2), b</label>
                        <input type="number" name="b" value={formData.params?.b || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                    </>
                  )}

                  {formData.type === 'Circular' && (
                    <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                      <label>Diameter, d</label>
                      <input type="number" name="d" value={formData.params?.d || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                    </div>
                  )}

                  {formData.type === 'I-Shape' && (
                    <>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Total Depth (t3)</label>
                        <input type="number" name="h" value={formData.params?.h || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Top Flange Width (t2)</label>
                        <input type="number" name="b" value={formData.params?.b || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Top Flange Thickness</label>
                        <input type="number" name="tf" value={formData.params?.tf || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                        <label>Web Thickness (tw)</label>
                        <input type="number" name="tw" value={formData.params?.tw || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Properties (Read Only) */}
            <div className="border border-slate-300 p-3 rounded relative bg-slate-100">
              <span className="absolute -top-2.5 left-2 bg-slate-100 px-1 text-blue-700 font-semibold text-xs">Calculated Properties</span>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500">Cross-section Area</label>
                  <div className="font-mono">{formData.A?.toExponential(4)}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Moment of Inertia 3</label>
                  <div className="font-mono">{formData.Ix?.toExponential(4)}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Moment of Inertia 2</label>
                  <div className="font-mono">{formData.Iy?.toExponential(4)}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Torsional Constant</label>
                  <div className="font-mono">{formData.J?.toExponential(4)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-200 border-t border-slate-300 px-4 py-3 flex justify-end gap-2 rounded-b-md">
            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium">OK</button>
            <button onClick={() => setEditingSec(null)} className="bg-white border border-slate-400 text-slate-700 px-4 py-1.5 rounded hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[500px] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-t-md">
          <div className="font-bold text-sm">Frame Properties</div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 flex gap-4 h-[350px]">
          {/* List */}
          <div className="flex-1 border border-slate-300 bg-white overflow-y-auto">
            <div className="bg-slate-100 px-2 py-1 border-b border-slate-300 text-xs font-bold text-blue-800">Properties</div>
            {sections.map(s => (
              <div 
                key={s.id} 
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-100 hover:text-blue-900 border-b border-slate-100 flex justify-between"
                onClick={() => handleEdit(s)}
              >
                <span>{s.name || s.id}</span>
                <span className="text-xs text-slate-400">{s.type}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="w-[180px] flex flex-col gap-2">
            <div className="text-xs text-blue-800 font-bold mb-1">Click to:</div>
            <button onClick={handleAdd} className="w-full text-left bg-slate-200 border border-slate-300 hover:bg-slate-300 px-3 py-1.5 rounded text-sm flex items-center gap-2">
              <Plus size={14} className="text-green-600"/> Add New Property...
            </button>
            <div className="flex-1"></div>
            <button 
              onClick={() => {
                const id = prompt('Ingrese ID de la sección a eliminar:');
                if (id) handleDelete(id);
              }} 
              className="w-full text-left bg-slate-200 border border-slate-300 hover:bg-red-100 hover:border-red-300 px-3 py-1.5 rounded text-sm flex items-center gap-2"
            >
              <Trash2 size={14} className="text-red-600"/> Delete Property
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-3 flex justify-end gap-2 rounded-b-md">
          <button onClick={onClose} className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium">OK</button>
        </div>
      </div>
    </div>
  );
}
