import React, { useState, useEffect } from 'react';
import { verifyRebarSpacing, verifyBeamRebar } from '../utils/rebarVerifier.js';

export function InteractiveRebarSelect({ options, defaultVal, asReq, onChange }) {
  const [val, setVal] = useState(defaultVal);
  useEffect(() => {
    setVal(defaultVal);
  }, [defaultVal]);

  const handleChange = (newVal) => {
    setVal(newVal);
    if (onChange) onChange(newVal);
  };

  const { ok, asProv } = verifyRebarSpacing(val, asReq);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <select
        value={val}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          background: ok ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${ok ? '#16a34a' : '#dc2626'}`,
          borderRadius: '6px',
          color: ok ? '#15803d' : '#b91c1c',
          fontWeight: 'bold',
          padding: '4px 6px',
          fontSize: '12.5px',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        {options && options.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
      <span style={{
        fontSize: '10.5px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px',
        background: ok ? '#dcfce7' : '#fee2e2',
        color: ok ? '#166534' : '#991b1b',
        border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`
      }}>
        {ok ? `✓ Cumple (${asProv.toFixed(2)} cm²/m)` : `⚠️ Insuficiente (${asProv.toFixed(2)} < ${asReq.toFixed(2)})`}
      </span>
    </div>
  );
}

export function InteractiveBeamRebarSelect({ options, defaultVal, asReq, onChange }) {
  const [val, setVal] = useState(defaultVal);
  useEffect(() => {
    setVal(defaultVal);
  }, [defaultVal]);

  const handleChange = (newVal) => {
    setVal(newVal);
    if (onChange) onChange(newVal);
  };

  const { ok, asProv } = verifyBeamRebar(val, asReq);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <select
        value={val}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          background: ok ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${ok ? '#16a34a' : '#dc2626'}`,
          borderRadius: '6px',
          color: ok ? '#15803d' : '#b91c1c',
          fontWeight: 'bold',
          padding: '4px 6px',
          fontSize: '12.5px',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        {options && options.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
      <span style={{
        fontSize: '10.5px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px',
        background: ok ? '#dcfce7' : '#fee2e2',
        color: ok ? '#166534' : '#991b1b',
        border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`
      }}>
        {ok ? `✓ Cumple (${asProv.toFixed(2)} cm²)` : `⚠️ Insuficiente (${asProv.toFixed(2)} < ${asReq.toFixed(2)})`}
      </span>
    </div>
  );
}
