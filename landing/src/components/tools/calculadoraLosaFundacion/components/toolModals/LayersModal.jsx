import React from 'react';
import { DraggableModal } from '../DraggableModal';

export const LayersModal = ({
  layers,
  activeLayer,
  LAYER_DEFS,
  setActiveLayer,
  setLayers,
  setLayerImportTarget,
  imgInputRef,
  setActiveModal
}) => {
  return (
        <DraggableModal title="≡ Capas" onClose={() => setActiveModal(null)} width="320px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {layers.map(layer => {
              const isActive = activeLayer === layer.id;
              const layerDef = LAYER_DEFS.find(d => d.id === layer.id);
              return (
                <div key={layer.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '8px',
                  background: isActive ? 'rgba(26,107,181,0.1)' : '#f7f7f7',
                  border: isActive ? '1.5px solid #1A6BB5' : '1.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }} onClick={() => { if (!layer.locked) setActiveLayer(layer.id); }}>
                  {/* Dot color */}
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: layerDef?.color || '#999', flexShrink: 0 }} />
                  {/* Nombre */}
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? 700 : 400, color: '#222' }}>
                    {layer.name}
                    {isActive && <span style={{ marginLeft: 6, fontSize: '10px', color: '#1A6BB5', fontWeight: 700 }}>✏ ACTIVA</span>}
                  </span>
                  {/* Visibilidad */}
                  <button title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                    onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: layer.visible ? '#1A6BB5' : '#bbb', padding: '2px' }}>
                    {layer.visible ? '👁' : '🙈'}
                  </button>
                  {/* Bloquear */}
                  <button title={layer.locked ? 'Desbloquear' : 'Bloquear'}
                    onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); if (layer.locked && activeLayer === layer.id) setActiveLayer('est'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: layer.locked ? '#f57c00' : '#bbb', padding: '2px' }}>
                    {layer.locked ? '🔒' : '🔓'}
                  </button>
                  {/* Imagen de fondo */}
                  <button title="Importar imagen de fondo"
                    onClick={e => { e.stopPropagation(); setLayerImportTarget(layer.id); setTimeout(() => imgInputRef.current?.click(), 50); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: layer.image ? '#43a047' : '#bbb', padding: '2px' }}>
                    🖼
                  </button>
                  {/* Quitar imagen */}
                  {layer.image && (
                    <button title="Quitar imagen"
                      onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, image: null } : l)); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#e53935', padding: '2px' }}>✕</button>
                  )}
                </div>
              );
            })}
            {/* Opacidad de la capa seleccionada */}
            {(() => { const al = layers.find(l => l.id === activeLayer); return al ? (
              <div style={{ marginTop: '10px', padding: '10px', background: '#f0f4ff', borderRadius: '8px' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px' }}>
                  Opacidad — <strong>{al.name}</strong>: {Math.round(al.opacity * 100)}%
                </label>
                <input type="range" min="0" max="1" step="0.05" value={al.opacity}
                  onChange={e => setLayers(prev => prev.map(l => l.id === activeLayer ? { ...l, opacity: parseFloat(e.target.value) } : l))}
                  style={{ width: '100%' }} />
              </div>
            ) : null; })()}
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#999', textAlign: 'center' }}>
              Haz clic en una capa para activarla. Los muros nuevos se crean en la capa activa.
            </div>
            <button className="primary-btn" style={{ marginTop: '8px', width: '100%' }} onClick={() => setActiveModal(null)}>Cerrar</button>
          </div>
        </DraggableModal>
  );
};
