import React, { useState, useMemo, useRef } from 'react';

const CalculadoraDrywall = () => {
  // ─── ESTADO ───
  const [pared, setPared] = useState({ largo: 4.0, alto: 2.5 });
  const [puertas, setPuertas] = useState({ incluir: false, cantidad: 1, ancho: 0.9, alto: 2.1 });
  const [ventanas, setVentanas] = useState({ incluir: false, cantidad: 1, ancho: 1.2, alto: 1.2, alturaSuelo: 1.0 });
  const [desperdicio, setDesperdicio] = useState(10); // %
  const [costos, setCostos] = useState({
    lamina: 25,
    canal: 8,
    paral: 6,
    tornilloEstructura: 0.05,
    tornilloDrywall: 0.03,
    pasta: 18,
    cinta: 12,
  });

  const reportRef = useRef(null);

  // ─── HANDLERS ───
  const handlePared = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setPared(p => ({ ...p, [name]: isNaN(val) || val < 0 ? 0 : val }));
  };

  const handlePuertas = (e) => {
    const { name, value, type, checked } = e.target;
    setPuertas(p => ({ ...p, [name]: type === 'checkbox' ? checked : parseFloat(value) || 0 }));
  };

  const handleVentanas = (e) => {
    const { name, value, type, checked } = e.target;
    setVentanas(v => ({ ...v, [name]: type === 'checkbox' ? checked : parseFloat(value) || 0 }));
  };

  const handleCosto = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setCostos(c => ({ ...c, [name]: isNaN(val) || val < 0 ? 0 : val }));
  };

  // ─── CÁLCULOS ───
  const resultados = useMemo(() => {
    const areaLamina = 1.22 * 2.44; // 2.9768 m²
    const areaTotal = pared.largo * pared.alto;

    const areaPuertas = puertas.incluir ? puertas.cantidad * puertas.ancho * puertas.alto : 0;
    const areaVentanas = ventanas.incluir ? ventanas.cantidad * ventanas.ancho * ventanas.alto : 0;
    const areaNeta = Math.max(0, areaTotal - areaPuertas - areaVentanas);

    // ── Verificación de espacio horizontal ──
    const anchoAberturas = (puertas.incluir ? puertas.cantidad * puertas.ancho : 0)
                         + (ventanas.incluir ? ventanas.cantidad * ventanas.ancho : 0);
    const numAberturas = (puertas.incluir ? puertas.cantidad : 0) + (ventanas.incluir ? ventanas.cantidad : 0);
    const separacionMin = 0.15; // 15 cm entre aberturas y bordes
    const espacioNecesario = anchoAberturas + (numAberturas > 0 ? (numAberturas + 1) * separacionMin : 0);
    const cabenHorizontal = anchoAberturas <= pared.largo && espacioNecesario <= pared.largo;

    // ── Verificación vertical ventanas ──
    const ventanasValidas = ventanas.incluir
      ? (ventanas.alturaSuelo + ventanas.alto <= pared.alto)
      : true;

    // ── Materiales (2 CARAS) ──
    const factorDesperdicio = 1 + (desperdicio / 100);

    // Láminas: área neta * 2 caras / área lámina, con desperdicio
    const laminasBruto = (areaNeta * 2) / areaLamina;
    const laminas = Math.ceil(laminasBruto * factorDesperdicio);

    // Canales: superior + inferior. Piezas de 3.05m
    const canalesPorLado = Math.ceil(pared.largo / 3.05);
    const canales = canalesPorLado * 2; // sup + inf (estructura compartida)

    // Parales: cada 0.61m + 1 extremo. Refuerzos por aberturas.
    let parales = Math.ceil(pared.largo / 0.61) + 1;
    if (puertas.incluir) parales += puertas.cantidad * 2;
    if (ventanas.incluir) parales += ventanas.cantidad * 2;

    // Tornillos
    const tornillosEstructura = Math.ceil(parales * 12 * factorDesperdicio); // 12 por paral
    const tornillosDrywall = Math.ceil(laminas * 36 * factorDesperdicio); // 36 por lámina

    // Pasta: ~0.8 kg/m² por cara
    const pastaMastic = Math.ceil((areaNeta * 2 * 0.8 * factorDesperdicio) / 15);

    // Cinta: juntas verticales + horizontales (ambas caras)
    const laminasHorizontales = Math.ceil(pared.largo / 1.22);
    const juntasVerticales = Math.max(0, laminasHorizontales - 1) * pared.alto;
    const filasVerticales = Math.ceil(pared.alto / 2.44);
    const juntasHorizontales = Math.max(0, filasVerticales - 1) * pared.largo;
    const totalCintaMetros = (juntasVerticales + juntasHorizontales) * 2 * factorDesperdicio;
    const cinta = Math.ceil(totalCintaMetros / 75); // rollos 75m

    // Costos
    const totalLamina = laminas * costos.lamina;
    const totalCanal = canales * costos.canal;
    const totalParal = parales * costos.paral;
    const totalTornilloE = tornillosEstructura * costos.tornilloEstructura;
    const totalTornilloD = tornillosDrywall * costos.tornilloDrywall;
    const totalPasta = pastaMastic * costos.pasta;
    const totalCinta = cinta * costos.cinta;
    const totalGeneral = totalLamina + totalCanal + totalParal + totalTornilloE + totalTornilloD + totalPasta + totalCinta;

    return {
      areaTotal: areaTotal.toFixed(2),
      areaNeta: areaNeta.toFixed(2),
      cabenHorizontal,
      espacioNecesario: espacioNecesario.toFixed(2),
      ventanasValidas,
      laminas,
      canales,
      parales,
      tornillosEstructura,
      tornillosDrywall,
      pastaMastic,
      cinta,
      totalLamina,
      totalCanal,
      totalParal,
      totalTornilloE,
      totalTornilloD,
      totalPasta,
      totalCinta,
      totalGeneral,
      materiales: [
        { nombre: 'Láminas Drywall (1.22×2.44m)', cantidad: laminas, unidad: 'pzas', precio: costos.lamina, total: totalLamina },
        { nombre: 'Canales UW (3.05m)', cantidad: canales, unidad: 'pzas', precio: costos.canal, total: totalCanal },
        { nombre: 'Parales CW (3.05m)', cantidad: parales, unidad: 'pzas', precio: costos.paral, total: totalParal },
        { nombre: 'Tornillos Estructura (#6×1″)', cantidad: tornillosEstructura, unidad: 'und', precio: costos.tornilloEstructura, total: totalTornilloE },
        { nombre: 'Tornillos Drywall (#6×1¼″)', cantidad: tornillosDrywall, unidad: 'und', precio: costos.tornilloDrywall, total: totalTornilloD },
        { nombre: 'Pasta Mastic (15kg)', cantidad: pastaMastic, unidad: 'cuñetes', precio: costos.pasta, total: totalPasta },
        { nombre: 'Cinta de Papel (75m)', cantidad: cinta, unidad: 'rollos', precio: costos.cinta, total: totalCinta },
      ]
    };
  }, [pared, puertas, ventanas, desperdicio, costos]);

  // ─── POSICIONAMIENTO INTELIGENTE SVG ───
  // Todo en METROS, se convierte a px al dibujar
  const posicionesAberturas = useMemo(() => {
    if (!puertas.incluir && !ventanas.incluir) return [];

    const separacion = 0.20; // 20 cm entre aberturas
    const margen = 0.15;     // 15 cm desde bordes

    const anchoPuertas = puertas.incluir ? puertas.cantidad * puertas.ancho : 0;
    const anchoVentanas = ventanas.incluir ? ventanas.cantidad * ventanas.ancho : 0;
    const anchoTotal = anchoPuertas + anchoVentanas;
    const numAberturas = (puertas.incluir ? puertas.cantidad : 0) + (ventanas.incluir ? ventanas.cantidad : 0);
    const numSeparaciones = numAberturas + 1; // entre bordes y entre aberturas

    // Distribución proporcional si caben, si no, al menos mostrarlas con margen mínimo
    let espacioLibre = pared.largo - anchoTotal;
    let sep = separacion;
    let marg = margen;

    if (espacioLibre > 0 && numSeparaciones > 0) {
      // Distribuir espacio libre equitativamente entre todos los huecos
      const espacioPorHueco = espacioLibre / numSeparaciones;
      sep = espacioPorHueco;
      marg = espacioPorHueco;
    }

    const posiciones = [];
    let x = marg;

    // Puertas primero
    if (puertas.incluir) {
      for (let i = 0; i < puertas.cantidad; i++) {
        posiciones.push({
          tipo: 'puerta',
          x,
          y: 0, // desde arriba en metros (se convertirá en SVG)
          ancho: puertas.ancho,
          alto: puertas.alto,
          desdeSuelo: true
        });
        x += puertas.ancho + sep;
      }
    }

    // Ventanas después
    if (ventanas.incluir) {
      for (let i = 0; i < ventanas.cantidad; i++) {
        posiciones.push({
          tipo: 'ventana',
          x,
          y: pared.alto - ventanas.alturaSuelo - ventanas.alto, // coordenada Y desde arriba en metros
          ancho: ventanas.ancho,
          alto: ventanas.alto,
          desdeSuelo: false
        });
        x += ventanas.ancho + sep;
      }
    }

    return posiciones;
  }, [pared, puertas, ventanas]);

  // ─── SVG CONFIG ───
  const svgWidth = 420;
  const svgHeight = 320;
  const margin = 30;

  const scaleX = (svgWidth - margin * 2) / (pared.largo || 1);
  const scaleY = (svgHeight - margin * 2) / (pared.alto || 1);
  const scale = Math.min(scaleX, scaleY);

  const rectW = pared.largo * scale;
  const rectH = pared.alto * scale;
  const originX = (svgWidth - rectW) / 2;
  const originY = svgHeight - margin; // línea de piso
  const topY = originY - rectH;

  // ─── EXPORTAR PDF ───
  const exportarPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Cotización Drywall</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
            h2 { color: #2e7d32; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #e8f5e9; }
            .total { font-weight: bold; font-size: 18px; color: #d32f2f; text-align: right; margin-top: 20px; }
            .info { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Cotización de Materiales – Pared Drywall</h1>
          <div class="info">
            <strong>Dimensiones de la pared:</strong> ${pared.largo}m × ${pared.alto}m (${resultados.areaTotal} m²)<br/>
            <strong>Área neta (ambas caras):</strong> ${resultados.areaNeta} m² × 2 = ${(parseFloat(resultados.areaNeta) * 2).toFixed(2)} m²<br/>
            <strong>Desperdicio aplicado:</strong> ${desperdicio}%<br/>
            ${puertas.incluir ? `<strong>Puertas:</strong> ${puertas.cantidad} de ${puertas.ancho}×${puertas.alto}m<br/>` : ''}
            ${ventanas.incluir ? `<strong>Ventanas:</strong> ${ventanas.cantidad} de ${ventanas.ancho}×${ventanas.alto}m<br/>` : ''}
          </div>

          <h2>Lista de Materiales y Costos</h2>
          <table>
            <tr>
              <th>Material</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
            ${resultados.materiales.map(m => `
              <tr>
                <td>${m.nombre}</td>
                <td>${m.cantidad}</td>
                <td>${m.unidad}</td>
                <td>$${m.precio.toFixed(2)}</td>
                <td>$${m.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="total">TOTAL ESTIMADO: $${resultados.totalGeneral.toFixed(2)}</div>

          <div class="footer">
            Generado el ${new Date().toLocaleDateString()} · Calculadora Drywall · Los precios son referenciales y editables por el usuario.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  // ─── RENDER ───
  return (
    <div style={{ padding: '24px', fontFamily: 'Segoe UI, Arial, sans-serif', maxWidth: '1100px', margin: '0 auto', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#1a237e' }}>🧱 Calculadora de Paredes Drywall</h2>
        <p style={{ color: '#555', margin: 0 }}>Cálculo para pared con <strong>ambas caras</strong> (doble lámina). Posicionamiento inteligente de aberturas.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* ─── PANEL IZQUIERDO: CONFIGURACIÓN ─── */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Dimensiones */}
          <Card title="📐 Dimensiones de la Pared" color="#1a237e">
            <InputRow label="Largo (m)" name="largo" value={pared.largo} onChange={handlePared} step={0.1} />
            <InputRow label="Alto (m)" name="alto" value={pared.alto} onChange={handlePared} step={0.1} />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 500 }}>Desperdicio:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="range" min="0" max="30" value={desperdicio} onChange={e => setDesperdicio(parseInt(e.target.value))} style={{ width: '100px' }} />
                <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }}>{desperdicio}%</span>
              </div>
            </div>
          </Card>

          {/* Puertas */}
          <Card title="🚪 Puertas" color="#6a1b9a">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '10px', cursor: 'pointer' }}>
              <input type="checkbox" name="incluir" checked={puertas.incluir} onChange={handlePuertas} />
              Incluir puertas
            </label>
            {puertas.incluir && (
              <div style={{ paddingLeft: '8px' }}>
                <InputRow label="Cantidad" name="cantidad" value={puertas.cantidad} onChange={handlePuertas} step={1} />
                <InputRow label="Ancho (m)" name="ancho" value={puertas.ancho} onChange={handlePuertas} step={0.1} />
                <InputRow label="Alto (m)" name="alto" value={puertas.alto} onChange={handlePuertas} step={0.1} />
              </div>
            )}
          </Card>

          {/* Ventanas */}
          <Card title="🪟 Ventanas" color="#00695c">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '10px', cursor: 'pointer' }}>
              <input type="checkbox" name="incluir" checked={ventanas.incluir} onChange={handleVentanas} />
              Incluir ventanas
            </label>
            {ventanas.incluir && (
              <div style={{ paddingLeft: '8px' }}>
                <InputRow label="Cantidad" name="cantidad" value={ventanas.cantidad} onChange={handleVentanas} step={1} />
                <InputRow label="Ancho (m)" name="ancho" value={ventanas.ancho} onChange={handleVentanas} step={0.1} />
                <InputRow label="Alto (m)" name="alto" value={ventanas.alto} onChange={handleVentanas} step={0.1} />
                <InputRow label="Altura del suelo (m)" name="alturaSuelo" value={ventanas.alturaSuelo} onChange={handleVentanas} step={0.1} />
              </div>
            )}
          </Card>

          {/* Costos */}
          <Card title="💰 Costos Unitarios (Editables)" color="#e65100">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CostInput label="Lámina" name="lamina" value={costos.lamina} onChange={handleCosto} />
              <CostInput label="Canal" name="canal" value={costos.canal} onChange={handleCosto} />
              <CostInput label="Paral" name="paral" value={costos.paral} onChange={handleCosto} />
              <CostInput label="Torn. Estr." name="tornilloEstructura" value={costos.tornilloEstructura} onChange={handleCosto} />
              <CostInput label="Torn. Dry" name="tornilloDrywall" value={costos.tornilloDrywall} onChange={handleCosto} />
              <CostInput label="Pasta 15kg" name="pasta" value={costos.pasta} onChange={handleCosto} />
              <CostInput label="Cinta 75m" name="cinta" value={costos.cinta} onChange={handleCosto} />
            </div>
          </Card>
        </div>

        {/* ─── PANEL CENTRO: VISUALIZACIÓN ─── */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* SVG */}
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>📐 Plano de la Pared</h3>
              <span style={{ fontSize: '12px', color: '#888' }}>Escala automática</span>
            </div>

            <svg width={svgWidth} height={svgHeight} style={{ background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '6px', display: 'block', margin: '0 auto' }}>
              {/* Fondo pared */}
              <rect x={originX} y={topY} width={rectW} height={rectH} fill="#e0e0e0" stroke="#9e9e9e" strokeWidth="2" />

              {/* Líneas de parales (cada 0.61m) */}
              {Array.from({ length: Math.ceil(pared.largo / 0.61) + 1 }).map((_, i) => {
                const x = originX + (i * 0.61 * scale);
                if (x > originX + rectW) return null;
                return <line key={`paral-${i}`} x1={x} y1={topY} x2={x} y2={originY} stroke="#bdbdbd" strokeWidth="1" strokeDasharray="4 2" />;
              })}

              {/* Aberturas */}
              {posicionesAberturas.map((ab, i) => {
                const x = originX + (ab.x * scale);
                const w = ab.ancho * scale;
                const h = ab.alto * scale;
                const y = ab.desdeSuelo ? originY - h : originY - ((ab.y + ab.alto) * scale);
                // Validación visual: si se sale, dibujar en rojo
                const fuera = (ab.x + ab.ancho > pared.largo) || (ab.y < 0) || (!ab.desdeSuelo && (ab.y + ab.alto > pared.alto));
                return (
                  <rect
                    key={`ab-${i}`}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={fuera ? '#ffcdd2' : ab.tipo === 'puerta' ? '#8d6e63' : '#bbdefb'}
                    stroke={fuera ? '#d32f2f' : ab.tipo === 'puerta' ? '#5d4037' : '#1976d2'}
                    strokeWidth="2"
                  />
                );
              })}

              {/* Piso */}
              <line x1={0} y1={originY} x2={svgWidth} y2={originY} stroke="#555" strokeWidth="3" />
              <text x={svgWidth / 2} y={svgHeight - 5} textAnchor="middle" fontSize="12" fill="#666">Nivel del piso</text>

              {/* Cotas */}
              <text x={originX + rectW / 2} y={topY - 10} textAnchor="middle" fontSize="12" fill="#333" fontWeight="bold">{pared.largo} m</text>
              <text x={originX - 30} y={topY + rectH / 2 + 4} textAnchor="middle" fontSize="12" fill="#333" fontWeight="bold">{pared.alto} m</text>
            </svg>

            {/* Advertencias */}
            {!resultados.cabenHorizontal && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '6px', border: '1px solid #ef9a9a' }}>
                <p style={{ color: '#c62828', margin: 0, fontSize: '14px' }}>
                  ⚠️ Las aberturas no caben horizontalmente. Necesitas {resultados.espacioNecesario}m y la pared mide {pared.largo}m.
                </p>
              </div>
            )}
            {!resultados.ventanasValidas && ventanas.incluir && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '6px', border: '1px solid #ffcc80' }}>
                <p style={{ color: '#e65100', margin: 0, fontSize: '14px' }}>
                  ⚠️ La ventana sale de la pared verticalmente. Altura suelo ({ventanas.alturaSuelo}m) + Alto ({ventanas.alto}m) = {ventanas.alturaSuelo + ventanas.alto}m {'>'} {pared.alto}m.
                </p>
              </div>
            )}
          </div>

          {/* Materiales rápidos */}
          <div style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1b5e20' }}>📋 Resumen de Materiales (2 caras)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <StatBox label="Láminas" value={resultados.laminas} />
              <StatBox label="Canales" value={resultados.canales} />
              <StatBox label="Parales" value={resultados.parales} />
              <StatBox label="Pasta 15kg" value={resultados.pastaMastic} />
              <StatBox label="Torn. Estructura" value={resultados.tornillosEstructura} />
              <StatBox label="Torn. Drywall" value={resultados.tornillosDrywall} />
              <StatBox label="Cinta 75m" value={resultados.cinta} />
              <StatBox label="Área Neta" value={`${resultados.areaNeta} m²`} />
            </div>
          </div>
        </div>

        {/* ─── PANEL DERECHO: COSTOS Y PDF ─── */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#333' }}>🧾 Desglose de Costos</h3>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Material</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {resultados.materiales.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px' }}>{m.nombre}</td>
                    <td style={{ textAlign: 'right', padding: '6px 4px' }}>${m.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#555' }}>TOTAL ESTIMADO</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>${resultados.totalGeneral.toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={exportarPDF}
            style={{
              padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#d32f2f',
              color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'background 0.2s'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#b71c1c'}
            onMouseOut={e => e.target.style.backgroundColor = '#d32f2f'}
          >
            📄 Exportar Cotización a PDF
          </button>

          <div style={{ padding: '12px', backgroundColor: '#fffde7', borderRadius: '8px', border: '1px solid #fff9c4' }}>
            <small style={{ color: '#666' }}>
              ⚠️ Los cálculos incluyen ambas caras de la pared (estructura compartida, doble lámina). Verifica siempre en obra las medidas exactas.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTES AUXILIARES ───

const Card = ({ title, color, children }) => (
  <div style={{ padding: '18px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
    <h4 style={{ margin: '0 0 14px 0', color }}>{title}</h4>
    {children}
  </div>
);

const InputRow = ({ label, name, value, onChange, step = 1 }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
    <label style={{ fontWeight: 500, color: '#333', fontSize: '14px' }}>{label}</label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      step={step}
      min={0}
      style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', textAlign: 'right', fontSize: '14px' }}
    />
  </div>
);

const CostInput = ({ label, name, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '12px', color: '#555', fontWeight: 500 }}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#888', fontSize: '13px' }}>$</span>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        step={0.01}
        min={0}
        style={{ width: '70px', padding: '5px 6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '13px', textAlign: 'right' }}
      />
    </div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{value}</div>
  </div>
);

export default CalculadoraDrywall;