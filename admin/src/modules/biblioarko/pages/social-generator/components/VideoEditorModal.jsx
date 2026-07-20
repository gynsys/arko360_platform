import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FiX, FiCheck, FiRefreshCw, FiScissors, FiClock } from 'react-icons/fi';

const VideoEditorModal = ({ file, onClose, onApply }) => {
  const [ffmpeg, setFFmpeg] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [videoUrl, setVideoUrl] = useState(null);

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        setLoading(true);
        if (typeof SharedArrayBuffer === 'undefined' || !window.crossOriginIsolated) {
            throw new Error("El navegador no está aislado (SharedArrayBuffer no disponible). Revisa los headers COOP/COEP.");
        }
        
        const ffmpegInstance = new FFmpeg();
        ffmpegInstance.on('progress', ({ progress }) => {
          setProgress(progress * 100);
        });
        
        const baseURL = `${window.location.origin}/ffmpeg`;
        
        // Función personalizada para crear Blob y verificar 404
        const createBlob = async (url, type) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP Error ${res.status} fetching ${url}`);
          const buf = await res.arrayBuffer();
          return URL.createObjectURL(new Blob([buf], { type }));
        };

        const coreBlob = await createBlob(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmBlob = await createBlob(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

        await ffmpegInstance.load({
          coreURL: coreBlob,
          wasmURL: wasmBlob,
        });
        
        setFFmpeg(ffmpegInstance);
        setReady(true);
      } catch (err) {
        console.error('Error loading FFmpeg:', err);
        setError(`Error al inicializar FFmpeg: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadFFmpeg();

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setEndTime(videoRef.current.duration);
    }
  };

  const handleApply = async () => {
    if (!ready || !ffmpeg) return;

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const inputName = 'input.mp4';
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const args = ['-i', inputName];

      // Trim
      if (startTime > 0 || endTime < duration) {
        args.push('-ss', startTime.toString());
        args.push('-to', endTime.toString());
      }

      // Speed
      if (speed !== 1) {
        // change video speed
        args.push('-filter_complex', `[0:v]setpts=${1 / speed}*PTS[v];[0:a]atempo=${speed}[a]`);
        args.push('-map', '[v]', '-map', '[a]');
      }

      args.push(outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      
      onApply(blob);
    } catch (err) {
      console.error('Error processing video:', err);
      setError('Ocurrió un error al procesar el video. Intenta con un archivo más pequeño.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2">
            <FiScissors className="text-indigo-500" />
            Editor de Video
          </h3>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* Video Preview */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
            {videoUrl && (
              <video 
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                onLoadedMetadata={handleLoadedMetadata}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trim Controls */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FiScissors /> Recortar (Segundos)
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Inicio</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={endTime} 
                    step="0.1"
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Fin</label>
                  <input 
                    type="number" 
                    min={startTime} 
                    max={duration} 
                    step="0.1"
                    value={endTime}
                    onChange={(e) => setEndTime(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Duración original: {duration.toFixed(1)}s
              </div>
            </div>

            {/* Speed Controls */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FiClock /> Velocidad
              </h4>
              <select 
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full px-3 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value={0.5}>0.5x (Lento)</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x (Normal)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x (Rápido)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col gap-3">
          
          {loading && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                <span>{ready ? 'Procesando Video...' : 'Descargando Editor (Una sola vez)...'}</span>
                {ready && <span>{Math.round(progress)}%</span>}
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className={`px-6 py-2 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" /> Procesando
                </>
              ) : (
                <>
                  <FiCheck /> Aplicar y Usar (R:{ready?'1':'0'} L:{loading?'1':'0'} E:{error?'1':'0'} F:{ffmpeg?'1':'0'})
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VideoEditorModal;
