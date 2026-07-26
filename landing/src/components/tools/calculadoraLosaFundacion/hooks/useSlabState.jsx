import { useState, useRef, useEffect } from 'react';
import { FALLBACK_PRECIOS, API_BASE } from '../constants/slabConstants';

export function useSlabState() {
  const svgRef = useRef(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const isDraggingRef = useRef(false);
  const stateRef = useRef(null);
  const hudInputRef = useRef(null);
  const imgInputRef = useRef(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

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
    fc: 250,
    fy: 4200,
    q_adm: 1.5,
    band_width_m: 0,
    is_plastered: false,
    custom_mesh_cm2_m: 0,
    cover: 5
  });
  
  // Guardado y Carga de Base de Datos
  const [projectName, setProjectName] = useState("Losa Híbrida");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [savedRuns, setSavedRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState(null);
  
  // Muros e Elementos
  const [internalWalls, setInternalWalls] = useState([]);
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

  // Aberturas
  const [openings, setOpenings] = useState([]);
  const [globalPrices, setGlobalPrices] = useState(FALLBACK_PRECIOS);
  const [activeModal, setActiveModal] = useState(null);

  // Capas
  const LAYER_DEFS = [
    { id: 'arq', name: 'Arquitectura', color: '#9c27b0', defaultLocked: false },
    { id: 'est', name: 'Estructura',   color: '#e53935', defaultLocked: false },
  ];
  const [layers, setLayers] = useState([
    { id: 'arq', name: 'Arquitectura', visible: true, locked: false, opacity: 0.35, image: null },
    { id: 'est', name: 'Estructura',   visible: true, locked: false, opacity: 1.0,  image: null },
  ]);
  const [activeLayer, setActiveLayer] = useState('est');
  const [layerImportTarget, setLayerImportTarget] = useState(null);

  // Hover & Selección
  const [hoveredWallId, setHoveredWallId] = useState(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);

  // Rebar selections
  const [customBeamRebar, setCustomBeamRebar] = useState(null);
  const [customWallRebars, setCustomWallRebars] = useState({ tracVert: null, tracHoriz: null, compVert: null, compHoriz: null });

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';

    const mainEl = document.querySelector('main.container');
    let origPaddingTop = '', origPaddingBottom = '', origMinHeight = '';
    if (mainEl) {
      origPaddingTop = mainEl.style.paddingTop;
      origPaddingBottom = mainEl.style.paddingBottom;
      origMinHeight = mainEl.style.minHeight;

      mainEl.style.paddingTop = '70px';
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

  return {
    svgRef, isPanningRef, panStartRef, isDraggingRef, stateRef, hudInputRef, imgInputRef,
    zoom, setZoom, panOffset, setPanOffset,
    authModalOpen, setAuthModalOpen, currentUser, setCurrentUser,
    shape, setShape, params, setParams, offset, setOffset, slabOffset, setSlabOffset, material, setMaterial, wallHeight, setWallHeight,
    designParams, setDesignParams,
    projectName, setProjectName, showOpenModal, setShowOpenModal, showSaveAsModal, setShowSaveAsModal, saveAsName, setSaveAsName,
    savedRuns, setSavedRuns, loadingRuns, setLoadingRuns, deletingRunId, setDeletingRunId,
    internalWalls, setInternalWalls, columns, setColumns, colConfig, setColConfig, gridStep, setGridStep,
    results, setResults, lastPayload, setLastPayload, loading, setLoading, saving, setSaving, error, setError,
    showResultsModal, setShowResultsModal, currentRunId, setCurrentRunId,
    openings, setOpenings, globalPrices, setGlobalPrices, activeModal, setActiveModal,
    LAYER_DEFS, layers, setLayers, activeLayer, setActiveLayer, layerImportTarget, setLayerImportTarget,
    hoveredWallId, setHoveredWallId, hoveredOpeningId, setHoveredOpeningId, selectedElement, setSelectedElement, selectionBox, setSelectionBox,
    customBeamRebar, setCustomBeamRebar, customWallRebars, setCustomWallRebars
  };
}
