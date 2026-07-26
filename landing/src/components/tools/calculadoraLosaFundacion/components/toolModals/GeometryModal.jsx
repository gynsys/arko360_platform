import React from 'react';
import { DraggableModal } from '../DraggableModal';

export const GeometryModal = ({
  shape,
  SHAPES,
  handleShapeChange,
  convertToManual,
  params,
  handleParamChange,
  offset,
  setOffset,
  slabOffset,
  setSlabOffset,
  gridStep,
  setGridStep,
  setActiveModal
}) => {
  return (
        <DraggableModal title="📐 Geometría Global" onClose={() => setActiveModal(null)} width="400px">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="shape-selector" style={{marginBottom: '12px'}}>
              {SHAPES.map(s => (
                <button 
                  key={s.id} 
                  className={`shape-btn ${shape === s.id ? 'active' : ''}`}
                  onClick={() => handleShapeChange(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            
            {shape !== 'libre' && (
              <button 
                className="btn-secondary" 
                onClick={convertToManual} 
                style={{width: '100%', background: '#fff3e0', color: '#e65100', borderColor: '#ffcc80', fontWeight: 'bold'}}
              >
                🔗 Desvincular Perímetro (Editar aberturas)
              </button>
            )}

            <div className="params-grid" style={{marginTop: '16px'}}>
              <div className="param-item"><label>Parcela Lx (m):</label><input type="number" step="0.5" value={params.Lx} onChange={e => handleParamChange('Lx', e.target.value)} /></div>
              <div className="param-item"><label>Parcela Ly (m):</label><input type="number" step="0.5" value={params.Ly} onChange={e => handleParamChange('Ly', e.target.value)} /></div>
              
              {(shape === 'L' || shape === 'U') && <div className="param-item"><label>Ancho Ala Izq (m):</label><input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} /></div>}
              {shape === 'L' && <div className="param-item"><label>Ancho Ala Inf (m):</label><input type="number" step="0.1" value={params.wingY} onChange={e => handleParamChange('wingY', e.target.value)} /></div>}
              {shape === 'U' && (
                <>
                  <div className="param-item"><label>Ancho Ala Der (m):</label><input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} /></div>
                  <div className="param-item"><label>Fondo Base (m):</label><input type="number" step="0.1" value={params.baseY} onChange={e => handleParamChange('baseY', e.target.value)} /></div>
                </>
              )}
              {shape === 'T' && (
                <>
                  <div className="param-item"><label>Ancho Tallo Izq (m):</label><input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} /></div>
                  <div className="param-item"><label>Ancho Tallo Der (m):</label><input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} /></div>
                  <div className="param-item"><label>Alto Barra Sup (m):</label><input type="number" step="0.1" value={params.barY} onChange={e => handleParamChange('barY', e.target.value)} /></div>
                </>
              )}
              
              <div className="param-item"><label>Retiro Perimetral (m):</label><input type="number" step="0.05" min="0" value={offset} onChange={e => setOffset(e.target.value)} /></div>
              <div className="param-item"><label>Separación Pared Perimetral (m):</label><input type="number" step="0.05" min="0" value={slabOffset} onChange={e => setSlabOffset(e.target.value)} /></div>
              <div className="param-item"><label>Espesor Losa (cm):</label><input type="number" value={params.h} onChange={e => handleParamChange('h', e.target.value)} /></div>
              <div className="param-item">
                <label>Paso Cuadrícula (Snap m):</label>
                <select value={gridStep} onChange={e => setGridStep(parseFloat(e.target.value))}>
                  <option value={0.5}>0.50m</option>
                  <option value={0.25}>0.25m</option>
                  <option value={0.1}>0.10m</option>
                  <option value={0.05}>0.05m</option>
                  <option value={0}>Libre (Sin Imán)</option>
                </select>
              </div>
            </div>
            <button className="primary-btn" style={{marginTop:'20px', width:'100%', background: '#1A6BB5', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => setActiveModal(null)}>Aceptar</button>
          </div>
        </DraggableModal>
  );
};
