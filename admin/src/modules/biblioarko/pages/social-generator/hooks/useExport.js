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

        // =============================================
        // STEP 1: Disable ALL CSS transitions in the slide tree
        // This prevents html2canvas from capturing mid-animation states
        // =============================================
        const allSlideElements = slideNode.querySelectorAll('*');
        const savedTransitions = [];
        allSlideElements.forEach(el => {
          savedTransitions.push({ el, transition: el.style.transition });
          el.style.transition = 'none';
        });
        slideNode.style.transition = 'none';
        const savedSlideTransition = slideNode.style.transition;
        
        // Force browser to apply transition:none immediately
        void slideNode.offsetHeight;

        // =============================================
        // STEP 2: Read metrics from the REAL DOM (now with transitions disabled)
        // =============================================
        const extraNodes = slideNode.querySelectorAll('[data-element="extra"]');
        const savedStyles = [];
        
        const PARENT_W = 410;
        const PARENT_H = 410;
        
        extraNodes.forEach((node) => {
          // Save ALL original inline styles
          savedStyles.push({
            node,
            cssText: node.style.cssText
          });
          
          // Read the percentage-based position from the inline style
          const leftStr = node.style.left || '0';
          const topStr = node.style.top || '0';
          const leftPct = parseFloat(leftStr); // "25%" -> 25, "0px" -> 0
          const topPct = parseFloat(topStr);
          const isFullWidth = leftStr === '0px';
          
          // Read the real rendered size (offsetWidth is NOT affected by parent scale)
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          
          // Extract rotation
          let rotation = '0deg';
          const rotMatch = node.style.transform.match(/rotate\(([^)]+)\)/);
          if (rotMatch) rotation = rotMatch[1];
          
          // =============================================
          // STEP 3: Replace translate(-50%,-50%) with pure pixel coordinates
          // Math: centerX = (leftPct/100)*410, leftEdge = centerX - width/2
          // =============================================
          if (isFullWidth) {
            const centerY = (topPct / 100) * PARENT_H;
            node.style.left = '0px';
            node.style.top = (centerY - h / 2) + 'px';
            node.style.width = PARENT_W + 'px';
            node.style.height = h + 'px';
          } else {
            const centerX = (leftPct / 100) * PARENT_W;
            const centerY = (topPct / 100) * PARENT_H;
            node.style.left = (centerX - w / 2) + 'px';
            node.style.top = (centerY - h / 2) + 'px';
            node.style.width = w + 'px';
            node.style.height = h + 'px';
          }
          
          // Remove translate completely, keep only rotation
          node.style.transform = `rotate(${rotation})`;
          node.style.margin = '0px';
          node.style.transition = 'none';
        });
        
        // =============================================
        // STEP 4: Remove scale from parent container
        // =============================================
        const savedParentTransform = slideNode.style.transform;
        slideNode.style.transform = 'none';
        
        // =============================================
        // STEP 5: Force a GUARANTEED browser reflow
        // Double requestAnimationFrame ensures the browser has fully
        // processed ALL style changes before html2canvas reads them
        // =============================================
        void slideNode.offsetHeight; // Synchronous reflow
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        
        // =============================================
        // STEP 6: Capture with html2canvas (NO onclone tricks needed)
        // The DOM is already in its final pixel-perfect state
        // =============================================
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
        
        // =============================================
        // STEP 7: Restore EVERYTHING to original state
        // =============================================
        slideNode.style.transform = savedParentTransform;
        
        // Restore all extra element styles
        savedStyles.forEach(({ node, cssText }) => {
          node.style.cssText = cssText;
        });
        
        // Restore all transitions
        savedTransitions.forEach(({ el, transition }) => {
          el.style.transition = transition;
        });
        slideNode.style.transition = savedSlideTransition;
        
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



