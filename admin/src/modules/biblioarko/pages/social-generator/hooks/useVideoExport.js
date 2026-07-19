import { useState } from 'react';
import html2canvas from 'html2canvas';
import { blogService } from '../../../services/blogService';
import { isCapacitor, downloadFile, openExternalFile } from '../../../../../utils/platform';

export const useVideoExport = (
  generatedContent, videoStyles, slideDuration, transitionType, transitionDuration,
  selectedPost, audioRef, getActiveAudioSrc, showToast,
  designer, transformState
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

      const slideVideos = [];
      const slideDurations = [];
      const isVideoMode = generatedContent?.video_slides ? true : false;
      const scaleX = 720 / 410;
      const scaleY = 1280 / (isVideoMode ? 728 : 410);

      for (let i = 0; i < scenes.length; i++) {
        designer.canvas.setCurrentSlidePage(i);
        // Esperar que React renderice (imágenes, gradientes SVG)
        await new Promise(resolve => setTimeout(resolve, 1200));

        const container = document.getElementById('main-slide-canvas');
        // El div #main-slide-canvas tiene transform:scale() aplicado.
        // Capturamos su hijo directo (el SlideCanvas real, sin escala CSS) para fidelidad pixel-perfect.
        const slideNode = container?.firstElementChild || container;
        if (!slideNode) {
          console.warn('[Arko360] No se encontró el SlideCanvas para el slide', i);
          capturedFrames.push(null);
          continue;
        }

        const videoDOMs = slideNode.querySelectorAll('video');
        videoDOMs.forEach(v => { v.style.display = 'none'; });

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

        videoDOMs.forEach(v => { v.style.display = ''; });

        capturedFrames.push(capturedCanvas);

        // Preload videos for this slide and calculate max duration
        const customImages = scenes[i].customImages || [];
        const currentSlideVids = [];
        let maxVidDur = slideDuration;

        for (let imgIndex = 0; imgIndex < customImages.length; imgIndex++) {
           const img = customImages[imgIndex];
           if (img && img.startsWith('data:video')) {
              const vid = document.createElement('video');
              vid.src = img;
              vid.muted = true;
              vid.loop = true; 
              vid.playsInline = true;
              await new Promise(r => { vid.onloadedmetadata = r; vid.onerror = r; });
              
              if (vid.duration && vid.duration > maxVidDur) {
                 maxVidDur = vid.duration;
              }

              const imgId = `${i}-${imgIndex}`;
              const pos = transformState?.imagePositions?.[imgId] || { x: 0, y: 0 };
              const size = transformState?.imageSizes?.[imgId] || 150;
              const rot = transformState?.imageRotations?.[imgId] || 0;

              currentSlideVids.push({ vid, pos, size, rot });
           }
        }
        slideVideos.push(currentSlideVids);
        slideDurations.push(maxVidDur);

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
              await playPromise.catch(e => console.log('[Arko360] Audio play prevented:', e));
            }
            // Pequeña pausa para asegurar que el buffer de audio haya iniciado
            await new Promise(r => setTimeout(r, 150));
            const audioStream = audioRef.current.captureStream
              ? audioRef.current.captureStream()
              : audioRef.current.mozCaptureStream();
            combinedStream = new MediaStream([
              ...videoStream.getVideoTracks(),
              ...audioStream.getAudioTracks(),
            ]);
          }
        } catch (audioErr) {
          console.error('[Arko360] Error setting up audio:', audioErr);
          combinedStream = videoStream;
        }
      }

      let mimeType = 'video/webm;codecs=vp9,opus';
      let extension = 'webm';
      let blobType = 'video/webm';
      
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
        mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
        extension = 'mp4';
        blobType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        extension = 'mp4';
        blobType = 'video/mp4';
      }

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);

      recorder.onstop = async () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsExporting(false);
        setExportStatus('downloading');

        const blob = new Blob(chunks, { type: blobType });
        const filename = `video_arko360_${selectedPost?.id || 'export'}.${extension}`;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
          if (isCapacitor()) {
            const { file_id, extension } = await blogService.uploadForDownload(blob, filename);
            const apiBase = (
              import.meta.env.VITE_API_BASE_URL || 'https://api.arko360.net/api/v1'
            ).replace(/\/$/, '');
            openExternalFile(`${apiBase}/blog/download/${file_id}?ext=${extension}`);
          } else if (isMobile) {
            const { file_id, extension } = await blogService.uploadForDownload(blob, filename);
            const apiBase = (
              import.meta.env.VITE_API_BASE_URL || 'https://api.arko360.net/api/v1'
            ).replace(/\/$/, '');
            window.location.href = `${apiBase}/blog/download/${file_id}?ext=${extension}`;
          } else {
            downloadFile(blob, filename);
          }
          setExportStatus('done');
          setTimeout(() => setExportStatus('idle'), 5000);
        } catch (err) {
          console.error('[Arko360] Download error:', err);
          downloadFile(blob, filename);
          setExportStatus('done');
          setTimeout(() => setExportStatus('idle'), 5000);
        }
      };

      recorder.start();

      const fps = 30;
      const transitionFrames = Math.round(fps * transitionDuration);

      const drawSlide = (frameImg, vids) => {
        if (frameImg) {
          ctx.drawImage(frameImg, 0, 0, outputCanvas.width, outputCanvas.height);
        }
        vids.forEach(v => {
          ctx.save();
          const dx = v.pos.x * scaleX;
          const dy = v.pos.y * scaleY;
          const dSizeX = v.size * scaleX;
          const dSizeY = v.size * scaleY;
          const cx = dx + dSizeX / 2;
          const cy = dy + dSizeY / 2;
          
          ctx.translate(cx, cy);
          ctx.rotate(v.rot * Math.PI / 180);
          ctx.translate(-dSizeX / 2, -dSizeY / 2);
          
          if (v.vid.videoWidth && v.vid.videoHeight) {
            const vidRatio = v.vid.videoWidth / v.vid.videoHeight;
            let drawW = dSizeX;
            let drawH = dSizeY;
            let offsetX = 0;
            let offsetY = 0;
            if (vidRatio > 1) { // wider
               drawH = dSizeX / vidRatio;
               offsetY = (dSizeY - drawH) / 2;
            } else if (vidRatio < 1) { // taller
               drawW = dSizeY * vidRatio;
               offsetX = (dSizeX - drawW) / 2;
            }
            ctx.drawImage(v.vid, offsetX, offsetY, drawW, drawH);
          }
          ctx.restore();
        });
      };

      for (let i = 0; i < capturedFrames.length; i++) {
        const currentFrame = capturedFrames[i];
        const prevFrame = i > 0 ? capturedFrames[i - 1] : null;

        const currentVids = slideVideos[i] || [];
        const prevVids = i > 0 ? slideVideos[i - 1] || [] : [];
        
        currentVids.forEach(v => {
           v.vid.currentTime = 0;
           v.vid.play().catch(e => console.log('video play error', e));
        });

        const framesPerSlide = fps * slideDurations[i];

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
            drawSlide(prevFrame, prevVids);
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
            drawSlide(currentFrame, currentVids);
            ctx.restore();
          } else {
            // Frame estático
            drawSlide(currentFrame, currentVids);
          }

          await new Promise(r => setTimeout(r, 1000 / fps));
        }

        currentVids.forEach(v => {
           v.vid.pause();
        });

        setExportProgress(40 + Math.round(((i + 1) / scenes.length) * 60)); // 40-100%
      }

      recorder.stop();
    } catch (err) {
      console.error('[Arko360] Error al exportar video:', err);
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

