import { useState } from 'react';
import html2canvas from 'html2canvas';
import { blogService } from '../../../services/blogService';
import { isCapacitor, downloadFile, openExternalFile } from '../../../../../utils/platform';

export const useVideoExport = (
  generatedContent, videoStyles, slideDuration, transitionType, transitionDuration,
  selectedPost, audioRef, getActiveAudioSrc, showToast,
  designer
) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('idle');

  const handleExportVideo = async () => {
    const scenes = generatedContent?.video_slides || generatedContent?.slides;
    if (!scenes || !Array.isArray(scenes)) {
      showToast('No hay escenas para exportar', 'error');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('exporting');

    try {
      // === PASO 1: Capturar cada slide como imagen usando html2canvas ===
      const capturedFrames = [];

      // Ocultar controles de UI
      const actionButtons = document.querySelectorAll('.slide-actions');
      actionButtons.forEach(btn => (btn.style.display = 'none'));

      const originalPage = designer.canvas.currentSlidePage;
      designer.canvas.setSelectedExtraId(null);
      designer.canvas.setSelectedImageId(null);
      designer.canvas.setSelectedContentIndex(null);
      designer.canvas.setIsExportMode(true);

      for (let i = 0; i < scenes.length; i++) {
        designer.canvas.setCurrentSlidePage(i);
        // Esperar que React renderice (imágenes, gradientes SVG)
        await new Promise(resolve => setTimeout(resolve, 1200));

        const container = document.getElementById('main-slide-canvas');
        // El div #main-slide-canvas tiene transform:scale() aplicado.
        // Capturamos su hijo directo (el SlideCanvas real, sin escala CSS) para fidelidad pixel-perfect.
        const slideNode = container?.firstElementChild || container;
        if (!slideNode) {
          console.warn('[GynSys] No se encontró el SlideCanvas para el slide', i);
          capturedFrames.push(null);
          continue;
        }

        const capturedCanvas = await html2canvas(slideNode, {
          useCORS: true,
          scale: 2,
          backgroundColor: designer.design.bgColor || '#ffffff',
          logging: false,
          allowTaint: true,
          imageTimeout: 15000,
          removeContainer: false,
          foreignObjectRendering: false,
        });

        capturedFrames.push(capturedCanvas);
        setExportProgress(Math.round(((i + 1) / scenes.length) * 40)); // Primero 40%
      }

      // Restaurar UI
      actionButtons.forEach(btn => (btn.style.display = 'flex'));
      designer.canvas.setCurrentSlidePage(originalPage);
      designer.canvas.setIsExportMode(false);

      // === PASO 2: Componer el video con las capturas ===
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = 720;
      outputCanvas.height = 1280;
      const ctx = outputCanvas.getContext('2d');

      const videoStream = outputCanvas.captureStream(30);
      let combinedStream = videoStream;

      const audioSrc = getActiveAudioSrc();
      if (audioRef.current && audioSrc) {
        try {
          audioRef.current.src = audioSrc;
          audioRef.current.load();
          await Promise.race([
            new Promise(resolve => {
              if (audioRef.current) audioRef.current.oncanplaythrough = resolve;
              else resolve();
            }),
            new Promise(resolve => setTimeout(resolve, 5000)),
          ]);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => console.log('[GynSys] Audio play prevented:', e));
            }
            const audioStream = audioRef.current.captureStream
              ? audioRef.current.captureStream()
              : audioRef.current.mozCaptureStream();
            combinedStream = new MediaStream([
              ...videoStream.getVideoTracks(),
              ...audioStream.getAudioTracks(),
            ]);
          }
        } catch (audioErr) {
          console.error('[GynSys] Error setting up audio:', audioErr);
          combinedStream = videoStream;
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);

      recorder.onstop = async () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsExporting(false);
        setExportStatus('downloading');

        const blob = new Blob(chunks, { type: 'video/mp4' });
        const filename = `video_gynsys_${selectedPost?.id || 'export'}.mp4`;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
          if (isCapacitor()) {
            const { file_id, extension } = await blogService.uploadForDownload(blob, filename);
            const apiBase = (
              import.meta.env.VITE_API_BASE_URL || 'https://api.gynsys.net/api/v1'
            ).replace(/\/$/, '');
            openExternalFile(`${apiBase}/blog/download/${file_id}?ext=${extension}`);
          } else if (isMobile) {
            const { file_id, extension } = await blogService.uploadForDownload(blob, filename);
            const apiBase = (
              import.meta.env.VITE_API_BASE_URL || 'https://api.gynsys.net/api/v1'
            ).replace(/\/$/, '');
            window.location.href = `${apiBase}/blog/download/${file_id}?ext=${extension}`;
          } else {
            downloadFile(blob, filename);
          }
          setExportStatus('done');
          setTimeout(() => setExportStatus('idle'), 5000);
        } catch (err) {
          console.error('[GynSys] Download error:', err);
          downloadFile(blob, filename);
          setExportStatus('done');
          setTimeout(() => setExportStatus('idle'), 5000);
        }
      };

      recorder.start();

      const fps = 30;
      const framesPerSlide = fps * slideDuration;
      const transitionFrames = Math.round(fps * transitionDuration);

      for (let i = 0; i < capturedFrames.length; i++) {
        const currentFrame = capturedFrames[i];
        const prevFrame = i > 0 ? capturedFrames[i - 1] : null;

        for (let f = 0; f < framesPerSlide; f++) {
          ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

          const inTransition = f < transitionFrames && prevFrame !== null;

          if (inTransition) {
            const progress = f / transitionFrames; // 0 → 1
            const exitProgress = 1 - progress;

            // Dibujar frame anterior (saliendo)
            ctx.save();
            if (transitionType === 'fade') {
              ctx.globalAlpha = exitProgress;
            } else if (transitionType === 'slide') {
              ctx.translate(-progress * outputCanvas.width, 0);
            } else if (transitionType === 'zoom') {
              ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
              ctx.scale(1 + progress * 0.2, 1 + progress * 0.2);
              ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
              ctx.globalAlpha = exitProgress;
            }
            if (prevFrame) {
              ctx.drawImage(prevFrame, 0, 0, outputCanvas.width, outputCanvas.height);
            }
            ctx.restore();

            // Dibujar frame actual (entrando)
            ctx.save();
            if (transitionType === 'fade') {
              ctx.globalAlpha = progress;
            } else if (transitionType === 'slide') {
              ctx.translate(outputCanvas.width - progress * outputCanvas.width, 0);
            } else if (transitionType === 'zoom') {
              ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
              ctx.scale(progress, progress);
              ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
              ctx.globalAlpha = progress;
            }
            if (currentFrame) {
              ctx.drawImage(currentFrame, 0, 0, outputCanvas.width, outputCanvas.height);
            }
            ctx.restore();
          } else {
            // Frame estático
            if (currentFrame) {
              ctx.drawImage(currentFrame, 0, 0, outputCanvas.width, outputCanvas.height);
            }
          }

          await new Promise(r => setTimeout(r, 1000 / fps));
        }

        setExportProgress(40 + Math.round(((i + 1) / scenes.length) * 60)); // 40-100%
      }

      recorder.stop();
    } catch (err) {
      console.error('[GynSys] Error al exportar video:', err);
      setIsExporting(false);
      showToast('Error al renderizar el video', 'error');
    }
  };

  return {
    handleExportVideo,
    isExporting,
    exportProgress,
    exportStatus,
  };
};
