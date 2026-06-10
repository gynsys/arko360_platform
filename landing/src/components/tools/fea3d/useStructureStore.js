import { create } from 'zustand';

export const useStructureStore = create((set) => ({
  nodes: [],
  elements: [],
  loads: [],
  sections: [],
  materials: [],
  results: null,
  selectedId: null,
  /** Última configuración usada en el TemplateWizard, null = no generado aún */
  wizardConfig: null,

  setSelectedId: (id) => set({ selectedId: id }),

  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...data } : n)
  })),

  updateElement: (id, data) => set((state) => ({
    elements: state.elements.map(e => e.id === id ? { ...e, ...data } : e)
  })),

  addLoad: (load) => set((state) => ({
    loads: [...state.loads, { ...load, id: `L-${Date.now()}` }]
  })),

  removeLoad: (id) => set((state) => ({
    loads: state.loads.filter(l => l.id !== id)
  })),

  setResults: (results) => set({ results }),

  /** CRUD: Nudos */
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, { ...node, id: node.id ?? Date.now() }]
  })),

  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    elements: state.elements.filter(e => !e.nodes.includes(id)),
    loads: state.loads.filter(l => l.target_id !== id)
  })),

  /** CRUD: Elementos */
  addElement: (element) => set((state) => ({
    elements: [...state.elements, { ...element, id: element.id ?? Date.now() }]
  })),

  deleteElement: (id) => set((state) => ({
    elements: state.elements.filter(e => e.id !== id),
    loads: state.loads.filter(l => l.target_id !== id)
  })),

  /** CRUD: Materiales */
  addMaterial: (material) => set((state) => ({
    materials: [...state.materials, material]
  })),

  deleteMaterial: (id) => set((state) => ({
    materials: state.materials.filter(m => m.id !== id)
  })),

  /** CRUD: Secciones */
  addSection: (section) => set((state) => ({
    sections: [...state.sections, section]
  })),

  deleteSection: (id) => set((state) => ({
    sections: state.sections.filter(s => s.id !== id)
  })),

  loadDemo: () => set({
    nodes: [
      { id: 1, x: 0, y: 0, z: 0, restraint: { dofs: [true, true, true, true, true, true] } },
      { id: 2, x: 0, y: 0, z: 3, restraint: null }
    ],
    elements: [
      { id: 101, type: 'frame', nodes: [1, 2], section_id: 'C30x30', material_id: 'CONC28' }
    ],
    sections: [{ id: 'C30x30', A: 0.09, Ix: 0.000675, Iy: 0.000675, J: 0.001, params: { b: 0.3, h: 0.3 } }],
    materials: [{ id: 'CONC28', E: 25000000000, G: 10000000000, nu: 0.2, density: 2400 }]
  }),

  generateStructure: (config) => {
    const { numFloors, numBaysX, numBaysY, floorHeight, bayWidthX, bayWidthY } = config;
    const newNodes = [];
    const newElements = [];
    let nodeCount = 1;
    let elemCount = 1;

    // 1. Generar Nudos
    for (let z = 0; z <= numFloors; z++) {
      for (let x = 0; x <= numBaysX; x++) {
        for (let y = 0; y <= numBaysY; y++) {
          newNodes.push({
            id: nodeCount++,
            x: x * bayWidthX,
            y: y * bayWidthY,
            z: z * floorHeight,
            restraint: z === 0 ? { dofs: [true, true, true, true, true, true] } : null
          });
        }
      }
    }

    // 2. Generar Columnas (Verticales)
    for (let z = 0; z < numFloors; z++) {
      for (let x = 0; x <= numBaysX; x++) {
        for (let y = 0; y <= numBaysY; y++) {
          const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
          const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === (z+1)*floorHeight);
          if (n1 && n2) {
            newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: 'COL_DEF', material_id: 'CONC_28' });
          }
        }
      }
    }

    // 3. Generar Vigas (Horizontales en X y Y)
    for (let z = 1; z <= numFloors; z++) {
      for (let x = 0; x <= numBaysX; x++) {
        for (let y = 0; y <= numBaysY; y++) {
          if (x < numBaysX) {
            const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            const n2 = newNodes.find(n => n.x === (x+1)*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            if (n1 && n2) {
              newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: 'BEAM_DEF', material_id: 'CONC_28' });
            }
          }
          if (y < numBaysY) {
            const n1 = newNodes.find(n => n.x === x*bayWidthX && n.y === y*bayWidthY && n.z === z*floorHeight);
            const n2 = newNodes.find(n => n.x === x*bayWidthX && n.y === (y+1)*bayWidthY && n.z === z*floorHeight);
            if (n1 && n2) {
              newElements.push({ id: elemCount++, type: 'frame', nodes: [n1.id, n2.id], section_id: 'BEAM_DEF', material_id: 'CONC_28' });
            }
          }
        }
      }
    }

    set({
      nodes: newNodes,
      elements: newElements,
      sections: [
        { id: 'COL_DEF', A: 0.16, Ix: 0.002, Iy: 0.002, J: 0.003, params: { b: 0.4, h: 0.4 } },
        { id: 'BEAM_DEF', A: 0.12, Ix: 0.001, Iy: 0.0005, J: 0.001, params: { b: 0.3, h: 0.4 } }
      ],
      materials: [
        { id: 'CONC_28', E: 25000000000, G: 10000000000, nu: 0.2, density: 2400 }
      ],
      results: null,
      loads: [],
      wizardConfig: config
    });
  }
}));