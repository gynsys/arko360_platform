import React from 'react';
import { DraggableModal } from '../DraggableModal';

export const MaterialsModal = ({
  wallHeight,
  setWallHeight,
  material,
  setMaterial,
  MATERIALS,
  designParams,
  handleDesignParamChange,
  setActiveModal
}) => {
  return (
        <DraggableModal title="🧱 Materiales de Construcción" onClose={() => setActiveModal(null)} width="400px">
            <div className="params-grid">
              <div className="param-item"><label>Alto Muros (m):</label><input type="number" step="0.1" value={wallHeight} onChange={e => setWallHeight(e.target.value)} /></div>
            </div>
            
            <div className="param-item" style={{ marginTop: '10px' }}>
              <label>Material Constructivo:</label>
              <select value={material} onChange={e => setMaterial(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                {Object.entries(MATERIALS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="param-item checkbox" style={{ marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row', cursor: 'pointer' }}>
                <input type="checkbox" checked={designParams.is_plastered} onChange={e => handleDesignParamChange('is_plastered', e.target.checked)} style={{ margin: 0 }} />
                <span>Paredes Frisadas (+ Carga Muerta)</span>
              </label>
            </div>
            
            <button className="primary-btn" style={{marginTop:'20px', width:'100%'}} onClick={() => setActiveModal(null)}>Aceptar</button>
        </DraggableModal>
  );
};
