// Catálogo de Perfiles de Acero para Losa Colaborante (Steel Deck)
// Basado en especificaciones técnicas estándar de IPE, HEA, Conduven y AISC

export const CATALOGO_PERFILES = {
  // Perfiles IPE (European I Beams)
  IPE: [
    { nombre: 'IPE 80', Ix: 80, Zx: 20, peso: 6.0, area: 7.64 },
    { nombre: 'IPE 100', Ix: 171, Zx: 34, peso: 8.1, area: 10.3 },
    { nombre: 'IPE 120', Ix: 318, Zx: 53, peso: 10.4, area: 13.2 },
    { nombre: 'IPE 140', Ix: 541, Zx: 77, peso: 12.9, area: 16.4 },
    { nombre: 'IPE 160', Ix: 869, Zx: 109, peso: 15.8, area: 20.1 },
    { nombre: 'IPE 180', Ix: 1317, Zx: 146, peso: 18.8, area: 23.9 },
    { nombre: 'IPE 200', Ix: 1943, Zx: 194, peso: 22.4, area: 28.5 },
    { nombre: 'IPE 220', Ix: 2772, Zx: 252, peso: 26.2, area: 33.4 },
    { nombre: 'IPE 240', Ix: 3892, Zx: 324, peso: 30.7, area: 39.1 },
    { nombre: 'IPE 270', Ix: 5790, Zx: 429, peso: 36.1, area: 45.9 },
    { nombre: 'IPE 300', Ix: 8356, Zx: 557, peso: 42.2, area: 53.8 },
    { nombre: 'IPE 330', Ix: 11767, Zx: 713, peso: 49.1, area: 62.6 },
    { nombre: 'IPE 360', Ix: 16270, Zx: 904, peso: 57.1, area: 72.7 },
    { nombre: 'IPE 400', Ix: 23128, Zx: 1156, peso: 66.3, area: 84.5 },
    { nombre: 'IPE 450', Ix: 32241, Zx: 1434, peso: 77.6, area: 98.8 },
    { nombre: 'IPE 500', Ix: 43185, Zx: 1727, peso: 90.7, area: 115.5 },
    { nombre: 'IPE 550', Ix: 55962, Zx: 2035, peso: 104.6, area: 133.4 },
    { nombre: 'IPE 600', Ix: 70880, Zx: 2364, peso: 122.4, area: 155.9 },
  ],

  // Perfiles HEA (European Wide Flange Beams)
  HEA: [
    { nombre: 'HEA 100', Ix: 349, Zx: 70, peso: 16.7, area: 21.2 },
    { nombre: 'HEA 120', Ix: 606, Zx: 101, peso: 19.9, area: 25.3 },
    { nombre: 'HEA 140', Ix: 969, Zx: 138, peso: 24.7, area: 31.4 },
    { nombre: 'HEA 160', Ix: 1450, Zx: 181, peso: 30.4, area: 38.8 },
    { nombre: 'HEA 180', Ix: 2070, Zx: 230, peso: 35.5, area: 45.3 },
    { nombre: 'HEA 200', Ix: 2850, Zx: 285, peso: 42.3, area: 53.8 },
    { nombre: 'HEA 220', Ix: 3840, Zx: 349, peso: 50.5, area: 64.3 },
    { nombre: 'HEA 240', Ix: 5070, Zx: 423, peso: 60.3, area: 76.8 },
    { nombre: 'HEA 260', Ix: 6560, Zx: 505, peso: 68.2, area: 86.8 },
    { nombre: 'HEA 280', Ix: 8360, Zx: 597, peso: 76.4, area: 97.3 },
    { nombre: 'HEA 300', Ix: 10510, Zx: 701, peso: 88.3, area: 112.5 },
    { nombre: 'HEA 320', Ix: 13070, Zx: 817, peso: 99.5, area: 126.7 },
    { nombre: 'HEA 340', Ix: 15900, Zx: 935, peso: 110.4, area: 140.6 },
    { nombre: 'HEA 360', Ix: 19110, Zx: 1062, peso: 121.2, area: 154.4 },
    { nombre: 'HEA 400', Ix: 26730, Zx: 1337, peso: 142.8, area: 181.9 },
    { nombre: 'HEA 450', Ix: 37660, Zx: 1674, peso: 167.4, area: 213.2 },
    { nombre: 'HEA 500', Ix: 50400, Zx: 2016, peso: 194.4, area: 247.6 },
    { nombre: 'HEA 550', Ix: 65950, Zx: 2398, peso: 223.6, area: 284.9 },
    { nombre: 'HEA 600', Ix: 85630, Zx: 2854, peso: 255.1, area: 325.0 },
  ],

  // Tubos Rectangulares Conduven (Estructurales - ECO)
  TUBO_RECT: [
    { nombre: 'Tubo 80x40x2.25', Ix: 40.61, Zx: 10.15, peso: 3.94, area: 5.02 },
    { nombre: 'Tubo 100x40x2.25', Ix: 71.37, Zx: 14.27, peso: 4.65, area: 5.92 },
    { nombre: 'Tubo 120x60x2.50', Ix: 159.29, Zx: 26.55, peso: 6.70, area: 8.54 },
    { nombre: 'Tubo 140x60x3.00', Ix: 274.27, Zx: 39.18, peso: 8.89, area: 11.33 },
    { nombre: 'Tubo 160x65x3.40', Ix: 449.65, Zx: 56.21, peso: 11.34, area: 14.44 },
    { nombre: 'Tubo 180x65x4.00', Ix: 697.99, Zx: 77.55, peso: 14.45, area: 18.41 },
    { nombre: 'Tubo 200x70x4.30', Ix: 1016.19, Zx: 101.62, peso: 17.15, area: 21.85 },
    { nombre: 'Tubo 220x90x4.50', Ix: 1561.83, Zx: 141.98, peso: 20.72, area: 26.39 },
    { nombre: 'Tubo 260x90x5.50', Ix: 2844.82, Zx: 218.83, peso: 28.46, area: 36.25 },
    { nombre: 'Tubo 300x100x5.50', Ix: 4366.42, Zx: 291.09, peso: 32.77, area: 41.75 },
    { nombre: 'Tubo 300x100x7.00', Ix: 5360.46, Zx: 357.36, peso: 41.10, area: 52.36 },
    { nombre: 'Tubo 320x120x7.00', Ix: 7032.23, Zx: 439.51, peso: 45.50, area: 57.96 },
    { nombre: 'Tubo 320x120x9.00', Ix: 8654.16, Zx: 540.89, peso: 57.45, area: 73.18 },
    { nombre: 'Tubo 350x170x9.00', Ix: 13546.10, Zx: 774.06, peso: 68.75, area: 87.58 },
  ],

  // Tubos Cuadrados Conduven
  TUBO_CUAD: [
    { nombre: 'Tubo 40x40x2', Ix: 10, Zx: 5, peso: 2.3, area: 2.9 },
    { nombre: 'Tubo 50x50x2', Ix: 20, Zx: 8, peso: 2.9, area: 3.7 },
    { nombre: 'Tubo 50x50x3', Ix: 28, Zx: 11, peso: 4.2, area: 5.4 },
    { nombre: 'Tubo 60x60x2', Ix: 35, Zx: 12, peso: 3.5, area: 4.5 },
    { nombre: 'Tubo 60x60x3', Ix: 50, Zx: 17, peso: 5.1, area: 6.5 },
    { nombre: 'Tubo 80x80x3', Ix: 95, Zx: 24, peso: 7.0, area: 8.9 },
    { nombre: 'Tubo 80x80x4', Ix: 120, Zx: 30, peso: 9.1, area: 11.6 },
    { nombre: 'Tubo 100x100x3', Ix: 190, Zx: 38, peso: 8.9, area: 11.3 },
    { nombre: 'Tubo 100x100x4', Ix: 240, Zx: 48, peso: 11.6, area: 14.8 },
    { nombre: 'Tubo 100x100x5', Ix: 290, Zx: 58, peso: 14.2, area: 18.1 },
    { nombre: 'Tubo 120x120x4', Ix: 420, Zx: 70, peso: 14.1, area: 18.0 },
    { nombre: 'Tubo 120x120x5', Ix: 510, Zx: 85, peso: 17.3, area: 22.0 },
    { nombre: 'Tubo 120x120x6', Ix: 590, Zx: 98, peso: 20.4, area: 26.0 },
    { nombre: 'Tubo 150x150x5', Ix: 980, Zx: 130, peso: 22.0, area: 28.0 },
    { nombre: 'Tubo 150x150x6', Ix: 1150, Zx: 153, peso: 26.0, area: 33.1 },
    { nombre: 'Tubo 150x150x8', Ix: 1450, Zx: 193, peso: 33.0, area: 42.0 },
  ],

  // Perfiles AISC W (Wide Flange Beams) - Propiedades completas para cálculo normativo
  W: [
    { nombre: 'W6x15', d: 15.24, bf: 10.16, tf: 0.72, tw: 0.46, Ix: 574, Sx: 75.5, Zx: 85.3, rx: 6.38, ry: 1.73, J: 1.80, Cw: 3.50e4, Fy: 345, Fu: 450, peso: 22.3, A: 28.4, rts: 1.95 },
    { nombre: 'W8x18', d: 20.57, bf: 13.31, tf: 0.79, tw: 0.51, Ix: 1430, Sx: 139, Zx: 157, rx: 8.55, ry: 2.10, J: 3.80, Cw: 1.40e5, Fy: 345, Fu: 450, peso: 26.8, A: 34.1, rts: 2.37 },
    { nombre: 'W10x22', d: 25.78, bf: 14.81, tf: 0.89, tw: 0.56, Ix: 3050, Sx: 236, Zx: 266, rx: 10.80, ry: 2.46, J: 7.20, Cw: 4.20e5, Fy: 345, Fu: 450, peso: 32.9, A: 41.9, rts: 2.78 },
    { nombre: 'W12x26', d: 31.00, bf: 16.51, tf: 1.02, tw: 0.64, Ix: 5530, Sx: 357, Zx: 402, rx: 12.90, ry: 2.69, J: 12.6, Cw: 1.08e6, Fy: 345, Fu: 450, peso: 38.7, A: 49.4, rts: 3.05 },
    { nombre: 'W14x30', d: 35.56, bf: 17.15, tf: 1.07, tw: 0.69, Ix: 8080, Sx: 454, Zx: 513, rx: 14.5, ry: 2.83, J: 18.2, Cw: 1.52e6, Fy: 345, Fu: 450, peso: 44.6, A: 56.8, rts: 3.21 },
    { nombre: 'W16x31', d: 40.64, bf: 17.78, tf: 1.02, tw: 0.69, Ix: 11800, Sx: 581, Zx: 656, rx: 16.5, ry: 2.97, J: 20.5, Cw: 2.10e6, Fy: 345, Fu: 450, peso: 46.1, A: 58.7, rts: 3.37 },
    { nombre: 'W18x35', d: 45.72, bf: 17.91, tf: 1.07, tw: 0.71, Ix: 16600, Sx: 726, Zx: 819, rx: 18.5, ry: 3.00, J: 24.5, Cw: 2.80e6, Fy: 345, Fu: 450, peso: 52.1, A: 66.4, rts: 3.40 },
    { nombre: 'W21x44', d: 53.34, bf: 20.70, tf: 1.22, tw: 0.79, Ix: 26800, Sx: 1005, Zx: 1135, rx: 21.0, ry: 3.40, J: 35.0, Cw: 4.50e6, Fy: 345, Fu: 450, peso: 65.4, A: 83.3, rts: 3.85 },
    { nombre: 'W24x55', d: 60.96, bf: 22.61, tf: 1.35, tw: 0.89, Ix: 39100, Sx: 1283, Zx: 1450, rx: 23.5, ry: 3.75, J: 48.0, Cw: 6.20e6, Fy: 345, Fu: 450, peso: 81.8, A: 104.2, rts: 4.25 },
    { nombre: 'W27x84', d: 68.58, bf: 25.40, tf: 1.63, tw: 1.02, Ix: 66500, Sx: 1938, Zx: 2190, rx: 26.5, ry: 4.20, J: 75.0, Cw: 1.05e7, Fy: 345, Fu: 450, peso: 125.0, A: 159.4, rts: 4.75 },
  ],

  // Perfiles AISC C (American Standard Channels) - Propiedades completas para cálculo normativo
  C: [
    { nombre: 'C4x7.25', d: 10.16, bf: 3.30, tf: 0.69, tw: 0.41, Ix: 96, Sx: 18.8, Zx: 22.6, rx: 4.14, ry: 0.89, J: 0.50, Cw: 1.20e3, Fy: 345, Fu: 450, peso: 10.8, A: 13.8, rts: 1.08 },
    { nombre: 'C5x9', d: 12.70, bf: 3.81, tf: 0.74, tw: 0.44, Ix: 174, Sx: 27.4, Zx: 32.8, rx: 5.08, ry: 1.02, J: 0.80, Cw: 2.80e3, Fy: 345, Fu: 450, peso: 13.4, A: 17.1, rts: 1.24 },
    { nombre: 'C6x10.5', d: 15.24, bf: 4.29, tf: 0.79, tw: 0.48, Ix: 303, Sx: 39.8, Zx: 47.5, rx: 5.97, ry: 1.13, J: 1.20, Cw: 5.80e3, Fy: 345, Fu: 450, peso: 15.6, A: 19.9, rts: 1.38 },
    { nombre: 'C8x11.5', d: 20.32, bf: 5.08, tf: 0.89, tw: 0.56, Ix: 530, Sx: 52.1, Zx: 62.2, rx: 7.62, ry: 1.40, J: 2.40, Cw: 1.80e4, Fy: 345, Fu: 450, peso: 17.1, A: 21.8, rts: 1.71 },
    { nombre: 'C10x15.3', d: 25.40, bf: 5.94, tf: 0.97, tw: 0.61, Ix: 820, Sx: 64.5, Zx: 77.0, rx: 9.20, ry: 1.65, J: 3.80, Cw: 3.50e4, Fy: 345, Fu: 450, peso: 22.8, A: 29.0, rts: 2.00 },
    { nombre: 'C12x20.7', d: 30.48, bf: 6.80, tf: 1.07, tw: 0.66, Ix: 1200, Sx: 78.7, Zx: 94.0, rx: 10.8, ry: 1.90, J: 5.50, Cw: 5.80e4, Fy: 345, Fu: 450, peso: 30.8, A: 39.2, rts: 2.30 },
    { nombre: 'C15x33.9', d: 38.10, bf: 8.51, tf: 1.27, tw: 0.79, Ix: 2200, Sx: 115.5, Zx: 138.0, rx: 13.5, ry: 2.40, J: 10.0, Cw: 1.20e5, Fy: 345, Fu: 450, peso: 50.5, A: 64.3, rts: 2.85 },
  ],
};

// Función para buscar el perfil más ligero que cumpla los requisitos
export function buscarPerfilOptimo(tipoPerfil, I_req, Z_req) {
  const catalogo = CATALOGO_PERFILES[tipoPerfil];
  if (!catalogo) return null;

  // Buscar perfiles que cumplan ambos requisitos
  const candidatos = catalogo.filter(p => p.Ix >= I_req && p.Zx >= Z_req);
  
  if (candidatos.length === 0) return null;

  // Retornar el más ligero (menor peso)
  return candidatos.reduce((min, p) => p.peso < min.peso ? p : min, candidatos[0]);
}

// Función para buscar alternativas de perfiles
export function buscarAlternativas(tipoPerfil, I_req, Z_req, maxResultados = 5) {
  const catalogo = CATALOGO_PERFILES[tipoPerfil];
  if (!catalogo) return [];

  const candidatos = catalogo
    .filter(p => p.Ix >= I_req && p.Zx >= Z_req)
    .sort((a, b) => a.peso - b.peso);

  return candidatos.slice(0, maxResultados);
}
