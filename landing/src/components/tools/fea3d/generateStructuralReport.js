import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const generateStructuralReport = async (storeState, canvasElement) => {
  const doc = new jsPDF();
  const { metadata, elements, nodes, results, wizardConfig } = storeState;

  // 1. Portada y Metadatos
  doc.setFontSize(20);
  doc.text('Reporte de Análisis Estructural', 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Proyecto: ${metadata?.name || 'Galpón Industrial'}`, 14, 32);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 38);
  
  if (wizardConfig) {
    doc.text(`Tipo: ${wizardConfig.type?.toUpperCase() || 'ESTRUCTURA'}`, 14, 48);
    if (wizardConfig.type === 'galpon') {
      doc.text(`Luz Libre (X): ${wizardConfig.bayWidthX} m | Modulación (Y): ${wizardConfig.bayWidthY} m`, 14, 54);
      doc.text(`Altura Alero: ${wizardConfig.floorHeight} m | Altura Cumbrera: ${wizardConfig.apexHeight} m`, 14, 60);
    }
  }

  // 2. Captura del Canvas 3D
  let yOffset = 70;
  if (canvasElement) {
    try {
      const canvasSnapshot = await html2canvas(canvasElement);
      const imgData = canvasSnapshot.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth() - 28;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.addImage(imgData, 'PNG', 14, yOffset, pdfWidth, Math.min(pdfHeight, 100));
      yOffset += Math.min(pdfHeight, 100) + 15;
    } catch (e) {
      console.error('Error capturing 3D canvas', e);
    }
  }

  // 3. Resumen Geométrico
  if (yOffset > 250) {
    doc.addPage();
    yOffset = 20;
  }
  doc.setFontSize(14);
  doc.text('Resumen del Modelo', 14, yOffset);
  yOffset += 10;
  doc.setFontSize(10);
  doc.text(`Nudos totales: ${nodes.length}`, 14, yOffset); yOffset += 6;
  doc.text(`Elementos (Frames): ${elements.filter(e => e.type === 'frame').length}`, 14, yOffset); yOffset += 6;

  // 4. Reacciones en los Apoyos
  if (results && results.results) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Reacciones Máximas en los Apoyos (Envolvente)', 14, 22);
    
    // We only care about nodes that have restraints
    const supportNodes = nodes.filter(n => n.restraint);
    const reactionsData = [];

    supportNodes.forEach(node => {
      let maxFx = 0, maxFy = 0, maxFz = 0;
      Object.values(results.results).forEach(comboResult => {
        const r = comboResult.reactions && comboResult.reactions[node.id];
        if (r) {
          if (Math.abs(r[0]) > Math.abs(maxFx)) maxFx = r[0];
          if (Math.abs(r[1]) > Math.abs(maxFy)) maxFy = r[1];
          if (Math.abs(r[2]) > Math.abs(maxFz)) maxFz = r[2];
        }
      });
      if (maxFx !== 0 || maxFy !== 0 || maxFz !== 0) {
        reactionsData.push([
          node.id, 
          maxFx.toFixed(2), 
          maxFy.toFixed(2), 
          maxFz.toFixed(2)
        ]);
      }
    });

    doc.autoTable({
      startY: 30,
      head: [['Nudo', 'Fx (Máx)', 'Fy (Máx)', 'Fz (Máx)']],
      body: reactionsData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // 5. Solicitaciones Máximas por Grupo (Envolventes)
    let finalY = doc.lastAutoTable.finalY + 15;
    
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Envolvente de Solicitaciones Máximas por Elemento', 14, finalY);
    
    const elementsData = [];
    
    elements.filter(e => e.type === 'frame').forEach(el => {
      let maxP = 0, maxV2 = 0, maxM3 = 0;
      Object.values(results.results).forEach(comboResult => {
        const forces = comboResult.forces && comboResult.forces[el.id];
        if (forces) {
          forces.forEach(station => {
            if (Math.abs(station.P) > Math.abs(maxP)) maxP = station.P;
            if (Math.abs(station.V2) > Math.abs(maxV2)) maxV2 = station.V2;
            if (Math.abs(station.M3) > Math.abs(maxM3)) maxM3 = station.M3;
          });
        }
      });
      
      elementsData.push([
        el.id,
        maxP.toFixed(2),
        maxV2.toFixed(2),
        maxM3.toFixed(2)
      ]);
    });

    doc.autoTable({
      startY: finalY + 10,
      head: [['Elemento', 'Axial P (Máx)', 'Corte V2 (Máx)', 'Momento M3 (Máx)']],
      body: elementsData,
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96] }
    });
  }

  // Descargar PDF
  doc.save(`Reporte_Estructural_${metadata?.name || 'Proyecto'}.pdf`);
};
