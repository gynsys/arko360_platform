export const downloadAuditJSON = ({ lastPayload, results, projectName }) => {
  if (!lastPayload || !results) return;

  // Calcular cargas en MKS para la auditoría
  const Lx = lastPayload.geometry?.Lx || 0;
  const Ly = lastPayload.geometry?.Ly || 0;
  const h_m = lastPayload.geometry?.h || 0.15;
  const gamma_horm = 2400; // kg/m3
  const A_losa = Lx * Ly;
  const P_losa_kg = gamma_horm * A_losa * h_m;
  const extra_load_n_m2 = lastPayload.extra_load || (300 * 9.81);
  const sc_kg_m2 = +(extra_load_n_m2 / 9.81).toFixed(1); // de extra_load N/m2 a kg/m2
  const P_sc_kg = sc_kg_m2 * A_losa;
  
  let P_muros_kg = 0;
  const wallLoads = (lastPayload.walls || []).map(w => {
    const len = Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2);
    // Restar aberturas
    const opening_m = (w.openings || []).reduce((acc, op) => acc + op.width_m, 0);
    const len_neta = Math.max(0, len - opening_m);
    const rho_kgm3 = w.density || 1400;
    const vol_m3 = len_neta * w.height * w.thickness;
    const P_kg = rho_kgm3 * vol_m3;
    P_muros_kg += P_kg * (w.load_factor || 1.5);
    return {
      tipo: w.type,
      longitud_m: +len.toFixed(3),
      longitud_neta_m: +len_neta.toFixed(3),
      altura_m: w.height,
      espesor_m: w.thickness,
      densidad_kgm3: rho_kgm3,
      peso_kg: +P_kg.toFixed(1),
      peso_factored_kg: +(P_kg * (w.load_factor || 1.5)).toFixed(1)
    };
  });
  
  let P_machones_kg = 0;
  const machonLoads = (lastPayload.columns || []).map((c, idx) => {
    const vol_m3 = c.width * c.length * c.height;
    const W_self_kgf = vol_m3 * 2400; // Igual que en el backend
    const total_kg = c.load_kgf + W_self_kgf;
    P_machones_kg += total_kg * 1.5; // Factored
    return {
      id: `Machón ${idx + 1}`,
      dimensiones_m: `${c.width} x ${c.length} x ${c.height}`,
      carga_aplicada_kg: c.load_kgf,
      peso_propio_kg: +W_self_kgf.toFixed(1),
      carga_total_factored_kg: +(total_kg * 1.5).toFixed(1)
    };
  });

  const P_total_kg = P_losa_kg + P_sc_kg + P_muros_kg + P_machones_kg;
  
  const fc_Pa = lastPayload.materials?.f_c || 25e6;
  const fc_MPa = fc_Pa > 1000 ? fc_Pa / 1e6 : fc_Pa; // handle if already MPa
  const fc_kgcm2 = +(fc_MPa * 10.197).toFixed(1);
  const fy_MPa = (lastPayload.materials?.f_y || 420e6) > 1000 ? (lastPayload.materials.f_y / 1e6) : (lastPayload.materials?.f_y || 420);
  const fy_kgcm2 = +(fy_MPa * 10.197).toFixed(0);

  const w_max = results.displacements?.w_max_mm || 0;
  const L_min_mm = Math.min(Lx, Ly) * 1000;
  const settlement_limit = L_min_mm / 500;
  const hormigon_m3 = A_losa * h_m;
  const malla_minimo_m2 = A_losa;
  const acero_estimado = (A_losa * (results.As_min_cm2_m || 1.88) / 10000) * 7850;

  const auditData = {
    meta: {
      proyecto: lastPayload.project,
      fecha_generacion: new Date().toISOString(),
      fecha_revision: "",
      revisor: "Pendiente por asignar",
      norma_referencia: 'ACI 318-19 / COVENIN 1753-2006',
      sistema_unidades: 'MKS (kgf, m, kgf/cm²)'
    },
    supuestos: {
      tipo_suelo: "Por definir en estudio de suelos",
      nivel_freatico: "Por definir",
      coeficiente_balasto_k: `${(lastPayload.materials?.k_s || 20e6) / 1e6} MPa/m — (Asumido / A verificar con ensayo)`,
      modelo_suelo: "Winkler (Resortes elásticos independientes)",
      condicion_borde: "Libre"
    },
    parametros_diseno: {
      fc_kgf_cm2: fc_kgcm2,
      fy_kgf_cm2: fy_kgcm2,
      recubrimiento_cm: (lastPayload.materials?.cover || 0.05) * 100,
      barra_diametro_mm: (lastPayload.materials?.bar_diam || 0.012) * 1000,
      q_adm_kgf_m2: +((lastPayload.materials?.q_adm || 150000) / 9.81).toFixed(0)
    },
    geometria: {
      Lx_m: Lx, Ly_m: Ly,
      espesor_h_m: h_m,
      espesor_h_cm: +(h_m * 100).toFixed(1),
      area_m2: +A_losa.toFixed(2)
    },
    calculo_de_cargas_MKS: {
      peso_propio_losa_kg: +P_losa_kg.toFixed(1),
      sobrecarga_sc_kg: +P_sc_kg.toFixed(1),
      peso_muros_factored_kg: +P_muros_kg.toFixed(1),
      peso_machones_factored_kg: +P_machones_kg.toFixed(1),
      carga_total_kg: +P_total_kg.toFixed(1),
      carga_total_kN: +(P_total_kg * 9.81 / 1000).toFixed(2),
      presion_media_suelo_kgf_m2: +(P_total_kg / A_losa).toFixed(1),
      detalle_muros: wallLoads,
      detalle_machones: machonLoads
    },
    resultados_FEM: {
      desplazamiento_max_mm: w_max,
      momento_Mx_max_kNm_m: results.moments?.Mx_max_kNm_m,
      momento_My_max_kNm_m: results.moments?.My_max_kNm_m,
      cortante_Vu_max_kN_m: results.shear?.Vu_max_kN_m,
      cortante_phiVc_kN_m: results.shear?.phiVc_kN_m,
      verificacion_cortante: results.shear?.shear_ok ? 'CUMPLE' : 'NO CUMPLE',
      presion_max_suelo_kN_m2: results.soil_pressure?.max_pressure_kN_m2,
      q_adm_kN_m2: results.soil_pressure?.q_adm_kN_m2,
      verificacion_suelo: results.soil_pressure?.ok ? 'CUMPLE' : 'NO CUMPLE',
      punzonamiento: results.punching || {}
    },
    verificaciones_adicionales: {
      asentamiento_diferencial: {
          delta_s_max_mm: w_max, 
          limite_recomendado_mm: +settlement_limit.toFixed(2),
          criterio: "L/500 (ACI 351.3R)", 
          estado: w_max <= settlement_limit ? "CUMPLE" : "NO CUMPLE"
      },
      fisuracion_serviceability: { w_k_max_mm: 0.3, estado: "PENDIENTE" },
      sismo_covenin_1756: { zona: "Por definir", analisis_dinamico: "PENDIENTE", estado: "PENDIENTE" }
    },
    cuantificacion_estimada: {
      hormigon_m3: +hormigon_m3.toFixed(2),
      acero_base_kg: +acero_estimado.toFixed(2),
      malla_minima_m2: +malla_minimo_m2.toFixed(2)
    },
    detalle_armado_zonas_criticas: {
      esquinas_losa: "PENDIENTE - Verificar refuerzo adicional por concentración de tensiones",
      bajo_muros: "Ver bandas_refuerzo",
      longitud_desarrollo_empalmes: "PENDIENTE"
    },
    checklist_revision_independiente: {
      "Cargas muertas": { revisado: false, por: "", fecha: "" },
      "Cargas vivas": { revisado: false, por: "", fecha: "" },
      "Combinaciones de carga": { revisado: false, por: "", fecha: "" },
      "Resultados FEM vs. manual": { revisado: false, por: "", fecha: "" },
      "Armado mínimo": { revisado: true, por: "ARKO360", fecha: new Date().toISOString().split('T')[0] },
      "Detalles constructivos": { revisado: false, por: "", fecha: "" }
    },
    bandas_refuerzo: results.bands,
    acero_minimo_cm2_m: results.As_min_cm2_m,
    observaciones: [
      'Verificación por cortante unidireccional (ACI 318 §11.3) incluida.',
      'Las bandas de refuerzo están concentradas bajo cada muro según distribución FEM.',
      `Fáctor de seguridad en presión suelo: ${results.soil_pressure?.q_adm_kN_m2 && results.soil_pressure?.max_pressure_kN_m2 ? (results.soil_pressure.q_adm_kN_m2 / results.soil_pressure.max_pressure_kN_m2).toFixed(2) : 'N/A'}`
    ],
    aprobacion: { estado: "EN_REVISION", firma: null },
    datos_entrada_raw: lastPayload
  };
  const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `auditoria_losa_${projectName.replace(/\s+/g, '_')}_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
