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