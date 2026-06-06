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