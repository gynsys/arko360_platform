import { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import fixWebmDuration from 'fix-webm-duration';
import { blogService } from '../../../services/blogService';
import { isCapacitor, downloadFile, openExternalFile } from '../../../../../utils/platform';

export const useVideoExport = (
  generatedContent, videoStyles, slideDuration, transitionType, transitionDuration,
  selectedPost, audioRef, globalAudioRef, getActiveAudioSrc, showToast,
  designer, transformState
) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('idle');

  // Refs para controlar la cancelación y estado del export
  const abortRef = useRef(false);
  const audioCtxRef = useRef(null);
  const isMountedRef = useRef(true);
  const blobUrlsRef = useRef([]);

  // Cleanup al desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper: setState seguro (solo si el componente está montado)
  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  // Helper: revocar todos los blob URLs acumulados
  const revokeAllBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignorar errores de revocación
      }
    });
    blobUrlsRef.current = [];
  }, []);

  const handleExportVideo = useCallback(async () => {
    // === VALIDACIÓN INICIAL ===
    const scenes = generatedContent?.video_slides || generatedContent?.slides;
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      showToast('No hay escenas para exportar', 'error');
      return;
    }

    // Verificar que html2canvas esté disponible
    if (typeof html2canvas !== 'function') {
      showToast('Error: html2canvas no está disponible', 'error');
      return;
    }

    // Limpiar estado anterior
    revokeAllBlobUrls();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch (e) {
        console.error('[Arko360] Error cerrando AudioContext previo:', e);
      }
      audioCtxRef.current = null;
    }

    abortRef.current = false;
    safeSetState(setIsExporting, true);
    safeSetState(setExportProgress, 0);
    safeSetState(setExportStatus, 'capturing');

    let actionButtons = [];
    let originalPage = 0;
    let capturedFrames = [];
    let slideVideos = [];
    let slideDurations = [];
    let outputCanvas = null;
    let ctx = null;
    let recorder = null;
    let audioCtx = null;
    let audioDest = null;
    let exportBgAudio = null;
    let exportLocalAudio = null;
    let videoStream = null;
    let combinedStream = null;
    let chunks = [];

    try {
      // ============================================================
      // PASO 1: CAPTURAR TODOS LOS FRAMES CON HTML2CANVAS
      // (Completamente separado del renderizado/video)
      // ============================================================

      const isVideoMode = generatedContent?.video_slides ? true : false;
      const scaleX = 720 / 410;
      const scaleY = 1280 / (isVideoMode ? 728 : 410);

      // Ocultar controles de UI
      actionButtons = document.querySelectorAll('.slide-actions');
      actionButtons.forEach(btn => (btn.style.display = 'none'));

      originalPage = designer.canvas.currentSlidePage;
      designer.canvas.setSelectedExtraId(null);
      designer.canvas.setSelectedImageId(null);
      designer.canvas.setSelectedContentIndex(null);
      designer.canvas.setIsExportMode(true);

      for (let i = 0; i < scenes.length; i++) {
        if (abortRef.current) throw new Error('Export cancelled');

        designer.canvas.setCurrentSlidePage(i);

        // Esperar que React renderice (imágenes, gradientes SVG)
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Preload videos for this slide and calculate max duration
        const customImages = scenes[i].customImages || [];
        const currentSlideVids = [];
        let maxVidDur = 0;

        // 1. Title and Content durations
        const tEnd = scenes[i]?.titleEndTime !== undefined ? scenes[i].titleEndTime : slideDuration;
        if (tEnd > maxVidDur) maxVidDur = tEnd;

        const cEnd = scenes[i]?.contentEndTime !== undefined ? scenes[i].contentEndTime : slideDuration;
        if (cEnd > maxVidDur) maxVidDur = cEnd;

        // 2. Extra Elements durations
        const extraEls = designer.canvas.extraElements[i] || [];
        extraEls.forEach(el => {
          const eEnd = el.endTime !== undefined ? el.endTime : slideDuration;
          if (eEnd > maxVidDur) maxVidDur = eEnd;
        });

        // 3. Videos and Images durations
        for (let imgIndex = 0; imgIndex < customImages.length; imgIndex++) {
          const img = customImages[imgIndex];
          const isVideo = img && (
            img.startsWith('data:video') || 
            img.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i)
          );

          if (isVideo) {
            const vid = document.createElement('video');

            // ✅ FIX BUG #11: crossOrigin ANTES de src
            vid.crossOrigin = 'anonymous';
            vid.muted = true;
            vid.loop = true; 
            vid.playsInline = true;

            try {
              const res = await fetch(img);
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              blobUrlsRef.current.push(blobUrl); // ✅ FIX BUG #1: trackear para revocar
              vid.src = blobUrl;
            } catch (e) {
              console.error('[Arko360] Error creating blob from video data URL', e);
              vid.src = img;
            }

            // ✅ FIX BUG #5: Verificar readyState antes de esperar eventos
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Video load timeout'));
              }, 10000);

              const onLoaded = () => {
                clearTimeout(timeout);
                resolve();
              };

              if (vid.readyState >= 1) {
                onLoaded();
              } else {
                vid.onloadedmetadata = onLoaded;
                vid.onerror = (e) => {
                  clearTimeout(timeout);
                  reject(e);
                };
              }
            });

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
        const slideNode = container?.firstElementChild || container;

        if (!slideNode) {
          console.warn('[Arko360] No se encontró el SlideCanvas para el slide', i);
          capturedFrames.push([{ start: 0, end: maxVidDur, canvas: null }]);
          continue;
        }

        // Ocultar videos DOM para que no interfieran con html2canvas
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

        // Capturar snapshot para cada intervalo de tiempo
        for (let t = 0; t < timeEvents.length - 1; t++) {
          if (abortRef.current) throw new Error('Export cancelled');

          const start = timeEvents[t];
          const end = timeEvents[t + 1];
          if (end - start < 0.01) continue;

          const mid = start + 0.01;

          // Aplicar opacidades según el tiempo
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
            allowTaint: false,
            imageTimeout: 15000,
            removeContainer: false,
            foreignObjectRendering: false,
          });

          snapshots.push({ start, end, canvas: capturedCanvas });
        }

        // Restaurar videos DOM
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

        safeSetState(setExportProgress, Math.round(((i + 1) / scenes.length) * 40));
      }

      // Restaurar UI
      actionButtons.forEach(btn => (btn.style.display = 'flex'));
      designer.canvas.setCurrentSlidePage(originalPage);
      designer.canvas.setIsExportMode(false);

      // ============================================================
      // PASO 2: INICIALIZAR AUDIO Y STREAMS (después de la captura)
      // ============================================================

      if (abortRef.current) throw new Error('Export cancelled');
      safeSetState(setExportStatus, 'rendering');

      // ✅ DEBUG: Log de duraciones para verificar
      console.log('=== DEBUG EXPORT ===');
      console.log('slideDuration param:', slideDuration);
      console.log('slideDurations:', slideDurations);
      console.log('totalSlideDuration:', slideDurations.reduce((a, b) => a + b, 0));
      console.log('transitionDuration:', transitionDuration);
      console.log('totalTransitionDuration:', (capturedFrames.length - 1) * transitionDuration);
      console.log('====================');

      // Crear AudioContext (debe ser después de interacción del usuario)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      audioDest = audioCtx.createMediaStreamDestination();
      let hasAudio = false;

      // ✅ FIX BUG #12: Limpiar audio residual antes de configurar
      exportBgAudio = new Audio();
      exportBgAudio.crossOrigin = 'anonymous';
      try {
        const bgSource = audioCtx.createMediaElementSource(exportBgAudio);
        bgSource.connect(audioDest);
        hasAudio = true;
      } catch (audioErr) {
        console.error('[Arko360] Error al conectar audio de fondo global:', audioErr);
      }

      exportLocalAudio = new Audio();
      exportLocalAudio.crossOrigin = 'anonymous';
      try {
        const localSource = audioCtx.createMediaElementSource(exportLocalAudio);
        localSource.connect(audioDest);
      } catch (audioErr) {
        console.error('[Arko360] Error al conectar audio local:', audioErr);
      }

      // Conectar audio de videos insertados
      slideVideos.forEach(vids => {
        vids.forEach(v => {
          try {
            v.vid.muted = false;
            const vidSource = audioCtx.createMediaElementSource(v.vid);
            vidSource.connect(audioDest);
            hasAudio = true;
          } catch(e) {
            console.error('[Arko360] Error al conectar audio de video insertado:', e);
          }
        });
      });

      // Silenciar previews del editor
      if (audioRef.current) audioRef.current.pause();
      if (globalAudioRef.current) globalAudioRef.current.pause();

      // Crear canvas de salida
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = 720;
      outputCanvas.height = 1280;
      ctx = outputCanvas.getContext('2d');

      videoStream = outputCanvas.captureStream(30);
      const videoTrack = videoStream.getVideoTracks()[0];

      const combinedTracks = [...videoStream.getVideoTracks()];
      if (hasAudio) {
        combinedTracks.push(...audioDest.stream.getAudioTracks());
      }
      combinedStream = new MediaStream(combinedTracks);

      // Determinar formato soportado
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

      // ✅ FIX BUG #9: Verificar que MediaRecorder esté soportado
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error('MediaRecorder no soporta ningún formato de video');
      }

      recorder = new MediaRecorder(combinedStream, { 
        mimeType,
        videoBitsPerSecond: 1500000
      });

      chunks = [];
      recorder.ondataavailable = e => { 
        if (e.data && e.data.size > 0) chunks.push(e.data); 
      };

      recorder.onstop = async () => {
        // Cleanup audio
        exportBgAudio?.pause();
        exportBgAudio?.removeAttribute('src');
        exportBgAudio?.load();
        exportLocalAudio?.pause();
        exportLocalAudio?.removeAttribute('src');
        exportLocalAudio?.load();

        // ✅ FIX BUG #2: Pausar todos los videos insertados
        slideVideos.forEach(vids => {
          vids.forEach(v => {
            try {
              v.vid.pause();
              v.vid.removeAttribute('src');
              v.vid.load();
            } catch (e) {
              console.error('[Arko360] Error pausando video:', e);
            }
          });
        });

        // ✅ FIX BUG #1: Revocar blob URLs
        revokeAllBlobUrls();

        if (audioCtx?.state !== 'closed') {
          audioCtx.close();
        }
        audioCtxRef.current = null;

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        safeSetState(setIsExporting, false);
        safeSetState(setExportStatus, 'downloading');

        const rawBlob = new Blob(chunks, { type: blobType });
        const durationMs = Math.round(totalDuration * 1000);

        // ✅ FIX CRÍTICO: Inyectar metadatos de duración en la cabecera del video
        // Chrome MediaRecorder NO escribe la duración en la cabecera por defecto,
        // lo que provocaba que el Reproductor de Windows muestre '--:--' o tiempos erróneos.
        let blob = rawBlob;
        if (typeof fixWebmDuration === 'function' && durationMs > 0) {
          try {
            blob = await new Promise((resolve) => {
              fixWebmDuration(rawBlob, durationMs, (fixedBlob) => resolve(fixedBlob));
            });
          } catch (fixErr) {
            console.warn('[Arko360] No se pudo inyectar metadatos de duración:', fixErr);
            blob = rawBlob;
          }
        }

        // ✅ DEBUG: Log del blob generado
        console.log('=== VIDEO GENERADO ===');
        console.log('Tamaño del blob:', blob.size, 'bytes');
        console.log('Duración inyectada:', durationMs, 'ms');
        console.log('Tipo:', blobType);
        console.log('=======================');

        const filename = `video_arko360_${selectedPost?.id || 'export'}.${extension}`;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
          if (isCapacitor()) {
            const { file_id, extension: ext } = await blogService.uploadForDownload(blob, filename);
            const apiBase = (
              import.meta.env.VITE_API_BASE_URL || 'https://api.arko360.net/api/v1'
            ).replace(/\/$/, '');
            openExternalFile(`${apiBase}/blog/download/${file_id}?ext=${ext}`);
          } else if (isMobile) {
            const { file_id, extension: ext } = await blogService.uploadForDownload(blob, filename);
            const apiBase = (
              import.meta.env.VITE_API_BASE_URL || 'https://api.arko360.net/api/v1'
            ).replace(/\/$/, '');
            window.location.href = `${apiBase}/blog/download/${file_id}?ext=${ext}`;
          } else {
            downloadFile(blob, filename);
          }
          safeSetState(setExportStatus, 'done');
          setTimeout(() => safeSetState(setExportStatus, 'idle'), 5000);
        } catch (err) {
          console.error('[Arko360] Download error:', err);
          downloadFile(blob, filename);
          safeSetState(setExportStatus, 'done');
          setTimeout(() => safeSetState(setExportStatus, 'idle'), 5000);
        }
      };

      recorder.onerror = (e) => {
        console.error('[Arko360] MediaRecorder error:', e);
        safeSetState(setIsExporting, false);
        safeSetState(setExportStatus, 'idle');
        showToast('Error en la grabación del video', 'error');
      };

      // ============================================================
      // PASO 3: RENDER LOOP DETERMINISTA (basada en frames, NO RAF)
      // ============================================================

      const fps = 30;
      const frameDurationMs = 1000 / fps;

      // Calcular duración total del video
      const totalSlideDuration = slideDurations.reduce((a, b) => a + b, 0);
      const totalTransitionDuration = (capturedFrames.length - 1) * transitionDuration;
      const totalDuration = totalSlideDuration + totalTransitionDuration;
      const totalFrames = Math.ceil(totalDuration * fps);

      // ✅ DEBUG
      console.log('=== RENDER LOOP ===');
      console.log('totalDuration:', totalDuration, 's');
      console.log('totalFrames:', totalFrames);
      console.log('fps:', fps);
      console.log('frameDurationMs:', frameDurationMs);
      console.log('===================');

      // Helper: dibujar slide
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
            if (vidRatio > 1) {
              drawH = dSizeX / vidRatio;
              offsetY = (dSizeY - drawH) / 2;
            } else if (vidRatio < 1) {
              drawW = dSizeY * vidRatio;
              offsetX = (dSizeX - drawW) / 2;
            }
            ctx.drawImage(v.vid, offsetX, offsetY, drawW, drawH);
          }
          ctx.restore();
        });
      };

      // Estado del audio
      let currentPlayingAudioSrc = null;
      let currentGlobalAudioSrc = null;

      // Iniciar global audio
      const globalAudioSrc = getActiveAudioSrc(
        generatedContent?.videoSettings?.globalAudio, 
        generatedContent?.videoSettings?.globalCustomAudioUrl
      );
      if (globalAudioSrc) {
        currentGlobalAudioSrc = globalAudioSrc;
        exportBgAudio.src = globalAudioSrc;
        exportBgAudio.currentTime = 0;
        exportBgAudio.play().catch(e => console.log('Global Audio play error', e));
      }

      // Helper: iniciar media de un slide
      const startSlideMedia = (slideIdx) => {
        const vids = slideVideos[slideIdx] || [];
        vids.forEach(v => {
          v.vid.currentTime = v.pos.trimStart !== undefined ? v.pos.trimStart : 0;
          v.vid.playbackRate = v.pos.speed !== undefined ? v.pos.speed : 1;
          v.vid.play().catch(e => console.log('video play error', e));
        });

        const slide = scenes[slideIdx];
        const audioSrc = getActiveAudioSrc(slide.audio, slide.customAudioUrl);

        if (audioSrc) {
          if (currentPlayingAudioSrc !== audioSrc) {
            currentPlayingAudioSrc = audioSrc;
            exportLocalAudio.src = audioSrc;
            exportLocalAudio.currentTime = 0;
          } else if (exportLocalAudio.paused) {
            exportLocalAudio.currentTime = 0;
            // ✅ FIX BUG #6: Reiniciar reproducción si estaba pausado
            exportLocalAudio.play().catch(e => console.log('Local Audio play error', e));
          }
        } else {
          currentPlayingAudioSrc = null;
          exportLocalAudio.pause();
        }
      };

      // Iniciar recorder AHORA, justo antes del      // ✅ FIX DEFINTIVO: Render loop sincronizado con tiempo real (performance.now() + rAF)
      recorder.start(100);

      await new Promise((resolve, reject) => {
        let slideIdx = 0;
        let prevSlideLastCanvas = null;

        if (capturedFrames.length === 0) { 
          resolve(); 
          return; 
        }

        startSlideMedia(0);
        const startTime = performance.now();

        const renderFrame = () => {
          if (abortRef.current) {
            reject(new Error('Export cancelled'));
            return;
          }

          const now = performance.now();
          const videoTime = (now - startTime) / 1000;

          // ✅ DETENERSE EXACTAMENTE AL ALCANZAR LA DURACIÓN TOTAL DEL PROYECTO (ej. 18.0s o 28.0s)
          if (videoTime >= totalDuration) {
            console.log('[Arko360] Render loop completado en tiempo real:', videoTime.toFixed(2), 's (Duración esperada:', totalDuration, 's)');
            resolve();
            return;
          }

          // Calcular en qué slide estamos basándonos en duraciones acumuladas
          let accumulatedTime = 0;
          let currentSlideIdx = 0;
          let slideStartTime = 0;

          for (let s = 0; s < capturedFrames.length; s++) {
            const slideDur = slideDurations[s];
            const transitionTime = s > 0 ? transitionDuration : 0;

            if (videoTime < accumulatedTime + transitionTime + slideDur) {
              currentSlideIdx = s;
              slideStartTime = accumulatedTime + transitionTime;
              break;
            }
            accumulatedTime += transitionTime + slideDur;
          }

          // Iniciar audio / video del nuevo slide
          if (currentSlideIdx !== slideIdx) {
            const prevVids = slideVideos[slideIdx] || [];
            prevVids.forEach(v => v.vid.pause());

            prevSlideLastCanvas = capturedFrames[slideIdx]?.[
              capturedFrames[slideIdx].length - 1
            ]?.canvas || null;

            slideIdx = currentSlideIdx;

            const slideElapsed = videoTime - slideStartTime;
            if (slideIdx < capturedFrames.length && slideElapsed >= transitionDuration) {
              startSlideMedia(slideIdx);
            }
          }

          const slideElapsed = videoTime - slideStartTime;
          if (slideIdx > 0 && slideElapsed >= transitionDuration && slideElapsed < transitionDuration + 0.05) {
            startSlideMedia(slideIdx);
          }

          const slideDur = slideDurations[slideIdx];

          const currentSlideSnapshots = capturedFrames[slideIdx] || [];
          const currentVids = slideVideos[slideIdx] || [];
          const prevVids = slideIdx > 0 ? (slideVideos[slideIdx - 1] || []) : [];

          // Encontrar el snapshot correcto para este tiempo
          const currentSnap = currentSlideSnapshots.find(
            s => slideElapsed >= s.start && slideElapsed <= s.end
          ) || currentSlideSnapshots[currentSlideSnapshots.length - 1];

          const currentFrameCanvas = currentSnap ? currentSnap.canvas : null;

          // === DIBUJAR FRAME ===
          ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          ctx.fillStyle = designer.design?.bgColor || '#ffffff';
          ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

          const effectiveTransitionDuration = transitionDuration > 0.001 ? transitionDuration : 0;
          const inTransition = effectiveTransitionDuration > 0 && 
                               slideElapsed < effectiveTransitionDuration && 
                               prevSlideLastCanvas !== null && 
                               slideIdx > 0;

          if (inTransition) {
            const rawProgress = slideElapsed / effectiveTransitionDuration;
            const progress = Math.max(0.001, Math.min(0.999, rawProgress));
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

          // === SINCRONIZAR AUDIO LOCAL ===
          const currentScene = scenes[slideIdx];
          if (currentScene && currentPlayingAudioSrc) {
            const aStart = currentScene.audioStartTime !== undefined ? currentScene.audioStartTime : 0;
            const aEnd = currentScene.audioEndTime !== undefined ? currentScene.audioEndTime : slideDur;

            if (slideElapsed >= aStart && slideElapsed <= aEnd) {
              if (exportLocalAudio.paused) {
                exportLocalAudio.play().catch(e => console.log('Local Audio play error', e));
              }
            } else {
              if (!exportLocalAudio.paused) {
                exportLocalAudio.pause();
              }
            }
          }

          // Actualizar progreso
          safeSetState(setExportProgress, 40 + Math.min(60, Math.round((videoTime / totalDuration) * 60)));

          // Programar siguiente frame
          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
      });

      recorder.stop();

    } catch (err) {
      console.error('[Arko360] Error al exportar video:', err);

      // Cleanup en caso de error
      actionButtons.forEach(btn => (btn.style.display = 'flex'));
      designer.canvas.setCurrentSlidePage(originalPage);
      designer.canvas.setIsExportMode(false);

      exportBgAudio?.pause();
      exportLocalAudio?.pause();

      // ✅ FIX BUG #2: Pausar TODOS los videos insertados en cleanup de error
      slideVideos.forEach(vids => {
        vids.forEach(v => {
          try {
            v.vid.pause();
          } catch (e) {
            console.error('[Arko360] Error pausando video en cleanup:', e);
          }
        });
      });

      // ✅ FIX BUG #1: Revocar blob URLs
      revokeAllBlobUrls();

      if (audioCtx?.state !== 'closed') {
        audioCtx.close();
      }
      audioCtxRef.current = null;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }

      safeSetState(setIsExporting, false);
      safeSetState(setExportStatus, 'idle');

      if (err.message === 'Export cancelled') {
        showToast('Exportación cancelada', 'info');
      } else {
        showToast('Error al renderizar el video', 'error');
      }
    }
  }, [
    generatedContent, videoStyles, slideDuration, transitionType, transitionDuration,
    selectedPost, audioRef, globalAudioRef, getActiveAudioSrc, showToast,
    designer, transformState
  ]);

  // Función para cancelar la exportación
  const cancelExport = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    handleExportVideo,
    cancelExport,
    isExporting,
    exportProgress,
    exportStatus,
  };
};
