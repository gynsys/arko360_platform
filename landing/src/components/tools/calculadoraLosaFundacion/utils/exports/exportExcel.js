import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const descargarExcel = async ({
  results,
  presupuesto,
  presupuestoTotal,
  projectName
}) => {
  if (!results) return;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Presupuesto');

  worksheet.columns = [
    { header: 'Capítulo', key: 'chapter', width: 20 },
    { header: 'Material', key: 'material', width: 40 },
    { header: 'Unidad', key: 'unit', width: 15 },
    { header: 'Cantidad', key: 'qty', width: 15 },
    { header: 'P.U. ($)', key: 'pu', width: 15 },
    { header: 'Total ($)', key: 'total', width: 15 }
  ];

  // Estilos de encabezado
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };

  let currentRow = 2;
  ['Losa de Fundación', 'Mampostería'].forEach(chap => {
    const items = presupuesto.filter(p => p.chapter === chap);
    if (items.length > 0) {
      // Título de capítulo
      const chapRow = worksheet.getRow(currentRow);
      chapRow.values = [chap];
      chapRow.font = { bold: true, color: { argb: 'FF0D47A1' } };
      chapRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      currentRow++;

      items.forEach(p => {
        const row = worksheet.getRow(currentRow);
        row.values = {
          chapter: '',
          material: p.material,
          unit: p.unit,
          qty: p.qty,
          pu: p.pu
        };
        // Fórmula para el total = Cantidad * P.U.
        row.getCell('total').value = { formula: `D${currentRow}*E${currentRow}`, result: p.total };
        row.getCell('total').numFmt = '"$"#,##0.00';
        row.getCell('pu').numFmt = '"$"#,##0.00';
        currentRow++;
      });
    }
  });

  // Fila del Gran Total
  const totalRow = worksheet.getRow(currentRow + 1);
  totalRow.getCell('pu').value = 'GRAN TOTAL:';
  totalRow.getCell('pu').font = { bold: true };
  // Suma de todas las celdas de total (se puede hacer con una fórmula SUM compleja o solo la suma de los valores de los items)
  // Para simplificar y asegurar que Excel recalcula bien todo, sumamos todo en una sola fórmula
  // Construimos la lista de celdas de total
  let formulaParts = [];
  for (let i = 2; i < currentRow; i++) {
    if (worksheet.getRow(i).getCell('material').value) {
      formulaParts.push(`F${i}`);
    }
  }
  if (formulaParts.length > 0) {
    totalRow.getCell('total').value = { formula: formulaParts.join('+'), result: presupuestoTotal };
  }
  totalRow.getCell('total').font = { bold: true };
  totalRow.getCell('total').numFmt = '"$"#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Presupuesto_Losa_${projectName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
};
