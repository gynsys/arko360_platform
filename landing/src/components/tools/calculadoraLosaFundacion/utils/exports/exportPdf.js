import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const descargarPDFPresupuesto = ({
  presupuesto,
  presupuestoTotal
}) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Presupuesto Estimado de Construcción", 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
  
  const tableData = [];
  ['Losa de Fundación', 'Mampostería', 'Machones'].forEach(chap => {
    const items = presupuesto.filter(p => p.chapter === chap);
    if (items.length > 0) {
      const sub = items.reduce((a, b) => a + b.total, 0);
      // jsPDF-autotable soporta string[] en el body
      tableData.push([{ content: chap, colSpan: 4, styles: { fillColor: [227, 242, 253], textColor: [13, 71, 161], fontStyle: 'bold' } }, { content: `$${sub.toFixed(2)}`, styles: { fillColor: [227, 242, 253], textColor: [13, 71, 161], fontStyle: 'bold' } }]);
      items.forEach(p => tableData.push([`  ${p.material}`, p.unit, p.qty.toString(), `$${p.pu.toFixed(2)}`, `$${p.total.toFixed(2)}`]));
    }
  });
  
  autoTable(doc, {
    startY: 35,
    head: [['Material', 'Unidad', 'Cantidad', 'P.U. ($)', 'Total ($)']],
    body: tableData,
    foot: [['', '', '', 'GRAN TOTAL', `$${presupuestoTotal.toFixed(2)}`]],
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 47] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  doc.save("Presupuesto_Materiales_Arko360.pdf");
};
