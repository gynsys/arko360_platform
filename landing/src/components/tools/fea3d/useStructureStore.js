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
  activeResultCombo: null, // ID de la combinación activa en resultados
  activeResultType: 'deformed', // 'deformed', 'P', 'V2', 'V3', 'M2', 'M3'
  displacementScale: 100, // Factor de exageración
  diagramScale: 1.0, // Multiplicador para diagramas de esfuerzos
  selectedId: null,
  rightClickedElementId: null, // ID para modal de diagrama de elemento
  wizardConfig: null,

  // Estado para dibujo de losas
  isDrawingShell: false,
  drawingNodes: [], // IDs de los nudos seleccionados para la losa actual

  // --- ACCIONES GENERALES ---
  setSelectedId: (id) => set({ selectedId: id }),
  setRightClickedElementId: (id) => set({ rightClickedElementId: id }),
  setMetadata: (data) => set(state => ({ metadata: { ...state.metadata, ...data } })),
  
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
      selectedId: null,
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
    selectedId: null 
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
        material_id: 'CONC_28',
        loads: { CM: 2.0, CV: 1.8 } // Valores por defecto
      });
      toggleDrawingShell();
    } else {
      set({ drawingNodes: newDrawingNodes });
    }
  },

  // --- CRUD NODOS ---
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...data } : n)
  })),
  deleteNode: (id) => set((state) => {
    const newNodes = state.nodes.filter(n => n.id !== id);
    const newElements = state.elements.filter(e => !e.nodes.includes(id));
    const newShells = state.shells.filter(s => !s.nodes.includes(id));
    return {
      nodes: cleanupOrphans(newNodes, newElements, newShells),
      elements: newElements,
      shells: newShells,
      selectedId: state.selectedId === id ? null : state.selectedId
    };
  }),

  // --- CRUD ELEMENTOS ---
  updateElement: (id, data) => set((state) => ({
    elements: state.elements.map(e => e.id === id ? { ...e, ...data } : e)
  })),
  deleteElement: (id) => set((state) => {
    const newElements = state.elements.filter(e => e.id !== id);
    return {
      elements: newElements,
      nodes: cleanupOrphans(state.nodes, newElements, state.shells),
      selectedId: state.selectedId === id ? null : state.selectedId
    };
  }),

  // --- CRUD SHELLS (LOSAS) ---
  addShell: (shell) => set((state) => ({
    shells: [...state.shells, { ...shell, id: `S-${Date.now()}`, type: 'shell' }]
  })),
  updateShell: (id, data) => set((state) => ({
    shells: state.shells.map(s => s.id === id ? { ...s, ...data } : s)
  })),
  deleteShell: (id) => set((state) => {
    const newShells = state.shells.filter(s => s.id !== id);
    return {
      shells: newShells,
      nodes: cleanupOrphans(state.nodes, state.elements, newShells),
      selectedId: state.selectedId === id ? null : state.selectedId
    };
  }),

  // --- CARGAS Y OTROS ---
  addLoad: (load) => set((state) => ({
    loads: [...state.loads, { ...load, id: `L-${Date.now()}` }]
  })),
  
  // --- COMBINACIONES DE CARGA ---
  addLoadCombination: (combo) => set(state => ({ 
    loadCombinations: [...state.loadCombinations, { ...combo, id: `C-${Date.now()}` }] 
  })),
  updateLoadCombination: (id, data) => set(state => ({
    loadCombinations: state.loadCombinations.map(c => c.id === id ? { ...c, ...data } : c)
  })),
  deleteLoadCombination: (id) => set(state => ({
    loadCombinations: state.loadCombinations.filter(c => c.id !== id)
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
        selectedId: null
      });
    } catch (e) {
      console.error("Error cargando archivo .arko3d", e);
    }
  },

  // --- GENERACIÓN WIZARD ---
  generateStructure: (config) => {
    // ... (Mantenemos la lógica de nudos y elementos de la sesión anterior)
    // Pero reseteamos los shells al regenerar la geometría base
    const { numFloors, numBaysX, numBaysY, floorHeight, bayWidthX, bayWidthY } = config;
    const newNodes = [];
    const newElements = [];
    let nodeCount = 1;
    let elemCount = 1;

    for (let z = 0; z <= numFloors; z++) {
      for (let x = 0; x <= numBaysX; x++) {
        for (let y = 0; y <= numBaysY; y++) {
          newNodes.push({
            id: nodeCount++,
            x: x * bayWidthX, y: y * bayWidthY, z: z * floorHeight,
            restraint: z === 0 ? { dofs: [true, true, true, true, true, true] } : null
          });
        }
      }
    }

    // Columnas
    for (let z = 0; z < numFloors; z++) {
      for (let x = 0; x <= numBaysX; x++) {
        for (let y = 0; y <= numBaysY; y++) {
          const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
          const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === (z+1)*floorHeight);
          newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: 'COL_DEF', material_id: 'CONC_28' });
        }
      }
    }

    // Vigas
    for (let z = 1; z <= numFloors; z++) {
      for (let x = 0; x <= numBaysX; x++) {
        for (let y = 0; y <= numBaysY; y++) {
          if (x < numBaysX) {
            const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            const n2 = newNodes.find(n => n.x === (x+1)*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: 'BEAM_DEF', material_id: 'CONC_28' });
          }
          if (y < numBaysY) {
            const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === (y+1)*bayWidthY && n.z === z*floorHeight);
            newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: 'BEAM_DEF', material_id: 'CONC_28' });
          }
        }
      }
    }

    set({
      nodes: newNodes,
      elements: newElements,
      shells: [], // Limpiar losas viejas al regenerar
      sections: [
        { id: 'COL_DEF', A: 0.16, Ix: 0.002, Iy: 0.002, J: 0.003, params: { b: 0.4, h: 0.4 } },
        { id: 'BEAM_DEF', A: 0.12, Ix: 0.001, Iy: 0.0005, J: 0.001, params: { b: 0.3, h: 0.4 } }
      ],
      materials: [{ id: 'CONC_28', E: 25000000000, G: 10000000000, nu: 0.2, density: 2400 }],
      wizardConfig: config,
      results: null
    });
  }
}));