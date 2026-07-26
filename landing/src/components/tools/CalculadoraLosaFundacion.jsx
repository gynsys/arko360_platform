import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './CalculadoraLosaFundacion.css';
import { DoorOpen, DoorClosed, AppWindow, Undo2, Redo2, LogIn, LogOut, ArrowLeft } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FaClipboardList, FaFilePdf, FaMap, FaChartBar, FaDownload, FaThermometerHalf, FaHardHat, FaImage, FaTable, FaBook, FaFileExcel, FaFileCode, FaSave, FaFolderPlus, FaDrawPolygon, FaCubes, FaColumns, FaDoorOpen, FaCogs, FaPlay, FaBorderAll, FaFile, FaFolderOpen, FaTimes } from 'react-icons/fa';
import InteractiveHeatmap from './InteractiveHeatmap';
import { AuthModal } from './fea3d/AuthModal';
// ============================================
// FOUNDATION SLAB EDITOR - HIBRIDO v2
// Grid Intenso, Snap a la Grilla, Auditoría JSON
// ============================================

import { API_BASE, MATERIALS, FALLBACK_PRECIOS, SHAPES } from './calculadoraLosaFundacion/constants/slabConstants';
import { generarPresupuesto } from './calculadoraLosaFundacion/utils/budgetCalculator';
import DraggableModal from './calculadoraLosaFundacion/components/DraggableModal';
import { descargarExcel as doDescargarExcel } from './calculadoraLosaFundacion/utils/exports/exportExcel';
import { descargarPDFPresupuesto as doDescargarPDFPresupuesto } from './calculadoraLosaFundacion/utils/exports/exportPdf';
import { descargarComputosHtml as doDescargarComputosHtml } from './calculadoraLosaFundacion/utils/exports/exportComputosHtml';
import { descargarMemoriaCalculoHtml as doDescargarMemoriaCalculoHtml } from './calculadoraLosaFundacion/utils/exports/exportMemoriaHtml';
import { downloadAuditJSON as doDownloadAuditJSON } from './calculadoraLosaFundacion/utils/exports/exportAuditJson';
import { getLiveSvgDetails } from './calculadoraLosaFundacion/utils/rebarVerifier';
import { GeometryModal } from './calculadoraLosaFundacion/components/toolModals/GeometryModal';
import { MaterialsModal } from './calculadoraLosaFundacion/components/toolModals/MaterialsModal';
import { FemModal } from './calculadoraLosaFundacion/components/toolModals/FemModal';
import { OpeningsModal } from './calculadoraLosaFundacion/components/toolModals/OpeningsModal';
import { WallsModal } from './calculadoraLosaFundacion/components/toolModals/WallsModal';
import { LayersModal } from './calculadoraLosaFundacion/components/toolModals/LayersModal';
import { ColumnsModal } from './calculadoraLosaFundacion/components/toolModals/ColumnsModal';
import { verifyRebarSpacing, verifyBeamRebar } from './calculadoraLosaFundacion/utils/rebarVerifier';
import { InteractiveRebarSelect, InteractiveBeamRebarSelect } from './calculadoraLosaFundacion/components/RebarSelectors';
import { SlabCanvas } from './calculadoraLosaFundacion/components/SlabCanvas';
import { ResultsModal } from './calculadoraLosaFundacion/components/ResultsModal';


export default function CalculadoraLosaFundacion({ onBack }) {
  const svgRef = useRef(null);
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Auth
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('arko_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch(e){ console.error(e); }
    }
    const handleLoginEvent = () => {
      const uStr = localStorage.getItem('arko_user');
      if (uStr) {
        try { setCurrentUser(JSON.parse(uStr)); } catch(e){ console.error(e); }
      }
    };
    const handleLogoutEvent = () => {
      setCurrentUser(null);
    };
    window.addEventListener('arko_login', handleLoginEvent);
    window.addEventListener('arko_logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('arko_login', handleLoginEvent);
      window.removeEventListener('arko_logout', handleLogoutEvent);
    };
  }, []);

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
    return doDescargarExcel({ results, presupuesto, presupuestoTotal, projectName });
  };

  const descargarPDFPresupuesto = () => {
    doDescargarPDFPresupuesto({ presupuesto, presupuestoTotal });
  };

  const descargarComputosHtml = () => {
    doDescargarComputosHtml({
      results,
      wallHeight,
      allWalls,
      openings,
      payload: lastPayload || buildCurrentPayload(),
      designParams,
      projectName,
      toast
    });
  };

  const descargarMemoriaCalculoHtml = () => {
    doDescargarMemoriaCalculoHtml({
      results,
      payload: lastPayload || buildCurrentPayload(),
      columns,
      projectName,
      toast
    });
  };

  const snapToGrid = useCallback((val) => gridStep > 0 ? Math.round(val / gridStep) * gridStep : val, [gridStep]);

  // Dynamic rebar selection state for live SVG updates
  const [customBeamRebar, setCustomBeamRebar] = useState(null);
  const [customWallRebars, setCustomWallRebars] = useState({ tracVert: null, tracHoriz: null, compVert: null, compHoriz: null });

  // Escala para el SVG
  const MARGIN = 40; // Margen para los ejes
  const scale = 50;  // Píxeles por metro constantes para evitar distorsiones y huecos vacíos
  const CANVAS_WIDTH = Math.max(params.Lx, 1) * scale + MARGIN * 2;
  const CANVAS_HEIGHT = Math.max(params.Ly, 1) * scale + MARGIN * 2;
  
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
        thickness: w.thickness || (type === 'interno' ? 0.12 : type === 'support_beam' ? 0.3 : matProps.thickness),
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
    setInternalWalls(prev => [...prev, { id: Date.now(), type: drawType, layer_id: activeLayer, x1: w.x1 ?? 0, y1: w.y1 ?? 0, x2: w.x2 ?? 1, y2: w.y2 ?? 1 }]);
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
    const scaleFactorX = CANVAS_WIDTH / (rect.width || CANVAS_WIDTH);
    const scaleFactorY = CANVAS_HEIGHT / (rect.height || CANVAS_HEIGHT);
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
    const vbWidth = CANVAS_WIDTH / zoom;
    const vbHeight = CANVAS_HEIGHT / zoom;
    
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
      // Snap a vértices (Endpoints)
      checkSnap(w.x1, w.y1);
      checkSnap(w.x2, w.y2);
      
      // Snap a bordes (Point-to-Segment) para permitir terminar líneas sobre muros existentes
      const l2 = (w.x2 - w.x1)**2 + (w.y2 - w.y1)**2;
      if (l2 > 0) {
        const t = Math.max(0, Math.min(1, ((rawMx - w.x1)*(w.x2 - w.x1) + (rawMy - w.y1)*(w.y2 - w.y1)) / l2));
        const pX = w.x1 + t * (w.x2 - w.x1);
        const pY = w.y1 + t * (w.y2 - w.y1);
        checkSnap(pX, pY);
      }
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
      retaining_walls: allWalls.filter(w => w.type === 'retaining_wall').map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        thickness: w.thickness || 0.3, 
        soil_height: w.soil_height || 1.4,
        soil_density: w.soil_density || 18000.0, 
        phi: w.phi || 30.0,
        perimeter_wall_height: w.perimeter_wall_height || 2.5,
        id: String(w.id)
      })),
      support_beams: allWalls.filter(w => w.type === 'support_beam').map(w => ({
        x1: w.x1 - offsetX, y1: w.y1 - offsetY, x2: w.x2 - offsetX, y2: w.y2 - offsetY,
        width: w.thickness || 0.3, depth: w.depth || 0.5,
        id: String(w.id)
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
    setLoadingRuns(true);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('arko_token')}` }
      });
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
    doDownloadAuditJSON({ lastPayload, results, projectName });
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
  ${results.svg_details ? `
  <h3>Detalles Constructivos Transversales</h3>
  <div class="svg-container">
    ${results.svg_details}
  </div>
  ` : ''}
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('arko_token')}`
        },
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('arko_token')}`
        },
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
    if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
      setAuthModalOpen(true);
      return;
    }
    if (!window.confirm('¿Eliminar este cálculo? Esta acción no se puede deshacer.')) return;
    setDeletingRunId(runId);
    try {
      const response = await fetch(`${API_BASE}/calculadora-losas/runs/${runId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('arko_token')}` }
      });
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

  const handleNewProject = () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontWeight: '600' }}>¿Deseas iniciar un proyecto nuevo?</span>
        <span style={{ fontSize: '13px', color: '#666' }}>Se perderán los cambios no guardados.</span>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              setProjectName('Nuevo Proyecto');
              setShape('Rectangular');
              setParams({ Lx: 10, Ly: 10, wingX: 4, wingY: 4, wingX2: 4, baseY: 4, barY: 4, h: 15 });
              setOffset(0.5);
              setSlabOffset(0.0);
              setInternalWalls([]);
              setColumns([]);
              setOpenings([]);
              setResults(null);
              setError(null);
              setCurrentRunId(null);
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            style={{ padding: '6px 12px', background: '#1A6BB5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            Aceptar
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '6px 12px', background: '#f5f5f5', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { border: '1px solid #90caf9', padding: '16px' } });
  };

  const handleCloseProject = () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontWeight: '600' }}>¿Seguro que deseas cerrar el proyecto actual?</span>
        <span style={{ fontSize: '13px', color: '#666' }}>Se perderán los cambios no guardados.</span>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              setProjectName('Nuevo Proyecto');
              setShape('Rectangular');
              setParams({ Lx: 10, Ly: 10, wingX: 4, wingY: 4, wingX2: 4, baseY: 4, barY: 4, h: 15 });
              setOffset(0.5);
              setSlabOffset(0.0);
              setInternalWalls([]);
              setColumns([]);
              setOpenings([]);
              setResults(null);
              setError(null);
              setCurrentRunId(null);
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            Cerrar Proyecto
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '6px 12px', background: '#f5f5f5', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { border: '1px solid #ffcdd2', padding: '16px' } });
  };

  return (
    <>
    {loading && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(5px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000
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
            <button onClick={handleNewProject} className="toolbar-btn">
              <FaFile style={{ fontSize: '12px' }} /> Nuevo
            </button>
            <button onClick={() => { 
              if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
                setAuthModalOpen(true);
                return;
              }
              setShowOpenModal(true); 
              fetchRuns(); 
            }} className="toolbar-btn">
              <FaFolderOpen style={{ fontSize: '12px' }} /> Abrir
            </button>
            <button onClick={handleCloseProject} className="toolbar-btn">
              <FaTimes style={{ fontSize: '12px' }} /> Cerrar
            </button>
            <button onClick={() => saveToDatabase()} className="toolbar-btn">
              <FaSave style={{ fontSize: '12px' }} /> Guardar
            </button>
            <button onClick={() => { setSaveAsName(projectName); setShowSaveAsModal(true); }} className="toolbar-btn">
              <FaSave style={{ fontSize: '12px' }} /> Guardar como
            </button>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
            
            {currentUser ? (
              <button onClick={() => {
                localStorage.removeItem('arko_token');
                localStorage.removeItem('arko_user');
                setCurrentUser(null);
                window.dispatchEvent(new Event('arko_logout'));
              }} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: 'rgba(211,47,47,0.15)', color: '#ffcdd2', border: '1px solid rgba(211,47,47,0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <LogOut size={14} /> Cerrar Sesión ({currentUser.name?.split(' ')[0]})
              </button>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: '#1A6BB5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                <LogIn size={14} /> Iniciar Sesión
              </button>
            )}
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

          {/* Botón Paredes */}
          <button
            onClick={() => setActiveModal(activeModal === 'walls' ? null : 'walls')}
            title="Paredes"
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
            <GeometryModal
              shape={shape}
              SHAPES={SHAPES}
              handleShapeChange={handleShapeChange}
              convertToManual={convertToManual}
              params={params}
              handleParamChange={handleParamChange}
              offset={offset}
              setOffset={setOffset}
              slabOffset={slabOffset}
              setSlabOffset={setSlabOffset}
              gridStep={gridStep}
              setGridStep={setGridStep}
              setActiveModal={setActiveModal}
            />
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
        <MaterialsModal
          wallHeight={wallHeight}
          setWallHeight={setWallHeight}
          material={material}
          setMaterial={setMaterial}
          MATERIALS={MATERIALS}
          designParams={designParams}
          handleDesignParamChange={handleDesignParamChange}
          setActiveModal={setActiveModal}
        />
      )}
      
      {activeModal === 'fem' && (
        <FemModal
          designParams={designParams}
          handleDesignParamChange={handleDesignParamChange}
          setActiveModal={setActiveModal}
        />
      )}

      {activeModal === 'walls' && (
        <WallsModal
          internalWalls={internalWalls}
          hoveredWallId={hoveredWallId}
          setHoveredWallId={setHoveredWallId}
          updateInternalWall={updateInternalWall}
          removeInternalWall={removeInternalWall}
          addInternalWall={addInternalWall}
          setActiveModal={setActiveModal}
        />
      )}

      {activeModal === 'columns' && (
        <ColumnsModal
          colConfig={colConfig}
          setColConfig={setColConfig}
          columns={columns}
          setColumns={setColumns}
          params={params}
          setActiveModal={setActiveModal}
        />
      )}

      {activeModal === 'openings' && (
        <OpeningsModal
          openings={openings}
          hoveredOpeningId={hoveredOpeningId}
          setHoveredOpeningId={setHoveredOpeningId}
          removeOpening={removeOpening}
          setActiveModal={setActiveModal}
        />
      )}

{/* MODAL CAPAS */}
      {activeModal === 'layers' && (
        <LayersModal
          layers={layers}
          activeLayer={activeLayer}
          LAYER_DEFS={LAYER_DEFS}
          setActiveLayer={setActiveLayer}
          setLayers={setLayers}
          setLayerImportTarget={setLayerImportTarget}
          imgInputRef={imgInputRef}
          setActiveModal={setActiveModal}
        />
      )}

{/* PANEL DERECHO: VISTA PREVIA Y RESULTADOS */}
        <div className="calc-content" style={{ flex: '1', minWidth: 0, marginLeft: '48px' }}>
          <SlabCanvas
            drawType={drawType} setDrawType={setDrawType}
            undo={undo} historyPast={historyPast}
            redo={redo} historyFuture={historyFuture}
            mouseCoord={mouseCoord}
            zoom={zoom} setZoom={setZoom} resetZoom={resetZoom}
            colConfig={colConfig} setColConfig={setColConfig}
            offsetDist={offsetDist} setOffsetDist={setOffsetDist} offsetSourceWall={offsetSourceWall} setOffsetSourceWall={setOffsetSourceWall} offsetPreview={offsetPreview} setOffsetPreview={setOffsetPreview}
            rotateAngle={rotateAngle} setRotateAngle={setRotateAngle} rotatePivotMode={rotatePivotMode} setRotatePivotMode={setRotatePivotMode} rotateSelectedIds={rotateSelectedIds} setRotateSelectedIds={setRotateSelectedIds}
            getRotatedWalls={getRotatedWalls} saveHistory={saveHistory} setInternalWalls={setInternalWalls}
            selectedElement={selectedElement} setSelectedElement={setSelectedElement}
            columns={columns} setColumns={setColumns}
            svgRef={svgRef} panOffset={panOffset} CANVAS_WIDTH={CANVAS_WIDTH} CANVAS_HEIGHT={CANVAS_HEIGHT} isDrawing={isDrawing} handleMouseMove={handleMouseMove} handlePanStart={handlePanStart} getSvgPx={getSvgPx} toMetersX={toMetersX} toMetersY={toMetersY} setSelectionBox={setSelectionBox} isDraggingRef={isDraggingRef} isPanningRef={isPanningRef} handlePanEnd={handlePanEnd} selectionBox={selectionBox} handleSvgDoubleClick={handleSvgDoubleClick} handleSvgClick={handleSvgClick} handleDrop={handleDrop} layers={layers} params={params} scale={scale} toSvg={toSvg} MARGIN={MARGIN} gridStep={gridStep} getPerimeterVertices={getPerimeterVertices} offset={offset} allWalls={allWalls} hoveredWallId={hoveredWallId} setHoveredWallId={setHoveredWallId} openings={openings} setHoveredOpeningId={setHoveredOpeningId} hoveredOpeningId={hoveredOpeningId} drawStart={drawStart} drawEnd={drawEnd} hudInputRef={hudInputRef} hudInput={hudInput} setHudInput={setHudInput} orthoLock={orthoLock} setDrawEnd={setDrawEnd} commitWall={commitWall} setIsDrawing={setIsDrawing} setDrawStart={setDrawStart} setOrthoLock={setOrthoLock} hudPos={hudPos}
          />

          {/* Renderizado de Resultados — ahora en Modal */}
        </div>
      </div>
    </div>

    {/* ===== MODAL DE RESULTADOS ===== */}
    <ResultsModal
      results={results} showResultsModal={showResultsModal} setShowResultsModal={setShowResultsModal}
      lastPayload={lastPayload} buildCurrentPayload={buildCurrentPayload} columns={columns} wallHeight={wallHeight} allWalls={allWalls} openings={openings} designParams={designParams}
      customBeamRebar={customBeamRebar} setCustomBeamRebar={setCustomBeamRebar} customWallRebars={customWallRebars} setCustomWallRebars={setCustomWallRebars}
      projectName={projectName} downloadAuditJSON={downloadAuditJSON} downloadHTML={downloadHTML}
      descargarMemoriaCalculoHtml={descargarMemoriaCalculoHtml} descargarComputosHtml={descargarComputosHtml} descargarExcel={descargarExcel} descargarPDFPresupuesto={descargarPDFPresupuesto}
      presupuesto={presupuesto} presupuestoTotal={presupuestoTotal} params={params}
    />
    {authModalOpen && (
      <AuthModal 
        source="calculadora"
        onClose={() => setAuthModalOpen(false)} 
        onLoginSuccess={(u) => { 
          setAuthModalOpen(false); 
          setCurrentUser(u);
        }} 
      />
    )}
    </>
  );
}

