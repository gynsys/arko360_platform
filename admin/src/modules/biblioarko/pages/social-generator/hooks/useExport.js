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

        // Fix text shift: html2canvas is extremely buggy with translate(-50%, -50%) on dynamic flex elements.
        // We measure the real rendered size and replace the translate with absolute left/top pixel coordinates.
        const textNodes = slideNode.querySelectorAll('[data-text-el]');
        const originalStyles = [];
        textNodes.forEach((node) => {
          originalStyles.push({ 
            node, 
            width: node.style.width, 
            height: node.style.height,
            left: node.style.left,
            top: node.style.top,
            transform: node.style.transform,
            margin: node.style.margin
          });
          
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          const leftCenter = node.offsetLeft;
          const topCenter = node.offsetTop;
          
          node.style.width = w + 'px';
          node.style.height = h + 'px';
          
          const currentTransform = node.style.transform;
          const transformNoSpace = currentTransform.replace(/\s+/g, '');
          
          let rotation = '0deg';
          const match = currentTransform.match(/rotate\(([^)]+)\)/);
          if (match) rotation = match[1];
          
          if (transformNoSpace.includes('translate(-50%,-50%)')) {
            node.style.left = (leftCenter - w/2) + 'px';
            node.style.top = (topCenter - h/2) + 'px';
            node.style.transform = `rotate(${rotation})`;
            node.style.margin = '0px';
          } else if (transformNoSpace.includes('translateY(-50%)')) {
            node.style.left = leftCenter + 'px';
            node.style.top = (topCenter - h/2) + 'px';
            node.style.transform = `rotate(${rotation})`;
            node.style.margin = '0px';
          }
        });

        // CRITICAL: Remove scale transform from parent canvas before export.
        // html2canvas calculates absolute positioned children incorrectly if the parent is scaled.
        const originalSlideTransform = slideNode.style.transform;
        slideNode.style.transform = 'none';

        const canvas = await html2canvas(slideNode, {
          useCORS: true,
          scale: 3,
          backgroundColor: designer.design.bgColor || '#ffffff',
          logging: false,
          allowTaint: true,
          imageTimeout: 15000,
          removeContainer: false,
          foreignObjectRendering: false
        });

        // Restore scale transform
        slideNode.style.transform = originalSlideTransform;

        // Restore original styles
        originalStyles.forEach(({ node, width, height, left, top, transform, margin }) => {
          node.style.width = width;
          node.style.height = height;
          node.style.left = left;
          node.style.top = top;
          node.style.transform = transform;
          node.style.margin = margin;
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



