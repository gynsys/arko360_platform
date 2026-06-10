import React, { useState, useMemo } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { useStructureStore } from './useStructureStore';

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
  n1: '',
  n2: '',
  n3: '',
  n4: '',
  thickness: 0.20,
  material_id: '',
  CM: 2.0,
  CV: 1.5,
};

/**
 * Calcula el área de un cuadrilátero dado por 4 nodos usando la fórmula Shoelace
 * proyectada en el plano XY.
 * @param {object} na - Nodo 1 con coordenadas {x, y}
 * @param {object} nb - Nodo 2
 * @param {object} nc - Nodo 3
 * @param {object} nd - Nodo 4
 * @returns {number} Área en m²
 */
function computeQuadArea(na, nb, nc, nd) {
  return 0.5 * Math.abs(
    na.x * (nb.y - nd.y) +
    nb.x * (nc.y - na.y) +
    nc.x * (nd.y - nb.y) +
    nd.x * (na.y - nc.y)
  );
}

/**
 * ShellPanel — Modal/formulario para definir una losa maciza (shell quad).
 *
 * @param {boolean} isOpen - Controla la visibilidad del panel
 * @param {() => void} onClose - Función para cerrar el panel
 */
export function ShellPanel({ isOpen, onClose }) {
  const { nodes, materials, addShell } = useStructureStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Nodos resueltos para el cálculo del área en tiempo real
  const resolvedNodes = useMemo(() => {
    const findNode = (idStr) => nodes.find(n => String(n.id) === String(idStr));
    return {
      n1: findNode(form.n1),
      n2: findNode(form.n2),
      n3: findNode(form.n3),
      n4: findNode(form.n4),
    };
  }, [form.n1, form.n2, form.n3, form.n4, nodes]);

  const allFourSelected = resolvedNodes.n1 && resolvedNodes.n2 && resolvedNodes.n3 && resolvedNodes.n4;

  const estimatedArea = useMemo(() => {
    if (!allFourSelected) return null;
    return computeQuadArea(resolvedNodes.n1, resolvedNodes.n2, resolvedNodes.n3, resolvedNodes.n4);
  }, [allFourSelected, resolvedNodes]);

  const factoredLoad = useMemo(() => {
    if (estimatedArea === null) return null;
    return (1.2 * Number(form.CM) + 1.6 * Number(form.CV)) * estimatedArea;
  }, [estimatedArea, form.CM, form.CV]);

  const handleAdd = () => {
    // Validaciones tempranas (fail-fast)
    if (!form.n1 || !form.n2 || !form.n3 || !form.n4) {
      setError('Selecciona los 4 nudos de la losa.');
      return;
    }
    const nodeIds = [form.n1, form.n2, form.n3, form.n4];
    if (new Set(nodeIds).size !== 4) {
      setError('Los 4 nudos deben ser distintos.');
      return;
    }
    if (!form.material_id) {
      setError('Selecciona un material.');
      return;
    }
    const thickness = parseFloat(form.thickness);
    if (isNaN(thickness) || thickness <= 0) {
      setError('El espesor debe ser mayor que 0.');
      return;
    }

    addShell({
      nodes: nodeIds.map(id => {
        const n = nodes.find(n => String(n.id) === String(id));
        return n ? n.id : id;
      }),
      thickness,
      material_id: form.material_id,
      loads: { CM: parseFloat(form.CM) || 0, CV: parseFloat(form.CV) || 0 },
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

  const nodeOptions = nodes.map(n => (
    <option key={n.id} value={n.id}>
      {`Nudo ${n.id}  (${n.x.toFixed(2)}, ${n.y.toFixed(2)}, ${n.z.toFixed(2)})`}
    </option>
  ));

  const materialOptions = materials.map(m => (
    <option key={m.id} value={m.id}>{m.id}</option>
  ));

  return (
    <div style={OVERLAY_STYLE} onClick={handleCancel}>
      <div style={PANEL_STYLE} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={HEADER_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#312e81', borderRadius: '0.5rem', padding: '0.4rem' }}>
              <Layers size={18} color="#818cf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#f1f5f9' }}>
                Nueva Losa (Shell)
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                Definir losa maciza cuadrilateral
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b' }}
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Nota orientación */}
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '0.5rem',
            padding: '0.6rem 0.85rem',
            fontSize: '0.75rem',
            color: '#a5b4fc',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            <AlertCircle size={14} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
            Definir nudos en <strong style={{ marginLeft: '0.25rem' }}>sentido horario</strong> visto desde arriba (igual que ETABS).
          </div>

          {/* Selectores de nudos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[['n1', 'Nudo 1 (N1)'], ['n2', 'Nudo 2 (N2)'], ['n3', 'Nudo 3 (N3)'], ['n4', 'Nudo 4 (N4)']].map(([field, label]) => (
              <div key={field}>
                <label style={LABEL_STYLE}>{label}</label>
                <select
                  style={SELECT_STYLE}
                  value={form[field]}
                  onChange={e => setField(field, e.target.value)}
                >
                  <option value="">— Seleccionar —</option>
                  {nodeOptions}
                </select>
              </div>
            ))}
          </div>

          {/* Espesor y Material */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={LABEL_STYLE}>Espesor (m)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                style={INPUT_STYLE}
                value={form.thickness}
                onChange={e => setField('thickness', e.target.value)}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Material</label>
              <select
                style={SELECT_STYLE}
                value={form.material_id}
                onChange={e => setField('material_id', e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {materialOptions}
              </select>
            </div>
          </div>

          {/* Cargas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={LABEL_STYLE}>Carga Muerta CM (kN/m²)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                style={INPUT_STYLE}
                value={form.CM}
                onChange={e => setField('CM', e.target.value)}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Carga Viva CV (kN/m²)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                style={INPUT_STYLE}
                value={form.CV}
                onChange={e => setField('CV', e.target.value)}
              />
            </div>
          </div>

          {/* Cálculo en tiempo real */}
          {allFourSelected && estimatedArea !== null && (
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
            }}>
              <div>
                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em' }}>
                  Área estimada
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '1rem', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
                  {estimatedArea.toFixed(2)} m²
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em' }}>
                  Carga total factorizada
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '1rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                  {factoredLoad !== null ? factoredLoad.toFixed(1) : '—'} kN
                </p>
                <span style={{ fontSize: '0.6rem', color: '#475569' }}>1.2×CM + 1.6×CV</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid #334155',
                borderRadius: '0.625rem',
                padding: '0.625rem',
                color: '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              style={{
                flex: 2,
                background: '#4f46e5',
                border: 'none',
                borderRadius: '0.625rem',
                padding: '0.625rem',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4338ca'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4f46e5'; }}
            >
              <Layers size={14} />
              AGREGAR LOSA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
