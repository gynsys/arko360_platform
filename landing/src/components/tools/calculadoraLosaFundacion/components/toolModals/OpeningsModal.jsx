import React from 'react';
import { DraggableModal } from '../DraggableModal';
import { AppWindow, DoorOpen } from 'lucide-react';

export const OpeningsModal = ({
  openings,
  hoveredOpeningId,
  setHoveredOpeningId,
  removeOpening,
  setActiveModal
}) => {
  return (
        <DraggableModal title="🚪 Aberturas / Puertas / Ventanas" onClose={() => setActiveModal(null)} width="600px">
            <div style={{marginBottom:'15px', color:'#555', fontSize:'14px'}}>
            {openings.length === 0 ? (
               <p style={{color:'#666', fontSize:'13px', textAlign:'center', padding:'20px'}}>No hay aberturas. Arrastra una desde la barra superior hacia los muros.</p>
            ) : (
               <div className="table-container" style={{maxHeight:'300px', overflowY:'auto'}}>
                 <table className="coords-table">
                   <thead><tr><th>Tipo</th><th>Inicio</th><th>L</th><th>H</th><th></th></tr></thead>
                   <tbody>
                     {openings.map(op => {
                       let Icon = AppWindow; let label = 'Ventana';
                       if (op.type.startsWith('door_left')) { Icon = DoorOpen; label = 'Puerta (Izq)'; }
                       if (op.type.startsWith('door_right')) { Icon = DoorOpen; label = 'Puerta (Der)'; }
                       return (
                       <tr key={op.id} className={hoveredOpeningId === op.id ? 'highlighted-row' : ''} onMouseEnter={() => setHoveredOpeningId(op.id)} onMouseLeave={() => setHoveredOpeningId(null)}>
                         <td style={{display:'flex', alignItems:'center', gap:'6px'}}><Icon size={16} color="#666"/> {label}</td>
                         <td>{op.start_m.toFixed(2)}</td>
                         <td>{op.width_m.toFixed(2)}</td>
                         <td>{op.height_m.toFixed(2)}</td>
                         <td><button className="del-btn" onClick={() => removeOpening(op.id)}>X</button></td>
                       </tr>
                     )})}
                   </tbody>
                 </table>
               </div>
            )}
            
            <button className="primary-btn" onClick={() => setActiveModal(null)} style={{width: '100%'}}>Aceptar</button>
            </div>
        </DraggableModal>
  );
};
