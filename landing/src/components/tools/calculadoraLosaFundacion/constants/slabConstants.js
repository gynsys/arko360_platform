export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const MATERIALS = {
  'bloque_arcilla_10': { name: 'Bloque de Arcilla (10cm)', thickness: 0.10, density: 1200 },
  'bloque_arcilla_12': { name: 'Bloque de Arcilla (12cm)', thickness: 0.12, density: 1200 },
  'bloque_arcilla_15': { name: 'Bloque de Arcilla (15cm)', thickness: 0.15, density: 1200 },
  'bloque_cemento': { name: 'Bloque de Cemento (15cm)', thickness: 0.15, density: 1800 },
  'ladrillo_macizo': { name: 'Ladrillo Macizo (12cm)', thickness: 0.12, density: 1900 },
  'ladrillo_hueco': { name: 'Ladrillo Hueco (12cm)', thickness: 0.12, density: 1400 },
};

export const FALLBACK_PRECIOS = {
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
export const SHAPES = [
  { id: 'rectangular', label: 'Rectangular' },
  { id: 'L', label: 'Forma en L' },
  { id: 'U', label: 'Forma en U' },
  { id: 'T', label: 'Forma en T' },
  { id: 'libre', label: 'Libre / Manual' },
];
