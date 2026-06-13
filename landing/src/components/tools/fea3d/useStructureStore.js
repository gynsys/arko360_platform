import { create } from 'zustand';

// Helper para limpiar nudos huérfanos (que no pertenecen a ningún elemento ni losa)
const cleanupOrphans = (nodes, elements, shells) => {
  const connectedNodeIds = new Set();
  elements.forEach(e => e.nodes.forEach(nid => connectedNodeIds.add(nid)));
  shells.forEach(s => s.nodes.forEach(nid => connectedNodeIds.add(nid)));
  return nodes.filter(n => connectedNodeIds.has(n.id));
};

export const useStructureStore = create((set, get) => ({
  // --- ESTADO ---
  nodes: [],
  elements: [],
  shells: [], // Losas
  loads: [],
  sections: [],
  materials: [],
  loadCombinations: [
    { id: 'combo-1', name: '1.4 CM (ACI)', factors: { CM: 1.4, CV: 0.0 } },
    { id: 'combo-2', name: '1.2 CM + 1.6 CV (ACI)', factors: { CM: 1.2, CV: 1.6 } }
  ],
  metadata: { name: 'Proyecto ARKO3D', author: '', units: 'm, kgf, C' },
  results: null,
  viewMode: 'geometry', // 'geometry' | 'results'
  cameraView: '3D', // '3D', 'XY', 'XZ', 'YZ'
  activeLevel: 0, // El valor Z, Y, o X actual según la vista
  showLoads: true, // Toggle para visibilidad de cargas
  activeResultCombo: null, // ID de la combinación activa en resultados
  activeResultType: 'deformed', // 'deformed', 'P', 'V2', 'V3', 'M2', 'M3'
  displacementScale: 100, // Factor de exageración
  diagramScale: 1.0, // Multiplicador para diagramas de esfuerzos
  selectedIds: [],
  rightClickedElementId: null, // ID para modal de diagrama de elemento
  wizardConfig: null,
  isSaved: true,
  currentUser: null, // Guardará { id, email, name }
  projectLoadedTrigger: 0, // Increments when a new project is loaded to trigger camera reset

  // Estado para dibujo de losas
  isDrawingShell: false,
  isQuickDrawingShell: false,
  drawingNodes: [], // IDs de los nudos seleccionados para la losa actual

  // Estado para selección por ventana
  selectionBox: {
    isSelecting: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    mode: 'window' // 'window' (Left->Right) or 'crossing' (Right->Left)
  },

  // --- ACCIONES GENERALES ---
  toggleSelection: (id, multi = false) => set(state => {
    if (multi) {
      if (state.selectedIds.includes(id)) return { selectedIds: state.selectedIds.filter(x => x !== id) };
      return { selectedIds: [...state.selectedIds, id] };
    }
    return { selectedIds: state.selectedIds.includes(id) && state.selectedIds.length === 1 ? [] : [id] };
  }),
  clearSelection: () => set({ selectedIds: [] }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setRightClickedElementId: (id) => set({ rightClickedElementId: id }),
  setMetadata: (data) => set(state => ({ metadata: { ...state.metadata, ...data } })),
  
  convertUnits: (newUnitsStr) => set(state => {
    const oldUnitsStr = state.metadata?.units || 'm, kgf, C';
    if (oldUnitsStr === newUnitsStr) return {};

    const getSystem = (str) => {
      if (str.includes('kgf')) return 'mks';
      if (str.includes('kN')) return 'si';
      if (str.includes('kip')) return 'us';
      return 'mks';
    };

    const oldSys = getSystem(oldUnitsStr);
    const newSys = getSystem(newUnitsStr);

    let lFactor = 1.0;
    let fFactor = 1.0;

    // Length conversion
    let oldLengthToMeters = 1.0;
    if (oldSys === 'us') oldLengthToMeters = 0.3048;

    let targetMetersToLength = 1.0;
    if (newSys === 'us') targetMetersToLength = 1 / 0.3048;

    lFactor = oldLengthToMeters * targetMetersToLength;

    // Force conversion
    let oldForceToKgf = 1.0;
    if (oldSys === 'si') oldForceToKgf = 101.97162;
    if (oldSys === 'us') oldForceToKgf = 453.59237;

    let targetKgfToForce = 1.0;
    if (newSys === 'si') targetKgfToForce = 1 / 101.97162;
    if (newSys === 'us') targetKgfToForce = 1 / 453.59237;

    fFactor = oldForceToKgf * targetKgfToForce;

    const round = (val) => Math.round(val * 1e6) / 1e6;

    const newNodes = state.nodes.map(n => ({
      ...n,
      x: round(n.x * lFactor),
      y: round(n.y * lFactor),
      z: round(n.z * lFactor)
    }));

    const newLoads = state.loads.map(l => ({
      ...l,
      fx: round(l.fx * fFactor),
      fy: round(l.fy * fFactor),
      fz: round(l.fz * fFactor),
      mx: round(l.mx * fFactor * lFactor),
      my: round(l.my * fFactor * lFactor),
      mz: round(l.mz * fFactor * lFactor),
    }));

    const newMaterials = state.materials.map(m => ({
      ...m,
      E: round(m.E * fFactor / (lFactor * lFactor)),
      G: round(m.G * fFactor / (lFactor * lFactor)),
      density: round(m.density * fFactor / (lFactor * lFactor * lFactor))
    }));

    const newSections = state.sections.map(s => ({
      ...s,
      A: round(s.A * lFactor * lFactor),
      Iy: round(s.Iy * Math.pow(lFactor, 4)),
      Ix: round(s.Ix * Math.pow(lFactor, 4)),
      J: round(s.J * Math.pow(lFactor, 4))
    }));

    const newShells = state.shells.map(s => ({
      ...s,
      thickness: round(s.thickness * lFactor),
      loads: {
        ...s.loads,
        CM: round(s.loads.CM * fFactor / (lFactor * lFactor)),
        CV: round(s.loads.CV * fFactor / (lFactor * lFactor)),
      }
    }));

    let newResults = state.results;
    if (newResults && newResults.results) {
      newResults = JSON.parse(JSON.stringify(state.results)); // Deep copy
      Object.keys(newResults.results).forEach(comboId => {
        const r = newResults.results[comboId];
        
        // Displacements
        if (r.displacements) {
          Object.keys(r.displacements).forEach(nid => {
            r.displacements[nid][0] *= lFactor;
            r.displacements[nid][1] *= lFactor;
            r.displacements[nid][2] *= lFactor;
            // r4, r5, r6 are radians, unchanged
          });
        }
        
        // Element Forces
        if (r.element_forces) {
          Object.keys(r.element_forces).forEach(eid => {
            r.element_forces[eid] = r.element_forces[eid].map(st => ({
              ...st,
              x: st.x * lFactor,
              P: st.P * fFactor,
              V2: st.V2 * fFactor,
              V3: st.V3 * fFactor,
              T: st.T * fFactor * lFactor,
              M2: st.M2 * fFactor * lFactor,
              M3: st.M3 * fFactor * lFactor
            }));
          });
        }
      });
    }

    return {
      nodes: newNodes,
      loads: newLoads,
      materials: newMaterials,
      sections: newSections,
      shells: newShells,
      metadata: { ...state.metadata, units: newUnitsStr },
      results: newResults,
      isSaved: false
    };
  }),
  setCurrentUser: (user) => set({ currentUser: user }),
  toggleShowLoads: () => set(state => ({ showLoads: !state.showLoads })),

  setSelectionBox: (data) => set(state => ({ selectionBox: { ...state.selectionBox, ...data } })),
  
  // --- NAVEGACIÓN 2D/3D ---
  setCameraView: (view) => set(state => {
    if (view === '3D') return { 
      cameraView: view,
      isQuickDrawingShell: false,
      isDrawingShell: false,
      drawingNodes: []
    };
    
    // Al cambiar a un plano 2D, encontrar el nivel más cercano al 0 o el menor posible
    let levels = [];
    if (view === 'XY') levels = [...new Set(state.nodes.map(n => n.z))].sort((a,b)=>a-b);
    else if (view === 'XZ') levels = [...new Set(state.nodes.map(n => n.y))].sort((a,b)=>a-b);
    else if (view === 'YZ') levels = [...new Set(state.nodes.map(n => n.x))].sort((a,b)=>a-b);
    
    const defaultLevel = levels.length > 0 ? levels[0] : 0;
    return { 
      cameraView: view, 
      activeLevel: defaultLevel,
      isQuickDrawingShell: false,
      isDrawingShell: false,
      drawingNodes: []
    };
  }),

  levelUp: () => set(state => {
    if (state.cameraView === '3D') return {};
    let levels = [];
    if (state.cameraView === 'XY') levels = [...new Set(state.nodes.map(n => n.z))].sort((a,b)=>a-b);
    else if (state.cameraView === 'XZ') levels = [...new Set(state.nodes.map(n => n.y))].sort((a,b)=>a-b);
    else if (state.cameraView === 'YZ') levels = [...new Set(state.nodes.map(n => n.x))].sort((a,b)=>a-b);
    
    const currIdx = levels.findIndex(l => Math.abs(l - state.activeLevel) < 0.001);
    if (currIdx >= 0 && currIdx < levels.length - 1) {
      return { activeLevel: levels[currIdx + 1] };
    }
    return {};
  }),

  levelDown: () => set(state => {
    if (state.cameraView === '3D') return {};
    let levels = [];
    if (state.cameraView === 'XY') levels = [...new Set(state.nodes.map(n => n.z))].sort((a,b)=>a-b);
    else if (state.cameraView === 'XZ') levels = [...new Set(state.nodes.map(n => n.y))].sort((a,b)=>a-b);
    else if (state.cameraView === 'YZ') levels = [...new Set(state.nodes.map(n => n.x))].sort((a,b)=>a-b);
    
    const currIdx = levels.findIndex(l => Math.abs(l - state.activeLevel) < 0.001);
    if (currIdx > 0) {
      return { activeLevel: levels[currIdx - 1] };
    }
    return {};
  }),
  
  setResultsMode: (resultsData) => set((state) => {
    // 1. Encontrar la combinación por defecto (la primera)
    const defaultComboId = resultsData.combinations && resultsData.combinations.length > 0 
      ? resultsData.combinations[0].id 
      : null;
      
    // 2. Calcular factor de escala automático (estilo ETABS: deformación max = 5% del tamaño de la estructura)
    let autoScale = 100;
    if (defaultComboId && resultsData.results[defaultComboId]) {
      const displacements = resultsData.results[defaultComboId].displacements;
      let maxDisp = 0;
      for (const nodeId in displacements) {
        const d = displacements[nodeId];
        const dispMag = Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2]);
        if (dispMag > maxDisp) maxDisp = dispMag;
      }
      
      if (maxDisp > 1e-8 && state.nodes.length > 1) {
        let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        state.nodes.forEach(n => {
          if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
          if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
          if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
        });
        const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;
        // Queremos que el maxDisp se dibuje como el 5% de maxDim
        const targetVisDisp = maxDim * 0.05;
        autoScale = Math.round(targetVisDisp / maxDisp);
      }
    }
    
    // Limitar la escala a rangos razonables para el slider
    autoScale = Math.max(1, Math.min(autoScale, 10000));

    return {
      results: resultsData,
      viewMode: 'results',
      cameraView: state.cameraView === '3D' ? 'XZ' : state.cameraView,
      displacementScale: autoScale,
      activeResultCombo: defaultComboId,
      selectedIds: [],
      isDrawingShell: false
    };
  }),
  exitResultsMode: () => set({ viewMode: 'geometry', results: null }),
  setDisplacementScale: (scale) => set({ displacementScale: scale }),
  setDiagramScale: (scale) => set({ diagramScale: scale }),
  setActiveResultCombo: (comboId) => set({ activeResultCombo: comboId }),
  setActiveResultType: (type) => set({ activeResultType: type }),

  // --- MODO DIBUJO ---
  toggleDrawingShell: () => set(state => ({ 
    isDrawingShell: !state.isDrawingShell,
    isQuickDrawingShell: false,
    drawingNodes: [],
    selectedIds: [] 
  })),
  toggleQuickDrawingShell: () => set(state => ({
    isQuickDrawingShell: !state.isQuickDrawingShell,
    isDrawingShell: false,
    drawingNodes: [],
    selectedIds: []
  })),

  addNodeToDrawing: (nodeId) => {
    const { drawingNodes, nodes, addShell, toggleDrawingShell } = get();
    if (drawingNodes.includes(nodeId)) return;
    
    const newDrawingNodes = [...drawingNodes, nodeId];
    
    if (newDrawingNodes.length === 4) {
      // Al completar 4 nudos, generamos la losa
      addShell({
        nodes: newDrawingNodes,
        thickness: 0.20,
        material_id: '4000Psi',
        loads: { CM: 2.0, CV: 1.8 } // Valores por defecto
      });
      toggleDrawingShell();
    } else {
      set({ drawingNodes: newDrawingNodes });
    }
  },

  // --- CRUD NODOS ---
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...data } : n),
    isSaved: false
  })),
  deleteNode: (id) => set((state) => {
    const newNodes = state.nodes.filter(n => n.id !== id);
    const newElements = state.elements.filter(e => !e.nodes.includes(id));
    const newShells = state.shells.filter(s => !s.nodes.includes(id));
    return {
      nodes: cleanupOrphans(newNodes, newElements, newShells),
      elements: newElements,
      shells: newShells,
      selectedIds: state.selectedIds.filter(sid => sid !== id),
      isSaved: false
    };
  }),

  // --- CRUD ELEMENTOS ---
  updateElement: (id, data) => set((state) => ({
    elements: state.elements.map(e => e.id === id ? { ...e, ...data } : e),
    isSaved: false
  })),
  deleteElement: (id) => set((state) => {
    const newElements = state.elements.filter(e => e.id !== id);
    return {
      elements: newElements,
      nodes: cleanupOrphans(state.nodes, newElements, state.shells),
      selectedIds: state.selectedIds.filter(sid => sid !== id),
      isSaved: false
    };
  }),

  // --- CRUD SHELLS (LOSAS) ---
  addShell: (shell) => set((state) => ({
    shells: [...state.shells, { ...shell, id: `S-${Date.now()}`, type: 'shell' }],
    isSaved: false
  })),
  updateShell: (id, data) => set((state) => ({
    shells: state.shells.map(s => s.id === id ? { ...s, ...data } : s),
    isSaved: false
  })),
  deleteShell: (id) => set((state) => {
    const newShells = state.shells.filter(s => s.id !== id);
    return {
      shells: newShells,
      nodes: cleanupOrphans(state.nodes, state.elements, newShells),
      selectedIds: state.selectedIds.filter(sid => sid !== id),
      isSaved: false
    };
  }),

  // --- CRUD MATERIALES ---
  addMaterial: (material) => set((state) => ({
    materials: [...state.materials, { ...material }],
    isSaved: false
  })),
  updateMaterial: (id, data) => set((state) => ({
    materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m),
    isSaved: false
  })),
  deleteMaterial: (id) => set((state) => ({
    materials: state.materials.filter(m => m.id !== id),
    isSaved: false
  })),

  // --- CRUD SECCIONES ---
  addSection: (section) => set((state) => ({
    sections: [...state.sections, { ...section }],
    isSaved: false
  })),
  updateSection: (id, data) => set((state) => ({
    sections: state.sections.map(s => s.id === id ? { ...s, ...data } : s),
    isSaved: false
  })),
  deleteSection: (id) => set((state) => ({
    sections: state.sections.filter(s => s.id !== id),
    isSaved: false
  })),

  // --- CARGAS Y OTROS ---
  addLoad: (load) => set((state) => ({
    loads: [...state.loads, { ...load, id: `L-${Date.now()}` }],
    isSaved: false
  })),
  updateLoad: (id, updates) => set(state => ({
    loads: state.loads.map(l => l.id === id ? { ...l, ...updates } : l),
    isSaved: false
  })),
  deleteLoad: (id) => set(state => ({
    loads: state.loads.filter(l => l.id !== id),
    isSaved: false
  })),

  manageNodeLoads: (nodeIds, loadData, action) => set(state => {
    let newLoads = [...state.loads];
    
    // Si la acción es reemplazar o borrar, removemos las cargas puntuales existentes en esos nodos
    if (action === 'replace' || action === 'delete') {
      newLoads = newLoads.filter(l => !(l.type === 'point' && nodeIds.includes(l.target_id)));
    }
    
    // Si la acción es agregar o reemplazar, añadimos las nuevas cargas
    if (action === 'add' || action === 'replace') {
      nodeIds.forEach(nid => {
        newLoads.push({
          id: `L-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'point',
          target_id: nid,
          fx: loadData.fx || 0,
          fy: loadData.fy || 0,
          fz: loadData.fz || 0,
          mx: loadData.mx || 0,
          my: loadData.my || 0,
          mz: loadData.mz || 0
        });
      });
    }
    
    return { loads: newLoads, isSaved: false };
  }),

  manageFrameLoads: (elementIds, loadData, action, type) => set(state => {
    let newLoads = [...state.loads];
    
    // Si la acción es reemplazar o borrar, removemos las cargas de ese tipo en esos elementos
    if (action === 'replace' || action === 'delete') {
      newLoads = newLoads.filter(l => !(l.type === type && elementIds.includes(l.target_id)));
    }
    
    // Si la acción es agregar o reemplazar, añadimos las nuevas cargas
    if (action === 'add' || action === 'replace') {
      elementIds.forEach(eid => {
        newLoads.push({
          id: `L-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: type, // 'distributed' o 'point_frame'
          target_id: eid,
          fx: loadData.fx || 0,
          fy: loadData.fy || 0,
          fz: loadData.fz || 0,
          mx: loadData.mx || 0,
          my: loadData.my || 0,
          mz: loadData.mz || 0,
          offset: loadData.offset || 0.5
        });
      });
    }
    
    return { loads: newLoads, isSaved: false };
  }),
  
  // --- COMBINACIONES DE CARGA ---
  addLoadCombination: (combo) => set(state => ({ 
    loadCombinations: [...state.loadCombinations, { ...combo, id: `C-${Date.now()}` }],
    isSaved: false
  })),
  updateLoadCombination: (id, data) => set(state => ({
    loadCombinations: state.loadCombinations.map(c => c.id === id ? { ...c, ...data } : c),
    isSaved: false
  })),
  deleteLoadCombination: (id) => set(state => ({
    loadCombinations: state.loadCombinations.filter(c => c.id !== id),
    isSaved: false
  })),
  
  // --- PERSISTENCIA LOCAL ---
  exportProject: () => {
    const { nodes, elements, shells, materials, sections, wizardConfig, metadata, loadCombinations } = get();
    const projectData = {
      version: "1.0",
      metadata,
      nodes,
      elements,
      shells,
      materials,
      sections,
      loadCombinations,
      wizardConfig
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metadata.name.replace(/\s+/g, '_')}.arko3d`;
    link.click();
    set({ isSaved: true });
  },

  importProject: (jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      set({
        nodes: data.nodes || [],
        elements: data.elements || [],
        shells: data.shells || [],
        materials: data.materials || [],
        sections: data.sections || [],
        loadCombinations: data.loadCombinations || [
          { id: 'combo-1', name: '1.4 CM (ACI)', factors: { CM: 1.4, CV: 0.0 } },
          { id: 'combo-2', name: '1.2 CM + 1.6 CV (ACI)', factors: { CM: 1.2, CV: 1.6 } }
        ],
        wizardConfig: data.wizardConfig || null,
        metadata: data.metadata || { name: 'Importado', author: '' },
        results: null,
        selectedIds: [],
        isSaved: true
      });
    } catch (e) {
      console.error("Error cargando archivo .arko3d", e);
    }
  },

  // --- GENERACIÓN WIZARD ---
  generateStructure: (config) => {
    // ... (Mantenemos la lógica de nudos y elementos de la sesión anterior)
    // Pero reseteamos los shells al regenerar la geometría base
    const { numFloors, numBaysX, numBaysY, floorHeight, bayWidthX, bayWidthY, systemMaterial, colSectionId, beamSectionId, type } = config;
    const newNodes = [];
    const newElements = [];
    let nodeCount = 1;
    let elemCount = 1;

    if (type === 'beam') {
      // Viga continua: a lo largo del eje X, z=0, y=0.
      for (let x = 0; x <= numBaysX; x++) {
        newNodes.push({
          id: `N${nodeCount++}`,
          x: x * bayWidthX, y: 0, z: 0,
          // Apoyo Fijo (Pinned) en el primer nodo, Patín (Roller) en los demás
          restraint: x === 0 ? { ux: true, uy: true, uz: true, rx: true, ry: false, rz: false } : { ux: false, uy: true, uz: true, rx: true, ry: false, rz: false }
        });
      }
    } else {
      // Edificio 3D o Pórtico
      for (let z = 0; z <= numFloors; z++) {
        for (let x = 0; x <= numBaysX; x++) {
          for (let y = 0; y <= numBaysY; y++) {
            newNodes.push({
              id: `N${nodeCount++}`,
              x: x * bayWidthX, y: y * bayWidthY, z: z * floorHeight,
              restraint: z === 0 ? { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } : null
            });
          }
        }
      }
    }

    // Concrete 4000 Psi = f'c 28 MPa
    // All properties in active unit system (isUS=ft,kip  |  isSI=m,kN  |  default=m,kgf)
    const isUS = config.units?.includes('ft');
    const isSI = config.units?.includes('kN');

    const matConcrete = isUS ? { 
      id: '4000Psi', name: '4000Psi', type: 'Concrete', color: '#ff00ff',
      density: 0.000145,   // kip/ft³ (unit weight ~150 pcf)
      weightVol: 0.150,    // kip/ft³
      E: 3604.996,         // kip/ft²  (E = 57000*sqrt(4000) psi = 3604996 psf)
      U: 0.2, A: 0.0000099, 
      G: 1501.831,         // kip/ft²
      fc: 0.576            // kip/in² → 83 kip/ft²
    } : isSI ? {
      id: '4000Psi', name: '4000Psi', type: 'Concrete', color: '#ff00ff',
      density: 23.544,     // kN/m³
      weightVol: 23.544,   // kN/m³
      E: 24855.578,        // MPa → kN/m² = 24855578
      U: 0.2, A: 0.0000099, 
      G: 10356.491,        // kN/m² * 1000
      fc: 28000            // kPa
    } : {
      id: '4000Psi', name: '4000Psi', type: 'Concrete', color: '#ff00ff',
      density: 2400,       // kgf/m³
      weightVol: 2400,     // kgf/m³
      E: 2535600000,       // kgf/m²  (E≈25356 MPa → *101.97 kgf/cm² per MPa * 10000 cm²/m²)
      U: 0.2, A: 0.0000099, 
      G: 1056500000,       // kgf/m²
      fc: 285504000        // kgf/m² (28 MPa)
    };
    
    // Steel A992 Fy=50ksi
    const matSteel = isUS ? {
      id: 'A992Fy50', name: 'A992Fy50', type: 'Steel', color: '#00ffff',
      density: 0.000490,   // kip/ft³
      weightVol: 0.490,    // kip/ft³
      E: 27888.011,        // kip/ft² (29000 ksi = 29000*144 ksf)
      U: 0.3, A: 0.0000117, 
      G: 10726.158,        // kip/ft²
      Fy: 7.200, Fu: 9.360 // kip/ft²
    } : isSI ? {
      id: 'A992Fy50', name: 'A992Fy50', type: 'Steel', color: '#00ffff',
      density: 76.981,     // kN/m³
      weightVol: 76.981,   // kN/m³
      E: 200000000,        // kN/m² = 200 GPa
      U: 0.3, A: 0.0000117,
      G: 76923077,         // kN/m²
      Fy: 345000, Fu: 450000 // kN/m²
    } : {
      id: 'A992Fy50', name: 'A992Fy50', type: 'Steel', color: '#00ffff',
      density: 7850,       // kgf/m³
      weightVol: 7850,     // kgf/m³
      E: 20389324,        // kgf/m² per kg/cm²*10000/98.0665 = 2e9 Pa → ~20,389,000 kgf/m²
      U: 0.3, A: 0.0000117,
      G: 7842047,          // kgf/m²
      Fy: 35182, Fu: 45872 // kgf/m² (345 MPa → 351.8 kgf/cm² * 10000)
    };

    // Determine default base materials depending on selected system
    const defaultMaterials = get().materials.length > 0 ? get().materials : [matConcrete, matSteel];
    const baseMatId = systemMaterial === 'Steel' ? 'A992Fy50' : '4000Psi';

    const defaultSections = get().sections.length > 0 ? get().sections : [
      { id: 'COL_DEF', name: 'COL_40x40', type: 'Rectangular', material_id: '4000Psi', A: 0.16, Ix: 0.002133, Iy: 0.002133, J: 0.004266, params: { b: 0.4, h: 0.4 } },
      { id: 'BEAM_DEF', name: 'VIGA_30x40', type: 'Rectangular', material_id: '4000Psi', A: 0.12, Ix: 0.0016, Iy: 0.0009, J: 0.0025, params: { b: 0.3, h: 0.4 } },
      { id: 'W14X90', name: 'W14X90', type: 'I/Wide Flange', material_id: 'A992Fy50', A: 0.0171, Ix: 0.000416, Iy: 0.00015, J: 0.000001, params: { ht: 0.356, t3: 0.018, t2: 0.011, w2: 0.369, w3: 0.369 } }
    ];

    const finalColSectionId = colSectionId || (systemMaterial === 'Steel' ? 'W14X90' : 'COL_DEF');
    const finalBeamSectionId = beamSectionId || (systemMaterial === 'Steel' ? 'W14X90' : 'BEAM_DEF');

    if (type === 'beam') {
      // Vigas de Viga Continua
      for (let x = 0; x < numBaysX; x++) {
        const n1 = newNodes.find(n => n.x === x * bayWidthX);
        const n2 = newNodes.find(n => n.x === (x + 1) * bayWidthX);
        newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
      }
    } else {
      // Columnas Edificio 3D
      for (let z = 0; z < numFloors; z++) {
        for (let x = 0; x <= numBaysX; x++) {
          for (let y = 0; y <= numBaysY; y++) {
            const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === (z+1)*floorHeight);
            newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [n1.id, n2.id], section_id: finalColSectionId, material_id: baseMatId });
          }
        }
      }

      // Vigas Edificio 3D
      for (let z = 1; z <= numFloors; z++) {
        for (let x = 0; x <= numBaysX; x++) {
          for (let y = 0; y <= numBaysY; y++) {
            if (x < numBaysX) {
              const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
              const n2 = newNodes.find(n => n.x === (x+1)*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
              newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
            }
            if (y < numBaysY) {
              const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
              const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === (y+1)*bayWidthY && n.z === z*floorHeight);
              newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
            }
          }
        }
      }
    }

    set({
      nodes: newNodes,
      elements: newElements,
      shells: [], // Limpiar losas viejas al regenerar
      loads: [], // Limpiar cargas viejas
      combinations: [], // Limpiar combinaciones
      metadata: { ...get().metadata, units: config.units || 'm, kgf, C' },
      sections: defaultSections,
      materials: defaultMaterials,
      wizardConfig: config,
      results: null,
      isSaved: false,
      cameraView: type === 'beam' ? 'XZ' : '3D',
      activeLevel: 0,
      projectLoadedTrigger: get().projectLoadedTrigger + 1
    });
  }
}));