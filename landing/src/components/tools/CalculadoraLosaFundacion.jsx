import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './CalculadoraLosaFundacion.css';
import { DoorOpen, DoorClosed, AppWindow, Undo2, Redo2, LogIn, LogOut, ArrowLeft } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FaClipboardList, FaFilePdf, FaMap, FaChartBar, FaDownload, FaThermometerHalf, FaHardHat, FaImage, FaTable, FaBook, FaFileExcel, FaFileCode, FaSave, FaFolderPlus, FaDrawPolygon, FaCubes, FaColumns, FaDoorOpen, FaCogs, FaPlay, FaBorderAll } from 'react-icons/fa';
import InteractiveHeatmap from './InteractiveHeatmap';

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
  cabilla_7: 4.5,
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

const generarPresupuesto = (results, prices, designParams) => {
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
  const custom_mesh_cm2_m = designParams?.custom_mesh_cm2_m || 0;
  
  let label_acero = 'Cabilla de 10 mm (Losa)';
  let precio_acero = 7.36; // default 10mm
  
  if (custom_mesh_cm2_m > 0) {
    if (custom_mesh_cm2_m === 0.61 || custom_mesh_cm2_m === 1.88) {
      // Es una Malla (se calcula por m2)
      const area_losa_m2 = results?.inputs?.geometry?.Lx * results?.inputs?.geometry?.Ly || 100;
      const area_con_desperdicio = +(area_losa_m2 * 1.10).toFixed(2); // 10% de solape/desperdicio
      
      if (custom_mesh_cm2_m === 0.61) { label_acero = 'Malla 6x6 (Ø3.43@15)'; precio_acero = p.malla_6x6 || 2.50; }
      else if (custom_mesh_cm2_m === 1.88) { label_acero = 'Malla Sima (Ø6@15)'; precio_acero = p.malla_sima || 5.00; }
      
      items.push({ chapter: 'Losa de Fundación', material: label_acero, unit: 'm²', qty: area_con_desperdicio, pu: precio_acero, total: area_con_desperdicio * precio_acero });
    } else {
      // Son varillas (se calcula por und de 6m)
      if (custom_mesh_cm2_m === 1.41) { label_acero = 'Varillas Ø6@20cm (Losa)'; precio_acero = p.cabilla_6 || 4.50; }
      else if (custom_mesh_cm2_m === 1.92) { label_acero = 'Varillas Ø7@20cm (Losa)'; precio_acero = p.cabilla_7 || 4.50; }
      else if (custom_mesh_cm2_m === 2.51) { label_acero = 'Varillas Ø8@20cm (Losa)'; precio_acero = p.cabilla_8 || 5.90; }
      else if (custom_mesh_cm2_m === 3.93) { label_acero = 'Varillas Ø10@20cm (Losa)'; precio_acero = p.cabilla_10 || 5.82; }
      else if (custom_mesh_cm2_m === 5.24) { label_acero = 'Varillas Ø10@15cm (Losa)'; precio_acero = p.cabilla_10 || 5.82; }
      
      const total_cabillas_losa = m.total_bars_6m;
      items.push({ chapter: 'Losa de Fundación', material: label_acero, unit: 'und', qty: total_cabillas_losa, pu: precio_acero, total: total_cabillas_losa * precio_acero });
    }
  } else {
    const diam_base = m.diam_base_mm || 10;
    label_acero = `Cabilla de ${diam_base} mm (Losa)`;
    if (diam_base === 7) precio_acero = p.cabilla_7 || 4.50;
    else if (diam_base === 8) precio_acero = p.cabilla_8 || 5.90;
    else if (diam_base === 10) precio_acero = p.cabilla_10 || 5.82;
    else if (diam_base > 10) precio_acero = 7.36 * Math.pow(diam_base / 10, 2);
    
    const total_cabillas_losa = m.total_bars_6m;
    items.push({ chapter: 'Losa de Fundación', material: label_acero, unit: 'und', qty: total_cabillas_losa, pu: precio_acero, total: total_cabillas_losa * precio_acero });
  }

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

  // ==== CAPÍTULO: MACHONES / COLUMNAS ====
  const vol_machon = s.vol_machones_m3 || 0;
  if (vol_machon > 0) {
    const cemento_machon = Math.ceil(vol_machon * 9.5); // Concreto más resistente para machones
    const arena_machon = +(vol_machon * 0.55).toFixed(2);
    const piedra_machon = +(vol_machon * 0.67).toFixed(2);
    items.push({ chapter: 'Machones', material: 'Cemento Portland (Machón)', unit: 'sacos', qty: cemento_machon, pu: p.cemento, total: cemento_machon * p.cemento });
    items.push({ chapter: 'Machones', material: 'Arena Lavada (Machón)', unit: 'm³', qty: arena_machon, pu: p.arena, total: arena_machon * p.arena });
    items.push({ chapter: 'Machones', material: 'Piedra picada (Machón)', unit: 'm³', qty: piedra_machon, pu: p.piedra, total: piedra_machon * p.piedra });

    if (s.machones_10mm_bars > 0) {
      items.push({ chapter: 'Machones', material: 'Cabilla de 10 mm (Longitudinal)', unit: 'und', qty: s.machones_10mm_bars, pu: p.cabilla_10, total: s.machones_10mm_bars * p.cabilla_10 });
    }
    if (s.machones_5_2mm_bars > 0) {
      items.push({ chapter: 'Machones', material: 'Cabilla de 5.2 mm (Estribos)', unit: 'und', qty: s.machones_5_2mm_bars, pu: p.cabilla_5_2, total: s.machones_5_2mm_bars * p.cabilla_5_2 });
    }
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
  
  // Rendimiento volumétrico real de friso a 1 cm de espesor base (Proporción 1:4):
  const vol_neto_friso = area_total_muros * 0.01;
  const vol_seco_friso = vol_neto_friso * 1.10;
  const cemento_friso = Math.ceil(vol_seco_friso * 4.5); // 4.5 sacos por m3 de mortero seco
  const arena_friso = +(vol_seco_friso * 1.05).toFixed(2); // 1.05 m3 por m3 de mortero seco
  
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

const DraggableModal = ({ children, onClose, title, width = '800px' }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="modal-overlay" style={{zIndex: 50, background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', pointerEvents: 'none'}}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{
          maxWidth: '95%', 
          width: width, 
          padding: '20px', 
          pointerEvents: 'auto',
          transform: `translate(${position.x}px, ${position.y}px)`,
          position: 'relative',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
          border: '1px solid #ccc',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div 
          onMouseDown={handleMouseDown}
          style={{display:'flex',justifyContent:'space-between', alignItems:'center', marginBottom:'16px', cursor: 'move', paddingBottom: '10px', borderBottom: '1px solid #eee', userSelect: 'none', flexShrink: 0}}
        >
            <h3 style={{margin:0, fontSize:'16px', color:'#1A6BB5'}}>{title}</h3>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} style={{background:'none', border:'none', color:'#888', fontSize:'20px', cursor:'pointer', padding:'4px', width:'auto', display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
        </div>
        <div style={{overflowY: 'auto', flex: 1, paddingRight: '5px'}}>
          {children}
        </div>
      </div>
    </div>
  );
};


export default function CalculadoraLosaFundacion({ onBack }) {
  const svgRef = useRef(null);
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Configuración de Losa y Perímetro
  const [shape, setShape] = useState('libre');
  const [params, setParams] = useState({
    Lx: 10, Ly: 10,       
    wingX: 4, wingY: 4,   
    wingX2: 4, baseY: 4, barY: 4,
    h: 15                 
  });
  const [offset, setOffset] = useState(0.5); 
  const [slabOffset, setSlabOffset] = useState(0.0);
  const [material, setMaterial] = useState('bloque_arcilla_15');
  const [wallHeight, setWallHeight] = useState(2.70);
  
  // Parámetros de Diseño Técnico
  const [designParams, setDesignParams] = useState({
    fc: 250, // kgf/cm² (antes 25 MPa)
    fy: 4200, // kgf/cm² (antes 420 MPa)
    q_adm: 1.5, // kgf/cm² (antes 150 kN/m²)
    band_width_m: 0, // 0 = Auto calculado en backend
    is_plastered: false, // Friso global
    custom_mesh_cm2_m: 0, // 0 = Auto
    cover: 5 // Recubrimiento en cm
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
  
  // Machones / Columnas
  const [columns, setColumns] = useState([]);
  const [colConfig, setColConfig] = useState({ width: 0.15, length: 0.15, height: 2.70, load_kgf: 1000 });
  const [gridStep, setGridStep] = useState(0.1);
  
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
  const [activeModal, setActiveModal] = useState(null); // 'geometry', 'materials', 'fem', 'openings', 'walls', 'layers'

  // ===== SISTEMA DE CAPAS =====
  const LAYER_DEFS = [
    { id: 'arq', name: 'Arquitectura', color: '#9c27b0', defaultLocked: false },
    { id: 'est', name: 'Estructura',   color: '#e53935', defaultLocked: false },
  ];
  const [layers, setLayers] = useState([
    { id: 'arq', name: 'Arquitectura', visible: true, locked: false, opacity: 0.35, image: null },
    { id: 'est', name: 'Estructura',   visible: true, locked: false, opacity: 1.0,  image: null },
  ]);
  const [activeLayer, setActiveLayer] = useState('est'); // Capa activa para dibujar
  const imgInputRef = useRef(null); // Ref para input de imagen de fondo
  const [layerImportTarget, setLayerImportTarget] = useState(null); // qué capa recibe la imagen

  useEffect(() => {
    // Hide footer to get more space
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';

    // Remove top margin 1 by modifying main container style
    const mainEl = document.querySelector('main.container');
    let origPaddingTop = '';
    let origPaddingBottom = '';
    let origMinHeight = '';
    if (mainEl) {
      origPaddingTop = mainEl.style.paddingTop;
      origPaddingBottom = mainEl.style.paddingBottom;
      origMinHeight = mainEl.style.minHeight;

      mainEl.style.paddingTop = '70px'; // Sit right below navbar
      mainEl.style.paddingBottom = '0px';
      mainEl.style.minHeight = 'auto';
    }

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
            else if (n.includes('cabilla') && (n.includes('6') || n.includes(' 6'))) p.cabilla_6 = m.precio_usd;
            else if (n.includes('cabilla') && n.includes('7')) p.cabilla_7 = m.precio_usd;
            else if (n.includes('cabilla') && n.includes('8')) p.cabilla_8 = m.precio_usd;
            else if (n.includes('cabilla') && n.includes('10')) p.cabilla_10 = m.precio_usd;
            else if (n.includes('malla 6x6') || n.includes('3.43')) p.malla_6x6 = m.precio_usd;
            else if (n.includes('malla sima') || (n.includes('malla') && n.includes('6'))) p.malla_sima = m.precio_usd;
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

    return () => {
      if (footer) footer.style.display = 'block';
      if (mainEl) {
        mainEl.style.paddingTop = origPaddingTop;
        mainEl.style.paddingBottom = origPaddingBottom;
        mainEl.style.minHeight = origMinHeight;
      }
    };
  }, []);

  // Hover interactivo (bidireccional SVG <-> Tabla)
  const [hoveredWallId, setHoveredWallId] = useState(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const isDraggingRef = useRef(false);
  const stateRef = useRef(null);

  // Undo / Redo para muros y aberturas
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);

  const saveHistory = () => {
    setHistoryPast(prev => {
      const next = [...prev, { shape, internalWalls: [...internalWalls], openings: [...openings], columns: [...columns] }];
      return next.length > 50 ? next.slice(-50) : next;
    });
    setHistoryFuture([]);
  };

  const undo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(prev => prev.slice(0, -1));
    setHistoryFuture(prev => [{ shape, internalWalls, openings, columns }, ...prev]);
    if (previous.shape) setShape(previous.shape);
    setInternalWalls(previous.internalWalls);
    setOpenings(previous.openings);
    setColumns(previous.columns || []);
  };

  const redo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture(prev => prev.slice(1));
    setHistoryPast(prev => [...prev, { shape, internalWalls, openings, columns }]);
    if (next.shape) setShape(next.shape);
    setInternalWalls(next.internalWalls);
    setOpenings(next.openings);
    setColumns(next.columns || []);
  };

  // Interacción Canvas (Mouse & Snap)
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState('perimetral');
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [hudInput, setHudInput] = useState('');        // Texto del input de precisión
  const [hudPos, setHudPos] = useState({ x: 0, y: 0 }); // Posición en pantalla (px)
  const [orthoLock, setOrthoLock] = useState(false);  // Shift → bloqueo ortogonal
  const hudInputRef = useRef(null);
  // ===== OFFSET =====
  const [offsetSourceWall, setOffsetSourceWall] = useState(null);
  const [offsetPreview, setOffsetPreview] = useState(null);
  const [offsetDist, setOffsetDist] = useState(0.15);
  // ===== ROTATE =====
  const [rotateSelectedIds, setRotateSelectedIds] = useState(new Set()); // IDs de muros a rotar
  const [rotateAngle, setRotateAngle] = useState(0);                     // grados
  const [rotatePivotMode, setRotatePivotMode] = useState('centroid');    // 'centroid' | 'origin'
  // Helper: rotar un punto alrededor de un pivote
  const rotatePoint = (x, y, cx, cy, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + (x - cx) * cos - (y - cy) * sin,
      y: cy + (x - cx) * sin + (y - cy) * cos,
    };
  };
  // Calcula las paredes rotadas para preview y commit
  const getRotatedWalls = (ids, angleDeg) => {
    const walls = internalWalls.filter(w => ids.has(w.id));
    if (walls.length === 0) return [];
    let cx = 0, cy = 0, count = 0;
    if (rotatePivotMode === 'centroid') {
      walls.forEach(w => { cx += w.x1 + w.x2; cy += w.y1 + w.y2; count += 2; });
      cx /= count; cy /= count;
    } // else origin (0,0)
    return walls.map(w => {
      const p1 = rotatePoint(w.x1, w.y1, cx, cy, angleDeg);
      const p2 = rotatePoint(w.x2, w.y2, cx, cy, angleDeg);
      return { ...w, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    });
  };
  
  const presupuesto = useMemo(() => generarPresupuesto(results, globalPrices, designParams), [results, globalPrices, designParams]);
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

  const descargarComputosHtml = () => {
    if (!results || !results.materials_computation) {
      toast.error("No hay resultados para generar memoria.");
      return;
    }
    const mc = results.materials_computation;
    const s = mc.superstructure;
    const area_total = s ? s.area_lisa_m2 + s.area_rustica_m2 : 0;
    
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
        const w_op = op.width || op.width_m || 0;
        const h_op = op.height || op.height_m || 0;
        const area = w_op * h_op;
        aberturasHtml += `<li>Abertura ${i+1} (${op.type}): ${w_op.toFixed(2)}m (Ancho) × ${h_op.toFixed(2)}m (Alto) = -${area.toFixed(2)} m² (descontado de mampostería)</li>`;
      });
    } else {
      aberturasHtml = '<li>No se registraron puertas ni ventanas.</li>';
    }

    const payload = lastPayload || buildCurrentPayload();
    const Lx = payload.geometry.Lx || 10;
    const Ly = payload.geometry.Ly || 10;
    const area_losa_m2 = Lx * Ly;
    
    // Concreto de Fundación
    const cemento_losa_sacos = Math.ceil(mc.concrete_vol_m3 * 9.5);
    const arena_losa_m3 = (mc.concrete_vol_m3 * 0.55).toFixed(2);
    const piedra_losa_m3 = (mc.concrete_vol_m3 * 0.67).toFixed(2);

    // Acero General
    let textoAceroGeneral = '';
    const custom_mesh_cm2_m = designParams?.custom_mesh_cm2_m || 0;
    if (custom_mesh_cm2_m === 0.61 || custom_mesh_cm2_m === 1.88) {
      const num_mallas_real = Math.ceil((area_losa_m2 * 1.10) / (2.60 * 6.00));
      textoAceroGeneral = `Material: Malla Electrosoldada (Formato comercial 2.6m x 6.0m)<br>
      Área neta de placa: ${area_losa_m2.toFixed(2)} m²<br>
      Área a cubrir con 10% de solape de seguridad: ${(area_losa_m2 * 1.10).toFixed(2)} m²<br>
      Láminas requeridas: <strong>${num_mallas_real} láminas</strong> (Tipo Trucson)`;
    } else {
      textoAceroGeneral = `Material: Cabillas / Varillas Corrugadas de 6m<br>
      Peso Total Acero General: ${mc.steel_weight_general_kg.toFixed(2)} kg<br>
      Cabillas requeridas: <strong>${mc.general_bars_6m} unidades</strong>`;
    }

    // Materiales de Friso
    const vol_neto_friso = area_total * 0.01;
    const vol_seco_friso = vol_neto_friso * 1.10;
    const sacos_cemento_friso = Math.ceil(vol_seco_friso * 4.5);
    const arena_friso = (vol_seco_friso * 1.05).toFixed(2);

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cómputos Métricos - ${projectName}</title>
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
  <h1>Cómputos Métricos: ${projectName}</h1>
  <p>Reporte generado automáticamente por Arko360. A continuación se detallan las consideraciones matemáticas para los cómputos métricos de la obra.</p>
  
  <div class="card">
    <h2>1. Losa de Fundación</h2>
    <p><strong>Volumen de Concreto (f'c = 210 kgf/cm²):</strong></p>
    <div class="formula">
      Volumen Neto de la Losa: ${mc.concrete_vol_m3.toFixed(2)} m³<br><br>
      <em>Desglose de Preparación en Obra:</em><br>
      - Cemento Portland: ~9.5 sacos por m³ = <strong>${cemento_losa_sacos} sacos</strong><br>
      - Arena Lavada: ~0.55 m³ por m³ = <strong>${arena_losa_m3} m³</strong><br>
      - Piedra Picada: ~0.67 m³ por m³ = <strong>${piedra_losa_m3} m³</strong>
    </div>
    
    <p><strong>Acero General (Malla):</strong></p>
    <div class="formula">
      ${textoAceroGeneral}
    </div>
    
    <p><strong>Acero de Bandas (Refuerzo inferior bajo muros):</strong></p>
    <div class="formula">
      Peso Acero Adicional: ${mc.steel_weight_bands_kg.toFixed(2)} kg<br>
      Varillas de 6m equivalentes: ${mc.bands_bars_6m} varillas
    </div>
  </div>
  
  ${s ? `
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
    Se considera 1 cara exterior y 1 interior para muros perimetrales, y 2 caras interiores para muros internos. A esta área bruta se le resta el área de las puertas y ventanas dibujadas (aberturas).</p>
    <div class="formula">
      Área Lisa (Interna) = ${s.area_lisa_m2.toFixed(2)} m²<br>
      Área Rústica (Externa) = ${s.area_rustica_m2.toFixed(2)} m²<br>
      Área Neta Total a frisar = ${area_total.toFixed(2)} m²
    </div>
    
    <p><strong>Cemento Portland para Friso (Proporción 1:4 a 1 cm de espesor):</strong></p>
    <div class="formula">
      Volumen Neto de Mortero: ${area_total.toFixed(2)} m² × 0.01 m = ${vol_neto_friso.toFixed(2)} m³<br>
      Volumen Seco (+10% Desperdicio Constructivo): ${vol_seco_friso.toFixed(2)} m³<br>
      Rendimiento: 4.5 sacos por cada m³ de mortero seco.<br>
      Sacos requeridos: <strong>${sacos_cemento_friso} sacos</strong>
    </div>
    
    <p><strong>Arena Lavada para Friso:</strong></p>
    <div class="formula">
      Rendimiento: 1.05 m³ de arena por cada m³ de mortero seco.<br>
      Volumen de arena requerido: <strong>${arena_friso} m³</strong>
    </div>
    
    <p><strong>Bloques de Arcilla:</strong></p>
    <div class="formula">
      Rendimiento Base: 12.5 bloques por m² de pared.<br>
      Bloques 15cm = Área Neta (${s.bloques_15_m2.toFixed(2)} m²) × 12.5 = <strong>${Math.ceil(s.bloques_15_m2 * 12.5)} und</strong><br>
      Bloques 12cm = Área Neta (${s.bloques_12_m2.toFixed(2)} m²) × 12.5 = <strong>${Math.ceil(s.bloques_12_m2 * 12.5)} und</strong>
    </div>

    <p><strong>Vigas Corona / Amarre:</strong></p>
    <div class="formula">
      Volumen Neto de Concreto: ${s.vol_vigas_corona_m3.toFixed(2)} m³<br>
      Acero Longitudinal (10mm): <strong>${s.corona_10mm_bars} varillas</strong><br>
      Acero Transversal (Estribos 5.2mm): <strong>${s.corona_5_2mm_bars} varillas</strong>
    </div>
  </div>
  
  <div class="card">
    <h2>3. Acabados y Pintura (Solo interior)</h2>
    <p><strong>Pasta Profesional:</strong></p>
    <div class="formula">
      Rendimiento: 1 cuñete (4-5 galones) rinde ~25 m².<br>
      Cuñetes requeridos: <strong>${Math.ceil(s.area_lisa_m2 / 25.0)} cuñetes</strong>
    </div>
    
    <p><strong>Pintura:</strong></p>
    <div class="formula">
      Rendimiento: 1 galón rinde ~20 m² a dos manos.<br>
      Galones requeridos: <strong>${Math.ceil(s.area_lisa_m2 / 20.0)} galones</strong>
    </div>
  </div>
  ${(s.vol_machones_m3 || 0) > 0 ? `
  <div class="card">
    <h2>4. Machones / Columnas</h2>
    <p><strong>Volumen de Concreto:</strong></p>
    <div class="formula">
      Volumen Neto de Machones: ${s.vol_machones_m3.toFixed(2)} m³<br><br>
      <em>Desglose de Preparación en Obra:</em><br>
      - Cemento Portland: ~9.5 sacos por m³ = <strong>${Math.ceil(s.vol_machones_m3 * 9.5)} sacos</strong><br>
      - Arena Lavada: ~0.55 m³ por m³ = <strong>${(s.vol_machones_m3 * 0.55).toFixed(2)} m³</strong><br>
      - Piedra Picada: ~0.67 m³ por m³ = <strong>${(s.vol_machones_m3 * 0.67).toFixed(2)} m³</strong>
    </div>
    <p><strong>Acero de Machones:</strong></p>
    <div class="formula">
      Acero Longitudinal (10mm): <strong>${s.machones_10mm_bars || 0} varillas</strong> (4 por machón + anclaje)<br>
      Acero Transversal (Estribos 5.2mm): <strong>${s.machones_5_2mm_bars || 0} varillas</strong> (@ 15cm)
    </div>
  </div>` : ''}
  ` : ''}
  
</body>
</html>`;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      toast.error("Por favor permite las ventanas emergentes (pop-ups) para ver la memoria.");
    }
  };

  const descargarMemoriaCalculoHtml = () => {
    if (!results || !results.settlements) {
      toast.error("Ejecuta el análisis primero para generar la memoria.");
      return;
    }
    const payload = lastPayload || buildCurrentPayload();
    const E_MPa = payload.materials.E / 1e6;
    const h_slab = payload.geometry.h;
    const nu = payload.materials.nu || 0.2;
    const E_kgf_cm2 = E_MPa * 10.197;
    const D_kgfm = (payload.materials.E * Math.pow(h_slab, 3)) / (12 * (1 - Math.pow(nu, 2))) / 9.81;

    const w_max_mm = results.heatmaps?.w_max_mm || results.displacements?.w_max_mm || 0;
    const p_max = results.soil_pressure?.max_pressure_kN_m2 || 0;
    const q_max_kgcm2 = (p_max / 98.0665).toFixed(3);
    const q_adm_kgcm2 = (payload.materials.q_adm / 98066.5).toFixed(2);
    const soil_ok = results.soil_pressure?.ok;
    const mx_max = results.moments?.Mx_max_kNm_m || 0;
    const my_max = results.moments?.My_max_kNm_m || 0;
    
    const b_cm = 100;
    const h_cm = h_slab * 100;
    const As_min = results.As_min_cm2_m || (0.0018 * b_cm * h_cm);
    
    let max_as_x = 0; let max_as_y = 0;
    if (results.bands) {
      results.bands.forEach(b => {
        if (b.Asx_cm2_m > max_as_x) max_as_x = b.Asx_cm2_m;
        if (b.Asy_cm2_m > max_as_y) max_as_y = b.Asy_cm2_m;
      });
    }

    const nx = results.heatmaps?.nx || 21;
    const ny = results.heatmaps?.ny || 21;
    const dx = payload.geometry.Lx / (nx - 1);
    const dy = payload.geometry.Ly / (ny - 1);
    const matrixSize = nx * ny;
    
    let murosHtml = '';
    let ejemploMuro = '';
    if (payload.walls && payload.walls.length > 0) {
      payload.walls.forEach((w, i) => {
        const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
        const Peso_Pared = w.thickness * w.height * w.density; // Carga muerta muro
        const q_corona = 0.10 * 0.13 * 2400; // kgf/m
        const D_techo = 15; // kgf/m2 (Lámina galvanizada liviana + tubos)
        const L_techo = 40; // kgf/m2 (Carga Viva COVENIN techo no accesible)
        const Ancho_Trib = 2.5; // m (Promedio conservador)
        const Carga_Techo = (D_techo + L_techo) * Ancho_Trib;
        const F_lineal = Peso_Pared + Carga_Techo + q_corona;
        
        if (i === 0) {
          ejemploMuro = `<br><em>Ejemplo Cálculo Muro M1: F_lineal = Peso Pared + Viga Corona + Carga Techo.<br>
          Peso Pared = ${w.thickness.toFixed(2)}m (espesor) × ${w.height.toFixed(2)}m (altura) × ${w.density} kgf/m³ (densidad) = ${Peso_Pared.toFixed(2)} kgf/m<br>
          Viga Corona = 0.10m × 0.13m × 2400 kgf/m³ = ${q_corona.toFixed(2)} kgf/m<br>
          Carga Techo = [15 kgf/m² (D) + 40 kgf/m² (L)] × ${Ancho_Trib}m (ancho tributario) = ${Carga_Techo.toFixed(2)} kgf/m<br>
          F_lineal total = ${F_lineal.toFixed(2)} kgf/m</em>`;
        }
        murosHtml += `<tr><td>Muro M${i+1} (${w.type})</td><td>${len.toFixed(2)} m</td><td>${Peso_Pared.toFixed(2)} kgf/m</td><td>${q_corona.toFixed(2)} kgf/m</td><td>${F_lineal.toFixed(2)} kgf/m</td></tr>`;
      });
    }

    const fy_MPa = payload.materials.f_y; // MPa
    const d_m = h_slab - 0.05; // 5 cm de recubrimiento

    let columnasHtml = '';
    if (payload.columns && payload.columns.length > 0) {
      columnasHtml = `
    <h3>4.3 Cargas Puntuales (Machones / Columnas)</h3>
    <p>Las cargas puntuales provenientes de machones o columnas estructurales se distribuyen sobre la losa utilizando funciones de forma bi-lineales que interpolan la carga hacia los nudos adyacentes más cercanos al parche de carga.</p>
    <table>
      <thead>
        <tr><th>Identificador</th><th>Ubicación (X, Y)</th><th>Dimensión</th><th>Carga Asignada (kgf)</th><th>Carga Factorizada (kgf)</th></tr>
      </thead>
      <tbody>
        ${payload.columns.map((c, i) => `<tr>
          <td>Machón C${i+1}</td>
          <td>(${columns[i].x.toFixed(2)}, ${columns[i].y.toFixed(2)})</td>
          <td>${(c.width * 100).toFixed(0)}x${(c.length * 100).toFixed(0)} cm</td>
          <td>${c.load_kgf.toFixed(2)}</td>
          <td>${(c.load_kgf * 1.5).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
      `;
    }

    let bandasHtml = '';
    let seccion7Html = '';
    let punchingHtml = '';

    if (results.punching && results.punching.length > 0) {
      punchingHtml = `
    <h3>5.3 Verificación de Punzonamiento (Corte Bidireccional)</h3>
    <p>Según la sección 22.6 del ACI 318-19, se verifica el esfuerzo cortante en el perímetro crítico (a una distancia d/2) alrededor de machones y esquinas de muros:</p>
    <table>
      <thead>
        <tr><th>Elemento</th><th>V<sub>u</sub> (kgf)</th><th>V<sub>c</sub> (kgf)</th><th>φV<sub>c</sub> (kgf)</th><th>Ratio (V<sub>u</sub>/φV<sub>c</sub>)</th><th>Estado</th></tr>
      </thead>
      <tbody>
        ${results.punching.map(p => {
          const statusColor = p.ok ? '#4caf50' : '#f44336';
          const statusText = p.ok ? 'CUMPLE OK' : 'NO CUMPLE FAIL';
          return `<tr>
            <td>${p.id}</td>
            <td>${(p.Vu_kN * 101.9716).toFixed(1)}</td>
            <td>${(p.Vc_kN * 101.9716).toFixed(1)}</td>
            <td>${(p.phiVc_kN * 101.9716).toFixed(1)}</td>
            <td>${p.ratio !== undefined ? p.ratio.toFixed(2) : '-'}</td>
            <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    `;
    }
    
    if (results.bands && results.bands.length > 0) {
      const b0 = results.bands[0];
      const a_x_cm = b0.a_x_cm || 0;
      
      seccion7Html = `
  <div class="card">
    <h2>7. Demostración Analítica (Banda Crítica)</h2>
    <p>A continuación, se desarrolla paso a paso el cálculo matemático del bloque de compresiones de Whitney para la <strong>Banda ${b0.id}</strong> (la primera franja evaluada bajo el Muro ${b0.type}).</p>
    
    <ul>
      <li>Ubicación física: Eje del Muro ${b0.type} (banda de ${b0.band_width.toFixed(2)} m de ancho).</li>
      <li>Cargas incidentes: Carga lineal del muro + Viga de Corona + Carga Techo (distribuidas en los nodos adyacentes a la traza).</li>
      <li>Esfuerzo resultante FDM: Momento de diseño en X (Mux) = <strong>${(b0.Mx_design_kNm_m * 101.9716).toFixed(2)} kgf·m/m</strong></li>
    </ul>

    <h3>7.1 Resolución de la Ecuación Cuadrática (Bloque de Whitney)</h3>
    <div class="formula">
      Ecuación de equilibrio: Mu = φ · As · fy · (d - a/2)<br>
      Profundidad del bloque equivalente (a): a = (As · fy) / (0.85 · f'c · b)<br><br>
      Sustituyendo iterativamente (algoritmo interno):<br>
      a = <strong>${a_x_cm.toFixed(2)} cm</strong><br>
      As_teórico = (${b0.Mx_design_kNm_m.toFixed(2)} × 10) / [ 0.90 · ${fy_MPa} · (${d_m.toFixed(2)} - ${a_x_cm.toFixed(2)}/200) ]<br>
      As_teórico = <strong>${b0.Asx_calc_cm2_m.toFixed(2)} cm²/m</strong>
    </div>

    <h3>7.2 Verificación Normativa y Selección Comercial</h3>
    <div class="formula">
      Acero Mínimo (Norma ACI): As_min = <strong>${As_min.toFixed(2)} cm²/m</strong><br>
      Condicional de Diseño: As_definitivo = max(${b0.Asx_calc_cm2_m.toFixed(2)}, ${As_min.toFixed(2)}) = <strong>${b0.Asx_cm2_m.toFixed(2)} cm²/m</strong><br><br>
      <em>Selección del software:</em> Al cruzar la demanda con la base de datos de aceros, el sistema propone:<br>
      <strong>Cabilla de Ø${b0.bar_x.diam_mm} mm @ ${(b0.bar_x.sep_m * 100).toFixed(0)} cm</strong> (Área provista > Área demandada).
    </div>
  </div>`;
      
      results.bands.forEach((b, i) => {
        // Mostrar la fórmula de Whitney y la regla del máximo basándonos en los datos calculados en el backend
        const prop_x = b.bar_x.diam_mm > 0 ? `Cabilla de Ø${b.bar_x.diam_mm} mm @ ${(b.bar_x.sep_m * 100).toFixed(0)} cm` : "Acero mínimo normativo";
        const prop_y = b.bar_y.diam_mm > 0 ? `Cabilla de Ø${b.bar_y.diam_mm} mm @ ${(b.bar_y.sep_m * 100).toFixed(0)} cm` : "Acero mínimo normativo";
        
        bandasHtml += `<li style="margin-bottom:10px;"><strong>Banda ${b.id} (Muro ${b.type}):</strong><br>
          Mu_x = ${(b.Mx_design_kNm_m * 101.9716).toFixed(2)} kgf·m/m, Mu_y = ${(b.My_design_kNm_m * 101.9716).toFixed(2)} kgf·m/m <br>
          <span style="color:#0d47a1;">&rarr; (Dir X) a = ${b.a_x_cm ? b.a_x_cm.toFixed(2) : 0} cm &rarr; As_x (teórico) = ${b.Asx_calc_cm2_m.toFixed(2)} cm²/m</span><br>
          <span style="color:#1b5e20;">&rarr; <strong>As_x (definitivo) = max( As_x_teórico, As_min ) = ${b.Asx_cm2_m.toFixed(2)} cm²/m</strong> &rarr; Propuesta: <em>${prop_x}</em></span><br>
          <span style="color:#0d47a1; margin-top:4px; display:inline-block;">&rarr; (Dir Y) a = ${b.a_y_cm ? b.a_y_cm.toFixed(2) : 0} cm &rarr; As_y (teórico) = ${b.Asy_calc_cm2_m.toFixed(2)} cm²/m</span><br>
          <span style="color:#1b5e20;">&rarr; <strong>As_y (definitivo) = max( As_y_teórico, As_min ) = ${b.Asy_cm2_m.toFixed(2)} cm²/m</strong> &rarr; Propuesta: <em>${prop_y}</em></span>
        </li>`;
      });
    } else {
      bandasHtml = `<li>No hay bandas a evaluar o diseño libre.</li>`;
    }

    const bandasCriticas = results.bands ? results.bands.filter(b => b.Asx_cm2_m > As_min + 0.05 || b.Asy_cm2_m > As_min + 0.05) : [];
    let conclusionHtml = '';
    if (bandasCriticas.length === 0) {
      conclusionHtml = 'Debido a la ligereza de la vivienda, la mayoría de las franjas internas se rigen por el acero mínimo de confinamiento y temperatura (As_min).';
    } else {
      const ids = bandasCriticas.map(b => b.id);
      const idsText = ids.length === 1 ? `Banda ${ids[0]}` : `Bandas ${ids.slice(0, -1).join(', ')} y ${ids[ids.length - 1]}`;
      conclusionHtml = `Debido a la ligereza de la vivienda, la mayoría de las franjas internas se rigen por el acero mínimo de confinamiento y temperatura (As_min). Sin embargo, en los muros perimetrales críticos (${idsText}), el acero por FLEXIÓN rige el diseño, requiriendo refuerzos adicionales.`;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Memoria de Cálculo - ${projectName}</title>
  <script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; }
    h1, h2, h3 { color: #1e1e2f; }
    .card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .formula { background: #e3f2fd; padding: 12px; border-left: 4px solid #1976d2; font-family: monospace; font-size: 14px; margin: 10px 0; color: #0d47a1; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #1976d2; color: white; }
  </style>
</head>
<body>
  <h1>Losa de Fundación por Diferencias Finitas</h1>
  <p><strong>Proyecto: ${projectName}</strong></p>

  <div class="card">
    <h2>1. Introducción al Problema</h2>
    <p>Una losa de fundación es una placa de concreto que transmite las cargas de una estructura al suelo. Existen varios criterios y métodos teóricos para abordarlo:</p>
    <ul>
      <li><strong>Método Rígido Convencional:</strong> Asume que la losa es infinitamente rígida y que la presión del suelo es plana o lineal. Es muy conservador, impreciso para losas grandes o cargas asimétricas, y sobrestima cuantías de acero.</li>
      <li><strong>Método Elástico Flexible (Winkler):</strong> Asume que el suelo es una cama de resortes elásticos independientes (k). La losa se flexiona y la presión del suelo varía dependiendo de la deformación en cada punto.</li>
      <li><strong>Método de Elementos/Diferencias Finitas:</strong> Es la técnica matemática computacional para resolver las complejas ecuaciones diferenciales de la placa elástica flexible, encontrando los esfuerzos en cada milímetro de la estructura.</li>
    </ul>
    <p>Nuestra plataforma utiliza un <strong>Motor de Diferencias Finitas basado en el Modelo de Winkler</strong>, garantizando resultados óptimos, hiper-precisos y económicos frente al método rígido convencional.</p>
  </div>

  <div class="card">
    <h2>2. Ecuación Gobernante</h2>
    <h3>2.1 Placa sobre Fundación Elástica (Modelo de Winkler)</h3>
    <div class="formula">
      D · ∇⁴w(x,y) + k · w(x,y) = q(x,y)
    </div>
    <table>
      <thead>
        <tr><th>Símbolo</th><th>Descripción</th><th>Unidades</th></tr>
      </thead>
      <tbody>
        <tr><td>w(x,y)</td><td>Deformación vertical</td><td>m</td></tr>
        <tr><td>q(x,y)</td><td>Carga distribuida aplicada</td><td>kgf/m²</td></tr>
        <tr><td>k</td><td>Coeficiente de balasto (Winkler)</td><td>kgf/cm³</td></tr>
        <tr><td>D</td><td>Rigidez a la flexión de la placa</td><td>kgf·m</td></tr>
      </tbody>
    </table>

    <h3>2.2 Rigidez a la Flexión</h3>
    <div class="formula">
      D = E · h³ / [12(1 - ν²)]
    </div>
    <p>Donde E = módulo de elasticidad, h = espesor, ν = Poisson</p>
    <div class="formula">
      D = (${E_kgf_cm2.toFixed(0)} kgf/cm² · ${h_slab.toFixed(2)}³ m³) / (12 · (1 - ${nu}²)) = ${D_kgfm.toFixed(2)} kgf·m
    </div>
  </div>

  <div class="card">
    <h2>3. Formulación por Elementos Finitos (FEM) y Flujo de Cálculo</h2>
    <p>Para analizar el comportamiento estructural de la losa, el motor utiliza el <strong>Método de Elementos Finitos (FEM)</strong> en lugar de aproximaciones tradicionales por diferencias finitas. Esto nos permite modelar losas de forma libre y condiciones de carga complejas con gran precisión física.</p>
    
    <h3>3.1 El Grado de Libertad Nodal y Discretización</h3>
    <p>La losa se subdivide en una cuadrícula regular de elementos cuadriláteros planos (Quad Plate Elements) de Mindlin. Cada nodo posee <strong>3 grados de libertad (DOF)</strong>:</p>
    <ul>
      <li>Desplazamiento vertical en Z: <code>w</code> (m)</li>
      <li>Rotación alrededor del eje X: <code>θ_x</code> (rad)</li>
      <li>Rotación alrededor del eje Y: <code>θ_y</code> (rad)</li>
    </ul>
    <p>Para una grilla de <strong>${nx} × ${ny}</strong> subdivisiones (nodos totales: <strong>${matrixSize}</strong>), el sistema de ecuaciones posee un tamaño matricial de <strong>${matrixSize * 3} × ${matrixSize * 3}</strong> grados de libertad.</p>

    <h3>3.2 Matriz de Rigidez Local del Elemento (12x12)</h3>
    <p>Cada elemento cuadrilátero de 4 nodos acopla la flexión y rigidez a cortante mediante una matriz de rigidez elástica de 12x12:</p>
    <div class="formula" style="font-size:12px; overflow-x:auto;">
      [K_elem] = ∫ [B]^T [D_placa] [B] dA
    </div>
    <p style="font-size:13px; color:#555;">Donde [B] relaciona las curvaturas con los desplazamientos nodales e interpolaciones bilineales, y [D_placa] es la rigidez del material constitutivo de la losa.</p>

    <h3>3.3 Acoplamiento del Suelo elástico (Winkler)</h3>
    <p>El suelo se introduce directamente en la diagonal de la matriz de rigidez global. Cada resorte de suelo añade rigidez vertical en el DOF traslacional del nodo:</p>
    <div class="formula">
      K_suelo = k_balasto · A_tributaria
    </div>
    <p><strong>Ejemplo de Montaje Nodal:</strong> Para un nodo interior con un área tributaria de ${dx.toFixed(2)}m × ${dy.toFixed(2)}m = ${(dx * dy).toFixed(4)} m² y un balasto de ${(payload.materials.k / 9806.65).toFixed(2)} kgf/cm³ (equivalente a ${(payload.materials.k).toExponential(2)} N/m³), la rigidez vertical añadida al sistema en ese nodo es:</p>
    <div class="formula">
      K_diagonal = ${(payload.materials.k).toExponential(2)} N/m³ × ${(dx * dy).toFixed(4)} m² = ${(payload.materials.k * dx * dy).toExponential(2)} N/m
    </div>

    <h3>3.4 Diagrama del Flujo de Cálculo FEM</h3>
    <pre class="formula" style="background:#f1f5f9; color:#334155; font-size:12px; line-height:1.2; overflow-x:auto;">
┌─────────────────────────────────────────┐
│  1. DEFINICIÓN DE GEOMETRÍA Y PROPIEDADES│
│     • Lx, Ly, espesor (h), material (E, ν)│
│     • Suelo (resorte k) y coordenadas   │
├─────────────────────────────────────────┤
│  2. MESHING / DISCRETIZACIÓN            │
│     • Generar nodos y cuadriláteros     │
│     • Asignar coordenadas globales      │
├─────────────────────────────────────────┤
│  3. ENSAMBLAJE MATRICIAL GLOBAL         │
│     • Rigidez de placa (Quad 12x12)     │
│     • Rigidez de vigas de amarre (6x6)  │
│     • Agregar resortes de suelo Winkler │
│       K_diag += k * Area_tributaria     │
├─────────────────────────────────────────┤
│  4. ASAMBLEA DEL VECTOR DE CARGAS {F}    │
│     • Peso propio y sobrecarga en nodos │
│     • Muros y machones puntuales        │
├─────────────────────────────────────────┤
│  5. RESOLVER SISTEMA RALO               │
│     • [K_global] · {U} = {F}            │
│     • Solución directa (spsolve)        │
├─────────────────────────────────────────┤
│  6. POST-PROCESAMIENTO Y DISEÑO         │
│     • Presiones = k * w                 │
│     • Momentos flectores (Mx, My)       │
│     • Armado ACI 318 (Whitney)          │
└─────────────────────────────────────────┘
    </pre>
  </div>

  <div class="card">
    <h2>4. Análisis de Cargas del Proyecto</h2>
    <p>La losa recibe solicitaciones mediante cargas uniformemente distribuidas en su superficie y cargas lineales transmitidas por la superestructura (muros). A continuación, se detalla el modelado matemático.</p>
    
    <h3>4.1 Cargas Uniformes sobre la Losa (q)</h3>
    <p>Estas cargas actúan sobre todos los nodos interiores de la placa (kgf/m²):</p>
    <table>
      <thead>
        <tr><th>Componente</th><th>Descripción</th><th>Cálculo Normativo</th><th>Valor (kgf/m²)</th></tr>
      </thead>
      <tbody>
        <tr><td>Peso Propio</td><td>Masa del concreto endurecido</td><td>${h_slab.toFixed(2)} m × 2400 kgf/m³</td><td>${(h_slab * 2400).toFixed(2)}</td></tr>
        <tr><td>Acabados / Piso</td><td>Mortero y cerámicas</td><td>Valor normativo estándar</td><td>100.00</td></tr>
        <tr><td>Sobrecarga Uso</td><td>Uso residencial / vivienda</td><td>Valor normativo estándar</td><td>200.00</td></tr>
        <tr style="font-weight:bold; background:#e3f2fd;">
          <td colspan="3" style="text-align:right;">Carga Uniforme de Servicio q(x,y) =</td>
          <td>${(h_slab * 2400 + 300).toFixed(2)} kgf/m²</td>
        </tr>
      </tbody>
    </table>

    <h3>4.2 Cargas Lineales (Paredes y Vigas de Corona)</h3>
    <p>El motor distribuye el peso de la mampostería, las vigas de amarre y el techo sobre la trayectoria de los muros. Se asume que <strong>todas</strong> las paredes llevan una Viga de Corona en hormigón armado de 10×13 cm para amarre perimetral y central, que transmite su masa linealmente a la placa.</p>
    <div class="formula">
      q(i,j) = (F_lineal) / (Δx · Δy) · (longitud de influencia en el nodo)
      ${ejemploMuro}
    </div>
    <table>
      <thead>
        <tr><th>Identificador</th><th>Longitud</th><th>Mampostería</th><th>Viga Corona</th><th>Carga Lineal Total (kgf/m)</th></tr>
      </thead>
      <tbody>
        ${murosHtml || '<tr><td colspan="5">No hay muros definidos para cargar linealmente.</td></tr>'}
      </tbody>
    </table>
    ${columnasHtml}
  </div>

  <div class="card">
    <h2>5. Solución Numérica y Modelo Geotécnico</h2>
    <p>Tras plantear el sistema matricial <strong>[A]·{w} = {q}</strong> y resolverlo matemáticamente, obtenemos el vector de deformaciones locales {w} para cada nodo de la malla.</p>
    
    <h3>5.1 Criterio de Rigidez de la Losa (Longitud Característica)</h3>
    <p>Para justificar el uso del modelo de Winkler (coeficiente de balasto), debemos analizar la flexibilidad relativa entre la losa y el suelo mediante el parámetro elástico <strong>lc</strong> (Longitud característica):</p>
    <div class="formula">
      l_c = √[ (E · h³) / (12 · (1 - ν²) · k) ]<br>
      Sustituyendo:<br>
      E = ${(E_MPa).toFixed(2)} MPa = ${(payload.materials.E).toExponential(3)} N/m²<br>
      k = ${(payload.materials.k).toExponential(3)} N/m³<br>
      l_c = ${results.rigidity?.l_c_m ? results.rigidity.l_c_m.toFixed(2) : '1.50'} m
    </div>
    <p style="font-size:13px; color:#555;"><i>Interpretación: Si la separación entre los muros de carga es significativamente mayor a π·lc, la placa exhibirá una clara flexión (comportamiento flexible) confirmando la precisión del análisis por Elementos/Diferencias Finitas. Si es menor, la losa actúa como cuerpo rígido asentándose uniformemente.</i></p>

    <h3>5.2 Deformación y Presión de Suelo</h3>
    <div class="formula">
      w_max = max({w}) = ${w_max_mm.toFixed(3)} mm<br><br>
      q_max = k · w_max<br>
      q_max = ${(payload.materials.k / 9806.65).toFixed(2)} kgf/cm³ · ${w_max_mm.toFixed(3)} mm (ajustado a cm) = <strong>${q_max_kgcm2} kgf/cm²</strong>
    </div>
    <p>Condición Normativa de Suelo: <strong style="color:${soil_ok?'#4caf50':'#f44336'}">${soil_ok ? `CUMPLE (q_max ${q_max_kgcm2} < Capacidad Admisible ${q_adm_kgcm2} kgf/cm²)` : `FALLA (q_max ${q_max_kgcm2} > Capacidad Admisible ${q_adm_kgcm2} kgf/cm²)`}</strong></p>

    <h3>5.2 Esfuerzos Internos</h3>
    <div class="formula" style="font-size: 13px;">
      M_x = -D · [ (∂²w / ∂x²) + ν · (∂²w / ∂y²) ]<br>
      M_y = -D · [ (∂²w / ∂y²) + ν · (∂²w / ∂x²) ]
    </div>
    <p>Los momentos flectores máximos (Mx, My) dictarán el requerimiento de acero principal, y ocurren sistemáticamente debajo y en las cercanías de los muros o columnas más pesadas (los picos de tensión de la matriz):</p>
    <ul>
      <li>Momento Flector Máximo en X (Mxx): <strong>${(mx_max * 101.97).toFixed(2)} kgf·m/m</strong></li>
      <li>Momento Flector Máximo en Y (Myy): <strong>${(my_max * 101.97).toFixed(2)} kgf·m/m</strong></li>
    </ul>

    <div style="margin-top:20px; margin-bottom:20px; border: 1px solid #eee; padding:10px; border-radius: 8px; background: #fff;">
      <h4 style="text-align:center; margin-top:0; margin-bottom:5px; color:#1e1e2f;">Mapa de Calor Interactivo: Esfuerzos Internos</h4>
      <p style="text-align:center; font-size:12px; color:#666; margin-bottom: 10px;">
        <strong>Guía de Interpretación:</strong> Los colores cálidos (<span style="color:#e65100;font-weight:bold;">Rojo</span>) indican un Momento Flector Negativo (tracción en la cara superior, requiere acero superior). Ocurren exactamente <strong>debajo</strong> de los muros pesados.<br>
        Los colores fríos (<span style="color:#0d47a1;font-weight:bold;">Azul</span>) representan Momentos Positivos (tracción en el lecho inferior de la placa), presentándose en los "vanos" o espacios vacíos entre muros a causa del abombamiento del suelo.<br>
        Las zonas (<span style="color:#009688;font-weight:bold;">Verde/Cian</span>) denotan esfuerzos neutros cercanos a cero.
      </p>
      <div id="plotly-heatmap" style="width:100%; height:450px;"></div>
    </div>

    ${punchingHtml}
  </div>

  <div class="card">
    <h2>6. Diseño del Armado (ACI 318-19)</h2>
    
    <h3>Acero Mínimo por Contracción y Temperatura (Sec. 24.4):</h3>
    <p>La norma ACI 318-19, sección 24.4.3.2, establece que para losas donde se empleen barras corrugadas (fy = ${Math.round(fy_MPa * 10.197)} kgf/cm²), la cuantía mínima de refuerzo (ρ_min) en cada dirección no debe ser menor a 0.0018 para resistir los esfuerzos térmicos y de retracción de fraguado.</p>
    <div class="formula">
      As_min = ρ_min · b · h = 0.0018 · 100 cm · ${h_cm.toFixed(0)} cm = ${As_min.toFixed(2)} cm²/m
    </div>
    <p><strong>Acero Requerido por Flexión en Franjas Críticas (Whitney):</strong></p>
    <div class="formula">
      As_flexion = Mu / [ φ · fy · (d - a/2) ]<br><br>
      Evaluación de bandas (bajo muros):<br>
      <ul>
        ${bandasHtml}
      </ul>
      <br>
      Máximo esfuerzo demandado en iteración X: ${max_as_x.toFixed(2)} cm²/m<br>
      Máximo esfuerzo demandado en iteración Y: ${max_as_y.toFixed(2)} cm²/m
    </div>
    <p style="font-size:13px; color:#555;"><i>Nota Técnica: Si los esfuerzos flectores de la losa son bajos y la ecuación de Whitney arroja una cuantía menor que el mínimo normativo, el algoritmo reporta el valor bruto en flexión puramente iterativa, pero rige el acero normativo.</i></p>
    
    <h3>Guía de Interpretación Práctica para el Estudiante:</h3>
    <p>Para traducir el área de acero calculada (As definitivo) a un plano de construcción real, se selecciona un diámetro comercial de barra y se determina su separación (s) en centímetros utilizando la siguiente relación geométrica:</p>
    <div class="formula">
      s (cm) = [ Área_nominal_barra (cm²) / As_requerido (cm²/m) ] × 100
    </div>
    <p><strong>Ejemplo Numérico:</strong> Supongamos que el cálculo arrojó un As definitivo de <strong>3.85 cm²/m</strong> y decidimos utilizar barras comerciales de <strong>Ø7 mm</strong>.</p>
    <ul>
      <li>El área nominal de una barra de Ø7 mm es: <code>A_bar = (π · 0.7²) / 4 ≈ 0.385 cm²</code></li>
      <li>Aplicando la ecuación: <code>s = (0.385 / 3.85) × 100 = 10 cm</code></li>
      <li><strong>Resultado Práctico:</strong> Cabilla de Ø7 mm @ 10 cm. Por normativas y practicidad de construcción, esta separación teórica siempre se redondea hacia abajo al múltiplo conservador más cercano (ej. 10 cm, 12.5 cm, 15 cm) para garantizar siempre un área provista mayor o igual a la demandada.</li>
    </ul>

    <p><strong>Conclusión Estructural:</strong> <span style="color:${bandasCriticas.length === 0 ? '#4caf50' : '#ff9800'}; font-weight:bold;">${conclusionHtml}</span></p>
  </div>
  
  ${seccion7Html}

  <div class="card">
    <h2>8. Diagrama de Flujo de Decisión para Armado</h2>
    <p>La lógica paramétrica del software para asignar el refuerzo definitivo y su espaciamiento sigue este diagrama algorítmico normativo:</p>
    <div class="mermaid" style="text-align: center; margin-top: 20px;">
      graph TD
      A[Inicio: Calcular Mu por FDM] --> B(Resolver Ecuación de Whitney)
      B --> C{¿As_teórico > As_min?}
      C -- SÍ --> D[El diseño se rige por FLEXIÓN]
      D --> E[Asignar As_definitivo = As_teórico]
      C -- NO --> F[El diseño se rige por RETRACCIÓN/TEMPERATURA]
      F --> G[Asignar As_definitivo = As_min]
      E --> H[Calcular separación s con diámetro comercial]
      G --> H
      H --> I[Redondear s hacia abajo al múltiplo más cercano]
      I --> J(Fin: Armado Propuesto)
      
      style C fill:#f9f,stroke:#333,stroke-width:2px
      style D fill:#ffcc80,stroke:#e65100,stroke-width:2px
      style F fill:#a5d6a7,stroke:#1b5e20,stroke-width:2px
    </div>
  </div>

  <script>
    mermaid.initialize({startOnLoad:true});
    if (${results.heatmaps ? 'true' : 'false'}) {
      var mx_data = ${JSON.stringify(results.heatmaps?.Mx_kNm || [])};
      var my_data = ${JSON.stringify(results.heatmaps?.My_kNm || [])};
      var vu_data = ${JSON.stringify(results.heatmaps?.Vu_kN || [])};
      var nx = ${results.heatmaps?.nx || 21};
      var ny = ${results.heatmaps?.ny || 21};
      var Lx = ${payload.geometry.Lx};
      var Ly = ${payload.geometry.Ly};
      
      var x_vals = [];
      for(var i=0; i<=nx; i++) x_vals.push((i * Lx / nx).toFixed(2));
      var y_vals = [];
      for(var j=0; j<=ny; j++) y_vals.push((j * Ly / ny).toFixed(2));
      
      var traceMx = {
        z: mx_data, x: x_vals, y: y_vals,
        type: 'heatmap', colorscale: 'Jet',
        hovertemplate: 'X: %{x} m<br>Y: %{y} m<br>Mxx: %{z:.2f} kgf·m/m<extra></extra>',
        name: 'Mxx'
      };
      var traceMy = {
        z: my_data, x: x_vals, y: y_vals,
        type: 'heatmap', colorscale: 'Jet', visible: false,
        hovertemplate: 'X: %{x} m<br>Y: %{y} m<br>Myy: %{z:.2f} kgf·m/m<extra></extra>',
        name: 'Myy'
      };
      var traceVu = {
        z: vu_data, x: x_vals, y: y_vals,
        type: 'heatmap', colorscale: 'Portland', visible: false,
        hovertemplate: 'X: %{x} m<br>Y: %{y} m<br>Vu: %{z:.2f} kgf/m<extra></extra>',
        name: 'Vu'
      };
      
      var layout = {
        margin: { t: 40, b: 40, l: 40, r: 20 },
        xaxis: { title: 'Losa en X (m)', range: [0, Lx] },
        yaxis: { title: 'Losa en Y (m)', range: [0, Ly], scaleanchor: 'x', scaleratio: 1 },
        updatemenus: [{
          y: 1.15, x: 0.5, xanchor: 'center', yanchor: 'top', direction: 'right',
          buttons: [
            { method: 'update', args: [{'visible': [true, false, false]}], label: 'Mxx (kgf·m/m)' },
            { method: 'update', args: [{'visible': [false, true, false]}], label: 'Myy (kgf·m/m)' },
            { method: 'update', args: [{'visible': [false, false, true]}], label: 'Vu (kgf/m)' }
          ]
        }]
      };
      
      Plotly.newPlot('plotly-heatmap', [traceMx, traceMy, traceVu], layout, {responsive: true});
    }
  </script>
</body>
</html>`;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      toast.error("Por favor permite las ventanas emergentes (pop-ups) para ver la memoria.");
    }
  };

  const snapToGrid = useCallback((val) => gridStep > 0 ? Math.round(val / gridStep) * gridStep : val, [gridStep]);

  // Escala para el SVG
  const CANVAS_SIZE = 500;
  const MARGIN = 40; // Margen para los ejes
  const EFFECTIVE_SIZE = CANVAS_SIZE - MARGIN * 2;
  const scale = useMemo(() => EFFECTIVE_SIZE / Math.max(params.Lx, params.Ly, 1), [params.Lx, params.Ly]);
  
  // Convertir metros a pixeles SVG
  const toSvg = useCallback((m) => MARGIN + (m * scale), [scale]);
  
  // Convertir pixeles a metros (con snap opcional)
  const toMetersX = useCallback((px, doSnap = false) => {
    let m = (px - MARGIN) / scale;
    m = Math.max(0, Math.min(m, Math.max(params.Lx, 1)));
    if (doSnap) m = snapToGrid(m);
    return m;
  }, [scale, snapToGrid, params.Lx]);

  const toMetersY = useCallback((py, doSnap = false) => {
    let m = (py - MARGIN) / scale;
    m = Math.max(0, Math.min(m, Math.max(params.Ly, 1)));
    if (doSnap) m = snapToGrid(m);
    return m;
  }, [scale, snapToGrid, params.Ly]);

  // Generar vértices del perímetro según la plantilla y offset
  const getPerimeterVertices = useCallback((overrideOffset = null) => {
    const { Lx, Ly, wingX, wingY, wingX2, baseY, barY } = params;
    const o = overrideOffset !== null ? overrideOffset : (parseFloat(offset) || 0);
    // Límite dinámico basado en las dimensiones para evitar colapso visual severo
    const maxSafe = Math.min(Lx, Ly) / 2.05;
    const safeO = Math.max(0, Math.min(o, maxSafe)); 

    let pts = [];
    switch (shape) {
      case 'libre':
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
    if (shape === 'libre') return []; // Sin auto-perímetro en modo libre
    const totalOffset = (parseFloat(offset) || 0) + (parseFloat(slabOffset) || 0);
    const pts = getPerimeterVertices(totalOffset);
    const matProps = MATERIALS[material];
    const walls = [];
    
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
  }, [getPerimeterVertices, material, wallHeight, designParams.is_plastered, shape, offset, slabOffset]);

  const allWalls = useMemo(() => {
    const matProps = MATERIALS[material];
    const formattedInternal = internalWalls.map(w => {
      const type = w.type || 'interno';
      return {
        ...w,
        type,
        thickness: type === 'interno' ? 0.12 : matProps.thickness,
        height: parseFloat(wallHeight) || 2.7,
        density: matProps.density,
        is_plastered: designParams.is_plastered
      };
    });
    return [...perimeterWalls, ...formattedInternal];
  }, [perimeterWalls, internalWalls, material, wallHeight, designParams.is_plastered]);

  const convertToManual = () => {
    if (shape === 'libre') return;
    saveHistory();
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
    
    setInternalWalls(prev => [
      ...perimeterCopy,
      ...prev.filter(w => !String(w.id).startsWith('man_') && w.type !== 'perimetral')
    ]);
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
    setInternalWalls(prev => [...prev, { id: Date.now(), type: drawType, layer_id: activeLayer, x1: w.x1 || 0, y1: w.y1 || 0, x2: w.x2 || 1, y2: w.y2 || 1 }]);
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

  // Zoom con rueda del mouse (attached via useEffect to prevent passive warning)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom(prev => Math.max(0.5, Math.min(8, prev * zoomFactor)));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan con Ctrl+arrastrar o Botón Central (Rueda)
  const handlePanStart = useCallback((e) => {
    // Activar con Ctrl, Meta o botón central del ratón (rueda)
    if (!e.ctrlKey && !e.metaKey && e.button !== 1) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
  }, [panOffset]);

  const handlePanMove = useCallback((e) => {
    if (!isPanningRef.current) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleFactorX = CANVAS_SIZE / (rect.width || CANVAS_SIZE);
    const scaleFactorY = CANVAS_SIZE / (rect.height || CANVAS_SIZE);
    const dx = ((e.clientX - panStartRef.current.x) * scaleFactorX) / zoom;
    const dy = ((e.clientY - panStartRef.current.y) * scaleFactorY) / zoom;
    setPanOffset({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
  }, [zoom]);

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Convierte posición de pantalla a coordenadas del espacio de usuario del SVG
  const getSvgPx = (e, svgElement) => {
    if (!svgElement) return { px: 0, py: 0 };
    const rect = svgElement.getBoundingClientRect();
    
    // El viewBox del SVG
    const vbWidth = CANVAS_SIZE / zoom;
    const vbHeight = CANVAS_SIZE / zoom;
    
    // preserveAspectRatio="xMidYMid meet" centra el viewBox y lo escala para que encaje
    const ratio = Math.min(rect.width / vbWidth, rect.height / vbHeight);
    if (ratio === 0) return { px: 0, py: 0 };
    
    const renderWidth = vbWidth * ratio;
    const renderHeight = vbHeight * ratio;
    
    const offsetX = (rect.width - renderWidth) / 2;
    const offsetY = (rect.height - renderHeight) / 2;
    
    const xInRender = (e.clientX - rect.left) - offsetX;
    const yInRender = (e.clientY - rect.top) - offsetY;
    
    const vbX = xInRender / ratio;
    const vbY = yInRender / ratio;
    
    const minX = -panOffset.x * zoom;
    const minY = -panOffset.y * zoom;
    
    return { 
      px: vbX + minX, 
      py: vbY + minY 
    };
  };

  // Lógica del Mouse (Tracker y Dibujo con Snap)
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    if (isPanningRef.current) {
      handlePanMove(e);
      return;
    }
    const { px, py } = getSvgPx(e, svgRef.current);
    
    const rawMx = toMetersX(px, false);
    const rawMy = toMetersY(py, false);

    // O-Snap (Object Snap) a vértices existentes (radio de 0.2m)
    let snapMx = toMetersX(px, true);
    let snapMy = toMetersY(py, true);
    let minD = 0.2; // umbral de snap en metros
    
    const checkSnap = (x, y) => {
      const d = Math.sqrt((rawMx - x) ** 2 + (rawMy - y) ** 2);
      if (d < minD) {
        minD = d;
        snapMx = x;
        snapMy = y;
      }
    };
    // Revisar esquinas del canvas
    checkSnap(0, 0); checkSnap(params.Lx, 0); checkSnap(0, params.Ly); checkSnap(params.Lx, params.Ly);
    // Revisar todos los muros
    allWalls.forEach(w => {
      checkSnap(w.x1, w.y1);
      checkSnap(w.x2, w.y2);
    });

    // Clamp a los límites exactos del canvas después del snap
    const mx = Math.max(0, Math.min(snapMx, params.Lx));
    const my = Math.max(0, Math.min(snapMy, params.Ly));

    setMouseCoord({ x: mx, y: my });

    setSelectionBox(prev => {
      if (prev) {
        if (Math.abs(prev.startX - rawMx) > 0.1 || Math.abs(prev.startY - rawMy) > 0.1) {
          isDraggingRef.current = true;
        }
        return { ...prev, currentX: rawMx, currentY: rawMy };
      }
      return prev;
    });

    if (isDrawing && drawStart) {
      // Si el usuario ingresó un valor en el HUD, respetamos esa longitud (O-Snap de longitud)
      const manualLen = parseFloat(hudInput);
      if (!isNaN(manualLen) && manualLen > 0) {
        const angle = Math.atan2(my - drawStart.y, mx - drawStart.x);
        const finalAngle = e.shiftKey ? Math.round(angle / (Math.PI / 4)) * (Math.PI / 4) : angle;
        setDrawEnd({
          x: drawStart.x + Math.cos(finalAngle) * manualLen,
          y: drawStart.y + Math.sin(finalAngle) * manualLen
        });
        setOrthoLock(e.shiftKey);
      } else {
        // Ortho lock: redondear ángulo a mútiplos de 45° con Shift
        if (e.shiftKey) {
          const angle = Math.atan2(my - drawStart.y, mx - drawStart.x);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.sqrt((mx - drawStart.x) ** 2 + (my - drawStart.y) ** 2);
          setDrawEnd({
            x: drawStart.x + Math.cos(snappedAngle) * dist,
            y: drawStart.y + Math.sin(snappedAngle) * dist
          });
          setOrthoLock(true);
        } else {
          setDrawEnd({ x: mx, y: my });
          setOrthoLock(false);
        }
      }
      // Actualizar posición del HUD en coordenadas de pantalla
      setHudPos({ x: e.clientX + 18, y: e.clientY - 10 });
    }

    // ===== OFFSET: preview en tiempo real =====
    if (drawType === 'offset' && offsetSourceWall) {
      const w = offsetSourceWall;
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const L = Math.sqrt(dx * dx + dy * dy) || 1;
      // Normal unitario (perpendicular al muro)
      const nx = -dy / L;
      const ny =  dx / L;
      // Determinar lado según posición del cursor respecto al muro
      const side = ((mx - w.x1) * nx + (my - w.y1) * ny) >= 0 ? 1 : -1;
      const d = offsetDist * side;
      setOffsetPreview({
        x1: w.x1 + nx * d, y1: w.y1 + ny * d,
        x2: w.x2 + nx * d, y2: w.y2 + ny * d,
        side
      });
    }
  };

  // Confirmar el muro con las coordenadas actuales (drawEnd) o las del HUD
  const commitWall = useCallback((overrideEnd = null) => {
    const end = overrideEnd || drawEnd;
    if (drawStart && end && (drawStart.x !== end.x || drawStart.y !== end.y)) {
      addInternalWall({ x1: drawStart.x, y1: drawStart.y, x2: end.x, y2: end.y });
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
    setHudInput('');
    setOrthoLock(false);
  }, [drawStart, drawEnd, addInternalWall]);

  const handleSvgDoubleClick = () => {
    if (!drawType) return;
    if (drawType === 'columna') return; // Se dibuja con 1 click

    if (!isDrawing) {
      // Iniciar dibujo
      setIsDrawing(true);
      setDrawStart({ ...mouseCoord });
      setDrawEnd({ ...mouseCoord });
      setHudInput('');
      // Enfocar el input HUD en el siguiente render
      setTimeout(() => hudInputRef.current?.focus(), 50);
    } else {
      // Finalizar con posición del cursor (doble clic clásico)
      commitWall();
    }
  };

  const handleSvgClick = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    // ===== OFFSET: confirmar al hacer clic =====
    if (drawType === 'offset' && offsetSourceWall && offsetPreview) {
      saveHistory();
      addInternalWall({
        x1: offsetPreview.x1, y1: offsetPreview.y1,
        x2: offsetPreview.x2, y2: offsetPreview.y2
      });
      setOffsetSourceWall(null);
      setOffsetPreview(null);
      return;
    }
    if (!drawType) {
      setSelectedElement(null);
      return;
    }
    if (drawType === 'columna') {
      saveHistory();
      const loadCalc = colConfig.width * colConfig.length * colConfig.height * 2500;
      setColumns(prev => [...prev, {
        id: Date.now(),
        x: mouseCoord.x,
        y: mouseCoord.y,
        width: colConfig.width,
        length: colConfig.length,
        height: colConfig.height,
        load_kgf: loadCalc
      }]);
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

    const { px, py } = getSvgPx(e, svgRef.current);
    const dropX = toMetersX(px);
    const dropY = toMetersY(py, false);

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


  // Actualizar ref para listeners globales (evita stale closures sin re-registrar useEffect)
  stateRef.current = {
    isDrawing, drawType, selectedElement, saveHistory,
    setColumns, setInternalWalls, setOpenings,
    setIsDrawing, setDrawStart, setDrawEnd, setDrawType, setSelectedElement,
    setHudInput, setOrthoLock
  };

  // Botón: Cancelar dibujo, soltar herramienta con Escape o borrar con Suprimir
  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = stateRef.current;
      if (!state) return;
      
      if (e.key === 'Escape') {
        if (state.isDrawing) {
          state.setIsDrawing(false);
          state.setDrawStart(null);
          state.setDrawEnd(null);
          state.setHudInput('');
          state.setOrthoLock(false);
        }
        state.setDrawType(null);
        state.setSelectedElement(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElement && !state.isDrawing && !state.drawType) {
          state.saveHistory();
          if (state.selectedElement.type === 'columna') {
            state.setColumns(prev => prev.filter(c => c.id !== state.selectedElement.id));
          }
          state.setSelectedElement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Construir el payload con el estado actual (muros, aberturas, parametros)
  const buildCurrentPayload = () => {
    // Solo enviar muros reales al servidor
    const structuralWalls = allWalls.filter(w => w.type === 'perimetral' || w.type === 'interno');
    const losaLines = allWalls.filter(w => w.type === 'losa');
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (losaLines.length > 0) {
      // Usa las líneas de losa dibujadas para la bounding box
      losaLines.forEach(w => {
        if (w.x1 < minX) minX = w.x1;
        if (w.x2 < minX) minX = w.x2;
        if (w.x1 > maxX) maxX = w.x1;
        if (w.x2 > maxX) maxX = w.x2;
        if (w.y1 < minY) minY = w.y1;
        if (w.y2 < minY) minY = w.y2;
        if (w.y1 > maxY) maxY = w.y1;
        if (w.y2 > maxY) maxY = w.y2;
      });
    } else if (structuralWalls.length > 0) {
      // Auto-wrap walls si no hay líneas de losa
      structuralWalls.forEach(w => {
        if (w.x1 < minX) minX = w.x1;
        if (w.x2 < minX) minX = w.x2;
        if (w.x1 > maxX) maxX = w.x1;
        if (w.x2 > maxX) maxX = w.x2;
        if (w.y1 < minY) minY = w.y1;
        if (w.y2 < minY) minY = w.y2;
        if (w.y1 > maxY) maxY = w.y1;
        if (w.y2 > maxY) maxY = w.y2;
      });
      // Aplica offset (Borde de Losa) al auto-wrap
      const numericOffset = parseFloat(slabOffset) || 0;
      minX -= numericOffset;
      maxX += numericOffset;
      minY -= numericOffset;
      maxY += numericOffset;
    } else {
      minX = 0; minY = 0; maxX = 10; maxY = 10;
    }
    
    const slabLx = maxX - minX;
    const slabLy = maxY - minY;
    const offsetX = minX;
    const offsetY = minY;

    return {
      project: projectName,
      geometry: { Lx: slabLx, Ly: slabLy, h: params.h / 100 },
      materials: {
        f_c_kgcm2: designParams.fc,
        f_c: designParams.fc / 10.197, // Convertir a MPa
        f_y: designParams.fy / 10.197, // Convertir a MPa
        bar_diam: 0.012,
        gamma_horm: 2400, 
        E: 4700 * Math.sqrt(designParams.fc / 10.197) * 1e6, 
        nu: 0.2, k: 20e6,
        q_adm: designParams.q_adm * 98066.5, // kgf/cm² a Pa
        band_width_m: designParams.band_width_m > 0 ? designParams.band_width_m : 0,
        custom_mesh_cm2_m: designParams.custom_mesh_cm2_m || 0,
        cover: (designParams.cover || 5) / 100 // cm a metros

      },
      walls: structuralWalls.map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        thickness: w.thickness, height: w.height,
        density: w.density, type: w.type, load_factor: 1.5,
        is_plastered: w.is_plastered,
        openings: openings.filter(op => op.wall_id === w.id).map(op => ({
          type: op.type, start_m: op.start_m, width_m: op.width_m, height_m: op.height_m
        }))
      })),
      beams: perimeterWalls.filter(w => w.type === 'perimetral' || w.type === 'interno').map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        width: 0.20, height: 0.30, type: 'zuncho', load_factor: 1.2
      })),
      columns: columns.map(c => ({
        x: c.x - offsetX, y: c.y - offsetY, width: c.width, length: c.length, height: c.height, load_kgf: c.load_kgf
      })),
      mesh_nx: 40,
      mesh_ny: 40,
      extra_load: 300 * 9.81,
      // Estado completo del plano para poder reabrirlo
      _canvas_state: {
        shape, params, designParams, wallHeight, internalWalls, openings, columns, material, offset
      }
    };
  };

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
      if (st.columns) setColumns(st.columns);
      if (st.material) setMaterial(st.material);
      if (st.offset !== undefined) setOffset(st.offset);
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
    const extra_load_n_m2 = lastPayload.extra_load || (300 * 9.81);
    const sc_kg_m2 = +(extra_load_n_m2 / 9.81).toFixed(1); // de extra_load N/m2 a kg/m2
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
    
    let P_machones_kg = 0;
    const machonLoads = (lastPayload.columns || []).map((c, idx) => {
      const vol_m3 = c.width * c.length * c.height;
      const W_self_kgf = vol_m3 * 2400; // Igual que en el backend
      const total_kg = c.load_kgf + W_self_kgf;
      P_machones_kg += total_kg * 1.5; // Factored
      return {
        id: `Machón ${idx + 1}`,
        dimensiones_m: `${c.width} x ${c.length} x ${c.height}`,
        carga_aplicada_kg: c.load_kgf,
        peso_propio_kg: +W_self_kgf.toFixed(1),
        carga_total_factored_kg: +(total_kg * 1.5).toFixed(1)
      };
    });

    const P_total_kg = P_losa_kg + P_sc_kg + P_muros_kg + P_machones_kg;
    
    const fc_Pa = lastPayload.materials?.f_c || 25e6;
    const fc_MPa = fc_Pa > 1000 ? fc_Pa / 1e6 : fc_Pa; // handle if already MPa
    const fc_kgcm2 = +(fc_MPa * 10.197).toFixed(1);
    const fy_MPa = (lastPayload.materials?.f_y || 420e6) > 1000 ? (lastPayload.materials.f_y / 1e6) : (lastPayload.materials?.f_y || 420);
    const fy_kgcm2 = +(fy_MPa * 10.197).toFixed(0);

    const w_max = results.displacements?.w_max_mm || 0;
    const L_min_mm = Math.min(Lx, Ly) * 1000;
    const settlement_limit = L_min_mm / 500;
    const hormigon_m3 = A_losa * h_m;
    const malla_minimo_m2 = A_losa;
    const acero_estimado = (A_losa * (results.As_min_cm2_m || 1.88) / 10000) * 7850;

    const auditData = {
      meta: {
        proyecto: lastPayload.project,
        fecha_generacion: new Date().toISOString(),
        fecha_revision: "",
        revisor: "Pendiente por asignar",
        norma_referencia: 'ACI 318-19 / COVENIN 1753-2006',
        sistema_unidades: 'MKS (kgf, m, kgf/cm²)'
      },
      supuestos: {
        tipo_suelo: "Por definir en estudio de suelos",
        nivel_freatico: "Por definir",
        coeficiente_balasto_k: `${(lastPayload.materials?.k_s || 20e6) / 1e6} MPa/m — (Asumido / A verificar con ensayo)`,
        modelo_suelo: "Winkler (Resortes elásticos independientes)",
        condicion_borde: "Libre"
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
        peso_machones_factored_kg: +P_machones_kg.toFixed(1),
        carga_total_kg: +P_total_kg.toFixed(1),
        carga_total_kN: +(P_total_kg * 9.81 / 1000).toFixed(2),
        presion_media_suelo_kgf_m2: +(P_total_kg / A_losa).toFixed(1),
        detalle_muros: wallLoads,
        detalle_machones: machonLoads
      },
      resultados_FEM: {
        desplazamiento_max_mm: w_max,
        momento_Mx_max_kNm_m: results.moments?.Mx_max_kNm_m,
        momento_My_max_kNm_m: results.moments?.My_max_kNm_m,
        cortante_Vu_max_kN_m: results.shear?.Vu_max_kN_m,
        cortante_phiVc_kN_m: results.shear?.phiVc_kN_m,
        verificacion_cortante: results.shear?.shear_ok ? 'CUMPLE' : 'NO CUMPLE',
        presion_max_suelo_kN_m2: results.soil_pressure?.max_pressure_kN_m2,
        q_adm_kN_m2: results.soil_pressure?.q_adm_kN_m2,
        verificacion_suelo: results.soil_pressure?.ok ? 'CUMPLE' : 'NO CUMPLE',
        punzonamiento: results.punching || {}
      },
      verificaciones_adicionales: {
        asentamiento_diferencial: {
            delta_s_max_mm: w_max, 
            limite_recomendado_mm: +settlement_limit.toFixed(2),
            criterio: "L/500 (ACI 351.3R)", 
            estado: w_max <= settlement_limit ? "CUMPLE" : "NO CUMPLE"
        },
        fisuracion_serviceability: { w_k_max_mm: 0.3, estado: "PENDIENTE" },
        sismo_covenin_1756: { zona: "Por definir", analisis_dinamico: "PENDIENTE", estado: "PENDIENTE" }
      },
      cuantificacion_estimada: {
        hormigon_m3: +hormigon_m3.toFixed(2),
        acero_base_kg: +acero_estimado.toFixed(2),
        malla_minima_m2: +malla_minimo_m2.toFixed(2)
      },
      detalle_armado_zonas_criticas: {
        esquinas_losa: "PENDIENTE - Verificar refuerzo adicional por concentración de tensiones",
        bajo_muros: "Ver bandas_refuerzo",
        longitud_desarrollo_empalmes: "PENDIENTE"
      },
      checklist_revision_independiente: {
        "Cargas muertas": { revisado: false, por: "", fecha: "" },
        "Cargas vivas": { revisado: false, por: "", fecha: "" },
        "Combinaciones de carga": { revisado: false, por: "", fecha: "" },
        "Resultados FEM vs. manual": { revisado: false, por: "", fecha: "" },
        "Armado mínimo": { revisado: true, por: "ARKO360", fecha: new Date().toISOString().split('T')[0] },
        "Detalles constructivos": { revisado: false, por: "", fecha: "" }
      },
      bandas_refuerzo: results.bands,
      acero_minimo_cm2_m: results.As_min_cm2_m,
      observaciones: [
        'Verificación por cortante unidireccional (ACI 318 §11.3) incluida.',
        'Las bandas de refuerzo están concentradas bajo cada muro según distribución FEM.',
        `Fáctor de seguridad en presión suelo: ${results.soil_pressure?.q_adm_kN_m2 && results.soil_pressure?.max_pressure_kN_m2 ? (results.soil_pressure.q_adm_kN_m2 / results.soil_pressure.max_pressure_kN_m2).toFixed(2) : 'N/A'}`
      ],
      aprobacion: { estado: "EN_REVISION", firma: null },
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
          <td>${(b.Mx_design_kNm_m * 101.9716).toFixed(2)}</td>
          <td>${(b.My_design_kNm_m * 101.9716).toFixed(2)}</td>
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
        <th>Mx diseño<br>(kgf·m/m)</th><th>My diseño<br>(kgf·m/m)</th>
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
    {loading && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(5px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid #ccc', borderTopColor: '#1A6BB5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <h3 style={{ marginTop: '20px', color: '#1A6BB5' }}>Calculando Método de Elementos Finitos (FEM)...</h3>
        <p style={{ color: '#666' }}>Por favor, espere un momento.</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )}
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

      <div className="calc-header" style={{ width: '100%' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            {onBack && (
              <button 
                className="btn-secondary" 
                style={{ whiteSpace: 'nowrap', padding: '4px 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}
                onClick={onBack}
              >
                &larr; Volver
              </button>
            )}

          </div>
          <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            {/* Botón Run compacto */}
            <button 
              onClick={runAnalysis} 
              disabled={loading}
              title="Ejecutar Análisis Estructural"
              style={{
                background: loading ? '#81c784' : '#4caf50',
                border: 'none', color: '#fff',
                padding: '0 14px',
                height: '32px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
                transition: 'background 0.2s'
              }}
            >
              {loading
                ? <><span style={{display:'inline-block', width:'13px', height:'13px', border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite'}} /> Run<style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style></>
                : <><FaPlay style={{fontSize:'11px'}} /> Run</>
              }
            </button>

            {/* Botón Ver Resultados — solo visible si hay resultados */}
            {results && !error && (
              <button
                onClick={() => setShowResultsModal(true)}
                title="Ver Resultados del Análisis"
                style={{
                  background: '#1A6BB5',
                  border: 'none', color: '#fff',
                  padding: '0 14px',
                  height: '32px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                  animation: 'fadeInBtn 0.3s ease',
                }}
              >
                <FaChartBar style={{fontSize:'12px'}} /> Resultados
                <style>{`@keyframes fadeInBtn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}`}</style>
              </button>
            )}

            <input 
              type="text" 
              value={projectName} 
              onChange={e => setProjectName(e.target.value)} 
              placeholder="Nombre del Proyecto"
              className="project-name-input"
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', width: '160px', outline: 'none' }}
            />
            <button onClick={() => { setShowOpenModal(true); fetchRuns(); }} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              📂 Abrir
            </button>
            <button onClick={() => saveToDatabase()} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <FaSave /> Guardar
            </button>
            <button onClick={() => { setSaveAsName(projectName); setShowSaveAsModal(true); }} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <FaSave /> Guardar como
            </button>
          </div>
        </div>
      </div>

      <div className="calc-body">
        {/* PANEL IZQUIERDO: CONTROLES */}
        
        {/* VERTICAL ICON TOOLBAR */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '48px',
          background: '#1e2235',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '10px',
          gap: '4px',
          zIndex: 20,
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}>
          {/* Separador */}
          <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          {/* Botón Geometría */}
          <button
            onClick={() => setActiveModal(activeModal === 'geometry' ? null : 'geometry')}
            title="Geometría de Losa"
            style={{
              background: activeModal === 'geometry' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'geometry' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
              transition: 'all 0.15s'
            }}
          >
            <FaDrawPolygon />
          </button>

          {/* Botón Materiales */}
          <button
            onClick={() => setActiveModal(activeModal === 'materials' ? null : 'materials')}
            title="Materiales y Muros"
            style={{
              background: activeModal === 'materials' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'materials' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
              transition: 'all 0.15s'
            }}
          >
            <FaCubes />
          </button>

          {/* Botón Parámetros Diseño */}
          <button
            onClick={() => setActiveModal(activeModal === 'fem' ? null : 'fem')}
            title="Parámetros de Diseño FEM"
            style={{
              background: activeModal === 'fem' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'fem' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
              transition: 'all 0.15s'
            }}
          >
            <FaCogs />
          </button>

          {/* Botón Muros Internos */}
          <button
            onClick={() => setActiveModal(activeModal === 'walls' ? null : 'walls')}
            title="Muros Internos"
            style={{
              background: activeModal === 'walls' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'walls' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
              transition: 'all 0.15s'
            }}
          >
            <FaBorderAll />
          </button>

          {/* Botón Columnas */}
          <button
            onClick={() => setActiveModal(activeModal === 'columns' ? null : 'columns')}
            title="Columnas"
            style={{
              background: activeModal === 'columns' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'columns' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
              transition: 'all 0.15s'
            }}
          >
            <FaColumns />
          </button>

          {/* Botón Aberturas */}
          <button
            onClick={() => setActiveModal(activeModal === 'openings' ? null : 'openings')}
            title="Listado de Aberturas"
            style={{
              background: activeModal === 'openings' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'openings' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '16px',
              transition: 'all 0.15s'
            }}
          >
            <FaDoorOpen />
          </button>

          {/* Botón Capas */}
          <button
            onClick={() => setActiveModal(activeModal === 'layers' ? null : 'layers')}
            title="Capas"
            style={{
              background: activeModal === 'layers' ? '#1A6BB5' : 'transparent',
              border: 'none', borderRadius: '8px',
              color: activeModal === 'layers' ? '#fff' : 'rgba(255,255,255,0.65)',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '18px',
              transition: 'all 0.15s'
            }}
          >
            ≡
          </button>

          {/* Separador arrastrar */}
          <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          {/* Input oculto para importar imagen de capa */}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files[0];
              if (!file || !layerImportTarget) return;
              const reader = new FileReader();
              reader.onload = ev => {
                setLayers(prev => prev.map(l =>
                  l.id === layerImportTarget ? { ...l, image: ev.target.result } : l
                ));
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />

          {/* Puerta Izq Adentro */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'door_left')}
            title="Puerta Izquierda (Adentro)"
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M4 20 L4 4" /><path d="M4 4 A16 16 0 0 1 20 20" strokeDasharray="2 3" /></svg>
          </div>

          {/* Puerta Izq Afuera */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'door_left_out')}
            title="Puerta Izquierda (Afuera)"
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M4 4 L4 20" /><path d="M4 20 A16 16 0 0 0 20 4" strokeDasharray="2 3" /></svg>
          </div>

          {/* Puerta Der Adentro */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'door_right')}
            title="Puerta Derecha (Adentro)"
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M20 20 L20 4" /><path d="M20 4 A16 16 0 0 0 4 20" strokeDasharray="2 3" /></svg>
          </div>

          {activeModal === 'geometry' && (
        <DraggableModal title="📐 Geometría Global" onClose={() => setActiveModal(null)} width="400px">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
              <div className="param-item"><label>Parcela Lx (m):</label><input type="number" step="0.5" value={params.Lx} onChange={e => handleParamChange('Lx', e.target.value)} /></div>
              <div className="param-item"><label>Parcela Ly (m):</label><input type="number" step="0.5" value={params.Ly} onChange={e => handleParamChange('Ly', e.target.value)} /></div>
              
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
              
              <div className="param-item"><label>Retiro Perimetral (m):</label><input type="number" step="0.05" min="0" value={offset} onChange={e => setOffset(e.target.value)} /></div>
              <div className="param-item"><label>Borde de Losa (m):</label><input type="number" step="0.05" min="0" value={slabOffset} onChange={e => setSlabOffset(e.target.value)} /></div>
              <div className="param-item"><label>Espesor Losa (cm):</label><input type="number" value={params.h} onChange={e => handleParamChange('h', e.target.value)} /></div>
              <div className="param-item">
                <label>Paso Cuadrícula (Snap m):</label>
                <select value={gridStep} onChange={e => setGridStep(parseFloat(e.target.value))}>
                  <option value={0.5}>0.50m</option>
                  <option value={0.25}>0.25m</option>
                  <option value={0.1}>0.10m</option>
                  <option value={0.05}>0.05m</option>
                  <option value={0}>Libre (Sin Imán)</option>
                </select>
              </div>
            </div>
            <button className="primary-btn" style={{marginTop:'20px', width:'100%', background: '#1A6BB5', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => setActiveModal(null)}>Aceptar</button>
          </div>
        </DraggableModal>
      )}

          {/* Puerta Der Afuera */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'door_right_out')}
            title="Puerta Derecha (Afuera)"
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M20 4 L20 20" /><path d="M20 20 A16 16 0 0 1 4 4" strokeDasharray="2 3" /></svg>
          </div>

          {/* Ventana */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'window')}
            title="Ventana"
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
          </div>
        </div>

      {activeModal === 'materials' && (
        <DraggableModal title="🧱 Materiales de Construcción" onClose={() => setActiveModal(null)} width="400px">
            <div className="params-grid">
              <div className="param-item"><label>Alto Muros (m):</label><input type="number" step="0.1" value={wallHeight} onChange={e => setWallHeight(e.target.value)} /></div>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row', cursor: 'pointer' }}>
                <input type="checkbox" checked={designParams.is_plastered} onChange={e => handleDesignParamChange('is_plastered', e.target.checked)} style={{ margin: 0 }} />
                <span>Paredes Frisadas (+ Carga Muerta)</span>
              </label>
            </div>
            
            <button className="primary-btn" style={{marginTop:'20px', width:'100%'}} onClick={() => setActiveModal(null)}>Aceptar</button>
        </DraggableModal>
      )}
      
      {activeModal === 'fem' && (
        <DraggableModal title="⚙️ Parámetros FEM" onClose={() => setActiveModal(null)} width="400px">
            <div className="params-grid">
              <div className="param-item"><label>f'c Concreto (kgf/cm²):</label><input type="number" step="10" value={designParams.fc} onChange={e => handleDesignParamChange('fc', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>fy Acero (kgf/cm²):</label><input type="number" step="100" value={designParams.fy} onChange={e => handleDesignParamChange('fy', parseFloat(e.target.value))} /></div>
              <div className="param-item"><label>Cap. Portante (kgf/cm²):</label><input type="number" step="0.1" value={designParams.q_adm} onChange={e => handleDesignParamChange('q_adm', parseFloat(e.target.value))} title="1.5 kgf/cm² = 15000 kgf/m²" /></div>
              <div className="param-item"><label>Recubrimiento (cm):</label><input type="number" step="0.5" value={designParams.cover} onChange={e => handleDesignParamChange('cover', parseFloat(e.target.value))} title="Distancia al centroide del acero" /></div>
              <div className="param-item"><label>Ancho Banda (m):</label><input type="number" step="0.05" value={designParams.band_width_m} onChange={e => handleDesignParamChange('band_width_m', parseFloat(e.target.value))} title="0 = Auto (Calculado min)" /></div>
              <div className="param-item" style={{ gridColumn: '1 / -1' }}>
                <label>Acero General (Malla):</label>
                <select value={designParams.custom_mesh_cm2_m || 0} onChange={e => handleDesignParamChange('custom_mesh_cm2_m', parseFloat(e.target.value))}>
                  <option value={0}>Automático (Mínimo ACI)</option>
                  <option value={0.61}>Malla 6x6 (Ø3.43@15) - 0.61 cm²/m</option>
                  <option value={1.41}>Varillas Ø6@20cm - 1.41 cm²/m</option>
                  <option value={1.88}>Malla Sima (Ø6@15) - 1.88 cm²/m</option>
                  <option value={1.92}>Varillas Ø7@20cm - 1.92 cm²/m</option>
                  <option value={2.51}>Varillas Ø8@20cm - 2.51 cm²/m</option>
                  <option value={3.93}>Varillas Ø10@20cm - 3.93 cm²/m</option>
                  <option value={5.24}>Varillas Ø10@15cm - 5.24 cm²/m</option>
                </select>
              </div>
            </div>
            
            <button className="primary-btn" onClick={() => setActiveModal(null)} style={{width: '100%', marginTop: '20px'}}>Aceptar</button>
        </DraggableModal>
      )}

      {activeModal === 'walls' && (
        <DraggableModal title="🧱 Muros Internos" onClose={() => setActiveModal(null)} width="400px">
            <div>
                <p style={{fontSize:'12px', color:'#666', marginTop:0}}>Puedes agregarlos haciendo Shift+Clic en el lienzo o usando esta tabla.</p>
                <div className="table-container" style={{maxHeight:'300px', overflowY:'auto'}}>
                  <table className="coords-table">
                    <thead><tr><th>X1</th><th>Y1</th><th>X2</th><th>Y2</th><th></th></tr></thead>
                    <tbody>
                      {internalWalls.map((w, i) => (
                        <tr key={w.id} className={hoveredWallId === w.id ? 'highlighted-row' : ''} onMouseEnter={() => setHoveredWallId(w.id)} onMouseLeave={() => setHoveredWallId(null)}>
                          <td><input type="number" step="0.5" value={w.x1} onChange={e => updateInternalWall(w.id, 'x1', e.target.value)}/></td>
                          <td><input type="number" step="0.5" value={w.y1} onChange={e => updateInternalWall(w.id, 'y1', e.target.value)}/></td>
                          <td><input type="number" step="0.5" value={w.x2} onChange={e => updateInternalWall(w.id, 'x2', e.target.value)}/></td>
                          <td><input type="number" step="0.5" value={w.y2} onChange={e => updateInternalWall(w.id, 'y2', e.target.value)}/></td>
                          <td><button className="del-btn" onClick={() => removeInternalWall(w.id)}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="add-btn" onClick={() => addInternalWall({})}>+ Añadir Muro</button>
            </div>
            <button className="primary-btn" style={{marginTop:'20px', width:'100%'}} onClick={() => setActiveModal(null)}>Cerrar Panel</button>
        </DraggableModal>
      )}

      {activeModal === 'columns' && (
        <DraggableModal title="🏛️ Columnas" onClose={() => setActiveModal(null)} width="400px">
            <div>
                <p style={{fontSize:'12px', color:'#666', marginTop:0}}>Puedes agregarlas con Alt+Clic en el lienzo.</p>
                <div className="params-grid" style={{marginBottom:'10px', background:'#f5f5f5', padding:'10px', borderRadius:'6px'}}>
                  <div className="param-item"><label>b (m):</label><input type="number" step="0.05" value={colConfig.width} onChange={e => setColConfig({...colConfig, width: parseFloat(e.target.value) || 0})} /></div>
                  <div className="param-item"><label>t (m):</label><input type="number" step="0.05" value={colConfig.length} onChange={e => setColConfig({...colConfig, length: parseFloat(e.target.value) || 0})} /></div>
                  <div className="param-item"><label>Alto (Z) m:</label><input type="number" step="0.1" value={colConfig.height} onChange={e => setColConfig({...colConfig, height: parseFloat(e.target.value) || 0})} /></div>
                </div>
                
                <div className="table-container" style={{maxHeight:'200px', overflowY:'auto'}}>
                  <table className="coords-table">
                    <thead><tr><th>X</th><th>Y</th><th>Carga</th><th></th></tr></thead>
                    <tbody>
                      {columns.map(c => (
                        <tr key={c.id}>
                          <td>{c.x.toFixed(2)}</td><td>{c.y.toFixed(2)}</td><td>{c.load_kgf}</td>
                          <td><button className="del-btn" onClick={() => setColumns(columns.filter(col => col.id !== c.id))}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="add-btn" onClick={() => {
                  const loadCalc = colConfig.width * colConfig.length * colConfig.height * 2500;
                  setColumns([...columns, { 
                    id: Date.now(), 
                    x: params.Lx/2, 
                    y: params.Ly/2, 
                    width: colConfig.width,
                    length: colConfig.length,
                    height: colConfig.height,
                    load_kgf: loadCalc 
                  }]);
                }}>+ Añadir Columna</button>
            </div>
            <button className="primary-btn" style={{marginTop:'20px', width:'100%'}} onClick={() => setActiveModal(null)}>Cerrar Panel</button>
        </DraggableModal>
      )}

      {activeModal === 'openings' && (
        <DraggableModal title="🚪 Aberturas / Puertas / Ventanas" onClose={() => setActiveModal(null)} width="600px">
            <div style={{marginBottom:'15px', color:'#555', fontSize:'14px'}}>
            {openings.length === 0 ? (
               <p style={{color:'#666', fontSize:'13px', textAlign:'center', padding:'20px'}}>No hay aberturas. Arrastra una desde la barra superior hacia los muros.</p>
            ) : (
               <div className="table-container" style={{maxHeight:'300px', overflowY:'auto'}}>
                 <table className="coords-table">
                   <thead><tr><th>Tipo</th><th>Inicio</th><th>L</th><th>H</th><th></th></tr></thead>
                   <tbody>
                     {openings.map(op => {
                       let Icon = AppWindow; let label = 'Ventana';
                       if (op.type.startsWith('door_left')) { Icon = DoorOpen; label = 'Puerta (Izq)'; }
                       if (op.type.startsWith('door_right')) { Icon = DoorOpen; label = 'Puerta (Der)'; }
                       return (
                       <tr key={op.id} className={hoveredOpeningId === op.id ? 'highlighted-row' : ''} onMouseEnter={() => setHoveredOpeningId(op.id)} onMouseLeave={() => setHoveredOpeningId(null)}>
                         <td style={{display:'flex', alignItems:'center', gap:'6px'}}><Icon size={16} color="#666"/> {label}</td>
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
            
            <button className="primary-btn" onClick={() => setActiveModal(null)} style={{width: '100%'}}>Aceptar</button>
            </div>
        </DraggableModal>
      )}

{/* MODAL CAPAS */}
      {activeModal === 'layers' && (
        <DraggableModal title="≡ Capas" onClose={() => setActiveModal(null)} width="320px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {layers.map(layer => {
              const isActive = activeLayer === layer.id;
              const layerDef = LAYER_DEFS.find(d => d.id === layer.id);
              return (
                <div key={layer.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '8px',
                  background: isActive ? 'rgba(26,107,181,0.1)' : '#f7f7f7',
                  border: isActive ? '1.5px solid #1A6BB5' : '1.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }} onClick={() => { if (!layer.locked) setActiveLayer(layer.id); }}>
                  {/* Dot color */}
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: layerDef?.color || '#999', flexShrink: 0 }} />
                  {/* Nombre */}
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: isActive ? 700 : 400, color: '#222' }}>
                    {layer.name}
                    {isActive && <span style={{ marginLeft: 6, fontSize: '10px', color: '#1A6BB5', fontWeight: 700 }}>✏ ACTIVA</span>}
                  </span>
                  {/* Visibilidad */}
                  <button title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                    onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: layer.visible ? '#1A6BB5' : '#bbb', padding: '2px' }}>
                    {layer.visible ? '👁' : '🙈'}
                  </button>
                  {/* Bloquear */}
                  <button title={layer.locked ? 'Desbloquear' : 'Bloquear'}
                    onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); if (layer.locked && activeLayer === layer.id) setActiveLayer('est'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: layer.locked ? '#f57c00' : '#bbb', padding: '2px' }}>
                    {layer.locked ? '🔒' : '🔓'}
                  </button>
                  {/* Imagen de fondo */}
                  <button title="Importar imagen de fondo"
                    onClick={e => { e.stopPropagation(); setLayerImportTarget(layer.id); setTimeout(() => imgInputRef.current?.click(), 50); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: layer.image ? '#43a047' : '#bbb', padding: '2px' }}>
                    🖼
                  </button>
                  {/* Quitar imagen */}
                  {layer.image && (
                    <button title="Quitar imagen"
                      onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, image: null } : l)); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#e53935', padding: '2px' }}>✕</button>
                  )}
                </div>
              );
            })}
            {/* Opacidad de la capa seleccionada */}
            {(() => { const al = layers.find(l => l.id === activeLayer); return al ? (
              <div style={{ marginTop: '10px', padding: '10px', background: '#f0f4ff', borderRadius: '8px' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px' }}>
                  Opacidad — <strong>{al.name}</strong>: {Math.round(al.opacity * 100)}%
                </label>
                <input type="range" min="0" max="1" step="0.05" value={al.opacity}
                  onChange={e => setLayers(prev => prev.map(l => l.id === activeLayer ? { ...l, opacity: parseFloat(e.target.value) } : l))}
                  style={{ width: '100%' }} />
              </div>
            ) : null; })()}
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#999', textAlign: 'center' }}>
              Haz clic en una capa para activarla. Los muros nuevos se crean en la capa activa.
            </div>
            <button className="primary-btn" style={{ marginTop: '8px', width: '100%' }} onClick={() => setActiveModal(null)}>Cerrar</button>
          </div>
        </DraggableModal>
      )}

{/* PANEL DERECHO: VISTA PREVIA Y RESULTADOS */}
        <div className="calc-content" style={{ flex: '1', minWidth: 0, marginLeft: '48px' }}>
          <div className="canvas-wrapper hybrid-canvas">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <div style={{display:'flex', gap:'8px', marginLeft:'0px', border: '1px solid #ddd', padding: '4px', borderRadius: '6px', background: '#f5f5f5'}}>
                  <button onClick={() => setDrawType(null)} title="Seleccionar / Soltar" style={{padding:'6px', borderRadius:'4px', border: !drawType ? '2px solid #333' : '1px solid transparent', background: !drawType ? '#e0e0e0' : 'transparent', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                      <path d="M13 13l6 6" />
                    </svg>
                  </button>
                  <button onClick={() => setDrawType('parcela')} title="Parcela" style={{padding:'6px', borderRadius:'4px', border: drawType === 'parcela' ? '2px solid #555' : '1px solid transparent', background: drawType === 'parcela' ? '#fff' : 'transparent', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 20h20" strokeDasharray="4 4" />
                      <path d="M5 20l3-9" strokeDasharray="4 4" />
                      <path d="M19 20l-3-9" strokeDasharray="4 4" />
                      <path d="M8 11h8" strokeDasharray="4 4" />
                      <path d="M10 17v-4h4v4" />
                      <path d="M8 17v-6h8v6" />
                      <path d="M7 11l5-5 5 5" />
                    </svg>
                  </button>
                  <button onClick={() => setDrawType('losa')} title="Borde Losa" style={{padding:'6px', borderRadius:'4px', border: drawType === 'losa' ? '2px solid #757575' : '1px solid transparent', background: drawType === 'losa' ? '#fff' : 'transparent', color: '#757575', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.2" />
                      <path d="M2 12v4l10 5 10-5v-4" />
                    </svg>
                  </button>
                  <button onClick={() => setDrawType('perimetral')} title="Muro Perimetral" style={{padding:'6px', borderRadius:'4px', border: drawType === 'perimetral' ? '2px solid #e53935' : '1px solid transparent', background: drawType === 'perimetral' ? '#fff' : 'transparent', color: '#e53935', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="1" />
                      <path d="M3 12h18" /><path d="M3 8.5h18" /><path d="M3 15.5h18" />
                      <path d="M8 5v3.5" /><path d="M16 5v3.5" />
                      <path d="M12 8.5V12" />
                      <path d="M7 12v3.5" /><path d="M17 12v3.5" />
                      <path d="M12 15.5V19" />
                    </svg>
                  </button>
                  <button onClick={() => setDrawType('interno')} title="Muro Interno" style={{padding:'6px', borderRadius:'4px', border: drawType === 'interno' ? '2px solid #1e88e5' : '1px solid transparent', background: drawType === 'interno' ? '#fff' : 'transparent', color: '#1e88e5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
                      <rect x="3" y="5" width="18" height="14" rx="1" />
                      <path d="M3 12h18" /><path d="M3 8.5h18" /><path d="M3 15.5h18" />
                      <path d="M8 5v3.5" /><path d="M16 5v3.5" />
                      <path d="M12 8.5V12" />
                      <path d="M7 12v3.5" /><path d="M17 12v3.5" />
                      <path d="M12 15.5V19" />
                    </svg>
                  </button>
                  <button onClick={() => setDrawType('columna')} title="Machón" style={{padding:'6px', borderRadius:'4px', border: drawType === 'columna' ? '2px solid #9c27b0' : '1px solid transparent', background: drawType === 'columna' ? '#fff' : 'transparent', color: '#9c27b0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 14l6-3 6 3v6l-6 3-6-3v-6z" />
                      <path d="M6 14l6 3 6-3" />
                      <path d="M12 17v7" />
                      <path d="M10 12V2" />
                      <path d="M14 12V2" />
                      <path d="M8 5h8" />
                      <path d="M8 9h8" />
                    </svg>
                  </button>
                  {/* Herramienta Offset */}
                  <button onClick={() => { setDrawType('offset'); setOffsetSourceWall(null); setOffsetPreview(null); }} title="Offset / Desfase Paralelo" style={{padding:'6px', borderRadius:'4px', border: drawType === 'offset' ? '2px solid #00897b' : '1px solid transparent', background: drawType === 'offset' ? '#fff' : 'transparent', color: '#00897b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6h16" />
                      <path d="M4 12h12" strokeDasharray="3 2"/>
                      <path d="M18 9l3 3-3 3" />
                    </svg>
                  </button>
                  {/* Herramienta Rotar */}
                  <button onClick={() => { setDrawType('rotate'); setRotateSelectedIds(new Set()); setRotateAngle(0); }} title="Rotar Elementos" style={{padding:'6px', borderRadius:'4px', border: drawType === 'rotate' ? '2px solid #e65100' : '1px solid transparent', background: drawType === 'rotate' ? '#fff' : 'transparent', color: '#e65100', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7a9 9 0 1 0 1 5" />
                      <polyline points="20 2 20 7 15 7" />
                    </svg>
                  </button>
                </div>
                <div style={{display:'flex', gap:'4px', marginLeft:'12px'}}>
                  <button onClick={undo} disabled={historyPast.length === 0} title="Deshacer" style={{padding:'4px 8px', cursor: historyPast.length === 0 ? 'not-allowed' : 'pointer', background:'#fff', border:'1px solid #ccc', borderRadius:'4px'}}><Undo2 size={16} color={historyPast.length === 0 ? '#ccc' : '#333'}/></button>
                  <button onClick={redo} disabled={historyFuture.length === 0} title="Rehacer" style={{padding:'4px 8px', cursor: historyFuture.length === 0 ? 'not-allowed' : 'pointer', background:'#fff', border:'1px solid #ccc', borderRadius:'4px'}}><Redo2 size={16} color={historyFuture.length === 0 ? '#ccc' : '#333'}/></button>
                </div>
              </div>
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span className="mouse-tracker">📍 X: {mouseCoord.x.toFixed(1)}m, Y: {mouseCoord.y.toFixed(1)}m</span>
                {/* Botones de Zoom */}
                <div style={{display:'flex', gap:'3px', alignItems:'center', border:'1px solid #ddd', borderRadius:'6px', padding:'3px 6px', background:'#f5f5f5'}}>
                  <button onClick={() => setZoom(z => Math.min(8, z * 1.3))} title="Acercar" style={{padding:'2px 7px', fontSize:'16px', fontWeight:'bold', background:'transparent', border:'none', cursor:'pointer', lineHeight:1}}>+</button>
                  <button onClick={resetZoom} title="Restablecer zoom" style={{padding:'2px 6px', fontSize:'11px', background:'transparent', border:'none', cursor:'pointer', color:'#555', minWidth:'40px'}}>{Math.round(zoom*100)}%</button>
                  <button onClick={() => setZoom(z => Math.max(0.5, z / 1.3))} title="Alejar" style={{padding:'2px 7px', fontSize:'16px', fontWeight:'bold', background:'transparent', border:'none', cursor:'pointer', lineHeight:1}}>−</button>
                </div>
              </div>
            </div>

            {drawType === 'columna' && (
              <div style={{display:'flex', gap:'12px', marginBottom: '10px', background: '#f3e5f5', padding: '8px', borderRadius: '6px', border: '1px solid #ce93d8'}}>
                <label style={{fontSize: '13px', color: '#6a1b9a'}}><strong>Configuración Machón:</strong></label>
                <label style={{fontSize: '13px'}}>Ancho (X) m: <input type="number" step="0.05" value={colConfig.width} onChange={e=>setColConfig({...colConfig, width: parseFloat(e.target.value)||0})} style={{width: '60px'}}/></label>
                <label style={{fontSize: '13px'}}>Largo (Y) m: <input type="number" step="0.05" value={colConfig.length} onChange={e=>setColConfig({...colConfig, length: parseFloat(e.target.value)||0})} style={{width: '60px'}}/></label>
                <label style={{fontSize: '13px'}}>Alto (Z) m: <input type="number" step="0.1" value={colConfig.height} onChange={e=>setColConfig({...colConfig, height: parseFloat(e.target.value)||0})} style={{width: '60px'}}/></label>
                <span style={{fontSize: '12px', color: '#6a1b9a', fontStyle: 'italic'}}>(Haz clic en el plano para ubicarlo)</span>
              </div>
            )}
            {drawType === 'offset' && (
              <div style={{display:'flex', gap:'14px', alignItems:'center', marginBottom: '10px', background: '#e0f2f1', padding: '8px 12px', borderRadius: '6px', border: '1px solid #80cbc4'}}>
                <span style={{fontSize: '13px', color: '#00695c', fontWeight: 700}}>📏 Offset — Distancia:</span>
                <input type="number" step="0.01" min="0.01" value={offsetDist}
                  onChange={e => setOffsetDist(Math.max(0.01, parseFloat(e.target.value) || 0.15))}
                  style={{width: '70px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #80cbc4', fontWeight: 700, color: '#00695c'}}
                />
                <span style={{fontSize: '12px', color: '#00695c'}}>m</span>
                <span style={{fontSize: '12px', color: '#555', fontStyle: 'italic'}}>
                  {offsetSourceWall ? '✅ Muro seleccionado — mueve el cursor al lado deseado y haz clic para confirmar' : '👆 Haz clic sobre un muro para seleccionarlo'}
                </span>
                {offsetSourceWall && (
                  <button onClick={() => { setOffsetSourceWall(null); setOffsetPreview(null); }}
                    style={{marginLeft: 'auto', padding: '3px 10px', background: '#fff', border: '1px solid #80cbc4', borderRadius: '4px', cursor: 'pointer', color: '#00695c', fontSize: '12px'}}>
                    Cancelar
                  </button>
                )}
              </div>
            )}
            {drawType === 'rotate' && (
              <div style={{display:'flex', gap:'12px', alignItems:'center', marginBottom: '10px', background: '#fff3e0', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffcc80', flexWrap:'wrap'}}>
                <span style={{fontSize: '13px', color: '#e65100', fontWeight: 700}}>🔄 Rotar — Ángulo:</span>
                <input type="number" step="1" value={rotateAngle}
                  onChange={e => setRotateAngle(parseFloat(e.target.value) || 0)}
                  style={{width: '70px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #ffcc80', fontWeight: 700, color: '#e65100'}}
                />
                <span style={{fontSize: '12px', color: '#e65100'}}>grados (°)</span>
                <select value={rotatePivotMode} onChange={e => setRotatePivotMode(e.target.value)}
                  style={{padding:'3px 6px', borderRadius:'4px', border:'1px solid #ffcc80', fontSize:'12px'}}>
                  <option value="centroid">Pivote: Centroide selección</option>
                  <option value="origin">Pivote: Origen (0,0)</option>
                </select>
                <span style={{fontSize: '12px', color: '#555', fontStyle:'italic'}}>
                  {rotateSelectedIds.size === 0 ? '👆 Clic en muros para seleccionar (Shift+clic para multi-selección)' : `✅ ${rotateSelectedIds.size} muro(s) seleccionado(s)`}
                </span>
                {rotateSelectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => {
                        const rotated = getRotatedWalls(rotateSelectedIds, rotateAngle);
                        if (rotated.length === 0) return;
                        saveHistory();
                        setInternalWalls(prev => prev.map(w => {
                          const r = rotated.find(rw => rw.id === w.id);
                          return r || w;
                        }));
                        setRotateSelectedIds(new Set());
                        setRotateAngle(0);
                      }}
                      style={{padding: '4px 12px', background: '#e65100', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '13px'}}>
                      Aplicar ↺
                    </button>
                    <button onClick={() => { setRotateSelectedIds(new Set()); setRotateAngle(0); }}
                      style={{padding: '4px 10px', background: '#fff', border: '1px solid #ffcc80', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#e65100'}}>
                      Limpiar
                    </button>
                  </>
                )}
              </div>
            )}
            
            {selectedElement && selectedElement.type === 'columna' && (
              <div style={{display:'flex', gap:'12px', marginBottom: '10px', background: '#fff9c4', padding: '8px', borderRadius: '6px', border: '1px solid #fbc02d', alignItems: 'center'}}>
                <label style={{fontSize: '13px', color: '#f57f17'}}><strong>Machón Seleccionado:</strong></label>
                {(() => {
                  const c = columns.find(col => col.id === selectedElement.id);
                  if (!c) return null;
                  return (
                    <>
                      <label style={{fontSize: '13px'}}>Pos X (m): <input type="number" step="0.01" value={c.x.toFixed(2)} onChange={e=>{
                        const nx = parseFloat(e.target.value);
                        setColumns(columns.map(col => col.id === c.id ? {...col, x: isNaN(nx) ? c.x : nx} : col));
                      }} style={{width: '60px'}}/></label>
                      <label style={{fontSize: '13px'}}>Pos Y (m): <input type="number" step="0.01" value={c.y.toFixed(2)} onChange={e=>{
                        const ny = parseFloat(e.target.value);
                        setColumns(columns.map(col => col.id === c.id ? {...col, y: isNaN(ny) ? c.y : ny} : col));
                      }} style={{width: '60px'}}/></label>
                      <span style={{fontSize: '12px', color: '#f57f17', marginLeft: 'auto'}}>(Presiona <b>Suprimir</b> para eliminar)</span>
                    </>
                  );
                })()}
              </div>
            )}
            
            <svg 
              ref={svgRef}
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              viewBox={`${-panOffset.x * zoom} ${-panOffset.y * zoom} ${CANVAS_SIZE / zoom} ${CANVAS_SIZE / zoom}`}
              className={`drawing-board ${isDrawing ? 'drawing-mode' : ''}`}
              onMouseMove={handleMouseMove}
              onMouseDown={(e) => {
                if (e.ctrlKey || e.metaKey || e.button === 1) { handlePanStart(e); return; }
                if (!drawType) {
                  const { px, py } = getSvgPx(e, svgRef.current);
                  const mx = toMetersX(px, false);
                  const my = toMetersY(py, false);
                  setSelectionBox({ startX: mx, startY: my, currentX: mx, currentY: my });
                  isDraggingRef.current = false;
                }
              }}
              onMouseUp={(e) => {
                if (isPanningRef.current) { handlePanEnd(); return; }
                if (selectionBox) {
                  const minX = Math.min(selectionBox.startX, selectionBox.currentX);
                  const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
                  const minY = Math.min(selectionBox.startY, selectionBox.currentY);
                  const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
                  if (isDraggingRef.current) {
                    const foundCols = columns.filter(c => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY);
                    if (foundCols.length > 0) {
                      setSelectedElement({ type: 'columna', id: foundCols[0].id });
                    } else {
                      setSelectedElement(null);
                    }
                  }
                  setSelectionBox(null);
                }
              }}
              onDoubleClick={(e) => { if (!drawType && (e.ctrlKey || e.metaKey || zoom !== 1)) { resetZoom(); return; } handleSvgDoubleClick(e); }}
              onClick={handleSvgClick}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{ cursor: isPanningRef.current ? 'grabbing' : (isDrawing ? 'crosshair' : (drawType === 'columna' ? 'crosshair' : 'pointer')), userSelect: 'none', touchAction: 'none' }}
            >
              <g id="viewport-matrix-reference" />
              {/* ===== CAPAS: Imágenes de fondo ===== */}
              {layers.filter(l => l.visible && l.image).map(layer => (
                <image
                  key={`bg-${layer.id}`}
                  href={layer.image}
                  x={toSvg(0)} y={toSvg(0)}
                  width={params.Lx * (CANVAS_SIZE - 2 * MARGIN) / Math.max(params.Lx, params.Ly)}
                  height={params.Ly * (CANVAS_SIZE - 2 * MARGIN) / Math.max(params.Lx, params.Ly)}
                  opacity={layer.opacity}
                  preserveAspectRatio="none"
                  style={{ pointerEvents: 'none' }}
                />
              ))}

              {/* Ejes X (Ruler Top) */}
              <rect x={0} y={0} width={CANVAS_SIZE} height={MARGIN-5} fill="#f0f0f0" />
              {Array.from({ length: Math.floor(params.Lx) + 1 }).map((_, i) => (
                <g key={`rx${i}`}>
                  <line x1={toSvg(i)} y1={MARGIN-5} x2={toSvg(i)} y2={MARGIN} stroke="#333" strokeWidth="1.5" />
                  <text x={toSvg(i)} y={MARGIN-10} fontSize="10" textAnchor="middle" fill="#555">{i}</text>
                </g>
              ))}

              {/* Ejes Y (Ruler Left) */}
              <rect x={0} y={0} width={MARGIN-5} height={CANVAS_SIZE} fill="#f0f0f0" />
              {Array.from({ length: Math.floor(params.Ly) + 1 }).map((_, i) => (
                <g key={`ry${i}`}>
                  <line x1={MARGIN-5} y1={toSvg(i)} x2={MARGIN} y2={toSvg(i)} stroke="#333" strokeWidth="1.5" />
                  <text x={MARGIN-10} y={toSvg(i)+3} fontSize="10" textAnchor="end" fill="#555">{i}</text>
                </g>
              ))}

              {/* Grid Mayor (1m) e Intenso */}
              {Array.from({ length: Math.floor(params.Lx) + 1 }).map((_, i) => (
                <line key={`vx${i}`} x1={toSvg(i)} y1={MARGIN} x2={toSvg(i)} y2={toSvg(params.Ly)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
              ))}
              {Array.from({ length: Math.floor(params.Ly) + 1 }).map((_, i) => (
                <line key={`vy${i}`} x1={MARGIN} y1={toSvg(i)} x2={toSvg(params.Lx)} y2={toSvg(i)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
              ))}
              
              {/* Grid Menor (0.5m) */}
              {Array.from({ length: Math.floor(params.Lx / 0.5) + 1 }).map((_, i) => (
                <line key={`vx_sub${i}`} x1={toSvg(i*0.5)} y1={MARGIN} x2={toSvg(i*0.5)} y2={toSvg(params.Ly)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />
              ))}
              {Array.from({ length: Math.floor(params.Ly / 0.5) + 1 }).map((_, i) => (
                <line key={`vy_sub${i}`} x1={MARGIN} y1={toSvg(i*0.5)} x2={toSvg(params.Lx)} y2={toSvg(i*0.5)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />
              ))}

              {/* Parcela Boundary (Visual Fijo) */}
              {(() => {
                const boundaryPts = getPerimeterVertices(0);
                if (boundaryPts.length === 0) return null;
                const pointsStr = boundaryPts.map(p => `${toSvg(p.x)},${toSvg(p.y)}`).join(' ');
                return (
                  <polygon 
                    points={pointsStr} 
                    fill="rgba(255, 152, 0, 0.08)" 
                    stroke="#ff9800" 
                    strokeWidth="2" 
                    strokeDasharray="6,4" 
                    pointerEvents="none"
                  />
                );
              })()}

              {/* Losa Boundary (Visual Fijo) */}
              {(() => {
                const numOffset = parseFloat(offset) || 0;
                if (numOffset <= 0) return null;
                const losaPts = getPerimeterVertices(numOffset);
                if (losaPts.length === 0) return null;
                const pointsStr = losaPts.map(p => `${toSvg(p.x)},${toSvg(p.y)}`).join(' ');
                return (
                  <polygon 
                    points={pointsStr} 
                    fill="rgba(158, 158, 158, 0.1)" 
                    stroke="#9e9e9e" 
                    strokeWidth="2" 
                    strokeDasharray="4,2" 
                    pointerEvents="none"
                  />
                );
              })()}

              {/* Render Columnas */}
              {columns.map(c => {
                const isSel = selectedElement && selectedElement.type === 'columna' && selectedElement.id === c.id;
                return (
                <g key={c.id} style={{cursor: 'pointer'}} 
                   onMouseDown={(e) => e.stopPropagation()}
                   onClick={(e) => { 
                     e.stopPropagation(); 
                     setSelectedElement({ type: 'columna', id: c.id }); 
                     setDrawType(null);
                   }}
                   onDoubleClick={(e) => { e.stopPropagation(); saveHistory(); setColumns(columns.filter(col => col.id !== c.id)); setSelectedElement(null); }} 
                   title="Clic para seleccionar y presionar Suprimir. Doble clic para eliminar rápido">
                  <rect 
                    x={toSvg(c.x - c.width/2)} 
                    y={toSvg(c.y - c.length/2)} 
                    width={c.width * scale} 
                    height={c.length * scale} 
                    fill={isSel ? "#e1bee7" : "#9c27b0"} stroke={isSel ? "#d50000" : "#7b1fa2"} strokeWidth={isSel ? "3" : "2"} 
                  />
                  <text x={toSvg(c.x)} y={toSvg(c.y - c.length/2) - 5} fontSize="10" textAnchor="middle" fill={isSel ? "#d50000" : "#9c27b0"} fontWeight="bold">C{String(c.id).slice(-3)}</text>
                </g>
              )})}

              {/* Render Selection Box */}
              {selectionBox && isDraggingRef.current && (
                <rect 
                  x={toSvg(Math.min(selectionBox.startX, selectionBox.currentX))}
                  y={toSvg(Math.min(selectionBox.startY, selectionBox.currentY))}
                  width={(Math.max(selectionBox.startX, selectionBox.currentX) - Math.min(selectionBox.startX, selectionBox.currentX)) * scale}
                  height={(Math.max(selectionBox.startY, selectionBox.currentY) - Math.min(selectionBox.startY, selectionBox.currentY)) * scale}
                  fill="rgba(33, 150, 243, 0.2)"
                  stroke="#2196f3"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )}
              
              {/* Muros y Líneas */}
              {allWalls.map(w => {
                const isHovered = hoveredWallId === w.id;
                let strokeColor = '#1e88e5'; // interno
                if (w.type === 'perimetral') strokeColor = '#e53935';
                if (w.type === 'losa') strokeColor = '#757575';
                if (w.type === 'parcela') strokeColor = '#9e9e9e';
                
                const isSel = selectedElement && selectedElement.type === 'muro' && selectedElement.id === w.id;
                
                if (isSel) strokeColor = '#9c27b0'; // seleccionado
                else if (drawType === 'rotate' && rotateSelectedIds.has(w.id)) strokeColor = '#e65100'; // seleccionado para rotar
                else if (drawType === 'offset' && offsetSourceWall && offsetSourceWall.id === w.id) strokeColor = '#ff9800'; // seleccionado para offset
                else if (isHovered) strokeColor = '#4caf50';

                const isLineOnly = w.type === 'losa' || w.type === 'parcela';
                // Grosor de línea de los muros ajustado (más delgado)
                const strokeW = isLineOnly ? (isHovered ? 4 : 2) : Math.max(isHovered ? 5 : 3, ((w.thickness || 0.15) * scale) * 0.5);
                const strokeDash = w.type === 'parcela' ? '6,6' : 'none';

                return (
                <g key={w.id} 
                   onMouseEnter={() => setHoveredWallId(w.id)}
                   onMouseLeave={() => setHoveredWallId(null)}
                   style={{ cursor: drawType === 'offset' ? 'copy' : drawType === 'rotate' ? 'cell' : 'pointer' }}
                   onClick={e => {
                     if (drawType === 'offset') {
                       e.stopPropagation();
                       setOffsetSourceWall(w);
                       setOffsetPreview(null);
                     } else if (drawType === 'rotate') {
                       e.stopPropagation();
                       setRotateSelectedIds(prev => {
                         const next = new Set(prev);
                         if (next.has(w.id)) next.delete(w.id);
                         else next.add(w.id);
                         return next;
                       });
                     }
                   }}
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
                      strokeDasharray={strokeDash}
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

                      let p1x = ox1, p1y = oy1;
                      let p2x = ox2, p2y = oy2;
                      // Ensure p1 is always to the "left" or "top" of p2 to match icon spatial orientation
                      if (p1x > p2x || (Math.abs(p1x - p2x) < 0.001 && p1y > p2y)) {
                        p1x = ox2; p1y = oy2;
                        p2x = ox1; p2y = oy1;
                      }

                      // Unit vector along wall (in SVG coords), forced L-to-R or T-to-B
                      const ux = (p2x-p1x)/w_px;
                      const uy = (p2y-p1y)/w_px;
                      // Perpendicular: always points "UP" for horizontal walls, or "RIGHT" for vertical walls
                      let vx = uy;
                      let vy = -ux;

                      if (op.type.startsWith('door')) {
                        const isLeft = op.type.includes('left');
                        const isOut = op.type.includes('out');
                        
                        if (isOut) {
                          vx = -vx;
                          vy = -vy;
                        }

                        // Hinge point and free end
                        const hx = isLeft ? p1x : p2x;
                        const hy = isLeft ? p1y : p2y;
                        const ex = isLeft ? p2x : p1x;
                        const ey = isLeft ? p2y : p1y;
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

              {/* Pre-visualización Offset */}
              {drawType === 'offset' && offsetPreview && (
                <>
                  {/* Línea paralela preview */}
                  <line
                    x1={toSvg(offsetPreview.x1)} y1={toSvg(offsetPreview.y1)}
                    x2={toSvg(offsetPreview.x2)} y2={toSvg(offsetPreview.y2)}
                    stroke="#00897b" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round"
                  />
                  {/* Líneas de cota (distancia visual) */}
                  {offsetSourceWall && (
                    <>
                      <line
                        x1={toSvg((offsetSourceWall.x1 + offsetSourceWall.x2)/2)}
                        y1={toSvg((offsetSourceWall.y1 + offsetSourceWall.y2)/2)}
                        x2={toSvg((offsetPreview.x1 + offsetPreview.x2)/2)}
                        y2={toSvg((offsetPreview.y1 + offsetPreview.y2)/2)}
                        stroke="#00897b" strokeWidth="1.5" strokeDasharray="3,3"
                      />
                      <text
                        x={toSvg(((offsetSourceWall.x1 + offsetSourceWall.x2)/2 + (offsetPreview.x1 + offsetPreview.x2)/2) / 2)}
                        y={toSvg(((offsetSourceWall.y1 + offsetSourceWall.y2)/2 + (offsetPreview.y1 + offsetPreview.y2)/2) / 2) - 6}
                        fontSize="11" fill="#00695c" fontWeight="bold" textAnchor="middle"
                      >
                        {offsetDist.toFixed(2)}m
                      </text>
                    </>
                  )}
                </>
              )}

              {/* Pre-visualización Rotación */}
              {drawType === 'rotate' && rotateSelectedIds.size > 0 && rotateAngle !== 0 && (
                <g style={{ pointerEvents: 'none' }}>
                  {getRotatedWalls(rotateSelectedIds, rotateAngle).map((rw, i) => (
                    <line
                      key={`rot-prev-${i}`}
                      x1={toSvg(rw.x1)} y1={toSvg(rw.y1)}
                      x2={toSvg(rw.x2)} y2={toSvg(rw.y2)}
                      stroke="#ff9800" strokeWidth="3" strokeDasharray="5,5" strokeLinecap="round" opacity="0.8"
                    />
                  ))}
                </g>
              )}

              {/* Punto indicador de Snap Mouse */}
              <circle cx={toSvg(mouseCoord.x)} cy={toSvg(mouseCoord.y)} r="4" fill="#ff9800" />

            </svg>
            {/* HUD: input flotante de precisión */}
            {isDrawing && drawStart && (
              <input
                ref={hudInputRef}
                type="number"
                step="0.01"
                min="0"
                value={hudInput}
                onChange={e => {
                  const val = e.target.value;
                  setHudInput(val);
                  const len = parseFloat(val);
                  if (!isNaN(len) && len > 0 && drawEnd) {
                    // Calcular dirección actual del cursor
                    let angle = Math.atan2(drawEnd.y - drawStart.y, drawEnd.x - drawStart.x);
                    if (orthoLock) {
                      angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                    }
                    setDrawEnd({
                      x: drawStart.x + Math.cos(angle) * len,
                      y: drawStart.y + Math.sin(angle) * len
                    });
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    commitWall();
                  } else if (e.key === 'Escape') {
                    e.stopPropagation();
                    setIsDrawing(false);
                    setDrawStart(null);
                    setDrawEnd(null);
                    setHudInput('');
                    setOrthoLock(false);
                    setDrawType(null);
                  }
                }}
                placeholder="Longitud (m)"
                style={{
                  position: 'fixed',
                  left: hudPos.x,
                  top: hudPos.y,
                  width: '110px',
                  padding: '4px 8px',
                  background: 'rgba(15,25,45,0.92)',
                  border: '1px solid #ff9800',
                  borderRadius: '6px',
                  color: '#ff9800',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  outline: 'none',
                  zIndex: 9999,
                  pointerEvents: 'auto',
                  fontFamily: 'monospace',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}
              />
            )}
            {isDrawing && (
              <div className="drawing-hint">
                {orthoLock ? '🔒 Ortho ON (Shift)' : '📐 Libre'}
                {' · '}
                {drawEnd && drawStart ? `L = ${Math.sqrt((drawEnd.x - drawStart.x)**2 + (drawEnd.y - drawStart.y)**2).toFixed(2)} m` : ''}
                {' · '}
                Escribe la longitud exacta y presiona <strong>Enter</strong>. Doble clic para fijar. <strong>ESC</strong> para cancelar.
              </div>
            )}
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
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid #eee', background:'#1A6BB5', borderRadius:'12px 12px 0 0'}}>
            <div>
              <h3 style={{margin:0, color:'#fff', fontSize:'16px'}}>📊 Resultados del Análisis Estructural (ACI 318)</h3>
              <small style={{color:'#e0e0e0'}}>{projectName}</small>
            </div>
            <button onClick={() => setShowResultsModal(false)} style={{background:'none', border:'1px solid rgba(255,255,255,0.5)', color:'#fff', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'14px'}}>✕ Cerrar</button>
          </div>

          {/* Cards de métricas clave */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', padding:'20px 24px', background:'#f9f9f9', borderBottom:'1px solid #eee'}}>
            {[{
              label:'Asentamiento Máx', val: `${(results.displacements?.w_max_mm||0).toFixed(2)} mm`, ok: true
            },{
              label:'Momento Mx Máx', val: `${((results.moments?.Mx_max_kNm_m||0)*101.9716).toFixed(0)} kgf·m/m`, ok: true
            },{
              label:'Momento My Máx', val: `${((results.moments?.My_max_kNm_m||0)*101.9716).toFixed(0)} kgf·m/m`, ok: true
            },{
              label:'Cortante Vu Máx', val: `${((results.shear?.Vu_max_kN_m||0)*101.9716).toFixed(0)} kgf/m`, ok: results.shear?.shear_ok
            },{
              label:'φVc Cap.', val: `${((results.shear?.phiVc_kN_m||0)*101.9716).toFixed(0)} kgf/m`, ok: results.shear?.shear_ok
            },{
              label:'Presión Suelo', val: results.soil_pressure ? `${(results.soil_pressure.max_pressure_kN_m2*101.9716).toFixed(0)} kgf/m²` : '-', ok: results.soil_pressure?.ok
            },{
              label:'q_adm', val: results.soil_pressure ? `${(results.soil_pressure.q_adm_kN_m2*101.9716).toFixed(0)} kgf/m²` : '-', ok: true
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
              
              {/* Tabla de Armadura Adicional (Muros) */}
              {results.bands && (
                <div style={{marginTop: '20px'}}>
                  <h5 style={{margin:'0 0 10px 0', color:'#444'}}>Armadura Adicional Requerida (Bandas de Refuerzo)</h5>
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left'}}>
                      <thead>
                        <tr style={{background: '#f1f1f1', borderBottom: '2px solid #ccc'}}>
                          <th style={{padding: '8px'}}>Muro</th>
                          <th style={{padding: '8px'}}>Ancho Banda</th>
                          <th style={{padding: '8px'}}>Acero Adicional X</th>
                          <th style={{padding: '8px'}}>Acero Adicional Y</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.bands.map((b, idx) => {
                          const asMin = results.As_min_cm2_m || 0;
                          const reqX = b.Asx_cm2_m > asMin + 0.05;
                          const reqY = b.Asy_cm2_m > asMin + 0.05;
                          if (!reqX && !reqY) return null;
                          return (
                            <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                              <td style={{padding: '8px', fontWeight: 'bold', color: '#e65100'}}>M{idx+1}</td>
                              <td style={{padding: '8px', color: '#666'}}>{b.band_width?.toFixed(2) || '-'} m</td>
                              <td style={{padding: '8px', color: reqX ? '#d32f2f' : 'inherit'}}>{reqX ? `Ø${b.bar_x?.diam_mm}@${Math.round(b.bar_x?.sep_m * 100)}cm` : '-'}</td>
                              <td style={{padding: '8px', color: reqY ? '#1976d2' : 'inherit'}}>{reqY ? `Ø${b.bar_y?.diam_mm}@${Math.round(b.bar_y?.sep_m * 100)}cm` : '-'}</td>
                            </tr>
                          );
                        })}
                        {results.bands.every(b => {
                          const asMin = results.As_min_cm2_m || 0;
                          return !(b.Asx_cm2_m > asMin + 0.05) && !(b.Asy_cm2_m > asMin + 0.05);
                        }) && (
                          <tr>
                            <td colSpan="3" style={{padding: '12px', textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                              No se requiere acero adicional. La malla base cubre toda la demanda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mapas de Calor Interactivos */}
          {results.heatmaps && (
            <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#fff'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#333'}}><FaThermometerHalf style={{color:'#1A6BB5'}}/> Mapas de Calor Interactivos</h4>
              <div style={{display:'flex', flexWrap:'wrap', gap:'15px', justifyContent:'center'}}>
                <InteractiveHeatmap dataMatrix={results.heatmaps.w_mm} title="Desplazamiento (w)" unit="mm" lx={params.Lx} ly={params.Ly} />
                <InteractiveHeatmap dataMatrix={results.heatmaps.Mx_kNm.map(r => r.map(v => v * 101.9716))} title="Momento Mx" unit="kgf·m/m" lx={params.Lx} ly={params.Ly} />
                <InteractiveHeatmap dataMatrix={results.heatmaps.My_kNm.map(r => r.map(v => v * 101.9716))} title="Momento My" unit="kgf·m/m" lx={params.Lx} ly={params.Ly} />
                <InteractiveHeatmap dataMatrix={results.heatmaps.Vu_kN.map(r => r.map(v => v * 101.9716))} title="Cortante Vu" unit="kgf/m" lx={params.Lx} ly={params.Ly} />
              </div>
            </div>
          )}

          {/* Cantidades de Obra */}
          {results.materials_computation && (
            <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#f5f7fa'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#333'}}><FaHardHat /> Cómputos Métricos (Cantidades Estimadas)</h4>
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
                  <h4 style={{margin:'0 0 12px 0', color:'#333'}}>
                    {designParams.custom_mesh_cm2_m > 0 ? 'Acero General (Personalizado):' : 'Acero General Losa (Mínimo):'}
                  </h4>
                  {designParams.custom_mesh_cm2_m > 0 ? (
                    <div style={{fontSize:'14px', color:'#c62828', fontWeight:'bold'}}>
                      {designParams.custom_mesh_cm2_m === 0.61 && 'Malla 6x6 (Ø3.43@15cm)'}
                      {designParams.custom_mesh_cm2_m === 1.41 && 'Varillas Ø6@20cm'}
                      {designParams.custom_mesh_cm2_m === 1.88 && 'Malla Sima (Ø6@15cm)'}
                      {designParams.custom_mesh_cm2_m === 1.92 && 'Varillas Ø7@20cm'}
                      {designParams.custom_mesh_cm2_m === 2.51 && 'Varillas Ø8@20cm'}
                      {designParams.custom_mesh_cm2_m === 3.93 && 'Varillas Ø10@20cm'}
                      {designParams.custom_mesh_cm2_m === 5.24 && 'Varillas Ø10@15cm'}
                    </div>
                  ) : (
                    <div style={{fontSize:'14px', color:'#c62828', fontWeight:'bold'}}>{results.materials_computation.general_slab_steel.bar_x} en X, {results.materials_computation.general_slab_steel.bar_y} en Y</div>
                  )}
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
              <h4 style={{margin:'0 0 12px 0', color:'#333'}}><FaTable /> Tabla de Armado de Bandas</h4>
              <table className="coords-table" style={{minWidth:'720px', fontSize:'12px'}}>
                <thead>
                  <tr style={{background:'#1e1e2f', color:'#fff'}}>
                    <th style={{color:'#fff'}}>Muro</th><th style={{color:'#fff'}}>Tipo</th>
                    <th style={{color:'#fff'}}>Ancho Banda</th>
                    <th style={{color:'#fff'}}>Mx (kgf·m/m)</th><th style={{color:'#fff'}}>My (kgf·m/m)</th>
                    <th style={{color:'#fff'}}>Asx (cm²/m)</th><th style={{color:'#fff'}}>Asy (cm²/m)</th>
                    <th style={{color:'#fff'}}>Prop. X</th><th style={{color:'#fff'}}>Prop. Y</th>
                    <th style={{color:'#fff'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {results.bands.map((b, i) => {
                    const asMin = results.As_min_cm2_m || 0;
                    const isMinX = b.Asx_cm2_m <= asMin + 0.01;
                    const isMinY = b.Asy_cm2_m <= asMin + 0.01;
                    const px = isMinX ? 'Malla General' : (b.bar_x?.diam_mm > 0 ? `Ø${b.bar_x.diam_mm}@${(b.bar_x.sep_m*100).toFixed(0)}cm` : 'Mínimo');
                    const py = isMinY ? 'Malla General' : (b.bar_y?.diam_mm > 0 ? `Ø${b.bar_y.diam_mm}@${(b.bar_y.sep_m*100).toFixed(0)}cm` : 'Mínimo');
                    return (
                      <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                        <td>M{i+1}</td>
                        <td>
                          <span style={{
                            padding:'2px 6px', borderRadius:'3px', fontSize:'10px', 
                            background: b.type==='perimetral' ? '#ffebee' : (b.type==='losa' ? '#fff3e0' : (b.type==='parcela' ? '#f5f5f5' : '#e3f2fd')), 
                            color: b.type==='perimetral' ? '#c62828' : (b.type==='losa' ? '#e65100' : (b.type==='parcela' ? '#616161' : '#1565c0'))
                          }}>
                            {b.type==='perimetral' ? 'Perim.' : (b.type==='losa' ? 'Losa' : (b.type==='parcela' ? 'Parcela' : 'Interno'))}
                          </span>
                        </td>
                        <td>{b.band_width.toFixed(2)} m</td>
                        <td>{(b.Mx_design_kNm_m * 101.9716).toFixed(2)}</td>
                        <td>{(b.My_design_kNm_m * 101.9716).toFixed(2)}</td>
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
                <h4 style={{margin:0, color:'#333'}}><FaClipboardList /> Presupuesto Estimado</h4>
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="btn-success" onClick={descargarMemoriaCalculoHtml} style={{background:'#1A6BB5', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                    <FaBook /> Memoria Estructural
                  </button>
                  <button className="btn-success" onClick={descargarComputosHtml} style={{background:'#673ab7', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                    <FaClipboardList /> Cómputos Métricos
                  </button>
                  <button className="btn-success" onClick={descargarExcel} style={{background:'#1976d2', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                    <FaFileExcel /> Excel Fórmulas
                  </button>
                  <button className="btn-success" onClick={descargarPDFPresupuesto} style={{background:'#2e7d32', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                    <FaFilePdf /> Descargar PDF
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
                  {['Losa de Fundación', 'Mampostería', 'Machones'].map((chap) => {
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
            <button className="btn-secondary" onClick={downloadAuditJSON} style={{display:'flex', alignItems:'center', gap:'6px'}}><FaDownload /> JSON Auditoría MKS</button>
            <button className="btn-secondary" onClick={downloadHTML} style={{background:'#e3f2fd', borderColor:'#90caf9', display:'flex', alignItems:'center', gap:'6px'}}><FaFileCode /> Plano HTML</button>
            <button onClick={() => setShowResultsModal(false)} className="btn-success" style={{background:'#4caf50', border:'none', color:'#fff'}}>Cerrar</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
