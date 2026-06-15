import React, { useState } from 'react';
import { X, Beaker, Plus, Copy, Trash2, Edit } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function DefineMaterialsModal({ onClose }) {
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useStructureStore();
  const [editingMat, setEditingMat] = useState(null); // null, 'new', or material_id

  const [formData, setFormData] = useState({});

  const handleEdit = (mat) => {
    setFormData({ ...mat });
    setEditingMat(mat.id);
  };

  const handleAdd = () => {
    setFormData({
      id: `MAT_${Date.now()}`,
      name: 'Nuevo Material',
      type: 'Concrete',
      density: 2400,
      weightVol: 23.56,
      E: 2535600000,
      U: 0.2,
      G: 1056500000,
      A: 0.0000099,
      fc: 28550400,
      Fy: 420000000,
      Fu: 600000000,
      color: '#ff00ff'
    });
    setEditingMat('new');
  };

  const handleSave = () => {
    if (!formData.name || !formData.id) {
      toast.error('El nombre y el ID son obligatorios.');
      return;
    }

    if (editingMat === 'new') {
      if (materials.find(m => m.id === formData.id)) {
        toast.error('Ya existe un material con ese ID.');
        return;
      }
      addMaterial(formData);
      toast.success('Material agregado.');
    } else {
      updateMaterial(editingMat, formData);
      toast.success('Material actualizado.');
    }
    setEditingMat(null);
  };

  const handleDelete = (id) => {
    if (confirm('¿Estás seguro de eliminar este material? Puede estar en uso.')) {
      deleteMaterial(id);
      toast.success('Material eliminado.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let numVal = type === 'number' ? parseFloat(value) || 0 : value;

    // Convert from kgf/cm² (UI) to kgf/m² (internal) for these fields
    if (['E', 'G', 'fc', 'Fy', 'Fu'].includes(name) && type === 'number') {
      numVal = numVal * 10000;
    }

    setFormData(prev => {
      const next = { ...prev, [name]: numVal };
      
      // Auto-calculate E and G when f'c changes for Concrete
      if (name === 'fc' && next.type === 'Concrete') {
        const fc_cm2 = numVal / 10000;
        if (fc_cm2 > 0) {
          const E_cm2 = 15100 * Math.sqrt(fc_cm2);
          next.E = E_cm2 * 10000;
          next.G = next.E / (2 * (1 + (next.U || 0.2)));
        }
      }
      return next;
    });
  };

  if (editingMat) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[600px] flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-t-md">
            <div className="font-bold text-sm">Material Property Data</div>
            <button onClick={() => setEditingMat(null)} className="hover:text-blue-200"><X size={16} /></button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
            {/* General Data */}
            <div className="border border-slate-300 p-3 rounded relative">
              <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">General Data</span>
              <div className="grid grid-cols-[1fr_2fr] gap-2 items-center mb-2">
                <label>Material Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full" />
              </div>
              <div className="grid grid-cols-[1fr_2fr] gap-2 items-center mb-2">
                <label>Material ID</label>
                <input type="text" name="id" value={formData.id || ''} onChange={handleChange} disabled={editingMat !== 'new'} className="border border-slate-300 px-2 py-1 w-full bg-slate-100" />
              </div>
              <div className="grid grid-cols-[1fr_2fr] gap-2 items-center mb-2">
                <label>Material Type</label>
                <select name="type" value={formData.type || 'Concrete'} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full">
                  <option value="Concrete">Concrete</option>
                  <option value="Rebar">Rebar</option>
                  <option value="Steel">Steel</option>
                </select>
              </div>
              <div className="grid grid-cols-[1fr_2fr] gap-2 items-center">
                <label>Material Display Color</label>
                <input type="color" name="color" value={formData.color || '#ff00ff'} onChange={handleChange} className="w-16 h-8 cursor-pointer" />
              </div>
            </div>

            {/* Weight and Mass */}
            <div className="border border-slate-300 p-3 rounded relative">
              <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Material Weight and Mass</span>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <label>Weight per Unit Volume (kgf/m³)</label>
                <input type="number" name="weightVol" value={formData.weightVol || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                <label>Mass per Unit Volume (kg/m³)</label>
                <input type="number" name="density" value={formData.density || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
            </div>

            {/* Mechanical Properties */}
            <div className="border border-slate-300 p-3 rounded relative">
              <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Mechanical Property Data</span>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <label>Modulus of Elasticity, E (kgf/cm²)</label>
                <input type="number" name="E" value={formData.E ? Math.round(formData.E / 10000) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <label>Poisson's Ratio, U</label>
                <input type="number" name="U" value={formData.U || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <label>Coefficient of Thermal Expansion, A</label>
                <input type="number" name="A" step="0.0000001" value={formData.A || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                <label>Shear Modulus, G (kgf/cm²)</label>
                <input type="number" name="G" value={formData.G ? Math.round(formData.G / 10000) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
            </div>

            {/* Design Properties (Conditional) */}
            <div className="border border-slate-300 p-3 rounded relative">
              <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Design Property Data</span>
              {formData.type === 'Concrete' && (
                <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                  <label>Specified Concrete Compressive Strength, f'c (kgf/cm²)</label>
                  <input type="number" name="fc" value={formData.fc ? Math.round(formData.fc / 10000) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                </div>
              )}
              {formData.type === 'Rebar' && (
                <>
                  <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                    <label>Minimum Yield Strength, Fy (kgf/cm²)</label>
                    <input type="number" name="Fy" value={formData.Fy ? Math.round(formData.Fy / 10000) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                  </div>
                  <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                    <label>Minimum Tensile Strength, Fu (kgf/cm²)</label>
                    <input type="number" name="Fu" value={formData.Fu ? Math.round(formData.Fu / 10000) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="bg-slate-200 border-t border-slate-300 px-4 py-3 flex justify-end gap-2 rounded-b-md">
            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium">OK</button>
            <button onClick={() => setEditingMat(null)} className="bg-white border border-slate-400 text-slate-700 px-4 py-1.5 rounded hover:bg-slate-100">Cancel</button>
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
          <div className="font-bold text-sm">Define Materials</div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 flex gap-4 h-[350px]">
          {/* List */}
          <div className="flex-1 border border-slate-300 bg-white overflow-y-auto">
            <div className="bg-slate-100 px-2 py-1 border-b border-slate-300 text-xs font-bold text-blue-800">Materials</div>
            {materials.map(m => (
              <div 
                key={m.id} 
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-100 hover:text-blue-900 border-b border-slate-100 flex justify-between"
                onClick={() => handleEdit(m)}
              >
                <span>{m.name || m.id}</span>
                <span className="text-xs text-slate-400">{m.type}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="w-[180px] flex flex-col gap-2">
            <div className="text-xs text-blue-800 font-bold mb-1">Click to:</div>
            <button onClick={handleAdd} className="w-full text-left bg-slate-200 border border-slate-300 hover:bg-slate-300 px-3 py-1.5 rounded text-sm flex items-center gap-2">
              <Plus size={14} className="text-green-600"/> Add New Material...
            </button>
            <button className="w-full text-left bg-slate-200 border border-slate-300 hover:bg-slate-300 px-3 py-1.5 rounded text-sm flex items-center gap-2 opacity-50 cursor-not-allowed">
              <Copy size={14} className="text-blue-600"/> Add Copy...
            </button>
            <div className="flex-1"></div>
            <button 
              onClick={() => {
                const id = prompt('Ingrese ID del material a eliminar:');
                if (id) handleDelete(id);
              }} 
              className="w-full text-left bg-slate-200 border border-slate-300 hover:bg-red-100 hover:border-red-300 px-3 py-1.5 rounded text-sm flex items-center gap-2"
            >
              <Trash2 size={14} className="text-red-600"/> Delete Material
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
