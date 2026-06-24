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
    const { name, value, type } = e.target;
    let finalValue = value;
    if (type === 'number') {
      finalValue = value === '' ? 0 : parseFloat(value);
    }
    
    setFormData(prev => {
      const newParams = { ...prev.params, [name]: finalValue };
      const newSec = { ...prev, params: newParams };
      
      // Auto-calcular propiedades groseras si es rectangular
      if (newSec.type === 'Rectangular') {
        const { b, h } = newParams;
        newSec.A = b * h;
        newSec.Ix = (b * Math.pow(h, 3)) / 12;
        newSec.Iy = (h * Math.pow(b, 3)) / 12;
        newSec.J = newSec.Ix + newSec.Iy; // Aproximación
      }
      
      // Auto-calcular si es Non-Prismatic
      if (newSec.type === 'Non-Prismatic') {
        let sec1, sec2;
        if (newParams.defType === 'Interpolate') {
          sec1 = sections.find(s => s.id === newParams.start_section_id);
          sec2 = sections.find(s => s.id === newParams.end_section_id);
          if (sec1 && sec2) {
            newSec.A = ((sec1.A || 0) + (sec2.A || 0)) / 2;
            newSec.Ix = ((sec1.Ix || 0) + (sec2.Ix || 0)) / 2;
            newSec.Iy = ((sec1.Iy || 0) + (sec2.Iy || 0)) / 2;
            newSec.J = ((sec1.J || 0) + (sec2.J || 0)) / 2;
          }
        } else {
          sec1 = sections.find(s => s.id === newParams.base_section_id);
          if (sec1) {
            const h_base = sec1.params?.h || sec1.params?.ht || sec1.params?.d || 0.4;
            const haunch_h = parseFloat(newParams.haunch_h) || 0;
            const ratio = (h_base + haunch_h / 2) / h_base;
            newSec.A = (sec1.A || 0) * (1 + (haunch_h/2)/h_base * 0.5); // Approx web area increase
            newSec.Ix = (sec1.Ix || 0) * Math.pow(ratio, 2);
            newSec.Iy = (sec1.Iy || 0);
            newSec.J = (sec1.J || 0) * ratio;
          }
        }
      }
      
      return newSec;
    });
  };

  if (editingSec) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[600px] flex flex-col">
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-t-md">
            <div className="font-bold text-sm">Datos de Propiedad de Sección</div>
            <button onClick={() => setEditingSec(null)} className="hover:text-blue-200"><X size={16} /></button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {/* Columna Izquierda: General */}
              <div className="space-y-4">
                <div className="border border-slate-300 p-3 rounded relative">
                  <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Datos Generales</span>
                  <div className="mb-2">
                    <label className="block mb-1">Nombre de la Sección</label>
                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full" />
                  </div>
                  <div className="mb-2">
                    <label className="block mb-1">ID de Sección</label>
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
                    <label className="block mb-1">Tipo de Forma</label>
                    <select name="type" value={formData.type || 'Rectangular'} onChange={handleChange} className="border border-slate-300 px-2 py-1 w-full">
                      <option value="Rectangular">Rectangular</option>
                      <option value="Circular">Circular</option>
                      <option value="I-Shape">Perfil I / Ala Ancha</option>
                      <option value="Non-Prismatic">No Prismática (Variable)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Dimensiones */}
              <div className="space-y-4">
                <div className="border border-slate-300 p-3 rounded relative h-full">
                  <span className="absolute -top-2.5 left-2 bg-slate-50 px-1 text-blue-700 font-semibold text-xs">Dimensiones</span>
                  
                  {formData.type === 'Rectangular' && (
                    <>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Peralte (t3), h</label>
                        <input type="number" name="h" value={formData.params?.h || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Ancho (t2), b</label>
                        <input type="number" name="b" value={formData.params?.b || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                    </>
                  )}

                  {formData.type === 'Circular' && (
                    <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                      <label>Diámetro, d</label>
                      <input type="number" name="d" value={formData.params?.d || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                    </div>
                  )}

                  {formData.type === 'I-Shape' && (
                    <>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Peralte Total (t3)</label>
                        <input type="number" name="h" value={formData.params?.h || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Ancho Ala Superior (t2)</label>
                        <input type="number" name="b" value={formData.params?.b || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center mb-2">
                        <label>Espesor Ala Superior (tf)</label>
                        <input type="number" name="tf" value={formData.params?.tf || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                      <div className="grid grid-cols-[2fr_1fr] gap-2 items-center">
                        <label>Espesor del Alma (tw)</label>
                        <input type="number" name="tw" value={formData.params?.tw || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" />
                      </div>
                    </>
                  )}

                  {formData.type === 'Non-Prismatic' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block mb-1 font-semibold text-blue-800">Método de Definición</label>
                        <select 
                          name="defType" 
                          value={formData.params?.defType || 'Cartela'} 
                          onChange={handleParamChange} 
                          className="border border-slate-300 px-2 py-1 w-full bg-blue-50"
                        >
                          <option value="Cartela">Fabricar Cartela desde Perfil</option>
                          <option value="Interpolate">Interpolar Dos Secciones</option>
                        </select>
                      </div>

                      {formData.params?.defType === 'Interpolate' ? (
                        <>
                          <div className="grid grid-cols-[1fr_2fr] gap-2 items-center mb-2">
                            <label>Sección Inicial</label>
                            <select name="start_section_id" value={formData.params?.start_section_id || ''} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 w-full">
                              <option value="">-- Seleccionar --</option>
                              {sections.filter(s => s.type !== 'Non-Prismatic').map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-[1fr_2fr] gap-2 items-center mb-2">
                            <label>Sección Final</label>
                            <select name="end_section_id" value={formData.params?.end_section_id || ''} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 w-full">
                              <option value="">-- Seleccionar --</option>
                              {sections.filter(s => s.type !== 'Non-Prismatic').map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                            </select>
                          </div>
                          
                          {/* SVG Visualizer Interpolate */}
                          <div className="mt-4 border border-slate-200 bg-white rounded flex justify-center items-center h-[90px] relative">
                            <svg width="200" height="70" viewBox="0 0 200 70">
                              {(() => {
                                const sec1 = sections.find(s => s.id === formData.params?.start_section_id);
                                const sec2 = sections.find(s => s.id === formData.params?.end_section_id);
                                const h1 = sec1?.params?.h || sec1?.params?.ht || sec1?.params?.d || 0.4;
                                const h2 = sec2?.params?.h || sec2?.params?.ht || sec2?.params?.d || 0.4;
                                const maxH = Math.max(h1, h2, 0.1);
                                const scale = 40 / maxH;
                                const yTop = 15;
                                const yBot1 = yTop + (h1 * scale);
                                const yBot2 = yTop + (h2 * scale);
                                return <polygon points={`10,${yTop} 190,${yTop} 190,${yBot2} 10,${yBot1}`} fill="#0284c7" opacity="0.8" />;
                              })()}
                              <line x1="10" y1="5" x2="10" y2="65" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2"/>
                              <line x1="190" y1="5" x2="190" y2="65" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2"/>
                              <text x="10" y="10" fontSize="10" fill="#64748b" textAnchor="middle">Start</text>
                              <text x="190" y="10" fontSize="10" fill="#64748b" textAnchor="middle">End</text>
                            </svg>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-[1.5fr_2fr] gap-2 items-center mb-2">
                            <label>Perfil Base</label>
                            <select name="base_section_id" value={formData.params?.base_section_id || ''} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 w-full">
                              <option value="">-- Seleccionar --</option>
                              {sections.filter(s => s.type !== 'Non-Prismatic').map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-[1.5fr_2fr] gap-2 items-center mb-2">
                            <label>Peralte Cartela (+)</label>
                            <input type="number" name="haunch_h" value={formData.params?.haunch_h || 0} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 text-right w-full" placeholder="ej. 0.4" />
                          </div>
                          <div className="grid grid-cols-[1.5fr_2fr] gap-2 items-center mb-2">
                            <label>Ubicación Cartela</label>
                            <select name="haunch_pos" value={formData.params?.haunch_pos || 'start'} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 w-full">
                              <option value="start">En Nodo Inicial</option>
                              <option value="end">En Nodo Final</option>
                            </select>
                          </div>
                          
                          {/* SVG Visualizer Haunch */}
                          <div className="mt-4 border border-slate-200 bg-white rounded flex justify-center items-center h-[90px] relative">
                            <svg width="200" height="70" viewBox="0 0 200 70">
                              {(() => {
                                const haunchPos = formData.params?.haunch_pos || 'start';
                                const haunchH = parseFloat(formData.params?.haunch_h) || 0;
                                const baseSec = sections.find(s => s.id === formData.params?.base_section_id);
                                const baseH = baseSec?.params?.h || baseSec?.params?.ht || baseSec?.params?.d || 0.4;
                                const totalH = baseH + haunchH;
                                
                                const scale = 40 / Math.max(totalH, 0.1); 
                                const h1 = baseH * scale;
                                const h2 = totalH * scale;
                                
                                const yTop = 15;
                                const yBotBase = yTop + h1;
                                const yBotHaunch = yTop + h2;
                                
                                if (haunchPos === 'start') {
                                  return <polygon points={`10,${yTop} 190,${yTop} 190,${yBotBase} 70,${yBotBase} 10,${yBotHaunch}`} fill="#0284c7" opacity="0.8" />;
                                } else {
                                  return <polygon points={`10,${yTop} 190,${yTop} 190,${yBotHaunch} 130,${yBotBase} 10,${yBotBase}`} fill="#0284c7" opacity="0.8" />;
                                }
                              })()}
                              <line x1="10" y1="5" x2="10" y2="65" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2"/>
                              <line x1="190" y1="5" x2="190" y2="65" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2"/>
                              <text x="10" y="10" fontSize="10" fill="#64748b" textAnchor="middle">Start</text>
                              <text x="190" y="10" fontSize="10" fill="#64748b" textAnchor="middle">End</text>
                            </svg>
                          </div>
                        </>
                      )}

                      <div className="border-t border-slate-200 mt-2 pt-2">
                        <label className="block mb-1 font-semibold">Alineación Geométrica (Inserción)</label>
                        <select name="alignment" value={formData.params?.alignment || 'Center'} onChange={handleParamChange} className="border border-slate-300 px-2 py-1 w-full">
                          <option value="Top Center">Centro Superior (Tope Plano)</option>
                          <option value="Center">Centro (Centrado)</option>
                          <option value="Bottom Center">Centro Inferior (Fondo Plano)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Properties (Read Only) */}
            <div className="border border-slate-300 p-3 rounded relative bg-slate-100">
              <span className="absolute -top-2.5 left-2 bg-slate-100 px-1 text-blue-700 font-semibold text-xs">Propiedades Calculadas</span>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500">Área de Sección</label>
                  <div className="font-mono">{formData.A?.toExponential(4)}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Momento de Inercia 3</label>
                  <div className="font-mono">{formData.Ix?.toExponential(4)}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Momento de Inercia 2</label>
                  <div className="font-mono">{formData.Iy?.toExponential(4)}</div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Constante Torsional</label>
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
          <div className="font-bold text-sm">Propiedades de Frame</div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 flex gap-4 h-[350px]">
          {/* List */}
          <div className="flex-1 border border-slate-300 bg-white overflow-y-auto">
            <div className="bg-slate-100 px-2 py-1 border-b border-slate-300 text-xs font-bold text-blue-800">Propiedades</div>
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
            <div className="text-xs text-blue-800 font-bold mb-1">Click para:</div>
            <button onClick={handleAdd} className="w-full text-left bg-slate-200 border border-slate-300 hover:bg-slate-300 px-3 py-1.5 rounded text-sm flex items-center gap-2">
              <Plus size={14} className="text-green-600"/> Agregar Nueva...
            </button>
            <div className="flex-1"></div>
            <button 
              onClick={() => {
                toast.custom((t) => (
                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl flex flex-col gap-3 min-w-[300px]">
                    <p className="text-white text-sm font-bold flex items-center gap-2">
                      <Trash2 size={16} className="text-red-400" /> Eliminar Sección
                    </p>
                    <input 
                      type="text" 
                      id={`delete-sec-input-${t.id}`}
                      className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-red-500 focus:outline-none"
                      placeholder="ID de la sección (ej. SEC_1)"
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
                          const val = document.getElementById(`delete-sec-input-${t.id}`)?.value.trim();
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
              <Trash2 size={14} className="text-red-600"/> Eliminar Propiedad
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
