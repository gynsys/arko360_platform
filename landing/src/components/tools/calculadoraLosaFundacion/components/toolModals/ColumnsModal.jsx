import React from 'react';
import { DraggableModal } from '../DraggableModal';

export const ColumnsModal = ({
  colConfig,
  setColConfig,
  columns,
  setColumns,
  params,
  setActiveModal
}) => {
  return (
        <DraggableModal title="🏛️ Columnas" onClose={() => setActiveModal(null)} width="400px">
            <div>
                <p style={{fontSize:'12px', color:'#666', marginTop:0}}>Puedes agregarlas con Alt+Clic en el lienzo.</p>
                <div className="params-grid" style={{marginBottom:'10px', background:'#f5f5f5', padding:'10px', borderRadius:'6px'}}>
                  <div className="param-item"><label>b (m):</label><input type="number" step="0.05" value={colConfig.width} onChange={e => setColConfig({...colConfig, width: parseFloat(e.target.value) || 0})} /></div>
                  <div className="param-item"><label>t (m):</label><input type="number" step="0.05" value={colConfig.length} onChange={e => setColConfig({...colConfig, length: parseFloat(e.target.value) || 0})} /></div>
                  <div className="param-item"><label>Alto (Z) m:</label><input type="number" step="0.1" value={colConfig.height} onChange={e => setColConfig({...colConfig, height: parseFloat(e.target.value) || 0})} /></div>
                </div>
                
                <div className="table-container" style={{maxHeight:'200px', overflowY:'auto'}}>
                  <table className="coords-table">
                    <thead><tr><th>X</th><th>Y</th><th>Carga</th><th></th></tr></thead>
                    <tbody>
                      {columns.map(c => (
                        <tr key={c.id}>
                          <td>{c.x.toFixed(2)}</td><td>{c.y.toFixed(2)}</td><td>{c.load_kgf}</td>
                          <td><button className="del-btn" onClick={() => setColumns(columns.filter(col => col.id !== c.id))}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="add-btn" onClick={() => {
                  const loadCalc = colConfig.width * colConfig.length * colConfig.height * 2500;
                  setColumns([...columns, { 
                    id: Date.now(), 
                    x: params.Lx/2, 
                    y: params.Ly/2, 
                    width: colConfig.width,
                    length: colConfig.length,
                    height: colConfig.height,
                    load_kgf: loadCalc 
                  }]);
                }}>+ Añadir Columna</button>
            </div>
            <button className="primary-btn" style={{marginTop:'20px', width:'100%'}} onClick={() => setActiveModal(null)}>Cerrar Panel</button>
        </DraggableModal>
  );
};
