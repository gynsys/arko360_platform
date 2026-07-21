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
        let maxVidDur = 0;
        // 1. Title and Content
        const tEnd = scenes[i]?.titleEndTime !== undefined ? scenes[i].titleEndTime : slideDuration;
        if (tEnd > maxVidDur) maxVidDur = tEnd;
        
        const cEnd = scenes[i]?.contentEndTime !== undefined ? scenes[i].contentEndTime : slideDuration;
        if (cEnd > maxVidDur) maxVidDur = cEnd;

        // 2. Extra Elements
        const extraEls = designer.canvas.extraElements[i] || [];
        extraEls.forEach(el => {
          const eEnd = el.endTime !== undefined ? el.endTime : slideDuration;
          if (eEnd > maxVidDur) maxVidDur = eEnd;
        });

        // 3. Videos and Images
        for (let imgIndex = 0; imgIndex < customImages.length; imgIndex++) {
           const img = customImages[imgIndex];
           const isVideo = img && (
              img.startsWith('data:video') || 
              img.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i)
           );
           
           if (isVideo) {
              const vid = document.createElement('video');
              try {
                const res = await fetch(img);
                const blob = await res.blob();
                vid.src = URL.createObjectURL(blob);
              } catch (e) {
                console.error('Error creating blob from video data URL', e);
                vid.src = img;
              }
              vid.muted = true;
              vid.loop = true; 
              vid.playsInline = true;
              vid.crossOrigin = 'anonymous';
              await new Promise(r => { vid.onloadedmetadata = r; vid.onerror = r; });
              
              const imgId = `${i}-${imgIndex}`;
              const pos = transformState?.imagePositions?.[imgId] || { x: 50, y: 70 };
              const size = transformState?.imageSizes?.[imgId] || 100;
              const rot = transformState?.imageRotations?.[imgId] || 0;
              
              const endT = pos.endTime !== undefined ? pos.endTime : slideDuration;
              if (endT > maxVidDur) maxVidDur = endT;

              currentSlideVids.push({ vid, pos, size, rot });
           } else if (img) {
              const imgId = `${i}-${imgIndex}`;
              const pos = transformState?.imagePositions?.[imgId] || { x: 50, y: 70 };
              const endT = pos.endTime !== undefined ? pos.endTime : slideDuration;
              if (endT > maxVidDur) maxVidDur = endT;
           }
        }
        if (maxVidDur < 1) maxVidDur = 1;
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
            backgroundColor: designer.design?.bgColor || '#ffffff',
            logging: false,
            allowTaint: false, // Must be false to prevent canvas tainting which breaks captureStream
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

      // WebAudio para mezclar múltiples fuentes de audio (música + videos insertados)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const audioDest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;

      // 1. Audio de fondo
      if (audioRef.current) {
        try {
          const bgStream = audioRef.current.captureStream
            ? audioRef.current.captureStream()
            : audioRef.current.mozCaptureStream();
          if (bgStream.getAudioTracks().length > 0) {
            const bgSource = audioCtx.createMediaStreamSource(bgStream);
            bgSource.connect(audioDest);
            hasAudio = true;
          }
        } catch (audioErr) {
          console.error('[Arko360] Error al conectar audio de fondo:', audioErr);
        }
      }

      // 2. Audio de los videos insertados
      slideVideos.forEach(vids => {
        vids.forEach(v => {
          try {
            // Desmutear el video para extraer el audio real.
            // Al usar createMediaElementSource, el navegador redirige el sonido al WebAudio
            // y no a los parlantes, evitando que suene duplicado.
            v.vid.muted = false; 
            const vidSource = audioCtx.createMediaElementSource(v.vid);
            vidSource.connect(audioDest);
            hasAudio = true;
          } catch(e) {
            console.error('[Arko360] Error al conectar audio de video insertado:', e);
          }
        });
      });

      const combinedTracks = [...videoStream.getVideoTracks()];
      if (hasAudio) {
        combinedTracks.push(...audioDest.stream.getAudioTracks());
      }
      const combinedStream = new MediaStream(combinedTracks);

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

      const recorder = new MediaRecorder(combinedStream, { 
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps para compresión (evita archivos de 35MB)
      });
      const chunks = [];
      // timeslice: collect data every 1s to avoid empty blob on failure
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

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

      recorder.start(1000); // emit data every 1 second (timeslice)

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

      // Capture the video track to request frames explicitly
      const videoTrack = videoStream.getVideoTracks()[0];

      // Helper: start videos + audio for a slide
      const startSlideMedia = (slideIdx) => {
        const vids = slideVideos[slideIdx] || [];
        vids.forEach(v => {
          v.vid.currentTime = v.pos.trimStart !== undefined ? v.pos.trimStart : 0;
          v.vid.playbackRate = v.pos.speed !== undefined ? v.pos.speed : 1;
          v.vid.play().catch(e => console.log('video play error', e));
        });
        const slide = scenes[slideIdx];
        const audioSrc = getActiveAudioSrc(slide.audio, slide.customAudioUrl);
        if (audioRef.current) {
          if (audioSrc) {
            audioRef.current.src = audioSrc;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio play error', e));
          } else {
            audioRef.current.pause();
          }
        }
      };

      // === PASO 3: Render loop via requestAnimationFrame (synced with captureStream) ===
      await new Promise(resolve => {
        let slideIdx = 0;
        let slideStartTime = null;  // timestamp (ms) when current slide started
        let prevSlideLastCanvas = null; // for transition

        if (capturedFrames.length === 0) { resolve(); return; }

        startSlideMedia(0);

        const renderFrame = (timestamp) => {
          // All slides done
          if (slideIdx >= capturedFrames.length) { resolve(); return; }

          if (slideStartTime === null) slideStartTime = timestamp;
          const slideElapsed = (timestamp - slideStartTime) / 1000; // seconds
          const slideDur = slideDurations[slideIdx];

          const currentSlideSnapshots = capturedFrames[slideIdx] || [];
          const currentVids = slideVideos[slideIdx] || [];
          const prevVids = slideIdx > 0 ? (slideVideos[slideIdx - 1] || []) : [];

          // Find the correct snapshot for this time point
          const currentSnap =
            currentSlideSnapshots.find(s => slideElapsed >= s.start && slideElapsed <= s.end)
            || currentSlideSnapshots[currentSlideSnapshots.length - 1];
          const currentFrameCanvas = currentSnap ? currentSnap.canvas : null;

          // === Draw frame ===
          ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          // Always fill a solid background so the canvas is never empty/transparent
          // (a transparent canvas may cause captureStream to skip emitting frames)
          ctx.fillStyle = designer.design?.bgColor || '#ffffff';
          ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

          const inTransition = slideElapsed < transitionDuration && prevSlideLastCanvas !== null;

          if (inTransition) {
            const progress = slideElapsed / transitionDuration; // 0→1
            const exitProgress = 1 - progress;

            ctx.save();
            if (transitionType === 'fade') {
              ctx.globalAlpha = exitProgress;
              drawSlide(prevSlideLastCanvas, prevVids);
            } else if (transitionType === 'slide') {
              ctx.translate(-outputCanvas.width * progress, 0);
              drawSlide(prevSlideLastCanvas, prevVids);
            } else if (transitionType === 'zoom') {
              ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
              ctx.scale(1 + progress, 1 + progress);
              ctx.globalAlpha = exitProgress;
              ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
              drawSlide(prevSlideLastCanvas, prevVids);
            }
            ctx.restore();

            ctx.save();
            if (transitionType === 'fade') {
              ctx.globalAlpha = progress;
              drawSlide(currentFrameCanvas, currentVids);
            } else if (transitionType === 'slide') {
              ctx.translate(outputCanvas.width * exitProgress, 0);
              drawSlide(currentFrameCanvas, currentVids);
            } else if (transitionType === 'zoom') {
              ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
              ctx.scale(1 + (1 - progress) * 0.2, 1 + (1 - progress) * 0.2);
              ctx.globalAlpha = progress;
              ctx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2);
              drawSlide(currentFrameCanvas, currentVids);
            }
            ctx.restore();
          } else {
            drawSlide(currentFrameCanvas, currentVids);
          }

          // Explicitly request a new frame from the captureStream
          // This is the key fix: forces the browser to emit a video frame NOW
          if (videoTrack?.requestFrame) videoTrack.requestFrame();

          // Advance to next slide when time is up
          if (slideElapsed >= slideDur) {
            prevSlideLastCanvas = currentFrameCanvas;
            currentVids.forEach(v => v.vid.pause());
            slideIdx++;
            slideStartTime = null;
            setExportProgress(40 + Math.round((slideIdx / capturedFrames.length) * 60));
            if (slideIdx < capturedFrames.length) startSlideMedia(slideIdx);
          }

          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
      });

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

