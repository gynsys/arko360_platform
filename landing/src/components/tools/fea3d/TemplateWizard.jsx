import React, { useState, useEffect } from 'react';
import { useStructureStore } from './useStructureStore';
import { Box, Columns, Rows, Layers, X, FolderOpen } from 'lucide-react';

const DEFAULT_CONFIG = {
  type: '3d_frame',
  numFloors: 2,
  numBaysX: 2,
  numBaysY: 2,
  floorHeight: 3.0,
  bayWidthX: 5.0,
  bayWidthY: 5.0,
  units: 'm, kgf, C',
  systemMaterial: 'Concrete', // 'Concrete' or 'Steel'
  colSectionId: '',
  beamSectionId: ''
};

export function TemplateWizard({ isOpen, onClose }) {
  const { generateStructure, wizardConfig, sections, materials, addMaterial, addSection } = useStructureStore();
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Sincronizar estado local con el store cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (wizardConfig !== null) {
        setConfig(wizardConfig);
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    }
  }, [isOpen, wizardConfig]);

  const handleGenerate = () => {
    generateStructure(config);
    onClose();
  };

  const fileInputRef = React.useRef(null);
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        useStructureStore.getState().importProject(ev.target.result);
        onClose();
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  const isFirstTime = wizardConfig === null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isFirstTime ? 'Nuevo Modelo Estructural' : 'Editar Geometría del Modelo'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {isFirstTime
                ? 'Selecciona una plantilla para comenzar'
                : 'Modifica los parámetros y regenera la estructura'}
            </p>
          </div>
          <button
            onClick={() => {
              if (isFirstTime) {
                window.location.href = '/';
              } else {
                onClose();
              }
            }}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            title={isFirstTime ? "Volver a Inicio" : "Cerrar"}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar: Tipos */}
          <div className="w-1/3 border-r border-slate-800 p-4 space-y-2">
            <TemplateType
              active={config.type === '3d_frame'}
              onClick={() => setConfig({ ...config, type: '3d_frame' })}
              icon={<Box size={18} />}
              label="Edificio 3D"
            />
            <TemplateType
              active={config.type === '2d_frame'}
              onClick={() => setConfig({ ...config, type: '2d_frame' })}
              icon={<Columns size={18} />}
              label="Pórtico 2D"
            />
            <TemplateType
              active={config.type === 'beam'}
              onClick={() => setConfig({ ...config, type: 'beam' })}
              icon={<Rows size={18} />}
              label="Viga Continua"
            />
            <TemplateType
              active={config.type === 'wall'}
              onClick={() => setConfig({ ...config, type: 'wall' })}
              icon={<Layers size={18} />}
              label="Muro/Cimentación"
            />

            {/* Abrir Proyecto Existente */}
            {isFirstTime && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".arko3d,.json" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all font-medium"
                >
                  <FolderOpen size={18} />
                  Abrir Proyecto
                </button>
              </div>
            )}
          </div>

          {/* Formulario */}
          <div className="w-2/3 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {config.type !== 'beam' && (
                <>
                  <Input
                    label="Número de Pisos"
                    value={config.numFloors}
                    onChange={v => setConfig({ ...config, numFloors: v })}
                  />
                  <Input
                    label={`Altura entre pisos (${config.units?.split(',')[0] || 'm'})`}
                    value={config.floorHeight}
                    onChange={v => setConfig({ ...config, floorHeight: v })}
                  />
                </>
              )}
              
              <Input
                label={config.type === 'beam' ? "Número de Vanos" : "Vanos en X"}
                value={config.numBaysX}
                onChange={v => setConfig({ ...config, numBaysX: v })}
              />
              <Input
                label={config.type === 'beam' ? `Longitud de Vano (${config.units?.split(',')[0] || 'm'})` : `Ancho de Vanos X (${config.units?.split(',')[0] || 'm'})`}
                value={config.bayWidthX}
                onChange={v => setConfig({ ...config, bayWidthX: v })}
              />
              
              {config.type !== 'beam' && config.type !== '2d_frame' && (
                <>
                  <Input
                    label="Vanos en Y"
                    value={config.numBaysY}
                    onChange={v => setConfig({ ...config, numBaysY: v })}
                  />
                  <Input
                    label={`Ancho de Vanos Y (${config.units?.split(',')[0] || 'm'})`}
                    value={config.bayWidthY}
                    onChange={v => setConfig({ ...config, bayWidthY: v })}
                  />
                </>
              )}
            </div>
            
            {isFirstTime && (
              <>
                <div className="mt-4">
                  <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Unidades del Proyecto</label>
                  <select 
                    value={config.units || 'm, kgf, C'} 
                    onChange={(e) => setConfig({ ...config, units: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="m, kgf, C">Métrico MKS (m, kgf, C)</option>
                    <option value="m, kN, C">Métrico SI (m, kN, C)</option>
                    <option value="ft, kip, F">US Customary (ft, kip, F)</option>
                  </select>
                </div>
                
                <div className="mt-4">
                  <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Material Predominante (Sistema)</label>
                  <select 
                    value={config.systemMaterial || 'Concrete'} 
                    onChange={(e) => {
                      const mat = e.target.value;
                      setConfig({ 
                        ...config, 
                        systemMaterial: mat,
                        colSectionId: mat === 'Steel' ? 'W14X90' : 'COL_DEF',
                        beamSectionId: mat === 'Steel' ? 'W14X90' : 'BEAM_DEF'
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Concrete">Concreto Armado</option>
                    <option value="Steel">Acero Estructural</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  {config.type !== 'beam' && (
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Sección de Columnas</label>
                    <select 
                      value={config.colSectionId || (config.systemMaterial === 'Steel' ? 'W14X90' : 'COL_DEF')} 
                      onChange={(e) => setConfig({ ...config, colSectionId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      {/* En ETABS, si no hay secciones, permite usar un default o crear una. Mostramos opciones hardcodeadas o del store */}
                      {sections.length > 0 ? sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      )) : (
                        config.systemMaterial === 'Steel' 
                        ? <option value="W14X90">W14X90 (Acero)</option> 
                        : <option value="COL_DEF">COL_40x40 (Concreto)</option>
                      )}
                    </select>
                  </div>
                  )}
                  <div className={config.type === 'beam' ? 'col-span-2' : ''}>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Sección de Vigas</label>
                    <select 
                      value={config.beamSectionId || (config.systemMaterial === 'Steel' ? 'W14X90' : 'BEAM_DEF')} 
                      onChange={(e) => setConfig({ ...config, beamSectionId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      {sections.length > 0 ? sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      )) : (
                        config.systemMaterial === 'Steel' 
                        ? <option value="W14X90">W14X90 (Acero)</option> 
                        : <option value="BEAM_DEF">VIGA_30x40 (Concreto)</option>
                      )}
                    </select>
                  </div>
                </div>
              </>
            )}

            {!isFirstTime && (
              <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
                ⚠️ Al regenerar se actualizan nudos y elementos. Las secciones y materiales de los elementos se re-asignarán a los valores por defecto del Wizard.
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                {isFirstTime ? 'GENERAR MODELO' : 'APLICAR CAMBIOS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">{label}</label>
      <input
        type="number"
        step="any"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function TemplateType({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
    >
      {icon} <span className="text-sm font-medium">{label}</span>
    </button>
  );
}