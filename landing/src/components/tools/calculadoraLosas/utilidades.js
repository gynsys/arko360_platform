// Utilidades compartidas para cálculos de losas

export const AREAS_BARRA = {
  '3/8': 0.71,
  '1/2': 1.27,
  '5/8': 1.98,
  '3/4': 2.85,
  '1': 5.07,
};

export const SEPARACIONES_COMERCIALES = [10, 12.5, 15, 17.5, 20, 22.5, 25, 30];

export function redondearSep(s) {
  return SEPARACIONES_COMERCIALES.reduce((prev, curr) => Math.abs(curr - s) < Math.abs(prev - s) ? curr : prev, 15);
}

export function calcBarraYSep(AsReq, areaBarra) {
  if (AsReq <= 0 || areaBarra <= 0) return { sep: 0, cantidad: 0 };
  const s = (areaBarra / AsReq) * 100; // cm
  const sep = redondearSep(s);
  const cantidadPorMetro = 100 / sep;
  return { sep, cantidadPorMetro };
}

export function calcFlexion(Mu_kgm, b_mm, d_mm, fc_kgcm2, fy_kgcm2) {
  const b = b_mm / 10; // Convertir a cm
  const d = d_mm / 10; // Convertir a cm
  const mu_kg_cm = Mu_kgm * 100; // kg·m a kg·cm
  const Ru = mu_kg_cm / (0.90 * b * Math.pow(d, 2));
  
  let rho = (0.85 * fc_kgcm2 / fy_kgcm2) * (1 - Math.sqrt(1 - (2 * Ru / (0.85 * fc_kgcm2))));
  if (isNaN(rho) || rho < 0) rho = 0;
  
  const As_min = 0.0018 * b * d; // As_min en cm²
  const As_req_cm2 = Math.max(rho * b * d, As_min); // As_req en cm²
  
  // Convertir de vuelta a mm² para que coincida con lo que espera el resto de la app
  const As_req = As_req_cm2 * 100;
  const As_min_mm2 = As_min * 100;
  
  const β1 = fc_kgcm2 <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc_kgcm2 - 280) / 70);
  const a = rho * fy_kgcm2 * d / (0.85 * fc_kgcm2);
  const c = a / β1;
  const εty = fy_kgcm2 / 2_000_000;
  const εt = c > 0 ? ((d - c) / c) * 0.003 : 0;
  const tensionControlada = εt >= εty + 0.003;
  
  return { As_req, As_min: As_min_mm2, rho, Ru, a, c, εt, εty, tensionControlada };
}

export function calcCortante(Vc, φVc, vuMax) {
  return {
    Vc,
    φVc,
    vuMax,
    cumpleCortante: vuMax <= φVc,
  };
}

export function calcDeflexion(wServicio, luz, h, fc) {
  const Ec = 15100 * Math.sqrt(fc);
  const Ig = (100 * Math.pow(h, 3)) / 12;
  const wServCm = wServicio / 100;
  const Lcm = luz * 100;
  const δ = (5 * wServCm * Math.pow(Lcm, 4)) / (384 * Ec * Ig);
  const δLim = Lcm / 360;
  return { δ: δ.toFixed(3), δLim: δLim.toFixed(2), cumple: δ <= δLim };
}
