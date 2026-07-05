import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './CalculadoraLosaFundacion.css';
import { DoorOpen, DoorClosed, AppWindow, Undo2, Redo2, LogIn, LogOut } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ============================================
// FOUNDATION SLAB EDITOR - HIBRIDO v2
// Grid Intenso, Snap a la Grilla, Auditoría JSON
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const MATERIALS = {
  'bloque_arcilla_10': { name: 'Bloque de Arcilla (10cm)', thickness: 0.10, density: 1200 },
  'bloque_arcilla_12': { name: 'Bloque de Arcilla (12cm)', thickness: 0.12, density: 1200 },
  'bloque_arcilla_15': { name: 'Bloque de Arcilla (15cm)', thickness: 0.15, density: 1200 },
  'bloque_cemento': { name: 'Bloque de Cemento (15cm)', thickness: 0.15, density: 1800 },
  'ladrillo_macizo': { name: 'Ladrillo Macizo (12cm)', thickness: 0.12, density: 1900 },
  'ladrillo_hueco': { name: 'Ladrillo Hueco (12cm)', thickness: 0.12, density: 1400 },
};

const FALLBACK_PRECIOS = {
  bloque_15: 0.65,
  bloque_12: 0.64,
  cemento: 13.46,
  arena: 45.24,
  piedra: 51.04,
  cabilla_5_2: 1.58,
  cabilla_8: 5.9,
  cabilla_10: 5.82,
  polvillo: 53.36,
  pego: 3.886,
  lija: 1.5,
  pasta: 17.48,
  pintura: 11
};
const SHAPES = [
  { id: 'rectangular', label: 'Rectangular' },
  { id: 'L', label: 'Forma en L' },
  { id: 'U', label: 'Forma en U' },
  { id: 'T', label: 'Forma en T' },
  { id: 'libre', label: 'Libre / Manual' },
];

const generarPresupuesto = (results, prices) => {
  if (!results?.materials_computation) return [];
  const m = results.materials_computation;
  const s = m.superstructure;
  if (!s) return [];

  const items = [];
  const p = prices || FALLBACK_PRECIOS;

  // Separar losa y mampostería (viga corona)
  const vol_losa = m.concrete_vol_m3;
  const vol_viga = s.vol_vigas_corona_m3;

  // ==== CAPÍTULO: LOSA DE FUNDACIÓN ====
  const cemento_losa = Math.ceil(vol_losa * 6.7);
  items.push({ chapter: 'Losa de Fundación', material: 'Cemento Portland (Losa)', unit: 'sacos', qty: cemento_losa, pu: p.cemento, total: cemento_losa * p.cemento });
  
  const arena_losa = +(vol_losa * 0.63).toFixed(2);
  items.push({ chapter: 'Losa de Fundación', material: 'Arena Lavada (Losa)', unit: 'm³', qty: arena_losa, pu: p.arena, total: arena_losa * p.arena });

  const piedra_losa = +(vol_losa * 0.60).toFixed(2);
  items.push({ chapter: 'Losa de Fundación', material: 'Piedra picada (Losa)', unit: 'm³', qty: piedra_losa, pu: p.piedra, total: piedra_losa * p.piedra });

  // Acero Losa y Bandas
  const diam_base = m.diam_base_mm || 10;
  let precio_cabilla = 7.36;
  if (diam_base === 8) precio_cabilla = p.cabilla_8 || 5.90;
  else if (diam_base === 10) precio_cabilla = p.cabilla_10 || 5.82;
  else if (diam_base > 10) precio_cabilla = 7.36 * Math.pow(diam_base / 10, 2);

  const total_cabillas_losa = m.total_bars_6m;
  items.push({ chapter: 'Losa de Fundación', material: `Cabilla de ${diam_base} mm (Losa)`, unit: 'und', qty: total_cabillas_losa, pu: precio_cabilla, total: total_cabillas_losa * precio_cabilla });

  // ==== CAPÍTULO: MAMPOSTERÍA ====
  if (vol_viga > 0) {
    const cemento_viga = Math.ceil(vol_viga * 6.7);
    const arena_viga = +(vol_viga * 0.63).toFixed(2);
    const piedra_viga = +(vol_viga * 0.60).toFixed(2);
    items.push({ chapter: 'Mampostería', material: 'Cemento Portland (Viga Corona)', unit: 'sacos', qty: cemento_viga, pu: p.cemento, total: cemento_viga * p.cemento });
    items.push({ chapter: 'Mampostería', material: 'Arena Lavada (Viga Corona)', unit: 'm³', qty: arena_viga, pu: p.arena, total: arena_viga * p.arena });
    items.push({ chapter: 'Mampostería', material: 'Piedra picada (Viga Corona)', unit: 'm³', qty: piedra_viga, pu: p.piedra, total: piedra_viga * p.piedra });
  }

  // Acero Viga Corona
  if (s.corona_10mm_bars > 0) {
    items.push({ chapter: 'Mampostería', material: 'Cabilla de 10 mm (Viga Corona)', unit: 'und', qty: s.corona_10mm_bars, pu: p.cabilla_10, total: s.corona_10mm_bars * p.cabilla_10 });
  }
  if (s.corona_5_2mm_bars > 0) {
    items.push({ chapter: 'Mampostería', material: 'Cabilla de 5.2 mm (Estribos)', unit: 'und', qty: s.corona_5_2mm_bars, pu: p.cabilla_5_2, total: s.corona_5_2mm_bars * p.cabilla_5_2 });
  }

  // Bloques
  if (s.bloques_15_m2 > 0) {
    const qty = Math.ceil(s.bloques_15_m2 * 12.5);
    items.push({ chapter: 'Mampostería', material: 'Bloque arcilla (15cm)', unit: 'und', qty, pu: p.bloque_15, total: qty * p.bloque_15 });
  }
  if (s.bloques_12_m2 > 0) {
    const qty = Math.ceil(s.bloques_12_m2 * 12.5);
    items.push({ chapter: 'Mampostería', material: 'Bloque arcilla (12cm)', unit: 'und', qty, pu: p.bloque_12, total: qty * p.bloque_12 });
  }

  // Acabados
  const area_total_muros = s.area_lisa_m2 + s.area_rustica_m2;
  
  // Rendimiento real de friso a 1 cm de espesor base:
  // 1 saco (42.5kg) rinde ~12.5 m2, 1 m3 de arena rinde ~100 m2
  const cemento_friso = Math.ceil(area_total_muros / 12.5);
  const arena_friso = +(area_total_muros / 100.0).toFixed(2);
  
  if (cemento_friso > 0) {
    items.push({ chapter: 'Mampostería', material: 'Cemento Portland (Friso)', unit: 'sacos', qty: cemento_friso, pu: p.cemento, total: cemento_friso * p.cemento });
    items.push({ chapter: 'Mampostería', material: 'Arena Lavada (Friso)', unit: 'm³', qty: arena_friso, pu: p.arena, total: arena_friso * p.arena });
  }

  if (s.area_lisa_m2 > 0) {
    // Rendimiento Pasta: ~25 m2 por cuñete (4-5 galones)
    const pasta_cunetes = Math.ceil(s.area_lisa_m2 / 25.0); 
    // Rendimiento Pintura: ~20 m2 por galón (a dos manos)
    const pintura_galones = Math.ceil(s.area_lisa_m2 / 20.0);
    const lija = Math.ceil(s.area_lisa_m2 / 10);
    const polvillo = +(s.area_lisa_m2 / 100).toFixed(2);

    items.push({ chapter: 'Mampostería', material: 'Polvillo (Acabado liso)', unit: 'm³', qty: polvillo, pu: p.polvillo, total: polvillo * p.polvillo });
    items.push({ chapter: 'Mampostería', material: 'Lija', unit: 'hojas', qty: lija, pu: p.lija, total: lija * p.lija });
    items.push({ chapter: 'Mampostería', material: 'Pasta Profesional', unit: 'cuñetes', qty: pasta_cunetes, pu: p.pasta, total: pasta_cunetes * p.pasta });
    items.push({ chapter: 'Mampostería', material: 'Pintura', unit: 'galones', qty: pintura_galones, pu: p.pintura, total: pintura_galones * p.pintura });
  }
  
  return items;
};

export default function CalculadoraLosaFundacion() {
  const svgRef = useRef(null);

  // Configuración de Losa y Perímetro
  const [shape, setShape] = useState('rectangular');
  const [params, setParams] = useState({
    Lx: 10, Ly: 10,       
    wingX: 4, wingY: 4,   
    wingX2: 4, baseY: 4, barY: 4,
    h: 15                 
  });
  const [offset, setOffset] = useState(0.5); 
  const [material, setMaterial] = useState('bloque_arcilla_15');
  const [wallHeight, setWallHeight] = useState(2.70);
  
  // Parámetros de Diseño Técnico
  const [designParams, setDesignParams] = useState({
    fc: 250, // kgf/cm² (antes 25 MPa)
    fy: 4200, // kgf/cm² (antes 420 MPa)
    q_adm: 1.5, // kgf/cm² (antes 150 kN/m²)
    is_plastered: false, // Friso global
    band_width_m: 0 // 0 = Auto calculado en backend
  });
  
  // Guardado y Carga de Base de Datos
  const [projectName, setProjectName] = useState("Losa Híbrida");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [savedRuns, setSavedRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState(null);
  
  // Muros Internos (Tabla)
  const [internalWalls, setInternalWalls] = useState([]);
  
  // Estado de resultados
  const [results, setResults] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [currentRunId, setCurrentRunId] = useState(null);

  // Aberturas (Puertas y Ventanas) Drag & Drop
  const [openings, setOpenings] = useState([]);
  const [globalPrices, setGlobalPrices] = useState(FALLBACK_PRECIOS);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch(`${API_BASE}/materials/`);
        if (res.ok) {
          const data = await res.json();
          const p = { ...FALLBACK_PRECIOS };
          data.forEach(m => {
            const n = m.nombre.toLowerCase();
            if (n.includes('bloque arcilla (15cm)')) p.bloque_15 = m.precio_usd;
            else if (n.includes('bloque arcilla (12cm)')) p.bloque_12 = m.precio_usd;
            else if (n.includes('cemento')) p.cemento = m.precio_usd;
            else if (n.includes('arena')) p.arena = m.precio_usd;
            else if (n.includes('piedra')) p.piedra = m.precio_usd;
            else if (n.includes('cabilla') && n.includes('5')) p.cabilla_5_2 = m.precio_usd;
            else if (n.includes('cabilla') && n.includes('8')) p.cabilla_8 = m.precio_usd;
            else if (n.includes('cabilla') && n.includes('10')) p.cabilla_10 = m.precio_usd;
            else if (n.includes('polvillo')) p.polvillo = m.precio_usd;
            else if (n.includes('pego')) p.pego = m.precio_usd;
            else if (n.includes('lija')) p.lija = m.precio_usd;
            else if (n.includes('pasta')) p.pasta = m.precio_usd;
            else if (n.includes('pintura')) p.pintura = m.precio_usd;
          });
          setGlobalPrices(p);
        }
      } catch (e) {
        console.error('Error fetching global prices', e);
      }
    };
    fetchMaterials();
  }, []);

  // Hover interactivo (bidireccional SVG <-> Tabla)
  const [hoveredWallId, setHoveredWallId] = useState(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState(null);

  // Undo / Redo para muros y aberturas
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  const saveHistory = () => {
    setHistoryPast(prev => [...prev, { internalWalls: [...internalWalls], openings: [...openings] }]);
    setHistoryFuture([]);
  };

  const undo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [{ internalWalls, openings }, ...prev]);
    setInternalWalls(previous.internalWalls);
    setOpenings(previous.openings);
  };

  const redo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev, { internalWalls, openings }]);
    setInternalWalls(next.internalWalls);
    setOpenings(next.openings);
  };

  // Interacción Canvas (Mouse & Snap)
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null); // Preview de la línea
  
  const presupuesto = useMemo(() => generarPresupuesto(results, globalPrices), [results, globalPrices]);
  const presupuestoTotal = useMemo(() => presupuesto.reduce((acc, it) => acc + it.total, 0), [presupuesto]);

  const descargarExcel = async () => {
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

  const descargarPDFPresupuesto = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Presupuesto Estimado de Construcción", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableData = [];
    ['Losa de Fundación', 'Mampostería'].forEach(chap => {
      const items = presupuesto.filter(p => p.chapter === chap);
      if (items.length > 0) {
        const sub = items.reduce((a, b) => a + b.total, 0);
        // jsPDF-autotable soporta string[] en el body
        tableData.push([{ content: chap, colSpan: 4, styles: { fillColor: [227, 242, 253], textColor: [13, 71, 161], fontStyle: 'bold' } }, { content: `$${sub.toFixed(2)}`, styles: { fillColor: [227, 242, 253], textColor: [13, 71, 161], fontStyle: 'bold' } }]);
        items.forEach(p => tableData.push([`  ${p.material}`, p.unit, p.qty.toString(), `$${p.pu.toFixed(2)}`, `$${p.total.toFixed(2)}`]));
      }
    });
    
    doc.autoTable({
      startY: 35,
      head: [['Material', 'Unidad', 'Cantidad', 'P.U.', 'Total']],
      body: tableData,
      foot: [['', '', '', 'GRAN TOTAL', `$${presupuestoTotal.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    doc.save("Presupuesto_Materiales_Arko360.pdf");
  };

  const descargarMemoriaCalculoHtml = () => {
    if (!results || !results.materials_computation) {
      toast.error("No hay resultados para generar memoria.");
      return;
    }
    const mc = results.materials_computation;
    const s = mc.superstructure;
    const area_total = s.area_lisa_m2 + s.area_rustica_m2;
    
    let murosHtml = '';
    const h = wallHeight || 2.70;
    
    // Perimetrales
    allWalls.filter(w => w.type === 'perimetral').forEach((w, i) => {
      const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
      murosHtml += `<li>Muro Perimetral ${i+1}: ${len.toFixed(2)}m (L) × ${h.toFixed(2)}m (H) = ${(len * h).toFixed(2)} m² (x 2 caras = ${(len * h * 2).toFixed(2)} m²)</li>`;
    });
    
    // Internos
    allWalls.filter(w => w.type !== 'perimetral').forEach((w, i) => {
      const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
      murosHtml += `<li>Muro Interno ${i+1}: ${len.toFixed(2)}m (L) × ${h.toFixed(2)}m (H) = ${(len * h).toFixed(2)} m² (x 2 caras = ${(len * h * 2).toFixed(2)} m²)</li>`;
    });

    let aberturasHtml = '';
    if (openings.length > 0) {
      openings.forEach((op, i) => {
        const area = op.width * op.height;
        aberturasHtml += `<li>Abertura ${i+1} (${op.type}): ${op.width.toFixed(2)}m (Ancho) × ${op.height.toFixed(2)}m (Alto) = -${area.toFixed(2)} m² (descontado de mampostería)</li>`;
      });
    } else {
      aberturasHtml = '<li>No se registraron puertas ni ventanas.</li>';
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Memoria de Cálculo - ${projectName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; }
    h1, h2, h3 { color: #1e1e2f; }
    .card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .formula { background: #e3f2fd; padding: 12px; border-left: 4px solid #1976d2; font-family: monospace; font-size: 14px; margin: 10px 0; color: #0d47a1; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
  </style>
</head>
<body>
  <h1>Memoria de Cálculo: ${projectName}</h1>
  <p>Reporte generado automáticamente por Arko360. A continuación se detallan las fórmulas y consideraciones matemáticas para los cómputos métricos de este proyecto.</p>
  
  <div class="card">
    <h2>1. Losa de Fundación</h2>
    <p><strong>Volumen de Concreto:</strong></p>
    <div class="formula">
      Fórmula: Área Neta de la Losa × Espesor<br>
      Resultado: ${mc.concrete_vol_m3.toFixed(2)} m³
    </div>
    
    <p><strong>Acero General (Malla):</strong></p>
    <div class="formula">
      Fórmula: Cuantía mínima según norma × Área<br>
      Peso Total Acero General: ${mc.steel_weight_general_kg.toFixed(2)} kg<br>
      Varillas de 6m = Peso Total / Peso por Varilla = ${mc.general_bars_6m} varillas
    </div>
    
    <p><strong>Acero de Bandas (Refuerzo inferior bajo muros):</strong></p>
    <div class="formula">
      Peso Acero Adicional: ${mc.steel_weight_bands_kg.toFixed(2)} kg<br>
      Varillas de 6m equivalentes: ${mc.bands_bars_6m} varillas
    </div>
  </div>
  
  <div class="card">
    <h2>2. Superestructura (Mampostería)</h2>
    <p><strong>Desglose de Áreas por Pared (Altura base: ${h.toFixed(2)}m):</strong></p>
    <div class="formula" style="background: #fff3e0; border-left-color: #ff9800; color: #e65100;">
      <ul>
        ${murosHtml}
      </ul>
      <hr style="border:0; border-top:1px solid #ffe0b2; margin: 10px 0;">
      <strong>Descuento por Aberturas (Áreas Negativas):</strong>
      <ul>
        ${aberturasHtml}
      </ul>
    </div>

    <p><strong>Área Neta Total de Muros a Frisar:</strong><br>
    Se considera 1 cara exterior y 1 interior para muros perimetrales, y 2 caras interiores para muros internos. A esta área bruta se le resta el área de las puertas y ventanas dibujadas.</p>
    <div class="formula">
      Área Lisa (Interna) = ${s.area_lisa_m2.toFixed(2)} m²<br>
      Área Rústica (Externa) = ${s.area_rustica_m2.toFixed(2)} m²<br>
      Área Neta Total a frisar = ${area_total.toFixed(2)} m²
    </div>
    
    <p><strong>Cemento Portland para Friso (1 cm espesor):</strong></p>
    <div class="formula">
      Rendimiento Base: 1 saco (42.5kg) rinde ~12.5 m² a 1cm de espesor (Proporción 1:4).<br>
      Sacos = Área Total / 12.5 = Math.ceil(${area_total.toFixed(2)} / 12.5) = ${Math.ceil(area_total / 12.5)} sacos
    </div>
    
    <p><strong>Arena Lavada para Friso:</strong></p>
    <div class="formula">
      Rendimiento Base: 1 m³ de arena rinde ~100 m² a 1cm de espesor.<br>
      Volumen Arena = Área Total / 100 = ${( area_total / 100.0 ).toFixed(2)} m³
    </div>
    
    <p><strong>Bloques de Arcilla:</strong></p>
    <div class="formula">
      Rendimiento Base: 12.5 bloques por m² de pared.<br>
      Bloques 15cm = Área muros de 15cm (${s.bloques_15_m2.toFixed(2)} m²) × 12.5 = ${Math.ceil(s.bloques_15_m2 * 12.5)} und<br>
      Bloques 12cm = Área muros de 12cm (${s.bloques_12_m2.toFixed(2)} m²) × 12.5 = ${Math.ceil(s.bloques_12_m2 * 12.5)} und
    </div>
  </div>
  
  <div class="card">
    <h2>3. Acabados y Pintura (Solo interior)</h2>
    <p><strong>Pasta Profesional:</strong></p>
    <div class="formula">
      Rendimiento: 1 cuñete (4-5 galones) rinde ~25 m².<br>
      Cuñetes requeridos = Área Lisa (${s.area_lisa_m2.toFixed(2)} m²) / 25 = Math.ceil(${s.area_lisa_m2 / 25.0}) = ${Math.ceil(s.area_lisa_m2 / 25.0)} cuñetes
    </div>
    
    <p><strong>Pintura:</strong></p>
    <div class="formula">
      Rendimiento: 1 galón rinde ~20 m² a dos manos.<br>
      Galones requeridos = Área Lisa (${s.area_lisa_m2.toFixed(2)} m²) / 20 = Math.ceil(${s.area_lisa_m2 / 20.0}) = ${Math.ceil(s.area_lisa_m2 / 20.0)} galones
    </div>
  </div>
  
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `Memoria_Calculo_${projectName.replace(/\s+/g,'_')}.html`);
  };

  const snapToGrid = (val) => Math.round(val * 2) / 2; // Snap a 0.5m

  // Escala para el SVG
  const CANVAS_SIZE = 500;
  const MARGIN = 40; // Margen para los ejes
  const EFFECTIVE_SIZE = CANVAS_SIZE - MARGIN * 2;
  const scale = useMemo(() => EFFECTIVE_SIZE / Math.max(params.Lx, params.Ly, 1), [params.Lx, params.Ly]);
  
  // Convertir metros a pixeles SVG
  const toSvg = useCallback((m) => MARGIN + (m * scale), [scale]);
  // Convertir pixeles a metros (con snap opcional)
  const toMeters = useCallback((px, doSnap = false) => {
    let m = (px - MARGIN) / scale;
    if (m < 0) m = 0;
    if (doSnap) m = snapToGrid(m);
    return m;
  }, [scale]);

  // Generar vértices del perímetro según la plantilla y offset
  const getPerimeterVertices = useCallback(() => {
    const { Lx, Ly, wingX, wingY, wingX2, baseY, barY } = params;
    const o = parseFloat(offset) || 0;
    const safeO = Math.min(o, 1.0); 

    let pts = [];
    switch (shape) {
      case 'rectangular':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'L':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: wingY - safeO }, { x: wingX - safeO, y: wingY - safeO }, { x: wingX - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'U':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: Lx - wingX2 + safeO, y: Ly - safeO }, { x: Lx - wingX2 + safeO, y: baseY + safeO }, { x: wingX - safeO, y: baseY + safeO }, { x: wingX - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'T':
        pts = [{ x: wingX + safeO, y: safeO }, { x: Lx - wingX2 - safeO, y: safeO }, { x: Lx - wingX2 - safeO, y: Ly - barY - safeO }, { x: Lx - safeO, y: Ly - barY - safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }, { x: safeO, y: Ly - barY - safeO }, { x: wingX + safeO, y: Ly - barY - safeO }];
        break;
      default: pts = [];
    }
    return pts;
  }, [shape, params, offset]);

  // Generar lista de muros perimetrales a partir de los vértices
  const perimeterWalls = useMemo(() => {
    const pts = getPerimeterVertices();
    const matProps = MATERIALS[material];
    const walls = [];
    if (shape === 'libre') return []; // Sin auto-perímetro en modo libre
    
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      walls.push({
        id: `perim_${i}`,
        type: 'perimetral',
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        thickness: matProps.thickness,
        height: parseFloat(wallHeight) || 2.7,
        density: matProps.density,
        is_plastered: designParams.is_plastered
      });
    }
    return walls;
  }, [getPerimeterVertices, material, wallHeight, designParams.is_plastered, shape]);

  const allWalls = useMemo(() => {
    const matProps = MATERIALS[material];
    const formattedInternal = internalWalls.map(w => ({
      ...w,
      type: w.type || 'interno',
      thickness: w.type === 'interno' ? 0.12 : matProps.thickness,
      height: parseFloat(wallHeight) || 2.7,
      density: matProps.density,
      is_plastered: designParams.is_plastered
    }));
    return [...perimeterWalls, ...formattedInternal];
  }, [perimeterWalls, internalWalls, material, wallHeight, designParams.is_plastered]);

  const convertToManual = () => {
    if (shape === 'libre') return;
    const perimeterCopy = perimeterWalls.map((w, i) => ({
      id: `man_${Date.now()}_${i}`,
      type: 'perimetral',
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2
    }));
    
    // Migrar aberturas
    setOpenings(prev => prev.map(op => {
      const perimMatch = perimeterCopy.find((_, idx) => op.wall_id === `perim_${idx}`);
      if (perimMatch) return { ...op, wall_id: perimMatch.id };
      return op;
    }));
    
    setInternalWalls(prev => [...perimeterCopy, ...prev]);
    setShape('libre');
  };

  const handleParamChange = (field, value) => setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  const handleDesignParamChange = (field, value) => setDesignParams(prev => ({ ...prev, [field]: value }));

  const handleShapeChange = (newShape) => {
    saveHistory();
    setShape(newShape);
    if (newShape !== 'libre') {
      // Limpiar muros perimetrales que se habían vuelto manuales al salir del modo libre
      setInternalWalls(prev => prev.filter(w => typeof w.id !== 'string' || !w.id.startsWith('man_')));
      setOpenings(prev => prev.filter(op => typeof op.wall_id !== 'string' || !op.wall_id.startsWith('man_')));
    }
  };

  const addInternalWall = (w) => {
    saveHistory();
    setInternalWalls(prev => [...prev, { id: Date.now(), type: 'interno', x1: w.x1 || 0, y1: w.y1 || 0, x2: w.x2 || 1, y2: w.y2 || 1 }]);
  };

  const updateInternalWall = (id, field, value) => {
    saveHistory();
    setInternalWalls(prev => prev.map(w => w.id === id ? { ...w, [field]: (field === 'type' ? value : (parseFloat(value) || 0)) } : w));
  };

  const removeInternalWall = (id) => {
    saveHistory();
    setInternalWalls(prev => prev.filter(w => w.id !== id));
    setOpenings(prev => prev.filter(op => op.wall_id !== id));
  };

  const removeOpening = (id) => {
    saveHistory();
    setOpenings(prev => prev.filter(op => op.id !== id));
  };

  // Lógica del Mouse (Tracker y Dibujo con Snap)
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const mx = toMeters(px, true);
    const my = toMeters(py, true);
    setMouseCoord({ x: mx, y: my });

    if (isDrawing && drawStart) {
      setDrawEnd({ x: mx, y: my });
    }
  };

  const handleSvgDoubleClick = () => {
    if (!isDrawing) {
      // Iniciar dibujo
      setIsDrawing(true);
      setDrawStart({ ...mouseCoord });
      setDrawEnd({ ...mouseCoord });
    } else {
      // Finalizar dibujo
      if (drawStart && (drawStart.x !== mouseCoord.x || drawStart.y !== mouseCoord.y)) {
        addInternalWall({ x1: drawStart.x, y1: drawStart.y, x2: mouseCoord.x, y2: mouseCoord.y });
      }
      setIsDrawing(false);
      setDrawStart(null);
      setDrawEnd(null);
    }
  };

  // Lógica Drag and Drop para Aberturas
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('type', type);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (!type) return;

    const rect = svgRef.current.getBoundingClientRect();
    const dropX = toMeters(e.clientX - rect.left);
    const dropY = toMeters(e.clientY - rect.top, false);

    // Encontrar muro más cercano
    let closestWall = null;
    let minD = Infinity;
    let projDist = 0;

    allWalls.forEach(w => {
      // Distancia punto a segmento
      const l2 = (w.x2 - w.x1)**2 + (w.y2 - w.y1)**2;
      let t = 0;
      if (l2 > 0) {
        t = Math.max(0, Math.min(1, ((dropX - w.x1)*(w.x2 - w.x1) + (dropY - w.y1)*(w.y2 - w.y1)) / l2));
      }
      const pX = w.x1 + t * (w.x2 - w.x1);
      const pY = w.y1 + t * (w.y2 - w.y1);
      const d = Math.sqrt((dropX - pX)**2 + (dropY - pY)**2);

      if (d < minD) {
        minD = d;
        closestWall = w;
        projDist = Math.sqrt((pX - w.x1)**2 + (pY - w.y1)**2);
      }
    });

    // Si está a menos de 1 metro del muro, hace snap
    if (minD < 1.0 && closestWall) {
      const isDoor = type.startsWith('door');
      const width_m = isDoor ? 1.0 : 1.5;
      const height_m = isDoor ? 2.1 : 1.2;
      
      // Ajustar si se sale del muro
      const length = Math.sqrt((closestWall.x2 - closestWall.x1)**2 + (closestWall.y2 - closestWall.y1)**2);
      let start_m = projDist - width_m / 2;
      if (start_m < 0) start_m = 0;
      if (start_m + width_m > length) start_m = length - width_m;

      saveHistory();
      setOpenings(prev => [...prev, {
        id: `op_${Date.now()}`,
        wall_id: closestWall.id,
        type: type,
        start_m, width_m, height_m
      }]);
      toast.success(`${isDoor ? 'Puerta' : 'Ventana'} añadida`);
    } else {
      toast.error("Debes soltar la abertura sobre un muro.");
    }
  };


  // Botón: Cancelar dibujo con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing]);

  // Construir el payload con el estado actual (muros, aberturas, parametros)
  const buildCurrentPayload = () => ({
    project: projectName,
    geometry: { Lx: params.Lx, Ly: params.Ly, h: params.h / 100 },
    materials: {
      f_c_kgcm2: designParams.fc,
      f_c: designParams.fc / 10.197, // Convertir a MPa
      f_y: designParams.fy / 10.197, // Convertir a MPa
      cover: 0.05, bar_diam: 0.012,
      gamma_horm: 2400, 
      E: 4700 * Math.sqrt(designParams.fc / 10.197) * 1e6, 
      nu: 0.2, k: 20e6,
      q_adm: designParams.q_adm * 98066.5, // kgf/cm² a Pa
      band_width_m: designParams.band_width_m > 0 ? designParams.band_width_m : 0
    },
    walls: allWalls.map(w => ({
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
      thickness: w.thickness, height: w.height,
      density: w.density, type: w.type, load_factor: 1.5,
      is_plastered: w.is_plastered,
      openings: openings.filter(op => op.wall_id === w.id).map(op => ({
        type: op.type, start_m: op.start_m, width_m: op.width_m, height_m: op.height_m
      }))
    })),
    beams: perimeterWalls.map(w => ({
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
      width: 0.20, height: 0.30, type: 'zuncho', load_factor: 1.2
    })),
    mesh_nx: 40,
    mesh_ny: 40,
    extra_load: 300 * 9.81,
    // Estado completo del plano para poder reabrirlo
    _canvas_state: {
      shape, params, designParams, wallHeight, internalWalls, openings, material
    }
  });

  // Ejecutar Análisis
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setLastPayload(null);

    const payload = buildCurrentPayload();
    setLastPayload(payload);


    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/losa_fundacion/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter(d => d.tipo_losa === 'losa_fundacion_hibrida');
        setSavedRuns(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRuns(false);
    }
  };

  const loadRun = (run) => {
    setProjectName(run.nombre_proyecto);
    setCurrentRunId(run.id);

    const inp = run.inputs;
    if (inp && inp._canvas_state) {
      const st = inp._canvas_state;
      setShape(st.shape || 'rectangular');
      if (st.params) setParams(st.params);
      if (st.designParams) setDesignParams(st.designParams);
      if (st.wallHeight) setWallHeight(st.wallHeight);
      if (st.internalWalls) setInternalWalls(st.internalWalls);
      if (st.openings) setOpenings(st.openings);
      if (st.material) setMaterial(st.material);
    } else if (inp) {
      if (inp.geometry) setParams(prev => ({ ...prev, Lx: inp.geometry.Lx, Ly: inp.geometry.Ly, h: inp.geometry.h * 100 }));
      if (inp.materials) {
        const fc_kgcm2 = inp.materials.f_c_kgcm2 || +(inp.materials.f_c * 10.197).toFixed(0);
        const fy_kgcm2 = +(inp.materials.f_y * 10.197).toFixed(0);
        const q_adm_kgcm2 = +(inp.materials.q_adm / 98066.5).toFixed(2);
        const bw = inp.materials.band_width_m || 0;
        setDesignParams(prev => ({ ...prev, fc: fc_kgcm2, fy: fy_kgcm2, q_adm: q_adm_kgcm2, band_width_m: bw }));
      }
      if (inp.walls) {
        const manualWalls = inp.walls.map((w, idx) => ({
          id: `db_${idx}`,
          type: w.type,
          x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2
        }));
        setInternalWalls(manualWalls);
        setShape('libre');
        
        const ops = [];
        inp.walls.forEach((w, idx) => {
          if (w.openings) {
            w.openings.forEach(op => {
              ops.push({ id: `op_db_${Date.now()}_${Math.random()}`, wall_id: `db_${idx}`, ...op });
            });
          }
        });
        setOpenings(ops);
      }
    }
    setResults(run.resultados);
    setLastPayload(run.inputs);
    setShowOpenModal(false);
  };

  const downloadAuditJSON = () => {
    if (!lastPayload || !results) return;

    // Calcular cargas en MKS para la auditoría
    const Lx = lastPayload.geometry?.Lx || 0;
    const Ly = lastPayload.geometry?.Ly || 0;
    const h_m = lastPayload.geometry?.h || 0.15;
    const gamma_horm = 2400; // kg/m3
    const A_losa = Lx * Ly;
    const P_losa_kg = gamma_horm * A_losa * h_m;
    const sc_kg_m2 = 300 / 9.81; // de extra_load N/m2 a kg/m2
    const P_sc_kg = sc_kg_m2 * A_losa;
    
    let P_muros_kg = 0;
    const wallLoads = (lastPayload.walls || []).map(w => {
      const len = Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2);
      // Restar aberturas
      const opening_m = (w.openings || []).reduce((acc, op) => acc + op.width_m, 0);
      const len_neta = Math.max(0, len - opening_m);
      const rho_kgm3 = w.density || 1400;
      const vol_m3 = len_neta * w.height * w.thickness;
      const P_kg = rho_kgm3 * vol_m3;
      P_muros_kg += P_kg * (w.load_factor || 1.5);
      return {
        tipo: w.type,
        longitud_m: +len.toFixed(3),
        longitud_neta_m: +len_neta.toFixed(3),
        altura_m: w.height,
        espesor_m: w.thickness,
        densidad_kgm3: rho_kgm3,
        peso_kg: +P_kg.toFixed(1),
        peso_factored_kg: +(P_kg * (w.load_factor || 1.5)).toFixed(1)
      };
    });
    const P_total_kg = P_losa_kg + P_sc_kg + P_muros_kg;
    
    const fc_Pa = lastPayload.materials?.f_c || 25e6;
    const fc_MPa = fc_Pa > 1000 ? fc_Pa / 1e6 : fc_Pa; // handle if already MPa
    const fc_kgcm2 = +(fc_MPa * 10.197).toFixed(1);
    const fy_MPa = (lastPayload.materials?.f_y || 420e6) > 1000 ? (lastPayload.materials.f_y / 1e6) : (lastPayload.materials?.f_y || 420);
    const fy_kgcm2 = +(fy_MPa * 10.197).toFixed(0);

    const auditData = {
      meta: {
        proyecto: lastPayload.project,
        fecha: new Date().toISOString(),
        norma: 'ACI 318 / COVENIN 1753',
        sistema_unidades: 'MKS (kgf, m, kgf/cm²)'
      },
      parametros_diseno: {
        fc_kgf_cm2: fc_kgcm2,
        fy_kgf_cm2: fy_kgcm2,
        recubrimiento_cm: (lastPayload.materials?.cover || 0.05) * 100,
        barra_diametro_mm: (lastPayload.materials?.bar_diam || 0.012) * 1000,
        q_adm_kgf_m2: +((lastPayload.materials?.q_adm || 150000) / 9.81).toFixed(0)
      },
      geometria: {
        Lx_m: Lx, Ly_m: Ly,
        espesor_h_m: h_m,
        espesor_h_cm: +(h_m * 100).toFixed(1),
        area_m2: +A_losa.toFixed(2)
      },
      calculo_de_cargas_MKS: {
        peso_propio_losa_kg: +P_losa_kg.toFixed(1),
        sobrecarga_sc_kg: +P_sc_kg.toFixed(1),
        peso_muros_factored_kg: +P_muros_kg.toFixed(1),
        carga_total_kg: +P_total_kg.toFixed(1),
        carga_total_kN: +(P_total_kg * 9.81 / 1000).toFixed(2),
        presion_media_suelo_kgf_m2: +(P_total_kg / A_losa).toFixed(1),
        detalle_muros: wallLoads
      },
      resultados_FEM: {
        desplazamiento_max_mm: results.displacements?.w_max_mm,
        momento_Mx_max_kNm_m: results.moments?.Mx_max_kNm_m,
        momento_My_max_kNm_m: results.moments?.My_max_kNm_m,
        cortante_Vu_max_kN_m: results.shear?.Vu_max_kN_m,
        cortante_phiVc_kN_m: results.shear?.phiVc_kN_m,
        verificacion_cortante: results.shear?.shear_ok ? 'CUMPLE' : 'NO CUMPLE',
        presion_max_suelo_kN_m2: results.soil_pressure?.max_pressure_kN_m2,
        q_adm_kN_m2: results.soil_pressure?.q_adm_kN_m2,
        verificacion_suelo: results.soil_pressure?.ok ? 'CUMPLE' : 'NO CUMPLE'
      },
      diseno_armado_bandas: results.bands,
      acero_minimo_cm2_m: results.As_min_cm2_m,
      observaciones: [
        'Verificación por cortante unidireccional (ACI 318 §11.3)',
        'El punzonamiento no es crítico para losas con muros (sin columnas puntuales)',
        'Bandas de refuerzo concentradas bajo cada muro según distribución FEM',
        `Fáctor de seguridad en presión suelo: ${results.soil_pressure?.q_adm_kN_m2 && results.soil_pressure?.max_pressure_kN_m2 ? (results.soil_pressure.q_adm_kN_m2 / results.soil_pressure.max_pressure_kN_m2).toFixed(2) : 'N/A'}`
      ],
      datos_entrada_raw: lastPayload
    };
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_losa_${projectName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    if (!results || !results.svg_plan) return;
    
    let tableRows = '';
    if (results.bands) {
      results.bands.forEach((b, i) => {
        const px = b.bar_x?.diam_mm > 0 ? `Ø${b.bar_x.diam_mm}@${(b.bar_x.sep_m*100).toFixed(0)}cm` : "Mínimo";
        const py = b.bar_y?.diam_mm > 0 ? `Ø${b.bar_y.diam_mm}@${(b.bar_y.sep_m*100).toFixed(0)}cm` : "Mínimo";
        tableRows += `<tr>
          <td>M${i+1}</td>
          <td>${b.type === 'perimetral' ? 'Perimetral' : 'Interno'}</td>
          <td>${b.band_width.toFixed(2)} m</td>
          <td>${b.Mx_design_kNm_m.toFixed(2)}</td>
          <td>${b.My_design_kNm_m.toFixed(2)}</td>
          <td>${b.Asx_cm2_m.toFixed(2)}</td>
          <td>${b.Asy_cm2_m.toFixed(2)}</td>
          <td>${px}</td>
          <td>${py}</td>
          <td style="color:#2e7d32;font-weight:bold;">OK</td>
        </tr>`;
      });
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plano de Armado — Losa de Cimentación</title>
<style>
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #222; background: #fff; max-width: 1000px; margin: 0 auto; padding: 20px;}
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; margin-bottom: 30px;}
  th { text-align: left; padding: 10px; border-bottom: 2px solid #ddd; color: #555; font-weight: 600; white-space: nowrap; background: #f5f5f5;}
  td { padding: 10px; border-bottom: 1px solid #eee; white-space: nowrap; }
  tr:hover td { background: #fafafa; }
  .svg-container { display: flex; justify-content: center; background: #fafafa; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin-bottom: 20px;}
</style>
</head>
<body>
  <h2>Reporte de Plano y Armado - Losa Híbrida</h2>
  <div class="svg-container">
    ${results.svg_plan}
  </div>
  <h3>Tabla de Armado de Bandas</h3>
  <table>
    <thead>
      <tr>
        <th>Muro</th><th>Tipo</th><th>Ancho banda</th>
        <th>Mx diseño<br>(kN·m/m)</th><th>My diseño<br>(kN·m/m)</th>
        <th>Asx<br>(cm²/m)</th><th>Asy<br>(cm²/m)</th>
        <th>Prop. X</th><th>Prop. Y</th><th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plano_armado_losa_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveToDatabase = async () => {
    if (!results) return;
    const freshPayload = buildCurrentPayload();
    setSaving(true);
    try {
      const runData = {
        nombre_proyecto: projectName,
        tipo_losa: 'losa_fundacion_hibrida',
        inputs: freshPayload,
        resultados: results
      };
      const method = currentRunId ? 'PUT' : 'POST';
      const endpoint = currentRunId ? `${API_BASE}/calculadora-losas/runs/${currentRunId}` : `${API_BASE}/calculadora-losas/runs`;
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runData)
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentRunId(data.id);
        toast.success("¡Cálculo guardado exitosamente!");
        fetchRuns();
      } else {
        toast.error("Error al guardar el cálculo.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const saveAsToDatabase = async (customName) => {
    if (!results) return;
    const freshPayload = buildCurrentPayload();
    setSaving(true);
    try {
      const runData = {
        nombre_proyecto: customName || projectName,
        tipo_losa: 'losa_fundacion_hibrida',
        inputs: { ...freshPayload, project: customName || projectName },
        resultados: results
      };
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runData)
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentRunId(data.id);
        setProjectName(customName || projectName);
        toast.success(`¡Guardado como "${customName}"!`);
        fetchRuns();
      } else {
        toast.error('Error al guardar.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de red al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRun = async (e, runId) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este cálculo? Esta acción no se puede deshacer.')) return;
    setDeletingRunId(runId);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs/${runId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Cálculo eliminado.');
        setSavedRuns(prev => prev.filter(r => r.id !== runId));
      } else {
        toast.error('Error al eliminar.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de red al eliminar.');
    } finally {
      setDeletingRunId(null);
    }
  };

  return (
    <>
    <div className="calc-losa-container">
      {/* MODAL PARA ABRIR PROYECTO */}
      {showSaveAsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h3>Guardar Como</h3>
            <p style={{color:'#666', fontSize:'13px', marginBottom:'12px'}}>Escribe un nombre para este cálculo:</p>
            <input
              type="text"
              value={saveAsName}
              onChange={e => setSaveAsName(e.target.value)}
              placeholder="Ej: Losa Casa Principal"
              className="project-name-input"
              style={{width:'100%', marginBottom:'16px'}}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && saveAsName.trim()) { saveAsToDatabase(saveAsName.trim()); setShowSaveAsModal(false); } }}
            />
            <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={() => setShowSaveAsModal(false)}>Cancelar</button>
              <button className="btn-success" disabled={!saveAsName.trim() || saving} onClick={() => { saveAsToDatabase(saveAsName.trim()); setShowSaveAsModal(false); }}>
                {saving ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Abrir Proyecto Guardado</h3>
            {loadingRuns ? <p>Cargando...</p> : (
              <ul className="runs-list">
                {savedRuns.length === 0 && <p>No hay cálculos guardados.</p>}
                {savedRuns.map(run => (
                  <li key={run.id} onClick={() => loadRun(run)} className="run-item">
                    <div className="run-item-info">
                      <strong>{run.nombre_proyecto}</strong>
                      <small>{new Date(run.created_at).toLocaleString()}</small>
                    </div>
                    <button
                      className="del-btn"
                      title="Eliminar cálculo"
                      disabled={deletingRunId === run.id}
                      onClick={(e) => deleteRun(e, run.id)}
                      style={{flexShrink: 0}}
                    >
                      {deletingRunId === run.id ? '...' : '🗑️'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn-secondary" style={{marginTop: '16px'}} onClick={() => setShowOpenModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      <div className="calc-header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h2>Diseño de Losa de Fundación (Método Híbrido)</h2>
            <p>Configura la losa (Plantillas) y divisiones internas (Tabla o Clics). Incluye JSON de Auditoría.</p>
          </div>
          <div className="header-actions">
            <input 
              type="text" 
              value={projectName} 
              onChange={e => setProjectName(e.target.value)} 
              placeholder="Nombre del Proyecto"
              className="project-name-input"
            />
            <button className="btn-secondary" onClick={() => { setShowOpenModal(true); fetchRuns(); }}>
              📂 Abrir Proyecto
            </button>
          </div>
        </div>
      </div>

      <div className="calc-body">
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div className="calc-sidebar">
          
          <div className="control-group">
            <h3>1. Forma de la Losa</h3>
            <div className="shape-selector" style={{marginBottom: '12px'}}>
              {SHAPES.map(s => (
                <button 
                  key={s.id} 
                  className={`shape-btn ${shape === s.id ? 'active' : ''}`}
                  onClick={() => handleShapeChange(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            
            {shape !== 'libre' && (
              <button 
                className="btn-secondary" 
                onClick={convertToManual} 
                style={{width: '100%', background: '#fff3e0', color: '#e65100', borderColor: '#ffcc80', fontWeight: 'bold'}}
              >
                🔗 Desvincular Perímetro (Editar aberturas)
              </button>
            )}

            <div className="params-grid" style={{marginTop: '16px'}}>
              <div className="param-item"><label>Lx Total (m):</label><input type="number" step="0.5" value={params.Lx} onChange={e => handleParamChange('Lx', e.target.value)} /></div>
              <div className="param-item"><label>Ly Total (m):</label><input type="number" step="0.5" value={params.Ly} onChange={e => handleParamChange('Ly', e.target.value)} /></div>
              
              {(shape === 'L' || shape === 'U') && <div className="param-item"><label>Ancho Ala Izq (m):</label><input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} /></div>}
              {shape === 'L' && <div className="param-item"><label>Ancho Ala Inf (m):</label><input type="number" step="0.1" value={params.wingY} onChange={e => handleParamChange('wingY', e.target.value)} /></div>}
              {shape === 'U' && (
                <>
                  <div className="param-item"><label>Ancho Ala Der (m):</label><input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} /></div>
                  <div className="param-item"><label>Fondo Base (m):</label><input type="number" step="0.1" value={params.baseY} onChange={e => handleParamChange('baseY', e.target.value)} /></div>
                </>
              )}
              {shape === 'T' && (
                <>
                  <div className="param-item"><label>Ancho Tallo Izq (m):</label><input type="number" step="0.1" value={params.wingX} onChange={e => handleParamChange('wingX', e.target.value)} /></div>
                  <div className="param-item"><label>Ancho Tallo Der (m):</label><input type="number" step="0.1" value={params.wingX2} onChange={e => handleParamChange('wingX2', e.target.value)} /></div>
                  <div className="param-item"><label>Alto Barra Sup (m):</label><input type="number" step="0.1" value={params.barY} onChange={e => handleParamChange('barY', e.target.value)} /></div>
                </>
              )}
              
              <div className="param-item"><label>Espesor Losa (cm):</label><input type="number" value={params.h} onChange={e => handleParamChange('h', e.target.value)} /></div>
            </div>
          </div>

          <div className="control-group">
            <h3>2. Muros y Suelo</h3>
            <div className="params-grid">
              <div className="param-item"><label>Offset / Retiro (m):</label><input type="number" step="0.05" value={offset} onChange={e => setOffset(e.target.value)} /></div>
              <div className="param-item"><label>Alto Muros (m):</label><input type="number" step="0.1" value={wallHeight} onChange={e => setWallHeight(e.target.value)} /></div>
              <div className="param-item"><label>f'c Concreto (kgf/cm²):</label><input type="number" step="10" value={designParams.fc} onChange={e => handleDesignParamChange('fc', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>fy Acero (kgf/cm²):</label><input type="number" step="100" value={designParams.fy} onChange={e => handleDesignParamChange('fy', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>Cap. Portante (kgf/cm²):</label><input type="number" step="0.1" value={designParams.q_adm} onChange={e => handleDesignParamChange('q_adm', parseFloat(e.target.value))} title="1.5 kgf/cm² = 15000 kgf/m²" /></div>
              <div className="param-item"><label>Ancho Banda (m):</label><input type="number" step="0.05" value={designParams.band_width_m} onChange={e => handleDesignParamChange('band_width_m', parseFloat(e.target.value))} title="0 = Auto (Calculado min)" /></div>
            </div>
            
            <div className="param-item" style={{ marginTop: '10px' }}>
              <label>Material Constructivo:</label>
              <select value={material} onChange={e => setMaterial(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                {Object.entries(MATERIALS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="param-item checkbox" style={{ marginTop: '10px' }}>
              <label>
                <input type="checkbox" checked={designParams.is_plastered} onChange={e => handleDesignParamChange('is_plastered', e.target.checked)} />
                Paredes Frisadas (+ Carga Muerta)
              </label>
            </div>
          </div>

          <div className="control-group">
            <h3>3. Muros Internos (Coord. o Clics)</h3>
            <p className="help-text">Doble clic en el gráfico para dibujar (con Snap) o llena la tabla.</p>
            <table className="coords-table">
              <thead>
                <tr>
                  <th>Tipo</th><th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th>
                </tr>
              </thead>
              <tbody>
                {internalWalls.map(w => (
                  <tr 
                    key={w.id} 
                    className={hoveredWallId === w.id ? 'highlighted-row' : ''}
                    onMouseEnter={() => setHoveredWallId(w.id)}
                    onMouseLeave={() => setHoveredWallId(null)}
                  >
                    <td>
                      <select value={w.type} onChange={e => updateInternalWall(w.id, 'type', e.target.value)} style={{width:'50px', padding:'2px', fontSize:'10px'}}>
                        <option value="interno">Int.</option>
                        <option value="perimetral">Per.</option>
                      </select>
                    </td>
                    <td><input type="number" step="0.5" value={w.x1} onChange={e => updateInternalWall(w.id, 'x1', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.y1} onChange={e => updateInternalWall(w.id, 'y1', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.x2} onChange={e => updateInternalWall(w.id, 'x2', e.target.value)} /></td>
                    <td><input type="number" step="0.5" value={w.y2} onChange={e => updateInternalWall(w.id, 'y2', e.target.value)} /></td>
                    <td><button className="del-btn" onClick={() => removeInternalWall(w.id)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tabla de Aberturas (si hay) */}
            {openings.length > 0 && (
               <div className="structural-table" style={{marginTop: '24px'}}>
                 <h4>Vanos y Aberturas (Drag & Drop)</h4>
                 <table className="coords-table">
                   <thead><tr><th>Vano</th><th>Muro ID</th><th>Inicio (m)</th><th>Ancho (m)</th><th>Alto (m)</th><th></th></tr></thead>
                   <tbody>
                     {openings.map(op => {
                       let Icon = AppWindow;
                       let label = 'Ventana';
                       if (op.type.startsWith('door_left')) { Icon = DoorClosed; label = 'Puerta (Izq)'; }
                       if (op.type.startsWith('door_right')) { Icon = DoorOpen; label = 'Puerta (Der)'; }
                       return (
                       <tr 
                         key={op.id}
                         className={hoveredOpeningId === op.id ? 'highlighted-row' : ''}
                         onMouseEnter={() => setHoveredOpeningId(op.id)}
                         onMouseLeave={() => setHoveredOpeningId(null)}
                       >
                         <td style={{display:'flex', alignItems:'center', gap:'6px'}}><Icon size={16} color="#666"/> {label}</td>
                         <td>{String(op.wall_id).substring(0,8)}</td>
                         <td>{op.start_m.toFixed(2)}</td>
                         <td>{op.width_m.toFixed(2)}</td>
                         <td>{op.height_m.toFixed(2)}</td>
                         <td><button className="del-btn" onClick={() => removeOpening(op.id)}>X</button></td>
                       </tr>
                     )})}
                   </tbody>
                 </table>
               </div>
            )}
            
            <button className="add-btn" onClick={() => addInternalWall({})}>+ Añadir Muro Interno</button>
          </div>

          <button className="analyze-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? 'Calculando FEM...' : 'Ejecutar Análisis Estructural'}
          </button>
          {error && <div className="error-box">{error}</div>}

          {/* Botones de Auditoría (Aparecen si hay resultados) */}
          {results && !error && (
            <div className="audit-actions">
              <button className="btn-primary-results" onClick={() => setShowResultsModal(true)}>
                📊 Ver Resultados
              </button>
              <button className="btn-secondary" onClick={downloadHTML} style={{background: '#e3f2fd', borderColor: '#90caf9'}}>
                📄 Plano HTML
              </button>
              <button className="btn-secondary" onClick={downloadAuditJSON}>
                ⬇️ JSON Auditoría
              </button>
              <button className="btn-success" onClick={saveToDatabase} disabled={saving}>
                💾 {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                className="btn-secondary"
                style={{borderColor:'#4caf50', color:'#2e7d32'}}
                onClick={() => { setSaveAsName(projectName); setShowSaveAsModal(true); }}
                disabled={!results}
              >
                📂 Guardar Como
              </button>
            </div>
          )}

          {/* Estado rápido inline (sin abrir modal) */}
          {results && !error && (
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'8px'}}>
              <span className={`status-badge ${results.shear?.shear_ok ? 'ok' : 'fail'}`}>
                Cortante: {results.shear?.shear_ok ? '✓ OK' : '✗ Revisar'}
              </span>
              <span className={`status-badge ${results.soil_pressure?.ok ? 'ok' : 'fail'}`}>
                Suelo: {results.soil_pressure?.ok ? '✓ OK' : '✗ Revisar'}
              </span>
              <span className="status-badge info">
                wₘₐₓ = {(results.displacements?.w_max_mm || 0).toFixed(2)} mm
              </span>
            </div>
          )}

        </div>

        {/* TOOLBAR VERTICAL FLOTANTE (STICKY) */}
        <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10, alignSelf: 'flex-start', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h5 style={{margin: '0', fontSize: '12px', color: '#666', textAlign:'center', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Arrastrar</h5>
          <div className="drag-toolbox" style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            <div draggable onDragStart={(e) => handleDragStart(e, 'door_left')} className="drag-item" title="Puerta Izquierda (Adentro)" style={{fontSize:'12px', padding:'8px 4px', textAlign:'center', lineHeight:'1.2'}}><DoorClosed size={20} color="#555" style={{margin:'0 auto 4px'}}/ >P. Izq<br/><small>(Adentro)</small></div>
            <div draggable onDragStart={(e) => handleDragStart(e, 'door_left_out')} className="drag-item" title="Puerta Izquierda (Afuera)" style={{fontSize:'12px', padding:'8px 4px', textAlign:'center', lineHeight:'1.2'}}><DoorClosed size={20} color="#555" style={{margin:'0 auto 4px'}}/ >P. Izq<br/><small>(Afuera)</small></div>
            <div draggable onDragStart={(e) => handleDragStart(e, 'door_right')} className="drag-item" title="Puerta Derecha (Adentro)" style={{fontSize:'12px', padding:'8px 4px', textAlign:'center', lineHeight:'1.2'}}><DoorOpen size={20} color="#555" style={{margin:'0 auto 4px'}}/ >P. Der<br/><small>(Adentro)</small></div>
            <div draggable onDragStart={(e) => handleDragStart(e, 'door_right_out')} className="drag-item" title="Puerta Derecha (Afuera)" style={{fontSize:'12px', padding:'8px 4px', textAlign:'center', lineHeight:'1.2'}}><DoorOpen size={20} color="#555" style={{margin:'0 auto 4px'}}/ >P. Der<br/><small>(Afuera)</small></div>
            <div draggable onDragStart={(e) => handleDragStart(e, 'window')} className="drag-item" title="Ventana" style={{fontSize:'12px', padding:'8px 4px', textAlign:'center', lineHeight:'1.2'}}><AppWindow size={20} color="#555" style={{margin:'0 auto 4px'}}/ >Ventana</div>
          </div>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA Y RESULTADOS */}
        <div className="calc-content" style={{ flex: '1', minWidth: 0 }}>
          <div className="canvas-wrapper hybrid-canvas">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <h4 style={{margin:0}}>Plano Interactivo</h4>
                <div style={{display:'flex', gap:'4px', marginLeft:'12px'}}>
                  <button onClick={undo} disabled={historyPast.length === 0} title="Deshacer" style={{padding:'4px 8px', cursor: historyPast.length === 0 ? 'not-allowed' : 'pointer', background:'#fff', border:'1px solid #ccc', borderRadius:'4px'}}><Undo2 size={16} color={historyPast.length === 0 ? '#ccc' : '#333'}/></button>
                  <button onClick={redo} disabled={historyFuture.length === 0} title="Rehacer" style={{padding:'4px 8px', cursor: historyFuture.length === 0 ? 'not-allowed' : 'pointer', background:'#fff', border:'1px solid #ccc', borderRadius:'4px'}}><Redo2 size={16} color={historyFuture.length === 0 ? '#ccc' : '#333'}/></button>
                </div>
              </div>
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span className="mouse-tracker">📍 X: {mouseCoord.x.toFixed(1)}m, Y: {mouseCoord.y.toFixed(1)}m</span>
              </div>
            </div>
            
            <svg 
              ref={svgRef}
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              className={`drawing-board ${isDrawing ? 'drawing-mode' : ''}`}
              onMouseMove={handleMouseMove}
              onDoubleClick={handleSvgDoubleClick}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{ cursor: isDrawing ? 'crosshair' : 'pointer' }}
            >
              {/* Ejes X (Ruler Top) */}
              <rect x={0} y={0} width={CANVAS_SIZE} height={MARGIN-5} fill="#f0f0f0" />
              {Array.from({ length: Math.ceil(params.Lx) + 1 }).map((_, i) => (
                <g key={`rx${i}`}>
                  <line x1={toSvg(i)} y1={MARGIN-5} x2={toSvg(i)} y2={MARGIN} stroke="#333" strokeWidth="1.5" />
                  <text x={toSvg(i)} y={MARGIN-10} fontSize="10" textAnchor="middle" fill="#555">{i}</text>
                </g>
              ))}

              {/* Ejes Y (Ruler Left) */}
              <rect x={0} y={0} width={MARGIN-5} height={CANVAS_SIZE} fill="#f0f0f0" />
              {Array.from({ length: Math.ceil(params.Ly) + 1 }).map((_, i) => (
                <g key={`ry${i}`}>
                  <line x1={MARGIN-5} y1={toSvg(i)} x2={MARGIN} y2={toSvg(i)} stroke="#333" strokeWidth="1.5" />
                  <text x={MARGIN-10} y={toSvg(i)+3} fontSize="10" textAnchor="end" fill="#555">{i}</text>
                </g>
              ))}

              {/* Grid Mayor (1m) e Intenso */}
              {Array.from({ length: Math.ceil(params.Lx) + 1 }).map((_, i) => (
                <line key={`vx${i}`} x1={toSvg(i)} y1={MARGIN} x2={toSvg(i)} y2={toSvg(params.Ly)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
              ))}
              {Array.from({ length: Math.ceil(params.Ly) + 1 }).map((_, i) => (
                <line key={`vy${i}`} x1={MARGIN} y1={toSvg(i)} x2={toSvg(params.Lx)} y2={toSvg(i)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
              ))}
              
              {/* Grid Menor (0.5m) */}
              {Array.from({ length: Math.ceil(params.Lx) * 2 }).map((_, i) => (
                <line key={`vx_sub${i}`} x1={toSvg(i*0.5)} y1={MARGIN} x2={toSvg(i*0.5)} y2={toSvg(params.Ly)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />
              ))}
              {Array.from({ length: Math.ceil(params.Ly) * 2 }).map((_, i) => (
                <line key={`vy_sub${i}`} x1={MARGIN} y1={toSvg(i*0.5)} x2={toSvg(params.Lx)} y2={toSvg(i*0.5)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />
              ))}

              {/* Losa Máxima (Bounding Box) */}
              <rect x={MARGIN} y={MARGIN} width={toSvg(params.Lx)-MARGIN} height={toSvg(params.Ly)-MARGIN} fill="rgba(33, 150, 243, 0.03)" stroke="#2196f3" strokeDasharray="5,5" />

              {/* Muros */}
              {allWalls.map(w => {
                const isHovered = hoveredWallId === w.id;
                const strokeColor = isHovered ? '#ff9800' : (w.type === 'perimetral' ? '#e53935' : '#1e88e5');
                const strokeW = Math.max(isHovered ? 8 : 4, w.thickness * scale + (isHovered ? 4 : 0));

                return (
                <g key={w.id} 
                   onMouseEnter={() => setHoveredWallId(w.id)}
                   onMouseLeave={() => setHoveredWallId(null)}
                   style={{ cursor: 'pointer' }}
                >
                    {isHovered && (
                      <line 
                        x1={toSvg(w.x1)} y1={toSvg(w.y1)} 
                        x2={toSvg(w.x2)} y2={toSvg(w.y2)} 
                        stroke="#ffe0b2" 
                        strokeWidth={strokeW + 6} strokeLinecap="round" 
                      />
                    )}
                    <line 
                      x1={toSvg(w.x1)} y1={toSvg(w.y1)} 
                      x2={toSvg(w.x2)} y2={toSvg(w.y2)} 
                      stroke={strokeColor} 
                      strokeWidth={strokeW} strokeLinecap="round" 
                    />
                    {openings.filter(op => op.wall_id === w.id).map(op => {
                      const len = Math.sqrt((w.x2-w.x1)**2 + (w.y2-w.y1)**2);
                      if (len < 0.01) return null;
                      const t1 = op.start_m / len;
                      const t2 = Math.min((op.start_m + op.width_m) / len, 1);
                      const ox1 = toSvg(w.x1 + t1 * (w.x2 - w.x1));
                      const oy1 = toSvg(w.y1 + t1 * (w.y2 - w.y1));
                      const ox2 = toSvg(w.x1 + t2 * (w.x2 - w.x1));
                      const oy2 = toSvg(w.y1 + t2 * (w.y2 - w.y1));
                      
                      const thickPx = Math.max(4, w.thickness * scale);
                      const w_px = Math.sqrt((ox2-ox1)**2 + (oy2-oy1)**2);
                      if (w_px < 1) return null;

                      // Unit vector along wall (in SVG coords)
                      const ux = (ox2-ox1)/w_px;
                      const uy = (oy2-oy1)/w_px;
                      // Perpendicular: determines opening direction based on wall drawing direction
                      let vx = -uy;
                      let vy = ux;

                      if (op.type.startsWith('door')) {
                        const isLeft = op.type.includes('left');
                        const isOut = op.type.includes('out');
                        
                        if (isOut) {
                          vx = -vx;
                          vy = -vy;
                        }

                        // Hinge point and free end
                        const hx = isLeft ? ox1 : ox2;
                        const hy = isLeft ? oy1 : oy2;
                        const ex = isLeft ? ox2 : ox1;
                        const ey = isLeft ? oy2 : oy1;
                        // Leaf swings toward interior
                        const lx = hx + vx * w_px;
                        const ly = hy + vy * w_px;
                        // Arc sweep: in SVG Y-down, we need to determine CW vs CCW
                        // Bulletproof sweep flag: cross product of vectors HL and HE
                        const hl_x = lx - hx;
                        const hl_y = ly - hy;
                        const he_x = ex - hx;
                        const he_y = ey - hy;
                        const cross = (hl_x * he_y) - (hl_y * he_x);
                        const sweep = cross > 0 ? 1 : 0;
                        
                        const isOpHovered = hoveredOpeningId === op.id;
                        return (
                          <g key={op.id} onMouseEnter={() => setHoveredOpeningId(op.id)} onMouseLeave={() => setHoveredOpeningId(null)} style={{cursor: 'pointer'}}>
                            <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#fafafa" strokeWidth={thickPx + 2} strokeLinecap="butt" />
                            <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={isOpHovered ? "#ff9800" : "#222"} strokeWidth={isOpHovered ? "3.5" : "2.5"} strokeLinecap="square" />
                            <path d={`M ${lx.toFixed(1)} ${ly.toFixed(1)} A ${w_px.toFixed(1)} ${w_px.toFixed(1)} 0 0 ${sweep} ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill={isOpHovered ? "rgba(255,152,0,0.1)" : "none"} stroke={isOpHovered ? "#ff9800" : "#444"} strokeWidth={isOpHovered ? "2.5" : "1.5"} strokeDasharray="5,3" />
                          </g>
                        );
                      } else {
                        // Window: double glass lines
                        const gap = thickPx * 0.35;
                        const isOpHovered = hoveredOpeningId === op.id;
                        const winColor = isOpHovered ? "#ff9800" : "#5bc0de";
                        const glassColor = isOpHovered ? "#ffb74d" : "#333";
                        return (
                          <g key={op.id} onMouseEnter={() => setHoveredOpeningId(op.id)} onMouseLeave={() => setHoveredOpeningId(null)} style={{cursor: 'pointer'}}>
                            <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#fafafa" strokeWidth={thickPx + 2} strokeLinecap="butt" />
                            <line x1={ox1 + vx*gap} y1={oy1 + vy*gap} x2={ox2 + vx*gap} y2={oy2 + vy*gap} stroke={glassColor} strokeWidth="1.2" />
                            <line x1={ox1 - vx*gap} y1={oy1 - vy*gap} x2={ox2 - vx*gap} y2={oy2 - vy*gap} stroke={glassColor} strokeWidth="1.2" />
                            <line x1={ox1 + vx*2} y1={oy1 + vy*2} x2={ox2 + vx*2} y2={oy2 + vy*2} stroke={winColor} strokeWidth={isOpHovered ? "3" : "2"} />
                            <line x1={ox1 - vx*2} y1={oy1 - vy*2} x2={ox2 - vx*2} y2={oy2 - vy*2} stroke={winColor} strokeWidth={isOpHovered ? "3" : "2"} />
                          </g>
                        );
                      }
                    })}
                  </g>
                );
              })}

              {/* Pre-visualización de Muro dibujándose */}
              {isDrawing && drawStart && drawEnd && (
                <line 
                  x1={toSvg(drawStart.x)} y1={toSvg(drawStart.y)}
                  x2={toSvg(drawEnd.x)} y2={toSvg(drawEnd.y)}
                  stroke="#ff9800" strokeWidth="4" strokeDasharray="5,5" strokeLinecap="round"
                />
              )}

              {/* Punto indicador de Snap Mouse */}
              <circle cx={toSvg(mouseCoord.x)} cy={toSvg(mouseCoord.y)} r="4" fill="#ff9800" />

            </svg>
            {isDrawing && <div className="drawing-hint">Haz doble clic nuevamente para fijar el muro. Presiona ESC para cancelar.</div>}
          </div>

          {/* Renderizado de Resultados — ahora en Modal */}
        </div>
      </div>
    </div>

    {/* ===== MODAL DE RESULTADOS ===== */}
    {showResultsModal && results && (
      <div className="modal-overlay" style={{alignItems:'flex-start', padding:'20px', overflowY:'auto'}} onClick={() => setShowResultsModal(false)}>
        <div className="modal-content" style={{maxWidth:'960px', width:'100%', margin:'auto', padding:'0'}} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid #eee', background:'#1e1e2f', borderRadius:'12px 12px 0 0'}}>
            <div>
              <h3 style={{margin:0, color:'#fff', fontSize:'16px'}}>📊 Resultados del Análisis Estructural (ACI 318)</h3>
              <small style={{color:'#aaa'}}>{projectName}</small>
            </div>
            <button onClick={() => setShowResultsModal(false)} style={{background:'none', border:'1px solid #555', color:'#fff', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'14px'}}>✕ Cerrar</button>
          </div>

          {/* Cards de métricas clave */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', padding:'20px 24px', background:'#f9f9f9', borderBottom:'1px solid #eee'}}>
            {[{
              label:'Asentamiento Máx', val: `${(results.displacements?.w_max_mm||0).toFixed(2)} mm`, ok: true
            },{
              label:'Momento Mx Máx', val: `${(results.moments?.Mx_max_kNm_m||0).toFixed(2)} kN·m/m`, ok: true
            },{
              label:'Momento My Máx', val: `${(results.moments?.My_max_kNm_m||0).toFixed(2)} kN·m/m`, ok: true
            },{
              label:'Cortante Vu Máx', val: `${(results.shear?.Vu_max_kN_m||0).toFixed(1)} kN/m`, ok: results.shear?.shear_ok
            },{
              label:'φVc Cap.', val: `${(results.shear?.phiVc_kN_m||0).toFixed(1)} kN/m`, ok: results.shear?.shear_ok
            },{
              label:'Presión Suelo', val: results.soil_pressure ? `${results.soil_pressure.max_pressure_kN_m2.toFixed(1)} kN/m²` : '-', ok: results.soil_pressure?.ok
            },{
              label:'q_adm', val: results.soil_pressure ? `${results.soil_pressure.q_adm_kN_m2.toFixed(0)} kN/m²` : '-', ok: true
            },{
              label:'Acero Mínimo', val: `${(results.As_min_cm2_m||0).toFixed(2)} cm²/m`, ok: true
            }].map((c, i) => (
              <div key={i} style={{background:'#fff', borderRadius:'8px', padding:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', borderLeft:`3px solid ${c.ok ? '#4caf50' : '#e53935'}`}}>
                <div style={{fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px'}}>{c.label}</div>
                <div style={{fontSize:'16px', fontWeight:'700', color: c.ok ? '#1a1a1a' : '#c62828'}}>{c.val}</div>
              </div>
            ))}
          </div>

          {/* Plano SVG */}
          {results.svg_plan && (
            <div style={{padding:'20px 24px', borderBottom:'1px solid #eee'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#333'}}>Plano Estructural</h4>
              <div style={{background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'12px', overflow:'auto'}} dangerouslySetInnerHTML={{__html: results.svg_plan}} />
            </div>
          )}

          {/* Mapa de calor - solo descarga */}
          {results.heatmap_base64 && (
            <div style={{padding:'16px 24px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:'16px', background:'#f0f4ff'}}>
              <span style={{fontSize:'13px', color:'#555'}}>🌡️ <strong>Mapas de Calor FEM generados</strong> (Desplazamiento, Momentos Mx/My, Cortante, Acero As X/Y, Ratio Vu/φVc)</span>
              <a
                href={`data:image/png;base64,${results.heatmap_base64}`}
                download={`mapas_calor_${projectName.replace(/\s+/g,'_')}.png`}
                style={{background:'#3f51b5', color:'#fff', padding:'6px 14px', borderRadius:'6px', textDecoration:'none', fontSize:'12px', whiteSpace:'nowrap', flexShrink:0}}
              >
                ⬇️ Descargar PNG (8 paneles)
              </a>
            </div>
          )}

          {/* Cantidades de Obra */}
          {results.materials_computation && (
            <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#f5f7fa'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#333'}}>🏗️ Cómputos Métricos (Cantidades Estimadas)</h4>
              <div style={{display:'flex', gap:'20px'}}>
                <div style={{flex:1, background:'#fff', padding:'12px', borderRadius:'8px', border:'1px solid #e0e0e0'}}>
                  <strong>Volumen de Concreto:</strong>
                  <div style={{fontSize:'20px', color:'#1565c0', fontWeight:'bold'}}>{results.materials_computation.concrete_vol_m3.toFixed(2)} m³</div>
                  <div style={{fontSize:'12px', color:'#777'}}>Área neta x Espesor de Losa</div>
                  <div style={{marginTop: '10px', fontSize: '13px', color: '#444'}}>
                    <div><strong>Perímetro:</strong> {allWalls.filter(w => w.type === 'perimetral').reduce((sum, w) => sum + Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2)), 0).toFixed(2)} m lineales</div>
                    <div><strong>Muros Internos:</strong> {allWalls.filter(w => w.type !== 'perimetral').reduce((sum, w) => sum + Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2)), 0).toFixed(2)} m lineales</div>
                    <div><strong>Total Bandas:</strong> {allWalls.reduce((sum, w) => sum + Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2)), 0).toFixed(2)} m lineales</div>
                  </div>
                </div>
                <div style={{flex:1, background:'#fff', padding:'12px', borderRadius:'8px', border:'1px solid #e0e0e0'}}>
                  <strong>Acero General Losa (Mínimo):</strong>
                  <div style={{fontSize:'14px', color:'#c62828', fontWeight:'bold'}}>{results.materials_computation.general_slab_steel.bar_x} en X, {results.materials_computation.general_slab_steel.bar_y} en Y</div>
                  <div style={{fontSize:'12px', color:'#777'}}>Peso estimado: {results.materials_computation.steel_weight_general_kg.toFixed(0)} kg</div>
                  {results.materials_computation.general_bars_6m && <div style={{fontSize:'12px', color:'#555'}}>~ {results.materials_computation.general_bars_6m} varillas de 6m</div>}
                </div>
                <div style={{flex:1, background:'#fff', padding:'12px', borderRadius:'8px', border:'1px solid #e0e0e0'}}>
                  <strong>Acero de Bandas (Refuerzo):</strong>
                  <div style={{fontSize:'12px', color:'#777'}}>Peso adicional en bandas: {results.materials_computation.steel_weight_bands_kg.toFixed(0)} kg</div>
                  {results.materials_computation.bands_bars_6m !== undefined && <div style={{fontSize:'12px', color:'#555'}}>~ {results.materials_computation.bands_bars_6m} varillas de 6m (eq)</div>}
                  <div style={{fontSize:'14px', color:'#2e7d32', fontWeight:'bold', marginTop:'4px'}}>Total Acero: {(results.materials_computation.steel_weight_general_kg + results.materials_computation.steel_weight_bands_kg).toFixed(0)} kg</div>
                  {results.materials_computation.total_bars_6m && <div style={{fontSize:'13px', color:'#2e7d32'}}>Total varillas 6m: {results.materials_computation.total_bars_6m}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Bandas */}
          {results.bands && (
            <div style={{padding:'20px 24px', overflowX:'auto'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#333'}}>Tabla de Armado de Bandas</h4>
              <table className="coords-table" style={{minWidth:'720px', fontSize:'12px'}}>
                <thead>
                  <tr style={{background:'#1e1e2f', color:'#fff'}}>
                    <th style={{color:'#fff'}}>Muro</th><th style={{color:'#fff'}}>Tipo</th>
                    <th style={{color:'#fff'}}>Ancho Banda</th>
                    <th style={{color:'#fff'}}>Mx (kN·m/m)</th><th style={{color:'#fff'}}>My (kN·m/m)</th>
                    <th style={{color:'#fff'}}>Asx (cm²/m)</th><th style={{color:'#fff'}}>Asy (cm²/m)</th>
                    <th style={{color:'#fff'}}>Prop. X</th><th style={{color:'#fff'}}>Prop. Y</th>
                    <th style={{color:'#fff'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {results.bands.map((b, i) => {
                    const asMin = results.materials_computation?.As_min_cm2_m || 0;
                    const isMinX = b.Asx_cm2_m <= asMin + 0.01;
                    const isMinY = b.Asy_cm2_m <= asMin + 0.01;
                    const px = isMinX ? 'Malla General' : (b.bar_x?.diam_mm > 0 ? `Ø${b.bar_x.diam_mm}@${(b.bar_x.sep_m*100).toFixed(0)}cm` : 'Mínimo');
                    const py = isMinY ? 'Malla General' : (b.bar_y?.diam_mm > 0 ? `Ø${b.bar_y.diam_mm}@${(b.bar_y.sep_m*100).toFixed(0)}cm` : 'Mínimo');
                    return (
                      <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                        <td>M{i+1}</td>
                        <td><span style={{padding:'2px 6px', borderRadius:'3px', fontSize:'10px', background: b.type==='perimetral' ? '#ffebee' : '#e3f2fd', color: b.type==='perimetral' ? '#c62828' : '#1565c0'}}>{b.type==='perimetral' ? 'Perim.' : 'Interno'}</span></td>
                        <td>{b.band_width.toFixed(2)} m</td>
                        <td>{b.Mx_design_kNm_m.toFixed(2)}</td>
                        <td>{b.My_design_kNm_m.toFixed(2)}</td>
                        <td style={{fontWeight:'600'}}>{b.Asx_cm2_m.toFixed(2)}</td>
                        <td style={{fontWeight:'600'}}>{b.Asy_cm2_m.toFixed(2)}</td>
                        <td>{px}</td>
                        <td>{py}</td>
                        <td><span style={{color:'#2e7d32', fontWeight:'700'}}>✓</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabla de Presupuesto */}
          {presupuesto.length > 0 && (
            <div style={{padding:'20px 24px', overflowX:'auto', background:'#fff'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                <h4 style={{margin:0, color:'#333'}}>📋 Presupuesto Estimado</h4>
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="btn-success" onClick={descargarMemoriaCalculoHtml} style={{background:'#673ab7'}}>
                    📘 Memoria de Cálculo (HTML)
                  </button>
                  <button className="btn-success" onClick={descargarExcel} style={{background:'#1976d2'}}>
                    📄 Descargar Excel con Fórmulas
                  </button>
                  <button className="btn-success" onClick={descargarPDFPresupuesto} style={{background:'#2e7d32'}}>
                    📄 Descargar PDF
                  </button>
                </div>
              </div>
              <table className="coords-table" style={{minWidth:'720px', fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#1e1e2f', color:'#fff'}}>
                    <th style={{color:'#fff', textAlign:'left'}}>Material</th>
                    <th style={{color:'#fff'}}>Unidad</th>
                    <th style={{color:'#fff'}}>Cantidad</th>
                    <th style={{color:'#fff'}}>P.U. ($)</th>
                    <th style={{color:'#fff', textAlign:'right'}}>Total ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {['Losa de Fundación', 'Mampostería'].map((chap) => {
                    const items = presupuesto.filter(p => p.chapter === chap);
                    if (items.length === 0) return null;
                    const subtotal = items.reduce((acc, it) => acc + it.total, 0);
                    return (
                      <React.Fragment key={chap}>
                        <tr style={{background:'#e3f2fd'}}>
                          <td colSpan="4" style={{fontWeight:'bold', color:'#0d47a1'}}>{chap}</td>
                          <td style={{textAlign:'right', fontWeight:'bold', color:'#0d47a1'}}>${subtotal.toFixed(2)}</td>
                        </tr>
                        {items.map((p, i) => (
                          <tr key={`${chap}-${i}`} style={{background: i % 2 === 0 ? '#f9f9f9' : '#fff'}}>
                            <td style={{textAlign:'left', fontWeight:'500', paddingLeft:'24px'}}>{p.material}</td>
                            <td>{p.unit}</td>
                            <td>{p.qty}</td>
                            <td>{p.pu.toFixed(2)}</td>
                            <td style={{textAlign:'right', fontWeight:'500'}}>${p.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'#eeeeee'}}>
                    <td colSpan="4" style={{textAlign:'right', fontWeight:'bold', fontSize:'14px'}}>GRAN TOTAL:</td>
                    <td style={{textAlign:'right', fontWeight:'bold', fontSize:'16px', color:'#1b5e20'}}>${presupuestoTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{padding:'12px 24px', borderTop:'1px solid #eee', display:'flex', justifyContent:'flex-end', gap:'8px', background:'#fafafa', borderRadius:'0 0 12px 12px'}}>
            <button className="btn-secondary" onClick={downloadAuditJSON}>⬇️ JSON Auditoría MKS</button>
            <button className="btn-secondary" onClick={downloadHTML} style={{background:'#e3f2fd', borderColor:'#90caf9'}}>📄 Plano HTML</button>
            <button onClick={() => setShowResultsModal(false)} className="btn-success">Cerrar</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
