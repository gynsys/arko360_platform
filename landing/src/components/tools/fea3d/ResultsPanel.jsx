import React from 'react';
import { useStructureStore } from './useStructureStore';
import { Unlock, Scaling, Layers } from 'lucide-react';

export function ResultsPanel() {
  const { 
    viewMode, results, activeResultCombo, displacementScale,
    setActiveResultCombo, setDisplacementScale, exitResultsMode 
  } = useStructureStore();

  if (viewMode !== 'results' || !results) return null;

  const combinations = results.combinations || [];
  
  // Encontrar el nombre de la combinación activa
  const activeComboData = combinations.find(c => c.id === activeResultCombo);

  return (
    <div className="absolute top-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 rounded-xl shadow-2xl p-4 w-80">
      
      <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Layers size={16} className="text-indigo-400" />
          Modo Resultados
        </h3>
        <button
          onClick={exitResultsMode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white text-xs font-bold transition-all shadow-sm group"
          title="Desbloquear modelo y volver a geometría"
        >
          <Unlock size={14} className="group-hover:text-green-400 transition-colors" />
          DESBLOQUEAR
        </button>
      </div>

      <div className="space-y-4">
        {/* Selector de Combinación */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">
            Combinación a Visualizar
          </label>
          <select
            value={activeResultCombo || ''}
            onChange={(e) => setActiveResultCombo(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {combinations.map(combo => (
              <option key={combo.id} value={combo.id}>
                {combo.name}
              </option>
            ))}
          </select>
        </div>

        {/* Slider de Escala */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
              <Scaling size={12} /> Factor de Escala
            </label>
            <span className="text-xs text-indigo-300 font-mono bg-indigo-900/40 px-2 py-0.5 rounded">
              x{displacementScale}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max={Math.max(10000, displacementScale * 2)}
            step="10"
            value={displacementScale}
            onChange={(e) => setDisplacementScale(parseInt(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
            <span>x1</span>
            <span>x{Math.max(10000, displacementScale * 2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
