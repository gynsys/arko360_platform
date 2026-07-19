import { isCapacitor, downloadFile } from '../../../../../utils/platform';

import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import { blogService } from '../../../services/blogService';


export const useExport = (selectedPost, designer, generatedContent) => {
  const showToast = (msg, type) => type === 'error' ? toast.error(msg) : toast.success(msg);

  const downloadCarousel = async () => {
    if (!generatedContent?.slides || generatedContent.slides.length === 0) return;
    const zip = new JSZip();

    try {
      showToast('Empaquetando carrusel...', 'loading');
      
      // Ocultar botones de accion temporalmente
      const actionButtons = document.querySelectorAll('.slide-actions');
      actionButtons.forEach(btn => btn.style.display = 'none');

      // Guardar el estado actual del editor para restaurarlo despues
      const originalPage = designer.canvas.currentSlidePage;
      const originalExtraId = designer.canvas.selectedExtraId;
      const originalImageId = designer.canvas.selectedImageId;
      const originalContentIndex = designer.canvas.selectedContentIndex;

      // Limpiar selecciones para que no salgan los bordes/controles en la captura
      designer.canvas.setSelectedExtraId(null);
      designer.canvas.setSelectedImageId(null);
      designer.canvas.setSelectedContentIndex(null);
      
      // Set export mode flag for proper SVG gradient rendering
      designer.canvas.setIsExportMode(true);

      const imageFiles = [];

      // Iterar por cada diapositiva usando el canvas principal
      for (let i = 0; i < generatedContent.slides.length; i++) {
        // Cambiar la pagina activa
        designer.canvas.setCurrentSlidePage(i);
        
        // Esperar a que React renderice la nueva diapositiva, las imagenes se carguen y los gradientes SVG se procesen
        await new Promise(resolve => setTimeout(resolve, 1500));

        const slideNode = document.getElementById('main-slide-canvas');
        if (!slideNode) continue;

        // Fix text shift by temporarily removing scale transform from parent canvas before export.
        // html2canvas calculates absolute positioned children incorrectly if the parent is scaled.

        const extraNodes = slideNode.querySelectorAll('[data-element="extra"]');
        const nodeMetrics = new Map();
        
        extraNodes.forEach((node, index) => {
          node.dataset.tempExportIdx = index;
          nodeMetrics.set(index, {
            width: node.offsetWidth,
            height: node.offsetHeight,
            left: parseFloat(node.style.left) || 0,
            top: parseFloat(node.style.top) || 0,
            isFullWidth: node.style.left === '0px'
          });
        });

        const canvas = await html2canvas(slideNode, {
          useCORS: true,
          scale: 3,
          backgroundColor: designer.design.bgColor || '#ffffff',
          logging: false,
          allowTaint: true,
          imageTimeout: 15000,
          removeContainer: false,
          foreignObjectRendering: false,
          onclone: (clonedDoc, clonedElement) => {
            clonedElement.style.transform = 'none';

            const clonedExtras = clonedElement.querySelectorAll('[data-element="extra"]');
            clonedExtras.forEach((clonedNode) => {
              const exportIdx = clonedNode.dataset.tempExportIdx;
              if (exportIdx === undefined) return;
              const metrics = nodeMetrics.get(parseInt(exportIdx));
              if (!metrics) return;

              let rotation = '0deg';
              const match = clonedNode.style.transform.match(/rotate\(([^)]+)\)/);
              if (match) rotation = match[1];

              const parentWidth = 410;
              const parentHeight = 410;

              if (metrics.isFullWidth) {
                const centerY = (metrics.top / 100) * parentHeight;
                const topEdge = centerY - (metrics.height / 2);
                
                clonedNode.style.position = 'absolute';
                clonedNode.style.left = '0px';
                clonedNode.style.top = topEdge + 'px';
                clonedNode.style.transform = `rotate(${rotation})`;
                clonedNode.style.width = '410px';
                clonedNode.style.height = metrics.height + 'px';
                clonedNode.style.margin = '0px';
              } else {
                const centerX = (metrics.left / 100) * parentWidth;
                const centerY = (metrics.top / 100) * parentHeight;
                
                const leftEdge = centerX - (metrics.width / 2);
                const topEdge = centerY - (metrics.height / 2);

                clonedNode.style.position = 'absolute';
                clonedNode.style.left = leftEdge + 'px';
                clonedNode.style.top = topEdge + 'px';
                clonedNode.style.transform = `rotate(${rotation})`;
                clonedNode.style.width = metrics.width + 'px';
                clonedNode.style.height = metrics.height + 'px';
                clonedNode.style.margin = '0px';
              }

              if (clonedNode.dataset.textEl) {
                clonedNode.style.display = 'block';
                const innerText = clonedNode.querySelector('[data-text-inner="true"]');
                if (innerText) {
                  innerText.style.textAlign = 'center';
                  innerText.style.width = '100%';
                  innerText.style.display = 'block';
                }
              }
            });
          }
        });
        
        // Clean up temporary dataset properties
        extraNodes.forEach(node => {
          delete node.dataset.tempExportIdx;
        });
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.90));
        imageFiles.push(new File([blob], `Diapositiva_${i + 1}.jpg`, { type: 'image/jpeg' }));
        
        const imgData = canvas.toDataURL('image/jpeg', 0.90).split(',')[1];
        zip.file(`Diapositiva_${i + 1}.jpg`, imgData, { base64: true });
      }

      // Restaurar todo a como estaba
      actionButtons.forEach(btn => btn.style.display = 'flex');
      designer.canvas.setCurrentSlidePage(originalPage);
      designer.canvas.setSelectedExtraId(originalExtraId);
      designer.canvas.setSelectedImageId(originalImageId);
      designer.canvas.setSelectedContentIndex(originalContentIndex);
      
      // Restore export mode flag
      designer.canvas.setIsExportMode(false);

      const content = await zip.generateAsync({ type: 'blob' });
      const filename = `carrusel-${selectedPost?.slug_url || 'gynsys'}.zip`;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // --- MODO COMPARTIR NATIVO (SIN ZIP PARA MÓVILES) ---
      if (isMobile && navigator.canShare && navigator.canShare({ files: imageFiles })) {
        try {
          showToast('Abriendo opciones...', 'loading');
          await navigator.share({
            files: imageFiles,
            title: 'Carrusel Arko360',
            text: 'Descarga o comparte tus diapositivas.'
          });
          showToast('¡Imágenes exportadas!', 'success');
          return;
        } catch (shareErr) {
          console.error('[Arko360] Share API Error:', shareErr);
          // Si el usuario cancela o falla, continuamos con el fallback de ZIP proxy
        }
      }

      // --- MODO PROXY (FALLBACK CON ZIP) ---
      if (isMobile || isCapacitor()) {
        try {
          showToast('Preparando descarga...', 'loading');
          const { file_id, extension } = await blogService.uploadForDownload(content, filename);
          const apiBase = (import.meta.env.VITE_API_BASE_URL || 'https://api.gynsys.net/api/v1').replace(/\/$/, '');
          const downloadUrl = `${apiBase}/blog/download/${file_id}?ext=${extension}`;
          window.open(downloadUrl, '_blank');
          showToast('¡Descarga iniciada!', 'success');
          return;
        } catch (proxyErr) {
          console.error('[Arko360] Proxy Download Error:', proxyErr);
        }
      }

      // --- Fallback (Escritorio) ---
      downloadFile(content, filename);
      showToast('¡ZIP descargado!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al descargar', 'error');
    }
  };

  return { downloadCarousel };
};



