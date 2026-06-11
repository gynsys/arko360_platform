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

  // Estado para dibujo de losas
  isDrawingShell: false,
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
  setCurrentUser: (user) => set({ currentUser: user }),
  toggleShowLoads: () => set(state => ({ showLoads: !state.showLoads })),

  setSelectionBox: (data) => set(state => ({ selectionBox: { ...state.selectionBox, ...data } })),
  
  // --- NAVEGACIÓN 2D/3D ---
  setCameraView: (view) => set(state => {
    if (view === '3D') return { cameraView: view };
    
    // Al cambiar a un plano 2D, encontrar el nivel más cercano al 0 o el menor posible
    let levels = [];
    if (view === 'XY') levels = [...new Set(state.nodes.map(n => n.z))].sort((a,b)=>a-b);
    else if (view === 'XZ') levels = [...new Set(state.nodes.map(n => n.y))].sort((a,b)=>a-b);
    else if (view === 'YZ') levels = [...new Set(state.nodes.map(n => n.x))].sort((a,b)=>a-b);
    
    const defaultLevel = levels.length > 0 ? levels[0] : 0;
    return { cameraView: view, activeLevel: defaultLevel };
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
          id: nodeCount++,
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
              id: nodeCount++,
              x: x * bayWidthX, y: y * bayWidthY, z: z * floorHeight,
              restraint: z === 0 ? { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } : null
            });
          }
        }
      }
    }

    // Default Material & Section Definitions if the user hasn't created any
    const isUS = config.units?.includes('ft');
    
    // Concrete Default
    const matConcrete = { 
      id: '4000Psi', name: '4000Psi', type: 'Concrete', color: '#ff00ff',
      density: isUS ? 2402.77 : 2400, 
      weightVol: isUS ? 23.56 : 2400,
      E: isUS ? 24855580 : 25000000000, 
      U: 0.2, A: 0.0000099, G: 10356490, fc: isUS ? 28000 : 28000000 
    };
    
    // Steel Default
    const matSteel = { 
      id: 'A992Fy50', name: 'A992Fy50', type: 'Steel', color: '#00ffff',
      density: 7849.047, weightVol: isUS ? 76.97 : 7850,
      E: isUS ? 200000000 : 200000000000, 
      U: 0.3, A: 0.0000117, G: 76923000,
      Fy: isUS ? 345000 : 345000000, Fu: isUS ? 450000 : 450000000 
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
        newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
      }
    } else {
      // Columnas Edificio 3D
      for (let z = 0; z < numFloors; z++) {
        for (let x = 0; x <= numBaysX; x++) {
          for (let y = 0; y <= numBaysY; y++) {
            const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === (z+1)*floorHeight);
            newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: finalColSectionId, material_id: baseMatId });
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
              newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
            }
            if (y < numBaysY) {
              const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
              const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === (y+1)*bayWidthY && n.z === z*floorHeight);
              newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
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
      activeLevel: 0
    });
  }
}));