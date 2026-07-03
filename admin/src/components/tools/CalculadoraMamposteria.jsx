import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calculator, DoorOpen, Maximize, Ruler, Download, ArrowLeft, Brush } from 'lucide-react';
import { Link } from 'react-router-dom';

const CalculadoraMamposteria = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ─── ESTADO ───
  const [pared, setPared] = useState({ largo: 4.0, alto: 2.5 });
  const [puertas, setPuertas] = useState({ incluir: false, cantidad: 1, ancho: 0.9, alto: 2.1 });
  const [ventanas, setVentanas] = useState({ incluir: false, cantidad: 1, ancho: 1.2, alto: 1.2, alturaSuelo: 1.0 });
  const [desperdicio, setDesperdicio] = useState(10); // %

  const [tipoBloque, setTipoBloque] = useState('arcilla'); // 'arcilla' o 'cemento'
  const [grosorBloque, setGrosorBloque] = useState(15); // cm
  const [friso, setFriso] = useState('1_cara'); // 'ninguna', '1_cara', '2_caras'
  const [acabado, setAcabado] = useState('rustico'); // 'rustico', 'liso'

  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [viewCurrency, setViewCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(653.00);

  const [costos, setCostos] = useState({
    bloque_arcilla_10: 0.60,
    bloque_arcilla_12: 0.64,
    bloque_arcilla_15: 0.65,
    bloque_cemento_10: 0.60,
    bloque_cemento_15: 0.65,
    bloque_cemento_20: 0.70,
    cemento: 13.46,
    arena: 45.24,
    polvillo: 53.36,
    pasta: 17.48, // Galón
    pintura: 17.40 // Galón
  });

  const reportRef = useRef(null);

  // Efecto para ajustar grosores según el tipo de bloque
  useEffect(() => {
    if (tipoBloque === 'arcilla' && grosorBloque === 20) {
      setGrosorBloque(15);
    }
    if (tipoBloque === 'cemento' && grosorBloque === 12) {
      setGrosorBloque(15);
    }
  }, [tipoBloque, grosorBloque]);

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

  const handleBaseCurrencyChange = (e) => {
    const newBase = e.target.value;
    if (newBase !== baseCurrency) {
      const newCostos = {};
      for (const key in costos) {
        if (newBase === 'VES' && baseCurrency === 'USD') {
          newCostos[key] = parseFloat((costos[key] * exchangeRate).toFixed(2));
        } else if (newBase === 'USD' && baseCurrency === 'VES') {
          newCostos[key] = parseFloat((costos[key] / exchangeRate).toFixed(2));
        } else {
          newCostos[key] = costos[key];
        }
      }
      setCostos(newCostos);
      setBaseCurrency(newBase);
      setViewCurrency(newBase);
    }
  };

  // ─── CÁLCULOS ───
  const resultados = useMemo(() => {
    const areaTotal = pared.largo * pared.alto;
    const areaPuertas = puertas.incluir ? puertas.cantidad * puertas.ancho * puertas.alto : 0;
    const areaVentanas = ventanas.incluir ? ventanas.cantidad * ventanas.ancho * ventanas.alto : 0;
    const areaNeta = Math.max(0, areaTotal - areaPuertas - areaVentanas);

    // ── Verificación de espacio ──
    const anchoAberturas = (puertas.incluir ? puertas.cantidad * puertas.ancho : 0)
                         + (ventanas.incluir ? ventanas.cantidad * ventanas.ancho : 0);
    const numAberturas = (puertas.incluir ? puertas.cantidad : 0) + (ventanas.incluir ? ventanas.cantidad : 0);
    const separacionMin = 0.15;
    const espacioNecesario = anchoAberturas + (numAberturas > 0 ? (numAberturas + 1) * separacionMin : 0);
    const cabenHorizontal = anchoAberturas <= pared.largo && espacioNecesario <= pared.largo;
    const ventanasValidas = ventanas.incluir ? (ventanas.alturaSuelo + ventanas.alto <= pared.alto) : true;

    // ── Materiales ──
    const factorDesperdicio = 1 + (desperdicio / 100);

    // Bloques
    const anchoB = tipoBloque === 'arcilla' ? 0.30 : 0.40;
    const altoB = tipoBloque === 'arcilla' ? 0.25 : 0.20;
    const areaB = anchoB * altoB;
    const cantBloquesBruto = areaNeta / areaB;
    const bloques = Math.ceil(cantBloquesBruto * factorDesperdicio);

    // Mortero Pegue (Mezcla de asiento 1.5 cm)
    const ML_juntas = (1 / anchoB) + (1 / altoB); // m lineales de junta por m2
    const grosor_m = grosorBloque / 100;
    const vol_mortero_pegue_m2 = ML_juntas * 0.015 * grosor_m; // 1.5cm de mezcla
    const vol_mortero_pegue_total = vol_mortero_pegue_m2 * areaNeta;

    // Mortero Friso (1.2 cm)
    let areaFriso = 0;
    if (friso === '1_cara') areaFriso = areaNeta;
    if (friso === '2_caras') areaFriso = areaNeta * 2;
    const vol_mortero_friso = areaFriso * 0.012; // 1.2cm espesor

    const vol_mortero_total = (vol_mortero_pegue_total + vol_mortero_friso) * factorDesperdicio;

    // Cemento y Arena (proporción 1:4 => 1m3 mortero = 7.5 sacos cemento + 1.05m3 agregado)
    const sacosCemento = Math.ceil(vol_mortero_total * 7.5) || (areaNeta > 0 ? 1 : 0);
    const arena_total = vol_mortero_total * 1.05;
    // 1:1 Arena Lavada / Polvillo
    const m3Arena = parseFloat((arena_total / 2).toFixed(2)) || (areaNeta > 0 ? 0.25 : 0);
    const m3Polvillo = parseFloat((arena_total / 2).toFixed(2)) || (areaNeta > 0 ? 0.25 : 0);

    // Acabado
    let galonesPasta = 0;
    let galonesPintura = 0;

    if (friso !== 'ninguna' && acabado === 'liso') {
      // Rendimiento aprox: 1 galón de pasta = 4 m2
      galonesPasta = Math.ceil((areaFriso / 4) * factorDesperdicio);
      // Rendimiento aprox: 1 galón de pintura = 15 m2
      galonesPintura = Math.ceil((areaFriso / 15) * factorDesperdicio);
    }

    // Conversión de moneda
    const convertPrice = (price) => {
      if (baseCurrency === viewCurrency) return price;
      if (baseCurrency === 'VES' && viewCurrency === 'USD') return price / exchangeRate;
      if (baseCurrency === 'USD' && viewCurrency === 'VES') return price * exchangeRate;
      return price;
    };

    const pBloque = convertPrice(costos[`bloque_${tipoBloque}_${grosorBloque}`] || 0);
    const pCemento = convertPrice(costos.cemento);
    const pArena = convertPrice(costos.arena);
    const pPolvillo = convertPrice(costos.polvillo);
    const pPasta = convertPrice(costos.pasta);
    const pPintura = convertPrice(costos.pintura);

    const totalBloque = bloques * pBloque;
    const totalCemento = sacosCemento * pCemento;
    const totalArena = m3Arena * pArena;
    const totalPolvillo = m3Polvillo * pPolvillo;
    const totalPasta = galonesPasta * pPasta;
    const totalPintura = galonesPintura * pPintura;

    const totalGeneral = totalBloque + totalCemento + totalArena + totalPolvillo + totalPasta + totalPintura;

    const materialesArray = [
      { nombre: `Bloque de ${tipoBloque === 'arcilla' ? 'Arcilla' : 'Cemento'} (${grosorBloque}cm)`, cantidad: bloques, unidad: 'und', precio: pBloque, total: totalBloque },
      { nombre: 'Cemento Portland (42.5kg)', cantidad: sacosCemento, unidad: 'sacos', precio: pCemento, total: totalCemento },
      { nombre: 'Arena Lavada', cantidad: m3Arena, unidad: 'm³', precio: pArena, total: totalArena },
      { nombre: 'Polvillo', cantidad: m3Polvillo, unidad: 'm³', precio: pPolvillo, total: totalPolvillo },
    ];

    if (friso !== 'ninguna' && acabado === 'liso') {
      materialesArray.push(
        { nombre: 'Pasta Profesional (Galón)', cantidad: galonesPasta, unidad: 'galones', precio: pPasta, total: totalPasta },
        { nombre: 'Pintura de Caucho (Galón)', cantidad: galonesPintura, unidad: 'galones', precio: pPintura, total: totalPintura }
      );
    }

    return {
      areaTotal: areaTotal.toFixed(2),
      areaNeta: areaNeta.toFixed(2),
      areaFriso: areaFriso.toFixed(2),
      cabenHorizontal,
      espacioNecesario: espacioNecesario.toFixed(2),
      ventanasValidas,
      materiales: materialesArray,
      totalGeneral
    };
  }, [pared, puertas, ventanas, desperdicio, tipoBloque, grosorBloque, friso, acabado, costos, baseCurrency, viewCurrency, exchangeRate]);

  // ─── SVG CONFIG ───
  const posicionesAberturas = useMemo(() => {
    if (!puertas.incluir && !ventanas.incluir) return [];
    const separacion = 0.20;
    const margen = 0.15;
    const anchoPuertas = puertas.incluir ? puertas.cantidad * puertas.ancho : 0;
    const anchoVentanas = ventanas.incluir ? ventanas.cantidad * ventanas.ancho : 0;
    const anchoTotal = anchoPuertas + anchoVentanas;
    const numAberturas = (puertas.incluir ? puertas.cantidad : 0) + (ventanas.incluir ? ventanas.cantidad : 0);
    const numSeparaciones = numAberturas + 1;
    let espacioLibre = pared.largo - anchoTotal;
    let sep = separacion;
    let marg = margen;
    if (espacioLibre > 0 && numSeparaciones > 0) {
      const espacioPorHueco = espacioLibre / numSeparaciones;
      sep = espacioPorHueco;
      marg = espacioPorHueco;
    }
    const posiciones = [];
    let x = marg;
    if (puertas.incluir) {
      for (let i = 0; i < puertas.cantidad; i++) {
        posiciones.push({ tipo: 'puerta', x, y: 0, ancho: puertas.ancho, alto: puertas.alto, desdeSuelo: true });
        x += puertas.ancho + sep;
      }
    }
    if (ventanas.incluir) {
      for (let i = 0; i < ventanas.cantidad; i++) {
        posiciones.push({ tipo: 'ventana', x, y: pared.alto - ventanas.alturaSuelo - ventanas.alto, ancho: ventanas.ancho, alto: ventanas.alto, desdeSuelo: false });
        x += ventanas.ancho + sep;
      }
    }
    return posiciones;
  }, [pared, puertas, ventanas]);

  const svgWidth = 420;
  const svgHeight = 320;
  const margin = 45;
  const scaleX = (svgWidth - margin * 2) / (pared.largo || 1);
  const scaleY = (svgHeight - margin * 2) / (pared.alto || 1);
  const scale = Math.min(scaleX, scaleY);
  const rectW = pared.largo * scale;
  const rectH = pared.alto * scale;
  const originX = (svgWidth - rectW) / 2;
  const originY = svgHeight - margin;
  const topY = originY - rectH;

  const formatMoney = (amount) => {
    const symbol = viewCurrency === 'VES' ? 'Bs.' : '$';
    return `${symbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ─── EXPORTACIONES ───
  const exportarPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Cotización Mampostería</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
            h2 { color: #2e7d32; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #e8f5e9; }
            .total { font-weight: bold; font-size: 18px; color: #d32f2f; text-align: right; margin-top: 20px; }
            .info { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Cotización – Pared de Mampostería</h1>
          <div class="info">
            <strong>Dimensiones:</strong> ${pared.largo}m × ${pared.alto}m (${resultados.areaTotal} m²)<br/>
            <strong>Área Neta:</strong> ${resultados.areaNeta} m²<br/>
            <strong>Bloque:</strong> ${tipoBloque === 'arcilla' ? 'Arcilla' : 'Cemento'} de ${grosorBloque}cm<br/>
            <strong>Friso:</strong> ${friso === 'ninguna' ? 'Sin Friso' : (friso === '1_cara' ? '1 Cara' : '2 Caras')} (${resultados.areaFriso} m²)<br/>
            ${friso !== 'ninguna' ? `<strong>Acabado:</strong> ${acabado === 'liso' ? 'Liso (Enastado y Pintura)' : 'Rústico'}<br/>` : ''}
            <strong>Desperdicio:</strong> ${desperdicio}%<br/>
          </div>
          <h2>Lista de Materiales y Costos</h2>
          <table>
            <tr><th>Material</th><th>Cantidad</th><th>Unidad</th><th>Precio Unit.</th><th>Subtotal</th></tr>
            ${resultados.materiales.map(m => `
              <tr>
                <td>${m.nombre}</td>
                <td>${m.cantidad}</td>
                <td>${m.unidad}</td>
                <td>${formatMoney(m.precio)}</td>
                <td>${formatMoney(m.total)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="total">TOTAL ESTIMADO: ${formatMoney(resultados.totalGeneral)}</div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const exportarExcel = () => {
    let html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="utf-8"></head>
        <body>
          <table>
            <tr><th colspan="5" style="font-size: 20px; font-weight: bold;">Presupuesto Estimado - Mampostería</th></tr>
            <tr><th colspan="5">Área Neta: ${resultados.areaNeta} m² | Friso: ${resultados.areaFriso} m²</th></tr>
            <tr><th colspan="5">Tasa de Cambio (Bs/$): ${exchangeRate} | Moneda Mostrada: ${viewCurrency === 'VES' ? 'Bs' : '$'}</th></tr>
            <tr><th>Material</th><th>Cantidad</th><th>Unidad</th><th>Precio Unitario</th><th>Subtotal</th></tr>
            ${resultados.materiales.map(m => `
              <tr>
                <td>${m.nombre}</td>
                <td>${m.cantidad}</td>
                <td>${m.unidad}</td>
                <td>${m.precio}</td>
                <td>${m.total}</td>
              </tr>
            `).join('')}
            <tr><td colspan="4" style="text-align: right; font-weight: bold;">TOTAL:</td><td style="font-weight: bold;">${resultados.totalGeneral}</td></tr>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Presupuesto_Mamposteria_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to="/tools" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={20} /> Volver a Herramientas
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1a237e' }}>🧱 Calculadora de Mampostería</h2>
          <p style={{ color: '#555', margin: 0 }}>Cálculo de bloques, mezcla para pegar y friso.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportarPDF} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={18} /> Exportar a PDF
          </button>
          <button onClick={exportarExcel} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={18} /> Exportar a Excel
          </button>
        </div>
      </div>

      {/* Selectores de Moneda */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '12px', color: '#555', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tasa BCV (Bs/$):</label>
          <input type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '12px', color: '#555', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ingresar precios en:</label>
          <select value={baseCurrency} onChange={handleBaseCurrencyChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}>
            <option value="USD">Dólares ($)</option>
            <option value="VES">Bolívares (Bs)</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '12px', color: '#555', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ver total en:</label>
          <select value={viewCurrency} onChange={(e) => setViewCurrency(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}>
            <option value="USD">Dólares ($)</option>
            <option value="VES">Bolívares (Bs)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Configuración de la Pared */}
          <Card title="📐 Dimensiones de la Pared" color="#1a237e">
            <InputRow label="Largo (m)" name="largo" value={pared.largo} onChange={handlePared} step={0.1} />
            <InputRow label="Alto (m)" name="alto" value={pared.alto} onChange={handlePared} step={0.1} />
          </Card>

          {/* Configuración de Bloque y Acabado */}
          <Card title="🧱 Bloque y Acabado" color="#f57c00">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#444' }}>Tipo de Bloque</label>
                <select value={tipoBloque} onChange={(e) => setTipoBloque(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="arcilla">Arcilla (30x25cm)</option>
                  <option value="cemento">Cemento (40x20cm)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#444' }}>Grosor</label>
                <select value={grosorBloque} onChange={(e) => setGrosorBloque(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value={10}>10 cm</option>
                  {tipoBloque === 'arcilla' && <option value={12}>12 cm</option>}
                  <option value={15}>15 cm</option>
                  {tipoBloque === 'cemento' && <option value={20}>20 cm</option>}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#444' }}>Friso</label>
                <select value={friso} onChange={(e) => setFriso(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="ninguna">Sin Friso</option>
                  <option value="1_cara">1 Cara</option>
                  <option value="2_caras">2 Caras</option>
                </select>
              </div>
              {friso !== 'ninguna' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#444' }}>Acabado</label>
                  <select value={acabado} onChange={(e) => setAcabado(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="rustico">Rústico</option>
                    <option value="liso">Liso (Pintado)</option>
                  </select>
                </div>
              )}
            </div>
          </Card>

          {/* Puertas */}
          <Card title="🚪 Puertas" color="#0277bd">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input type="checkbox" id="incPuertas" name="incluir" checked={puertas.incluir} onChange={handlePuertas} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="incPuertas" style={{ fontWeight: 500 }}>Incluir Puertas</label>
            </div>
            {puertas.incluir && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <InputRow label="Cant" name="cantidad" value={puertas.cantidad} onChange={handlePuertas} step={1} />
                <InputRow label="Ancho (m)" name="ancho" value={puertas.ancho} onChange={handlePuertas} step={0.1} />
                <InputRow label="Alto (m)" name="alto" value={puertas.alto} onChange={handlePuertas} step={0.1} />
              </div>
            )}
          </Card>

          {/* Ventanas */}
          <Card title="🪟 Ventanas" color="#00838f">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input type="checkbox" id="incVentanas" name="incluir" checked={ventanas.incluir} onChange={handleVentanas} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="incVentanas" style={{ fontWeight: 500 }}>Incluir Ventanas</label>
            </div>
            {ventanas.incluir && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <InputRow label="Cant" name="cantidad" value={ventanas.cantidad} onChange={handleVentanas} step={1} />
                <InputRow label="Ancho (m)" name="ancho" value={ventanas.ancho} onChange={handleVentanas} step={0.1} />
                <InputRow label="Alto (m)" name="alto" value={ventanas.alto} onChange={handleVentanas} step={0.1} />
                <InputRow label="Al Suelo (m)" name="alturaSuelo" value={ventanas.alturaSuelo} onChange={handleVentanas} step={0.1} />
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Visualización */}
          <Card title="Plano de la Pared" color="#333">
            {!resultados.cabenHorizontal && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                ⚠️ Las aberturas no caben horizontalmente.
              </div>
            )}
            {!resultados.ventanasValidas && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                ⚠️ La ventana sale de la pared verticalmente.
              </div>
            )}
            
            <div style={{ width: '100%', height: '320px', backgroundColor: '#f0f0f0', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={svgWidth} height={svgHeight} style={{ border: '1px solid #ccc', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                {/* Fondo pared */}
                <rect x={originX} y={topY} width={rectW} height={rectH} fill="#ffcc80" opacity="0.6" stroke="#ef6c00" strokeWidth="2" />
                
                {/* Aberturas */}
                {posicionesAberturas.map((ab, i) => {
                  const isPuerta = ab.tipo === 'puerta';
                  const xSVG = originX + ab.x * scale;
                  const wSVG = ab.ancho * scale;
                  const hSVG = ab.alto * scale;
                  const ySVG = isPuerta ? originY - hSVG : originY - (ab.y + ab.alto) * scale;
                  const strokeColor = isPuerta ? '#d32f2f' : '#1976d2';
                  return (
                    <g key={i}>
                      <rect x={xSVG} y={ySVG} width={wSVG} height={hSVG} fill="#fff" stroke={strokeColor} strokeWidth="2" />
                      <text x={xSVG + wSVG / 2} y={ySVG + hSVG / 2} textAnchor="middle" alignmentBaseline="middle" fontSize="10" fill={strokeColor} fontWeight="bold">
                        {ab.ancho} x {ab.alto}
                      </text>
                    </g>
                  );
                })}

                {/* Cotas */}
                <line x1={originX} y1={topY - 15} x2={originX + rectW} y2={topY - 15} stroke="#333" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                <text x={originX + rectW / 2} y={topY - 20} textAnchor="middle" fontSize="12" fill="#333" fontWeight="bold">{pared.largo} m</text>
                <line x1={originX - 15} y1={topY} x2={originX - 15} y2={originY} stroke="#333" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                <text x={originX - 30} y={topY + rectH / 2 + 4} textAnchor="middle" fontSize="12" fill="#333" fontWeight="bold">{pared.alto} m</text>

                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                    <polygon points="0,0 6,3 0,6" fill="#333" />
                  </marker>
                </defs>
              </svg>
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '8px' }}>
              <div><strong>Área Total:</strong> {resultados.areaTotal} m²</div>
              <div style={{ color: '#1565c0' }}><strong>Área Neta:</strong> {resultados.areaNeta} m²</div>
            </div>
          </Card>

          {/* Precios Unitarios */}
          <Card title="💵 Precios Unitarios (Con 16% IVA)" color="#2e7d32">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CostInput label={`Bloque ${tipoBloque === 'arcilla' ? 'Arcilla' : 'Cemento'} (${grosorBloque}cm)`} name={`bloque_${tipoBloque}_${grosorBloque}`} value={costos[`bloque_${tipoBloque}_${grosorBloque}`] || 0} onChange={handleCosto} symbol={baseCurrency === 'VES' ? 'Bs' : '$'} />
              <CostInput label="Cemento (Saco)" name="cemento" value={costos.cemento} onChange={handleCosto} symbol={baseCurrency === 'VES' ? 'Bs' : '$'} />
              <CostInput label="Arena Lavada (m³)" name="arena" value={costos.arena} onChange={handleCosto} symbol={baseCurrency === 'VES' ? 'Bs' : '$'} />
              <CostInput label="Polvillo (m³)" name="polvillo" value={costos.polvillo} onChange={handleCosto} symbol={baseCurrency === 'VES' ? 'Bs' : '$'} />
              {friso !== 'ninguna' && acabado === 'liso' && (
                <>
                  <CostInput label="Pasta Prof. (Galón)" name="pasta" value={costos.pasta} onChange={handleCosto} symbol={baseCurrency === 'VES' ? 'Bs' : '$'} />
                  <CostInput label="Pintura Caucho (Galón)" name="pintura" value={costos.pintura} onChange={handleCosto} symbol={baseCurrency === 'VES' ? 'Bs' : '$'} />
                </>
              )}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>% Desperdicio:</label>
              <input type="number" value={desperdicio} onChange={(e) => setDesperdicio(parseFloat(e.target.value) || 0)} style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </Card>
        </div>
      </div>

      {/* Resultados Resumen */}
      <div style={{ marginTop: '32px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#1a237e', color: '#fff', padding: '16px 24px', fontSize: '18px', fontWeight: 'bold' }}>
          Presupuesto Estimado
        </div>
        <div style={{ padding: '24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#555' }}>Material</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#555' }}>Cantidad</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#555' }}>Precio Unit.</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#555' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {resultados.materiales.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{m.nombre}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                      {m.cantidad} {m.unidad}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#666' }}>{formatMoney(m.precio)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#2e7d32' }}>{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 600 }}>TOTAL MATERIALES</span>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#1b5e20' }}>{formatMoney(resultados.totalGeneral)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTES AUXILIARES ───
const Card = ({ title, color, children }) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
    <div style={{ backgroundColor: color, color: '#fff', padding: '12px 16px', fontWeight: 'bold', fontSize: '15px' }}>
      {title}
    </div>
    <div style={{ padding: '20px' }}>
      {children}
    </div>
  </div>
);

const InputRow = ({ label, name, value, onChange, step }) => (
  <div>
    <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '4px', fontWeight: 500 }}>{label}</label>
    <input type="number" step={step} name={name} value={value} onChange={onChange} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
  </div>
);

const CostInput = ({ label, name, value, onChange, symbol }) => (
  <div>
    <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f5f7fa', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
      <span style={{ color: '#888', fontSize: '13px', fontWeight: 'bold' }}>{symbol}</span>
      <input type="number" step="0.01" name={name} value={value} onChange={onChange} style={{ width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px' }} />
    </div>
  </div>
);

export default CalculadoraMamposteria;
