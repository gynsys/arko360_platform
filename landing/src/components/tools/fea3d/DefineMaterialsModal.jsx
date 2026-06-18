import React, { useState } from 'react';
import { X, Beaker, Plus, Copy, Trash2, Edit } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function DefineMaterialsModal({ onClose }) {
  const { materials, addMaterial, updateMaterial, deleteMaterial, metadata } = useStructureStore();
  const [editingMat, setEditingMat] = useState(null); // null, 'new', or material_id

  const [formData, setFormData] = useState({});

  const unitParts = (metadata?.units || 'm, kgf, C').split(',');
  const forceUnit = unitParts[1]?.trim() || 'kgf';
  const lenUnit = unitParts[0]?.trim() || 'm';
  const isMKS = forceUnit === 'kgf';
  const isSI = forceUnit === 'kN';
  const isUS = forceUnit === 'kip';

  const weightLabel = isUS ? 'Weight per Unit Volume (kip/ft³)' : isSI ? 'Weight per Unit Volume (kN/m³)' : 'Weight per Unit Volume (kgf/m³)';
  const massLabel = isUS ? 'Mass per Unit Volume (slug/ft³)' : 'Mass per Unit Volume (kg/m³)';
  const ELabel = isUS ? 'Modulus of Elasticity, E (ksi)' : isSI ? 'Modulus of Elasticity, E (MPa)' : 'Modulus of Elasticity, E (kgf/cm²)';
  const GLabel = isUS ? 'Shear Modulus, G (ksi)' : isSI ? 'Shear Modulus, G (MPa)' : 'Shear Modulus, G (kgf/cm²)';
  const fcLabel = isUS ? "Specified Concrete Compressive Strength, f'c (psi)" : isSI ? "Specified Concrete Compressive Strength, f'c (MPa)" : "Specified Concrete Compressive Strength, f'c (kgf/cm²)";
  const FyLabel = isUS ? 'Minimum Yield Strength, Fy (ksi)' : isSI ? 'Minimum Yield Strength, Fy (MPa)' : 'Minimum Yield Strength, Fy (kgf/cm²)';
  const FuLabel = isUS ? 'Minimum Tensile Strength, Fu (ksi)' : isSI ? 'Minimum Tensile Strength, Fu (MPa)' : 'Minimum Tensile Strength, Fu (kgf/cm²)';

  const getFieldFactor = (fieldName) => {
    if (isMKS) return 10000;
    if (isSI) return 1000;
    if (isUS) {
      if (['E', 'G'].includes(fieldName)) return 1;
      if (fieldName === 'fc') return 0.000144;
      if (['Fy', 'Fu'].includes(fieldName)) return 0.144;
    }
    return 10000;
  };

  const handleEdit = (mat) => {
    setFormData({ ...mat });
    setEditingMat(mat.id);
  };

  const handleAdd = () => {
    if (isUS) {
      setFormData({
        id: `MAT_${Date.now()}`,
        name: 'Nuevo Material',
        type: 'Concrete',
        density: 4.66,
        weightVol: 0.150,
        E: 3605,
        U: 0.2,
        G: 1502,
        A: 0.0000099,
        fc: 0.576,
        Fy: 7.20,
        Fu: 9.36,
        color: '#ff00ff'
      });
    } else if (isSI) {
      setFormData({
        id: `MAT_${Date.now()}`,
        name: 'Nuevo Material',
        type: 'Concrete',
        density: 2400,
        weightVol: 23.544,
        E: 24855578,
        U: 0.2,
        G: 10356491,
        A: 0.0000099,
        fc: 28000,
        Fy: 345000,
        Fu: 450000,
        color: '#ff00ff'
      });
    } else {
      setFormData({
        id: `MAT_${Date.now()}`,
        name: 'Nuevo Material',
        type: 'Concrete',
        density: 2400,
        weightVol: 2400,
        E: 2535600000,
        U: 0.2,
        G: 1056500000,
        A: 0.0000099,
        fc: 2800000,
        Fy: 42000000,
        Fu: 60000000,
        color: '#ff00ff'
      });
    }
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

    if (['E', 'G', 'fc', 'Fy', 'Fu'].includes(name) && type === 'number') {
      const factor = getFieldFactor(name);
      numVal = numVal * factor;
    }

    setFormData(prev => {
      const next = { ...prev, [name]: numVal };
      
      // Link weight and mass bidirectionally
      if (name === 'density') {
        if (isMKS) {
          next.weightVol = numVal;
        } else if (isSI) {
          next.weightVol = Math.round((numVal * 0.00980665) * 10000) / 10000;
        } else if (isUS) {
          next.weightVol = Math.round((numVal * 0.03217405) * 100000) / 100000;
        }
      }
      if (name === 'weightVol') {
        if (isMKS) {
          next.density = numVal;
        } else if (isSI) {
          next.density = Math.round((numVal / 0.00980665) * 100) / 100;
        } else if (isUS) {
          next.density = Math.round((numVal / 0.03217405) * 10000) / 10000;
        }
      }

      // Auto-calculate G
      if (name === 'E' || name === 'U') {
        next.G = next.E / (2 * (1 + (next.U ?? 0.2)));
      }

      // Auto-calculate E and G when f'c changes for Concrete
      if (name === 'fc' && next.type === 'Concrete') {
        const fc_ui = numVal / getFieldFactor('fc');
        if (fc_ui > 0) {
          let E_ui = 0;
          if (isMKS) E_ui = 15100 * Math.sqrt(fc_ui);
          else if (isSI) E_ui = 4700 * Math.sqrt(fc_ui);
          else if (isUS) E_ui = 57000 * Math.sqrt(fc_ui);

          next.E = E_ui * getFieldFactor('E');
          next.G = next.E / (2 * (1 + (next.U ?? 0.2)));
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
                <label>{weightLabel}</label>
                <input type="number" step="any" name="weightVol" value={formData.weightVol || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                <label>{massLabel}</label>
                <input type="number" step="any" name="density" value={formData.density || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
            </div>

            {/* Mechanical Properties */}
            <div className="border border-slate-300 p-3 rounded relative">
              <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Mechanical Property Data</span>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <div>
                  <label>{ELabel}</label>
                  {formData.type === 'Concrete' && (
                    <div className="text-[10px] text-blue-600 mt-0.5 flex flex-wrap gap-1">
                      <span>Sugerencias ACI:</span>
                      {isMKS && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => {
                              const fc_ui = (formData.fc || 0) / 10000;
                              if (fc_ui > 0) {
                                const E_val = Math.round(15100 * Math.sqrt(fc_ui));
                                handleChange({ target: { name: 'E', value: E_val.toString(), type: 'number' } });
                              }
                            }}
                            className="underline hover:text-blue-800 font-bold"
                          >
                            15100*√f'c ({Math.round(15100 * Math.sqrt((formData.fc || 0) / 10000))})
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              const fc_ui = (formData.fc || 0) / 10000;
                              if (fc_ui > 0) {
                                const E_val = Math.round(15000 * Math.sqrt(fc_ui));
                                handleChange({ target: { name: 'E', value: E_val.toString(), type: 'number' } });
                              }
                            }}
                            className="underline hover:text-blue-800 font-bold"
                          >
                            15000*√f'c ({Math.round(15000 * Math.sqrt((formData.fc || 0) / 10000))})
                          </button>
                        </>
                      )}
                      {isSI && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const fc_ui = (formData.fc || 0) / 1000;
                            if (fc_ui > 0) {
                              const E_val = Math.round(4700 * Math.sqrt(fc_ui));
                              handleChange({ target: { name: 'E', value: E_val.toString(), type: 'number' } });
                            }
                          }}
                          className="underline hover:text-blue-800 font-bold"
                        >
                          4700*√f'c ({Math.round(4700 * Math.sqrt((formData.fc || 0) / 1000))})
                        </button>
                      )}
                      {isUS && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const fc_ui = (formData.fc || 0) / 0.000144;
                            if (fc_ui > 0) {
                              const E_val = Math.round((57000 * Math.sqrt(fc_ui)) / 1000);
                              handleChange({ target: { name: 'E', value: E_val.toString(), type: 'number' } });
                            }
                          }}
                          className="underline hover:text-blue-800 font-bold"
                        >
                          57000*√f'c ({Math.round((57000 * Math.sqrt((formData.fc || 0) / 0.000144)) / 1000)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <input type="number" step="any" name="E" value={formData.E ? Math.round(formData.E / getFieldFactor('E')) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <label>Poisson's Ratio, U</label>
                <input type="number" step="any" name="U" value={formData.U || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                <label>Coefficient of Thermal Expansion, A</label>
                <input type="number" name="A" step="0.0000001" value={formData.A || 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                <label>{GLabel}</label>
                <input type="number" step="any" name="G" value={formData.G ? Math.round(formData.G / getFieldFactor('G')) : 0} disabled className="border border-slate-300 px-2 py-1 text-right w-full bg-slate-100 font-semibold cursor-not-allowed" title="Shear Modulus is auto-calculated" />
              </div>
            </div>

            {/* Design Properties (Conditional) */}
            <div className="border border-slate-300 p-3 rounded relative">
              <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Design Property Data</span>
              {formData.type === 'Concrete' && (
                <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                  <label>{fcLabel}</label>
                  <input type="number" step="any" name="fc" value={formData.fc ? Math.round(formData.fc / getFieldFactor('fc')) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                </div>
              )}
              {(formData.type === 'Rebar' || formData.type === 'Steel') && (
                <>
                  <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                    <label>{FyLabel}</label>
                    <input type="number" step="any" name="Fy" value={formData.Fy ? Math.round(formData.Fy / getFieldFactor('Fy')) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                  </div>
                  <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                    <label>{FuLabel}</label>
                    <input type="number" step="any" name="Fu" value={formData.Fu ? Math.round(formData.Fu / getFieldFactor('Fu')) : 0} onChange={handleChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
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
                toast.custom((t) => (
                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl flex flex-col gap-3 min-w-[300px]">
                    <p className="text-white text-sm font-bold flex items-center gap-2">
                      <Trash2 size={16} className="text-red-400" /> Eliminar Material
                    </p>
                    <input 
                      type="text" 
                      id={`delete-mat-input-${t.id}`}
                      className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-red-500 focus:outline-none"
                      placeholder="ID del material (ej. mat-1)"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.target.value.trim();
                          if (val) handleDelete(val);
                          toast.dismiss(t.id);
                        }
                      }}
                    />
                    <div className="flex gap-2 justify-end mt-2">
                      <button 
                        onClick={() => toast.dismiss(t.id)} 
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          const val = document.getElementById(`delete-mat-input-${t.id}`)?.value.trim();
                          if (val) handleDelete(val);
                          toast.dismiss(t.id);
                        }} 
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ), { duration: Infinity });
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
