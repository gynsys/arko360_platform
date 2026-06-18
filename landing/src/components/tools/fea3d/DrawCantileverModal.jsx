import React, { useState, useMemo } from 'react';
import { X, Layers } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function DrawCantileverModal({ onClose }) {
  const { nodes, addCantilever, metadata } = useStructureStore();
  
  // 1. Obtener niveles únicos (coordenadas Z)
  const uniqueZ = useMemo(() => {
    const zs = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.z * 10) / 10))];
    return zs.sort((a, b) => a - b);
  }, [nodes]);
  
  // Nivel seleccionado por defecto: el más alto > 0, o simplemente el más alto
  const defaultLevel = useMemo(() => {
    const floors = uniqueZ.filter(z => z > 0);
    return floors.length > 0 ? floors[floors.length - 1] : (uniqueZ[uniqueZ.length - 1] || 0);
  }, [uniqueZ]);
  
  const [level, setLevel] = useState(defaultLevel);
  const [axisType, setAxisType] = useState('X'); // 'X' o 'Y'
  
  // 2. Obtener ejes únicos (coordenadas X e Y)
  const uniqueX = useMemo(() => {
    const xs = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.x * 10) / 10))];
    return xs.sort((a, b) => a - b);
  }, [nodes]);
  
  const uniqueY = useMemo(() => {
    const ys = [...new Set(nodes.filter(n => !n.cantilever).map(n => Math.round(n.y * 10) / 10))];
    return ys.sort((a, b) => a - b);
  }, [nodes]);
  
  // Valor del eje seleccionado
  const [axisVal, setAxisVal] = useState(() => {
    if (axisType === 'X') return uniqueX[0] || 0;
    return uniqueY[0] || 0;
  });
  
  // Actualizar el valor del eje al cambiar el tipo de eje
  React.useEffect(() => {
    if (axisType === 'X') {
      setAxisVal(uniqueX[0] || 0);
    } else {
      setAxisVal(uniqueY[0] || 0);
    }
  }, [axisType, uniqueX, uniqueY]);
  
  // Dirección por defecto (+X para tipo X, +Y para tipo Y)
  const [dir, setDir] = useState('+X');
  React.useEffect(() => {
    setDir(axisType === 'X' ? '+X' : '+Y');
  }, [axisType]);
  
  const [length, setLength] = useState(1.5);
  
  const handleDraw = () => {
    if (length <= 0) {
      toast.error('La longitud del volado debe ser mayor a 0');
      return;
    }
    
    addCantilever({
      level: parseFloat(level),
      axisType,
      axisVal: parseFloat(axisVal),
      dir,
      length: parseFloat(length)
    });
    
    onClose();
  };
  
  if (nodes.length === 0) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[400px] p-6 text-center">
          <p className="mb-4 text-slate-600">No hay nudos definidos en el modelo para proyectar un volado.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded">Cerrar</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xl w-[420px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <Layers size={16} /> Dibujar Volado (Cantilever)
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X size={16} /></button>
        </div>
        
        <div className="p-4 space-y-4 text-sm text-slate-700">
          {/* Nivel / Piso */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Nivel (Piso)</label>
            <select 
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-850 outline-none"
              value={level}
              onChange={(e) => setLevel(parseFloat(e.target.value))}
            >
              {uniqueZ.map((z, idx) => (
                <option key={z} value={z}>
                  {z === 0 ? `Base (Z = 0m)` : `Piso ${idx} (Z = ${z}m)`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Tipo de Eje */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Eje de Referencia</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAxisType('X')}
                className={`py-1.5 px-3 rounded border text-xs font-bold transition-all ${
                  axisType === 'X'
                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Eje X (Vertical, X = Cte)
              </button>
              <button
                type="button"
                onClick={() => setAxisType('Y')}
                className={`py-1.5 px-3 rounded border text-xs font-bold transition-all ${
                  axisType === 'Y'
                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Eje Y (Horizontal, Y = Cte)
              </button>
            </div>
          </div>
          
          {/* Eje */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Eje del Volado</label>
            <select 
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-850 outline-none font-mono"
              value={axisVal}
              onChange={(e) => setAxisVal(parseFloat(e.target.value))}
            >
              {axisType === 'X' ? (
                uniqueX.map((x, i) => (
                  <option key={x} value={x}>Eje {i + 1} (X = {x}m)</option>
                ))
              ) : (
                uniqueY.map((y, i) => (
                  <option key={y} value={y}>Eje {String.fromCharCode(65 + i)} (Y = {y}m)</option>
                ))
              )}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Dirección */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Dirección</label>
              <select 
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-850 outline-none"
                value={dir}
                onChange={(e) => setDir(e.target.value)}
              >
                {axisType === 'X' ? (
                  <>
                    <option value="+X">Hacia +X (Derecha)</option>
                    <option value="-X">Hacia -X (Izquierda)</option>
                  </>
                ) : (
                  <>
                    <option value="+Y">Hacia +Y (Adelante)</option>
                    <option value="-Y">Hacia -Y (Atrás)</option>
                  </>
                )}
              </select>
            </div>
            
            {/* Longitud */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Longitud (m)</label>
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-850 outline-none"
                value={length}
                onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-3 flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-200 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleDraw} 
            className="bg-blue-600 text-white px-6 py-1.5 rounded hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
          >
            Dibujar Volado
          </button>
        </div>
      </div>
    </div>
  );
}
