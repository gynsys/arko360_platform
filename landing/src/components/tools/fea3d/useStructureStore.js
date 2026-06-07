import { create } from 'zustand';

export const useStructureStore = create((set) => ({
  nodes: [],
  elements: [],
  loads: [],
  sections: [],
  materials: [],
  results: null,
  selectedId: null,

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

  setResults: (results) => set({ results }),

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
  })
}));