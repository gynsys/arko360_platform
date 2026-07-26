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
                  <button onClick={() => setDrawType('retaining_wall')} title="Muro de Contención" style={{padding:'6px', borderRadius:'4px', border: drawType === 'retaining_wall' ? '2px solid #8d6e63' : '1px solid transparent', background: drawType === 'retaining_wall' ? '#fff' : 'transparent', color: '#8d6e63', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 22V2h4v20H4z" fill="currentColor" fillOpacity="0.3"/>
                      <path d="M8 22h8L12 12" />
                    </svg>
                  </button>
                  <button onClick={() => setDrawType('support_beam')} title="Viga de Apoyo" style={{padding:'6px', borderRadius:'4px', border: drawType === 'support_beam' ? '2px solid #4caf50' : '1px solid transparent', background: drawType === 'support_beam' ? '#fff' : 'transparent', color: '#4caf50', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="10" width="20" height="4" rx="1" fill="currentColor" fillOpacity="0.3"/>
                      <path d="M2 14v4h20v-4" />
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
              width="100%" 
              height="100%" 
              viewBox={`${-panOffset.x * zoom} ${-panOffset.y * zoom} ${CANVAS_WIDTH / zoom} ${CANVAS_HEIGHT / zoom}`}
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
                  width={params.Lx * scale}
                  height={params.Ly * scale}
                  opacity={layer.opacity}
                  preserveAspectRatio="none"
                  style={{ pointerEvents: 'none' }}
                />
              ))}

              {/* Ejes X (Ruler Top) */}
              <rect x={0} y={0} width={CANVAS_WIDTH} height={MARGIN-5} fill="#f0f0f0" />
              {Array.from({ length: Math.floor(params.Lx) + 1 }).map((_, i) => (
                <g key={`rx${i}`}>
                  <line x1={toSvg(i)} y1={MARGIN-5} x2={toSvg(i)} y2={MARGIN} stroke="#333" strokeWidth="1.5" />
                  <text x={toSvg(i)} y={MARGIN-10} fontSize="10" textAnchor="middle" fill="#555">{i}</text>
                </g>
              ))}

              {/* Ejes Y (Ruler Left) */}
              <rect x={0} y={0} width={MARGIN-5} height={CANVAS_HEIGHT} fill="#f0f0f0" />
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
              
              {/* Grid Menor (Depende de gridStep) */}
              {gridStep > 0 && Array.from({ length: Math.floor(params.Lx / gridStep) + 1 }).map((_, i) => {
                const val = i * gridStep;
                // Evitar superponer sobre la linea mayor (1m) para mantener la jerarquía visual
                if (Math.abs(val % 1) < 0.001) return null;
                return <line key={`vx_sub${i}`} x1={toSvg(val)} y1={MARGIN} x2={toSvg(val)} y2={toSvg(params.Ly)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />;
              })}
              {gridStep > 0 && Array.from({ length: Math.floor(params.Ly / gridStep) + 1 }).map((_, i) => {
                const val = i * gridStep;
                if (Math.abs(val % 1) < 0.001) return null;
                return <line key={`vy_sub${i}`} x1={MARGIN} y1={toSvg(val)} x2={toSvg(params.Lx)} y2={toSvg(val)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />;
              })}

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
                if (w.type === 'retaining_wall') strokeColor = '#8d6e63';
                if (w.type === 'support_beam') strokeColor = '#4caf50';
                
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
              label:'FS Deslizamiento', val: results.sliding?.active ? `${results.sliding.fs > 100 ? '>100' : results.sliding.fs.toFixed(2)}` : 'N/A', ok: results.sliding?.active ? results.sliding.ok : true
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
              
              {results.svg_details && (
                <div style={{marginTop: '20px'}}>
                  <h4 style={{margin:'0 0 12px 0', color:'#333'}}>Detalles Constructivos Transversales</h4>
                  <div style={{background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'12px', overflow:'auto'}}
                       dangerouslySetInnerHTML={{__html: getLiveSvgDetails(results.svg_details, customBeamRebar, customWallRebars)}} />
                </div>
              )}
              
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

          {/* Tabla de Diseño de Muros de Contención */}
          {results.retaining_wall_designs && results.retaining_wall_designs.length > 0 && (
            <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#fff8e1'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                <h4 style={{margin:0, color:'#f57f17'}}>🧱 Diseño de Pantalla de Muros de Contención</h4>
                <span style={{fontSize:'12px', background:'#fff3e0', color:'#e65100', padding:'4px 10px', borderRadius:'6px', border:'1px solid #ffe082', fontWeight:'600'}}>
                  💡 Puedes cambiar el diámetro/separación de acero si no lo consigues en el mercado. El sistema verifica el cumplimiento en tiempo real.
                </span>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center', background: '#fff', border: '1px solid #ffca28'}}>
                  <thead>
                    <tr style={{background: '#ffe082', borderBottom: '1px solid #ffca28'}}>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>ID Muro</th>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>H Tierra (m)</th>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Espesor (m)</th>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Mu (kgf·m/m)</th>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Vu (kgf/m)</th>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>φVc (kgf/m)</th>
                      <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Corte</th>
                      <th colSpan="2" style={{padding: '8px', borderRight: '2px solid #ffb300', background: '#ffecb3', fontWeight: 'bold', fontSize: '14px'}}>Armadura Tracción (Cara Int)</th>
                      <th colSpan="2" style={{padding: '8px', background: '#fff3e0', fontWeight: 'bold', fontSize: '14px'}}>Armadura Compresión (Cara Ext)</th>
                    </tr>
                    <tr style={{background: '#fff8e1', borderBottom: '2px solid #ffca28'}}>
                      <th style={{padding: '6px', borderRight: '1px solid #ffd54f'}}>Ver.</th>
                      <th style={{padding: '6px', borderRight: '2px solid #ffb300'}}>Hoz.</th>
                      <th style={{padding: '6px', borderRight: '1px solid #ffd54f'}}>Ver.</th>
                      <th style={{padding: '6px'}}>Hoz.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.retaining_wall_designs.map((wd, idx) => {
                      const asTracReq = wd.As_req_cm2_m || 2.25;
                      const asCompReq = wd.As_comp_cm2_m || 1.50;
                      const asHorizReq = wd.As_horiz_cm2_m || 1.50;
                      const asHorizCompReq = wd.As_horiz_comp_cm2_m || 1.50;

                      const defaultTracVert = wd.rebar_trac_vert || (wd.proposed_rebar ? wd.proposed_rebar.split('|')[0]?.replace(/.*:/, '').trim() : 'Ø10@29cm');
                      const defaultTracHoriz = wd.rebar_trac_horiz || (wd.proposed_rebar_horiz ? wd.proposed_rebar_horiz.split('|')[0]?.replace(/.*:/, '').trim() : 'Ø10@26cm');
                      const defaultCompVert = wd.rebar_comp_vert || (wd.proposed_rebar ? wd.proposed_rebar.split('|')[1]?.replace(/.*:/, '').trim() : 'Ø10@30cm');
                      const defaultCompHoriz = wd.rebar_comp_horiz || (wd.proposed_rebar_horiz ? wd.proposed_rebar_horiz.split('|')[1]?.replace(/.*:/, '').trim() : 'Ø10@26cm');

                      const optsTracVert = wd.rebar_trac_vert_options || [defaultTracVert, 'Ø7@14cm', 'Ø8@18cm', 'Ø10@25cm', 'Ø10@30cm', 'Ø12@30cm'];
                      const optsTracHoriz = wd.rebar_trac_horiz_options || [defaultTracHoriz, 'Ø7@17cm', 'Ø8@22cm', 'Ø10@25cm', 'Ø10@30cm', 'Ø12@30cm'];
                      const optsCompVert = wd.rebar_comp_vert_options || [defaultCompVert, 'Ø7@25cm', 'Ø8@30cm', 'Ø10@30cm', 'Ø12@30cm'];
                      const optsCompHoriz = wd.rebar_comp_horiz_options || [defaultCompHoriz, 'Ø7@25cm', 'Ø8@30cm', 'Ø10@30cm', 'Ø12@30cm'];

                      return (
                        <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '8px', fontWeight: 'bold', borderRight: '1px solid #eee'}}>{wd.id.substring(0, 8)}</td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.H_m.toFixed(2)}</td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.thickness_m.toFixed(2)}</td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.Mu_kgfm_m.toFixed(0)}</td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.Vu_kgf_m.toFixed(0)}</td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.phiVc_kgf_m.toFixed(0)}</td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee', color: wd.shear_ok ? '#2e7d32' : '#c62828', fontWeight: 'bold'}}>
                            {wd.shear_ok ? 'OK' : 'FALLA'}
                          </td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>
                            <InteractiveRebarSelect options={optsTracVert} defaultVal={defaultTracVert} asReq={asTracReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, tracVert: v}))} />
                          </td>
                          <td style={{padding: '8px', borderRight: '2px solid #ffb300'}}>
                            <InteractiveRebarSelect options={optsTracHoriz} defaultVal={defaultTracHoriz} asReq={asHorizReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, tracHoriz: v}))} />
                          </td>
                          <td style={{padding: '8px', borderRight: '1px solid #eee'}}>
                            <InteractiveRebarSelect options={optsCompVert} defaultVal={defaultCompVert} asReq={asCompReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, compVert: v}))} />
                          </td>
                          <td style={{padding: '8px'}}>
                            <InteractiveRebarSelect options={optsCompHoriz} defaultVal={defaultCompHoriz} asReq={asHorizCompReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, compHoriz: v}))} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Diseño de Vigas de Apoyo */}
          {results.support_beam_designs && results.support_beam_designs.length > 0 && (
            <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#e8eaf6'}}>
              <h4 style={{margin:'0 0 12px 0', color:'#3f51b5'}}>📏 Diseño de Vigas de Apoyo</h4>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', background: '#fff'}}>
                  <thead>
                    <tr style={{background: '#c5cae9', borderBottom: '2px solid #9fa8da'}}>
                      <th style={{padding: '8px'}}>ID Viga</th>
                      <th style={{padding: '8px'}}>Dimensiones (cm)</th>
                      <th style={{padding: '8px'}}>Mu (kgf·m)</th>
                      <th style={{padding: '8px'}}>Vu (kgf)</th>
                      <th style={{padding: '8px'}}>Acero Requerido</th>
                      <th style={{padding: '8px'}}>Armadura Principal</th>
                      <th style={{padding: '8px'}}>Estribos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.support_beam_designs.map((sb, idx) => {
                      const asBeamReq = sb.As_req_cm2 || 2.25;
                      const defaultBeamRebar = sb.proposed_rebar || "2Ø12 Inf + 2Ø10 Sup";
                      const beamOptions = sb.proposed_rebar_options || [defaultBeamRebar, '3 - Ø16', '2 - Ø16', '2Ø12 + 1Ø10 Inf + 2Ø10 Sup'];
                      return (
                        <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '8px', fontWeight: 'bold'}}>{sb.id.substring(0, 10)}</td>
                          <td style={{padding: '8px'}}>{Math.round(sb.b_m * 100)} x {Math.round(sb.h_m * 100)}</td>
                          <td style={{padding: '8px'}}>{sb.Mu_kgfm.toFixed(0)}</td>
                          <td style={{padding: '8px'}}>{sb.Vu_kgf.toFixed(0)}</td>
                          <td style={{padding: '8px'}}>{sb.As_req_cm2.toFixed(2)} cm²</td>
                          <td style={{padding: '8px', color: '#1565c0', fontWeight: 'bold'}}>
                            <InteractiveBeamRebarSelect options={beamOptions} defaultVal={defaultBeamRebar} asReq={asBeamReq} onChange={(v) => setCustomBeamRebar(v)} />
                          </td>
                          <td style={{padding: '8px', color: '#2e7d32', fontWeight: 'bold'}}>
                            {sb.proposed_stirrups_options && sb.proposed_stirrups_options.length > 1 ? (
                              <select style={{background:'transparent', border:'1px solid #ddd', borderRadius:'4px', color:'inherit', fontWeight:'inherit', outline:'none', cursor:'pointer', padding:'2px'}} defaultValue={sb.proposed_stirrups}>
                                {sb.proposed_stirrups_options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              </select>
                            ) : sb.proposed_stirrups}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                      {designParams.custom_mesh_cm2_m === 1.41 && 'Ø6@20cm'}
                      {designParams.custom_mesh_cm2_m === 1.88 && 'Malla Sima (Ø6@15cm)'}
                      {designParams.custom_mesh_cm2_m === 1.92 && 'Ø7@20cm'}
                      {designParams.custom_mesh_cm2_m === 2.51 && 'Ø8@20cm'}
                      {designParams.custom_mesh_cm2_m === 3.93 && 'Ø10@20cm'}
                      {designParams.custom_mesh_cm2_m === 5.24 && 'Ø10@15cm'}
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
                    
                    if (px !== 'Malla General' && py !== 'Malla General' && px === py) {
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
                          <td colSpan="2" style={{color:'#2e7d32', fontWeight:'bold', textAlign: 'center'}}>{px} (ambos sentidos)</td>
                          <td><span style={{color:'#2e7d32', fontWeight:'700'}}>✓</span></td>
                        </tr>
                      );
                    }

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

