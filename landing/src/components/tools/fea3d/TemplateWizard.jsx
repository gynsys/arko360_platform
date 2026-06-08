import React, { useState } from 'react';
import { useStructureStore } from './useStructureStore';
import { Box, Columns, Rows, Layers } from 'lucide-react';

export function TemplateWizard() {
  const [showModal, setShowModal] = useState(true);
  const [config, setConfig] = useState({
    type: '3d_frame',
    numFloors: 2,
    numBaysX: 2,
    numBaysY: 2,
    floorHeight: 3.0,
    bayWidthX: 5.0,
    bayWidthY: 5.0
  });

  const { generateStructure } = useStructureStore();

  const handleGenerate = () => {
    generateStructure(config);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">Nuevo Modelo Estructural</h2>
          <p className="text-slate-400 text-sm">Selecciona una plantilla para comenzar</p>
        </div>

        <div className="flex">
          {/* Sidebar: Tipos de estructura */}
          <div className="w-1/3 border-r border-slate-800 p-4 space-y-2">
            <TemplateType active={config.type === '3d_frame'} onClick={() => setConfig({...config, type: '3d_frame'})} icon={<Box />} label="Edificio 3D" />
            <TemplateType active={config.type === '2d_frame'} onClick={() => setConfig({...config, type: '2d_frame'})} icon={<Columns />} label="Pórtico 2D" />
            <TemplateType active={config.type === 'beam'} onClick={() => setConfig({...config, type: 'beam'})} icon={<Rows />} label="Viga Continua" />
            <TemplateType active={config.type === 'wall'} onClick={() => setConfig({...config, type: 'wall'})} icon={<Layers />} label="Muro/Cimentación" />
          </div>

          {/* Panel de Parámetros (Estilo SAP2000) */}
          <div className="w-2/3 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Número de Pisos" value={config.numFloors} onChange={v => setConfig({...config, numFloors: v})} />
              <Input label="Altura entre pisos (m)" value={config.floorHeight} onChange={v => setConfig({...config, floorHeight: v})} />
              <Input label="Vanos en X" value={config.numBaysX} onChange={v => setConfig({...config, numBaysX: v})} />
              <Input label="Ancho de Vanos X (m)" value={config.bayWidthX} onChange={v => setConfig({...config, bayWidthX: v})} />
              <Input label="Vanos en Y" value={config.numBaysY} onChange={v => setConfig({...config, numBaysY: v})} />
              <Input label="Ancho de Vanos Y (m)" value={config.bayWidthY} onChange={v => setConfig({...config, bayWidthY: v})} />
            </div>

            <div className="pt-6">
              <button 
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                GENERAR MODELO
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
        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function TemplateType({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
    >
      {icon} <span className="text-sm font-medium">{label}</span>
    </button>
  );
}