// Catálogo de Perfiles de Acero para Losa Colaborante (Steel Deck)
// Basado en especificaciones técnicas estándar de IPE, HEA y Conduven

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

  // Tubos Rectangulares Conduven
  TUBO_RECT: [
    { nombre: 'Tubo 50x30x2', Ix: 12, Zx: 5, peso: 2.4, area: 3.0 },
    { nombre: 'Tubo 60x40x2', Ix: 22, Zx: 7, peso: 3.0, area: 3.8 },
    { nombre: 'Tubo 80x40x2', Ix: 38, Zx: 9, peso: 3.6, area: 4.6 },
    { nombre: 'Tubo 80x40x3', Ix: 54, Zx: 13, peso: 5.2, area: 6.6 },
    { nombre: 'Tubo 100x50x2', Ix: 68, Zx: 13, peso: 4.5, area: 5.7 },
    { nombre: 'Tubo 100x50x3', Ix: 96, Zx: 19, peso: 6.6, area: 8.4 },
    { nombre: 'Tubo 120x60x2', Ix: 110, Zx: 18, peso: 5.5, area: 7.0 },
    { nombre: 'Tubo 120x60x3', Ix: 155, Zx: 26, peso: 8.1, area: 10.3 },
    { nombre: 'Tubo 120x60x4', Ix: 195, Zx: 32, peso: 10.5, area: 13.4 },
    { nombre: 'Tubo 150x75x3', Ix: 270, Zx: 36, peso: 10.2, area: 13.0 },
    { nombre: 'Tubo 150x75x4', Ix: 340, Zx: 45, peso: 13.3, area: 16.9 },
    { nombre: 'Tubo 150x75x5', Ix: 405, Zx: 54, peso: 16.2, area: 20.6 },
    { nombre: 'Tubo 200x100x3', Ix: 560, Zx: 56, peso: 13.8, area: 17.6 },
    { nombre: 'Tubo 200x100x4', Ix: 720, Zx: 72, peso: 18.0, area: 22.9 },
    { nombre: 'Tubo 200x100x5', Ix: 870, Zx: 87, peso: 22.2, area: 28.2 },
    { nombre: 'Tubo 200x100x6', Ix: 1000, Zx: 100, peso: 26.1, area: 33.2 },
    { nombre: 'Tubo 250x150x4', Ix: 1400, Zx: 93, peso: 23.4, area: 29.8 },
    { nombre: 'Tubo 250x150x5', Ix: 1700, Zx: 113, peso: 28.8, area: 36.7 },
    { nombre: 'Tubo 250x150x6', Ix: 1980, Zx: 132, peso: 34.0, area: 43.3 },
    { nombre: 'Tubo 300x150x5', Ix: 2400, Zx: 120, peso: 33.0, area: 42.0 },
    { nombre: 'Tubo 300x150x6', Ix: 2800, Zx: 140, peso: 39.0, area: 49.6 },
    { nombre: 'Tubo 300x150x8', Ix: 3500, Zx: 175, peso: 50.0, area: 63.6 },
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
