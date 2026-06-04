import React, { useState, useMemo, useCallback } from 'react';
import { CATALOGO_PERFILES } from './catalogoPerfiles';

// =============================================================================
// CATÁLOGO AISC 360-16 – Importado desde catalogoPerfiles.js
// =============================================================================
const CATALOGO_AISC = {};

// Convertir el catálogo de array a objeto por nombre para acceso rápido
CATALOGO_PERFILES.W.forEach(p => {
  CATALOGO_AISC[p.nombre] = p;
});
CATALOGO_PERFILES.C.forEach(p => {
  CATALOGO_AISC[p.nombre] = p;
});

const PERFILES_W = CATALOGO_PERFILES.W.map(p => p.nombre);
const PERFILES_C = CATALOGO_PERFILES.C.map(p => p.nombre);

// =============================================================================
// PROPIEDADES STEEL DECK
// =============================================================================
const DECK_PROPS = {
  22: { peso: 7.3,  I_s: 15,   S_pos: 5.2,  S_neg: 4.8,  Vn: 2200, Mn_pos: 450,  Mn_neg: 380,  t: 0.76, hr: 3.8 },
  20: { peso: 9.1,  I_s: 22,   S_pos: 7.1,  S_neg: 6.5,  Vn: 2800, Mn_pos: 620,  Mn_neg: 520,  t: 0.91, hr: 3.8 },
  18: { peso: 11.4, I_s: 32,   S_pos: 9.8,  S_neg: 9.0,  Vn: 3500, Mn_pos: 850,  Mn_neg: 710,  t: 1.21, hr: 3.8 },
  16: { peso: 14.6, I_s: 48,   S_pos: 13.2, S_neg: 12.1, Vn: 4500, Mn_pos: 1150, Mn_neg: 960,  t: 1.52, hr: 3.8 },
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
  // AISC 360-16 App. 3.1: Rango de esfuerzo permitido para studs
  // FTH = 7 ksi ≈ 492 kg/cm² para studs en puentes/entrepisos
  const FTH = 492; // kg/cm²
  const esfuerzo = Qn / Asc_stud;
  const cumple = esfuerzo <= FTH;
  // Vida útil estimada (ley de Miner simplificada)
  // N = 2e6 * (FTH / esfuerzo)^3  (aproximación S-N)
  const N = 2_000_000 * Math.pow(FTH / Math.max(esfuerzo, 1), 3);
  const vidaAnios = N / Math.max(ciclos, 1) / 365;
  return { esfuerzo, FTH, cumple, N: Math.floor(N), vidaAnios: vidaAnios.toFixed(1) };
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
function calcularAsMinLosa(h_total_cm, b_ancho_cm = 100, fy_rebar = 4200) {
  let rho_min = fy_rebar >= 4200 ? 0.0018 : (fy_rebar >= 2800 ? 0.0020 : 0.0014);
  return rho_min * b_ancho_cm * h_total_cm;
}
function coeficientesLosaDosDirecciones(luzMayor, luzMenor, continua = true) {
  const m = luzMenor / luzMayor;
  let Ca_neg_ext, Ca_neg_int, Ca_pos;
  if (continua) {
    Ca_neg_ext = 0.045 + 0.025 * (1 - m);
    Ca_neg_int = 0.050 + 0.030 * (1 - m);
    Ca_pos = 0.035 + 0.020 * (1 - m);
  } else {
    Ca_neg_ext = 0.060 + 0.035 * (1 - m);
    Ca_neg_int = 0.065 + 0.040 * (1 - m);
    Ca_pos = 0.045 + 0.025 * (1 - m);
  }
  return { Ca_neg_ext, Ca_neg_int, Ca_pos, m };
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
function optimizarPerfil(listaPerfiles, Mu, Vu, Lb, wServ_kgcm, deflLim_cm, costoPorKg, tipo = 'viga') {
  const candidatos = [];
  for (const perfil of listaPerfiles) {
    const resFlex = calcularMomentoNominalAISC(perfil, Lb, 1.14);
    const phiMn = resFlex.phiMn;
    const resCort = calcularCortanteNominalAISC(perfil);
    const phiVn = resCort.phiVn;
    const Ix = getProp(perfil, 'Ix');
    const defl = deflexionViga(wServ_kgcm, Lb, E_ACERO, Ix);
    const peso = getProp(perfil, 'peso');
    const costo = peso * Lb / 100 * costoPorKg / 1000; // $ aproximado

    const cumpleFlex = Mu <= phiMn;
    const cumpleCort = Vu <= phiVn;
    const cumpleDefl = defl <= deflLim_cm;
    const cumple = cumpleFlex && cumpleCort && cumpleDefl;

    candidatos.push({
      perfil, phiMn, phiVn, defl, peso, costo,
      cumpleFlex, cumpleCort, cumpleDefl, cumple,
      ratioFlex: (Mu / phiMn).toFixed(2),
      ratioCort: (Vu / phiVn).toFixed(2),
      ratioDefl: (defl / deflLim_cm).toFixed(2),
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
    densidadStuds, alturaDeck, f_c, fy_rebar,
    alturaStud, numStudsPorReborde, anchoReborde,
    ciclosFatiga = 100000,
  } = steelDeckConfig;

  const h_total = (espesorConcreto + alturaDeck) / 100;
  const h_cm = h_total * 100;
  const h_sobre_deck = espesorConcreto;

  // 1. CARGAS
  const pesoConcreto = (espesorConcreto / 100) * GAMMA_CONC;
  const pesoDeck = getDeckProp(calibre, 'peso') || 9;
  const pesoCorreas = (getProp(tipoCorrea, 'peso') || 15) / sepCorreas;
  const pesoVigas = (getProp(tipoVigaPrincipal, 'peso') || 30) / (esDosDirecciones ? Math.min(luzX, luzY) : Math.max(luzX, luzY));
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
  const luzDeck = sepCorreas;
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
  const luzLosa = luzMenor;
  const luzLosa_cm = luzLosa * 100;
  const coefs = coeficientesLosaDosDirecciones(luzMayor, luzMenor, true);
  const mPosLosa = coefs.Ca_pos * wuLosa * luzLosa * luzLosa;
  const mNegExtLosa = coefs.Ca_neg_ext * wuLosa * luzLosa * luzLosa;
  const mNegIntLosa = coefs.Ca_neg_int * wuLosa * luzLosa * luzLosa;

  // 5. SECCIÓN COMPUESTA
  const b_eff_1 = (luzMayor * 100) / 4;
  const b_eff_2 = 16 * h_sobre_deck + getProp(tipoVigaPrincipal, 'bf');
  const b_eff_3 = (esDosDirecciones ? luzMenor : luzMayor) * 100;
  const b_eff = Math.min(b_eff_1, b_eff_2, b_eff_3);
  const secComp = calcularSeccionCompuesta(tipoVigaPrincipal, b_eff, h_sobre_deck, f_c_val, Ec);

  // 6. CONECTORES
  const Asc_stud = 1.27;
  const Fu_stud = 4500;
  const hr = getDeckProp(calibre, 'hr') || 3.8;
  const Hs = alturaStud || 15;
  const Nc = numStudsPorReborde || 1;
  const wr = anchoReborde || 15;
  const R = calcularFactorR(hr, Hs, Nc, wr);
  const resStud = calcularQnStud(f_c_val, Ec, Asc_stud, Fu_stud, R);
  const phiQn = resStud.phiQn;
  const longVigasPrincipalesX = (filas) * (luzX * nTramosX);
  const longVigasPrincipalesY = (cols) * (luzY * nTramosY);
  const totalStuds = Math.ceil((longVigasPrincipalesX + longVigasPrincipalesY) * densidadStuds);
  const capacidadTotalStuds = totalStuds * phiQn;

  // 7. MOMENTO COMPUESTO
  const resComp = calcularMomentoCompuesto(tipoVigaPrincipal, b_eff, h_sobre_deck, f_c_val, Ec, Asc_stud, capacidadTotalStuds);

  // 8. VIGAS ACERO
  const luzVigaPrincipal_cm = luzMayor * 100;
  const luzCorrea_cm = luzMenor * 100;

  const wuVigaPrincipal = wu * (esDosDirecciones ? luzMenor : luzMayor);
  const Mu_vp = (wuVigaPrincipal * Math.pow(luzVigaPrincipal_cm / 100, 2)) / 8 * 100;
  const Vu_vp = (wuVigaPrincipal * luzVigaPrincipal_cm / 100) / 2;

  const Lb_vp = luzVigaPrincipal_cm;
  const resFlex_vp = calcularMomentoNominalAISC(tipoVigaPrincipal, Lb_vp, 1.14);
  const phiMn_vp = resFlex_vp.phiMn;
  const cumpleFlex_vp = Mu_vp <= phiMn_vp;
  const resCort_vp = calcularCortanteNominalAISC(tipoVigaPrincipal);
  const phiVn_vp = resCort_vp.phiVn;
  const cumpleCort_vp = Vu_vp <= phiVn_vp;

  const wServ_vp = wServicio * (esDosDirecciones ? luzMenor : luzMayor) / 100;
  const Ix_vp = getProp(tipoVigaPrincipal, 'Ix');
  const defl_vp = deflexionViga(wServ_vp, luzVigaPrincipal_cm, E_ACERO, Ix_vp);
  const deflLim_vp = luzVigaPrincipal_cm / 360;
  const cumpleDefl_vp = defl_vp <= deflLim_vp;
  const defl_vp_comp = secComp ? deflexionViga(wServ_vp, luzVigaPrincipal_cm, E_ACERO, secComp.I_tr) : defl_vp;
  const deflLim_vp_comp = luzVigaPrincipal_cm / 360;
  const cumpleDefl_vp_comp = defl_vp_comp <= deflLim_vp_comp;

  // Arriostramiento lateral
  const arriostre_vp = calcularArriostramiento(tipoVigaPrincipal, Lb_vp, 1.14);

  // CORREAS
  const wuCorrea = wu * sepCorreas;
  const Mu_correa = (wuCorrea * Math.pow(luzCorrea_cm / 100, 2)) / 8 * 100;
  const Vu_correa = (wuCorrea * luzCorrea_cm / 100) / 2;
  const Lb_correa = luzCorrea_cm;
  const resFlex_correa = calcularMomentoNominalAISC(tipoCorrea, Lb_correa, 1.14);
  const phiMn_correa = resFlex_correa.phiMn;
  const cumpleFlex_correa = Mu_correa <= phiMn_correa;
  const resCort_correa = calcularCortanteNominalAISC(tipoCorrea);
  const phiVn_correa = resCort_correa.phiVn;
  const cumpleCort_correa = Vu_correa <= phiVn_correa;
  const wServ_correa = wServicio * sepCorreas / 100;
  const Ix_correa = getProp(tipoCorrea, 'Ix');
  const defl_correa = deflexionViga(wServ_correa, luzCorrea_cm, E_ACERO, Ix_correa);
  const deflLim_correa = luzCorrea_cm / 360;
  const cumpleDefl_correa = defl_correa <= deflLim_correa;
  const arriostre_correa = calcularArriostramiento(tipoCorrea, Lb_correa, 1.14);

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

  // 10. ACERO MÍNIMO
  const As_min = calcularAsMinLosa(h_cm, 100, fy_rebar_val);
  const As_prov = 0.142;
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
  const fatigaStuds = verificarFatigaStuds(ciclosFatiga, resStud.Qn, Asc_stud, Fu_stud);

  // 13. OPTIMIZADOR
  const costoVigaKg = costos.vigaPrincipalKg || 2.5;
  const costoCorreaKg = costos.correaKg || 2.0;
  const optViga = optimizarPerfil(PERFILES_W, Mu_vp, Vu_vp, luzVigaPrincipal_cm, wServ_vp, deflLim_vp, costoVigaKg, 'viga');
  const optCorrea = optimizarPerfil(PERFILES_C, Mu_correa, Vu_correa, luzCorrea_cm, wServ_correa, deflLim_correa, costoCorreaKg, 'correa');

  // 14. MATERIALES Y COSTOS
  const areaDeck = areaTotal * 1.15;
  const volConcreto = areaTotal * (espesorConcreto / 100);
  const numCorreasX = Math.ceil((luzX * nTramosX) / sepCorreas) * (luzY * nTramosY);
  const numCorreasY = Math.ceil((luzY * nTramosY) / sepCorreas) * (luzX * nTramosX);
  const kgCorreas = (getProp(tipoCorrea, 'peso') || 15) * (numCorreasX + numCorreasY);
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
      anchoEfectivo: b_eff.toFixed(1) + ' cm',
      n: n.toFixed(1),
      bTransformado: secComp ? secComp.b_transf.toFixed(2) + ' cm' : 'N/A',
      inerciaTransformada: secComp ? secComp.I_tr.toFixed(0) + ' cm⁴' : 'N/A',
      yBar: secComp ? secComp.y_bar.toFixed(2) + ' cm' : 'N/A',
      S_sup: secComp ? secComp.S_sup.toFixed(1) + ' cm³' : 'N/A',
      S_inf: secComp ? secComp.S_inf.toFixed(1) + ' cm³' : 'N/A',
    },
    momentoCompuesto: {
      descripcion: 'Momento resistente compuesto (AISC 360 I3)',
      P_acero: resComp ? (resComp.P_acero / 1000).toFixed(2) + ' t' : 'N/A',
      P_conc: resComp ? (resComp.P_conc / 1000).toFixed(2) + ' t' : 'N/A',
      P_studs: resComp ? (resComp.P_studs / 1000).toFixed(2) + ' t' : 'N/A',
      PNA: resComp ? resComp.PNA_tipo : 'N/A',
      a: resComp ? resComp.a.toFixed(2) + ' cm' : 'N/A',
      Y2: resComp ? resComp.Y2.toFixed(2) + ' cm' : 'N/A',
      Mn_comp: resComp ? (resComp.Mn_comp / 100000).toFixed(2) + ' t·m' : 'N/A',
      phiMn_comp: resComp ? (resComp.phiMn_comp / 100000).toFixed(2) + ' t·m' : 'N/A',
      completa: resComp ? resComp.completa : false,
    },
    vigaPrincipal: {
      descripcion: `Viga principal ${tipoVigaPrincipal} (AISC 360 Cap F/G)`,
      momento: { demanda: (Mu_vp / 100000).toFixed(2) + ' t·m', capacidad: (phiMn_vp / 100000).toFixed(2) + ' t·m', cumple: cumpleFlex_vp, ratio: (Mu_vp / phiMn_vp).toFixed(2) },
      cortante: { demanda: (Vu_vp / 1000).toFixed(2) + ' t', capacidad: (phiVn_vp / 1000).toFixed(2) + ' t', cumple: cumpleCort_vp, ratio: (Vu_vp / phiVn_vp).toFixed(2) },
      deflexion: { demanda: defl_vp.toFixed(2) + ' cm', limite: deflLim_vp.toFixed(2) + ' cm', cumple: cumpleDefl_vp, ratio: (defl_vp / deflLim_vp).toFixed(2) },
      deflexionCompuesta: { demanda: defl_vp_comp.toFixed(2) + ' cm', limite: deflLim_vp_comp.toFixed(2) + ' cm', cumple: cumpleDefl_vp_comp, ratio: (defl_vp_comp / deflLim_vp_comp).toFixed(2) },
      pandeo: { Lb: (Lb_vp / 100).toFixed(2) + ' m', Lp: (resFlex_vp.Lp / 100).toFixed(2) + ' m', Lr: (resFlex_vp.Lr / 100).toFixed(2) + ' m', zona: resFlex_vp.zona === 1 ? 'Zona 1 (Plástica)' : (resFlex_vp.zona === 2 ? 'Zona 2 (Inelástica)' : 'Zona 3 (Elástica)') },
      arriostramiento: arriostre_vp,
      cumpleGlobal: cumpleFlex_vp && cumpleCort_vp && cumpleDefl_vp && cumpleDefl_vp_comp,
    },
    correas: {
      descripcion: `Correas ${tipoCorrea} (AISC 360 Cap F/G)`,
      momento: { demanda: (Mu_correa / 100000).toFixed(2) + ' t·m', capacidad: (phiMn_correa / 100000).toFixed(2) + ' t·m', cumple: cumpleFlex_correa, ratio: (Mu_correa / phiMn_correa).toFixed(2) },
      cortante: { demanda: (Vu_correa / 1000).toFixed(2) + ' t', capacidad: (phiVn_correa / 1000).toFixed(2) + ' t', cumple: cumpleCort_correa, ratio: (Vu_correa / phiVn_correa).toFixed(2) },
      deflexion: { demanda: defl_correa.toFixed(2) + ' cm', limite: deflLim_correa.toFixed(2) + ' cm', cumple: cumpleDefl_correa, ratio: (defl_correa / deflLim_correa).toFixed(2) },
      arriostramiento: arriostre_correa,
      cumpleGlobal: cumpleFlex_correa && cumpleCort_correa && cumpleDefl_correa,
    },
    conectoresCorte: {
      descripcion: 'Conectores de corte (AISC 360 I2 + I3.2d)',
      Qn_bruto: resStud.Qn_bruto.toFixed(2) + ' kg',
      factorR: R.toFixed(3),
      Qn: resStud.Qn.toFixed(2) + ' kg',
      phiQn: phiQn.toFixed(2) + ' kg',
      totalStuds,
      capacidadTotal: capacidadTotalStuds.toFixed(0) + ' kg',
      P_acero: resComp ? (resComp.P_acero / 1000).toFixed(2) + ' t' : 'N/A',
      P_conc: resComp ? (resComp.P_conc / 1000).toFixed(2) + ' t' : 'N/A',
      cumple: resComp ? (resComp.P_studs >= Math.min(resComp.P_acero, resComp.P_conc) * 0.5) : false,
      ratio: resComp ? (Math.min(resComp.P_acero, resComp.P_conc) / resComp.P_studs).toFixed(2) : 'N/A',
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
      descripcion: 'Losa de concreto (ACI 318 Cap 7/9/14/22)',
      momentoPos: { demanda: mPosLosa.toFixed(2) + ' kg·m/m', coef: coefs.Ca_pos.toFixed(4) },
      momentoNegExt: { demanda: mNegExtLosa.toFixed(2) + ' kg·m/m', coef: coefs.Ca_neg_ext.toFixed(4) },
      momentoNegInt: { demanda: mNegIntLosa.toFixed(2) + ' kg·m/m', coef: coefs.Ca_neg_int.toFixed(4) },
      cortante: { demanda: Vu_losa_cm.toFixed(2) + ' kg/cm', capacidad: phiVc.toFixed(2) + ' kg/cm', cumple: cumpleVcLosa, ratio: (Vu_losa_cm / phiVc).toFixed(2) },
      punzonamiento: { demanda: Vu_punz.toFixed(0) + ' kg', capacidad: phiVcPunz.toFixed(0) + ' kg', cumple: cumpleVcPunz, ratio: (Vu_punz / phiVcPunz).toFixed(2) },
      asMinimo: { requerido: As_min.toFixed(3) + ' cm²/m', provisto: As_prov.toFixed(3) + ' cm²/m', cumple: cumpleAsMin },
      deflexion: { demanda: (deflLosa * 100).toFixed(2) + ' cm', limite: (deflLimLosa * 100).toFixed(2) + ' cm', cumple: cumpleDeflLosa, ratio: (deflLosa / deflLimLosa).toFixed(2) },
      deflexionViva: { demanda: (deflLosaViva * 100).toFixed(2) + ' cm', limite: (deflLimLosaViva * 100).toFixed(2) + ' cm', cumple: cumpleDeflLosaViva, ratio: (deflLosaViva / deflLimLosaViva).toFixed(2) },
      vibracion: { frecuencia: f_natural.toFixed(2) + ' Hz', limite: '3.0 Hz', cumple: cumpleVibracion },
      cumpleGlobal: cumpleVcLosa && cumpleVcPunz && cumpleAsMin && cumpleDeflLosa && cumpleDeflLosaViva && cumpleVibracion,
    },
  };

  const cumpleGlobal = verificaciones.deckConstruccion.cumpleGlobal &&
                       verificaciones.vigaPrincipal.cumpleGlobal &&
                       verificaciones.correas.cumpleGlobal &&
                       verificaciones.conectoresCorte.cumple &&
                       verificaciones.losaConcreto.cumpleGlobal &&
                       verificaciones.fatiga.cumple;

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
      espesorConcreto, calibre, sepCorreas, tipoVigaPrincipal, tipoCorrea,
      densidadStuds, alturaDeck, f_c: f_c_val, fy_rebar: fy_rebar_val,
      mConstruccion, vConstruccion, phiMn_pos_deck, phiMn_neg_deck, phiVn_deck,
      mPosLosa, mNegExtLosa, mNegIntLosa,
      totalStuds, phiQn, capacidadTotalStuds, R,
      kgCorreas, kgVigas, kgMalla, areaDeck,
      longVigasPrincipalesX, longVigasPrincipalesY,
      Mu_vp, phiMn_vp, Vu_vp, phiVn_vp, defl_vp, deflLim_vp,
      Mu_correa, phiMn_correa, Vu_correa, phiVn_correa, defl_correa, deflLim_correa,
      As_min, As_prov, phiVc, Vu_losa_cm, cumpleVcLosa,
      secComp, resComp, f_natural, fatigaStuds,
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
    container: { fontFamily: '"Inter", system-ui, sans-serif', maxWidth: '1100px', margin: '0 auto', padding: '24px', background: theme.bg, minHeight: '100vh' },
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Losa Colaborante Steel Deck</h2>
        <p style={styles.subtitle}>Pre-dimensionamiento normativo ACI 318-19 · AISC 360-16 LRFD · Fatiga · Optimización</p>
      </div>

      {/* CONFIGURACIÓN */}
      <div style={styles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>⚙️ Configuración</h3>
        <div style={styles.grid4}>
          {[
            ['espesorConcreto', 'Espesor concreto (cm)', 'number', 0.5, 4, 25],
            ['calibre', 'Calibre deck', 'select-deck', null, null, null],
            ['sepCorreas', 'Sep. correas (m)', 'number', 0.1, 0.9, 3.0],
            ['alturaDeck', 'Altura deck (cm)', 'number', 0.5, 5, 15],
            ['tipoVigaPrincipal', 'Viga principal', 'select-w', null, null, null],
            ['tipoCorrea', 'Correa', 'select-c', null, null, null],
            ['densidadStuds', 'Densidad studs (studs/m)', 'number', 0.5, 1, 6],
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
                  {PERFILES_W.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : type === 'select-c' ? (
                <select name="tipoCorrea" value={steelDeckConfig.tipoCorrea} onChange={onConfigChange} style={styles.input}>
                  {PERFILES_C.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : type === 'select-nc' ? (
                <select name="numStudsPorReborde" value={normParams.numStudsPorReborde} onChange={handleNormChange} style={styles.input}>
                  <option value={1}>1 stud/reborde</option>
                  <option value={2}>2 studs/reborde</option>
                </select>
              ) : (
                <input type="number" name={name} value={type === 'number' && name in steelDeckConfig ? steelDeckConfig[name] : normParams[name]} onChange={name in steelDeckConfig ? onConfigChange : handleNormChange} step={step} min={min} max={max} style={styles.input} />
              )}
            </div>
          ))}
        </div>
      </div>

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
                ['Dos direcciones', (Math.max(grid.luzX, grid.luzY) / Math.min(grid.luzX, grid.luzY) <= 2) ? 'Sí' : 'No'],
                ['Área total', (grid.luzX * Math.max(grid.cols - 1, 1) * grid.luzY * Math.max(grid.filas - 1, 1)).toFixed(2) + ' m²'],
              ])}
              {infoCard('Estado por elemento', [
                ['Deck construcción', resultados.verificaciones.deckConstruccion.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                ['Viga principal', resultados.verificaciones.vigaPrincipal.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                ['Correas', resultados.verificaciones.correas.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                ['Conectores', resultados.verificaciones.conectoresCorte.cumple ? '✓ OK' : '✗ FAIL'],
                ['Fatiga studs', resultados.verificaciones.fatiga.cumple ? '✓ OK' : '✗ FAIL'],
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
            <div style={styles.grid2}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Capacidad nominal</h4>
                {infoCard('', [
                  ['Qn bruto (sin R)', resultados.verificaciones.conectoresCorte.Qn_bruto],
                  ['Factor de reducción R', resultados.verificaciones.conectoresCorte.factorR],
                  ['Qn (con R)', resultados.verificaciones.conectoresCorte.Qn],
                  ['φQn', resultados.verificaciones.conectoresCorte.phiQn],
                  ['Total studs', resultados.verificaciones.conectoresCorte.totalStuds.toLocaleString()],
                  ['Capacidad total ΣφQn', resultados.verificaciones.conectoresCorte.capacidadTotal],
                ])}
                <div style={{ marginTop: '10px', padding: '10px', background: '#eff6ff', borderRadius: '8px', fontSize: '12px', color: '#1e40af' }}>
                  <strong>Factor R (AISC I3.2d):</strong> Reduce la capacidad del stud cuando se coloca en el reborde del steel deck. Depende de hr, Hs, wr y Nc. Para 1 stud/reborde: Rmax=1.0. Para 2 studs/reborde: Rmax=0.75.
                </div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Verificación de transferencia</h4>
                {infoCard('', [
                  ['Fuerza acero Py', resultados.verificaciones.conectoresCorte.P_acero],
                  ['Fuerza concreto Cc', resultados.verificaciones.conectoresCorte.P_conc],
                  ['ΣφQn / min(Py,Cc)', resultados.verificaciones.conectoresCorte.ratio],
                  ['Estado', resultados.verificaciones.conectoresCorte.cumple ? '✓ Cumple' : '✗ No cumple'],
                ])}
                <div style={{ marginTop: '10px' }}>
                  {progressBar(resultados.verificaciones.conectoresCorte.ratio)}
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

      {/* ADVERTENCIA */}
      <div style={styles.alert}>
        <strong>⚠️ Advertencia Normativa:</strong> Esta herramienta realiza verificaciones de pre-dimensionamiento basadas en ACI 318-19 y AISC 360-16 (LRFD). Incluye: método de la transformada para sección compuesta, factor de reducción R de conectores (AISC I3.2d), pandeo lateral-torsional con arriostramiento (AISC Cap. F / App. 6), cortante del concreto y punzonamiento (ACI 318), deflexiones en servicio, vibración y fatiga de conectores (AISC App. 3). <strong>No sustituye el diseño estructural detallado</strong> ni la supervisión de un ingeniero estructural calificado.
      </div>
    </div>
  );
}