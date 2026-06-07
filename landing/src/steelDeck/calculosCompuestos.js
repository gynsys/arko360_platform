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
  const P_max = Math.min(P_conc, P_acero);

  if (P_studs >= P_max) {
    if (P_conc >= P_acero) {
      PNA_tipo = 'En losa (completamente compuesta)';
      a = P_acero / (0.85 * f_c * b_eff_cm);
      Y2 = h_conc_cm - a / 2;
      Mn_comp = P_acero * (Y2 + d / 2);
    } else {
      PNA_tipo = 'En perfil de acero (completamente compuesta)';
      const P_tension = (P_acero - P_conc) / 2;
      const y_pna = P_tension / (tw * Fy);
      Mn_comp = P_conc * (d / 2 + h_conc_cm - y_pna / 2) + P_tension * (d / 2 - y_pna / 2) * 2;
    }
  } else {
    PNA_tipo = 'Limitado por conectores (parcialmente compuesta)';
    const P_comp = P_studs;
    a = P_comp / (0.85 * f_c * b_eff_cm);
    Y2 = h_conc_cm - a / 2;
    const P_tension = (P_acero - P_comp) / 2;
    const y_pna = P_tension / (tw * Fy);
    Mn_comp = P_comp * (d / 2 + Y2 - y_pna / 2) + P_tension * (d / 2 - y_pna / 2) * 2;
  }

  phiMn_comp = PHI_B * Mn_comp;
  return {
    P_acero, P_conc, P_studs, PNA_tipo, a, Y2,
    Mn_comp, phiMn_comp,
    completa: P_studs >= P_max
  };
}