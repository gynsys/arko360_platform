export const descargarComputosHtml = ({
  results,
  wallHeight,
  allWalls,
  openings,
  payload,
  designParams,
  projectName,
  toast
}) => {
  if (!results || !results.materials_computation) {
    toast.error("No hay resultados para generar memoria.");
    return;
  }
  const mc = results.materials_computation;
  const s = mc.superstructure;
  const area_total = s ? s.area_lisa_m2 + s.area_rustica_m2 : 0;
  
  let murosHtml = '';
  const h = wallHeight || 2.70;
  
  // Perimetrales
  allWalls.filter(w => w.type === 'perimetral').forEach((w, i) => {
    const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
    murosHtml += `<li>Muro Perimetral ${i+1}: ${len.toFixed(2)}m (L) × ${h.toFixed(2)}m (H) = ${(len * h).toFixed(2)} m² (x 2 caras = ${(len * h * 2).toFixed(2)} m²)</li>`;
  });
  
  // Internos
  allWalls.filter(w => w.type !== 'perimetral').forEach((w, i) => {
    const len = Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2));
    murosHtml += `<li>Muro Interno ${i+1}: ${len.toFixed(2)}m (L) × ${h.toFixed(2)}m (H) = ${(len * h).toFixed(2)} m² (x 2 caras = ${(len * h * 2).toFixed(2)} m²)</li>`;
  });

  let aberturasHtml = '';
  if (openings.length > 0) {
    openings.forEach((op, i) => {
      const w_op = op.width || op.width_m || 0;
      const h_op = op.height || op.height_m || 0;
      const area = w_op * h_op;
      aberturasHtml += `<li>Abertura ${i+1} (${op.type}): ${w_op.toFixed(2)}m (Ancho) × ${h_op.toFixed(2)}m (Alto) = -${area.toFixed(2)} m² (descontado de mampostería)</li>`;
    });
  } else {
    aberturasHtml = '<li>No se registraron puertas ni ventanas.</li>';
  }

  const Lx = payload.geometry.Lx || 10;
  const Ly = payload.geometry.Ly || 10;
  const area_losa_m2 = Lx * Ly;
  
  // Concreto de Fundación
  const cemento_losa_sacos = Math.ceil(mc.concrete_vol_m3 * 9.5);
  const arena_losa_m3 = (mc.concrete_vol_m3 * 0.55).toFixed(2);
  const piedra_losa_m3 = (mc.concrete_vol_m3 * 0.67).toFixed(2);

  // Acero General
  let textoAceroGeneral = '';
  const custom_mesh_cm2_m = designParams?.custom_mesh_cm2_m || 0;
  if (custom_mesh_cm2_m === 0.61 || custom_mesh_cm2_m === 1.88) {
    const num_mallas_real = Math.ceil((area_losa_m2 * 1.10) / (2.60 * 6.00));
    textoAceroGeneral = `Material: Malla Electrosoldada (Formato comercial 2.6m x 6.0m)<br>
    Área neta de placa: ${area_losa_m2.toFixed(2)} m²<br>
    Área a cubrir con 10% de solape de seguridad: ${(area_losa_m2 * 1.10).toFixed(2)} m²<br>
    Láminas requeridas: <strong>${num_mallas_real} láminas</strong> (Tipo Trucson)`;
  } else {
    textoAceroGeneral = `Material: Cabillas / Varillas Corrugadas de 6m<br>
    Peso Total Acero General: ${mc.steel_weight_general_kg.toFixed(2)} kg<br>
    Cabillas requeridas: <strong>${mc.general_bars_6m} unidades</strong>`;
  }

  // Materiales de Friso
  const vol_neto_friso = area_total * 0.01;
  const vol_seco_friso = vol_neto_friso * 1.10;
  const sacos_cemento_friso = Math.ceil(vol_seco_friso * 4.5);
  const arena_friso = (vol_seco_friso * 1.05).toFixed(2);

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cómputos Métricos - ${projectName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; }
    h1, h2, h3 { color: #1e1e2f; }
    .card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .formula { background: #e3f2fd; padding: 12px; border-left: 4px solid #1976d2; font-family: monospace; font-size: 14px; margin: 10px 0; color: #0d47a1; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin-bottom: 5px; }
  </style>
</head>
<body>
  <h1>Cómputos Métricos: ${projectName}</h1>
  <p>Reporte generado automáticamente por Arko360. A continuación se detallan las consideraciones matemáticas para los cómputos métricos de la obra.</p>
  
  <div class="card">
    <h2>1. Losa de Fundación</h2>
    <p><strong>Volumen de Concreto (f'c = 210 kgf/cm²):</strong></p>
    <div class="formula">
      Volumen Neto de la Losa: ${mc.concrete_vol_m3.toFixed(2)} m³<br><br>
      <em>Desglose de Preparación en Obra:</em><br>
      - Cemento Portland: ~9.5 sacos por m³ = <strong>${cemento_losa_sacos} sacos</strong><br>
      - Arena Lavada: ~0.55 m³ por m³ = <strong>${arena_losa_m3} m³</strong><br>
      - Piedra Picada: ~0.67 m³ por m³ = <strong>${piedra_losa_m3} m³</strong>
    </div>
    
    <p><strong>Acero General (Malla):</strong></p>
    <div class="formula">
      ${textoAceroGeneral}
    </div>
    
    <p><strong>Acero de Bandas (Refuerzo inferior bajo muros):</strong></p>
    <div class="formula">
      Peso Acero Adicional: ${mc.steel_weight_bands_kg.toFixed(2)} kg<br>
      Varillas de 6m equivalentes: ${mc.bands_bars_6m} varillas
    </div>
  </div>
  
  ${s ? `
  <div class="card">
    <h2>2. Superestructura (Mampostería)</h2>
    <p><strong>Desglose de Áreas por Pared (Altura base: ${h.toFixed(2)}m):</strong></p>
    <div class="formula" style="background: #fff3e0; border-left-color: #ff9800; color: #e65100;">
      <ul>
        ${murosHtml}
      </ul>
      <hr style="border:0; border-top:1px solid #ffe0b2; margin: 10px 0;">
      <strong>Descuento por Aberturas (Áreas Negativas):</strong>
      <ul>
        ${aberturasHtml}
      </ul>
    </div>

    <p><strong>Área Neta Total de Muros a Frisar:</strong><br>
    Se considera 1 cara exterior y 1 interior para muros perimetrales, y 2 caras interiores para muros internos. A esta área bruta se le resta el área de las puertas y ventanas dibujadas (aberturas).</p>
    <div class="formula">
      Área Lisa (Interna) = ${s.area_lisa_m2.toFixed(2)} m²<br>
      Área Rústica (Externa) = ${s.area_rustica_m2.toFixed(2)} m²<br>
      Área Neta Total a frisar = ${area_total.toFixed(2)} m²
    </div>
    
    <p><strong>Cemento Portland para Friso (Proporción 1:4 a 1 cm de espesor):</strong></p>
    <div class="formula">
      Volumen Neto de Mortero: ${area_total.toFixed(2)} m² × 0.01 m = ${vol_neto_friso.toFixed(2)} m³<br>
      Volumen Seco (+10% Desperdicio Constructivo): ${vol_seco_friso.toFixed(2)} m³<br>
      Rendimiento: 4.5 sacos por cada m³ de mortero seco.<br>
      Sacos requeridos: <strong>${sacos_cemento_friso} sacos</strong>
    </div>
    
    <p><strong>Arena Lavada para Friso:</strong></p>
    <div class="formula">
      Rendimiento: 1.05 m³ de arena por cada m³ de mortero seco.<br>
      Volumen de arena requerido: <strong>${arena_friso} m³</strong>
    </div>
    
    <p><strong>Bloques de Arcilla:</strong></p>
    <div class="formula">
      Rendimiento Base: 12.5 bloques por m² de pared.<br>
      Bloques 15cm = Área Neta (${s.bloques_15_m2.toFixed(2)} m²) × 12.5 = <strong>${Math.ceil(s.bloques_15_m2 * 12.5)} und</strong><br>
      Bloques 12cm = Área Neta (${s.bloques_12_m2.toFixed(2)} m²) × 12.5 = <strong>${Math.ceil(s.bloques_12_m2 * 12.5)} und</strong>
    </div>

    <p><strong>Vigas Corona / Amarre:</strong></p>
    <div class="formula">
      Volumen Neto de Concreto: ${s.vol_vigas_corona_m3.toFixed(2)} m³<br>
      Acero Longitudinal (10mm): <strong>${s.corona_10mm_bars} varillas</strong><br>
      Acero Transversal (Estribos 5.2mm): <strong>${s.corona_5_2mm_bars} varillas</strong>
    </div>
  </div>
  
  <div class="card">
    <h2>3. Acabados y Pintura (Solo interior)</h2>
    <p><strong>Pasta Profesional:</strong></p>
    <div class="formula">
      Rendimiento: 1 cuñete (4-5 galones) rinde ~25 m².<br>
      Cuñetes requeridos: <strong>${Math.ceil(s.area_lisa_m2 / 25.0)} cuñetes</strong>
    </div>
    
    <p><strong>Pintura:</strong></p>
    <div class="formula">
      Rendimiento: 1 galón rinde ~20 m² a dos manos.<br>
      Galones requeridos: <strong>${Math.ceil(s.area_lisa_m2 / 20.0)} galones</strong>
    </div>
  </div>
  ${(s.vol_machones_m3 || 0) > 0 ? `
  <div class="card">
    <h2>4. Machones / Columnas</h2>
    <p><strong>Volumen de Concreto:</strong></p>
    <div class="formula">
      Volumen Neto de Machones: ${s.vol_machones_m3.toFixed(2)} m³<br><br>
      <em>Desglose de Preparación en Obra:</em><br>
      - Cemento Portland: ~9.5 sacos por m³ = <strong>${Math.ceil(s.vol_machones_m3 * 9.5)} sacos</strong><br>
      - Arena Lavada: ~0.55 m³ por m³ = <strong>${(s.vol_machones_m3 * 0.55).toFixed(2)} m³</strong><br>
      - Piedra Picada: ~0.67 m³ por m³ = <strong>${(s.vol_machones_m3 * 0.67).toFixed(2)} m³</strong>
    </div>
    <p><strong>Acero de Machones:</strong></p>
    <div class="formula">
      Acero Longitudinal (10mm): <strong>${s.machones_10mm_bars || 0} varillas</strong> (4 por machón + anclaje)<br>
      Acero Transversal (Estribos 5.2mm): <strong>${s.machones_5_2mm_bars || 0} varillas</strong> (@ 15cm)
    </div>
  </div>` : ''}
  ` : ''}
  
</body>
</html>`;
  
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  } else {
    toast.error("Por favor permite las ventanas emergentes (pop-ups) para ver la memoria.");
  }
};
