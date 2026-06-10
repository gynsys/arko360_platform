import React from 'react';
import { useStructureStore } from './useStructureStore';
import { X, Plus, Trash2, Calculator } from 'lucide-react';

export function LoadCombosModal({ isOpen, onClose }) {
  const { loadCombinations, addLoadCombination, updateLoadCombination, deleteLoadCombination } = useStructureStore();

  if (!isOpen) return null;

  const handleAddCombo = () => {
    addLoadCombination({
      name: `Nueva Combinación ${loadCombinations.length + 1}`,
      factors: { CM: 1.0, CV: 1.0 }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Combinaciones de Carga</h2>
              <p className="text-slate-400 text-sm mt-1">
                Define los factores de mayoración para las cargas Muertas (CM) y Vivas (CV).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loadCombinations.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No hay combinaciones definidas.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-medium w-1/2">Nombre de Combinación</th>
                  <th className="pb-3 font-medium text-center">Factor CM</th>
                  <th className="pb-3 font-medium text-center">Factor CV</th>
                  <th className="pb-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loadCombinations.map((combo) => (
                  <tr key={combo.id} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={combo.name}
                        onChange={(e) => updateLoadCombination(combo.id, { name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        placeholder="Ej. 1.4 CM"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          step="0.1"
                          value={combo.factors.CM}
                          onChange={(e) => updateLoadCombination(combo.id, { 
                            factors: { ...combo.factors, CM: parseFloat(e.target.value) || 0 } 
                          })}
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-center text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          step="0.1"
                          value={combo.factors.CV}
                          onChange={(e) => updateLoadCombination(combo.id, { 
                            factors: { ...combo.factors, CV: parseFloat(e.target.value) || 0 } 
                          })}
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-center text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        onClick={() => deleteLoadCombination(combo.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar Combinación"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleAddCombo}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-sm font-bold rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
            >
              <Plus size={16} />
              AÑADIR COMBINACIÓN
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-900/20"
          >
            LISTO
          </button>
        </div>
      </div>
    </div>
  );
}
