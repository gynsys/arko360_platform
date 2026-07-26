import React from 'react';
import { DraggableModal } from '../DraggableModal';

export const FemModal = ({
  designParams,
  handleDesignParamChange,
  setActiveModal
}) => {
  return (
        <DraggableModal title="⚙️ Parámetros FEM" onClose={() => setActiveModal(null)} width="400px">
            <div className="params-grid">
              <div className="param-item"><label>f'c Concreto (kgf/cm²):</label><input type="number" step="10" value={designParams.fc} onChange={e => handleDesignParamChange('fc', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>fy Acero (kgf/cm²):</label><input type="number" step="100" value={designParams.fy} onChange={e => handleDesignParamChange('fy', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>Cap. Portante (kgf/cm²):</label><input type="number" step="0.1" value={designParams.q_adm} onChange={e => handleDesignParamChange('q_adm', parseFloat(e.target.value))} title="1.5 kgf/cm² = 15000 kgf/m²" /></div>
              <div className="param-item"><label>Recubrimiento (cm):</label><input type="number" step="0.5" value={designParams.cover} onChange={e => handleDesignParamChange('cover', parseFloat(e.target.value))} title="Distancia al centroide del acero" /></div>
              <div className="param-item"><label>Ancho Banda (m):</label><input type="number" step="0.05" value={designParams.band_width_m} onChange={e => handleDesignParamChange('band_width_m', parseFloat(e.target.value))} title="0 = Auto (Calculado min)" /></div>
              <div className="param-item" style={{ gridColumn: '1 / -1' }}>
                <label>Acero General (Malla):</label>
                <select value={designParams.custom_mesh_cm2_m || 0} onChange={e => handleDesignParamChange('custom_mesh_cm2_m', parseFloat(e.target.value))}>
                  <option value={0}>Automático (Mínimo ACI)</option>
                  <option value={0.61}>Malla 6x6 (Ø3.43@15) - 0.61 cm²/m</option>
                  <option value={1.41}>Varillas Ø6@20cm - 1.41 cm²/m</option>
                  <option value={1.88}>Malla Sima (Ø6@15) - 1.88 cm²/m</option>
                  <option value={1.92}>Varillas Ø7@20cm - 1.92 cm²/m</option>
                  <option value={2.51}>Varillas Ø8@20cm - 2.51 cm²/m</option>
                  <option value={3.93}>Varillas Ø10@20cm - 3.93 cm²/m</option>
                  <option value={5.24}>Varillas Ø10@15cm - 5.24 cm²/m</option>
                </select>
              </div>
            </div>
            
            <button className="primary-btn" onClick={() => setActiveModal(null)} style={{width: '100%', marginTop: '20px'}}>Aceptar</button>
        </DraggableModal>
  );
};
