import React, { useMemo } from 'react';
import { X, Activity } from 'lucide-react';
import { useStructureStore } from './useStructureStore';

export function ElementResultsModal() {
  const { 
    rightClickedElementId, 
    setRightClickedElementId,
    results, 
    activeResultCombo,
    elements
  } = useStructureStore();

  const element = elements.find(e => e.id === rightClickedElementId);
  const elementForces = useMemo(() => {
    if (!rightClickedElementId || !results || !activeResultCombo) return null;
    const comboResults = results.results[activeResultCombo];
    if (comboResults && comboResults.element_forces) {
      return comboResults.element_forces[rightClickedElementId];
    }
    return null;
  }, [rightClickedElementId, results, activeResultCombo]);

  if (!rightClickedElementId || !element || !elementForces) return null;

  const handleClose = () => setRightClickedElementId(null);

  // Funciones de ayuda para SVG
  const renderChart = (data, key, color, title, units, reverse = false) => {
    const w = 400;
    const h = 90;
    const marginX = 20;
    const marginY = 15;
    
    const values = data.map(d => d[key]);
    let max = Math.max(...values, 0);
    let min = Math.min(...values, 0);
    
    if (max === min) {
      max += 1e-6;
      min -= 1e-6;
    }
    
    // Si queremos dibujar el momento "al revés" (tracción abajo)
    if (reverse) {
      const temp = max;
      max = -min;
      min = -temp;
    }

    const range = max - min;
    const zeroY = h - marginY - ((0 - min) / range) * (h - 2 * marginY);
    
    const points = data.map((d, i) => {
      const x = marginX + (i / (data.length - 1)) * (w - 2 * marginX);
      let val = d[key];
      if (reverse) val = -val;
      const y = h - marginY - ((val - min) / range) * (h - 2 * marginY);
      return `${x},${y}`;
    }).join(' ');

    const zeroLine = `${marginX},${zeroY} ${w - marginX},${zeroY}`;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 font-bold mb-1 px-1">
          <span>{title}</span>
          <span>{units}</span>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative shadow-inner" style={{ width: w, height: h }}>
          <svg width={w} height={h}>
            {/* Eje 0 */}
            <polyline points={zeroLine} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" />
            {/* Área sombreada */}
            <polygon points={`${marginX},${zeroY} ${points} ${w-marginX},${zeroY}`} fill={color} fillOpacity="0.2" />
            {/* Línea principal */}
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
            
            {/* Puntos y textos extremos y medio */}
            <circle cx={marginX} cy={h - marginY - (((reverse ? -values[0] : values[0]) - min) / range) * (h - 2 * marginY)} r="3" fill={color} />
            <text x={marginX} y={values[0] >= 0 ? 10 : h - 2} fill="#94a3b8" fontSize="10">{Math.abs(values[0]) < 1e-4 ? '0.00' : values[0].toFixed(2)}</text>
            
            <circle cx={w/2} cy={h - marginY - (((reverse ? -values[5] : values[5]) - min) / range) * (h - 2 * marginY)} r="3" fill={color} />
            <text x={w/2} y={values[5] >= 0 ? 10 : h - 2} fill="#94a3b8" fontSize="10" textAnchor="middle">{Math.abs(values[5]) < 1e-4 ? '0.00' : values[5].toFixed(2)}</text>
            
            <circle cx={w-marginX} cy={h - marginY - (((reverse ? -values[values.length-1] : values[values.length-1]) - min) / range) * (h - 2 * marginY)} r="3" fill={color} />
            <text x={w-marginX} y={values[values.length-1] >= 0 ? 10 : h - 2} fill="#94a3b8" fontSize="10" textAnchor="end">{Math.abs(values[values.length-1]) < 1e-4 ? '0.00' : values[values.length-1].toFixed(2)}</text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-400" size={18} />
            <h3 className="text-white font-bold">Detalles del Elemento {element.id}</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        
        <div className="p-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-300 mb-5 bg-slate-900 p-3 rounded-lg border border-slate-700">
            <div><span className="text-slate-500 uppercase font-bold mr-1">Sección:</span> {element.section_id}</div>
            <div><span className="text-slate-500 uppercase font-bold mr-1">Material:</span> {element.material_id}</div>
            <div><span className="text-slate-500 uppercase font-bold mr-1">Nodos:</span> {element.nodes[0]} a {element.nodes[1]}</div>
            <div><span className="text-slate-500 uppercase font-bold mr-1">Longitud:</span> {elementForces[elementForces.length-1].x.toFixed(2)} m</div>
          </div>
          
          {renderChart(elementForces, 'M3', '#ef4444', 'Momento Flector (M3)', 'kgf·m', true)}
          {renderChart(elementForces, 'V2', '#3b82f6', 'Fuerza Cortante (V2)', 'kgf')}
          {renderChart(elementForces, 'P', '#22c55e', 'Fuerza Axial (P)', 'kgf')}
          {renderChart(elementForces, 'uy', '#a855f7', 'Deflexión Local (uy)', 'm')}
        </div>
      </div>
    </div>
  );
}
