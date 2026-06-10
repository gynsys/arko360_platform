import React, { useState } from 'react';
import { X, Table as TableIcon } from 'lucide-react';
import { useStructureStore } from './useStructureStore';

export function ResultsTableModal({ onClose }) {
  const { results, loadCombinations, nodes, elements } = useStructureStore();
  const [activeTab, setActiveTab] = useState('forces'); // 'displacements', 'forces'
  const [activeComboId, setActiveComboId] = useState(
    loadCombinations.length > 0 ? loadCombinations[0].id : ''
  );

  if (!results || !results.results) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] p-6 text-center">
          <p className="mb-4">No hay resultados disponibles. Corre el análisis primero.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Cerrar</button>
        </div>
      </div>
    );
  }

  const currentCombo = results.results[activeComboId] || Object.values(results.results)[0];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-t-md">
          <div className="font-bold text-sm flex items-center gap-2">
            <TableIcon size={16} /> Result Tables
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('forces')}
              className={`px-4 py-1.5 rounded-t-md font-bold text-sm border-b-2 transition-colors ${activeTab === 'forces' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Element Forces
            </button>
            <button 
              onClick={() => setActiveTab('displacements')}
              className={`px-4 py-1.5 rounded-t-md font-bold text-sm border-b-2 transition-colors ${activeTab === 'displacements' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Joint Displacements
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <label className="font-bold text-slate-600">Load Combo:</label>
            <select 
              value={activeComboId} 
              onChange={e => setActiveComboId(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 bg-white"
            >
              {loadCombinations.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white p-4">
          {activeTab === 'forces' && currentCombo?.element_forces && (
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 sticky top-0 shadow-sm">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-center bg-blue-50">Element</th>
                  <th className="border border-slate-300 px-2 py-1 text-center bg-blue-50">Station (m)</th>
                  <th className="border border-slate-300 px-2 py-1 text-red-800 bg-red-50">M3</th>
                  <th className="border border-slate-300 px-2 py-1 text-red-800 bg-red-50">M2</th>
                  <th className="border border-slate-300 px-2 py-1 text-blue-800 bg-blue-50">V2</th>
                  <th className="border border-slate-300 px-2 py-1 text-blue-800 bg-blue-50">V3</th>
                  <th className="border border-slate-300 px-2 py-1 text-green-800 bg-green-50">P</th>
                  <th className="border border-slate-300 px-2 py-1 text-amber-800 bg-amber-50">T</th>
                </tr>
              </thead>
              <tbody>
                {elements.map(el => {
                  const stations = currentCombo.element_forces[el.id] || [];
                  return stations.map((st, i) => (
                    <tr key={`${el.id}-${i}`} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold text-slate-600">{i === 0 ? el.id : ''}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center text-slate-500">{st.x.toFixed(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{st.M3.toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{st.M2.toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{st.V2.toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{st.V3.toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{st.P.toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{st.T.toExponential(3)}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'displacements' && currentCombo?.displacements && (
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 sticky top-0 shadow-sm">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-center bg-blue-50">Joint</th>
                  <th className="border border-slate-300 px-2 py-1 text-blue-800 bg-blue-50">U1 (X)</th>
                  <th className="border border-slate-300 px-2 py-1 text-blue-800 bg-blue-50">U2 (Y)</th>
                  <th className="border border-slate-300 px-2 py-1 text-blue-800 bg-blue-50">U3 (Z)</th>
                  <th className="border border-slate-300 px-2 py-1 text-amber-800 bg-amber-50">R1 (RX)</th>
                  <th className="border border-slate-300 px-2 py-1 text-amber-800 bg-amber-50">R2 (RY)</th>
                  <th className="border border-slate-300 px-2 py-1 text-amber-800 bg-amber-50">R3 (RZ)</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(node => {
                  const disp = currentCombo.displacements[node.id] || [0,0,0,0,0,0];
                  return (
                    <tr key={node.id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold text-slate-600">{node.id}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{disp[0].toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{disp[1].toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{disp[2].toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{disp[3].toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{disp[4].toExponential(3)}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono">{disp[5].toExponential(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-3 flex justify-end gap-2 rounded-b-md">
          <button onClick={onClose} className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium">Done</button>
        </div>
      </div>
    </div>
  );
}
