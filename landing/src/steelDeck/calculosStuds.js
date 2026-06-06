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