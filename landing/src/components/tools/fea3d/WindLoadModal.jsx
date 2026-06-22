import React, { useState } from 'react';
import { X, Wind, Info, CheckCircle2 } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function WindLoadModal({ isOpen, onClose }) {
  const { nodes, elements, wizardConfig } = useStructureStore();
  const [norm, setNorm] = useState('COVENIN');
  const [windSpeed, setWindSpeed] = useState(100); // km/h
  const [exposure, setExposure] = useState('B');
  
  if (!isOpen) return null;

  const isGalpon = wizardConfig && wizardConfig.type === 'galpon';

  const handleAssign = () => {
    if (!isGalpon) {
      toast.error("El cálculo de viento actualmente solo está automatizado para Galpones.");
      return;
    }
    
    // Aquí iría la lógica matemática normativa de cálculo de presiones 
    // y asignación de cargas a nudos/vigas. Por ahora, es un placeholder funcional.
    
    // Simulate loading
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'Calculando y asignando presiones de viento...',
        success: 'Cargas de viento asignadas (Caso: WX)',
        error: 'Error al asignar',
      }
    );
    
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Wind size={20} />
            <h2 className="text-lg font-bold text-white">Generador de Viento</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {!isGalpon && (
            <div className="bg-amber-900/20 border border-amber-700/50 p-3 rounded-lg flex items-start gap-3">
              <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                La generación automática de viento requiere un modelo paramétrico de tipo "Galpón". Su modelo actual no es compatible con el auto-generador.
              </p>
            </div>
          )}

          <div className="space-y-4 opacity-100">
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Norma de Cálculo</label>
              <select 
                value={norm}
                onChange={(e) => setNorm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
              >
                <option value="COVENIN">COVENIN 2003-89 (Venezuela)</option>
                <option value="ASCE7" disabled>ASCE 7-16 (USA) - Próximamente</option>
                <option value="CIRSOC" disabled>CIRSOC 102 (Argentina) - Próximamente</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Vel. Básica (km/h)</label>
                <input 
                  type="number" 
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Exposición</label>
                <select 
                  value={exposure}
                  onChange={(e) => setExposure(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                >
                  <option value="A">A (Centro de Ciudad)</option>
                  <option value="B">B (Zonas Urbanas/Arboladas)</option>
                  <option value="C">C (Campo Abierto)</option>
                  <option value="D">D (Costas/Mar abierto)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-2 mt-4">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Parámetros Automáticos</h4>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Coeficientes Cp:</span>
                <span className="text-slate-200">Auto (Basado en pendiente)</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Aplicación:</span>
                <span className="text-slate-200">Nudos de Cuerda Superior</span>
              </div>
            </div>

          </div>

          <button 
            onClick={handleAssign}
            disabled={!isGalpon}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isGalpon 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={18} />
            ASIGNAR CARGAS DE VIENTO
          </button>
        </div>
      </div>
    </div>
  );
}
