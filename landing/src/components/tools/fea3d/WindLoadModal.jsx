import React, { useState } from 'react';
import { X, Wind, Info, CheckCircle2 } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function WindLoadModal({ isOpen, onClose }) {
  const { nodes, elements, wizardConfig, addLoadCombination, addLoad, loads } = useStructureStore();
  const [norm, setNorm] = useState('COVENIN');
  const [windSpeed, setWindSpeed] = useState(100); // km/h
  const [exposure, setExposure] = useState('B');
  const [includeWalls, setIncludeWalls] = useState(false);
  
  if (!isOpen) return null;

  const isGalpon = wizardConfig && wizardConfig.type === 'galpon';

  const handleAssign = () => {
    if (!isGalpon) {
      toast.error("El cálculo de viento actualmente solo está automatizado para Galpones.");
      return;
    }
    
    // Crear Load Combination si no existe
    const hasWindCombo = useStructureStore.getState().loadCombinations.some(c => c.id === 'combo-wind-1');
    if (!hasWindCombo) {
      addLoadCombination({
        id: 'combo-wind-1',
        name: '1.2 CM + 1.0 CV + 1.0 WX',
        factors: { CM: 1.2, CV: 1.0, WX: 1.0 }
      });
    }

    const { apexHeight, bayWidthX, floorHeight, bayWidthY } = wizardConfig;
    const L = bayWidthX;
    const E = floorHeight;
    const H = apexHeight;
    const tribArea = bayWidthY; // Ancho tributario aproximado

    // Presión dinámica base
    // q = 0.00482 * V^2 * Ce * Cq
    // Simplificación genérica
    const q_base = 0.00482 * Math.pow(windSpeed, 2); // kgf/m2
    
    // Coeficientes simplificados (Barlovento)
    const cp_roof = 0.8; // Succión perpendicular hacia arriba
    const cp_wall = 0.8; // Presión hacia adentro
    
    const q_roof_lin = q_base * cp_roof * tribArea; // kgf/m lineal
    const q_wall_lin = q_base * cp_wall * tribArea;

    let assignedCount = 0;

    // Helper to check if node is on roof envelope
    const isNodeOnRoof = (n) => {
      if (Math.abs(n.y % bayWidthY) > 0.1) return false; // Must be on a frame
      if (n.x < -0.1 || n.x > L + 0.1) return false;
      const expectedZ = n.x <= L/2 
        ? E + (H - E) * (n.x / (L/2))
        : E + (H - E) * ((L - n.x) / (L/2));
      return Math.abs(n.z - expectedZ) < 0.1;
    };

    elements.forEach(el => {
      if (el.type !== 'frame') return;
      const n1 = nodes.find(n => n.id === el.nodes[0]);
      const n2 = nodes.find(n => n.id === el.nodes[1]);
      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dz = n2.z - n1.z;

      // Detect Upper Chord
      if (Math.abs(dy) < 0.1 && isNodeOnRoof(n1) && isNodeOnRoof(n2)) {
        // Asignar carga en eje Z global (hacia arriba por succión) o perpendicular
        // Para simplificar, la asignamos global en Z (+z es hacia arriba)
        addLoad({
          type: 'frame',
          target_id: el.id,
          loadCase: 'WX',
          pattern: 'Uniform',
          dir: 'Z',
          q1: q_roof_lin,
          q2: q_roof_lin
        });
        assignedCount++;
      }

      // Detect Column
      if (includeWalls && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dz) > 0.1) {
        // Aplicar presión en X
        const isLeft = Math.abs(n1.x) < 0.1;
        const dirSign = isLeft ? 1 : -1; // Barlovento empuja hacia +X, Sotavento succiona hacia +X
        addLoad({
          type: 'frame',
          target_id: el.id,
          loadCase: 'WX',
          pattern: 'Uniform',
          dir: 'X',
          q1: q_wall_lin * dirSign,
          q2: q_wall_lin * dirSign
        });
        assignedCount++;
      }
    });

    toast.success(`Cargas de viento (WX) asignadas a ${assignedCount} elementos.`);
    onClose();
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
                <span className="text-slate-200">Auto (Según Pendiente)</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Aplicación:</span>
                <span className="text-slate-200">Distribución por Membrana a Pórticos</span>
              </div>
              
              <div className="pt-3 mt-3 border-t border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeWalls}
                    onChange={(e) => setIncludeWalls(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-300 font-semibold">Incluir cargas de viento en paredes (Fachadas)</span>
                </label>
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
