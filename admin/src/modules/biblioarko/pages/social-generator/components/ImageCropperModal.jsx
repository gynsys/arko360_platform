import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FiCrop, FiCheck, FiX } from 'react-icons/fi';

// Utility to create the cropped image data URL
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/png');
}

export const ImageCropperModal = ({ isOpen, onClose, imageUrl, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (croppedAreaPixels) {
      setIsProcessing(true);
      try {
        const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
      setIsProcessing(false);
    }
    onClose();
  };

  if (!isOpen || !imageUrl) return null;

  const aspectOptions = [
    { label: 'Libre', value: undefined },
    { label: '1:1', value: 1 },
    { label: '4:5', value: 4 / 5 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h2 className="text-sm font-black uppercase text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <FiCrop size={16} className="text-indigo-500" />
            Recortar Imagen
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-400 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-[450px] bg-gray-100 dark:bg-gray-950">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        {/* Aspect Ratio Presets */}
        <div className="px-6 pt-4 bg-white dark:bg-gray-800 flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase mr-2">Formato:</span>
          {aspectOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setAspect(opt.value)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                aspect === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="p-6 bg-white dark:bg-gray-800 flex items-center justify-between">
          <div className="flex-1 mr-8">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="w-full accent-indigo-500"
            />
          </div>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <FiCheck size={18} /> {isProcessing ? 'Procesando...' : 'Aplicar Recorte'}
          </button>
        </div>
      </div>
    </div>
  );
};
