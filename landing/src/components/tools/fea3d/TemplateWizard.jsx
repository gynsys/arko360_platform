import React, { useState, useEffect } from 'react';
import { useStructureStore } from './useStructureStore';
import { Box, Columns, Rows, Layers, X, FolderOpen, Cloud, Warehouse } from 'lucide-react';
import { getProjects } from './api';
import toast from 'react-hot-toast';

const DEFAULT_CONFIG = {
  type: '3d_frame',
  numFloors: 2,
  numBaysX: 2,
  numBaysY: 6,
  floorHeight: 6.0,
  bayWidthX: 20.0,
  bayWidthY: 6.0,
  units: 'm, kgf, C',
  systemMaterial: 'Concrete', // 'Concrete' or 'Steel'
  colSectionId: 'IPE240',
  beamSectionId: 'IPE180',
  purlinSectionId: 'IPE160',
  trussType: 'Howe',
  roofPanels: 4,
  apexHeight: 8.0,
  galponType: 'Cercha'
};

export function TemplateWizard({ isOpen, onClose, onProjectSelect }) {
  const { generateStructure, wizardConfig, sections, materials, addMaterial, addSection } = useStructureStore();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [recentProjects, setRecentProjects] = useState([]);

  // Sincronizar estado local con el store cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (wizardConfig !== null) {
        setConfig(wizardConfig);
      } else {
        setConfig(DEFAULT_CONFIG);
      }
      
      // Fetch recent projects if it's the first time and user might have them
      if (wizardConfig === null && localStorage.getItem('arko_token')) {
        getProjects()
          .then(data => {
            // sort by updated_at descending and get top 2
            const sorted = data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            setRecentProjects(sorted.slice(0, 2));
          })
          .catch(err => {
            console.error("Error fetching recent projects", err);
          });
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
            <TemplateType
              active={config.type === 'galpon'}
              onClick={() => setConfig({ ...config, type: 'galpon', systemMaterial: 'Steel', colSectionId: 'IPE240', beamSectionId: 'IPE180', purlinSectionId: 'IPE160', numBaysY: 6, floorHeight: 6.0, apexHeight: 8.0, bayWidthX: 20.0, bayWidthY: 6.0, galponType: 'Cercha' })}
              icon={<Warehouse size={18} />}
              label="Galpón Industrial"
            />

            {/* Proyectos Recientes en Nube y Local */}
            {isFirstTime && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                  <Cloud size={14} /> Tus Proyectos Recientes
                </h3>
                
                {recentProjects.length > 0 ? (
                  <div className="space-y-2 mb-2">
                    {recentProjects.map(proj => (
                      <button
                        key={proj.id}
                        onClick={() => onProjectSelect && onProjectSelect(proj)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:border-blue-500/50 border border-transparent transition-all group"
                      >
                        <div className="text-sm font-medium text-slate-300 group-hover:text-blue-400 truncate">
                          {proj.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(proj.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mb-2 px-2">No hay proyectos en la nube.</div>
                )}
                
                {recentProjects.length > 0 && (
                  <button 
                    onClick={() => { onClose(); window.dispatchEvent(new Event('open-projects-modal')); }}
                    className="w-full mb-4 text-xs font-bold text-blue-400 hover:text-blue-300 text-center py-1"
                  >
                    Ver todos mis proyectos
                  </button>
                )}

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".arko3d,.json" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-300 transition-all font-medium text-sm"
                >
                  <FolderOpen size={16} />
                  Abrir Proyecto Local
                </button>
              </div>
            )}
          </div>

          {/* Formulario */}
          <div className="w-2/3 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {config.type !== 'beam' && config.type !== 'galpon' && (
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
              {config.type === 'galpon' && (
                <>
                  <Input
                    label={`Altura de Alero (${config.units?.split(',')[0] || 'm'})`}
                    value={config.floorHeight}
                    onChange={v => setConfig({ ...config, floorHeight: v })}
                  />
                  <Input
                    label={`Altura Cumbrera (${config.units?.split(',')[0] || 'm'})`}
                    value={config.apexHeight}
                    onChange={v => setConfig({ ...config, apexHeight: v })}
                  />
                </>
              )}
              
              {/* Vanos en X: solo visible para tipos que no son galpón */}
              {config.type !== 'galpon' && (
                <Input
                  label={config.type === 'beam' ? "Número de Vanos" : "Vanos en X"}
                  value={config.numBaysX}
                  onChange={v => setConfig({ ...config, numBaysX: v })}
                />
              )}
              <Input
                label={config.type === 'beam' ? `Longitud de Vano (${config.units?.split(',')[0] || 'm'})` : (config.type === 'galpon' ? "Luz Libre (Ancho)" : `Ancho de Vanos X (${config.units?.split(',')[0] || 'm'})`)}
                value={config.bayWidthX}
                onChange={v => {
                  if (config.type !== 'galpon') {
                    setConfig({ ...config, bayWidthX: v });
                  } else {
                    // Predimensionado para Galpon
                    let truss = 'Howe';
                    let panels = 4;
                    if (v > 10 && v <= 20) {
                      panels = 6;
                      truss = 'Pratt';
                    } else if (v > 20) {
                      panels = 8;
                      truss = 'Pratt';
                    }
                    setConfig({ ...config, bayWidthX: v, trussType: truss, roofPanels: panels, numBaysX: 1, systemMaterial: 'Steel' });
                  }
                }}
              />
              
              {config.type !== 'beam' && config.type !== '2d_frame' && (
                <>
                  <Input
                    label={config.type === 'galpon' ? "Vanos Longitudinales (Y)" : "Vanos en Y"}
                    value={config.numBaysY}
                    onChange={v => setConfig({ ...config, numBaysY: v })}
                  />
                  <Input
                    label={config.type === 'galpon' ? `Separación entre Pórticos (${config.units?.split(',')[0] || 'm'})` : `Ancho de Vanos Y (${config.units?.split(',')[0] || 'm'})`}
                    value={config.bayWidthY}
                    onChange={v => setConfig({ ...config, bayWidthY: v })}
                  />
                  {config.type === 'galpon' && (
                    <>
                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Tipo de Pórtico</label>
                        <select 
                          value={config.galponType || 'Cercha'} 
                          onChange={(e) => setConfig({ ...config, galponType: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500 mb-3"
                        >
                          <option value="Cercha">Cerchas</option>
                          <option value="Tapered">Alma Llena</option>
                        </select>
                      </div>
                      {(!config.galponType || config.galponType === 'Cercha') && (
                        <>
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Tipo de Cercha</label>
                            <select 
                              value={config.trussType} 
                              onChange={(e) => setConfig({ ...config, trussType: e.target.value })}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            >
                              <option value="Howe">Howe</option>
                              <option value="Pratt">Pratt</option>
                            </select>
                          </div>
                          {/* Nº Paneles con tooltip: valor auto-calculado */}
                          <InputTooltip
                            label="Nº Paneles (Por mitad)"
                            value={config.roofPanels}
                            onChange={v => setConfig({ ...config, roofPanels: Math.max(2, Math.floor(v)) })}
                            tooltip="Se calcula automáticamente según la Luz Libre. Puedes ajustarlo manualmente."
                          />
                        </>
                      )}
                    </>
                  )}
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
                
                {config.type !== 'galpon' && (
                  <div className="mt-4">
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Material Predominante (Sistema)</label>
                    <div className="flex gap-2">
                      <select 
                        value={config.systemMaterial || 'Concrete'} 
                        onChange={(e) => {
                          const mat = e.target.value;
                          setConfig({ 
                            ...config, 
                            systemMaterial: mat,
                            materialId: '', // Reset material when system changes
                            colSectionId: mat === 'Steel' ? 'W14X90' : 'COL_DEF',
                            beamSectionId: mat === 'Steel' ? 'W14X90' : 'BEAM_DEF'
                          });
                        }}
                        className="w-1/2 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="Concrete">Concreto Armado</option>
                        <option value="Steel">Acero Estructural</option>
                      </select>
                      
                      {config.systemMaterial === 'Concrete' && (
                        <div className="flex w-1/2 gap-1">
                          <select 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            value={config.materialId || (materials.filter(m => m.type === 'Concrete').length > 0 ? materials.filter(m => m.type === 'Concrete')[0].id : '')}
                            onChange={(e) => setConfig({ ...config, materialId: e.target.value })}
                          >
                            {materials.filter(m => m.type === 'Concrete').map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                            {materials.filter(m => m.type === 'Concrete').length === 0 && (
                              <option value="">Por defecto (f'c 280)</option>
                            )}
                          </select>
                          <button 
                            onClick={() => window.dispatchEvent(new Event('open-materials-modal'))}
                            className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 flex items-center justify-center font-bold"
                            title="Definir Materiales"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4">
                  {config.type !== 'beam' && config.type !== 'galpon' && (
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
                  {config.type !== 'galpon' && (
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
                  )}

                  {config.type === 'galpon' && (
                    <GalponSectionsSelects config={config} setConfig={setConfig} />
                  )}
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

function InputTooltip({ label, value, onChange, tooltip }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-1 mb-1">
        <label className="text-[10px] uppercase text-slate-500 font-bold">{label}</label>
        <button
          type="button"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          className="text-slate-500 hover:text-sky-400 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
        {show && (
          <div className="absolute left-0 top-6 z-50 bg-slate-700 border border-slate-600 text-slate-200 text-[10px] rounded-lg px-3 py-2 w-52 shadow-xl">
            {tooltip}
          </div>
        )}
      </div>
      <input
        type="number"
        step="1"
        min="2"
        className="w-full bg-slate-800 border border-sky-800 rounded-lg p-2 text-sky-300 text-sm focus:outline-none focus:border-sky-500"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 2)}
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

function GalponSectionsSelects({ config, setConfig }) {
  // Generar listas desde un listado hardcodeado de los solicitados por el usuario
  const ipeOptions = [160, 180, 200, 220, 240, 270, 300, 330].map(s => ({ id: `IPE${s}`, name: `IPE ${s}` }));
  const conduvenCols = [175, 200, 220, 260].map(s => {
    const t = s === 175 ? '5_5' : s === 200 ? '7_0' : '9_0';
    return { id: `ECO_CUAD_${s}x${s}x${t}`, name: `CONDUVEN ${s}x${s}` };
  });
  const conduvenBeams = [
    { id: 'ECO_180x65x4_0', name: 'CONDUVEN 180x65' },
    { id: 'ECO_200x70x4_3', name: 'CONDUVEN 200x70' },
    { id: 'ECO_220x90x4_5', name: 'CONDUVEN 220x90' },
    { id: 'ECO_260x90x5_5', name: 'CONDUVEN 260x90' },
    { id: 'ECO_300x100x7_0', name: 'CONDUVEN 300x100' },
    { id: 'ECO_320x120x7_0', name: 'CONDUVEN 320x120' }
  ];
  const vpOptions = [
    { id: 'VP_150x75', name: 'VP 150x75' },
    { id: 'VP_200x100', name: 'VP 200x100' },
    { id: 'VP_250x125', name: 'VP 250x125' },
    { id: 'VP_300x150', name: 'VP 300x150' },
    { id: 'VP_350x175', name: 'VP 350x175' },
    { id: 'VP_400x200', name: 'VP 400x200' },
    { id: 'VP_450x200', name: 'VP 450x200' },
    { id: 'VP_500x200', name: 'VP 500x200' }
  ];

  return (
    <div className="col-span-2 grid grid-cols-3 gap-4">
      <div>
        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Sección Columnas</label>
        <select 
          value={config.colSectionId || 'IPE240'} 
          onChange={(e) => setConfig({ ...config, colSectionId: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <optgroup label="Perfiles IPE">
            {ipeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
          <optgroup label="CONDUVEN (Cuadrados)">
            {conduvenCols.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
          <optgroup label="Perfiles VP (Properca)">
            {vpOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Sección Vigas</label>
        <select 
          value={config.beamSectionId || 'IPE180'} 
          onChange={(e) => setConfig({ ...config, beamSectionId: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <optgroup label="Perfiles IPE">
            {ipeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
          <optgroup label="CONDUVEN (Rectangulares)">
            {conduvenBeams.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
          <optgroup label="Perfiles VP (Properca)">
            {vpOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Sección Correas</label>
        <select 
          value={config.purlinSectionId || 'IPE160'} 
          onChange={(e) => setConfig({ ...config, purlinSectionId: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <optgroup label="Perfiles IPE">
            {ipeOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
          <optgroup label="CONDUVEN (Rectangulares)">
            {conduvenBeams.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </optgroup>
        </select>
      </div>
    </div>
  );
}