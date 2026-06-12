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

  const { selectedIds, rightClickedElementId, setRightClickedElementId, results, activeResultCombo, elements } = useStructureStore();

  const isMulti = selectedIds.includes(rightClickedElementId) && selectedIds.length > 1;
  
  const targetElements = useMemo(() => {
    if (!rightClickedElementId) return [];
    if (isMulti) {
      return selectedIds.map(id => elements.find(e => e.id === id)).filter(Boolean);
    }
    const single = elements.find(e => e.id === rightClickedElementId);
    return single ? [single] : [];
  }, [rightClickedElementId, selectedIds, elements, isMulti]);

  const elementForces = useMemo(() => {
    if (targetElements.length === 0 || !results || !activeResultCombo) return null;
    const comboResults = results.results[activeResultCombo];
    if (!comboResults || !comboResults.element_forces) return null;

    if (targetElements.length === 1) {
      return comboResults.element_forces[targetElements[0].id] || null;
    }

    // Topological sort for continuous beam
    const nodeToElems = {};
    targetElements.forEach(f => {
      f.nodes.forEach(nid => {
        if (!nodeToElems[nid]) nodeToElems[nid] = [];
        nodeToElems[nid].push(f.id);
      });
    });

    let startElem = targetElements[0];
    for (let f of targetElements) {
      if (f.nodes.some(nid => nodeToElems[nid].length === 1)) {
        startElem = f;
        break;
      }
    }

    const ordered = [];
    const visited = new Set();
    let current = startElem;

    while (current) {
      ordered.push(current);
      visited.add(current.id);
      let next = null;
      for (let nid of current.nodes) {
        let neighbors = nodeToElems[nid];
        for (let neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            next = targetElements.find(f => f.id === neighborId);
            break;
          }
        }
        if (next) break;
      }
      current = next;
    }
    
    targetElements.forEach(f => { if (!visited.has(f.id)) ordered.push(f); });

    let combined = [];
    let totalL = 0;
    ordered.forEach(f => {
      let forces = comboResults.element_forces[f.id];
      if (!forces) return;
      let elLength = forces[forces.length - 1].x;
      forces.forEach(st => {
        combined.push({ ...st, x: totalL + st.x });
      });
      totalL += elLength;
    });

    return combined.length > 0 ? combined : null;
  }, [targetElements, results, activeResultCombo]);

  if (!rightClickedElementId || targetElements.length === 0 || !elementForces) return null;

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
    
    const totalL = data[data.length - 1].x;
    
    const points = data.map((d) => {
      const x = marginX + (totalL > 0 ? (d.x / totalL) : 0) * (w - 2 * marginX);
      let val = d[key];
      if (reverse) val = -val;
      const y = h - marginY - ((val - min) / range) * (h - 2 * marginY);
      return `${x},${y}`;
    }).join(' ');

    const zeroLine = `${marginX},${zeroY} ${w - marginX},${zeroY}`;
    
    // Find absolute extremes for markers
    let maxObj = data[0], minObj = data[0];
    data.forEach(d => {
      if (d[key] > maxObj[key]) maxObj = d;
      if (d[key] < minObj[key]) minObj = d;
    });

    const renderMarker = (d) => {
      let v = d[key];
      let displayV = v;
      if (reverse) v = -v;
      const px = marginX + (totalL > 0 ? (d.x / totalL) : 0) * (w - 2 * marginX);
      const py = h - marginY - ((v - min) / range) * (h - 2 * marginY);
      return (
        <g key={d.x + '_' + v}>
          <circle cx={px} cy={py} r="3" fill={color} />
          <text x={px} y={v >= 0 ? 10 : h - 2} fill="#94a3b8" fontSize="10" textAnchor="middle">{Math.abs(displayV) < 1e-4 ? '0.00' : displayV.toFixed(2)}</text>
        </g>
      );
    };

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
            
            {/* Puntos máximos y mínimos */}
            {renderMarker(maxObj)}
            {Math.abs(maxObj[key] - minObj[key]) > 1e-4 && renderMarker(minObj)}
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
            <h3 className="text-white font-bold">
              {isMulti ? `Viga Continua (${targetElements.length} elementos)` : `Detalles del Elemento ${targetElements[0].id}`}
            </h3>
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
          
          {elementForces.some(d => Math.abs(d.M3) > 1e-4) && renderChart(elementForces, 'M3', '#ef4444', 'Momento Flector (M3)', 'F·L', true)}
          {elementForces.some(d => Math.abs(d.M2) > 1e-4) && renderChart(elementForces, 'M2', '#f97316', 'Momento Flector (M2)', 'F·L', true)}
          {elementForces.some(d => Math.abs(d.V2) > 1e-4) && renderChart(elementForces, 'V2', '#3b82f6', 'Fuerza Cortante (V2)', 'F')}
          {elementForces.some(d => Math.abs(d.V3) > 1e-4) && renderChart(elementForces, 'V3', '#06b6d4', 'Fuerza Cortante (V3)', 'F')}
          {renderChart(elementForces, 'P', '#22c55e', 'Fuerza Axial (P)', 'F')}
          {renderChart(elementForces, 'uy', '#a855f7', 'Deflexión Local (uy)', 'L')}
        </div>
      </div>
    </div>
  );
}
