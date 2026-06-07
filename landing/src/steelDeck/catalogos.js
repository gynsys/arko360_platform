import { CATALOGO_PERFILES } from '../components/tools/calculadoraLosas/catalogoPerfiles';

// =============================================================================
// CATÁLOGO AISC 360-16
// =============================================================================
export const CATALOGO_AISC = {};

// Convertir el catálogo de array a objeto por nombre para acceso rápido
CATALOGO_PERFILES.W.forEach(p => {
  CATALOGO_AISC[p.nombre] = { ...p, tipo: 'W' };
});

CATALOGO_PERFILES.C.forEach(p => {
  CATALOGO_AISC[p.nombre] = { ...p, tipo: 'C' };
});

// Suplementar IPE con sus dimensiones estándar en cm y fy
export const IPE_DIMS = {
  80:  { d: 8.0,  bf: 4.6,  tf: 0.52, tw: 0.38 },
  100: { d: 10.0, bf: 5.5,  tf: 0.57, tw: 0.41 },
  120: { d: 12.0, bf: 6.4,  tf: 0.63, tw: 0.44 },
  140: { d: 14.0, bf: 7.3,  tf: 0.69, tw: 0.47 },
  160: { d: 16.0, bf: 8.2,  tf: 0.74, tw: 0.50 },
  180: { d: 18.0, bf: 9.1,  tf: 0.80, tw: 0.53 },
  200: { d: 20.0, bf: 10.0, tf: 0.85, tw: 0.56 },
  220: { d: 22.0, bf: 11.0, tf: 0.92, tw: 0.59 },
  240: { d: 24.0, bf: 12.0, tf: 0.98, tw: 0.62 },
  270: { d: 27.0, bf: 13.5, tf: 1.02, tw: 0.66 },
  300: { d: 30.0, bf: 15.0, tf: 1.07, tw: 0.71 },
  330: { d: 33.0, bf: 16.0, tf: 1.15, tw: 0.75 },
  360: { d: 36.0, bf: 17.0, tf: 1.27, tw: 0.80 },
  400: { d: 40.0, bf: 18.0, tf: 1.35, tw: 0.86 },
  450: { d: 45.0, bf: 19.0, tf: 1.46, tw: 0.94 },
  500: { d: 50.0, bf: 20.0, tf: 1.60, tw: 1.02 },
  550: { d: 55.0, bf: 21.0, tf: 1.72, tw: 1.11 },
  600: { d: 60.0, bf: 22.0, tf: 1.90, tw: 1.20 }
};

CATALOGO_PERFILES.IPE.forEach(p => {
  const num = parseInt(p.nombre.replace('IPE', '').trim());
  const dims = IPE_DIMS[num] || { d: 20.0, bf: 10.0, tf: 0.85, tw: 0.56 };
  CATALOGO_AISC[p.nombre] = {
    ...p,
    ...dims,
    Fy: 2500, // A36/S275
    Fu: 4000,
    A: p.area,
    Sx: p.Ix / (dims.d / 2),
    ry: 0.22 * dims.bf,
    J: 2 * p.Ix * 0.05,
    Cw: 1, // avoid division by 0
    rts: 0.25 * dims.bf,
    tipo: 'IPE'
  };
});

// Suplementar HEA con sus dimensiones estándar en cm
export const HEA_DIMS = {
  100: { d: 9.6,  bf: 10.0, tf: 0.80, tw: 0.50 },
  120: { d: 11.4, bf: 12.0, tf: 0.80, tw: 0.50 },
  140: { d: 13.3, bf: 14.0, tf: 0.85, tw: 0.55 },
  160: { d: 15.2, bf: 16.0, tf: 0.90, tw: 0.60 },
  180: { d: 17.1, bf: 18.0, tf: 0.95, tw: 0.60 },
  200: { d: 19.0, bf: 20.0, tf: 1.00, tw: 0.65 },
  220: { d: 21.0, bf: 22.0, tf: 1.10, tw: 0.70 },
  240: { d: 23.0, bf: 24.0, tf: 1.20, tw: 0.75 },
  260: { d: 25.0, bf: 26.0, tf: 1.25, tw: 0.75 },
  280: { d: 27.0, bf: 28.0, tf: 1.30, tw: 0.80 },
  300: { d: 29.0, bf: 30.0, tf: 1.40, tw: 0.85 },
  320: { d: 31.0, bf: 30.0, tf: 1.55, tw: 0.90 },
  340: { d: 33.0, bf: 30.0, tf: 1.65, tw: 0.95 },
  360: { d: 35.0, bf: 30.0, tf: 1.75, tw: 1.00 },
  400: { d: 39.0, bf: 30.0, tf: 1.90, tw: 1.10 },
  450: { d: 44.0, bf: 30.0, tf: 2.10, tw: 1.15 },
  500: { d: 49.0, bf: 30.0, tf: 2.30, tw: 1.20 },
  550: { d: 54.0, bf: 30.0, tf: 2.40, tw: 1.25 },
  600: { d: 59.0, bf: 30.0, tf: 2.50, tw: 1.30 }
};

CATALOGO_PERFILES.HEA.forEach(p => {
  const num = parseInt(p.nombre.replace('HEA', '').trim());
  const dims = HEA_DIMS[num] || { d: 20.0, bf: 20.0, tf: 1.00, tw: 0.65 };
  CATALOGO_AISC[p.nombre] = {
    ...p,
    ...dims,
    Fy: 2500,
    Fu: 4000,
    A: p.area,
    Sx: p.Ix / (dims.d / 2),
    ry: 0.25 * dims.bf,
    J: 2 * p.Ix * 0.05,
    Cw: 1, // avoid division by 0
    rts: 0.28 * dims.bf,
    tipo: 'HEA'
  };
});

// Suplementar IPN con sus dimensiones estándar en cm
export const IPN_DIMS = {
  80:  { d: 8.0,  bf: 4.2, tf: 0.59, tw: 0.39 },
  100: { d: 10.0, bf: 5.0, tf: 0.68, tw: 0.45 },
  120: { d: 12.0, bf: 5.8, tf: 0.77, tw: 0.51 },
  140: { d: 14.0, bf: 6.6, tf: 0.86, tw: 0.57 },
  160: { d: 16.0, bf: 7.4, tf: 0.95, tw: 0.63 },
  180: { d: 18.0, bf: 8.2, tf: 1.04, tw: 0.69 },
  200: { d: 20.0, bf: 9.0, tf: 1.13, tw: 0.75 },
  220: { d: 22.0, bf: 9.8, tf: 1.22, tw: 0.81 },
  240: { d: 24.0, bf: 10.6, tf: 1.31, tw: 0.87 },
  260: { d: 26.0, bf: 11.3, tf: 1.41, tw: 0.94 },
  280: { d: 28.0, bf: 11.9, tf: 1.52, tw: 1.01 },
  300: { d: 30.0, bf: 12.5, tf: 1.62, tw: 1.08 },
  320: { d: 32.0, bf: 13.1, tf: 1.73, tw: 1.15 },
  340: { d: 34.0, bf: 13.7, tf: 1.83, tw: 1.22 },
  360: { d: 36.0, bf: 14.3, tf: 1.95, tw: 1.30 },
  380: { d: 38.0, bf: 14.9, tf: 2.05, tw: 1.37 },
  400: { d: 40.0, bf: 15.5, tf: 2.16, tw: 1.44 }
};

CATALOGO_PERFILES.IPN.forEach(p => {
  const num = parseInt(p.nombre.replace('IPN', '').trim());
  const dims = IPN_DIMS[num] || { d: 20.0, bf: 9.0, tf: 1.13, tw: 0.75 };
  CATALOGO_AISC[p.nombre] = {
    ...p,
    ...dims,
    Fy: 2500,
    Fu: 4000,
    A: p.area,
    Sx: p.Ix / (dims.d / 2),
    ry: 0.20 * dims.bf,
    J: 2 * p.Ix * 0.05,
    Cw: 1, // avoid division by 0
    rts: 0.22 * dims.bf,
    tipo: 'IPN'
  };
});

// Suplementar Perfiles Tubulares (CONDUVEN)
export const TUBO_RECT = {
  // Dimensiones d, bf, tf(espesor), tw(espesor)
  '175x175x5.0': { d: 17.5, bf: 17.5, tf: 0.5, tw: 0.5, Fy: 3515, Fu: 4000, area: 33.3, Ix: 1570, Iy: 1570 },
  '150x150x5.0': { d: 15.0, bf: 15.0, tf: 0.5, tw: 0.5, Fy: 3515, Fu: 4000, area: 28.3, Ix: 978, Iy: 978 },
  '135x135x4.3': { d: 13.5, bf: 13.5, tf: 0.43, tw: 0.43, Fy: 3515, Fu: 4000, area: 21.8, Ix: 615, Iy: 615 },
  '120x120x4.3': { d: 12.0, bf: 12.0, tf: 0.43, tw: 0.43, Fy: 3515, Fu: 4000, area: 19.3, Ix: 426, Iy: 426 },
  '100x100x3.4': { d: 10.0, bf: 10.0, tf: 0.34, tw: 0.34, Fy: 3515, Fu: 4000, area: 12.8, Ix: 195, Iy: 195 },
  '180x65x4.3':  { d: 18.0, bf: 6.5, tf: 0.43, tw: 0.43, Fy: 3515, Fu: 4000, area: 19.8, Ix: 760, Iy: 135 },
  '140x60x3.4':  { d: 14.0, bf: 6.0, tf: 0.34, tw: 0.34, Fy: 3515, Fu: 4000, area: 12.9, Ix: 322, Iy: 76.8 }
};

Object.keys(TUBO_RECT).forEach(key => {
  const t = TUBO_RECT[key];
  CATALOGO_AISC[`TUBO ${key}`] = {
    nombre: `TUBO ${key}`,
    tipo: 'TUBO',
    ...t,
    A: t.area,
    Sx: t.Ix / (t.d / 2),
    ry: Math.sqrt(t.Iy / t.area),
    J: 2 * t.Ix,
    Cw: 1, // avoid division by 0
    rts: Math.sqrt(t.Iy / t.area) * 0.95
  };
});

export const PERFILES_I_H_TUBO = [
  ...CATALOGO_PERFILES.W.map(p => p.nombre),
  ...CATALOGO_PERFILES.C.map(p => p.nombre),
  ...CATALOGO_PERFILES.IPE.map(p => p.nombre),
  ...CATALOGO_PERFILES.HEA.map(p => p.nombre),
  ...CATALOGO_PERFILES.IPN.map(p => p.nombre),
  ...Object.keys(TUBO_RECT).map(k => `TUBO ${k}`)
];

export { CATALOGO_PERFILES };
