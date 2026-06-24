import { create } from 'zustand';
import { generateMesh } from './mesher';
import { SlabOpeningGenerator, OpeningType } from './SlabOpeningGenerator';
import toast from 'react-hot-toast';

// Helper para limpiar nudos huérfanos (que no pertenecen a ningún elemento ni losa)
const cleanupOrphans = (nodes, elements, shells, openings = []) => {
  const connectedNodeIds = new Set();
  elements.forEach(e => e.nodes.forEach(nid => connectedNodeIds.add(nid)));
  shells.forEach(s => s.nodes.forEach(nid => connectedNodeIds.add(nid)));
  openings.forEach(o => {
    if (o.nodes) o.nodes.forEach(nid => connectedNodeIds.add(nid));
  });
  return nodes.filter(n => connectedNodeIds.has(n.id));
};

const round = (val) => Math.round(val * 1e6) / 1e6;

export const useStructureStore = create((set, get) => ({
  // --- ESTADO ---
  nodes: [],
  elements: [],
  shells: [], // Losas
  openings: [], // Aberturas (huecos) en losas
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
  showMesh: true, // Toggle para visibilidad del mallado (meshing)
  activeResultCombo: null, // ID de la combinación activa en resultados
  activeResultType: 'deformed', // 'deformed', 'P', 'V2', 'V3', 'M2', 'M3'
  displacementScale: 100, // Factor de exageración
  diagramScale: 1.0, // Multiplicador para diagramas de esfuerzos
  showExtruded: false, // Toggle para vista extruida 3D
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

    const newOpenings = state.openings.map(o => {
      const scaledParams = {};
      const safeParams = o.params || {};
      for (const k in safeParams) {
        const val = parseFloat(safeParams[k]);
        if (!isNaN(val)) {
          scaledParams[k] = round(val * lFactor);
        } else {
          scaledParams[k] = safeParams[k]; // Conservar strings no numericos
        }
      }
      return {
        ...o,
        offsetX: round(parseFloat(o.offsetX || 0) * lFactor),
        offsetY: round(parseFloat(o.offsetY || 0) * lFactor),
        params: scaledParams
      };
    });

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
        
        // Shell Forces
        if (r.shell_forces) {
          Object.keys(r.shell_forces).forEach(sid => {
            const shellForce = r.shell_forces[sid];
            if (typeof shellForce === 'object' && shellForce !== null) {
              Object.keys(shellForce).forEach(key => {
                const val = shellForce[key];
                if (typeof val === 'number') {
                  if (key.startsWith('M')) {
                    shellForce[key] = val * fFactor * lFactor;
                  } else if (key.startsWith('V') || key.startsWith('N')) {
                    shellForce[key] = val * fFactor;
                  }
                }
              });
            }
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
      openings: newOpenings,
      metadata: { ...state.metadata, units: newUnitsStr },
      results: newResults,
      activeLevel: round(state.activeLevel * lFactor),
      isSaved: false
    };
  }),
  setCurrentUser: (user) => set({ currentUser: user }),
  toggleShowLoads: () => set(state => ({ showLoads: !state.showLoads })),
  toggleShowMesh: () => set(state => ({ showMesh: !state.showMesh })),

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
  toggleExtruded: () => set(state => ({ showExtruded: !state.showExtruded })),
  setWizardConfig: (config) => set({ wizardConfig: config }),
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

  addNodeToDrawing: (nodeId) => set((state) => {
    if (state.drawingNodes.includes(nodeId)) return {};
    const newDrawingNodes = [...state.drawingNodes, nodeId];
    
    if (newDrawingNodes.length === 4) {
      const shellNodes = newDrawingNodes;
      const newShell = {
        nodes: shellNodes,
        thickness: 0.20,
        material_id: '4000Psi',
        loads: { CM: 2.0, CV: 1.8 }
      };
      return {
        shells: [...state.shells, { 
          ...newShell, 
          id: `S-${Date.now()}`, 
          type: 'shell', 
          meshSize: newShell.meshSize ?? 1.0, 
          mesh: null 
        }],
        drawingNodes: [],
        isDrawingShell: false,
        isQuickDrawingShell: false,
        isSaved: false
      };
    }
    return { drawingNodes: newDrawingNodes };
  }),

  // --- CRUD NODOS ---
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...data } : n),
    isSaved: false
  })),
  deleteNode: (id) => set((state) => {
    const newNodesDraft = state.nodes.filter(n => n.id !== id);
    const newElements = state.elements.filter(e => !e.nodes.includes(id));
    const newShells = state.shells.filter(s => !s.nodes.includes(id));
    const newNodes = cleanupOrphans(newNodesDraft, newElements, newShells, state.openings);
    return { 
      nodes: newNodes, 
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
      nodes: cleanupOrphans(state.nodes, newElements, state.shells, state.openings),
      selectedIds: state.selectedIds.filter(sid => sid !== id),
      isSaved: false
    };
  }),

  // --- CRUD SHELLS (LOSAS) ---
  addShell: (shell) => set((state) => ({
    shells: [...state.shells, { ...shell, id: `S-${Date.now()}`, type: 'shell', meshSize: shell.meshSize ?? 1.0, mesh: null }],
    isSaved: false
  })),
  updateShell: (id, data) => set((state) => ({
    shells: state.shells.map(s => s.id === id ? { ...s, ...data, mesh: data.meshSize !== undefined && data.meshSize !== s.meshSize ? null : s.mesh } : s),
    isSaved: false
  })),

  generateMeshForShell: (shellId) => set((state) => {
    const shell = state.shells.find(s => s.id === shellId);
    if (!shell) return state;

    const boundaryNodes = shell.nodes.map(nid => state.nodes.find(n => n.id === nid)).filter(Boolean);
    const openings = state.openings.filter(o => o.hostSlabId === shellId);

    const openingsNodes = openings.map(o => {
      const minX = Math.min(...boundaryNodes.map(c => c.x));
      const minY = Math.min(...boundaryNodes.map(c => c.y));
      const baseX = minX + o.offsetX;
      const baseY = minY + o.offsetY;

      const localVertices = SlabOpeningGenerator.generatePolygon(o.type, o.params);
      
      let cx = 0, cy = 0;
      localVertices.forEach(v => { cx += v.x; cy += v.y; });
      cx /= localVertices.length;
      cy /= localVertices.length;

      const scale = 0.9999;
      return localVertices.map(v => ({
        id: `H-${o.id}-${v.x}-${v.y}`,
        x: baseX + cx + (v.x - cx) * scale,
        y: baseY + cy + (v.y - cy) * scale,
        z: boundaryNodes[0]?.z || 0
      }));
    });

    const meshSize = shell.meshSize || 1.0;
    const mesh = generateMesh(boundaryNodes, openingsNodes, meshSize);

    return {
      shells: state.shells.map(s => s.id === shellId ? { ...s, mesh } : s),
      isSaved: false
    };
  }),

  // --- CRUD ABERTURAS (OPENINGS) ---
  addOpening: (opening) => set((state) => ({
    openings: [...state.openings, { ...opening, id: `O-${Date.now()}` }],
    isSaved: false
  })),
  updateOpening: (id, updates) => set((state) => ({
    openings: state.openings.map(o => o.id === id ? { ...o, ...updates } : o),
    isSaved: false
  })),
  removeOpening: (id) => set((state) => ({
    openings: state.openings.filter(o => o.id !== id),
    isSaved: false
  })),

  deleteShell: (id) => set((state) => {
    const newShells = state.shells.filter(s => s.id !== id);
    const cleanedNodes = cleanupOrphans(state.nodes, state.elements, newShells, state.openings);
    return { shells: newShells, nodes: cleanedNodes, selectedIds: state.selectedIds.filter(sid => sid !== id), isSaved: false };
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
      
      // Shells loaded from file might have old mesh ids that don't match or no mesh
      const shellsRaw = data.shells || [];
      const nodesRaw = data.nodes || [];
      const openingsRaw = data.openings || [];
      
      set({
        nodes: nodesRaw,
        elements: data.elements || [],
        shells: shellsRaw,
        openings: openingsRaw,
        materials: data.materials || [],
        sections: data.sections || [],
        loads: data.loads || [],
        loadCombinations: data.loadCombinations || [
          { id: 'combo-1', name: '1.4 CM (ACI)', factors: { CM: 1.4, CV: 0.0 } },
          { id: 'combo-2', name: '1.2 CM + 1.6 CV (ACI)', factors: { CM: 1.2, CV: 1.6 } }
        ],
        wizardConfig: data.wizardConfig || null,
        metadata: data.metadata || { name: 'Importado', author: '' },
        results: null,
        selectedIds: [],
        isSaved: true,
      });

      // Regenerate FEM mesh for all shells asynchronously to prevent freezing UI
      setTimeout(() => {
        const shellsRaw = data.shells || [];
        shellsRaw.forEach(shell => {
          get().generateMeshForShell(shell.id);
        });
        set(state => ({ projectLoadedTrigger: state.projectLoadedTrigger + 1 }));
        
        toast.success(`Archivo cargado: ${nodesRaw.length} Nudos, ${shellsRaw.length} Losas, ${(data.elements||[]).length} Elementos`, { duration: 5000 });
      }, 0);
    } catch (e) {
      toast.error("Error cargando archivo .arko3d");
    }
  },

  // --- REPLICAR ELEMENTOS ---
  replicateElements: (dx, dy, dz, numCopies, copyRestraints) => set(state => {
    let { nodes, elements, shells, openings, loads } = state;
    const newNodes = [...nodes];
    const newElements = [...elements];
    const newShells = [...shells];
    const newOpenings = [...openings];
    const newLoads = [...loads];

    const selectedIds = state.selectedIds;
    if (selectedIds.length === 0 || numCopies <= 0) return {};

    // 1. Identificar todos los nudos explícitos o implícitos (pertenecientes a elementos/losas seleccionadas)
    const selectedNodesMap = new Map();
    const explicitNodeIds = new Set(selectedIds.filter(id => id.startsWith('N')));
    const selectedElements = elements.filter(e => selectedIds.includes(e.id));
    const selectedShells = shells.filter(s => selectedIds.includes(s.id));

    // Añadir nudos de frames seleccionados
    selectedElements.forEach(e => { e.nodes.forEach(nid => explicitNodeIds.add(nid)); });
    // Añadir nudos de shells seleccionadas
    selectedShells.forEach(s => { s.nodes.forEach(nid => explicitNodeIds.add(nid)); });

    explicitNodeIds.forEach(nid => {
      const node = nodes.find(n => n.id === nid);
      if (node) selectedNodesMap.set(nid, node);
    });

    // Encontrar IDs máximos actuales para autoincrementar
    let maxNodeId = nodes.reduce((max, n) => Math.max(max, parseInt(n.id.replace('N', '')) || 0), 0);
    let maxElemId = elements.reduce((max, e) => Math.max(max, parseInt(e.id.replace('E', '')) || 0), 0);
    let maxShellId = shells.reduce((max, s) => Math.max(max, parseInt(s.id.replace('S', '')) || 0), 0);

    for (let c = 1; c <= numCopies; c++) {
      const nodeIdMap = {}; // Mapea old_id -> new_id en esta iteración

      // Crear mapa de coordenadas espaciales para búsqueda O(1) de nudos existentes
      const nodeMapByCoord = new Map();
      newNodes.forEach(n => {
        const key = `${round(n.x)}|${round(n.y)}|${round(n.z)}`;
        nodeMapByCoord.set(key, n);
      });

      // Clonar o fusionar nudos
      selectedNodesMap.forEach((node, oldId) => {
        const targetX = round(node.x + (dx * c));
        const targetY = round(node.y + (dy * c));
        const targetZ = round(node.z + (dz * c));
        const coordKey = `${targetX}|${targetY}|${targetZ}`;

        let newId;
        const existingNode = nodeMapByCoord.get(coordKey);

        if (existingNode) {
          // El nudo ya existe en esta coordenada (fusión automática)
          newId = existingNode.id;
          nodeIdMap[oldId] = newId;
        } else {
          // El nudo no existe, lo creamos
          maxNodeId++;
          newId = `N${maxNodeId}`;
          nodeIdMap[oldId] = newId;

          const newNode = {
            ...node,
            id: newId,
            x: targetX,
            y: targetY,
            z: targetZ
          };
          // Limpiar restricciones si no se pide copiarlas
          if (!copyRestraints) {
            newNode.restraint = null;
          }
          newNodes.push(newNode);
          nodeMapByCoord.set(coordKey, newNode); // Añadirlo al mapa para futuras búsquedas
        }

        // Clonar cargas asociadas a este nudo original (aplican al nudo clonado/fusionado)
        const nodeLoads = loads.filter(l => l.targetId === oldId && l.type === 'point');
        nodeLoads.forEach(l => {
          newLoads.push({ ...l, id: Date.now() + Math.random(), targetId: newId });
        });
      });

      // Clonar Frames
      selectedElements.forEach(elem => {
        maxElemId++;
        const newId = `E${maxElemId}`;
        const clonedNodes = elem.nodes.map(nid => nodeIdMap[nid] || nid);
        
        newElements.push({
          ...elem,
          id: newId,
          nodes: clonedNodes
        });

        // Clonar cargas asociadas a este frame
        const elemLoads = loads.filter(l => l.targetId === elem.id);
        elemLoads.forEach(l => {
          newLoads.push({ ...l, id: Date.now() + Math.random(), targetId: newId });
        });
      });

      // Clonar Shells y Openings
      selectedShells.forEach(shell => {
        maxShellId++;
        const newId = `S${maxShellId}`;
        const clonedNodes = shell.nodes.map(nid => nodeIdMap[nid] || nid);
        const clonedShell = {
          ...shell,
          id: newId,
          nodes: clonedNodes
        };
        
        if (shell.mesh) {
          const meshNodeIdMap = {};
          const clonedMeshNodes = shell.mesh.nodes.map(n => {
            const newMeshNodeId = 'M_N_' + Math.random().toString(36).substr(2, 9);
            meshNodeIdMap[n.id] = newMeshNodeId;
            return {
              ...n,
              id: newMeshNodeId,
              x: round(n.x + (dx * c)),
              y: round(n.y + (dy * c)),
              z: round(n.z + (dz * c))
            };
          });

          const clonedMeshElements = shell.mesh.elements.map(e => {
            const newMeshElemId = 'M_E_' + Math.random().toString(36).substr(2, 9);
            return {
              ...e,
              id: newMeshElemId,
              nodeIds: e.nodeIds.map(nid => meshNodeIdMap[nid] || nid)
            };
          });

          clonedShell.mesh = {
            nodes: clonedMeshNodes,
            elements: clonedMeshElements
          };
        } else {
          delete clonedShell.mesh;
        }
        
        newShells.push(clonedShell);

        // Clonar Aberturas asociadas a esta losa
        const shellOpenings = openings.filter(o => o.hostSlabId === shell.id);
        shellOpenings.forEach(opening => {
          newOpenings.push({
            ...opening,
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            hostSlabId: newId
          });
        });
      });
    }

    return {
      nodes: newNodes,
      elements: newElements,
      shells: newShells,
      openings: newOpenings,
      loads: newLoads,
      isSaved: false
    };
  }),

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
    } else if (type !== 'galpon') {
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
    } else if (type === 'galpon') {
      const { apexHeight, roofPanels, trussType } = config;
      const L = bayWidthX;
      const E = floorHeight;
      const H = apexHeight;
      const P = roofPanels;
      const dx = L / (2 * P);
      const slope = (H - E) / (L / 2);

      // We will store nodes per frame to easily connect them later
      config._galponNodes = []; 

      for (let y = 0; y <= numBaysY; y++) {
        const yPos = y * bayWidthY;
        const frameNodes = { base: [], lc: [], uc: [] };
        
        // Base nodes (Fixed)
        const b0 = { id: `N${nodeCount++}`, x: 0, y: yPos, z: 0, restraint: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } };
        const bn = { id: `N${nodeCount++}`, x: L, y: yPos, z: 0, restraint: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } };
        newNodes.push(b0, bn);
        frameNodes.base.push(b0, bn);

        // Lower and Upper chord nodes
        for (let i = 0; i <= 2 * P; i++) {
          const xPos = i * dx;
          const isEave = (i === 0 || i === 2 * P);
          
          let zUc = E;
          if (xPos <= L/2) zUc = E + xPos * slope;
          else zUc = E + (L - xPos) * slope;

          // Upper chord node
          const uc = { id: `N${nodeCount++}`, x: xPos, y: yPos, z: zUc, restraint: null };
          newNodes.push(uc);
          frameNodes.uc.push(uc);

          // Lower chord node (only internal, since 0 and 2P are eave nodes which are uc)
          if (!isEave) {
            const lc = { id: `N${nodeCount++}`, x: xPos, y: yPos, z: E, restraint: null };
            if (config.galponType !== 'Tapered') {
              newNodes.push(lc);
            }
            frameNodes.lc.push(lc);
          } else {
            // Push the eave node as lc as well for easy indexing
            frameNodes.lc.push(uc);
          }
        }
        config._galponNodes.push(frameNodes);
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
      E: 20389324000,      // kgf/m²
      U: 0.3, A: 0.0000117,
      G: 7842047000,       // kgf/m²
      Fy: 35182000, Fu: 45872000 // kgf/m²
    };

    // Determine default base materials depending on selected system
    const defaultMaterials = get().materials.length > 0 ? get().materials : [matConcrete, matSteel];
    const baseMatId = config.materialId || (systemMaterial === 'Steel' ? 'A992Fy50' : '4000Psi');

    let currentSections = get().sections.length > 0 ? [...get().sections] : [
      { id: 'COL_DEF', name: 'COL_40x40', type: 'Rectangular', material_id: '4000Psi', A: 0.16, Ix: 0.002133, Iy: 0.002133, J: 0.004266, params: { b: 0.4, h: 0.4 } },
      { id: 'BEAM_DEF', name: 'VIGA_30x40', type: 'Rectangular', material_id: '4000Psi', A: 0.12, Ix: 0.0016, Iy: 0.0009, J: 0.0025, params: { b: 0.3, h: 0.4 } },
      { id: 'W14X90', name: 'W14X90', type: 'I/Wide Flange', material_id: 'A992Fy50', A: 0.0171, Ix: 0.000416, Iy: 0.00015, J: 0.000001, params: { ht: 0.356, t3: 0.018, t2: 0.011, w2: 0.369, w3: 0.369 } }
    ];

    if (!currentSections.some(s => s.id === 'L_2X2X1_4')) {
      currentSections.push({ id: 'L_2X2X1_4', name: 'L2x2x1/4', type: 'Angle', material_id: 'A992Fy50', A: 0.000609, Ix: 0.00000016, Iy: 0.00000016, J: 0.00000001, params: { d: 0.0508, b: 0.0508, t: 0.00635 } });
    }
    if (!currentSections.some(s => s.id === 'ROD_5_8')) {
      currentSections.push({ id: 'ROD_5_8', name: 'Rod 5/8"', type: 'Circular Solid', material_id: 'A992Fy50', A: 0.000198, Ix: 0.000000003, Iy: 0.000000003, J: 0.000000006, params: { d: 0.015875 } });
    }

    const finalColSectionId = colSectionId || (systemMaterial === 'Steel' ? 'W14X90' : 'COL_DEF');
    const finalBeamSectionId = beamSectionId || (systemMaterial === 'Steel' ? 'W14X90' : 'BEAM_DEF');

    if (type === 'beam') {
      // Vigas de Viga Continua
      for (let x = 0; x < numBaysX; x++) {
        const n1 = newNodes.find(n => n.x === x * bayWidthX);
        const n2 = newNodes.find(n => n.x === (x + 1) * bayWidthX);
        newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [n1.id, n2.id], section_id: finalBeamSectionId, material_id: baseMatId });
      }
    } else if (type !== 'galpon') {
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
    } else if (type === 'galpon') {
      const { roofPanels, trussType } = config;
      const P = roofPanels;
      
      for (let y = 0; y <= config.numBaysY; y++) {
        const frame = config._galponNodes[y];
        
        if (config.galponType === 'Tapered') {
          // Columns
          const colSecId = 'TAP_COL';
          if (!currentSections.some(s => s.id === colSecId)) {
            currentSections.push({ id: colSecId, name: 'COL_TAPERED', type: 'Tapered I/Wide Flange', material_id: baseMatId, A: 0.02, Ix: 0.001, Iy: 0.0001, J: 0.000001, params: { ht_start: 0.4, ht_end: 0.8, w2: 0.2, w3: 0.2, t2: 0.01, t3: 0.015 } });
          }
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.base[0].id, frame.uc[0].id], section_id: colSecId, material_id: baseMatId });
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.base[1].id, frame.uc[2*P].id], section_id: colSecId, material_id: baseMatId });

          // Roof beams (Tapered)
          for (let i = 0; i < P; i++) {
             const ht_start = 0.8 - (0.4 * i / P);
             const ht_end = 0.8 - (0.4 * (i+1) / P);
             const secId = `TAP_ROOF_L_${i}`;
             if (!currentSections.some(s => s.id === secId)) {
                currentSections.push({ id: secId, name: `TAP_ROOF_L_${i}`, type: 'Tapered I/Wide Flange', material_id: baseMatId, A: 0.02, Ix: 0.001, Iy: 0.0001, J: 0.000001, params: { ht_start, ht_end, w2: 0.2, w3: 0.2, t2: 0.01, t3: 0.015 } });
             }
             newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.uc[i].id, frame.uc[i+1].id], section_id: secId, material_id: baseMatId });
          }
          for (let i = P; i < 2*P; i++) {
             const j = i - P;
             const ht_start = 0.4 + (0.4 * j / P);
             const ht_end = 0.4 + (0.4 * (j+1) / P);
             const secId = `TAP_ROOF_R_${j}`;
             if (!currentSections.some(s => s.id === secId)) {
                currentSections.push({ id: secId, name: `TAP_ROOF_R_${j}`, type: 'Tapered I/Wide Flange', material_id: baseMatId, A: 0.02, Ix: 0.001, Iy: 0.0001, J: 0.000001, params: { ht_start, ht_end, w2: 0.2, w3: 0.2, t2: 0.01, t3: 0.015 } });
             }
             newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.uc[i].id, frame.uc[i+1].id], section_id: secId, material_id: baseMatId });
          }
        } else {
          // 1. Columns
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.base[0].id, frame.uc[0].id], section_id: finalColSectionId, material_id: baseMatId });
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.base[1].id, frame.uc[2*P].id], section_id: finalColSectionId, material_id: baseMatId });

          // 2. Truss - Upper Chord
          for (let i = 0; i < 2*P; i++) {
            newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.uc[i].id, frame.uc[i+1].id], section_id: finalBeamSectionId, material_id: baseMatId });
          }

          // 3. Truss - Lower Chord
          for (let i = 0; i < 2*P; i++) {
            newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.lc[i].id, frame.lc[i+1].id], section_id: finalBeamSectionId, material_id: baseMatId });
          }

          // 4. Truss - Verticals (Montantes)
          for (let i = 1; i < 2*P; i++) {
            newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.lc[i].id, frame.uc[i].id], section_id: finalBeamSectionId, material_id: baseMatId });
          }

          // 5. Truss - Diagonals
          for (let i = 1; i <= P; i++) {
            if (i === 1) continue; // Skip i=1 to avoid duplication with upper/lower chords
            // Left half
            if (trussType === 'Howe') {
              // Howe: diagonals slope UP towards the center
              newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.lc[i-1].id, frame.uc[i].id], section_id: finalBeamSectionId, material_id: baseMatId });
            } else { // Pratt
              // Pratt: diagonals slope DOWN towards the center
              newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.uc[i-1].id, frame.lc[i].id], section_id: finalBeamSectionId, material_id: baseMatId });
            }
          }
          for (let i = P + 1; i <= 2*P; i++) {
            if (i === 2 * P) continue; // Skip i=2P to avoid duplication with upper/lower chords
            // Right half
            if (trussType === 'Howe') {
              newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.lc[i].id, frame.uc[i-1].id], section_id: finalBeamSectionId, material_id: baseMatId });
            } else { // Pratt
              newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame.uc[i].id, frame.lc[i-1].id], section_id: finalBeamSectionId, material_id: baseMatId });
            }
          }
        }
      }

      // 6. Longitudinal Purlins (Correas) and Struts
      for (let y = 0; y < config.numBaysY; y++) {
        const frame1 = config._galponNodes[y];
        const frame2 = config._galponNodes[y+1];
        
        // Purlins at upper chord nodes
        for (let i = 0; i <= 2*P; i++) {
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame1.uc[i].id, frame2.uc[i].id], section_id: finalBeamSectionId, material_id: baseMatId });
        }

        // 7. Bracing (Cruces de San Andrés y Rigidizadores de Cubierta) en el primer y último vano
        const isFirstBay = y === 0;
        const isLastBay = y === config.numBaysY - 1;
        
        if (isFirstBay || isLastBay) {
          // Wall cross bracing (Left wall: nodes base[0] and uc[0])
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame1.base[0].id, frame2.uc[0].id], section_id: 'L_2X2X1_4', material_id: baseMatId });
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame2.base[0].id, frame1.uc[0].id], section_id: 'L_2X2X1_4', material_id: baseMatId });

          // Wall cross bracing (Right wall: nodes base[1] and uc[2*P])
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame1.base[1].id, frame2.uc[2*P].id], section_id: 'L_2X2X1_4', material_id: baseMatId });
          newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame2.base[1].id, frame1.uc[2*P].id], section_id: 'L_2X2X1_4', material_id: baseMatId });

          // Roof bracing (Rigidizadores de cubierta)
          // Cross bracing spanning two purlin spacings (cada dos correas)
          for (let i = 0; i < 2*P - 1; i += 2) {
            newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame1.uc[i].id, frame2.uc[i+2].id], section_id: 'ROD_5_8', material_id: baseMatId });
            newElements.push({ id: `E${elemCount++}`, type: 'frame', nodes: [frame2.uc[i].id, frame1.uc[i+2].id], section_id: 'ROD_5_8', material_id: baseMatId });
          }
        }
      }
      
      // Cleanup temp reference
      delete config._galponNodes;
    }

    set({
      nodes: newNodes,
      elements: newElements,
      shells: [], // Limpiar losas viejas al regenerar
      loads: [], // Limpiar cargas viejas
      combinations: [], // Limpiar combinaciones
      metadata: { ...get().metadata, units: config.units || 'm, kgf, C' },
      sections: currentSections,
      materials: defaultMaterials,
      wizardConfig: config,
      results: null,
      isSaved: false,
      cameraView: type === 'beam' ? 'XZ' : '3D',
      activeLevel: 0,
      projectLoadedTrigger: get().projectLoadedTrigger + 1
    });
  },
  addCantilever: (config) => set(state => {
    const { level, axisType, axisVal, dir, length } = config;
    const { nodes, elements, shells, openings, loads } = state;
    
    const baseNodes = nodes.filter(n => {
      if (n.cantilever) return false;
      const zMatch = Math.abs(n.z - level) < 1e-3;
      if (!zMatch) return false;
      if (axisType === 'X') {
        return Math.abs(n.x - axisVal) < 1e-3;
      } else {
        return Math.abs(n.y - axisVal) < 1e-3;
      }
    });

    if (baseNodes.length < 2) {
      toast.error('Se necesitan al menos 2 nudos en el eje para generar el volado.');
      return {};
    }

    if (axisType === 'X') {
      baseNodes.sort((a, b) => a.y - b.y);
    } else {
      baseNodes.sort((a, b) => a.x - b.x);
    }

    let dx = 0, dy = 0;
    if (dir === '+X') dx = length;
    else if (dir === '-X') dx = -length;
    else if (dir === '+Y') dy = length;
    else if (dir === '-Y') dy = -length;

    const newNodes = [...nodes];
    const newElements = [...elements];
    const newShells = [...shells];
    
    const cantileverId = `CANT-${Date.now()}`;
    const tipNodes = [];

    const templateBeam = elements.find(e => {
      const n = nodes.find(nd => nd.id === e.nodes[0]);
      return n && Math.abs(n.z - level) < 1e-3;
    });
    const sectionId = templateBeam ? templateBeam.section_id : (state.sections[0]?.id || 'BEAM_DEF');
    const materialId = templateBeam ? templateBeam.material_id : (state.materials[0]?.id || '4000Psi');

    let maxNodeId = nodes.reduce((max, n) => Math.max(max, parseInt(n.id.replace('N', '')) || 0), 0);
    let maxElemId = elements.reduce((max, e) => Math.max(max, parseInt(e.id.replace('E', '')) || 0), 0);

    baseNodes.forEach((bn, idx) => {
      const targetX = round(bn.x + dx);
      const targetY = round(bn.y + dy);
      const targetZ = round(bn.z);

      maxNodeId++;
      const tipNodeId = `N${maxNodeId}`;
      const newTipNode = {
        id: tipNodeId,
        x: targetX,
        y: targetY,
        z: targetZ,
        cantilever: {
          cantileverId,
          baseNodeId: bn.id,
          axisType,
          axisVal,
          dir,
          length
        }
      };
      newNodes.push(newTipNode);
      tipNodes.push(newTipNode);

      maxElemId++;
      newElements.push({
        id: `E${maxElemId}`,
        type: 'frame',
        nodes: [bn.id, tipNodeId],
        section_id: sectionId,
        material_id: materialId,
        beta_angle: 0,
        beam_type: 'carga',
        cantileverId
      });
    });

    for (let i = 0; i < baseNodes.length - 1; i++) {
      const tn1 = tipNodes[i];
      const tn2 = tipNodes[i+1];

      maxElemId++;
      newElements.push({
        id: `E${maxElemId}`,
        type: 'frame',
        nodes: [tn1.id, tn2.id],
        section_id: sectionId,
        material_id: materialId,
        beta_angle: 0,
        beam_type: 'secundaria',
        cantileverId
      });
    }

    toast.success('Volado (Cantilever) generado exitosamente.');

    return {
      nodes: newNodes,
      elements: newElements,
      isSaved: false
    };
  }),

  updateCantileverLength: (cantileverId, newLength) => set(state => {
    const { nodes, shells } = state;
    
    const newNodes = nodes.map(n => {
      if (n.cantilever && n.cantilever.cantileverId === cantileverId) {
        const baseNode = nodes.find(bn => bn.id === n.cantilever.baseNodeId);
        if (baseNode) {
          const dir = n.cantilever.dir;
          let dx = 0, dy = 0;
          if (dir === '+X') dx = newLength;
          else if (dir === '-X') dx = -newLength;
          else if (dir === '+Y') dy = newLength;
          else if (dir === '-Y') dy = -newLength;

          return {
            ...n,
            x: round(baseNode.x + dx),
            y: round(baseNode.y + dy),
            cantilever: {
              ...n.cantilever,
              length: newLength
            }
          };
        }
      }
      return n;
    });

    toast.success(`Longitud de volado actualizada a ${newLength}m.`);

    setTimeout(() => {
      shells.forEach(s => {
        if (s.cantileverId === cantileverId) {
          get().generateMeshForShell(s.id);
        }
      });
    }, 0);

    return {
      nodes: newNodes,
      isSaved: false
    };
  }),

  replicateColumnProperties: (elementId, toAll = false) => set(state => {
    const selectedCol = state.elements.find(e => e.id === elementId);
    if (!selectedCol) return {};
    
    const n1_sel = state.nodes.find(n => n.id === selectedCol.nodes[0]);
    const n2_sel = state.nodes.find(n => n.id === selectedCol.nodes[1]);
    if (!n1_sel || !n2_sel) return {};
    
    const selZMin = Math.min(n1_sel.z, n2_sel.z);
    const selZMax = Math.max(n1_sel.z, n2_sel.z);
    
    let count = 0;
    const newElements = state.elements.map(e => {
      const n1 = state.nodes.find(n => n.id === e.nodes[0]);
      const n2 = state.nodes.find(n => n.id === e.nodes[1]);
      if (!n1 || !n2) return e;
      
      const isCol = Math.abs(n1.x - n2.x) < 1e-3 && Math.abs(n1.y - n2.y) < 1e-3;
      if (!isCol) return e;
      
      if (toAll) {
        count++;
        return { ...e, section_id: selectedCol.section_id, material_id: selectedCol.material_id };
      } else {
        const zMin = Math.min(n1.z, n2.z);
        const zMax = Math.max(n1.z, n2.z);
        const isSameFloor = Math.abs(zMin - selZMin) < 1e-3 && Math.abs(zMax - selZMax) < 1e-3;
        if (isSameFloor) {
          count++;
          return { ...e, section_id: selectedCol.section_id, material_id: selectedCol.material_id };
        }
      }
      return e;
    });
    
    toast.success(`Sección replicada a ${count} columnas.`);
    return { elements: newElements, isSaved: false };
  }),

  replicateBeamProperties: (elementId) => set(state => {
    const selectedBeam = state.elements.find(e => e.id === elementId);
    if (!selectedBeam) return {};
    
    const n1_sel = state.nodes.find(n => n.id === selectedBeam.nodes[0]);
    const n2_sel = state.nodes.find(n => n.id === selectedBeam.nodes[1]);
    if (!n1_sel || !n2_sel) return {};
    
    const selZ = (n1_sel.z + n2_sel.z) / 2;
    const selBeamType = selectedBeam.beam_type || 'carga';
    
    let count = 0;
    const newElements = state.elements.map(e => {
      const n1 = state.nodes.find(n => n.id === e.nodes[0]);
      const n2 = state.nodes.find(n => n.id === e.nodes[1]);
      if (!n1 || !n2) return e;
      
      const isCol = Math.abs(n1.x - n2.x) < 1e-3 && Math.abs(n1.y - n2.y) < 1e-3;
      if (isCol) return e;
      
      const zVal = (n1.z + n2.z) / 2;
      const isSameFloor = Math.abs(zVal - selZ) < 1e-3;
      const otherBeamType = e.beam_type || 'carga';
      
      if (isSameFloor && otherBeamType === selBeamType) {
        count++;
        return { ...e, section_id: selectedBeam.section_id, material_id: selectedBeam.material_id };
      }
      return e;
    });
    
    toast.success(`Sección replicada a ${count} vigas de tipo '${selBeamType}'.`);
    return { elements: newElements, isSaved: false };
  })
}));