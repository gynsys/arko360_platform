import os

file_path = 'landing/src/components/tools/calculadoraLosas/LosaColaborante.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. normas.js
normas_code = """
export const DECK_PROPS = {
  22: { peso: 7.3,  I_s: 15,   S_pos: 5.2,  S_neg: 4.8,  Vn: 2200, Mn_pos: 450,  Mn_neg: 380,  t: 0.76, hr: 3.8, Sr: 15.24, wr: 6.5 },
  20: { peso: 9.1,  I_s: 22,   S_pos: 7.1,  S_neg: 6.5,  Vn: 2800, Mn_pos: 620,  Mn_neg: 520,  t: 0.91, hr: 3.8, Sr: 15.24, wr: 6.5 },
  18: { peso: 11.4, I_s: 32,   S_pos: 9.8,  S_neg: 9.0,  Vn: 3500, Mn_pos: 850,  Mn_neg: 710,  t: 1.21, hr: 3.8, Sr: 15.24, wr: 6.5 },
  16: { peso: 14.6, I_s: 48,   S_pos: 13.2, S_neg: 12.1, Vn: 4500, Mn_pos: 1150, Mn_neg: 960,  t: 1.52, hr: 3.8, Sr: 15.24, wr: 6.5 },
};

export const PHI_B    = 0.90;
export const PHI_V    = 0.90;
export const PHI_C    = 0.75;
export const PHI_CONC = 0.90;
export const PHI_VC   = 0.75;
export const E_ACERO  = 2000000;
export const G_ACERO  = E_ACERO / 2.6;
export const GAMMA_CONC = 2400;

import { CATALOGO_AISC } from './catalogos';

export function getProp(perfil, prop) {
  return (CATALOGO_AISC[perfil] && CATALOGO_AISC[perfil][prop]) || 0;
}

export function getDeckProp(calibre, prop) {
  return (DECK_PROPS[calibre] && DECK_PROPS[calibre][prop]) || 0;
}
"""
with open('landing/src/steelDeck/normas.js', 'w', encoding='utf-8') as f:
    f.write(normas_code.strip())

aisc_code = """
import { E_ACERO, PHI_B, PHI_V, getProp } from './normas';

export function calcularMomentoNominalAISC(perfil, Lb, Cb = 1.0) {
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

export function calcularCortanteNominalAISC(perfil) {
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

export function calcularArriostramiento(perfil, Lb_actual, Cb = 1.0) {
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
    recomendacion = `Arriostramiento recomendado cada <= ${Lp_m.toFixed(2)} m para Zona plástica`;
    Lb_max = Lp_m;
  } else {
    recomendacion = `Arriostramiento obligatorio cada <= ${Lr_m.toFixed(2)} m para evitar pandeo elástico`;
    Lb_max = Lr_m;
  }

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
"""
with open('landing/src/steelDeck/calculosAISC.js', 'w', encoding='utf-8') as f:
    f.write(aisc_code.strip())

studs_code = """
import { PHI_C, getProp } from './normas';

export function calcularFactorR(hr, Hs_total, Nc, wr) {
  const Hs = Math.max(Hs_total - hr, 0);
  if (Hs <= 0) return 0;

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

export function calcularQnStud(f_c, Ec, Asc, Fu_stud, R = 1.0) {
  const Qn1 = 0.5 * Asc * Math.sqrt(f_c * Ec);
  const Qn2 = Asc * Fu_stud;
  const Qn_bruto = Math.min(Qn1, Qn2);
  const Qn = Qn_bruto * R;
  return { Qn, Qn_bruto, Qn1, Qn2, phiQn: PHI_C * Qn, R };
}

export function verificarCompatibilidadStud(perfil, d_stud_cm) {
  const tf = getProp(perfil, 'tf');
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
"""
with open('landing/src/steelDeck/calculosStuds.js', 'w', encoding='utf-8') as f:
    f.write(studs_code.strip())

losa_code = """
import { PHI_VC } from './normas';

export function EcConcreto(f_c) { return 15000 * Math.sqrt(f_c); }

export function calcularVcLosa(f_c, b_w, d_eff) {
  const Vc = 0.53 * Math.sqrt(f_c) * b_w * d_eff;
  return { Vc, phiVc: PHI_VC * Vc };
}

export function calcularVcPunzonamiento(f_c, d_eff, b0) {
  const Vc = 0.33 * Math.sqrt(f_c) * b0 * d_eff;
  return { Vc, phiVc: PHI_VC * Vc };
}

export function calcularAsMinLosa(h_sobre_deck_cm, b_ancho_cm = 100, fy_rebar = 4200) {
  let rho_min = fy_rebar >= 4200 ? 0.0018 : (fy_rebar >= 2800 ? 0.0020 : 0.0014);
  return rho_min * b_ancho_cm * h_sobre_deck_cm;
}

export function deflexionViga(w_kgcm, L_cm, E, I_cm4) {
  return (5 * w_kgcm * Math.pow(L_cm, 4)) / (384 * E * I_cm4);
}

export function deflexionLosaDosDirecciones(w_kgm2, luz_m, E_kgcm2, h_m, nu = 0.2) {
  const E = E_kgcm2 * 10000;
  const D = (E * Math.pow(h_m, 3)) / (12 * (1 - nu * nu));
  return 0.00416 * w_kgm2 * Math.pow(luz_m, 4) / D;
}

export function frecuenciaNaturalLosa(w_kgm2, luz_m, E_kgcm2, h_m) {
  const E = E_kgcm2 * 10000;
  const D = (E * Math.pow(h_m, 3)) / (12 * (1 - 0.04));
  const masa = w_kgm2 / 9.81;
  return (Math.PI / 2) * Math.sqrt(D / (masa * Math.pow(luz_m, 4)));
}
"""
with open('landing/src/steelDeck/calculosLosa.js', 'w', encoding='utf-8') as f:
    f.write(losa_code.strip())

compuestos_code = """
import { E_ACERO, PHI_B, getProp } from './normas';
import { CATALOGO_AISC } from './catalogos';

export function calcularSeccionCompuesta(perfil, b_eff_cm, h_conc_cm, f_c, Ec) {
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

export function calcularMomentoCompuesto(perfil, b_eff_cm, h_conc_cm, f_c, Ec, Asc_stud, Qn_total) {
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
    PNA_tipo = 'En losa (acero totalmente en tracción)';
    a = P_acero / (0.85 * f_c * b_eff_cm);
    Y2 = h_conc_cm - a / 2;
    Mn_comp = P_acero * (Y2 + d / 2);
  } else if (P_studs >= P_conc && P_conc < P_acero) {
    PNA_tipo = 'En el alma del acero';
    const P_tension = (P_acero - P_conc) / 2;
    const y_pna = P_tension / (tw * Fy);
    Mn_comp = P_conc * (d / 2 + h_conc_cm - y_pna / 2) + P_tension * (d / 2 - y_pna / 2) * 2;
  } else {
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
"""
with open('landing/src/steelDeck/calculosCompuestos.js', 'w', encoding='utf-8') as f:
    f.write(compuestos_code.strip())

opt_code = """
import { E_ACERO, getProp } from './normas';
import { calcularMomentoNominalAISC, calcularCortanteNominalAISC } from './calculosAISC';
import { verificarCompatibilidadStud } from './calculosStuds';
import { deflexionViga } from './calculosLosa';
import { calcularSeccionCompuesta, calcularMomentoCompuesto } from './calculosCompuestos';

export function optimizarPerfil(listaPerfiles, Mu, Vu, Lb, wServ_kgcm, deflLim_cm, costoPorKg, tipo = 'viga', compData = null, d_stud_cm = null) {
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

    const peso = getProp(perfil, 'peso') || getProp(perfil, 'peso_lineal') || (getProp(perfil, 'A') * 7.85);
    const costo = peso * Lb / 100 * costoPorKg / 1000;

    const cumpleFlex = Mu <= phiMn;
    const cumpleCort = Vu <= phiVn;
    const cumpleDefl = deflFinal <= deflLim_cm;

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

  candidatos.sort((a, b) => {
    if (a.cumple && !b.cumple) return -1;
    if (!a.cumple && b.cumple) return 1;
    return a.costo - b.costo;
  });

  const optimo = candidatos.find(c => c.cumple) || candidatos[0];

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
"""
with open('landing/src/steelDeck/optimizador.js', 'w', encoding='utf-8') as f:
    f.write(opt_code.strip())

orq_code = """
import { GAMMA_CONC, PHI_B, PHI_V, getProp, getDeckProp, E_ACERO } from './normas';
import { PERFILES_I_H_TUBO } from './catalogos';
import { calcularMomentoNominalAISC, calcularCortanteNominalAISC, calcularArriostramiento } from './calculosAISC';
import { calcularFactorR, calcularQnStud, verificarCompatibilidadStud } from './calculosStuds';
import { EcConcreto, calcularVcLosa, calcularVcPunzonamiento, calcularAsMinLosa, deflexionViga, deflexionLosaDosDirecciones, frecuenciaNaturalLosa } from './calculosLosa';
import { calcularSeccionCompuesta, calcularMomentoCompuesto } from './calculosCompuestos';
import { optimizarPerfil } from './optimizador';
"""

calc_code_idx = content.find('export function calcularLosaColaboranteNormativo')
calc_code_end = content.find('export default function LosaColaborante', calc_code_idx)
calc_code = content[calc_code_idx:calc_code_end]

with open('landing/src/steelDeck/calcularLosaColaboranteNormativo.js', 'w', encoding='utf-8') as f:
    f.write(orq_code.strip() + '\\n\\n' + calc_code)

# Finally, we rewrite LosaColaborante.jsx to remove lines 5 to the end of the calc function, and import them.
react_code = content[calc_code_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('import React, { useState, useMemo, useEffect } from "react";\\n')
    f.write('import { RefreshCw, Save, FileDown, CheckCircle, XCircle, AlertTriangle, Info, Plus, Trash2, ArrowRight } from "lucide-react";\\n')
    f.write('import { calcularLosaColaboranteNormativo } from "../../../steelDeck/calcularLosaColaboranteNormativo";\\n\\n')
    f.write(react_code)
