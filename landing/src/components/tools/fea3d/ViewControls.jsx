import React from 'react';
import { useStructureStore } from './useStructureStore';
import { Box, Columns, Rows, ArrowUp, ArrowDown } from 'lucide-react';

export function ViewControls() {
  const { cameraView, setCameraView, activeLevel, levelUp, levelDown, nodes } = useStructureStore();

  const is3D = cameraView === '3D';
  
  // Format level text
  let levelText = '';
  if (!is3D) {
    const axis = cameraView === 'XY' ? 'Z' : cameraView === 'XZ' ? 'Y' : 'X';
    levelText = `${axis} = ${activeLevel.toFixed(2)} m`;
  }

  return (
    <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 pointer-events-none">
      
      {/* View Switchers */}
      <div className="flex bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden pointer-events-auto">
        <button
          onClick={() => setCameraView('3D')}
          className={`px-3 py-1.5 text-xs font-bold transition-all border-r border-slate-700 flex items-center gap-1 ${
            is3D ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title="Vista 3D"
        >
          <Box size={14} /> 3D
        </button>
        <button
          onClick={() => setCameraView('XY')}
          className={`px-3 py-1.5 text-xs font-bold transition-all border-r border-slate-700 flex items-center gap-1 ${
            cameraView === 'XY' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title="Vista en Planta (Plan View)"
        >
          <LayersIcon size={14} /> Planta
        </button>
        <button
          onClick={() => setCameraView('XZ')}
          className={`px-3 py-1.5 text-xs font-bold transition-all border-r border-slate-700 flex items-center gap-1 ${
            cameraView === 'XZ' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title="Vista en Elevación XZ"
        >
          <Columns size={14} /> Elev XZ
        </button>
        <button
          onClick={() => setCameraView('YZ')}
          className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 ${
            cameraView === 'YZ' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title="Vista en Elevación YZ"
        >
          <Columns size={14} /> Elev YZ
        </button>
      </div>

      {/* Level Navigation */}
      {!is3D && (
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden pointer-events-auto w-fit">
          <div className="px-3 py-1.5 text-xs font-mono font-bold text-white border-r border-slate-700 bg-slate-900/50">
            {levelText}
          </div>
          <button
            onClick={levelUp}
            className="p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white border-r border-slate-700 transition-colors"
            title="Subir de nivel"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={levelDown}
            className="p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            title="Bajar de nivel"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      )}

    </div>
  );
}

// Icono simple para layers
function LayersIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 12 12 17 22 12"></polyline>
      <polyline points="2 17 12 22 22 17"></polyline>
    </svg>
  );
}
