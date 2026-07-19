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
        // STEP 2: Fix ALL elements that use translate(-50%, -50%)
        // This includes: extra elements, content section, logo, images
        // Previously we only fixed [data-element="extra"] - that was the bug!
        // =============================================
        const allPositioned = slideNode.querySelectorAll('[data-slide-element], [data-element="extra"], .absolute');
        const savedStyles = [];
        
        const PARENT_W = 410;
        const PARENT_H = 410;
        
        allPositioned.forEach((node) => {
          const currentTransform = node.style.transform || '';
          const transformNoSpace = currentTransform.replace(/\s+/g, '');
          
          // Only process elements that actually use translate centering
          const hasTranslateXY = transformNoSpace.includes('translate(-50%,-50%)');
          const hasTranslateY = transformNoSpace.includes('translateY(-50%)');
          const hasTranslateX = transformNoSpace.includes('translate(-50%)') && !hasTranslateXY;
          
          if (!hasTranslateXY && !hasTranslateY && !hasTranslateX) return;
          
          // Save original inline styles
          savedStyles.push({
            node,
            cssText: node.style.cssText
          });
          
          // Read position and size
          const leftStr = node.style.left || '0';
          const topStr = node.style.top || '0';
          const leftPct = parseFloat(leftStr);
          const topPct = parseFloat(topStr);
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          
          // Extract rotation
          let rotation = '0deg';
          const rotMatch = currentTransform.match(/rotate\(([^)]+)\)/);
          if (rotMatch) rotation = rotMatch[1];
          
          // Calculate pixel positions based on percentage
          const isPercent = leftStr.includes('%');
          const isPercentTop = topStr.includes('%');
          
          if (hasTranslateXY) {
            // translate(-50%, -50%): center point is at left%, top%
            const cx = isPercent ? (leftPct / 100) * PARENT_W : leftPct;
            const cy = isPercentTop ? (topPct / 100) * PARENT_H : topPct;
            node.style.left = (cx - w / 2) + 'px';
            node.style.top = (cy - h / 2) + 'px';
          } else if (hasTranslateY) {
            // translateY(-50%): only vertical center
            const cy = isPercentTop ? (topPct / 100) * PARENT_H : topPct;
            if (isPercent) {
              node.style.left = ((leftPct / 100) * PARENT_W) + 'px';
            }
            node.style.top = (cy - h / 2) + 'px';
          } else if (hasTranslateX) {
            // translateX(-50%): only horizontal center
            const cx = isPercent ? (leftPct / 100) * PARENT_W : leftPct;
            node.style.left = (cx - w / 2) + 'px';
          }
          
          // Remove all translates, keep only rotation
          node.style.transform = `rotate(${rotation})`;
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



