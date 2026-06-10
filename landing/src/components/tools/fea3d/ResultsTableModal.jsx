import React, { useState } from 'react';
import { X, Table as TableIcon, Download } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function ResultsTableModal({ onClose }) {
  const { results, loadCombinations, nodes, elements } = useStructureStore();
  const [activeTab, setActiveTab] = useState('forces'); // 'displacements', 'forces'

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

  // Combinaciones con resultados
  const availableCombos = loadCombinations.filter(c => results.results[c.id]);

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    const title = activeTab === 'forces' ? 'ARKO3D - Element Forces (Frames)' : 'ARKO3D - Joint Displacements';
    
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

    if (activeTab === 'forces') {
      const rows = [];
      elements.forEach(el => {
        availableCombos.forEach(combo => {
          const comboData = results.results[combo.id];
          const stations = comboData?.element_forces[el.id] || [];
          stations.forEach((st, i) => {
            rows.push([
              'Base',
              i === 0 ? el.id.toString() : '',
              i === 0 ? combo.name : '',
              'Max',
              st.x.toFixed(3),
              st.P.toExponential(3),
              st.V2.toExponential(3),
              st.V3.toExponential(3),
              st.T.toExponential(3),
              st.M2.toExponential(3),
              st.M3.toExponential(3)
            ]);
          });
        });
      });

      doc.autoTable({
        startY: 28,
        head: [['Story', 'Element', 'Output Case', 'Step Type', 'Station (m)', 'P', 'V2', 'V3', 'T', 'M2', 'M3']],
        body: rows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 1, halign: 'right' },
        headStyles: { fillColor: [37, 99, 235], halign: 'center' }, // blue-600
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' }
        }
      });
    } else {
      const rows = [];
      nodes.forEach(node => {
        availableCombos.forEach((combo, i) => {
          const comboData = results.results[combo.id];
          const disp = comboData?.displacements[node.id] || [0,0,0,0,0,0];
          rows.push([
            'Base',
            i === 0 ? node.id.toString() : '',
            combo.name,
            disp[0].toExponential(3),
            disp[1].toExponential(3),
            disp[2].toExponential(3),
            disp[3].toExponential(3),
            disp[4].toExponential(3),
            disp[5].toExponential(3)
          ]);
        });
      });

      doc.autoTable({
        startY: 28,
        head: [['Story', 'Joint', 'Output Case', 'U1', 'U2', 'U3', 'R1', 'R2', 'R3']],
        body: rows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 1, halign: 'right' },
        headStyles: { fillColor: [37, 99, 235], halign: 'center' },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center' }
        }
      });
    }

    doc.save(`arko3d_results_${activeTab}.pdf`);
  };

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
              Element Forces - Frames
            </button>
            <button 
              onClick={() => setActiveTab('displacements')}
              className={`px-4 py-1.5 rounded-t-md font-bold text-sm border-b-2 transition-colors ${activeTab === 'displacements' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Joint Displacements
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white p-0">
          {activeTab === 'forces' && (
            <table className="w-full text-xs text-right border-collapse whitespace-nowrap">
              <thead className="bg-slate-200 sticky top-0 shadow-sm text-slate-700">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Story</th>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Element</th>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Output Case</th>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Step Type</th>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Station (m)</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">P</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">V2</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">V3</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">T</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">M2</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">M3</th>
                </tr>
              </thead>
              <tbody>
                {elements.map(el => {
                  return availableCombos.map(combo => {
                    const comboData = results.results[combo.id];
                    const stations = comboData?.element_forces[el.id] || [];
                    return stations.map((st, i) => (
                      <tr key={`${el.id}-${combo.id}-${i}`} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="border-r border-slate-200 px-2 py-1 text-center text-slate-500">Base</td>
                        <td className="border-r border-slate-200 px-2 py-1 text-center font-bold text-slate-700">{i === 0 ? el.id : ''}</td>
                        <td className="border-r border-slate-200 px-2 py-1 text-center text-slate-600">{i === 0 ? combo.name : ''}</td>
                        <td className="border-r border-slate-200 px-2 py-1 text-center text-slate-400">Max</td>
                        <td className="border-r border-slate-200 px-2 py-1 text-center text-slate-600">{st.x.toFixed(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{st.P.toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{st.V2.toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{st.V3.toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{st.T.toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{st.M2.toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{st.M3.toExponential(3)}</td>
                      </tr>
                    ));
                  });
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'displacements' && (
            <table className="w-full text-xs text-right border-collapse whitespace-nowrap">
              <thead className="bg-slate-200 sticky top-0 shadow-sm text-slate-700">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Story</th>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Joint</th>
                  <th className="border border-slate-300 px-2 py-1 text-center font-bold">Output Case</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">U1</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">U2</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">U3</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">R1</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">R2</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold">R3</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(node => {
                  return availableCombos.map((combo, i) => {
                    const comboData = results.results[combo.id];
                    const disp = comboData?.displacements[node.id] || [0,0,0,0,0,0];
                    return (
                      <tr key={`${node.id}-${combo.id}`} className="hover:bg-slate-50 border-b border-slate-100">
                        <td className="border-r border-slate-200 px-2 py-1 text-center text-slate-500">Base</td>
                        <td className="border-r border-slate-200 px-2 py-1 text-center font-bold text-slate-700">{i === 0 ? node.id : ''}</td>
                        <td className="border-r border-slate-200 px-2 py-1 text-center text-slate-600">{combo.name}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{disp[0].toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{disp[1].toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{disp[2].toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{disp[3].toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{disp[4].toExponential(3)}</td>
                        <td className="border-r border-slate-200 px-2 py-1 font-mono">{disp[5].toExponential(3)}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-3 flex justify-end gap-3 rounded-b-md">
          <button 
            onClick={exportPDF} 
            className="flex items-center gap-2 border border-slate-400 text-slate-700 px-4 py-1.5 rounded hover:bg-slate-300 font-bold transition-colors"
          >
            <Download size={16} /> PDF
          </button>
          <button 
            onClick={onClose} 
            className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
