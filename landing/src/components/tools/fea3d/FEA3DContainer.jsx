import React, { useState } from 'react';
import { Settings, Play, Building2 } from 'lucide-react';
import { StructureCanvas } from './StructureCanvas';
import { PropertyPanel } from './PropertyPanel';
import { TemplateWizard } from './TemplateWizard';
import { useStructureStore } from './useStructureStore';

export default function FEA3DContainer() {
  const [wizardOpen, setWizardOpen] = useState(true);
  const { wizardConfig, elements } = useStructureStore();

  const hasModel = wizardConfig !== null;
  const hasElements = elements.length > 0;

  const modelSummary = wizardConfig
    ? `${wizardConfig.numFloors} Piso${wizardConfig.numFloors !== 1 ? 's' : ''} · ${wizardConfig.numBaysX}×${wizardConfig.numBaysY} Vanos`
    : null;

  const handleRunAnalysis = () => {
    console.log('[ARKO3D] Iniciando proceso de análisis...');
    // Próximo paso: Integrar con useSolver.js
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] mt-[80px] overflow-hidden bg-slate-900">

      {/* ── Toolbar Superior ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 16px',
          height: '48px',
          minHeight: '48px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: '#334155',
            border: '1px solid #475569',
            borderRadius: '8px',
            color: '#cbd5e1',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#475569'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.color = '#cbd5e1'; }}
        >
          <Settings size={14} />
          {hasModel ? 'Editar Modelo' : 'Nuevo Modelo'}
        </button>

        {modelSummary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>
            <Building2 size={13} />
            <span>{modelSummary}</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {hasElements && (
          <span style={{ color: '#475569', fontSize: '11px', marginRight: '8px' }}>
            {elements.length} elementos detectados
          </span>
        )}

        <button
          onClick={handleRunAnalysis}
          disabled={!hasElements}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            backgroundColor: hasElements ? '#2563eb' : '#1e3a5f',
            border: 'none',
            borderRadius: '8px',
            color: hasElements ? '#ffffff' : '#475569',
            fontSize: '13px',
            fontWeight: 700,
            cursor: hasElements ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            opacity: hasElements ? 1 : 0.6,
          }}
          onMouseEnter={e => { if (hasElements) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
          onMouseLeave={e => { if (hasElements) e.currentTarget.style.backgroundColor = '#2563eb'; }}
        >
          <Play size={14} fill={hasElements ? "currentColor" : "none"} />
          Ejecutar Análisis
        </button>
      </div>

      {/* ── Área de Trabajo ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <StructureCanvas />
        </div>

        <div style={{ width: '320px', borderLeft: '1px solid #334155', backgroundColor: '#0f172a', zIndex: 5 }}>
          <PropertyPanel />
        </div>
      </div>

      {/* ── Modal Wizard ── */}
      <TemplateWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  );
}