import React from 'react';
import { DraggableModal } from '../DraggableModal';

export const WallsModal = ({
  internalWalls,
  hoveredWallId,
  setHoveredWallId,
  updateInternalWall,
  removeInternalWall,
  addInternalWall,
  setActiveModal
}) => {
  return (
        <DraggableModal title="🧱 Paredes" onClose={() => setActiveModal(null)} width="480px">
            <div>
                <p style={{fontSize:'12px', color:'#666', marginTop:0}}>Puedes agregarlas haciendo Shift+Clic en el lienzo o usando esta tabla.</p>
                <div className="table-container" style={{maxHeight:'300px', overflowY:'auto', overflowX:'auto'}}>
                  <table className="coords-table" style={{minWidth: '400px'}}>
                    <thead><tr><th>Tipo</th><th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th></tr></thead>
                    <tbody>
                      {internalWalls.map((w, i) => (
                        <React.Fragment key={w.id}>
                        <tr className={hoveredWallId === w.id ? 'highlighted-row' : ''} onMouseEnter={() => setHoveredWallId(w.id)} onMouseLeave={() => setHoveredWallId(null)}>
                          <td>
                            <select value={w.type || 'interno'} onChange={e => updateInternalWall(w.id, 'type', e.target.value)} style={{fontSize: '11px', padding: '2px 4px', width: '85px', height: '24px'}}>
                              <option value="interno">Interna</option>
                              <option value="perimetral">Perimetral</option>
                              <option value="retaining_wall">M. Contención</option>
                              <option value="support_beam">Viga Apoyo</option>
                            </select>
                          </td>
                          <td><input type="number" step="0.5" value={w.x1} onChange={e => updateInternalWall(w.id, 'x1', e.target.value)}/></td>
                          <td><input type="number" step="0.5" value={w.y1} onChange={e => updateInternalWall(w.id, 'y1', e.target.value)}/></td>
                          <td><input type="number" step="0.5" value={w.x2} onChange={e => updateInternalWall(w.id, 'x2', e.target.value)}/></td>
                          <td><input type="number" step="0.5" value={w.y2} onChange={e => updateInternalWall(w.id, 'y2', e.target.value)}/></td>
                          <td><button className="del-btn" onClick={() => removeInternalWall(w.id)}>X</button></td>
                        </tr>
                        {w.type === 'retaining_wall' && (
                          <>
                          <tr style={{background:'#f9f9f9'}}><td colSpan="6" style={{padding:'4px 8px', fontSize:'11px', textAlign:'left'}}>
                            <span style={{marginRight:'8px'}}>Espesor (m): <input type="number" step="0.05" value={w.thickness || 0.3} onChange={e => updateInternalWall(w.id, 'thickness', parseFloat(e.target.value))} style={{width:'50px'}} /></span>
                            <span style={{marginRight:'8px'}}>H Tierra (m): <input type="number" step="0.1" value={w.soil_height || 1.4} onChange={e => updateInternalWall(w.id, 'soil_height', parseFloat(e.target.value))} style={{width:'50px'}} /></span>
                            <span style={{marginRight:'8px'}}>H Muro (m): <input type="number" step="0.1" value={w.perimeter_wall_height || 2.5} onChange={e => updateInternalWall(w.id, 'perimeter_wall_height', parseFloat(e.target.value))} style={{width:'50px'}} /></span>
                          </td></tr>
                          <tr style={{background:'#f9f9f9', borderBottom:'1px solid #ddd'}}><td colSpan="6" style={{padding:'0px 8px 4px 8px', fontSize:'11px', textAlign:'left'}}>
                            <span style={{marginRight:'8px'}}>Fricción ϕ (°): <input type="number" step="1" value={w.phi || 30} onChange={e => updateInternalWall(w.id, 'phi', parseFloat(e.target.value))} style={{width:'50px'}} /></span>
                            <span style={{marginRight:'8px'}}>γ Suelo (N/m³): <input type="number" step="100" value={w.soil_density || 18000} onChange={e => updateInternalWall(w.id, 'soil_density', parseFloat(e.target.value))} style={{width:'70px'}} /></span>
                          </td></tr>
                          </>
                        )}
                        {w.type === 'support_beam' && (
                          <tr style={{background:'#f9f9f9'}}><td colSpan="6" style={{padding:'4px 8px', fontSize:'11px', textAlign:'left'}}>
                            <span style={{marginRight:'8px'}}>Ancho (m): <input type="number" step="0.05" value={w.thickness || 0.3} onChange={e => updateInternalWall(w.id, 'thickness', parseFloat(e.target.value))} style={{width:'50px'}} /></span>
                            <span style={{marginRight:'8px'}}>Profundidad (m): <input type="number" step="0.1" value={w.depth || 0.5} onChange={e => updateInternalWall(w.id, 'depth', parseFloat(e.target.value))} style={{width:'50px'}} /></span>
                          </td></tr>
                        )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="add-btn" onClick={() => addInternalWall({})}>+ Añadir Pared</button>
            </div>
            <button className="primary-btn" style={{marginTop:'20px', width:'100%'}} onClick={() => setActiveModal(null)}>Cerrar Panel</button>
        </DraggableModal>
  );
};
