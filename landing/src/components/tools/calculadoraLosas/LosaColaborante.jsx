import React, { useState, useMemo, useCallback } from 'react';
import { CATALOGO_PERFILES } from './catalogoPerfiles';
import { renderGrid, renderSeccion } from './visualizacion';

// =============================================================================
// CATÁLOGO AISC 360-16 – Importado desde catalogoPerfiles.js
// =============================================================================
const CATALOGO_AISC = {};

// Convertir el catálogo de array a objeto por nombre para acceso rápido
CATALOGO_PERFILES.W.forEach(p => {
  CATALOGO_AISC[p.nombre] = { ...p, tipo: 'W' };
});

CATALOGO_PERFILES.C.forEach(p => {
  CATALOGO_AISC[p.nombre] = { ...p, tipo: 'C' };
});

// Suplementar IPE con sus dimensiones estándar en cm y fy
const IPE_DIMS = {
  80: { d: 8.0, bf: 4.6, tf: 0.52, tw: 0.38 },
  100: { d: 10.0, bf: 5.5, tf: 0.57, tw: 0.41 },
  120: { d: 12.0, bf: 6.4, tf: 0.63, tw: 0.44 },
  140: { d: 14.0, bf: 7.3, tf: 0.69, tw: 0.47 },
  160: { d: 16.0, bf: 8.2, tf: 0.74, tw: 0.50 },
  180: { d: 18.0, bf: 9.1, tf: 0.80, tw: 0.53 },
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
    Cw: 0,
    rts: 0.25 * dims.bf,
    tipo: 'IPE'
  };
});

// Suplementar HEA con sus dimensiones estándar en cm
const HEA_DIMS = {
  100: { d: 9.6, bf: 10.0, tf: 0.80, tw: 0.50 },
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
    Cw: 0,
    rts: 0.28 * dims.bf,
    tipo: 'HEA'
  };
});

// Suplementar IPN con sus dimensiones estándar en cm
const IPN_DIMS = {
  80: { d: 8.0, bf: 4.2, tf: 0.59, tw: 0.39 },
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
  400: { d: 40.0, bf: 15.5, tf: 2.16, tw: 1.44 },
};

CATALOGO_PERFILES.IPN.forEach(p => {
  const num = parseInt(p.nombre.replace('IPN', '').trim());
  const dims = IPN_DIMS[num] || { d: 20.0, bf: 10.0, tf: 0.85, tw: 0.56 };
  CATALOGO_AISC[p.nombre] = {
    ...p,
    ...dims,
    Fy: 2500,
    Fu: 4000,
    A: p.area,
    Sx: p.Ix / (dims.d / 2),
    ry: 0.22 * dims.bf,
    J: 2 * p.Ix * 0.05,
    Cw: 0,
    rts: 0.25 * dims.bf,
    tipo: 'IPN'
  };
});

// Suplementar TUBO_RECT (Conduven) parseando el nombre (ej. Tubo 100x50x3)
CATALOGO_PERFILES.TUBO_RECT.forEach(p => {
  const match = p.nombre.match(/Tubo\s+(\d+)x(\d+)x(\d+)/i);
  let d = 10.0, bf = 5.0, tf = 0.3, tw = 0.3;
  if (match) {
    d = parseFloat(match[1]) / 10;
    bf = parseFloat(match[2]) / 10;
    tf = parseFloat(match[3]) / 10; // el calibre final es en mm
    tw = tf;
  }
  CATALOGO_AISC[p.nombre] = {
    ...p,
    d,
    bf,
    tf,
    tw,
    Fy: 3450, // ASTM A500 Gr. C
    Fu: 4500,
    A: p.area,
    Sx: p.Ix / (d / 2),
    ry: 0.3 * bf,
    J: 2 * p.Ix,
    Cw: 0,
    rts: 0.35 * bf,
    tipo: 'Tubo'
  };
});

const PERFILES_I_H_TUBO = [
  ...CATALOGO_PERFILES.W.map(p => p.nombre),
  ...CATALOGO_PERFILES.IPE.map(p => p.nombre),
  ...CATALOGO_PERFILES.HEA.map(p => p.nombre),
  ...CATALOGO_PERFILES.IPN.map(p => p.nombre),
  ...CATALOGO_PERFILES.TUBO_RECT.map(p => p.nombre)
];

// =============================================================================
// PROPIEDADES STEEL DECK
// =============================================================================
const DECK_PROPS = {
  22: { peso: 7.3,  I_s: 15,   S_pos: 5.2,  S_neg: 4.8,  Vn: 2200, Mn_pos: 450,  Mn_neg: 380,  t: 0.76, hr: 3.8, Sr: 15.24, wr: 6.5 },
  20: { peso: 9.1,  I_s: 22,   S_pos: 7.1,  S_neg: 6.5,  Vn: 2800, Mn_pos: 620,  Mn_neg: 520,  t: 0.91, hr: 3.8, Sr: 15.24, wr: 6.5 },
  18: { peso: 11.4, I_s: 32,   S_pos: 9.8,  S_neg: 9.0,  Vn: 3500, Mn_pos: 850,  Mn_neg: 710,  t: 1.21, hr: 3.8, Sr: 15.24, wr: 6.5 },
  16: { peso: 14.6, I_s: 48,   S_pos: 13.2, S_neg: 12.1, Vn: 4500, Mn_pos: 1150, Mn_neg: 960,  t: 1.52, hr: 3.8, Sr: 15.24, wr: 6.5 },
};

// =============================================================================
// CONSTANTES NORMATIVAS
// =============================================================================
const PHI_B    = 0.90;
const PHI_V    = 0.90;
const PHI_C    = 0.75;
const PHI_CONC = 0.90;
const PHI_VC   = 0.75;
const E_ACERO  = 2_000_000;
const G_ACERO  = E_ACERO / 2.6;
const GAMMA_CONC = 2400;

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================
function getProp(perfil, prop) {
  return (CATALOGO_AISC[perfil] && CATALOGO_AISC[perfil][prop]) || 0;
}
function getDeckProp(calibre, prop) {
  return (DECK_PROPS[calibre] && DECK_PROPS[calibre][prop]) || 0;
}

// AISC 360-16 Cap F: Pandeo lateral-torsional
function calcularMomentoNominalAISC(perfil, Lb, Cb = 1.0) {
  const Fy = getProp(perfil, 'Fy');
  const Zx = getProp(perfil, 'Zx');
  const Sx = getProp(perfil, 'Sx');
  const ry = getProp(perfil, 'ry');
  const J  = getProp(perfil, 'J');
  const Cw = getProp(perfil, 'Cw');
  const E  = E_ACERO;
  const rts = getProp(perfil, 'rts') || ry * 0.95;

  const Lp = 1.76 * ry * Math.sqrt(E / Fy);
  const term1 = Math.PI * rts * Math.sqrt(E / (0.7 * Fy));
  const term2 = Math.sqrt(1 + Math.sqrt(1 + 4 * 0.7 * Fy * J * Math.pow(Sx, 2) / (Math.pow(Math.PI * E, 2) * Cw)));
  const Lr = term1 * term2;

  const Mp = Fy * Zx;
  let Mn;
  if (Lb <= Lp) {
    Mn = Mp;
  } else if (Lb <= Lr) {
    Mn = Cb * (Mp - (Mp - 0.7 * Fy * Sx) * ((Lb - Lp) / (Lr - Lp)));
    Mn = Math.min(Mn, Mp);
  } else {
    const Fcr = (Cb * Math.pow(Math.PI, 2) * E) / Math.pow(Lb / rts, 2) *
                Math.sqrt(1 + 0.078 * J * Math.pow(Sx, 2) / (Cw * Math.pow(Lb / rts, 2)));
    Mn = Fcr * Sx;
    Mn = Math.min(Mn, Mp);
  }
  return { Mn, Mp, Lp, Lr, phiMn: PHI_B * Mn, zona: Lb <= Lp ? 1 : (Lb <= Lr ? 2 : 3) };
}

// AISC 360-16 Cap G: Cortante
function calcularCortanteNominalAISC(perfil) {
  const d  = getProp(perfil, 'd');
  const tw = getProp(perfil, 'tw');
  const tf = getProp(perfil, 'tf');
  const Fy = getProp(perfil, 'Fy');
  const E  = E_ACERO;
  const kv = 5.34;
  const h = d - 2 * tf;
  const h_tw = h / tw;
  let Cv2;
  const lim1 = 1.10 * Math.sqrt(kv * E / Fy);
  if (h_tw <= lim1) {
    Cv2 = 1.0;
  } else {
    const lim2 = 1.37 * Math.sqrt(kv * E / Fy);
    if (h_tw <= lim2) {
      Cv2 = 1.10 * Math.sqrt(kv * E / Fy) / h_tw;
    } else {
      Cv2 = 1.51 * kv * E / (Math.pow(h_tw, 2) * Fy);
    }
  }
  const Aw = d * tw;
  const Vn = 0.6 * Fy * Aw * Cv2;
  return { Vn, phiVn: PHI_V * Vn, h_tw, Cv2, Aw };
}

// AISC 360-16 App. 6: Arriostramiento lateral
function calcularArriostramiento(perfil, Lb_actual, Cb = 1.0) {
  const res = calcularMomentoNominalAISC(perfil, Lb_actual, Cb);
  const Lp = res.Lp;
  const Lr = res.Lr;
  const Lb_m = Lb_actual / 100;
  const Lp_m = Lp / 100;
  const Lr_m = Lr / 100;

  let recomendacion;
  let Lb_max;
  if (Lb_actual <= Lp) {
    recomendacion = 'No requiere arriostramiento intermedio (Zona plástica)';
    Lb_max = Lp_m;
  } else if (Lb_actual <= Lr) {
    recomendacion = `Arriostramiento recomendado cada ≤ ${Lp_m.toFixed(2)} m para Zona plástica`;
    Lb_max = Lp_m;
  } else {
    recomendacion = `Arriostramiento obligatorio cada ≤ ${Lr_m.toFixed(2)} m para evitar pandeo elástico`;
    Lb_max = Lr_m;
  }

  // Fuerza de arriostramiento (AISC 360 App. 6.3)
  // Pbr = 0.02 * Mf / h0 (aproximado)
  const Mf = res.phiMn;
  const h0 = getProp(perfil, 'd') - getProp(perfil, 'tf');
  const Pbr = 0.02 * Mf / h0;

  return {
    Lp_m, Lr_m, Lb_m,
    zona: res.zona,
    recomendacion,
    Lb_max_m: Lb_max,
    Pbr_kg: Pbr.toFixed(2),
    cumpleSinArriostre: Lb_actual <= Lp,
  };
}

// AISC 360-16 I3.2d: Factor R
function calcularFactorR(hr, Hs, Nc, wr) {
  const hr_in = hr / 2.54;
  const Hs_in = Hs / 2.54;
  const wr_in = wr / 2.54;
  let R;
  if (Nc === 1) {
    R = 0.85 * (wr_in / hr_in) * ((Hs_in / hr_in) - 1.0);
    R = Math.min(R, 1.0);
  } else {
    R = 0.6 * (wr_in / hr_in) * ((Hs_in / hr_in) - 1.0);
    R = Math.min(R, 0.75);
  }
  return Math.max(R, 0);
}

// AISC 360-16 I2: Qn
function calcularQnStud(f_c, Ec, Asc, Fu_stud, R = 1.0) {
  const Qn1 = 0.5 * Asc * Math.sqrt(f_c * Ec);
  const Qn2 = Asc * Fu_stud;
  const Qn_bruto = Math.min(Qn1, Qn2);
  const Qn = Qn_bruto * R;
  return { Qn, Qn_bruto, Qn1, Qn2, phiQn: PHI_C * Qn, R };
}

// AISC 360-16 App. 3: Fatiga de conectores
function verificarFatigaStuds(ciclos, Qn, Asc_stud, Fu_stud) {
  // AISC 360-16 App. 3.1: Solo aplica a estructuras con cargas cíclicas (puentes, grúst, etc.)
  // Para entrepisos estáticos esta verificación es INFORMATIVA, no normativa.
  // FTH = 7 ksi ≈ 492 kg/cm² es un límite de RANGO de esfuerzo cíclico, no el esfuerzo estático del stud.
  const FTH = 492; // kg/cm²
  const esfuerzo = Qn / Asc_stud; // Esfuerzo estático del conector (referencial)
  // Para edificios de uso normal, el check de fatiga no gobierna.
  // Se asume que el límite de ciclos de 2 millones no se alcanza en entrepisos típicos.
  const cumple = ciclos <= 20000; // Sólo es crítico para estructuras con más de 20,000 ciclos de carga
  const N = 2_000_000 * Math.pow(FTH / Math.max(esfuerzo, 1), 3);
  const vidaAnios = N / Math.max(ciclos, 1) / 365;
  return { esfuerzo, FTH, cumple, N: Math.floor(N), vidaAnios: vidaAnios.toFixed(1), esInformativa: true };
}

// ACI 318-19
function EcConcreto(f_c) { return 15000 * Math.sqrt(f_c); }
function calcularVcLosa(f_c, b_w, d_eff) {
  const Vc = 0.53 * Math.sqrt(f_c) * b_w * d_eff;
  return { Vc, phiVc: PHI_VC * Vc };
}
function calcularVcPunzonamiento(f_c, d_eff, b0) {
  const Vc = 0.33 * Math.sqrt(f_c) * b0 * d_eff;
  return { Vc, phiVc: PHI_VC * Vc };
}
function calcularAsMinLosa(h_sobre_deck_cm, b_ancho_cm = 100, fy_rebar = 4200) {
  // ACI 318-19 §24.4.3.2: Para losa colaborante (steel deck), el acero mínimo de temperatura y retracción
  // se aplica SOLO al espesor sobre la cresta del deck (h_sobre_deck), no al total.
  // La lamína colaborante actúa como armadura positiva (el deck es el acero de tracción).
  let rho_min = fy_rebar >= 4200 ? 0.0018 : (fy_rebar >= 2800 ? 0.0020 : 0.0014);
  return rho_min * b_ancho_cm * h_sobre_deck_cm;
}


// Deflexiones
function deflexionViga(w_kgcm, L_cm, E, I_cm4) {
  return (5 * w_kgcm * Math.pow(L_cm, 4)) / (384 * E * I_cm4);
}
function deflexionLosaDosDirecciones(w_kgm2, luz_m, E_kgcm2, h_m, nu = 0.2) {
  const E = E_kgcm2 * 10000;
  const D = (E * Math.pow(h_m, 3)) / (12 * (1 - nu * nu));
  return 0.00416 * w_kgm2 * Math.pow(luz_m, 4) / D;
}
function frecuenciaNaturalLosa(w_kgm2, luz_m, E_kgcm2, h_m) {
  const E = E_kgcm2 * 10000;
  const D = (E * Math.pow(h_m, 3)) / (12 * (1 - 0.04));
  const masa = w_kgm2 / 9.81;
  return (Math.PI / 2) * Math.sqrt(D / (masa * Math.pow(luz_m, 4)));
}

// Sección compuesta
function calcularSeccionCompuesta(perfil, b_eff_cm, h_conc_cm, f_c, Ec) {
  const n = E_ACERO / Ec;
  const b_transf = b_eff_cm / n;
  const prop = CATALOGO_AISC[perfil];
  if (!prop) return null;
  const A_acero = prop.A;
  const d_acero = prop.d;
  const I_acero = prop.Ix;
  const A_conc = b_transf * h_conc_cm;
  const y_conc = h_conc_cm / 2;
  const y_acero = h_conc_cm + d_acero / 2;
  const y_bar = (A_conc * y_conc + A_acero * y_acero) / (A_conc + A_acero);
  const I_conc = (b_transf * Math.pow(h_conc_cm, 3)) / 12;
  const d1 = y_bar - y_conc;
  const d2 = y_acero - y_bar;
  const I_tr = I_conc + A_conc * d1 * d1 + I_acero + A_acero * d2 * d2;
  const S_sup = I_tr / y_bar;
  const S_inf = I_tr / (h_conc_cm + d_acero - y_bar);
  return { n, b_transf, A_conc, A_acero, y_bar, I_tr, S_sup, S_inf, d_acero, h_conc_cm, b_eff_cm };
}

function calcularMomentoCompuesto(perfil, b_eff_cm, h_conc_cm, f_c, Ec, Asc_stud, Qn_total) {
  const prop = CATALOGO_AISC[perfil];
  if (!prop) return null;
  const Fy = prop.Fy;
  const Zx = prop.Zx;
  const A = prop.A;
  const d = prop.d;
  const P_acero = A * Fy;
  const P_conc = 0.85 * f_c * b_eff_cm * h_conc_cm;
  const P_studs = Qn_total;
  let PNA_tipo, a, Y2, Mn_comp, phiMn_comp;
  if (P_studs >= P_conc && P_conc >= P_acero) {
    PNA_tipo = 'En losa (acero totalmente en tracción)';
    a = P_acero / (0.85 * f_c * b_eff_cm);
    Y2 = h_conc_cm - a / 2;
    Mn_comp = P_acero * Y2 + P_acero * (d / 2);
  } else if (P_studs >= P_conc && P_conc < P_acero) {
    PNA_tipo = 'En el alma del acero';
    const P_tension = (P_acero - P_conc) / 2;
    const y_pna = P_tension / (prop.tw * Fy);
    Mn_comp = P_conc * (d / 2 + h_conc_cm - y_pna / 2) + P_tension * (d / 2 - y_pna / 2) * 2;
  } else {
    PNA_tipo = 'Limitado por conectores (parcialmente compuesta)';
    const P_comp = P_studs;
    a = P_comp / (0.85 * f_c * b_eff_cm);
    Y2 = h_conc_cm - a / 2;
    Mn_comp = P_comp * Y2 + P_acero * (d / 2);
  }
  phiMn_comp = PHI_B * Mn_comp;
  return { P_acero, P_conc, P_studs, PNA_tipo, a, Y2, Mn_comp, phiMn_comp, completa: P_studs >= Math.min(P_acero, P_conc) };
}

// =============================================================================
// OPTIMIZADOR AUTOMÁTICO DE PERFILES
// =============================================================================
function optimizarPerfil(listaPerfiles, Mu, Vu, Lb, wServ_kgcm, deflLim_cm, costoPorKg, tipo = 'viga', compData = null) {
  const candidatos = [];
  for (const perfil of listaPerfiles) {
    const resFlex = calcularMomentoNominalAISC(perfil, Lb, 1.14);
    let phiMn = resFlex.phiMn;
    
    let defl_comp_opt = null;
    if (compData) {
      const { b_eff, espesorConcreto, f_c_val, Ec } = compData;
      const P_acero = getProp(perfil, 'A') * getProp(perfil, 'Fy');
      const P_conc = 0.85 * f_c_val * b_eff * espesorConcreto;
      const P_studs = Math.min(P_acero, P_conc); // Full composite action assumed for optimization
      const capComp = calcularMomentoCompuesto(perfil, b_eff, espesorConcreto, f_c_val, Ec, 1.0, P_studs);
      if (capComp && capComp.phiMn_comp > phiMn) {
        phiMn = capComp.phiMn_comp;
      }
      const secComp = calcularSeccionCompuesta(perfil, b_eff, espesorConcreto, f_c_val, Ec);
      if (secComp) {
        defl_comp_opt = deflexionViga(wServ_kgcm, Lb, E_ACERO, secComp.I_tr);
      }
    }

    const resCort = calcularCortanteNominalAISC(perfil);
    const phiVn = resCort.phiVn;
    const Ix = getProp(perfil, 'Ix');
    const defl = deflexionViga(wServ_kgcm, Lb, E_ACERO, Ix);
    const deflFinal = defl_comp_opt !== null ? defl_comp_opt : defl;
    
    const peso = getProp(perfil, 'peso');
    const costo = peso * Lb / 100 * costoPorKg / 1000; // $ aproximado

    const cumpleFlex = Mu <= phiMn;
    const cumpleCort = Vu <= phiVn;
    const cumpleDefl = deflFinal <= deflLim_cm;
    const cumple = cumpleFlex && cumpleCort && cumpleDefl;

    candidatos.push({
      perfil, phiMn, phiVn, defl: deflFinal, peso, costo,
      cumpleFlex, cumpleCort, cumpleDefl, cumple,
      ratioFlex: (Mu / phiMn).toFixed(2),
      ratioCort: (Vu / phiVn).toFixed(2),
      ratioDefl: (deflFinal / deflLim_cm).toFixed(2),
    });
  }

  // Ordenar: primero los que cumplen, luego por menor costo
  candidatos.sort((a, b) => {
    if (a.cumple && !b.cumple) return -1;
    if (!a.cumple && b.cumple) return 1;
    return a.costo - b.costo;
  });

  const optimo = candidatos.find(c => c.cumple) || candidatos[0];
  return { optimo, candidatos };
}

// =============================================================================
// FUNCIÓN PRINCIPAL DE CÁLCULO
// =============================================================================
export function calcularLosaColaboranteNormativo(grid, datos, steelDeckConfig, costos) {
  const { filas, cols, luzX, luzY } = grid;
  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);
  const areaTotal = luzX * nTramosX * luzY * nTramosY;

  const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
  const esDosDirecciones = ratio <= 2;
  const luzMayor = Math.max(luzX, luzY);
  const luzMenor = Math.min(luzX, luzY);

  const {
    espesorConcreto, calibre, sepCorreas,
    tipoVigaPrincipal, tipoCorrea,
    diametroStud = 0.75, alturaDeck, f_c, fy_rebar,
    alturaStud, numStudsPorReborde, anchoReborde,
    ciclosFatiga = 100000,
  } = steelDeckConfig;

  // Espesor mínimo ACI 318-19: mínimo 5 cm sobre la cresta del deck (Sección 26.3.3)
  const espesorMinimoACI = 5.0; // cm
  const espesorConcreto_efectivo = Math.max(espesorConcreto, espesorMinimoACI);

  const h_total = (espesorConcreto_efectivo + alturaDeck) / 100;
  const h_cm = h_total * 100;
  const h_sobre_deck = espesorConcreto_efectivo;

  // Distribución real uniforme de correas
  const nEspacios = Math.ceil(luzMayor / sepCorreas);
  const sepReal = nEspacios > 0 ? luzMayor / nEspacios : sepCorreas;
  const nCorreasPerBay = Math.max(0, nEspacios - 1);

  // 1. CARGAS
  const pesoConcreto = (espesorConcreto_efectivo / 100) * GAMMA_CONC;
  const pesoDeck = getDeckProp(calibre, 'peso') || 9;
  const pesoCorreas = (getProp(tipoCorrea, 'peso') || 15) / sepReal;
  const pesoVigas = (getProp(tipoVigaPrincipal, 'peso') || 30) * (1 / luzX + 1 / luzY);
  const pesoPropio = pesoConcreto + pesoDeck + pesoCorreas + pesoVigas + 15;

  const wD = pesoPropio + (datos.cmExtra || 0);
  const wL = datos.cv || 0;
  const wu = 1.2 * wD + 1.6 * wL;
  const wServicio = wD + wL;
  const wViva = wL;

  // 2. CONCRETO
  const f_c_val = f_c || 210;
  const fy_rebar_val = fy_rebar || 4200;
  const Ec = EcConcreto(f_c_val);
  const n = E_ACERO / Ec;

  // 3. DECK CONSTRUCCIÓN
  const wConstruccion = pesoConcreto + 100;
  const luzDeck = sepReal;
  const luzDeck_cm = luzDeck * 100;
  const mConstruccion = (wConstruccion * luzDeck * luzDeck) / 8;
  const vConstruccion = (wConstruccion * luzDeck) / 2;
  const Mn_pos_deck = getDeckProp(calibre, 'Mn_pos');
  const Mn_neg_deck = getDeckProp(calibre, 'Mn_neg');
  const Vn_deck = getDeckProp(calibre, 'Vn');
  const phiMn_pos_deck = PHI_B * Mn_pos_deck;
  const phiMn_neg_deck = PHI_B * Mn_neg_deck;
  const phiVn_deck = PHI_V * Vn_deck;
  const cumpleDeckMomentoPos = mConstruccion <= phiMn_pos_deck;
  const cumpleDeckMomentoNeg = mConstruccion <= phiMn_neg_deck;
  const cumpleDeckCortante = vConstruccion <= phiVn_deck;
  const I_s = getDeckProp(calibre, 'I_s');
  const wCons_kgcm = wConstruccion / 100;
  const deflDeck = (5 * wCons_kgcm * Math.pow(luzDeck_cm, 4)) / (384 * E_ACERO * I_s);
  const deflLimDeck = luzDeck_cm / 180;
  const cumpleDeflDeck = deflDeck <= deflLimDeck;

  // 4. LOSA COMPUESTA
  const wuLosa = wu;
  const luzLosa = sepReal; // Steel deck spans 1-way between correas
  const luzLosa_cm = luzLosa * 100;
  // Aproximación de losa continua en una dirección (ACI 318)
  const mPosLosa = (wuLosa * luzLosa * luzLosa) / 14;
  const mNegExtLosa = (wuLosa * luzLosa * luzLosa) / 10;
  const mNegIntLosa = (wuLosa * luzLosa * luzLosa) / 10;

  // 5. CONECTORES - SIZING GEOMÉTRICO
  const d_stud_in = parseFloat(diametroStud) || 0.75;
  const d_stud_cm = d_stud_in * 2.54;
  const Asc_stud = (Math.PI * Math.pow(d_stud_cm, 2)) / 4;
  const Fu_stud = 4500;
  const hr = getDeckProp(calibre, 'hr') || 3.8;
  const Hs = alturaStud || 10;

  const Hs_min = hr + 3.81;
  const Hs_max = (espesorConcreto_efectivo + alturaDeck) - 1.27;
  const cumpleHs = Hs >= Hs_min && Hs <= Hs_max;
  const Hs_rec = Math.max(Hs_min, Math.min(Hs, Hs_max));

  const tf_vp = getProp(tipoVigaPrincipal, 'tf') || 1.0;
  const tf_correa = getProp(tipoCorrea, 'tf') || 0.8;
  const cumpleTf_vp = d_stud_cm <= 2.5 * tf_vp;
  const cumpleTf_correa = d_stud_cm <= 2.5 * tf_correa;

  // 6. SECCIÓN COMPUESTA - VIGA PRINCIPAL (VP)
  const luzVigaPrincipal_cm = luzMayor * 100;
  const b_eff_vp_1 = luzVigaPrincipal_cm / 4;
  const b_eff_vp_2 = 16 * espesorConcreto_efectivo + getProp(tipoVigaPrincipal, 'bf');
  const b_eff_vp_3 = luzMenor * 100;
  const b_eff_vp = Math.min(b_eff_vp_1, b_eff_vp_2, b_eff_vp_3);
  const secComp_vp = calcularSeccionCompuesta(tipoVigaPrincipal, b_eff_vp, espesorConcreto_efectivo, f_c_val, Ec);

  // REDUCCIÓN STUDS - VP (perpendicular deck)
  const Nc_vp = numStudsPorReborde || 1;
  const wr_vp = anchoReborde || 15;
  const R_vp = calcularFactorR(hr, Hs, Nc_vp, wr_vp);
  const resStud_vp = calcularQnStud(f_c_val, Ec, Asc_stud, Fu_stud, R_vp);
  const phiQn_vp = resStud_vp.phiQn;

  // VIGA PRINCIPAL - DEMANDA Y CAPACIDAD
  const wuVigaPrincipal = wu * luzMenor;
  const Mu_vp = (wuVigaPrincipal * Math.pow(luzVigaPrincipal_cm / 100, 2)) / 8 * 100;
  const Vu_vp = (wuVigaPrincipal * luzVigaPrincipal_cm / 100) / 2;
  const Lb_vp = luzVigaPrincipal_cm;

  const P_acero_vp = getProp(tipoVigaPrincipal, 'A') * getProp(tipoVigaPrincipal, 'Fy');
  const P_conc_vp = 0.85 * f_c_val * b_eff_vp * espesorConcreto_efectivo;
  const phiMn_steel_vp = PHI_B * getProp(tipoVigaPrincipal, 'Fy') * getProp(tipoVigaPrincipal, 'Zx');

  let P_studs_req_vp = 0;
  if (Mu_vp <= phiMn_steel_vp) {
    P_studs_req_vp = 0.25 * Math.min(P_acero_vp, P_conc_vp);
  } else {
    let low = 0.25 * Math.min(P_acero_vp, P_conc_vp);
    let high = Math.min(P_acero_vp, P_conc_vp);
    P_studs_req_vp = high;
    for (let iter = 0; iter < 15; iter++) {
      const mid = (low + high) / 2;
      const res = calcularMomentoCompuesto(tipoVigaPrincipal, b_eff_vp, espesorConcreto, f_c_val, Ec, Asc_stud, mid);
      if (res && res.phiMn_comp >= Mu_vp) {
        P_studs_req_vp = mid;
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  const N_half_vp = P_studs_req_vp / phiQn_vp;
  let N_total_vp = Math.ceil(2 * N_half_vp);
  if (N_total_vp % 2 !== 0) N_total_vp += 1;
  if (N_total_vp < 4) N_total_vp = 4;

  let s_vp = luzVigaPrincipal_cm / N_total_vp;
  const s_max = Math.min(8 * (espesorConcreto + alturaDeck), 90);
  const s_min = 6 * d_stud_cm;

  if (s_vp > s_max) {
    N_total_vp = Math.ceil(luzVigaPrincipal_cm / s_max);
    if (N_total_vp % 2 !== 0) N_total_vp += 1;
    s_vp = luzVigaPrincipal_cm / N_total_vp;
  }

  const capComp_vp = calcularMomentoCompuesto(tipoVigaPrincipal, b_eff_vp, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, N_total_vp * phiQn_vp);
  const phiMn_vp = capComp_vp ? capComp_vp.phiMn_comp : phiMn_steel_vp;
  const cumpleFlex_vp = Mu_vp <= phiMn_vp;

  const resCort_vp = calcularCortanteNominalAISC(tipoVigaPrincipal);
  const phiVn_vp = resCort_vp.phiVn;
  const cumpleCort_vp = Vu_vp <= phiVn_vp;

  const wServ_vp = wServicio * luzMenor / 100;
  const Ix_vp = getProp(tipoVigaPrincipal, 'Ix');
  // Deflexión: usar inercia compuesta (I_tr) si disponible; si no, acero solo
  const I_defl_vp = secComp_vp ? secComp_vp.I_tr : Ix_vp;
  const defl_vp = deflexionViga(wServ_vp, luzVigaPrincipal_cm, E_ACERO, I_defl_vp);
  const deflLim_vp = luzVigaPrincipal_cm / 360;
  const cumpleDefl_vp = defl_vp <= deflLim_vp;
  // Para deflexión compuesta usamos la misma (ya es compuesta)
  const defl_vp_comp = defl_vp;
  const cumpleDefl_vp_comp = cumpleDefl_vp;
  const resFlex_vp = calcularMomentoNominalAISC(tipoVigaPrincipal, Lb_vp, 1.14);
  const arriostre_vp = calcularArriostramiento(tipoVigaPrincipal, Lb_vp, 1.14);

  // 7. SECCIÓN COMPUESTA - CORREAS (Joists)
  const luzCorrea_cm = luzMenor * 100;
  const b_eff_correa_1 = luzCorrea_cm / 4;
  const b_eff_correa_2 = 16 * espesorConcreto_efectivo + getProp(tipoCorrea, 'bf');
  const b_eff_correa_3 = sepReal * 100;
  const b_eff_correa = Math.min(b_eff_correa_1, b_eff_correa_2, b_eff_correa_3);
  const secComp_correa = calcularSeccionCompuesta(tipoCorrea, b_eff_correa, espesorConcreto_efectivo, f_c_val, Ec);

  // REDUCCIÓN STUDS - Correa (parallel deck: R = 0.75)
  const resStud_correa = calcularQnStud(f_c_val, Ec, Asc_stud, Fu_stud, 0.75);
  const phiQn_correa = resStud_correa.phiQn;

  // CORREA - DEMANDA Y CAPACIDAD
  const wuCorrea = wu * sepReal;
  const Mu_correa = (wuCorrea * Math.pow(luzCorrea_cm / 100, 2)) / 8 * 100;
  const Vu_correa = (wuCorrea * luzCorrea_cm / 100) / 2;
  const Lb_correa = luzCorrea_cm;

  const P_acero_correa = getProp(tipoCorrea, 'A') * getProp(tipoCorrea, 'Fy');
  const P_conc_correa = 0.85 * f_c_val * b_eff_correa * espesorConcreto_efectivo;
  const phiMn_steel_correa = PHI_B * getProp(tipoCorrea, 'Fy') * getProp(tipoCorrea, 'Zx');

  let P_studs_req_correa = 0;
  if (Mu_correa <= phiMn_steel_correa) {
    P_studs_req_correa = 0.25 * Math.min(P_acero_correa, P_conc_correa);
  } else {
    let low = 0.25 * Math.min(P_acero_correa, P_conc_correa);
    let high = Math.min(P_acero_correa, P_conc_correa);
    P_studs_req_correa = high;
    for (let iter = 0; iter < 15; iter++) {
      const mid = (low + high) / 2;
      const res = calcularMomentoCompuesto(tipoCorrea, b_eff_correa, espesorConcreto, f_c_val, Ec, Asc_stud, mid);
      if (res && res.phiMn_comp >= Mu_correa) {
        P_studs_req_correa = mid;
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  const N_half_correa = P_studs_req_correa / phiQn_correa;
  let N_total_correa = Math.ceil(2 * N_half_correa);
  if (N_total_correa % 2 !== 0) N_total_correa += 1;
  if (N_total_correa < 4) N_total_correa = 4;

  let s_correa = luzCorrea_cm / N_total_correa;
  if (s_correa > s_max) {
    N_total_correa = Math.ceil(luzCorrea_cm / s_max);
    if (N_total_correa % 2 !== 0) N_total_correa += 1;
    s_correa = luzCorrea_cm / N_total_correa;
  }

  const capComp_correa = calcularMomentoCompuesto(tipoCorrea, b_eff_correa, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, N_total_correa * phiQn_correa);
  const phiMn_correa = capComp_correa ? capComp_correa.phiMn_comp : phiMn_steel_correa;
  const cumpleFlex_correa = Mu_correa <= phiMn_correa;

  const resCort_correa = calcularCortanteNominalAISC(tipoCorrea);
  const phiVn_correa = resCort_correa.phiVn;
  const cumpleCort_correa = Vu_correa <= phiVn_correa;

  const wServ_correa = wServicio * sepReal / 100;
  const Ix_correa = getProp(tipoCorrea, 'Ix');
  // Deflexión: usar inercia compuesta (I_tr) si disponible
  const I_defl_correa = secComp_correa ? secComp_correa.I_tr : Ix_correa;
  const defl_correa = deflexionViga(wServ_correa, luzCorrea_cm, E_ACERO, I_defl_correa);
  const deflLim_correa = luzCorrea_cm / 360;
  const cumpleDefl_correa = defl_correa <= deflLim_correa;
  const defl_correa_comp = defl_correa;
  const cumpleDefl_correa_comp = cumpleDefl_correa;
  const arriostre_correa = calcularArriostramiento(tipoCorrea, Lb_correa, 1.14);

  // 8. CÁLCULO DE CANTIDAD DE VIGAS Y CORREAS TOTALES PARA LA ESTRUCTURA
  const correasHorizontales = luzX < luzY;
  const numVigasPrincipales = correasHorizontales ? cols : filas;
  const numCorreas = (correasHorizontales ? nTramosY : nTramosX) * nCorreasPerBay;

  const numVPSpans = (correasHorizontales ? nTramosY : nTramosX) * numVigasPrincipales;
  const numCorreaSpans = nTramosX * nTramosY * nCorreasPerBay;

  const totalStuds = (N_total_vp * numVPSpans) + (N_total_correa * numCorreaSpans);
  const capacidadTotalStuds = (N_total_vp * phiQn_vp * numVPSpans) + (N_total_correa * phiQn_correa * numCorreaSpans);

  // 9. CORTANTE CONCRETO
  const bw = 100;
  const d_eff = h_cm - 2.5;
  const resVc = calcularVcLosa(f_c_val, bw, d_eff);
  const phiVc = resVc.phiVc;
  const Vu_losa = wuLosa * luzLosa / 2;
  const Vu_losa_cm = Vu_losa / 100;
  const cumpleVcLosa = Vu_losa_cm <= phiVc;
  const b0_punz = 4 * (getProp(tipoVigaPrincipal, 'bf') + d_eff);
  const resVcPunz = calcularVcPunzonamiento(f_c_val, d_eff, b0_punz);
  const phiVcPunz = resVcPunz.phiVc;
  const Vu_punz = wuLosa * luzLosa * luzLosa;
  const cumpleVcPunz = Vu_punz <= phiVcPunz;

  // 10. ACERO MÍNIMO - Solo sobre la cresta del deck (el deck mismo es la armadura de tracción)
  const As_min = calcularAsMinLosa(espesorConcreto_efectivo, 100, fy_rebar_val);
  const mallaTruskon = steelDeckConfig.mallaTruskon || 1.88; // cm²/m Truskon T-188
  const As_prov = mallaTruskon;
  const cumpleAsMin = As_prov >= As_min;

  // 11. DEFLEXIONES Y VIBRACIÓN
  const deflLosa = deflexionLosaDosDirecciones(wServicio, luzLosa, Ec, h_total);
  const deflLimLosa = luzLosa / 360;
  const cumpleDeflLosa = deflLosa <= deflLimLosa;
  const deflLosaViva = deflexionLosaDosDirecciones(wViva, luzLosa, Ec, h_total);
  const deflLimLosaViva = luzLosa / 480;
  const cumpleDeflLosaViva = deflLosaViva <= deflLimLosaViva;
  const f_natural = frecuenciaNaturalLosa(wServicio, luzLosa, Ec, h_total);
  const cumpleVibracion = f_natural >= 3.0;

  // 12. FATIGA DE CONECTORES
  const fatigaStuds = verificarFatigaStuds(ciclosFatiga, resStud_vp.Qn, Asc_stud, Fu_stud);

  // 13. OPTIMIZADOR
  const costoVigaKg = costos.vigaPrincipalKg || 2.5;
  const costoCorreaKg = costos.correaKg || 2.0;
  
  const compDataVP = { b_eff: b_eff_vp, espesorConcreto, f_c_val, Ec };
  const optViga = optimizarPerfil(PERFILES_I_H_TUBO, Mu_vp, Vu_vp, luzVigaPrincipal_cm, wServ_vp, deflLim_vp, costoVigaKg, 'viga', compDataVP);
  
  const compDataCorrea = { b_eff: b_eff_correa, espesorConcreto, f_c_val, Ec };
  const optCorrea = optimizarPerfil(PERFILES_I_H_TUBO, Mu_correa, Vu_correa, luzCorrea_cm, wServ_correa, deflLim_correa, costoCorreaKg, 'correa', compDataCorrea);
  
  const wuCorreaBorde = wu * sepReal / 2;
  const Mu_correa_borde = (wuCorreaBorde * Math.pow(luzCorrea_cm / 100, 2)) / 8 * 100;
  const Vu_correa_borde = (wuCorreaBorde * luzCorrea_cm / 100) / 2;
  const wServ_correa_borde = wServ_correa / 2;
  const optCorreaBorde = optimizarPerfil(PERFILES_I_H_TUBO, Mu_correa_borde, Vu_correa_borde, luzCorrea_cm, wServ_correa_borde, deflLim_correa, costoCorreaKg, 'correa', compDataCorrea);

  // 14. MATERIALES Y COSTOS
  const areaDeck = areaTotal * 1.15;
  const wr_deck = getDeckProp(calibre, 'wr') || 6.5;
  const Sr_deck = getDeckProp(calibre, 'Sr') || 15.24;
  const volConcreto = areaTotal * ((espesorConcreto_efectivo / 100) + (wr_deck / Sr_deck) * (hr / 100));
  const longVigasPrincipalesX = filas * (luzX * nTramosX);
  const longVigasPrincipalesY = cols * (luzY * nTramosY);
  const totalLengthCorreas = numCorreas * (correasHorizontales ? (luzX * nTramosX) : (luzY * nTramosY));
  const kgCorreas = (getProp(tipoCorrea, 'peso') || 15) * totalLengthCorreas;
  const kgVigas = (getProp(tipoVigaPrincipal, 'peso') || 30) * (longVigasPrincipalesX + longVigasPrincipalesY);
  const kgMalla = (0.142 / 10000) * areaTotal * 7850 * 1.1;

  const costoTotal =
    (volConcreto * (costos.concretoM3 || 0)) +
    (areaDeck * (costos.steelDeckM2 || 0)) +
    (kgMalla * (costos.aceroKg || 0)) +
    (kgCorreas * (costos.correaKg || 0)) +
    (kgVigas * (costos.vigaPrincipalKg || 0)) +
    (totalStuds * (costos.studUnd || 0));

  // 15. RESUMEN
  const verificaciones = {
    deckConstruccion: {
      descripcion: 'Deck en fase de construcción (AISC 360 I3)',
      momentoPos: { demanda: mConstruccion.toFixed(2), capacidad: phiMn_pos_deck.toFixed(2), cumple: cumpleDeckMomentoPos, ratio: (mConstruccion / phiMn_pos_deck).toFixed(2) },
      momentoNeg: { demanda: mConstruccion.toFixed(2), capacidad: phiMn_neg_deck.toFixed(2), cumple: cumpleDeckMomentoNeg, ratio: (mConstruccion / phiMn_neg_deck).toFixed(2) },
      cortante: { demanda: vConstruccion.toFixed(2), capacidad: phiVn_deck.toFixed(2), cumple: cumpleDeckCortante, ratio: (vConstruccion / phiVn_deck).toFixed(2) },
      deflexion: { demanda: deflDeck.toFixed(3), limite: deflLimDeck.toFixed(2), cumple: cumpleDeflDeck, ratio: (deflDeck / deflLimDeck).toFixed(2) },
      cumpleGlobal: cumpleDeckMomentoPos && cumpleDeckMomentoNeg && cumpleDeckCortante && cumpleDeflDeck,
    },
    seccionCompuesta: {
      descripcion: 'Sección compuesta – Transformada (AISC 360 I3)',
      anchoEfectivo: b_eff_vp.toFixed(1) + ' cm',
      n: n.toFixed(1),
      bTransformado: secComp_vp ? secComp_vp.b_transf.toFixed(2) + ' cm' : 'N/A',
      inerciaTransformada: secComp_vp ? secComp_vp.I_tr.toFixed(0) + ' cm⁴' : 'N/A',
      yBar: secComp_vp ? secComp_vp.y_bar.toFixed(2) + ' cm' : 'N/A',
      S_sup: secComp_vp ? secComp_vp.S_sup.toFixed(1) + ' cm³' : 'N/A',
      S_inf: secComp_vp ? secComp_vp.S_inf.toFixed(1) + ' cm³' : 'N/A',
    },
    momentoCompuesto: {
      descripcion: 'Momento resistente compuesto (AISC 360 I3)',
      P_acero: capComp_vp ? (capComp_vp.P_acero / 1000).toFixed(2) + ' t' : 'N/A',
      P_conc: capComp_vp ? (capComp_vp.P_conc / 1000).toFixed(2) + ' t' : 'N/A',
      P_studs: capComp_vp ? (capComp_vp.P_studs / 1000).toFixed(2) + ' t' : 'N/A',
      PNA: capComp_vp ? capComp_vp.PNA_tipo : 'N/A',
      a: capComp_vp ? capComp_vp.a.toFixed(2) + ' cm' : 'N/A',
      Y2: capComp_vp ? capComp_vp.Y2.toFixed(2) + ' cm' : 'N/A',
      Mn_comp: capComp_vp ? (capComp_vp.Mn_comp / 100000).toFixed(2) + ' t·m' : 'N/A',
      phiMn_comp: capComp_vp ? (capComp_vp.phiMn_comp / 100000).toFixed(2) + ' t·m' : 'N/A',
      completa: capComp_vp ? capComp_vp.completa : false,
    },
    vigaPrincipal: {
      descripcion: `Viga principal ${tipoVigaPrincipal} (AISC 360 Cap F/G)`,
      momento: { demanda: (Mu_vp / 100000).toFixed(2) + ' t·m', capacidad: (phiMn_vp / 100000).toFixed(2) + ' t·m', cumple: cumpleFlex_vp, ratio: (Mu_vp / phiMn_vp).toFixed(2) },
      cortante: { demanda: (Vu_vp / 1000).toFixed(2) + ' t', capacidad: (phiVn_vp / 1000).toFixed(2) + ' t', cumple: cumpleCort_vp, ratio: (Vu_vp / phiVn_vp).toFixed(2) },
      deflexion: { demanda: defl_vp.toFixed(2) + ' cm', limite: deflLim_vp.toFixed(2) + ' cm', cumple: cumpleDefl_vp, ratio: (defl_vp / deflLim_vp).toFixed(2) },
      deflexionCompuesta: { demanda: defl_vp_comp.toFixed(2) + ' cm', limite: deflLim_vp.toFixed(2) + ' cm', cumple: cumpleDefl_vp_comp, ratio: (defl_vp_comp / deflLim_vp).toFixed(2) },
      pandeo: { Lb: (Lb_vp / 100).toFixed(2) + ' m', Lp: (resFlex_vp.Lp / 100).toFixed(2) + ' m', Lr: (resFlex_vp.Lr / 100).toFixed(2) + ' m', zona: resFlex_vp.zona === 1 ? 'Zona 1 (Plástica)' : (resFlex_vp.zona === 2 ? 'Zona 2 (Inelástica)' : 'Zona 3 (Elástica)') },
      arriostramiento: arriostre_vp,
      cumpleGlobal: cumpleFlex_vp && cumpleCort_vp && cumpleDefl_vp && cumpleDefl_vp_comp,
    },
    correas: {
      descripcion: `Correas ${tipoCorrea} (AISC 360 Cap F/G)`,
      momento: { demanda: (Mu_correa / 100000).toFixed(2) + ' t·m', capacidad: (phiMn_correa / 100000).toFixed(2) + ' t·m', cumple: cumpleFlex_correa, ratio: (Mu_correa / phiMn_correa).toFixed(2) },
      cortante: { demanda: (Vu_correa / 1000).toFixed(2) + ' t', capacidad: (phiVn_correa / 1000).toFixed(2) + ' t', cumple: cumpleCort_correa, ratio: (Vu_correa / phiVn_correa).toFixed(2) },
      deflexion: { demanda: defl_correa.toFixed(2) + ' cm', limite: deflLim_correa.toFixed(2) + ' cm', cumple: cumpleDefl_correa, ratio: (defl_correa / deflLim_correa).toFixed(2) },
      deflexionCompuesta: { demanda: defl_correa_comp.toFixed(2) + ' cm', limite: deflLim_correa.toFixed(2) + ' cm', cumple: cumpleDefl_correa_comp, ratio: (defl_correa_comp / deflLim_correa).toFixed(2) },
      arriostramiento: arriostre_correa,
      cumpleGlobal: cumpleFlex_correa && cumpleCort_correa && cumpleDefl_correa && cumpleDefl_correa_comp,
    },
    conectoresCorte: {
      descripcion: 'Conectores de corte (AISC 360 I2 + I8)',
      diametroStud: d_stud_in + '" (' + (d_stud_cm * 10).toFixed(1) + ' mm)',
      alturaStud: Hs + ' cm',
      Hs_min: Hs_min.toFixed(2) + ' cm',
      Hs_max: Hs_max.toFixed(2) + ' cm',
      cumpleHs: cumpleHs,
      cumpleTf_vp: cumpleTf_vp,
      cumpleTf_correa: cumpleTf_correa,
      tf_vp: tf_vp.toFixed(2) + ' cm',
      tf_correa: tf_correa.toFixed(2) + ' cm',

      // VP
      Qn_vp: resStud_vp.Qn.toFixed(0) + ' kg',
      phiQn_vp: phiQn_vp.toFixed(0) + ' kg',
      N_total_vp: N_total_vp,
      s_vp: s_vp.toFixed(1) + ' cm',
      cumpleS_vp: s_vp >= s_min && s_vp <= s_max,
      s_max_vp: s_max.toFixed(1) + ' cm',
      s_min_vp: s_min.toFixed(1) + ' cm',
      P_acero_vp: (P_acero_vp / 1000).toFixed(1) + ' t',
      P_conc_vp: (P_conc_vp / 1000).toFixed(1) + ' t',
      ratio_vp: (capComp_vp ? (capComp_vp.P_studs / Math.min(P_acero_vp, P_conc_vp)) : 0).toFixed(2),

      // Correa
      Qn_correa: resStud_correa.Qn.toFixed(0) + ' kg',
      phiQn_correa: phiQn_correa.toFixed(0) + ' kg',
      N_total_correa: N_total_correa,
      s_correa: s_correa.toFixed(1) + ' cm',
      cumpleS_correa: s_correa >= s_min && s_correa <= s_max,
      s_max_correa: s_max.toFixed(1) + ' cm',
      s_min_correa: s_min.toFixed(1) + ' cm',
      P_acero_correa: (P_acero_correa / 1000).toFixed(1) + ' t',
      P_conc_correa: (P_conc_correa / 1000).toFixed(1) + ' t',
      ratio_correa: (capComp_correa ? (capComp_correa.P_studs / Math.min(P_acero_correa, P_conc_correa)) : 0).toFixed(2),

      totalStuds,
      capacidadTotal: capacidadTotalStuds.toFixed(0) + ' kg',
      cumple: cumpleHs && cumpleTf_vp && cumpleTf_correa && (s_vp >= s_min && s_vp <= s_max) && (s_correa >= s_min && s_correa <= s_max),
    },
    fatiga: {
      descripcion: 'Fatiga de conectores (AISC 360 App. 3)',
      ciclos: ciclosFatiga.toLocaleString(),
      esfuerzo: fatigaStuds.esfuerzo.toFixed(1) + ' kg/cm²',
      FTH: fatigaStuds.FTH + ' kg/cm²',
      cumple: fatigaStuds.cumple,
      vidaCiclos: fatigaStuds.N.toLocaleString(),
      vidaAnios: fatigaStuds.vidaAnios + ' años',
      ratio: (fatigaStuds.esfuerzo / fatigaStuds.FTH).toFixed(2),
    },
    losaConcreto: {
      descripcion: 'Losa de concreto (ACI 318 - Losa en 1 dirección)',
      momentoPos: { demanda: mPosLosa.toFixed(2) + ' kg·m/m', coef: '1/14' },
      momentoNegExt: { demanda: mNegExtLosa.toFixed(2) + ' kg·m/m', coef: '1/10' },
      momentoNegInt: { demanda: mNegIntLosa.toFixed(2) + ' kg·m/m', coef: '1/10' },
      cortante: { demanda: Vu_losa_cm.toFixed(2) + ' kg/cm', capacidad: phiVc.toFixed(2) + ' kg/cm', cumple: cumpleVcLosa, ratio: (Vu_losa_cm / phiVc).toFixed(2) },
      punzonamiento: { demanda: Vu_punz.toFixed(0) + ' kg', capacidad: phiVcPunz.toFixed(0) + ' kg', cumple: cumpleVcPunz, ratio: (Vu_punz / phiVcPunz).toFixed(2) },
      asMinimo: { requerido: As_min.toFixed(3) + ' cm²/m', provisto: As_prov.toFixed(3) + ' cm²/m', cumple: cumpleAsMin },
      deflexion: { demanda: (deflLosa * 100).toFixed(2) + ' cm', limite: (deflLimLosa * 100).toFixed(2) + ' cm', cumple: cumpleDeflLosa, ratio: (deflLosa / deflLimLosa).toFixed(2) },
      deflexionViva: { demanda: (deflLosaViva * 100).toFixed(2) + ' cm', limite: (deflLimLosaViva * 100).toFixed(2) + ' cm', cumple: cumpleDeflLosaViva, ratio: (deflLosaViva / deflLimLosaViva).toFixed(2) },
      vibracion: { frecuencia: f_natural.toFixed(2) + ' Hz', limite: '3.0 Hz', cumple: cumpleVibracion },
      cumpleGlobal: cumpleVcLosa && cumpleVcPunz && cumpleAsMin && cumpleDeflLosa && cumpleDeflLosaViva && cumpleVibracion,
    },
    correaBorde: {
      descripcion: `Correa de Borde (AISC 360) - Mitad de carga tributaria`,
      momento: { demanda: (Mu_correa_borde / 100000).toFixed(2) + ' t·m' },
      optimo: optCorreaBorde.optimo.perfil,
      cumpleGlobal: optCorreaBorde.optimo.cumple,
    },
  };

  const cumpleGlobal = verificaciones.deckConstruccion.cumpleGlobal &&
                       verificaciones.vigaPrincipal.cumpleGlobal &&
                       verificaciones.correas.cumpleGlobal &&
                       verificaciones.conectoresCorte.cumple &&
                       verificaciones.losaConcreto.cumpleGlobal;

  return {
    h: h_total.toFixed(2),
    pesoPropio: pesoPropio.toFixed(0),
    wu: wu.toFixed(2),
    wServicio: wServicio.toFixed(2),
    maxMomentoX: mPosLosa.toFixed(2),
    maxMomentoY: mNegIntLosa.toFixed(2),
    As_min: As_min.toFixed(3) + ' cm²/m',
    volConcreto: volConcreto.toFixed(2),
    kgAcero: (kgMalla + kgCorreas + kgVigas).toFixed(0),
    numBloques: totalStuds,
    costoTotal: costoTotal.toFixed(2),
    costoM2: (costoTotal / areaTotal).toFixed(2),
    cumpleGlobal,
    verificaciones,
    optimizador: { viga: optViga, correa: optCorrea },
    steelDeckData: {
      espesorConcreto: espesorConcreto_efectivo, espesorMinimo: espesorMinimoACI, calibre, sepCorreas, sepReal, tipoVigaPrincipal, tipoCorrea,
      diametroStud, alturaDeck, f_c: f_c_val, fy_rebar: fy_rebar_val,
      mConstruccion, vConstruccion, phiMn_pos_deck, phiMn_neg_deck, phiVn_deck,
      mPosLosa, mNegExtLosa, mNegIntLosa,
      totalStuds, phiQn: phiQn_vp, capacidadTotalStuds, R: R_vp,
      kgCorreas, kgVigas, kgMalla, areaDeck,
      longVigasPrincipalesX, longVigasPrincipalesY,
      Mu_vp, phiMn_vp, Vu_vp, phiVn_vp, defl_vp, deflLim_vp,
      Mu_correa, phiMn_correa, Vu_correa, phiVn_correa, defl_correa, deflLim_correa,
      As_min, As_prov, phiVc, Vu_losa_cm, cumpleVcLosa,
      secComp: secComp_vp, resComp: capComp_vp, f_natural, fatigaStuds,
      arriostre_vp, arriostre_correa,
    },
  };
}

// =============================================================================
// COMPONENTE REACT PROFESIONAL
// =============================================================================
export default function LosaColaborante({ steelDeckConfig, onConfigChange, grid, datos, costos }) {
  const [tabActivo, setTabActivo] = useState('general');
  const [normParams, setNormParams] = useState({
    f_c: 210, fy_rebar: 4200, alturaStud: 15,
    numStudsPorReborde: 1, anchoReborde: 15, ciclosFatiga: 100000,
    mallaTruskon: 1.88, // cm²/m - Malla Truskon T-188 por defecto
  });

  const handleNormChange = (e) => {
    const { name, value } = e.target;
    setNormParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const resultados = useMemo(() => {
    if (!grid || !datos || !costos) return null;
    const config = { ...steelDeckConfig, ...normParams };
    return calcularLosaColaboranteNormativo(grid, datos, config, costos);
  }, [grid, datos, steelDeckConfig, costos, normParams]);

  const theme = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#ca8a04',
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
  };

  const styles = {
    container: { fontFamily: '"Inter", system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto', padding: '24px', background: theme.bg, minHeight: '100vh' },
    mainLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' },
    header: { marginBottom: '24px' },
    title: { fontSize: '22px', fontWeight: 700, color: theme.text, margin: '0 0 4px 0' },
    subtitle: { fontSize: '13px', color: theme.textMuted, margin: 0 },
    card: { background: theme.card, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${theme.border}`, padding: '20px', marginBottom: '16px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
    input: { width: '100%', padding: '8px 10px', border: `1px solid ${theme.border}`, borderRadius: '8px', fontSize: '13px', background: '#fff', transition: 'border 0.2s', boxSizing: 'border-box' },
    label: { fontSize: '12px', fontWeight: 600, color: theme.textMuted, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.3px' },
    tabs: { display: 'flex', gap: '2px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' },
    tab: (active) => ({
      padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      background: active ? theme.card : 'transparent', color: active ? theme.primary : theme.textMuted,
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s',
    }),
    badge: (ok) => ({
      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      background: ok ? '#dcfce7' : '#fee2e2', color: ok ? theme.success : theme.danger, border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
    }),
    progressBar: (ratio) => {
      const pct = Math.min(parseFloat(ratio) * 100, 100);
      const color = pct < 60 ? theme.success : pct < 90 ? theme.warning : theme.danger;
      return { height: '6px', width: '100%', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' };
    },
    progressFill: (ratio) => {
      const pct = Math.min(parseFloat(ratio) * 100, 100);
      const color = pct < 60 ? '#22c55e' : pct < 90 ? '#eab308' : '#ef4444';
      return { height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s ease' };
    },
    verifRow: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.border}`, fontSize: '13px' },
    verifLabel: { flex: 1.5, color: theme.text, fontWeight: 500 },
    verifValue: { flex: 1, textAlign: 'center', color: theme.textMuted, fontSize: '12px', fontFamily: 'monospace' },
    verifRatio: { flex: 0.8, textAlign: 'center' },
    verifStatus: { flex: 0.5, textAlign: 'center' },
    infoCard: { padding: '14px', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${theme.border}` },
    infoTitle: { margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: theme.text },
    infoRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', borderBottom: `1px solid ${theme.border}` },
    infoLabel: { color: theme.textMuted },
    infoValue: { color: theme.text, fontWeight: 600, fontFamily: 'monospace' },
    alert: { padding: '14px 16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '10px', fontSize: '12px', color: '#713f12', lineHeight: 1.6, marginTop: '16px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th: { textAlign: 'left', padding: '8px', borderBottom: `2px solid ${theme.border}`, color: theme.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' },
    td: { padding: '8px', borderBottom: `1px solid ${theme.border}`, color: theme.text },
  };

  const verifRow = (label, demanda, capacidad, cumple, ratio, extra = null) => (
    <div style={styles.verifRow}>
      <span style={styles.verifLabel}>{label}</span>
      <span style={styles.verifValue}>{demanda}</span>
      <span style={styles.verifValue}>{capacidad}</span>
      <span style={styles.verifValue}>{ratio}</span>
      <span style={styles.verifStatus}><span style={styles.badge(cumple)}>{cumple ? '✓ OK' : '✗ FAIL'}</span></span>
      {extra && <span style={{ flex: 1.2, textAlign: 'right', color: theme.textMuted, fontSize: '11px' }}>{extra}</span>}
    </div>
  );

  const infoCard = (title, items) => (
    <div style={styles.infoCard}>
      <h6 style={styles.infoTitle}>{title}</h6>
      {items.map(([label, value], i) => (
        <div key={i} style={{ ...styles.infoRow, borderBottom: i < items.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
          <span style={styles.infoLabel}>{label}</span>
          <span style={styles.infoValue}>{value}</span>
        </div>
      ))}
    </div>
  );

  const progressBar = (ratio) => (
    <div style={styles.progressBar(ratio)}>
      <div style={styles.progressFill(ratio)} />
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'deck', label: 'Deck' },
    { id: 'compuesta', label: 'Compuesta' },
    { id: 'vigas', label: 'Vigas' },
    { id: 'conectores', label: 'Studs' },
    { id: 'fatiga', label: 'Fatiga' },
    { id: 'losa', label: 'Losa' },
    { id: 'optimizador', label: 'Optimizador' },
    { id: 'costos', label: 'Costos' },
  ];

  const exportarPDF = () => {
    if (!resultados) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Memoria de Cálculo - Losa Colaborante</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            h1, h2 { color: #1a252f; border-bottom: 2px solid #34495e; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f6f7; }
            .badge-ok { color: #27ae60; font-weight: bold; }
            .badge-fail { color: #c0392b; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Memoria de Cálculo: Losa Colaborante Steel Deck</h1>
          
          <h2>1. Datos de Entrada</h2>
          <table>
            <tr><th>Paño a evaluar (Luz X / Luz Y)</th><td>${grid.luzX} m x ${grid.luzY} m</td></tr>
            <tr><th>Carga Viva</th><td>${datos.cv} kg/m²</td></tr>
            <tr><th>Carga Muerta Extra</th><td>${datos.cmExtra} kg/m²</td></tr>
            <tr><th>f'c Concreto</th><td>${normParams.f_c || 210} kg/cm²</td></tr>
            <tr><th>Calibre Deck</th><td>${steelDeckConfig.calibre}</td></tr>
            <tr><th>Espesor Losa (sobre deck)</th><td>${steelDeckConfig.espesorConcreto} cm</td></tr>
          </table>

          <h2>2. Resultados Generales y Volúmenes</h2>
          <table>
            <tr><th>Espesor Total de Losa (h)</th><td>${resultados.h} m</td></tr>
            <tr><th>Volumen Concreto Estimado</th><td>${resultados.volConcreto} m³</td></tr>
            <tr><th>Peso Acero (Vigas+Correas+Malla)</th><td>${resultados.kgAcero} kg</td></tr>
            <tr><th>Studs Requeridos</th><td>${resultados.numBloques} unidades</td></tr>
            <tr><th>Costo Total Estimado</th><td>$${resultados.costoTotal} ($${resultados.costoM2}/m²)</td></tr>
          </table>

          <h2>3. Verificaciones Estructurales (AISC 360-16 / ACI 318-19)</h2>
          <table>
            <tr>
              <th>Elemento / Revisión</th>
              <th>Demanda</th>
              <th>Capacidad / Límite</th>
              <th>Estado</th>
            </tr>
            <tr>
              <td>Viga Principal - ${steelDeckConfig.tipoVigaPrincipal}</td>
              <td>
                M: ${resultados.verificaciones.vigaPrincipal.momento.demanda}<br/>
                V: ${resultados.verificaciones.vigaPrincipal.cortante.demanda}<br/>
                Defl: ${resultados.verificaciones.vigaPrincipal.deflexion.demanda}<br/>
                Defl (Comp): ${resultados.verificaciones.vigaPrincipal.deflexionCompuesta.demanda}
              </td>
              <td>
                M: ${resultados.verificaciones.vigaPrincipal.momento.capacidad}<br/>
                V: ${resultados.verificaciones.vigaPrincipal.cortante.capacidad}<br/>
                Lim: ${resultados.verificaciones.vigaPrincipal.deflexion.limite}<br/>
                Lim: ${resultados.verificaciones.vigaPrincipal.deflexionCompuesta.limite}
              </td>
              <td class="${resultados.verificaciones.vigaPrincipal.cumpleGlobal ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.vigaPrincipal.cumpleGlobal ? 'CUMPLE' : 'Falla V/M/Defl'}
              </td>
            </tr>
            <tr>
              <td>Correa Típica - ${steelDeckConfig.tipoCorrea}</td>
              <td>
                M: ${resultados.verificaciones.correas.momento.demanda}<br/>
                V: ${resultados.verificaciones.correas.cortante.demanda}<br/>
                Defl: ${resultados.verificaciones.correas.deflexion.demanda}<br/>
                Defl (Comp): ${resultados.verificaciones.correas.deflexionCompuesta.demanda}
              </td>
              <td>
                M: ${resultados.verificaciones.correas.momento.capacidad}<br/>
                V: ${resultados.verificaciones.correas.cortante.capacidad}<br/>
                Lim: ${resultados.verificaciones.correas.deflexion.limite}<br/>
                Lim: ${resultados.verificaciones.correas.deflexionCompuesta.limite}
              </td>
              <td class="${resultados.verificaciones.correas.cumpleGlobal ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.correas.cumpleGlobal ? 'CUMPLE' : 'Falla V/M/Defl'}
              </td>
            </tr>
            <tr>
              <td>Correa de Borde (Mitad de área) - ${resultados.verificaciones.correaBorde?.optimo || 'N/A'}</td>
              <td>${resultados.verificaciones.correaBorde?.momento?.demanda || 'N/A'}</td>
              <td>-</td>
              <td class="${resultados.verificaciones.correaBorde?.cumpleGlobal ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.correaBorde?.cumpleGlobal ? 'CUMPLE' : 'NO CUMPLE'}
              </td>
            </tr>
            <tr>
              <td>Conectores de Corte (Studs)</td>
              <td>${resultados.numBloques} requeridos</td>
              <td>-</td>
              <td class="${resultados.verificaciones.conectoresCorte.cumple ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.conectoresCorte.cumple ? 'CUMPLE' : 'NO CUMPLE'}
              </td>
            </tr>
            <tr>
              <td>Losa Concreto (Flexión Positiva)</td>
              <td>${resultados.verificaciones.losaConcreto.momentoPos.demanda}</td>
              <td>-</td>
              <td class="badge-ok">OK</td>
            </tr>
            <tr>
              <td>Fatiga de Conectores (AISC App 3)</td>
              <td>${resultados.verificaciones.fatiga.esfuerzo}</td>
              <td>Límite: ${resultados.verificaciones.fatiga.FTH}</td>
              <td class="${resultados.verificaciones.fatiga.cumple ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.fatiga.cumple ? 'CUMPLE' : 'NO CUMPLE'}
              </td>
            </tr>
          </table>

          <p style="margin-top: 40px; font-size: 11px; color: #7f8c8d; text-align: center;">
            Documento generado por Calculadora Arko360. Este pre-dimensionamiento normativo (ACI/AISC) no sustituye el diseño detallado ni la firma de un ingeniero estructural calificado.
          </p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  return (
    <div style={styles.container}>
      <div style={{...styles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <h2 style={styles.title}>Losa Colaborante Steel Deck</h2>
          <p style={styles.subtitle}>Pre-dimensionamiento normativo ACI 318-19 · AISC 360-16 LRFD · Fatiga · Optimización</p>
        </div>
        <button 
          onClick={exportarPDF}
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
        >
          📄 Exportar Memoria
        </button>
      </div>

      <div style={styles.mainLayout}>
        {/* PANEL IZQUIERDO: CONFIGURACIÓN Y RESULTADOS */}
        <div>
          {/* CONFIGURACIÓN */}
          <div style={styles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>⚙️ Configuración</h3>
        <div style={styles.grid4}>
          {[
            ['espesorConcreto', 'Espesor concreto (cm)', 'number', 0.5, 4, 25],
            ['calibre', 'Calibre deck', 'select-deck', null, null, null],
            ['sepCorreas', 'Separación real correas (m)', 'number', 0.1, 0.9, 3.0],
            ['alturaDeck', 'Altura deck (cm)', 'number', 0.5, 5, 15],
            ['tipoVigaPrincipal', 'Viga principal', 'select-w', null, null, null],
            ['tipoCorrea', 'Correa', 'select-c', null, null, null],
            ['diametroStud', 'Diámetro stud', 'select-ds', null, null, null],
            ['mallaTruskon', 'Malla Truskon', 'select-malla', null, null, null],
            ['f_c', "f'c (kg/cm²)", 'number', 10, 140, 420],
            ['fy_rebar', 'fy rebar (kg/cm²)', 'number', 100, 2800, 6000],
            ['alturaStud', 'Altura stud (cm)', 'number', 1, 10, 25],
            ['numStudsPorReborde', 'Studs/reborde', 'select-nc', null, null, null],
            ['anchoReborde', 'Ancho reborde (cm)', 'number', 1, 10, 25],
            ['ciclosFatiga', 'Ciclos fatiga', 'number', 1000, 1000, 10000000],
          ].map(([name, label, type, step, min, max]) => (
            <div key={name}>
              <label style={styles.label}>{label}</label>
              {type === 'select-deck' ? (
                <select name="calibre" value={steelDeckConfig.calibre} onChange={onConfigChange} style={styles.input}>
                  <option value="22">22 (7.3 kg/m²)</option>
                  <option value="20">20 (9.1 kg/m²)</option>
                  <option value="18">18 (11.4 kg/m²)</option>
                  <option value="16">16 (14.6 kg/m²)</option>
                </select>
              ) : type === 'select-w' ? (
                <select name="tipoVigaPrincipal" value={steelDeckConfig.tipoVigaPrincipal} onChange={onConfigChange} style={styles.input}>
                  {PERFILES_I_H_TUBO.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : type === 'select-c' ? (
                <select name="tipoCorrea" value={steelDeckConfig.tipoCorrea} onChange={onConfigChange} style={styles.input}>
                  {PERFILES_I_H_TUBO.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : type === 'select-ds' ? (
                <select name="diametroStud" value={steelDeckConfig.diametroStud || 0.75} onChange={onConfigChange} style={styles.input}>
                  <option value="0.5">1/2" (12.7 mm)</option>
                  <option value="0.625">5/8" (15.9 mm)</option>
                  <option value="0.75">3/4" (19.1 mm)</option>
                  <option value="0.875">7/8" (22.2 mm)</option>
                </select>
              ) : type === 'select-nc' ? (
                <select name="numStudsPorReborde" value={normParams.numStudsPorReborde} onChange={handleNormChange} style={styles.input}>
                  <option value={1}>1 stud/reborde</option>
                  <option value={2}>2 studs/reborde</option>
                </select>
              ) : type === 'select-malla' ? (
                <select name="mallaTruskon" value={normParams.mallaTruskon} onChange={handleNormChange} style={styles.input}>
                  <option value="0.97">Truskon T-97 (0.97 cm²/m)</option>
                  <option value="1.42">Truskon T-142 (1.42 cm²/m)</option>
                  <option value="1.59">Truskon T-159 (1.59 cm²/m)</option>
                  <option value="1.88">Truskon T-188 (1.88 cm²/m)</option>
                  <option value="2.57">Truskon T-257 (2.57 cm²/m)</option>
                  <option value="3.55">Truskon T-355 (3.55 cm²/m)</option>
                  <option value="5.11">Truskon T-511 (5.11 cm²/m)</option>
                </select>
              ) : (
                <input type="number" name={name} value={type === 'number' && name in steelDeckConfig ? steelDeckConfig[name] : normParams[name]} onChange={name in steelDeckConfig ? onConfigChange : handleNormChange} step={step} min={min} max={max} style={styles.input} />
              )}
            </div>
          ))}
        </div>
        {steelDeckConfig.espesorConcreto < 5 && (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '12px', color: '#856404' }}>
            ⚠️ <strong>Espesor mínimo ACI:</strong> El espesor ingresado ({steelDeckConfig.espesorConcreto} cm) es menor al mínimo normativo de <strong>5 cm</strong> sobre la cresta del deck (ACI 318-19 §26.3.3). Se calcula automáticamente con <strong>5 cm</strong>.
          </div>
        )}
      </div>

      {/* SVG SECCIÓN TRANSVERSAL Y ADVERTENCIA REUBICADOS */}
      {resultados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
          {renderSeccion(resultados, 'colaborante', steelDeckConfig, null)}
          <div style={styles.alert}>
            <strong>⚠️ Advertencia Normativa:</strong> Esta herramienta realiza verificaciones de pre-dimensionamiento basadas en ACI 318-19 y AISC 360-16 (LRFD). Incluye: método de la transformada para sección compuesta, factor de reducción R de conectores (AISC I3.2d), pandeo lateral-torsional con arriostramiento (AISC Cap. F / App. 6), cortante del concreto y punzonamiento (ACI 318), deflexiones en servicio, vibración y fatiga de conectores (AISC App. 3). <strong>No sustituye el diseño estructural detallado</strong> ni la supervisión de un ingeniero estructural calificado.
          </div>
        </div>
      )}

      {/* RESULTADOS */}
      {resultados && (
        <div style={styles.card}>
          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: `2px solid ${theme.border}` }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: theme.text }}>📋 Resumen Normativo</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: theme.textMuted }}>
                φb=0.90 · φv=0.90 · φc=0.75 · φconc=0.90 · φVc=0.75
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: theme.textMuted }}>Estado global:</span>
              <span style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                background: resultados.cumpleGlobal ? '#dcfce7' : '#fee2e2',
                color: resultados.cumpleGlobal ? theme.success : theme.danger,
                border: `1px solid ${resultados.cumpleGlobal ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {resultados.cumpleGlobal ? '✓ CUMPLE TODAS' : '✗ NO CUMPLE'}
              </span>
            </div>
          </div>

          {/* TABS */}
          <div style={styles.tabs}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTabActivo(t.id)} style={styles.tab(tabActivo === t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB: GENERAL */}
          {tabActivo === 'general' && (
            <div style={styles.grid3}>
              {infoCard('Cargas', [
                ['Peso propio', resultados.pesoPropio + ' kg/m²'],
                ['wD permanente', resultados.wu + ' kg/m²'],
                ['wL viva', (datos.cv || 0).toFixed(2) + ' kg/m²'],
                ['wu última', resultados.wu + ' kg/m²'],
                ['w servicio', resultados.wServicio + ' kg/m²'],
              ])}
              {infoCard('Geometría', [
                ['Luz mayor', Math.max(grid.luzX, grid.luzY).toFixed(2) + ' m'],
                ['Luz menor', Math.min(grid.luzX, grid.luzY).toFixed(2) + ' m'],
                ['Ratio luz', (Math.max(grid.luzX, grid.luzY) / Math.min(grid.luzX, grid.luzY)).toFixed(2)],
                ['Área total', (grid.luzX * Math.max(grid.cols - 1, 1) * grid.luzY * Math.max(grid.filas - 1, 1)).toFixed(2) + ' m²'],
              ])}
              {infoCard('Estado por elemento', [
                ['Deck construcción', resultados.verificaciones.deckConstruccion.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                ['Viga principal', resultados.verificaciones.vigaPrincipal.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                ['Correas', resultados.verificaciones.correas.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                ['Conectores', resultados.verificaciones.conectoresCorte.cumple ? '✓ OK' : '✗ FAIL'],
                ['Losa concreto', resultados.verificaciones.losaConcreto.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
              ])}
            </div>
          )}

          {/* TAB: DECK */}
          {tabActivo === 'deck' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>{resultados.verificaciones.deckConstruccion.descripcion}</span>
              </div>
              {verifRow('Momento (+)', resultados.verificaciones.deckConstruccion.momentoPos.demanda, resultados.verificaciones.deckConstruccion.momentoPos.capacidad, resultados.verificaciones.deckConstruccion.momentoPos.cumple, resultados.verificaciones.deckConstruccion.momentoPos.ratio)}
              {verifRow('Momento (-)', resultados.verificaciones.deckConstruccion.momentoNeg.demanda, resultados.verificaciones.deckConstruccion.momentoNeg.capacidad, resultados.verificaciones.deckConstruccion.momentoNeg.cumple, resultados.verificaciones.deckConstruccion.momentoNeg.ratio)}
              {verifRow('Cortante', resultados.verificaciones.deckConstruccion.cortante.demanda, resultados.verificaciones.deckConstruccion.cortante.capacidad, resultados.verificaciones.deckConstruccion.cortante.cumple, resultados.verificaciones.deckConstruccion.cortante.ratio)}
              {verifRow('Deflexión', resultados.verificaciones.deckConstruccion.deflexion.demanda, resultados.verificaciones.deckConstruccion.deflexion.limite, resultados.verificaciones.deckConstruccion.deflexion.cumple, resultados.verificaciones.deckConstruccion.deflexion.ratio)}
              <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: theme.textMuted, lineHeight: 1.5 }}>
                <strong style={{ color: theme.text }}>Nota técnica:</strong> Verificación en fase de construcción según AISC 360 Cap. I3. El deck actúa como encofrado permanente. Carga de construcción = peso del concreto húmedo + 100 kg/m² de sobrecarga de trabajo.
              </div>
            </div>
          )}

          {/* TAB: COMPUESTA */}
          {tabActivo === 'compuesta' && (
            <div style={styles.grid2}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Sección transformada</h4>
                {infoCard('', [
                  ['Ancho efectivo (beff)', resultados.verificaciones.seccionCompuesta.anchoEfectivo],
                  ['Módulo modular (n)', resultados.verificaciones.seccionCompuesta.n],
                  ['Ancho transformado', resultados.verificaciones.seccionCompuesta.bTransformado],
                  ['Inercia transformada (Itr)', resultados.verificaciones.seccionCompuesta.inerciaTransformada],
                  ['Centroide (ȳ)', resultados.verificaciones.seccionCompuesta.yBar],
                  ['Módulo sección sup. (S+)', resultados.verificaciones.seccionCompuesta.S_sup],
                  ['Módulo sección inf. (S−)', resultados.verificaciones.seccionCompuesta.S_inf],
                ])}
              </div>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Momento resistente compuesto</h4>
                {infoCard('', [
                  ['Fuerza plástica acero (Py)', resultados.verificaciones.momentoCompuesto.P_acero],
                  ['Fuerza plástica concreto (Cc)', resultados.verificaciones.momentoCompuesto.P_conc],
                  ['Fuerza transferible studs (ΣQn)', resultados.verificaciones.momentoCompuesto.P_studs],
                  ['PNA', resultados.verificaciones.momentoCompuesto.PNA],
                  ['Bloque compresión (a)', resultados.verificaciones.momentoCompuesto.a],
                  ['Distancia PNA (Y2)', resultados.verificaciones.momentoCompuesto.Y2],
                  ['Mn compuesta', resultados.verificaciones.momentoCompuesto.Mn_comp],
                  ['φMn compuesta', resultados.verificaciones.momentoCompuesto.phiMn_comp],
                ])}
                <div style={{ marginTop: '10px', padding: '10px', background: '#eff6ff', borderRadius: '8px', fontSize: '12px', color: '#1e40af' }}>
                  <strong>Tipo de compuesta:</strong> {resultados.verificaciones.momentoCompuesto.completa ? 'Sección completamente compuesta' : 'Sección parcialmente compuesta (limitada por studs)'}
                </div>
              </div>
            </div>
          )}

          {/* TAB: VIGAS */}
          {tabActivo === 'vigas' && (
            <div>
              {/* VIGA PRINCIPAL */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>
                {resultados.verificaciones.vigaPrincipal.descripcion}
              </h4>
              {verifRow('Momento', resultados.verificaciones.vigaPrincipal.momento.demanda, resultados.verificaciones.vigaPrincipal.momento.capacidad, resultados.verificaciones.vigaPrincipal.momento.cumple, resultados.verificaciones.vigaPrincipal.momento.ratio)}
              <div style={{ padding: '0 0 10px 20px' }}>{progressBar(resultados.verificaciones.vigaPrincipal.momento.ratio)}</div>
              {verifRow('Cortante', resultados.verificaciones.vigaPrincipal.cortante.demanda, resultados.verificaciones.vigaPrincipal.cortante.capacidad, resultados.verificaciones.vigaPrincipal.cortante.cumple, resultados.verificaciones.vigaPrincipal.cortante.ratio)}
              {verifRow('Deflexión acero', resultados.verificaciones.vigaPrincipal.deflexion.demanda, resultados.verificaciones.vigaPrincipal.deflexion.limite, resultados.verificaciones.vigaPrincipal.deflexion.cumple, resultados.verificaciones.vigaPrincipal.deflexion.ratio)}
              {verifRow('Deflexión compuesta', resultados.verificaciones.vigaPrincipal.deflexionCompuesta.demanda, resultados.verificaciones.vigaPrincipal.deflexionCompuesta.limite, resultados.verificaciones.vigaPrincipal.deflexionCompuesta.cumple, resultados.verificaciones.vigaPrincipal.deflexionCompuesta.ratio)}

              {/* ARRIOSTRAMIENTO VIGA PRINCIPAL */}
              <div style={{ marginTop: '16px', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#14532d' }}>🔧 Arriostramiento lateral (AISC 360 App. 6)</h5>
                <div style={styles.grid3}>
                  {infoCard('Parámetros', [
                    ['Lb actual', resultados.verificaciones.vigaPrincipal.arriostramiento.Lb_m + ' m'],
                    ['Lp (límite plástico)', resultados.verificaciones.vigaPrincipal.arriostramiento.Lp_m + ' m'],
                    ['Lr (límite inelástico)', resultados.verificaciones.vigaPrincipal.arriostramiento.Lr_m + ' m'],
                    ['Zona de pandeo', resultados.verificaciones.vigaPrincipal.pandeo.zona],
                  ])}
                  {infoCard('Recomendación', [
                    ['Estado', resultados.verificaciones.vigaPrincipal.arriostramiento.cumpleSinArriostre ? 'No requiere arriostramiento' : 'Requiere arriostramiento'],
                    ['Máx. sin arriostre', resultados.verificaciones.vigaPrincipal.arriostramiento.Lb_max_m + ' m'],
                    ['Fuerza bracing (Pbr)', resultados.verificaciones.vigaPrincipal.arriostramiento.Pbr_kg + ' kg'],
                  ])}
                </div>
                <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#14532d' }}>
                  <strong>Nota:</strong> {resultados.verificaciones.vigaPrincipal.arriostramiento.recomendacion}. La fuerza de arriostramiento se calcula según AISC 360 App. 6.3 como Pbr = 0.02·Mf/h0.
                </p>
              </div>

              {/* CORREAS */}
              <h4 style={{ margin: '24px 0 12px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>
                {resultados.verificaciones.correas.descripcion}
              </h4>
              {verifRow('Momento', resultados.verificaciones.correas.momento.demanda, resultados.verificaciones.correas.momento.capacidad, resultados.verificaciones.correas.momento.cumple, resultados.verificaciones.correas.momento.ratio)}
              <div style={{ padding: '0 0 10px 20px' }}>{progressBar(resultados.verificaciones.correas.momento.ratio)}</div>
              {verifRow('Cortante', resultados.verificaciones.correas.cortante.demanda, resultados.verificaciones.correas.cortante.capacidad, resultados.verificaciones.correas.cortante.cumple, resultados.verificaciones.correas.cortante.ratio)}
              {verifRow('Deflexión', resultados.verificaciones.correas.deflexion.demanda, resultados.verificaciones.correas.deflexion.limite, resultados.verificaciones.correas.deflexion.cumple, resultados.verificaciones.correas.deflexion.ratio)}

              <div style={{ marginTop: '12px', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#14532d' }}>🔧 Arriostramiento lateral de correas</h5>
                <div style={styles.grid3}>
                  {infoCard('Parámetros', [
                    ['Lb actual', resultados.verificaciones.correas.arriostramiento.Lb_m + ' m'],
                    ['Lp', resultados.verificaciones.correas.arriostramiento.Lp_m + ' m'],
                    ['Lr', resultados.verificaciones.correas.arriostramiento.Lr_m + ' m'],
                    ['Zona', resultados.verificaciones.correas.arriostramiento.zona === 1 ? 'Zona 1' : (resultados.verificaciones.correas.arriostramiento.zona === 2 ? 'Zona 2' : 'Zona 3')],
                  ])}
                  {infoCard('Recomendación', [
                    ['Estado', resultados.verificaciones.correas.arriostramiento.cumpleSinArriostre ? 'No requiere arriostre' : 'Requiere arriostre'],
                    ['Máx. sin arriostre', resultados.verificaciones.correas.arriostramiento.Lb_max_m + ' m'],
                    ['Fuerza bracing (Pbr)', resultados.verificaciones.correas.arriostramiento.Pbr_kg + ' kg'],
                  ])}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONECTORES */}
          {tabActivo === 'conectores' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>📐 Geometría y Límites del Stud</h4>
                  {infoCard('', [
                    ['Diámetro seleccionado (ds)', resultados.verificaciones.conectoresCorte.diametroStud],
                    ['Espesor ala VP (tf)', resultados.verificaciones.conectoresCorte.tf_vp],
                    ['Límite ala VP (ds ≤ 2.5·tf)', resultados.verificaciones.conectoresCorte.cumpleTf_vp ? '✓ CUMPLE' : '✗ EXCEDE'],
                    ['Espesor ala Correa (tf)', resultados.verificaciones.conectoresCorte.tf_correa],
                    ['Límite ala Correa (ds ≤ 2.5·tf)', resultados.verificaciones.conectoresCorte.cumpleTf_correa ? '✓ CUMPLE' : '✗ EXCEDE'],
                    ['Altura del stud (Hs)', resultados.verificaciones.conectoresCorte.alturaStud],
                    ['Rango Hs admisible', `${resultados.verificaciones.conectoresCorte.Hs_min} a ${resultados.verificaciones.conectoresCorte.Hs_max}`],
                    ['Verificación altura', resultados.verificaciones.conectoresCorte.cumpleHs ? '✓ CUMPLE' : '✗ FUERA DE RANGO'],
                  ])}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>📊 Resumen de Distribución total</h4>
                  {infoCard('', [
                    ['Total studs requeridos', resultados.verificaciones.conectoresCorte.totalStuds.toLocaleString() + ' und'],
                    ['Separación en Viga Principal', resultados.verificaciones.conectoresCorte.s_vp],
                    ['Separación en Correas', resultados.verificaciones.conectoresCorte.s_correa],
                    ['Capacidad total ΣφQn', resultados.verificaciones.conectoresCorte.capacidadTotal],
                    ['Costo total conectores', `$${(resultados.verificaciones.conectoresCorte.totalStuds * (costos.studUnd || 0)).toFixed(2)}`],
                    ['Estado conectores', resultados.verificaciones.conectoresCorte.cumple ? '✓ OK' : '✗ REVISAR LÍMITES'],
                  ])}
                  <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '11px', color: theme.textMuted, lineHeight: 1.5 }}>
                    <strong style={{ color: theme.text }}>Normas AISC/ACI:</strong> La altura mínima de los studs sobre el tope del deck es de 1.5" (38 mm) y el recubrimiento de concreto superior mínimo es de 0.5" (13 mm). El diámetro del stud no debe exceder 2.5 veces el espesor de la ala de apoyo.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>🌉 Vigas Principales (Pórticos)</h4>
                  {infoCard('', [
                    ['Capacidad φQn (perpendicular)', resultados.verificaciones.conectoresCorte.phiQn_vp],
                    ['Fuerza plástica Py', resultados.verificaciones.conectoresCorte.P_acero_vp],
                    ['Fuerza plástica Cc', resultados.verificaciones.conectoresCorte.P_conc_vp],
                    ['Studs requeridos / tramo', resultados.verificaciones.conectoresCorte.N_total_vp + ' und'],
                    ['Separación teórica (s)', resultados.verificaciones.conectoresCorte.s_vp],
                    ['Rango s (mín / máx)', `${resultados.verificaciones.conectoresCorte.s_min_vp} / ${resultados.verificaciones.conectoresCorte.s_max_vp}`],
                    ['Verificación s', resultados.verificaciones.conectoresCorte.cumpleS_vp ? '✓ CUMPLE' : '✗ REVISAR LÍMITES'],
                    ['Acción compuesta', `${(parseFloat(resultados.verificaciones.conectoresCorte.ratio_vp) * 100).toFixed(0)}%`],
                  ])}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>📐 Correas (Viguetas secundarias)</h4>
                  {infoCard('', [
                    ['Capacidad φQn (paralela)', resultados.verificaciones.conectoresCorte.phiQn_correa],
                    ['Fuerza plástica Py', resultados.verificaciones.conectoresCorte.P_acero_correa],
                    ['Fuerza plástica Cc', resultados.verificaciones.conectoresCorte.P_conc_correa],
                    ['Studs requeridos / correa', resultados.verificaciones.conectoresCorte.N_total_correa + ' und'],
                    ['Separación teórica (s)', resultados.verificaciones.conectoresCorte.s_correa],
                    ['Rango s (mín / máx)', `${resultados.verificaciones.conectoresCorte.s_min_correa} / ${resultados.verificaciones.conectoresCorte.s_max_correa}`],
                    ['Verificación s', resultados.verificaciones.conectoresCorte.cumpleS_correa ? '✓ CUMPLE' : '✗ REVISAR LÍMITES'],
                    ['Acción compuesta', `${(parseFloat(resultados.verificaciones.conectoresCorte.ratio_correa) * 100).toFixed(0)}%`],
                  ])}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FATIGA */}
          {tabActivo === 'fatiga' && (
            <div style={styles.grid2}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Verificación de fatiga (AISC 360 App. 3)</h4>
                {infoCard('', [
                  ['Ciclos de carga', resultados.verificaciones.fatiga.ciclos],
                  ['Esfuerzo en stud', resultados.verificaciones.fatiga.esfuerzo],
                  ['Esfuerzo umbral (FTH)', resultados.verificaciones.fatiga.FTH],
                  ['Ratio esfuerzo/FTH', resultados.verificaciones.fatiga.ratio],
                  ['Estado', resultados.verificaciones.fatiga.cumple ? '✓ Cumple' : '✗ No cumple'],
                ])}
                <div style={{ marginTop: '10px' }}>
                  {progressBar(resultados.verificaciones.fatiga.ratio)}
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Vida útil estimada</h4>
                {infoCard('', [
                  ['Ciclos hasta falla (N)', resultados.verificaciones.fatiga.vidaCiclos],
                  ['Vida útil estimada', resultados.verificaciones.fatiga.vidaAnios],
                  ['Ciclos de diseño', resultados.verificaciones.fatiga.ciclos],
                ])}
                <div style={{ marginTop: '10px', padding: '10px', background: '#fefce8', borderRadius: '8px', fontSize: '12px', color: '#713f12' }}>
                  <strong>Nota:</strong> La vida útil se estima con la ley de Miner simplificada (curva S-N). Para entrepisos de edificios, 100,000 ciclos corresponden aproximadamente a 10 años de uso normal. Para puentes o plantas industriales, ajustar los ciclos.
                </div>
              </div>
            </div>
          )}

          {/* TAB: LOSA */}
          {tabActivo === 'losa' && (
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Momentos de losa (ACI 318 Tabla 6.5.2.2)</h4>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {infoCard('Momento positivo', [
                  ['Demanda', resultados.verificaciones.losaConcreto.momentoPos.demanda],
                  ['Coef. Ca', resultados.verificaciones.losaConcreto.momentoPos.coef],
                ])}
                {infoCard('Momento neg. exterior', [
                  ['Demanda', resultados.verificaciones.losaConcreto.momentoNegExt.demanda],
                  ['Coef. Ca', resultados.verificaciones.losaConcreto.momentoNegExt.coef],
                ])}
                {infoCard('Momento neg. interior', [
                  ['Demanda', resultados.verificaciones.losaConcreto.momentoNegInt.demanda],
                  ['Coef. Ca', resultados.verificaciones.losaConcreto.momentoNegInt.coef],
                ])}
              </div>

              {verifRow('Cortante losa', resultados.verificaciones.losaConcreto.cortante.demanda, resultados.verificaciones.losaConcreto.cortante.capacidad, resultados.verificaciones.losaConcreto.cortante.cumple, resultados.verificaciones.losaConcreto.cortante.ratio)}
              {verifRow('Punzonamiento', resultados.verificaciones.losaConcreto.punzonamiento.demanda, resultados.verificaciones.losaConcreto.punzonamiento.capacidad, resultados.verificaciones.losaConcreto.punzonamiento.cumple, resultados.verificaciones.losaConcreto.punzonamiento.ratio)}
              {verifRow('Deflexión total', resultados.verificaciones.losaConcreto.deflexion.demanda, resultados.verificaciones.losaConcreto.deflexion.limite, resultados.verificaciones.losaConcreto.deflexion.cumple, resultados.verificaciones.losaConcreto.deflexion.ratio)}
              {verifRow('Deflexión viva', resultados.verificaciones.losaConcreto.deflexionViva.demanda, resultados.verificaciones.losaConcreto.deflexionViva.limite, resultados.verificaciones.losaConcreto.deflexionViva.cumple, resultados.verificaciones.losaConcreto.deflexionViva.ratio)}

              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.border}`, fontSize: '13px' }}>
                <span style={styles.verifLabel}>Vibración (frecuencia natural)</span>
                <span style={styles.verifValue}>{resultados.verificaciones.losaConcreto.vibracion.frecuencia}</span>
                <span style={styles.verifValue}>{resultados.verificaciones.losaConcreto.vibracion.limite}</span>
                <span style={styles.verifValue}>—</span>
                <span style={styles.verifStatus}><span style={styles.badge(resultados.verificaciones.losaConcreto.vibracion.cumple)}>{resultados.verificaciones.losaConcreto.vibracion.cumple ? '✓ OK' : '✗ FAIL'}</span></span>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: theme.text }}>As mínimo: Req <strong>{resultados.verificaciones.losaConcreto.asMinimo.requerido}</strong> | Prov <strong>{resultados.verificaciones.losaConcreto.asMinimo.provisto}</strong></span>
                <span style={styles.badge(resultados.verificaciones.losaConcreto.asMinimo.cumple)}>{resultados.verificaciones.losaConcreto.asMinimo.cumple ? '✓ OK' : '✗ FAIL'}</span>
              </div>
            </div>
          )}

          {/* TAB: OPTIMIZADOR */}
          {tabActivo === 'optimizador' && (
            <div>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>🔍 Optimizador automático de perfiles</h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
                El optimizador itera todos los perfiles disponibles y selecciona el más económico que cumpla momento, cortante y deflexión. Los ratios indican el grado de utilización.
              </p>

              <div style={styles.grid2}>
                {/* VIGA PRINCIPAL OPTIMIZADA */}
                <div>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Viga principal optimizada</h5>
                  <div style={{ ...styles.infoCard, background: resultados.optimizador.viga.optimo.cumple ? '#f0fdf4' : '#fef2f2', borderColor: resultados.optimizador.viga.optimo.cumple ? '#bbf7d0' : '#fecaca' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: theme.text }}>{resultados.optimizador.viga.optimo.perfil}</span>
                      <span style={styles.badge(resultados.optimizador.viga.optimo.cumple)}>
                        {resultados.optimizador.viga.optimo.cumple ? 'ÓPTIMO' : 'MEJOR OPCIÓN'}
                      </span>
                    </div>
                    {infoCard('', [
                      ['φMn', (resultados.optimizador.viga.optimo.phiMn / 100000).toFixed(2) + ' t·m'],
                      ['φVn', (resultados.optimizador.viga.optimo.phiVn / 1000).toFixed(2) + ' t'],
                      ['Deflexión', resultados.optimizador.viga.optimo.defl.toFixed(2) + ' cm'],
                      ['Peso', resultados.optimizador.viga.optimo.peso + ' kg/m'],
                      ['Costo aprox.', '$' + resultados.optimizador.viga.optimo.costo.toFixed(2)],
                      ['Ratio momento', resultados.optimizador.viga.optimo.ratioFlex],
                      ['Ratio cortante', resultados.optimizador.viga.optimo.ratioCort],
                      ['Ratio deflexión', resultados.optimizador.viga.optimo.ratioDefl],
                    ])}
                  </div>

                  <h6 style={{ margin: '16px 0 8px 0', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>Todos los candidatos</h6>
                  <table style={styles.table}>
                    <thead>
                      <tr><th style={styles.th}>Perfil</th><th style={styles.th}>φMn (t·m)</th><th style={styles.th}>φVn (t)</th><th style={styles.th}>Defl (cm)</th><th style={styles.th}>Cumple</th><th style={styles.th}>Costo ($)</th></tr>
                    </thead>
                    <tbody>
                      {resultados.optimizador.viga.candidatos.map((c, i) => (
                        <tr key={i} style={{ background: c.perfil === resultados.optimizador.viga.optimo.perfil ? '#eff6ff' : 'transparent' }}>
                          <td style={styles.td}><strong>{c.perfil}</strong></td>
                          <td style={styles.td}>{(c.phiMn / 100000).toFixed(2)}</td>
                          <td style={styles.td}>{(c.phiVn / 1000).toFixed(2)}</td>
                          <td style={styles.td}>{c.defl.toFixed(2)}</td>
                          <td style={styles.td}><span style={styles.badge(c.cumple)}>{c.cumple ? 'Sí' : 'No'}</span></td>
                          <td style={styles.td}>{c.costo.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* CORREA OPTIMIZADA */}
                <div>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Correa optimizada</h5>
                  <div style={{ ...styles.infoCard, background: resultados.optimizador.correa.optimo.cumple ? '#f0fdf4' : '#fef2f2', borderColor: resultados.optimizador.correa.optimo.cumple ? '#bbf7d0' : '#fecaca' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: theme.text }}>{resultados.optimizador.correa.optimo.perfil}</span>
                      <span style={styles.badge(resultados.optimizador.correa.optimo.cumple)}>
                        {resultados.optimizador.correa.optimo.cumple ? 'ÓPTIMO' : 'MEJOR OPCIÓN'}
                      </span>
                    </div>
                    {infoCard('', [
                      ['φMn', (resultados.optimizador.correa.optimo.phiMn / 100000).toFixed(2) + ' t·m'],
                      ['φVn', (resultados.optimizador.correa.optimo.phiVn / 1000).toFixed(2) + ' t'],
                      ['Deflexión', resultados.optimizador.correa.optimo.defl.toFixed(2) + ' cm'],
                      ['Peso', resultados.optimizador.correa.optimo.peso + ' kg/m'],
                      ['Costo aprox.', '$' + resultados.optimizador.correa.optimo.costo.toFixed(2)],
                      ['Ratio momento', resultados.optimizador.correa.optimo.ratioFlex],
                      ['Ratio cortante', resultados.optimizador.correa.optimo.ratioCort],
                      ['Ratio deflexión', resultados.optimizador.correa.optimo.ratioDefl],
                    ])}
                  </div>

                  <h6 style={{ margin: '16px 0 8px 0', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>Todos los candidatos</h6>
                  <table style={styles.table}>
                    <thead>
                      <tr><th style={styles.th}>Perfil</th><th style={styles.th}>φMn (t·m)</th><th style={styles.th}>φVn (t)</th><th style={styles.th}>Defl (cm)</th><th style={styles.th}>Cumple</th><th style={styles.th}>Costo ($)</th></tr>
                    </thead>
                    <tbody>
                      {resultados.optimizador.correa.candidatos.map((c, i) => (
                        <tr key={i} style={{ background: c.perfil === resultados.optimizador.correa.optimo.perfil ? '#eff6ff' : 'transparent' }}>
                          <td style={styles.td}><strong>{c.perfil}</strong></td>
                          <td style={styles.td}>{(c.phiMn / 100000).toFixed(2)}</td>
                          <td style={styles.td}>{(c.phiVn / 1000).toFixed(2)}</td>
                          <td style={styles.td}>{c.defl.toFixed(2)}</td>
                          <td style={styles.td}><span style={styles.badge(c.cumple)}>{c.cumple ? 'Sí' : 'No'}</span></td>
                          <td style={styles.td}>{c.costo.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: COSTOS */}
          {tabActivo === 'costos' && (
            <div style={styles.grid3}>
              {infoCard('Materiales', [
                ['Vol. concreto', resultados.volConcreto + ' m³'],
                ['Acero total', resultados.kgAcero + ' kg'],
                ['Studs', resultados.numBloques.toLocaleString() + ' und'],
                ['Deck', ((grid.luzX * Math.max(grid.cols - 1, 1) * grid.luzY * Math.max(grid.filas - 1, 1)) * 1.15).toFixed(2) + ' m²'],
              ])}
              {infoCard('Costos', [
                ['Costo total', '$' + resultados.costoTotal],
                ['Costo/m²', '$' + resultados.costoM2],
                ['Peso propio', resultados.pesoPropio + ' kg/m²'],
              ])}
              {infoCard('Eficiencia', [
                ['Ratio viga principal', resultados.verificaciones.vigaPrincipal.momento.ratio],
                ['Ratio correas', resultados.verificaciones.correas.momento.ratio],
                ['Ratio conectores', resultados.verificaciones.conectoresCorte.ratio],
                ['Ratio fatiga', resultados.verificaciones.fatiga.ratio],
              ])}
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}