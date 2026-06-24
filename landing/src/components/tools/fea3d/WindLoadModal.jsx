import React, { useState, useMemo } from 'react';
import { X, Wind, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import { calcWindCOVENIN } from '../../../utils/wind/covenin';
import toast from 'react-hot-toast';

export function WindLoadModal({ isOpen, onClose }) {
  const { nodes, elements, wizardConfig, addLoadCombination, addLoad } = useStructureStore();

  const [norm, setNorm]               = useState('COVENIN');
  const [windSpeed, setWindSpeed]     = useState(100);   // km/h
  const [exposure, setExposure]       = useState('B');
  const [includeWalls, setIncludeWalls] = useState(false);
  const [showCalc, setShowCalc]       = useState(false); // Toggle detalles de cálculo

  const isGalpon = wizardConfig && wizardConfig.type === 'galpon';

  // -------------------------------------------------------------------------
  // Preview en tiempo real del cálculo normativo
  // -------------------------------------------------------------------------
  const preview = useMemo(() => {
    if (!isGalpon || !wizardConfig) return null;
    const { bayWidthX, floorHeight, apexHeight, bayWidthY } = wizardConfig;
    try {
      return calcWindCOVENIN({
        V: windSpeed,
        exposure,
        eaveHeight:  floorHeight,
        ridgeHeight: apexHeight,
        spanX:       bayWidthX,
        bayY:        bayWidthY,
      });
    } catch {
      return null;
    }
  }, [isGalpon, wizardConfig, windSpeed, exposure]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // -------------------------------------------------------------------------
  // Asignación de cargas a la estructura
  // -------------------------------------------------------------------------
  const handleAssign = () => {
    if (!isGalpon) {
      toast.error('El cálculo de viento actualmente solo está disponible para Galpones.');
      return;
    }
    if (!preview) {
      toast.error('Error al calcular presiones de viento. Verifica los parámetros.');
      return;
    }

    const { bayWidthX, floorHeight, apexHeight, bayWidthY } = wizardConfig;
    const L = bayWidthX;
    const E = floorHeight;
    const H = apexHeight;
    const nBaysY = wizardConfig.numBaysY;
    const baySpacing = bayWidthY;

    const { pressures } = preview;

    // ---- Crear combinaciones si no existen ----
    const existingCombos = useStructureStore.getState().loadCombinations;
    if (!existingCombos.some(c => c.id === 'combo-wind-x')) {
      addLoadCombination({ id: 'combo-wind-x', name: '1.2CM + 1.6CV + 1.0WX', factors: { CM: 1.2, CV: 1.6, WX: 1.0 } });
    }
    if (!existingCombos.some(c => c.id === 'combo-wind-y')) {
      addLoadCombination({ id: 'combo-wind-y', name: '1.2CM + 1.6CV + 1.0WY', factors: { CM: 1.2, CV: 1.6, WY: 1.0 } });
    }

    // ---- Helper geométrico: ¿está el nudo en la cuerda superior? ----
    const isNodeOnRoof = (n) => {
      if (n.x < -0.1 || n.x > L + 0.1) return false;
      const expectedZ = n.x <= L / 2
        ? E + (H - E) * (n.x / (L / 2))
        : E + (H - E) * ((L - n.x) / (L / 2));
      return Math.abs(n.z - expectedZ) < 0.15;
    };

    // ---- Área tributaria lineal (kgf/m) por pórtico ----
    // El espaciado de pórticos es baySpacing.
    // Para pórticos extremos se usa baySpacing/2 (solo un lado), para intermedios: baySpacing.
    const tribForFrame = (frameY) => {
      const isEnd = Math.abs(frameY) < 0.1 || Math.abs(frameY - nBaysY * baySpacing) < 0.1;
      return isEnd ? baySpacing / 2 : baySpacing;
    };

    let wx_count = 0;
    let wy_count = 0;

    // =========================================================
    // LÓGICA ESTRUCTURAL DE TRANSFERENCIA
    // =========================================================
    // Membrana → Correas (purlins) → Cerchas (trusses) → Columnas
    //
    // Las correas son los elementos LONGITUDINALES (dy > 0) que conectan
    // los pórticos a lo largo del eje Y. Ellas reciben la carga distribuida
    // de viento como una carga por unidad de longitud (kgf/m) perpendicular
    // a su eje (en la dirección normal a la cubierta, global Z o X).
    //
    // Cada correa está sobre la cubierta inclinada, así que:
    //   - Las correas de barlovento (x ≤ L/2) reciben p_barlovento
    //   - Las correas de sotavento  (x ≥ L/2) reciben p_sotavento
    //
    // La presión [kgf/m²] × espaciado de cuerdas [m] = carga lineal [kgf/m]
    // El espaciado de cuerdas = L / (2 * roofPanels)

    const roofPanels = wizardConfig.roofPanels || 4;
    const chordSpacingX = (L / 2) / roofPanels; // espaciado entre nodos de la cuerda superior

    elements.forEach(el => {
      if (el.type !== 'frame') return;
      const n1 = nodes.find(n => n.id === el.nodes[0]);
      const n2 = nodes.find(n => n.id === el.nodes[1]);
      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dz = n2.z - n1.z;
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;

      // ---- CORREAS: elementos longitudinales (dy > 0, dx ≈ 0) sobre la cubierta ----
      const isCorrea = Math.abs(dy) > 0.5 && Math.abs(dx) < 0.5 && isNodeOnRoof(n1) && isNodeOnRoof(n2);

      if (isCorrea) {
        const isBarlovento = midX <= L / 2 + 0.05;
        const p = isBarlovento ? pressures.roof_W_kgfm2 : pressures.roof_L_kgfm2;
        // Carga lineal sobre la correa = presión [kgf/m²] × espaciado horizontal entre correas [m]
        
        const theta = Math.atan2(H - E, L / 2); // ángulo de inclinación del techo
        // Vector normal apuntando hacia adentro de la estructura:
        // Lado izquierdo (Barlovento): normal = [sin(theta), 0, -cos(theta)]
        // Lado derecho (Sotavento): normal = [-sin(theta), 0, -cos(theta)]
        const nx = isBarlovento ? Math.sin(theta) : -Math.sin(theta);
        const nz = -Math.cos(theta);

        const q_lin = p * chordSpacingX; // p conserva su signo. (+) presiona hacia adentro, (-) succiona hacia afuera
        const q_x = q_lin * nx;
        const q_z = q_lin * nz;

        const isPull = p < 0;
        if (Math.abs(q_x) > 1e-4) {
          addLoad({ type: 'distributed', target_id: el.id, loadCase: 'WX', pattern: 'Uniform', dir: 'X', q1: q_x, q2: q_x, isPull });
        }
        if (Math.abs(q_z) > 1e-4) {
          addLoad({ type: 'distributed', target_id: el.id, loadCase: 'WX', pattern: 'Uniform', dir: 'Z', q1: q_z, q2: q_z, isPull });
        }
        wx_count++;
      }

      // ---- COLUMNAS DE FACHADA (viento en X sobre paredes laterales) ----
      const isColumn = Math.abs(dy) < 0.1 && Math.abs(dx) < 0.1 && Math.abs(dz) > 0.5;
      if (includeWalls && isColumn) {
        const isBarlovento = Math.abs(n1.x) < 0.1 || Math.abs(n2.x) < 0.1;
        const isSotavento  = Math.abs(n1.x - L) < 0.1 || Math.abs(n2.x - L) < 0.1;
        if (isBarlovento || isSotavento) {
          const cp = isBarlovento ? pressures.wall_W_kgfm2 : pressures.wall_L_kgfm2;
          const trib = tribForFrame(midY);
          const q_lin = Math.abs(cp) * trib;
          // Ambos lados empujan/succionan en la dirección +X
          // Barlovento (presión) empuja en +X. Sotavento (succión) tira en +X.
          const sign = 1; 
          const isPull = isSotavento;
          addLoad({ type: 'distributed', target_id: el.id, loadCase: 'WX', pattern: 'Uniform', dir: 'X', q1: q_lin * sign, q2: q_lin * sign, isPull });
          wx_count++;
        }
      }

      // ---- VIENTO EN Y: columnas de fachadas frontales/traseras ----
      if (includeWalls && isColumn) {
        const isFront = Math.abs(midY) < 0.1;
        const isBack  = Math.abs(midY - nBaysY * baySpacing) < 0.1;
        if (isFront || isBack) {
          const cp = isFront ? pressures.wall_W_kgfm2 : pressures.wall_L_kgfm2;
          const trib = L / 2; // ancho tributario en Y ≈ semiluz
          const q_lin = Math.abs(cp) * trib;
          const sign = 1; // Viento +Y empuja pared frontal y succiona pared trasera, ambas fuerzas van en +Y
          const isPull = isBack;
          addLoad({ type: 'distributed', target_id: el.id, loadCase: 'WY', pattern: 'Uniform', dir: 'Y', q1: q_lin * sign, q2: q_lin * sign, isPull });
          wy_count++;
        }
      }
    });


    toast.success(`✅ Viento COVENIN asignado: WX → ${wx_count} elementos | WY → ${wy_count} elementos`);
    onClose();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 text-sky-400">
            <Wind size={20} />
            <h2 className="text-lg font-bold text-white">Generador de Viento</h2>
            <span className="text-[10px] bg-sky-900/60 text-sky-300 px-2 py-0.5 rounded-full font-mono">
              {norm === 'COVENIN' ? 'COVENIN 2003-89' : norm}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto">

          {/* Advertencia si no es galpón */}
          {!isGalpon && (
            <div className="bg-amber-900/20 border border-amber-700/50 p-3 rounded-lg flex items-start gap-3">
              <Info size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                La generación automática de viento requiere un modelo paramétrico de tipo <strong>Galpón</strong>. Su modelo actual no es compatible.
              </p>
            </div>
          )}

          {/* Selección de Norma */}
          <div>
            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Norma de Cálculo</label>
            <select
              value={norm}
              onChange={(e) => setNorm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-sky-500 outline-none"
            >
              <option value="COVENIN">COVENIN 2003-89 — Venezuela</option>
              <option value="CIRSOC" disabled>CIRSOC 102 — Argentina (Próximamente)</option>
              <option value="ASCE7"  disabled>ASCE 7-16 — USA (Próximamente)</option>
              <option value="NSR10"  disabled>NSR-10 — Colombia (Próximamente)</option>
            </select>
          </div>

          {/* Parámetros de entrada */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Vel. Básica V (km/h)</label>
              <input
                type="number" min={40} max={300}
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-sky-500 outline-none"
              />
              <p className="text-[9px] text-slate-500 mt-1">Mapa de velocidades COVENIN</p>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Categoría de Exposición</label>
              <select
                value={exposure}
                onChange={(e) => setExposure(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-sky-500 outline-none"
              >
                <option value="A">A — Centro urbano (edificios altos)</option>
                <option value="B">B — Zona suburbana / arbolada</option>
                <option value="C">C — Campo abierto</option>
                <option value="D">D — Costa / mar abierto</option>
              </select>
            </div>
          </div>

          {/* Checkbox paredes */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox" checked={includeWalls}
              onChange={(e) => setIncludeWalls(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
              Incluir cargas de viento en fachadas / paredes
            </span>
          </label>

          {/* Preview normativo */}
          {preview && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowCalc(!showCalc)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  📐 Resumen del Cálculo Normativo
                </span>
                <ChevronDown size={14} className={`transition-transform ${showCalc ? 'rotate-180' : ''}`} />
              </button>

              {showCalc && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Parámetros calculados */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {[
                      { label: 'θ Techo', value: `${preview.theta}°` },
                      { label: 'Kz', value: preview.Kz },
                      { label: 'G (Ráfaga)', value: preview.G },
                      { label: 'q din. (kgf/m²)', value: preview.q.toFixed(2) },
                      { label: 'Cp Techo BV', value: preview.cp.roof_W },
                      { label: 'Cp Techo SV', value: preview.cp.roof_L },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-900/60 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-slate-500 uppercase">{item.label}</p>
                        <p className="text-sm font-mono font-bold text-sky-300">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Presiones resultantes */}
                  <p className="text-[10px] uppercase text-slate-500 font-bold pt-1">Presiones Resultantes p = q·G·Cp</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[9px] text-slate-500 uppercase">
                        <th className="text-left pb-1">Superficie</th>
                        <th className="text-right pb-1">kgf/m²</th>
                        <th className="text-right pb-1">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {[
                        { label: 'Techo Barlovento (WX)',  val: preview.pressures.roof_W_kgfm2 },
                        { label: 'Techo Sotavento (WX)',   val: preview.pressures.roof_L_kgfm2 },
                        { label: 'Pared Barlovento',       val: preview.pressures.wall_W_kgfm2 },
                        { label: 'Pared Sotavento',        val: preview.pressures.wall_L_kgfm2 },
                      ].map(row => (
                        <tr key={row.label} className="border-t border-slate-800">
                          <td className="py-1 text-slate-400">{row.label}</td>
                          <td className={`text-right font-bold ${row.val < 0 ? 'text-amber-400' : 'text-green-400'}`}>
                            {row.val.toFixed(2)}
                          </td>
                          <td className={`text-right text-[9px] ${row.val < 0 ? 'text-amber-500' : 'text-green-500'}`}>
                            {row.val < 0 ? 'SUCCIÓN' : 'PRESIÓN'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[9px] text-slate-600">
                    Norma: COVENIN 2003-89 · Procedimiento Analítico Simplificado SPRFV
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botón Asignar */}
          <button
            onClick={handleAssign}
            disabled={!isGalpon}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isGalpon
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={18} />
            ASIGNAR VIENTO (WIN_X + WIN_Y)
          </button>

          <p className="text-[9px] text-slate-600 text-center">
            Se crearán automáticamente los patrones de carga WX y WY con sus respectivas combinaciones.
          </p>
        </div>
      </div>
    </div>
  );
}
