import React, { useState, useMemo } from 'react';

const MuroGravedad = () => {
  const [datos, setDatos] = useState({
    gamma1: 1500,
    gamma2: 1800,
    gammaMuro: 2000,
    phi1: 30,
    phi2: 47,
    vs: 25000,
    h: 3.5,
    b1: 0.2,
    b2: 0.2,
    df: 1.2,
    a: 0.8,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setDatos((prev) => ({ ...prev, [name]: isNaN(val) ? 0 : val }));
  };

  // ==================== CÁLCULOS CORREGIDOS ====================
  const calc = useMemo(() => {
    const phi1Rad = (datos.phi1 * Math.PI) / 180;
    const phi2Rad = (datos.phi2 * Math.PI) / 180;

    const ka = (1 - Math.sin(phi1Rad)) / (1 + Math.sin(phi1Rad));
    const kp = (1 + Math.sin(phi2Rad)) / (1 - Math.sin(phi2Rad));
    const B = datos.a + datos.b1 + datos.b2;

    // Empuje activo: solo sobre la altura H del muro (NO H+Df)
    const pah = 0.5 * datos.gamma1 * Math.pow(datos.h, 2) * ka;
    const brazoPah = datos.h / 3;
    const mv = pah * brazoPah;

    // Área del muro como trapecio completo
    const areaMuro = ((datos.a + B) * datos.h) / 2;
    const wt = areaMuro * datos.gammaMuro;

    // Centroide del trapecio desde la punta (toe)
    // Descompuesto en: rectángulo central + triángulo izq + triángulo der
    const areaRect = datos.a * datos.h;
    const brazoRect = datos.b1 + datos.a / 2;
    const areaTri1 = (datos.b1 * datos.h) / 2;
    const brazoTri1 = datos.b1 / 3;
    const areaTri2 = (datos.b2 * datos.h) / 2;
    const brazoTri2 = datos.b1 + datos.a + datos.b2 / 3;

    const xBarPeso =
      (areaRect * brazoRect + areaTri1 * brazoTri1 + areaTri2 * brazoTri2) /
      areaMuro;
    const mr = wt * xBarPeso;

    // Empuje pasivo: sobre Df, usando gamma2 (suelo de fundación)
    const pp = 0.5 * datos.gamma2 * Math.pow(datos.df, 2) * kp;

    // Fricción base
    const fr = wt * Math.tan(phi2Rad);

    // Factores de seguridad
    const fsVolteo = mv > 0 ? mr / mv : Infinity;
    const fsDeslizamiento = pah > 0 ? (fr + pp) / pah : Infinity;

    // Resultante en la base
    const xBar = wt > 0 ? (mr - mv) / wt : 0;
    const excentricidad = B / 2 - xBar;
    const nucleo = B / 6;
    const hayTension = Math.abs(excentricidad) > nucleo;

    // Esfuerzos en la base (kg/m²) — SIN dividir por 1000
    const qProm = wt / B;
    const esfuerzoMax = qProm * (1 + (6 * excentricidad) / B);
    const esfuerzoMin = qProm * (1 - (6 * excentricidad) / B);

    return {
      ka,
      kp,
      pah,
      mv,
      wt,
      mr,
      fr,
      pp,
      fsVolteo,
      fsDeslizamiento,
      esfuerzoMax,
      esfuerzoMin,
      xBar,
      brazoPah,
      B,
      excentricidad,
      nucleo,
      hayTension,
      areaMuro,
    };
  }, [datos]);

  // ==================== CONFIGURACIÓN SVG ====================
  const svgW = 720;
  const svgH = 580;
  const mL = 110;
  const mR = 140;
  const mT = 70;
  const mB = 110;

  const maxDim = Math.max(datos.h + datos.df + 0.8, calc.B + 1.5);
  const scale = Math.min(
    (svgW - mL - mR) / (calc.B + 1.5),
    (svgH - mT - mB) / (datos.h + datos.df + 0.8)
  );

  const ox = mL + 40;
  const oy = svgH - mB - 40;
  const toeX = ox;
  const heelX = ox + calc.B * scale;
  const topY = oy - datos.h * scale;
  const dfY = oy + datos.df * scale;

  // Paths
  const muroPath = `M ${toeX},${oy} L ${heelX},${oy} L ${heelX - datos.b2 * scale},${topY} L ${toeX + datos.b1 * scale},${topY} Z`;
  const rellenoPath = `M ${heelX - datos.b2 * scale},${topY} L ${heelX},${topY} L ${heelX},${oy} L ${svgW - mR},${oy} L ${svgW - mR},${topY} Z`;
  const frentePath = `M ${mL},${oy} L ${toeX},${oy} L ${toeX},${dfY} L ${mL},${dfY} Z`;

  // Escalas visuales para diagramas de presión
  const pahMax = datos.gamma1 * datos.h * calc.ka;
  const pahScale = Math.min(80, (svgW - heelX - 40) / (pahMax * 0.005 + 1));
  const ppMax = datos.gamma2 * datos.df * calc.kp;
  const ppScale = Math.min(60, (toeX - mL - 10) / (ppMax * 0.005 + 1));

  const qMaxVal = Math.max(0, calc.esfuerzoMax);
  const qMinVal = Math.max(0, calc.esfuerzoMin);
  const maxQ = Math.max(qMaxVal, qMinVal, 1);
  const qScale = 55 / maxQ;

  // Helpers de formato
  const fmt = (n) => (typeof n === 'number' ? n.toFixed(2) : n);
  const fmt3 = (n) => (typeof n === 'number' ? n.toFixed(3) : n);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🧱 Calculadora de Muro de Gravedad</h2>

      <div style={styles.layout}>
        {/* ============ PANEL IZQUIERDO: ENTRADAS ============ */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#3498db')}>Dimensiones</h3>
          {[
            { label: 'Altura H (m)', name: 'h', step: 0.1 },
            { label: 'Corona A (m)', name: 'a', step: 0.1 },
            { label: 'Inclinación Talón b₁ (m)', name: 'b1', step: 0.1 },
            { label: 'Inclinación Punta b₂ (m)', name: 'b2', step: 0.1 },
            { label: 'Desplante Df (m)', name: 'df', step: 0.1 },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input
                type="number"
                step={f.step}
                name={f.name}
                value={datos[f.name]}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          ))}
          <div style={styles.highlightBox}>
            <strong>Base Calculada B:</strong> {calc.B.toFixed(2)} m
          </div>

          <h3 style={styles.sectionTitle('#e67e22')}>Propiedades</h3>
          {[
            { label: 'γ Relleno (kg/m³)', name: 'gamma1' },
            { label: 'γ Fundación (kg/m³)', name: 'gamma2' },
            { label: 'γ Muro (kg/m³)', name: 'gammaMuro' },
            { label: 'φ Relleno (°)', name: 'phi1' },
            { label: 'φ Fundación (°)', name: 'phi2' },
            { label: 'Capacidad Vs (kg/m²)', name: 'vs' },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input
                type="number"
                name={f.name}
                value={datos[f.name]}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          ))}
        </div>

        {/* ============ PANEL CENTRAL: SVG ============ */}
        <div style={styles.svgPanel}>
          <h3 style={styles.svgTitle}>Diagrama de Fuerzas y Geometría</h3>
          <svg width={svgW} height={svgH} style={styles.svg}>
            <defs>
              <marker id="arR" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#e74c3c" />
              </marker>
              <marker id="arB" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3498db" />
              </marker>
              <marker id="arG" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#27ae60" />
              </marker>
              <pattern id="hatchRelleno" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#d4a373" strokeWidth="1.2" />
              </pattern>
              <pattern id="hatchFrente" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(-45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#a0aec0" strokeWidth="1.2" />
              </pattern>
            </defs>

            {/* Grid */}
            {Array.from({ length: Math.ceil(svgW / 50) }, (_, i) => (
              <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={svgH} stroke="#f0f0f0" strokeWidth="1" />
            ))}
            {Array.from({ length: Math.ceil(svgH / 50) }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 50} x2={svgW} y2={i * 50} stroke="#f0f0f0" strokeWidth="1" />
            ))}

            {/* Relleno detrás */}
            <path d={rellenoPath} fill="url(#hatchRelleno)" stroke="#8B4513" strokeWidth="1.5" opacity="0.5" />
            <text x={heelX + 15} y={topY + 25} fill="#8B4513" fontSize="13" fontWeight="bold">Relleno</text>

            {/* Suelo frente (hasta Df) */}
            <path d={frentePath} fill="url(#hatchFrente)" stroke="#666" strokeWidth="1" opacity="0.4" />

            {/* Línea de fundación */}
            <line x1={mL} y1={oy} x2={svgW - mR} y2={oy} stroke="#2c3e50" strokeWidth="2.5" />
            <text x={mL} y={oy + 18} fill="#2c3e50" fontSize="12" fontWeight="bold">Nivel de Fundación</text>

            {/* Línea terreno natural */}
            <line x1={mL} y1={topY} x2={svgW - mR} y2={topY} stroke="#8B4513" strokeWidth="2" strokeDasharray="6,3" />
            <text x={svgW - mR - 80} y={topY - 10} fill="#8B4513" fontSize="12">Terreno Natural</text>

            {/* Zona de desplante Df */}
            <rect x={toeX} y={oy} width={calc.B * scale} height={datos.df * scale} fill="#e8e8e8" stroke="#999" strokeWidth="1" strokeDasharray="5,3" opacity="0.4" />
            <text x={toeX + 8} y={dfY - 10} fill="#666" fontSize="11">Df = {datos.df}m</text>

            {/* Muro */}
            <path d={muroPath} fill="#95a5a6" stroke="#2c3e50" strokeWidth="2.5" />
            <text x={toeX + (calc.B * scale) / 2 - 25} y={oy - (datos.h * scale) / 2} fill="#2c3e50" fontSize="13" fontWeight="bold" opacity="0.6">MURO</text>

            {/* === Empuje Activo (diagrama triangular) === */}
            <g>
              {/* Sombreado de presión */}
              <path
                d={`M ${heelX - datos.b2 * scale},${topY} L ${heelX - datos.b2 * scale},${topY} L ${heelX + pahMax * pahScale * 0.001},${oy} L ${heelX},${oy} Z`}
                fill="rgba(231, 76, 60, 0.15)"
                stroke="#e74c3c"
                strokeWidth="1"
              />
              {/* Flecha Pah */}
              <line
                x1={heelX + pahMax * pahScale * 0.001 + 15}
                y1={oy - calc.brazoPah * scale}
                x2={heelX}
                y2={oy - calc.brazoPah * scale}
                stroke="#e74c3c"
                strokeWidth="2.5"
                markerEnd="url(#arR)"
              />
              <text x={heelX + pahMax * pahScale * 0.001 + 22} y={oy - calc.brazoPah * scale + 5} fill="#e74c3c" fontSize="14" fontWeight="bold">Pah</text>
              <text x={heelX + 8} y={oy - calc.brazoPah * scale + 22} fill="#e74c3c" fontSize="10">h/3</text>
            </g>

            {/* === Empuje Pasivo (diagrama triangular en punta) === */}
            <g>
              <path
                d={`M ${toeX},${oy} L ${toeX - ppMax * ppScale * 0.001},${oy} L ${toeX},${dfY} L ${toeX},${dfY} Z`}
                fill="rgba(39, 174, 96, 0.15)"
                stroke="#27ae60"
                strokeWidth="1"
              />
              <line
                x1={toeX - ppMax * ppScale * 0.001 - 20}
                y1={oy + (datos.df * scale) / 2}
                x2={toeX}
                y2={oy + (datos.df * scale) / 2}
                stroke="#27ae60"
                strokeWidth="2.5"
                markerEnd="url(#arG)"
              />
              <text x={toeX - ppMax * ppScale * 0.001 - 55} y={oy + (datos.df * scale) / 2 + 5} fill="#27ae60" fontSize="13" fontWeight="bold">Pp</text>
            </g>

            {/* === Resultante en la base === */}
            {calc.xBar > 0 && (
              <g>
                <circle cx={toeX + calc.xBar * scale} cy={oy} r="6" fill="#3498db" stroke="#fff" strokeWidth="2" />
                <line
                  x1={toeX + calc.xBar * scale}
                  y1={oy + 55}
                  x2={toeX + calc.xBar * scale}
                  y2={oy}
                  stroke="#3498db"
                  strokeWidth="2.5"
                  markerEnd="url(#arB)"
                />
                <text x={toeX + calc.xBar * scale - 35} y={oy + 72} fill="#3498db" fontSize="12" fontWeight="bold">
                  R (x̄={calc.xBar.toFixed(2)}m)
                </text>
              </g>
            )}

            {/* === Núcleo Central === */}
            <g>
              <line
                x1={ox + (calc.B / 2 - calc.nucleo) * scale}
                y1={oy + 8}
                x2={ox + (calc.B / 2 + calc.nucleo) * scale}
                y2={oy + 8}
                stroke="#f39c12"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <text x={ox + (calc.B / 2) * scale - 35} y={oy + 24} fill="#f39c12" fontSize="11" fontWeight="bold">
                Núcleo Central (B/6)
              </text>
              {calc.hayTension && (
                <text x={ox + (calc.B / 2) * scale - 40} y={oy + 38} fill="#e74c3c" fontSize="11" fontWeight="bold">
                  ⚠️ Tensión en base
                </text>
              )}
            </g>

            {/* ==================== COTAS ==================== */}
            {/* Altura H */}
            <g>
              <line x1={toeX - 45} y1={oy} x2={toeX - 45} y2={topY} stroke="#333" strokeWidth="1" />
              <line x1={toeX - 50} y1={oy} x2={toeX - 40} y2={oy} stroke="#333" strokeWidth="1" />
              <line x1={toeX - 50} y1={topY} x2={toeX - 40} y2={topY} stroke="#333" strokeWidth="1" />
              <text x={toeX - 85} y={oy - (datos.h * scale) / 2 + 4} fill="#333" fontSize="12">H={datos.h}m</text>
            </g>

            {/* Base B */}
            <g>
              <line x1={toeX} y1={oy + 30} x2={heelX} y2={oy + 30} stroke="#333" strokeWidth="1" />
              <line x1={toeX} y1={oy + 25} x2={toeX} y2={oy + 35} stroke="#333" strokeWidth="1" />
              <line x1={heelX} y1={oy + 25} x2={heelX} y2={oy + 35} stroke="#333" strokeWidth="1" />
              <text x={toeX + (calc.B * scale) / 2 - 25} y={oy + 45} fill="#333" fontSize="12">B={calc.B.toFixed(2)}m</text>
            </g>

            {/* Corona a */}
            <g>
              <line x1={toeX + datos.b1 * scale} y1={topY - 20} x2={heelX - datos.b2 * scale} y2={topY - 20} stroke="#333" strokeWidth="1" />
              <line x1={toeX + datos.b1 * scale} y1={topY - 25} x2={toeX + datos.b1 * scale} y2={topY - 15} stroke="#333" strokeWidth="1" />
              <line x1={heelX - datos.b2 * scale} y1={topY - 25} x2={heelX - datos.b2 * scale} y2={topY - 15} stroke="#333" strokeWidth="1" />
              <text x={toeX + datos.b1 * scale + (datos.a * scale) / 2 - 15} y={topY - 28} fill="#333" fontSize="11">a={datos.a}m</text>
            </g>

            {/* b1 inclinación */}
            <g>
              <line x1={toeX} y1={oy} x2={toeX + datos.b1 * scale} y2={topY} stroke="#7f8c8d" strokeWidth="1" strokeDasharray="4,2" />
              <text x={toeX + (datos.b1 * scale) / 2 - 8} y={oy - (datos.h * scale) / 4 + 5} fill="#7f8c8d" fontSize="10">b₁</text>
            </g>

            {/* b2 inclinación */}
            <g>
              <line x1={heelX} y1={oy} x2={heelX - datos.b2 * scale} y2={topY} stroke="#7f8c8d" strokeWidth="1" strokeDasharray="4,2" />
              <text x={heelX - (datos.b2 * scale) / 2 - 8} y={oy - (datos.h * scale) / 4 + 5} fill="#7f8c8d" fontSize="10">b₂</text>
            </g>

            {/* Df */}
            <g>
              <line x1={heelX + 45} y1={oy} x2={heelX + 45} y2={dfY} stroke="#333" strokeWidth="1" />
              <line x1={heelX + 40} y1={oy} x2={heelX + 50} y2={oy} stroke="#333" strokeWidth="1" />
              <line x1={heelX + 40} y1={dfY} x2={heelX + 50} y2={dfY} stroke="#333" strokeWidth="1" />
              <text x={heelX + 55} y={oy + (datos.df * scale) / 2 + 4} fill="#333" fontSize="11">Df={datos.df}m</text>
            </g>

            {/* ==================== DIAGRAMA PRESIONES BASE ==================== */}
            <g>
              <text x={toeX} y={oy + 65} fill="#555" fontSize="11" fontWeight="bold">Presiones en la base:</text>
              <line x1={toeX} y1={oy + 75} x2={heelX} y2={oy + 75} stroke="#555" strokeWidth="1" />
              {/* qMin */}
              <line x1={toeX} y1={oy + 75} x2={toeX} y2={oy + 75 - qMinVal * qScale} stroke="#e74c3c" strokeWidth="2" />
              {/* qMax */}
              <line x1={heelX} y1={oy + 75} x2={heelX} y2={oy + 75 - qMaxVal * qScale} stroke="#e74c3c" strokeWidth="2" />
              {/* Línea inclinada */}
              <line x1={toeX} y1={oy + 75 - qMinVal * qScale} x2={heelX} y2={oy + 75 - qMaxVal * qScale} stroke="#e74c3c" strokeWidth="2" />
              {/* Relleno */}
              <polygon
                points={`${toeX},${oy + 75} ${toeX},${oy + 75 - qMinVal * qScale} ${heelX},${oy + 75 - qMaxVal * qScale} ${heelX},${oy + 75}`}
                fill="rgba(231, 76, 60, 0.15)"
              />
              <text x={toeX - 5} y={oy + 75 - qMinVal * qScale - 4} fill="#e74c3c" fontSize="9" textAnchor="end">{fmt(calc.esfuerzoMin)}</text>
              <text x={heelX + 5} y={oy + 75 - qMaxVal * qScale - 4} fill="#e74c3c" fontSize="9">{fmt(calc.esfuerzoMax)}</text>
            </g>

            {/* ==================== LEYENDA ==================== */}
            <g transform={`translate(${mL}, ${mT - 45})`}>
              <rect x="0" y="0" width="14" height="14" fill="#95a5a6" stroke="#2c3e50" strokeWidth="1" />
              <text x="20" y="11" fill="#333" fontSize="11">Muro</text>
              <rect x="80" y="0" width="14" height="14" fill="url(#hatchRelleno)" stroke="#8B4513" strokeWidth="1" />
              <text x="98" y="11" fill="#333" fontSize="11">Relleno</text>
              <line x1="180" y1="7" x2="200" y2="7" stroke="#e74c3c" strokeWidth="2" />
              <text x="205" y="11" fill="#333" fontSize="11">Empuje Activo</text>
            </g>
          </svg>
        </div>

        {/* ============ PANEL DERECHO: RESULTADOS ============ */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#9b59b6')}>Resultados</h3>

          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Ka:</span>
            <strong>{fmt3(calc.ka)}</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Kp:</span>
            <strong>{fmt3(calc.kp)}</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Pah:</span>
            <strong>{fmt(calc.pah)} kg/m</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Mv:</span>
            <strong>{fmt(calc.mv)} kg-m/m</strong>
          </div>

          <div style={styles.divider} />

          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Wt:</span>
            <strong>{fmt(calc.wt)} kg/m</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>MR:</span>
            <strong>{fmt(calc.mr)} kg-m/m</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Fr:</span>
            <strong>{fmt(calc.fr)} kg/m</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Pp:</span>
            <strong>{fmt(calc.pp)} kg/m</strong>
          </div>

          <div style={styles.divider} />

          {/* FS Volteo */}
          <div style={styles.statusBox(calc.fsVolteo >= 1.5)}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>F.S. Volteo: {fmt(calc.fsVolteo)}</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: calc.fsVolteo >= 1.5 ? '#155724' : '#721c24' }}>
              {calc.fsVolteo >= 1.5 ? '✅ CUMPLE (≥ 1.5)' : '❌ FALLA (< 1.5)'}
            </div>
          </div>

          {/* FS Deslizamiento */}
          <div style={styles.statusBox(calc.fsDeslizamiento >= 1.5)}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>F.S. Deslizamiento: {fmt(calc.fsDeslizamiento)}</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: calc.fsDeslizamiento >= 1.5 ? '#155724' : '#721c24' }}>
              {calc.fsDeslizamiento >= 1.5 ? '✅ CUMPLE (≥ 1.5)' : '❌ FALLA (< 1.5)'}
            </div>
          </div>

          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Resultante:</span>
            <strong>{calc.xBar.toFixed(2)} m de la punta</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Exc.: {calc.excentricidad.toFixed(3)} m | Núcleo: ±{calc.nucleo.toFixed(3)} m
          </div>
          {calc.hayTension && (
            <div style={{ color: '#e74c3c', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
              ⚠️ Resultante fuera del núcleo — hay tensión
            </div>
          )}

          <div style={styles.divider} />

          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>qmax:</span>
            <strong>{fmt(calc.esfuerzoMax)} kg/m²</strong>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>qmin:</span>
            <strong>{fmt(calc.esfuerzoMin)} kg/m²</strong>
          </div>

          <div style={styles.statusBox(calc.esfuerzoMax <= datos.vs)}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Cap. Soporte: {datos.vs} kg/m²</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: calc.esfuerzoMax <= datos.vs ? '#155724' : '#721c24' }}>
              {calc.esfuerzoMax <= datos.vs ? '✅ CUMPLE' : '❌ FALLA'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ESTILOS ====================
const styles = {
  container: {
    padding: '20px',
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    maxWidth: '1250px',
    margin: '0 auto',
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '24px',
    fontSize: '26px',
    fontWeight: '600',
  },
  layout: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  panel: {
    flex: '0 0 290px',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '14px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  sectionTitle: (color) => ({
    marginTop: 0,
    color: '#34495e',
    borderBottom: `3px solid ${color}`,
    paddingBottom: '8px',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '14px',
  }),
  field: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#555',
    marginBottom: '5px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '9px 11px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  highlightBox: {
    padding: '12px',
    backgroundColor: '#e8f4f8',
    borderRadius: '8px',
    marginBottom: '18px',
    fontWeight: 'bold',
    color: '#2980b9',
    fontSize: '14px',
  },
  svgPanel: {
    flex: '1 1 550px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e0e0e0',
  },
  svgTitle: {
    marginTop: 0,
    color: '#34495e',
    fontSize: '17px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  svg: {
    background: '#fafbfc',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
  },
  resultRow: {
    marginBottom: '8px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    color: '#666',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #eee',
    margin: '12px 0',
  },
  statusBox: (ok) => ({
    marginBottom: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: ok ? '#d4edda' : '#f8d7da',
    border: `1px solid ${ok ? '#c3e6cb' : '#f5c6cb'}`,
  }),
};

export default MuroGravedad;