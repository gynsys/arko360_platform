import React, { useState, useMemo } from 'react';
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
    Cw: 0,
    rts: 0.25 * dims.bf,
    tipo: 'IPE'
  };
});

// Suplementar HEA con sus dimensiones estándar en cm
const HEA_DIMS = {
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
    Cw: 0,
    rts: 0.28 * dims.bf,
    tipo: 'HEA'
  };
});

// Suplementar IPN con sus dimensiones estándar en cm
const IPN_DIMS = {
  80:  { d: 8.0,  bf: 4.2,  tf: 0.59, tw: 0.39 },
  100: { d: 10.0, bf: 5.0,  tf: 0.68, tw: 0.45 },
  120: { d: 12.0, bf: 5.8,  tf: 0.77, tw: 0.51 },
  140: { d: 14.0, bf: 6.6,  tf: 0.86, tw: 0.57 },
  160: { d: 16.0, bf: 7.4,  tf: 0.95, tw: 0.63 },
  180: { d: 18.0, bf: 8.2,  tf: 1.04, tw: 0.69 },
  200: { d: 20.0, bf: 9.0,  tf: 1.13, tw: 0.75 },
  220: { d: 22.0, bf: 9.8,  tf: 1.22, tw: 0.81 },
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

// =============================================================================
// AISC 360-16 I3.2d: Factor R — CORREGIDO
// Hs_total = altura total del stud desde la parte superior de la viga
// Hs_norma = altura del stud POR ENCIMA de la parte superior del deck (hr)
// =============================================================================
function calcularFactorR(hr, Hs_total, Nc, wr) {
  const Hs = Math.max(Hs_total - hr, 0);
  if (Hs <= 0) return 0; // Stud no protruye del deck: sin enganche efectivo

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

// =============================================================================
// VERIFICACIÓN DE COMPATIBILIDAD STUD-PERFIL (AISC 360-16 I8.2)
// ds ≤ 2.5 × tf (espesor del ala del perfil de acero)
// =============================================================================
function verificarCompatibilidadStud(perfil, d_stud_cm) {
  const tf = getProp(perfil, 'tf');
  // Si no hay tf definido en el catálogo, no se puede verificar → incompatible por seguridad
  if (!tf || tf <= 0) {
    return { compatible: false, tf: 0, limite: 0, ratio: Infinity, razon: 'Perfil sin datos de tf' };
  }
  const limite = 2.5 * tf;
  return {
    compatible: d_stud_cm <= limite,
    tf,
    limite,
    ratio: d_stud_cm / limite,
    razon: d_stud_cm <= limite ? 'Compatible' : `ds=${d_stud_cm.toFixed(2)}cm > 2.5×tf=${limite.toFixed(2)}cm`
  };
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

// =============================================================================
// Momento compuesto — CORREGIDO según AISC 360-16 I3.2b
// =============================================================================
function calcularMomentoCompuesto(perfil, b_eff_cm, h_conc_cm, f_c, Ec, Asc_stud, Qn_total) {
  const prop = CATALOGO_AISC[perfil];
  if (!prop) return null;
  const Fy = prop.Fy;
  const Zx = prop.Zx;
  const A = prop.A;
  const d = prop.d;
  const tw = prop.tw || 0.5;
  const P_acero = A * Fy;
  const P_conc = 0.85 * f_c * b_eff_cm * h_conc_cm;
  const P_studs = Qn_total;

  let PNA_tipo, a, Y2, Mn_comp, phiMn_comp;

  if (P_studs >= P_conc && P_conc >= P_acero) {
    // PNA en la losa, acero totalmente en tracción
    PNA_tipo = 'En losa (acero totalmente en tracción)';
    a = P_acero / (0.85 * f_c * b_eff_cm);
    Y2 = h_conc_cm - a / 2;
    Mn_comp = P_acero * (Y2 + d / 2);

  } else if (P_studs >= P_conc && P_conc < P_acero) {
    // PNA en el alma, compresión total en losa
    PNA_tipo = 'En el alma del acero';
    const P_tension = (P_acero - P_conc) / 2;
    const y_pna = P_tension / (tw * Fy);
    Mn_comp = P_conc * (d / 2 + h_conc_cm - y_pna / 2) + P_tension * (d / 2 - y_pna / 2) * 2;

  } else {
    // Parcialmente compuesta — PNA en el alma del acero (limitado por conectores)
    PNA_tipo = 'Limitado por conectores (parcialmente compuesta)';
    const P_comp = P_studs;
    a = P_comp / (0.85 * f_c * b_eff_cm);
    Y2 = h_conc_cm - a / 2;

    const P_tension = (P_acero - P_studs) / 2;
    const y_pna = P_tension / (tw * Fy);
    Mn_comp = P_studs * (d / 2 + Y2 - y_pna / 2) + P_tension * (d / 2 - y_pna / 2) * 2;
  }

  phiMn_comp = PHI_B * Mn_comp;
  return {
    P_acero, P_conc, P_studs, PNA_tipo, a, Y2,
    Mn_comp, phiMn_comp,
    completa: P_studs >= Math.min(P_acero, P_conc)
  };
}

// =============================================================================
// OPTIMIZADOR AUTOMÁTICO DE PERFILES
// =============================================================================
function optimizarPerfil(listaPerfiles, Mu, Vu, Lb, wServ_kgcm, deflLim_cm, costoPorKg, tipo = 'viga', compData = null, d_stud_cm = null) {
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

    // Verificación de compatibilidad stud-perfil (AISC 360 I8.2)
    let cumpleStud = true;
    let studInfo = null;
    if (d_stud_cm !== null && d_stud_cm > 0) {
      studInfo = verificarCompatibilidadStud(perfil, d_stud_cm);
      cumpleStud = studInfo.compatible;
    }

    const cumple = cumpleFlex && cumpleCort && cumpleDefl && cumpleStud;

    candidatos.push({
      perfil, phiMn, phiVn, defl: deflFinal, peso, costo,
      cumpleFlex, cumpleCort, cumpleDefl, cumpleStud, cumple,
      ratioFlex: (Mu / phiMn).toFixed(2),
      ratioCort: (Vu / phiVn).toFixed(2),
      ratioDefl: (deflFinal / deflLim_cm).toFixed(2),
      ratioStud: studInfo ? studInfo.ratio.toFixed(2) : 'N/A',
      tf: studInfo ? studInfo.tf : null,
      studInfo,
    });
  }

  // Ordenar: primero los que cumplen, luego por menor costo
  candidatos.sort((a, b) => {
    if (a.cumple && !b.cumple) return -1;
    if (!a.cumple && b.cumple) return 1;
    return a.costo - b.costo;
  });

  const optimo = candidatos.find(c => c.cumple) || candidatos[0];

  // Si el óptimo no cumple por stud, generar sugerencias de diámetros menores
  let sugerenciasStud = [];
  if (optimo && !optimo.cumpleStud && optimo.tf && optimo.tf > 0) {
    const diametros = [
      { pulg: 0.5, mm: 12.7 },
      { pulg: 0.625, mm: 15.9 },
      { pulg: 0.75, mm: 19.1 },
      { pulg: 0.875, mm: 22.2 }
    ];
    sugerenciasStud = diametros
      .filter(d => d.mm / 10 <= 2.5 * optimo.tf)
      .map(d => `${d.pulg}" (${d.mm} mm)`);
    if (sugerenciasStud.length === 0) {
      sugerenciasStud.push('Ningún diámetro estándar es compatible con este perfil');
    }
  }

  return { optimo, candidatos, sugerenciasStud };
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
    mallaTruskon,
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

  // AISC 360-16 I8.2: Hs mínimo = hr + 1.5" (3.81 cm)
  const Hs_min = hr + 3.81;
  // ACI 318-19 §20.5.1: recubrimiento mínimo sobre stud = 0.5" (1.27 cm)
  const Hs_max = (espesorConcreto_efectivo + alturaDeck) - 1.27;
  const cumpleHs = Hs >= Hs_min && Hs <= Hs_max;
  const Hs_rec = Math.max(Hs_min, Math.min(Hs, Hs_max));

  const tf_vp = getProp(tipoVigaPrincipal, 'tf');
  const tf_correa = getProp(tipoCorrea, 'tf');
  const cumpleTf_vp = tf_vp > 0 && d_stud_cm <= 2.5 * tf_vp;
  const cumpleTf_correa = tf_correa > 0 && d_stud_cm <= 2.5 * tf_correa;

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
      const res = calcularMomentoCompuesto(tipoVigaPrincipal, b_eff_vp, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, mid);
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

  // Separación máxima: usar espesor efectivo (CORREGIDO)
  const s_max = Math.min(8 * (espesorConcreto_efectivo + alturaDeck), 90);
  const s_min = 6 * d_stud_cm;

  let s_vp = luzVigaPrincipal_cm / N_total_vp;

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

  // REDUCCIÓN STUDS - Correa: calcular R dinámicamente (CORREGIDO)
  // Para correas secundarias se asume 1 stud por reborde como default
  const R_correa = calcularFactorR(hr, Hs, 1, wr_vp);
  const resStud_correa = calcularQnStud(f_c_val, Ec, Asc_stud, Fu_stud, R_correa);
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
      const res = calcularMomentoCompuesto(tipoCorrea, b_eff_correa, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, mid);
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
  const mallaTruskon_val = mallaTruskon || 1.88; // cm²/m Truskon T-188
  const As_prov = mallaTruskon_val;
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

  // 12. OPTIMIZADOR
  const costoVigaKg = costos.vigaPrincipalKg || 2.5;
  const costoCorreaKg = costos.correaKg || 2.0;

  const compDataVP = { b_eff: b_eff_vp, espesorConcreto: espesorConcreto_efectivo, f_c_val, Ec };
  const optViga = optimizarPerfil(PERFILES_I_H_TUBO, Mu_vp, Vu_vp, luzVigaPrincipal_cm, wServ_vp, deflLim_vp, costoVigaKg, 'viga', compDataVP, d_stud_cm);

  const compDataCorrea = { b_eff: b_eff_correa, espesorConcreto: espesorConcreto_efectivo, f_c_val, Ec };
  const optCorrea = optimizarPerfil(PERFILES_I_H_TUBO, Mu_correa, Vu_correa, luzCorrea_cm, wServ_correa, deflLim_correa, costoCorreaKg, 'correa', compDataCorrea, d_stud_cm);

  const wuCorreaBorde = wu * sepReal / 2;
  const Mu_correa_borde = (wuCorreaBorde * Math.pow(luzCorrea_cm / 100, 2)) / 8 * 100;
  const Vu_correa_borde = (wuCorreaBorde * luzCorrea_cm / 100) / 2;
  const wServ_correa_borde = wServ_correa / 2;
  const optCorreaBorde = optimizarPerfil(PERFILES_I_H_TUBO, Mu_correa_borde, Vu_correa_borde, luzCorrea_cm, wServ_correa_borde, deflLim_correa, costoCorreaKg, 'correa', compDataCorrea, d_stud_cm);

  // 13. MATERIALES Y COSTOS
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

  // 14. RESUMEN
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
      espesorConcreto: espesorConcreto_efectivo,
      espesorMinimo: espesorMinimoACI,
      calibre,
      sepCorreas,
      sepReal,
      tipoVigaPrincipal,
      tipoCorrea,
      diametroStud,
      alturaDeck,
      f_c: f_c_val,
      fy_rebar: fy_rebar_val,
      mConstruccion,
      vConstruccion,
      phiMn_pos_deck,
      phiMn_neg_deck,
      phiVn_deck,
      mPosLosa,
      mNegExtLosa,
      mNegIntLosa,
      totalStuds,
      phiQn: phiQn_vp,
      capacidadTotalStuds,
      R: R_vp,
      kgCorreas,
      kgVigas,
      kgMalla,
      areaDeck,
      longVigasPrincipalesX,
      longVigasPrincipalesY,
      Mu_vp,
      phiMn_vp,
      Vu_vp,
      phiVn_vp,
      defl_vp,
      deflLim_vp,
      Mu_correa,
      phiMn_correa,
      Vu_correa,
      phiVn_correa,
      defl_correa,
      deflLim_correa,
      As_min,
      As_prov,
      phiVc,
      Vu_losa_cm,
      cumpleVcLosa,
      secComp: secComp_vp,
      resComp: capComp_vp,
      f_natural,
      arriostre_vp,
      arriostre_correa,
    },
  };
}

// =============================================================================
// COMPONENTE REACT PROFESIONAL
// =============================================================================
