import React from 'react';
import { DIAMETROS_VALIDOS } from '../config/materiales';

const LABELS = {
  diametroPosX: 'Diámetro barras X (positivo)',
  diametroNegX: 'Diámetro barras X (negativo)',
  diametroPosY: 'Diámetro barras Y (positivo)',
  diametroNegY: 'Diámetro barras Y (negativo)',
};

export default function ConfiguracionMaciza({ config, onChange }) {
  return (
    <div>
      <h4 style={{ marginBottom: 12, color: '#2c3e50' }}>Configuración Losa Maciza</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {Object.entries(LABELS).map(([name, label]) => (
          <div key={name}>
            <label style={{ fontSize: 13, color: '#555', marginBottom: 4, display: 'block' }}>
              {label}
            </label>
            <select
              name={name}
              value={config?.[name] || '1/2'}
              onChange={onChange}
              style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
            >
              {DIAMETROS_VALIDOS.map((d) => (
                <option key={d} value={d}>{d}"</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
