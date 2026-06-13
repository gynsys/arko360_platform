import React, { useState, useMemo } from 'react';
import { X, Layers, AlertCircle, Maximize } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import { OpeningType } from './SlabOpeningGenerator';

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

const PANEL_STYLE = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '1rem',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  overflow: 'hidden',
};

const HEADER_STYLE = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid #1e293b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: '0.625rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#64748b',
  fontWeight: 700,
  marginBottom: '0.35rem',
};

const INPUT_STYLE = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.625rem',
  color: '#f1f5f9',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const SELECT_STYLE = {
  ...INPUT_STYLE,
  cursor: 'pointer',
};

const DEFAULT_FORM = {
  hostSlabId: '',
  offsetX: 0,
  offsetY: 0,
  type: OpeningType.LINEAR,
  
  // Parámetros dinámicos
  w: 2, // Ancho gral o width1 para L/U
  l: 3, // Largo gral o length1
  w2: 1, // width2 (rama secundaria)
  l2: 3, // length2
  lw: 1, // landingWidth para U
};

export function OpeningPanel({ isOpen, onClose }) {
  const { shells, addOpening } = useStructureStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAdd = () => {
    if (!form.hostSlabId) {
      setError('Selecciona la losa anfitriona.');
      return;
    }

    const oX = parseFloat(form.offsetX);
    const oY = parseFloat(form.offsetY);
    if (isNaN(oX) || isNaN(oY)) {
      setError('Las coordenadas de desfase (offset) deben ser números válidos.');
      return;
    }

    // Configurar parámetros geométricos dependiendo del tipo
    let geomParams = {};
    const w = parseFloat(form.w) || 0;
    const l = parseFloat(form.l) || 0;
    const w2 = parseFloat(form.w2) || 0;
    const l2 = parseFloat(form.l2) || 0;
    const lw = parseFloat(form.lw) || 0;

    if (form.type === OpeningType.LINEAR || form.type === OpeningType.DUCT || form.type === OpeningType.ELEVATOR) {
      geomParams = { width: w, length: l };
    } else if (form.type === OpeningType.L_SHAPE) {
      geomParams = { width1: w, width2: w2, length1: l, length2: l2 };
    } else if (form.type === OpeningType.U_SHAPE) {
      geomParams = { width1: w, width2: w2, length1: l, length2: l2, landingWidth: lw };
    }

    // El polígono lo calculamos en tiempo real dentro de StructureCanvas para evitar almacenar polígonos hardcodeados,
    // o lo precalculamos aquí y lo pasamos. Por la arquitectura actual, lo calcularemos en el render.
    // Solo necesitamos almacenar los parámetros.
    
    addOpening({
      hostSlabId: form.hostSlabId,
      offsetX: oX,
      offsetY: oY,
      type: form.type,
      params: geomParams
    });

    setForm(DEFAULT_FORM);
    setError('');
    onClose();
  };

  const handleCancel = () => {
    setForm(DEFAULT_FORM);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const slabOptions = shells.map(s => (
    <option key={s.id} value={s.id}>
      {`Losa ${s.id}`}
    </option>
  ));

  return (
    <div style={OVERLAY_STYLE} onClick={handleCancel}>
      <div style={PANEL_STYLE} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={HEADER_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#7f1d1d', borderRadius: '0.5rem', padding: '0.4rem' }}>
              <Maximize size={18} color="#fca5a5" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#f1f5f9' }}>
                Nueva Abertura
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                Perforación analítica por coordenadas locales
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>Losa Anfitriona</label>
              <select
                style={SELECT_STYLE}
                value={form.hostSlabId}
                onChange={e => setField('hostSlabId', e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {slabOptions}
              </select>
            </div>

            <div>
              <label style={LABEL_STYLE}>Offset X desde Nudo 1</label>
              <input
                type="number" step="0.01" style={INPUT_STYLE}
                value={form.offsetX} onChange={e => setField('offsetX', e.target.value)}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Offset Y desde Nudo 1</label>
              <input
                type="number" step="0.01" style={INPUT_STYLE}
                value={form.offsetY} onChange={e => setField('offsetY', e.target.value)}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '0.5rem 0' }} />

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL_STYLE}>Tipo de Geometría</label>
            <select
              style={SELECT_STYLE}
              value={form.type}
              onChange={e => setField('type', e.target.value)}
            >
              <option value={OpeningType.LINEAR}>Rectangular / Ducto</option>
              <option value={OpeningType.L_SHAPE}>Escalera "L"</option>
              <option value={OpeningType.U_SHAPE}>Escalera "U"</option>
            </select>
          </div>

          {/* Campos Dinámicos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {(form.type === OpeningType.LINEAR || form.type === OpeningType.DUCT || form.type === OpeningType.ELEVATOR) && (
              <>
                <div><label style={LABEL_STYLE}>Ancho en X (m)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.w} onChange={e => setField('w', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Largo en Y (m)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.l} onChange={e => setField('l', e.target.value)} /></div>
              </>
            )}

            {form.type === OpeningType.L_SHAPE && (
              <>
                <div><label style={LABEL_STYLE}>Ancho Rama Vertical (X)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.w} onChange={e => setField('w', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Ancho Rama Horiz. (Y)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.w2} onChange={e => setField('w2', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Largo Total (X)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.l} onChange={e => setField('l', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Largo Total (Y)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.l2} onChange={e => setField('l2', e.target.value)} /></div>
              </>
            )}

            {form.type === OpeningType.U_SHAPE && (
              <>
                <div><label style={LABEL_STYLE}>Ancho Rama Izquierda</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.w} onChange={e => setField('w', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Ancho Rama Derecha</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.w2} onChange={e => setField('w2', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Largo Descanso (Y)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.lw} onChange={e => setField('lw', e.target.value)} /></div>
                <div><label style={LABEL_STYLE}>Ancho Total (X)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.l} onChange={e => setField('l', e.target.value)} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={LABEL_STYLE}>Largo Total (Y)</label><input type="number" step="0.01" style={INPUT_STYLE} value={form.l2} onChange={e => setField('l2', e.target.value)} /></div>
              </>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={14} />{error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <button onClick={handleCancel} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', borderRadius: '0.625rem', color: '#94a3b8', fontWeight: 700 }}>Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 2, background: '#b91c1c', border: 'none', borderRadius: '0.625rem', padding: '0.625rem', color: '#fff', fontWeight: 700 }}>AGREGAR ABERTURA</button>
          </div>
        </div>
      </div>
    </div>
  );
}
