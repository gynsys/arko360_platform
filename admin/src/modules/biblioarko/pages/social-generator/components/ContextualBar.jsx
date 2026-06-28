import React from 'react';
import { 
  FiTrash2, FiX, FiBold, FiItalic, FiType, 
  FiLayers, FiMove, FiMaximize, FiMinimize, 
  FiCornerUpLeft, FiSquare, FiCircle, FiImage,
  FiEye
} from 'react-icons/fi';

export const ContextualBar = ({ 
  selectedId, 
  canvas, 
  updateElement, 
  removeElement, 
  deselectElement,
  isMobile = false,
  isImage = false,
  imagePositions = {},
  updateImage,
  onRemoveImage
}) => {
  if (!selectedId) return null;

  const [slideIdx, elId] = selectedId.split('-');
  let el = null;
  let currentZIndex = 0;
  let isText = false;
  let isShape = false;
  
  if (isImage) {
    const pos = imagePositions[selectedId] || { zIndex: 20 };
    currentZIndex = pos.zIndex || 20;
  } else {
    el = canvas.extraElements[slideIdx]?.find(e => e.id === elId);
    if (!el) return null;
    currentZIndex = el.zIndex || 0;
    isText = el.type === 'text' || el.type === 'title';
    isShape = el.type === 'shape';
  }

  const containerClasses = isMobile 
    ? "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[150] p-3 pb-safe shadow-2xl animate-slideUp overflow-hidden"
    : "fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 z-[150] p-4 rounded-[32px] shadow-2xl flex items-center gap-4 animate-slideUp";

  if (isMobile) {
    return (
      <div data-contextual-bar="true" className={containerClasses}>
        {/* Fila 1: Tipo + Color + Bold/Italic */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center flex-shrink-0">
            {isText ? <FiType size={14} /> : isShape ? <FiSquare size={14} /> : <FiImage size={14} />}
          </div>

          {/* Color del elemento */}
          {!isImage && (
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm bg-white flex-shrink-0">
              <input
                type="color"
                value={el.color || '#000000'}
                onChange={(e) => updateElement(parseInt(slideIdx), elId, { color: e.target.value })}
                className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-none p-0 bg-transparent"
              />
            </div>
          )}

          {isText && (
            <>
              <button
                onClick={() => updateElement(parseInt(slideIdx), elId, { bold: !el.bold })}
                className={`p-2 rounded-xl transition-all flex-shrink-0 ${el.bold ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500'}`}
              >
                <FiBold size={14} />
              </button>
              <button
                onClick={() => updateElement(parseInt(slideIdx), elId, { italic: !el.italic })}
                className={`p-2 rounded-xl transition-all flex-shrink-0 ${el.italic ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500'}`}
              >
                <FiItalic size={14} />
              </button>
              {/* Font size inline */}
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-xl px-2 py-1 flex-shrink-0">
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => updateElement(parseInt(slideIdx), elId, { fontSize: Math.max(8, (el.fontSize || 24) - 1) })}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 font-black text-sm"
                >−</button>
                <span className="text-xs font-black text-indigo-600 w-6 text-center">{el.fontSize || 24}</span>
                <button
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => updateElement(parseInt(slideIdx), elId, { fontSize: Math.min(72, (el.fontSize || 24) + 1) })}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 font-black text-sm"
                >+</button>
              </div>
            </>
          )}

          {isImage && (
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-xl px-2 py-1 flex-shrink-0">
              <FiEye size={16} className="text-gray-400" />
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1"
                value={imagePositions[selectedId]?.opacity !== undefined ? imagePositions[selectedId].opacity : 1}
                onChange={(e) => updateImage(selectedId, { opacity: parseFloat(e.target.value) })}
                className="w-16 cursor-pointer"
              />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (isImage) updateImage(selectedId, { zIndex: currentZIndex + 5 });
                else updateElement(parseInt(slideIdx), elId, { zIndex: currentZIndex + 5 });
              }}
              className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-xl"
              title="Subir capa"
            >
              <FiLayers size={14} />
            </button>
            <button
              onClick={() => removeElement(parseInt(slideIdx), elId)}
              className="p-2 bg-red-50 text-red-500 rounded-xl"
            >
              <FiTrash2 size={14} />
            </button>
            <button
              onClick={() => deselectElement(null, null)}
              className="p-2 bg-gray-100 dark:bg-gray-900 text-gray-400 rounded-xl"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-contextual-bar="true" className={containerClasses}>
      <div className="flex items-center gap-3">
        
        {/* Type Icon */}
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center flex-shrink-0">
          {isText ? <FiType size={18} /> : isShape ? <FiSquare size={18} /> : <FiImage size={18} />}
        </div>

        <div className="w-px h-8 bg-gray-100 dark:bg-gray-700 flex-shrink-0 mx-1"></div>

        {/* Common: Color Picker */}
        {!isImage && (
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm bg-white flex-shrink-0">
            <input
              type="color"
              value={el.color || '#000000'}
              onChange={(e) => updateElement(parseInt(slideIdx), elId, { color: e.target.value })}
              className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-none p-0 bg-transparent"
            />
          </div>
        )}

        {/* Text Specific Controls */}
        {isText && (
          <>
            <button 
              onClick={() => updateElement(parseInt(slideIdx), elId, { bold: !el.bold })}
              className={`p-3 rounded-2xl transition-all flex-shrink-0 ${el.bold ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500'}`}
            >
              <FiBold size={18} />
            </button>
            <button 
              onClick={() => updateElement(parseInt(slideIdx), elId, { italic: !el.italic })}
              className={`p-3 rounded-2xl transition-all flex-shrink-0 ${el.italic ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-500'}`}
            >
              <FiItalic size={18} />
            </button>
            
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-2xl px-3 py-1 flex-shrink-0">
              <span className="text-[10px] font-black text-gray-400">Size</span>
              <input 
                type="number" 
                value={el.fontSize || 24}
                onChange={(e) => updateElement(parseInt(slideIdx), elId, { fontSize: parseInt(e.target.value) })}
                className="w-12 bg-transparent text-sm font-black text-indigo-600 outline-none"
              />
            </div>
          </>
        )}

        {isImage && (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-2xl px-3 py-1 flex-shrink-0">
            <FiEye size={18} className="text-gray-400" />
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.1"
              value={imagePositions[selectedId]?.opacity !== undefined ? imagePositions[selectedId].opacity : 1}
              onChange={(e) => updateImage(selectedId, { opacity: parseFloat(e.target.value) })}
              className="w-20 cursor-pointer"
            />
          </div>
        )}

        {/* Layers / Z-Index */}
         <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-2xl p-1 flex-shrink-0">
            <button 
             onClick={() => {
               if (isImage) updateImage(selectedId, { zIndex: currentZIndex + 20 });
               else updateElement(parseInt(slideIdx), elId, { zIndex: currentZIndex + 5 });
             }}
             className="p-2 text-gray-400 hover:text-indigo-600"
             title="Traer al frente"
            >
               <FiLayers size={16} />
            </button>
            <button 
             onClick={() => {
               if (isImage) updateImage(selectedId, { zIndex: currentZIndex - 20 });
               else updateElement(parseInt(slideIdx), elId, { zIndex: currentZIndex - 5 });
             }}
             className="p-2 text-gray-400 hover:text-indigo-600"
             title="Enviar al fondo"
            >
               <FiCornerUpLeft size={16} className="rotate-270" />
            </button>
         </div>

        <div className="w-px h-8 bg-gray-100 dark:bg-gray-700 flex-shrink-0 mx-1"></div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              if (isImage) {
                onRemoveImage(parseInt(slideIdx), parseInt(elId));
                deselectElement(null, null);
              } else {
                removeElement(parseInt(slideIdx), elId);
              }
            }}
            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
          >
            <FiTrash2 size={18} />
          </button>
          <button
            onClick={() => deselectElement(null, null)}
            className="p-3 bg-gray-100 dark:bg-gray-900 text-gray-400 rounded-2xl hover:bg-gray-200"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};


