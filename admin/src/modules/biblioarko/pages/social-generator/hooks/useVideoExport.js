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

        const container = document.getElementById('main-slide-canvas');
        // El div #main-slide-canvas tiene transform:scale() aplicado.
        // Capturamos su hijo directo (el SlideCanvas real, sin escala CSS) para fidelidad pixel-perfect.
        const slideNode = container?.firstElementChild || container;
        if (!slideNode) {
          console.warn('[Arko360] No se encontró el SlideCanvas para el slide', i);
          capturedFrames.push([{ start: 0, end: maxVidDur, canvas: null }]);
          continue;
        }

        const videoDOMs = slideNode.querySelectorAll('video');
        videoDOMs.forEach(v => { v.style.display = 'none'; });

        // Identificar intervalos de tiempo basados en textos
        const slide = scenes[i];
        let timeEvents = [0, maxVidDur];
        
        if (slide.titleStartTime !== undefined) timeEvents.push(slide.titleStartTime);
        if (slide.titleEndTime !== undefined) timeEvents.push(slide.titleEndTime);
        if (slide.contentStartTime !== undefined) timeEvents.push(slide.contentStartTime);
        if (slide.contentEndTime !== undefined) timeEvents.push(slide.contentEndTime);
        
        const extraEls = designer.canvas.extraElements[i] || [];
        extraEls.forEach(el => {
          if (el.startTime !== undefined) timeEvents.push(el.startTime);
          if (el.endTime !== undefined) timeEvents.push(el.endTime);
        });
        
        slide.customImages?.forEach((img, imgIdx) => {
          const imgId = `${i}-${imgIdx}`;
          const pos = transformState?.imagePositions?.[imgId] || {};
          if (pos.startTime !== undefined) timeEvents.push(pos.startTime);
          if (pos.endTime !== undefined) timeEvents.push(pos.endTime);
        });

        // Filtrar, ordenar y remover duplicados
        timeEvents = [...new Set(timeEvents.filter(t => t >= 0 && t <= maxVidDur))].sort((a, b) => a - b);
        
        const snapshots = [];
        const titleNode = slideNode.querySelector('[data-export-id="title"]');
        const contentNode = slideNode.querySelector('[data-export-id="content"]');
        const extraNodes = {};
        extraEls.forEach(el => {
          const node = slideNode.querySelector(`[data-export-id="extra-${el.id}"]`);
          if (node) extraNodes[el.id] = node;
        });
        const imgNodes = {};
        slide.customImages?.forEach((img, imgIdx) => {
          const imgId = `${i}-${imgIdx}`;
          const node = slideNode.querySelector(`[data-export-id="img-${imgId}"]`);
          if (node) imgNodes[imgId] = node;
        });

        for (let t = 0; t < timeEvents.length - 1; t++) {
          const start = timeEvents[t];
          const end = timeEvents[t+1];
          if (end - start < 0.01) continue; // Ignorar intervalos muy pequeños
          
          const mid = start + 0.01; // Un punto en el tiempo dentro del intervalo
          
          // Aplicar opacidades
          if (titleNode) {
             const tStart = slide.titleStartTime !== undefined ? slide.titleStartTime : 0;
             const tEnd = slide.titleEndTime !== undefined ? slide.titleEndTime : maxVidDur;
             titleNode.style.opacity = (mid >= tStart && mid <= tEnd) ? '1' : '0';
          }
          if (contentNode) {
             const cStart = slide.contentStartTime !== undefined ? slide.contentStartTime : 0;
             const cEnd = slide.contentEndTime !== undefined ? slide.contentEndTime : maxVidDur;
             contentNode.style.opacity = (mid >= cStart && mid <= cEnd) ? '1' : '0';
          }
          extraEls.forEach(el => {
             if (extraNodes[el.id]) {
                const eStart = el.startTime !== undefined ? el.startTime : 0;
                const eEnd = el.endTime !== undefined ? el.endTime : maxVidDur;
                extraNodes[el.id].style.opacity = (mid >= eStart && mid <= eEnd) ? '1' : '0';
             }
          });
          slide.customImages?.forEach((img, imgIdx) => {
             const imgId = `${i}-${imgIdx}`;
             if (imgNodes[imgId]) {
                const pos = transformState?.imagePositions?.[imgId] || {};
                const iStart = pos.startTime !== undefined ? pos.startTime : 0;
                const iEnd = pos.endTime !== undefined ? pos.endTime : maxVidDur;
                imgNodes[imgId].style.opacity = (mid >= iStart && mid <= iEnd) ? (pos.opacity !== undefined ? pos.opacity : '1') : '0';
             }
          });

          // Pequeña pausa para que el DOM aplique estilos
          await new Promise(resolve => setTimeout(resolve, 50));

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
          
          snapshots.push({ start, end, canvas: capturedCanvas });
        }

        videoDOMs.forEach(v => { v.style.display = ''; });
        
        // Restaurar opacidades
        if (titleNode) titleNode.style.opacity = '1';
        if (contentNode) contentNode.style.opacity = '1';
        extraEls.forEach(el => { if (extraNodes[el.id]) extraNodes[el.id].style.opacity = '1'; });
        slide.customImages?.forEach((img, imgIdx) => {
          const imgId = `${i}-${imgIdx}`;
          if (imgNodes[imgId]) {
            const pos = transformState?.imagePositions?.[imgId] || {};
            imgNodes[imgId].style.opacity = pos.opacity !== undefined ? pos.opacity : '1';
          }
        });

        capturedFrames.push(snapshots.length > 0 ? snapshots : [{ start: 0, end: maxVidDur, canvas: null }]);

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
          const dSizeX = v.size * scaleX;
          const dSizeY = v.size * scaleY;
          const cx = (v.pos.x / 100) * outputCanvas.width;
          const cy = (v.pos.y / 100) * outputCanvas.height;
          
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
        const currentSlideSnapshots = capturedFrames[i] || [];
        const prevSlideSnapshots = i > 0 ? (capturedFrames[i - 1] || []) : null;
        
        // El último frame del slide anterior
        const prevFrameCanvas = prevSlideSnapshots ? prevSlideSnapshots[prevSlideSnapshots.length - 1].canvas : null;

        const currentVids = slideVideos[i] || [];
        const prevVids = i > 0 ? slideVideos[i - 1] || [] : [];
        
        currentVids.forEach(v => {
           v.vid.currentTime = 0;
           v.vid.play().catch(e => console.log('video play error', e));
        });

        const framesPerSlide = fps * slideDurations[i];

        for (let f = 0; f < framesPerSlide; f++) {
          ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          
          const currentSlideTime = f / fps;
          const currentSnap = currentSlideSnapshots.find(s => currentSlideTime >= s.start && currentSlideTime <= s.end) || currentSlideSnapshots[0];
          const currentFrameCanvas = currentSnap ? currentSnap.canvas : null;

          const inTransition = f < transitionFrames && prevFrameCanvas !== null;

          if (inTransition) {
            const progress = f / transitionFrames; // 0 → 1
            const exitProgress = 1 - progress;

            // Dibujar frame anterior (saliendo)
            ctx.save();
            if (transitionType === 'fade') {
              ctx.globalAlpha = exitProgress;
              drawSlide(prevFrameCanvas, prevVids);
            } else if (transitionType === 'slide') {
              ctx.translate(-outputCanvas.width * progress, 0);
              drawSlide(prevFrameCanvas, prevVids);
            } else if (transitionType === 'zoom') {
              ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
              ctx.scale(1 + progress, 1 + progress);
              ctx.globalAlpha = exitProgress;
              ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
              drawSlide(prevFrameCanvas, prevVids);
            }
            ctx.restore();

            // Dibujar frame actual (entrando)
            ctx.save();
            if (transitionType === 'fade') {
              ctx.globalAlpha = progress;
              drawSlide(currentFrameCanvas, currentVids);
            } else if (transitionType === 'slide') {
              ctx.translate(outputCanvas.width * exitProgress, 0);
              drawSlide(currentFrameCanvas, currentVids);
            } else if (transitionType === 'zoom') {
              ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
              ctx.scale(1 + (1 - progress) * 0.2, 1 + (1 - progress) * 0.2); // slight zoom out
              ctx.globalAlpha = progress;
              ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
              drawSlide(currentFrameCanvas, currentVids);
            }
            ctx.restore();
          } else {
            // Animación Normal (sin transición)
            drawSlide(currentFrameCanvas, currentVids);
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

