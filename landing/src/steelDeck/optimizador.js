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
      const { b_eff, espesorConcreto, f_c_val, Ec, phiQn, s_min, Lb: Lb_cm } = compData;
      const P_acero = getProp(perfil, 'A') * getProp(perfil, 'Fy');
      const P_conc = 0.85 * f_c_val * b_eff * espesorConcreto;
      
      let P_studs = Math.min(P_acero, P_conc); // Default to full if no constraints
      if (phiQn && s_min && Lb_cm) {
        // Limit P_studs by the physical maximum number of studs that fit
        const N_max = Math.floor(Lb_cm / s_min);
        // We assume 1 row, so total studs = N_max
        const max_capacity = N_max * phiQn;
        P_studs = Math.min(P_studs, max_capacity);
      }
      
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
    // 1. Both fulfill everything? Sort by cost
    if (a.cumple && b.cumple) return a.costo - b.costo;
    
    // 2. One fulfills everything, the other doesn't? Prioritize the one that fulfills
    if (a.cumple && !b.cumple) return -1;
    if (!a.cumple && b.cumple) return 1;

    // 3. Neither fulfills everything. Prioritize the one that passes Stud check
    if (a.cumpleStud && !b.cumpleStud) return -1;
    if (!a.cumpleStud && b.cumpleStud) return 1;

    // 4. Prioritize the one that passes Flexure
    if (a.cumpleFlex && !b.cumpleFlex) return -1;
    if (!a.cumpleFlex && b.cumpleFlex) return 1;

    // 5. If they fail the same things, return the cheapest
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