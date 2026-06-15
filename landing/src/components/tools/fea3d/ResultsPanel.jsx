import React from 'react';
import { useStructureStore } from './useStructureStore';
import { Lock, Scaling, Layers } from 'lucide-react';

export function ResultsPanel() {
  const { 
    viewMode, results, activeResultCombo, activeResultType, displacementScale, diagramScale,
    setActiveResultCombo, setActiveResultType, setDisplacementScale, setDiagramScale, exitResultsMode 
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
          <Lock size={14} className="group-hover:text-green-400 transition-colors" />
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

        {/* Selector de Tipo de Resultado */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">
            Tipo de Resultado
          </label>
          <select
            value={activeResultType}
            onChange={(e) => setActiveResultType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="deformed">Deformada</option>
            <option value="P">Fuerza Axial (P)</option>
            <option value="V2">Cortante (V2)</option>
            <option value="V3">Cortante (V3)</option>
            <option value="M2">Momento (M2)</option>
            <option value="M3">Momento (M3)</option>
            <option disabled>--- Esfuerzos en Losas ---</option>
            <option value="Shell_M11">Momento Losa (M11)</option>
            <option value="Shell_M22">Momento Losa (M22)</option>
            <option value="Shell_M12">Momento Losa (M12)</option>
            <option value="Shell_M_max">Momento Losa (Max)</option>
            <option value="Shell_M_min">Momento Losa (Min)</option>
          </select>
        </div>

        {/* Slider de Escala para Deformada */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
              <Scaling size={12} /> Factor de Escala (Def.)
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

        {/* Slider de Escala para Diagramas */}
        {activeResultType !== 'deformed' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                <Scaling size={12} /> Escala del Diagrama
              </label>
              <span className="text-xs text-amber-300 font-mono bg-amber-900/40 px-2 py-0.5 rounded">
                x{diagramScale.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={diagramScale}
              onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
              <span>x0.1</span>
              <span>x5.0</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
