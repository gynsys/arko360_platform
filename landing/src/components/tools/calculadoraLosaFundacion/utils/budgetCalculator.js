import { FALLBACK_PRECIOS } from '../constants/slabConstants';

export const generarPresupuesto = (results, prices, designParams) => {
  if (!results?.materials_computation) return [];
  const m = results.materials_computation;
  const s = m.superstructure;
  if (!s) return [];

  const items = [];
  const p = prices || FALLBACK_PRECIOS;

  // Separar losa y mampostería (viga corona)
  const vol_losa = m.concrete_vol_m3;
  const vol_viga = s.vol_vigas_corona_m3;

  // ==== CAPÍTULO: LOSA DE FUNDACIÓN ====
  const cemento_losa = Math.ceil(vol_losa * 6.7);
  items.push({ chapter: 'Losa de Fundación', material: 'Cemento Portland (Losa)', unit: 'sacos', qty: cemento_losa, pu: p.cemento, total: cemento_losa * p.cemento });
  
  const arena_losa = +(vol_losa * 0.63).toFixed(2);
  items.push({ chapter: 'Losa de Fundación', material: 'Arena Lavada (Losa)', unit: 'm³', qty: arena_losa, pu: p.arena, total: arena_losa * p.arena });

  const piedra_losa = +(vol_losa * 0.60).toFixed(2);
  items.push({ chapter: 'Losa de Fundación', material: 'Piedra picada (Losa)', unit: 'm³', qty: piedra_losa, pu: p.piedra, total: piedra_losa * p.piedra });

  // Acero Losa y Bandas
  const custom_mesh_cm2_m = designParams?.custom_mesh_cm2_m || 0;
  
  let label_acero = 'Cabilla de 10 mm (Losa)';
  let precio_acero = 7.36; // default 10mm
  
  if (custom_mesh_cm2_m > 0) {
    if (custom_mesh_cm2_m === 0.61 || custom_mesh_cm2_m === 1.88) {
      // Es una Malla (se calcula por m2)
      const area_losa_m2 = results?.inputs?.geometry?.Lx * results?.inputs?.geometry?.Ly || 100;
      const area_con_desperdicio = +(area_losa_m2 * 1.10).toFixed(2); // 10% de solape/desperdicio
      
      if (custom_mesh_cm2_m === 0.61) { label_acero = 'Malla 6x6 (Ø3.43@15)'; precio_acero = p.malla_6x6 || 2.50; }
      else if (custom_mesh_cm2_m === 1.88) { label_acero = 'Malla Sima (Ø6@15)'; precio_acero = p.malla_sima || 5.00; }
      
      items.push({ chapter: 'Losa de Fundación', material: label_acero, unit: 'm²', qty: area_con_desperdicio, pu: precio_acero, total: area_con_desperdicio * precio_acero });
    } else {
      // Son varillas (se calcula por und de 6m)
      if (custom_mesh_cm2_m === 1.41) { label_acero = 'Varillas Ø6@20cm (Losa)'; precio_acero = p.cabilla_6 || 4.50; }
      else if (custom_mesh_cm2_m === 1.92) { label_acero = 'Varillas Ø7@20cm (Losa)'; precio_acero = p.cabilla_7 || 4.50; }
      else if (custom_mesh_cm2_m === 2.51) { label_acero = 'Varillas Ø8@20cm (Losa)'; precio_acero = p.cabilla_8 || 5.90; }
      else if (custom_mesh_cm2_m === 3.93) { label_acero = 'Varillas Ø10@20cm (Losa)'; precio_acero = p.cabilla_10 || 5.82; }
      else if (custom_mesh_cm2_m === 5.24) { label_acero = 'Varillas Ø10@15cm (Losa)'; precio_acero = p.cabilla_10 || 5.82; }
      
      const total_cabillas_losa = m.total_bars_6m;
      items.push({ chapter: 'Losa de Fundación', material: label_acero, unit: 'und', qty: total_cabillas_losa, pu: precio_acero, total: total_cabillas_losa * precio_acero });
    }
  } else {
    const diam_base = m.diam_base_mm || 10;
    label_acero = `Cabilla de ${diam_base} mm (Losa)`;
    if (diam_base === 7) precio_acero = p.cabilla_7 || 4.50;
    else if (diam_base === 8) precio_acero = p.cabilla_8 || 5.90;
    else if (diam_base === 10) precio_acero = p.cabilla_10 || 5.82;
    else if (diam_base > 10) precio_acero = 7.36 * Math.pow(diam_base / 10, 2);
    
    const total_cabillas_losa = m.total_bars_6m;
    items.push({ chapter: 'Losa de Fundación', material: label_acero, unit: 'und', qty: total_cabillas_losa, pu: precio_acero, total: total_cabillas_losa * precio_acero });
  }

  // ==== CAPÍTULO: MAMPOSTERÍA ====
  if (vol_viga > 0) {
    const cemento_viga = Math.ceil(vol_viga * 6.7);
    const arena_viga = +(vol_viga * 0.63).toFixed(2);
    const piedra_viga = +(vol_viga * 0.60).toFixed(2);
    items.push({ chapter: 'Mampostería', material: 'Cemento Portland (Viga Corona)', unit: 'sacos', qty: cemento_viga, pu: p.cemento, total: cemento_viga * p.cemento });
    items.push({ chapter: 'Mampostería', material: 'Arena Lavada (Viga Corona)', unit: 'm³', qty: arena_viga, pu: p.arena, total: arena_viga * p.arena });
    items.push({ chapter: 'Mampostería', material: 'Piedra picada (Viga Corona)', unit: 'm³', qty: piedra_viga, pu: p.piedra, total: piedra_viga * p.piedra });
  }

  // Acero Viga Corona
  if (s.corona_10mm_bars > 0) {
    items.push({ chapter: 'Mampostería', material: 'Cabilla de 10 mm (Viga Corona)', unit: 'und', qty: s.corona_10mm_bars, pu: p.cabilla_10, total: s.corona_10mm_bars * p.cabilla_10 });
  }
  if (s.corona_5_2mm_bars > 0) {
    items.push({ chapter: 'Mampostería', material: 'Cabilla de 5.2 mm (Estribos)', unit: 'und', qty: s.corona_5_2mm_bars, pu: p.cabilla_5_2, total: s.corona_5_2mm_bars * p.cabilla_5_2 });
  }

  // ==== CAPÍTULO: MACHONES / COLUMNAS ====
  const vol_machon = s.vol_machones_m3 || 0;
  if (vol_machon > 0) {
    const cemento_machon = Math.ceil(vol_machon * 9.5); // Concreto más resistente para machones
    const arena_machon = +(vol_machon * 0.55).toFixed(2);
    const piedra_machon = +(vol_machon * 0.67).toFixed(2);
    items.push({ chapter: 'Machones', material: 'Cemento Portland (Machón)', unit: 'sacos', qty: cemento_machon, pu: p.cemento, total: cemento_machon * p.cemento });
    items.push({ chapter: 'Machones', material: 'Arena Lavada (Machón)', unit: 'm³', qty: arena_machon, pu: p.arena, total: arena_machon * p.arena });
    items.push({ chapter: 'Machones', material: 'Piedra picada (Machón)', unit: 'm³', qty: piedra_machon, pu: p.piedra, total: piedra_machon * p.piedra });

    if (s.machones_10mm_bars > 0) {
      items.push({ chapter: 'Machones', material: 'Cabilla de 10 mm (Longitudinal)', unit: 'und', qty: s.machones_10mm_bars, pu: p.cabilla_10, total: s.machones_10mm_bars * p.cabilla_10 });
    }
    if (s.machones_5_2mm_bars > 0) {
      items.push({ chapter: 'Machones', material: 'Cabilla de 5.2 mm (Estribos)', unit: 'und', qty: s.machones_5_2mm_bars, pu: p.cabilla_5_2, total: s.machones_5_2mm_bars * p.cabilla_5_2 });
    }
  }

  // Bloques
  if (s.bloques_15_m2 > 0) {
    const qty = Math.ceil(s.bloques_15_m2 * 12.5);
    items.push({ chapter: 'Mampostería', material: 'Bloque arcilla (15cm)', unit: 'und', qty, pu: p.bloque_15, total: qty * p.bloque_15 });
  }
  if (s.bloques_12_m2 > 0) {
    const qty = Math.ceil(s.bloques_12_m2 * 12.5);
    items.push({ chapter: 'Mampostería', material: 'Bloque arcilla (12cm)', unit: 'und', qty, pu: p.bloque_12, total: qty * p.bloque_12 });
  }

  // Acabados
  const area_total_muros = s.area_lisa_m2 + s.area_rustica_m2;
  
  // Rendimiento volumétrico real de friso a 1 cm de espesor base (Proporción 1:4):
  const vol_neto_friso = area_total_muros * 0.01;
  const vol_seco_friso = vol_neto_friso * 1.10;
  const cemento_friso = Math.ceil(vol_seco_friso * 4.5); // 4.5 sacos por m3 de mortero seco
  const arena_friso = +(vol_seco_friso * 1.05).toFixed(2); // 1.05 m3 por m3 de mortero seco
  
  if (cemento_friso > 0) {
    items.push({ chapter: 'Mampostería', material: 'Cemento Portland (Friso)', unit: 'sacos', qty: cemento_friso, pu: p.cemento, total: cemento_friso * p.cemento });
    items.push({ chapter: 'Mampostería', material: 'Arena Lavada (Friso)', unit: 'm³', qty: arena_friso, pu: p.arena, total: arena_friso * p.arena });
  }

  if (s.area_lisa_m2 > 0) {
    // Rendimiento Pasta: ~25 m2 por cuñete (4-5 galones)
    const pasta_cunetes = Math.ceil(s.area_lisa_m2 / 25.0); 
    // Rendimiento Pintura: ~20 m2 por galón (a dos manos)
    const pintura_galones = Math.ceil(s.area_lisa_m2 / 20.0);
    const lija = Math.ceil(s.area_lisa_m2 / 10);
    const polvillo = +(s.area_lisa_m2 / 100).toFixed(2);

    items.push({ chapter: 'Mampostería', material: 'Polvillo (Acabado liso)', unit: 'm³', qty: polvillo, pu: p.polvillo, total: polvillo * p.polvillo });
    items.push({ chapter: 'Mampostería', material: 'Lija', unit: 'hojas', qty: lija, pu: p.lija, total: lija * p.lija });
    items.push({ chapter: 'Mampostería', material: 'Pasta Profesional', unit: 'cuñetes', qty: pasta_cunetes, pu: p.pasta, total: pasta_cunetes * p.pasta });
    items.push({ chapter: 'Mampostería', material: 'Pintura', unit: 'galones', qty: pintura_galones, pu: p.pintura, total: pintura_galones * p.pintura });
  }
  
  return items;
};
