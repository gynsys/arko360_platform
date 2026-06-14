import React, { useState, useEffect } from 'react';
import { X, Copy, Info } from 'lucide-react';
import { useStructureStore } from './useStructureStore';
import toast from 'react-hot-toast';

export function ReplicateModal({ isOpen, onClose }) {
  const { selectedIds, metadata, replicateElements } = useStructureStore();

  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dz, setDz] = useState(0);
  const [numCopies, setNumCopies] = useState(1);
  const [copyRestraints, setCopyRestraints] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDx(0);
      setDy(0);
      setDz(0);
      setNumCopies(1);
      setCopyRestraints(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (selectedIds.length === 0) {
      toast.error('Debe seleccionar al menos un elemento para replicar.');
      return;
    }
    
    if (numCopies <= 0) {
      toast.error('El número de copias debe ser al menos 1.');
      return;
    }

    if (dx === 0 && dy === 0 && dz === 0) {
      toast.error('Debe especificar un vector de traslación (dx, dy o dz) distinto de cero.');
      return;
    }

    replicateElements(parseFloat(dx) || 0, parseFloat(dy) || 0, parseFloat(dz) || 0, parseInt(numCopies) || 1, copyRestraints);
    
    toast.success(`Se replicaron ${selectedIds.length} elementos (${numCopies} copias).`);
    onClose();
  };

  const unitParts = (metadata?.units || 'm, kgf, C').split(',');
  const lengthUnit = unitParts[0]?.trim() || 'm';

  const nodeCount = selectedIds.filter(id => id.startsWith('N')).length;
  const frameCount = selectedIds.filter(id => id.startsWith('E')).length;
  const shellCount = selectedIds.filter(id => id.startsWith('S')).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-sm border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Copy size={18} />
            <h2 className="font-semibold text-sm">Replicar Elementos</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {selectedIds.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-blue-900/20 text-blue-400 rounded border border-blue-800/30">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                No hay elementos seleccionados. Cierre esta ventana, seleccione los nudos, vigas o losas que desea replicar y vuelva a abrir esta herramienta.
              </p>
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded border border-slate-700">
                <p className="font-semibold mb-1 text-white">Selección Actual:</p>
                <ul className="list-disc list-inside text-slate-400">
                  {nodeCount > 0 && <li>{nodeCount} Nudos</li>}
                  {frameCount > 0 && <li>{frameCount} Vigas/Columnas</li>}
                  {shellCount > 0 && <li>{shellCount} Losas</li>}
                </ul>
                <p className="mt-2 text-[10px] text-slate-500">
                  (Las aberturas, secciones, espesores y cargas asociadas se copiarán automáticamente)
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">Incremento (Traslación)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">dx [{lengthUnit}]</span>
                    <input 
                      type="number" 
                      step="any"
                      value={dx} 
                      onChange={e => setDx(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">dy [{lengthUnit}]</span>
                    <input 
                      type="number" 
                      step="any"
                      value={dy} 
                      onChange={e => setDy(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">dz [{lengthUnit}]</span>
                    <input 
                      type="number" 
                      step="any"
                      value={dz} 
                      onChange={e => setDz(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Número de Copias</label>
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  value={numCopies} 
                  onChange={e => setNumCopies(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" 
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="copyRestraints"
                  checked={copyRestraints}
                  onChange={e => setCopyRestraints(e.target.checked)}
                  className="w-3 h-3 bg-slate-900 border-slate-700 rounded"
                />
                <label htmlFor="copyRestraints" className="text-xs text-slate-300 select-none cursor-pointer">
                  Copiar Restricciones (Apoyos)
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleApply}
            disabled={selectedIds.length === 0}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Replicar
          </button>
        </div>
      </div>
    </div>
  );
}
