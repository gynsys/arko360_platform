import React, { useState, useMemo, useRef } from 'react';

const CalculadoraLosas = () => {
  // ==================== ESTADO ====================
  const [grid, setGrid] = useState({
    filas: 2,      // Número de apoyos en Y (filas de columnas)
    cols: 3,       // Número de apoyos en X (columnas de columnas)
    luzX: 4.5,     // Luz entre apoyos en X (m)
    luzY: 4.0,     // Luz entre apoyos en Y (m)
  });

  const [datos, setDatos] = useState({
    cv: 250,         // Carga Viva (kg/m²)
    cmExtra: 150,    // Acabados, tabiquería (kg/m²)
    fc: 210,         // f'c (kg/cm²)
    fy: 4200,        // fy (kg/cm²)
    recubrimiento: 2.5,
  });

  const [costos, setCostos] = useState({
    concretoM3: 130,
    aceroKg: 1.5,
    bloqueEPS: 3.5,
    steelDeckM2: 22,
    mallaM2: 3.0,
  });

  const [losaActiva, setLosaActiva] = useState('maciza');
  const printRef = useRef();

  // ==================== HANDLERS ====================
  const handleGrid = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setGrid({ ...grid, [name]: isNaN(val) || val <= 0 ? 1 : val });
  };

  const handleDatos = (e) => {
    const val = parseFloat(e.target.value);
    setDatos({ ...datos, [e.target.name]: isNaN(val) ? 0 : val });
  };

  const handleCostos = (e) => {
    const val = parseFloat(e.target.value);
    setCostos({ ...costos, [e.target.name]: isNaN(val) ? 0 : val });
  };

  // ==================== CÁLCULOS ACI 318-19 ====================
  const calc = useMemo(() => {
    const { filas, cols, luzX, luzY } = grid;
    const nTramosX = Math.max(cols - 1, 1);
    const nTramosY = Math.max(filas - 1, 1);
    const areaTotal = luzX * nTramosX * luzY * nTramosY;

    // Relación de aspecto
    const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
    const esDosDirecciones = ratio <= 2;

    // --- TIPO DE LOSA ---
    let h, pesoPropio, wu, wServicio;

    if (losaActiva === 'maciza') {
      h = Math.max(Math.ceil((Math.max(luzX, luzY) * 100) / 20), 10) / 100;
      pesoPropio = h * 2400;
    } else if (losaActiva === 'aligerada') {
      h = Math.max(Math.ceil((Math.max(luzX, luzY) * 100) / 16), 15) / 100;
      const espesorRoseta = 0.05;
      const anchoNervio = 0.10;
      const sepEjes = 0.50;
      const volM2 = espesorRoseta + (anchoNervio * (h - espesorRoseta) * (1 / sepEjes));
      pesoPropio = volM2 * 2400;
    } else {
      h = 0.12;
      pesoPropio = 210;
    }

    const wD = pesoPropio + datos.cmExtra;
    wu = 1.2 * wD + 1.6 * datos.cv;
    wServicio = wD + datos.cv;

    // --- MOMENTOS VIGA CONTINUA (ACI 318-19, 6.5.2) ---
    // Tramos en X
    const tramosX = [];
    for (let i = 0; i < nTramosX; i++) {
      const isExtremo = (i === 0 || i === nTramosX - 1);
      const isInterior = !isExtremo;
      const isFirstInterior = (i === 0 && nTramosX > 1) || (i === nTramosX - 1 && nTramosX > 1);

      let mPos, mNegIzq, mNegDer;
      if (isExtremo) {
        mPos = (wu * luzX * luzX) / 14;      // Extremo integrado con soporte
        mNegIzq = (wu * luzX * luzX) / 16;   // Exterior con columna
        mNegDer = (wu * luzX * luzX) / 11;   // Interior
      } else {
        mPos = (wu * luzX * luzX) / 16;      // Interior
        mNegIzq = (wu * luzX * luzX) / 11;   // Interior
        mNegDer = (wu * luzX * luzX) / 11;   // Interior
      }

      // Ajuste para tramo único
      if (nTramosX === 1) {
        mPos = (wu * luzX * luzX) / 8;
        mNegIzq = 0;
        mNegDer = 0;
      }

      tramosX.push({ id: i, luz: luzX, mPos, mNegIzq, mNegDer, isExtremo, isInterior });
    }

    // Tramos en Y
    const tramosY = [];
    for (let i = 0; i < nTramosY; i++) {
      const isExtremo = (i === 0 || i === nTramosY - 1);
      let mPos, mNegIzq, mNegDer;
      if (isExtremo) {
        mPos = (wu * luzY * luzY) / 14;
        mNegIzq = (wu * luzY * luzY) / 16;
        mNegDer = (wu * luzY * luzY) / 11;
      } else {
        mPos = (wu * luzY * luzY) / 16;
        mNegIzq = (wu * luzY * luzY) / 11;
        mNegDer = (wu * luzY * luzY) / 11;
      }
      if (nTramosY === 1) {
        mPos = (wu * luzY * luzY) / 8;
        mNegIzq = 0;
        mNegDer = 0;
      }
      tramosY.push({ id: i, luz: luzY, mPos, mNegIzq, mNegDer, isExtremo, isInterior: !isExtremo });
    }

    // Momento máximo gobernante
    const maxMomentoX = Math.max(...tramosX.map(t => Math.max(t.mPos, t.mNegIzq, t.mNegDer)));
    const maxMomentoY = Math.max(...tramosY.map(t => Math.max(t.mPos, t.mNegIzq, t.mNegDer)));
    const maxMomento = Math.max(maxMomentoX, maxMomentoY);

    // --- DISEÑO A FLEXION ---
    const d = (h * 100) - datos.recubrimiento;
    const b = 100; // ancho unitario cm
    const mu_kg_cm = maxMomento * 100;
    const Ru = mu_kg_cm / (0.90 * b * Math.pow(d, 2));
    let rho = (0.85 * datos.fc / datos.fy) * (1 - Math.sqrt(1 - (2 * Ru / (0.85 * datos.fc))));
    if (isNaN(rho) || rho < 0) rho = 0;

    const As_min = 0.0018 * b * (h * 100);
    const As_req = Math.max(rho * b * d, As_min);

    // Tensión controlada
    const β1 = datos.fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (datos.fc - 280) / 70);
    const a = rho * datos.fy * d / (0.85 * datos.fc);
    const c = a / β1;
    const εty = datos.fy / 2_000_000;
    const εt = c > 0 ? ((d - c) / c) * 0.003 : 0;
    const tensionControlada = εt >= εty + 0.003;

    // Cortante
    const Vc = 0.53 * Math.sqrt(datos.fc) * b * d;
    const φVc = 0.75 * Vc;
    const vuMax = (wu * Math.max(luzX, luzY)) / 2;
    const cumpleCortante = vuMax <= φVc;

    // Espesor mínimo
    const h_min = (Math.max(luzX, luzY) * 100) / 20;
    const cumpleEspesor = (h * 100) >= h_min;

    // Deflexión
    let deflexion = null;
    if (!cumpleEspesor) {
      const Ec = 15100 * Math.sqrt(datos.fc);
      const Ig = (b * Math.pow(h * 100, 3)) / 12;
      const wServCm = wServicio / 100;
      const Lcm = Math.max(luzX, luzY) * 100;
      const δ = (5 * wServCm * Math.pow(Lcm, 4)) / (384 * Ec * Ig);
      const δLim = Lcm / 360;
      deflexion = { δ: δ.toFixed(3), δLim: δLim.toFixed(2), cumple: δ <= δLim };
    }

    // Separación máxima
    const s_max = Math.min(3 * (h * 100), 45.7);

    // --- COSTOS ---
    let volConcreto, kgAcero, numBloques, costoTotal;
    if (losaActiva === 'maciza') {
      volConcreto = areaTotal * h;
      kgAcero = (As_req / 10000) * areaTotal * 7850 * 1.5;
      costoTotal = (volConcreto * costos.concretoM3) + (kgAcero * costos.aceroKg);
    } else if (losaActiva === 'aligerada') {
      const espesorRoseta = 0.05;
      const anchoNervio = 0.10;
      const sepEjes = 0.50;
      const volM2 = espesorRoseta + (anchoNervio * (h - espesorRoseta) * (1 / sepEjes));
      volConcreto = areaTotal * volM2;
      const numNerviosX = Math.ceil((luzY * nTramosY) / sepEjes) * nTramosX;
      const numNerviosY = Math.ceil((luzX * nTramosX) / sepEjes) * nTramosY;
      const kgAceroX = (As_req / 10000) * luzX * numNerviosX * 7850 * 1.3;
      const kgAceroY = esDosDirecciones ? (As_req / 10000) * luzY * numNerviosY * 7850 * 1.3 : 0;
      kgAcero = kgAceroX + kgAceroY;
      numBloques = Math.ceil(areaTotal * 4);
      costoTotal = (volConcreto * costos.concretoM3) + (kgAcero * costos.aceroKg) + (numBloques * costos.bloqueEPS);
    } else {
      volConcreto = areaTotal * 0.085;
      costoTotal = (volConcreto * costos.concretoM3) + (areaTotal * costos.steelDeckM2) + (areaTotal * costos.mallaM2);
      kgAcero = 0;
      numBloques = 0;
    }

    return {
      areaTotal,
      nTramosX,
      nTramosY,
      ratio,
      esDosDirecciones,
      h: (h * 100).toFixed(1),
      h_min: h_min.toFixed(1),
      pesoPropio: pesoPropio.toFixed(0),
      wu: wu.toFixed(2),
      wServicio: wServicio.toFixed(2),
      tramosX,
      tramosY,
      maxMomentoX: maxMomentoX.toFixed(2),
      maxMomentoY: maxMomentoY.toFixed(2),
      maxMomento: maxMomento.toFixed(2),
      d: d.toFixed(1),
      Ru: Ru.toFixed(4),
      rho: rho.toFixed(6),
      As_req: As_req.toFixed(2),
      As_min: As_min.toFixed(2),
      εt: εt.toFixed(5),
      εty: εty.toFixed(5),
      tensionControlada,
      Vc: Vc.toFixed(0),
      φVc: φVc.toFixed(0),
      vuMax: vuMax.toFixed(2),
      cumpleCortante,
      cumpleEspesor,
      deflexion,
      s_max: s_max.toFixed(1),
      volConcreto: volConcreto.toFixed(2),
      kgAcero: kgAcero.toFixed(0),
      numBloques,
      costoTotal: costoTotal.toFixed(2),
      costoM2: (costoTotal / areaTotal).toFixed(2),
    };
  }, [grid, datos, costos, losaActiva]);

  // ==================== SVG RETÍCULA ====================
  const renderGrid = () => {
    const { filas, cols, luzX, luzY } = grid;
    const nTramosX = Math.max(cols - 1, 1);
    const nTramosY = Math.max(filas - 1, 1);

    const svgW = 640;
    const svgH = 480;
    const mL = 80;
    const mR = 40;
    const mT = 50;
    const mB = 60;

    const totalW = nTramosX * luzX;
    const totalH = nTramosY * luzY;
    const scale = Math.min((svgW - mL - mR) / totalW, (svgH - mT - mB) / totalH);

    const ox = mL + (svgW - mL - mR - totalW * scale) / 2;
    const oy = mT + (svgH - mT - mB - totalH * scale) / 2;

    const apoyos = [];
    for (let r = 0; r < filas; r++) {
      for (let c = 0; c < cols; c++) {
        apoyos.push({
          x: ox + c * luzX * scale,
          y: oy + r * luzY * scale,
          id: `${r}-${c}`,
        });
      }
    }

    // Diagrama de momentos sobre tramos X
    const momentPathsX = [];
    for (let r = 0; r < filas; r++) {
      for (let i = 0; i < nTramosX; i++) {
        const tramo = calc.tramosX[i];
        const x1 = ox + i * luzX * scale;
        const x2 = ox + (i + 1) * luzX * scale;
        const y = oy + r * luzY * scale;
        const midX = (x1 + x2) / 2;

        const maxM = Math.max(tramo.mPos, tramo.mNegIzq, tramo.mNegDer);
        const scaleM = maxM > 0 ? 25 / maxM : 0;

        const yPos = y + tramo.mPos * scaleM;
        const yNegIzq = y - tramo.mNegIzq * scaleM;
        const yNegDer = y - tramo.mNegDer * scaleM;

        momentPathsX.push(
          <g key={`mx-${r}-${i}`}>
            {/* Momento positivo (azul, hacia abajo) */}
            <path
              d={`M ${x1},${y} Q ${midX},${yPos} ${x2},${y}`}
              fill="none"
              stroke="#0d6efd"
              strokeWidth="2"
              opacity="0.7"
            />
            {/* Momento negativo izq (rojo, hacia arriba) */}
            <path
              d={`M ${x1},${y} Q ${x1 + (x2-x1)*0.25},${yNegIzq} ${midX},${y}`}
              fill="none"
              stroke="#e74c3c"
              strokeWidth="2"
              opacity="0.7"
            />
            {/* Momento negativo der (rojo, hacia arriba) */}
            <path
              d={`M ${midX},${y} Q ${x2 - (x2-x1)*0.25},${yNegDer} ${x2},${y}`}
              fill="none"
              stroke="#e74c3c"
              strokeWidth="2"
              opacity="0.7"
            />
          </g>
        );
      }
    }

    // Diagrama de momentos sobre tramos Y
    const momentPathsY = [];
    for (let c = 0; c < cols; c++) {
      for (let i = 0; i < nTramosY; i++) {
        const tramo = calc.tramosY[i];
        const y1 = oy + i * luzY * scale;
        const y2 = oy + (i + 1) * luzY * scale;
        const x = ox + c * luzX * scale;
        const midY = (y1 + y2) / 2;

        const maxM = Math.max(tramo.mPos, tramo.mNegIzq, tramo.mNegDer);
        const scaleM = maxM > 0 ? 25 / maxM : 0;

        const xPos = x + tramo.mPos * scaleM;
        const xNegIzq = x - tramo.mNegIzq * scaleM;
        const xNegDer = x - tramo.mNegDer * scaleM;

        momentPathsY.push(
          <g key={`my-${c}-${i}`}>
            <path d={`M ${x},${y1} Q ${xPos},${midY} ${x},${y2}`} fill="none" stroke="#0d6efd" strokeWidth="2" opacity="0.7" />
            <path d={`M ${x},${y1} Q ${xNegIzq},${y1 + (y2-y1)*0.25} ${x},${midY}`} fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
            <path d={`M ${x},${midY} Q ${xNegDer},${y2 - (y2-y1)*0.25} ${x},${y2}`} fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
          </g>
        );
      }
    }

    return (
      <div style={styles.svgPanel}>
        <h3 style={styles.svgTitle}>Retícula de Apoyos y Diagramas de Momento</h3>
        <svg width={svgW} height={svgH} style={styles.svg}>
          {/* Grid de fondo */}
          {Array.from({ length: Math.ceil(svgW / 40) }, (_, i) => (
            <line key={`gv${i}`} x1={i * 40} y1={0} x2={i * 40} y2={svgH} stroke="#f0f0f0" strokeWidth="1" />
          ))}
          {Array.from({ length: Math.ceil(svgH / 40) }, (_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * 40} x2={svgW} y2={i * 40} stroke="#f0f0f0" strokeWidth="1" />
          ))}

          {/* Vigas X */}
          {Array.from({ length: filas }, (_, r) =>
            Array.from({ length: nTramosX }, (_, i) => (
              <line
                key={`vx-${r}-${i}`}
                x1={ox + i * luzX * scale}
                y1={oy + r * luzY * scale}
                x2={ox + (i + 1) * luzX * scale}
                y2={oy + r * luzY * scale}
                stroke="#7f8c8d"
                strokeWidth="2"
              />
            ))
          )}

          {/* Vigas Y */}
          {Array.from({ length: cols }, (_, c) =>
            Array.from({ length: nTramosY }, (_, i) => (
              <line
                key={`vy-${c}-${i}`}
                x1={ox + c * luzX * scale}
                y1={oy + i * luzY * scale}
                x2={ox + c * luzX * scale}
                y2={oy + (i + 1) * luzY * scale}
                stroke="#7f8c8d"
                strokeWidth="2"
              />
            ))
          )}

          {/* Diagramas de momento */}
          {momentPathsX}
          {momentPathsY}

          {/* Apoyos / Columnas */}
          {apoyos.map((a) => (
            <g key={a.id}>
              <circle cx={a.x} cy={a.y} r="8" fill="#2c3e50" stroke="#fff" strokeWidth="2" />
              <circle cx={a.x} cy={a.y} r="4" fill="#e74c3c" />
            </g>
          ))}

          {/* Cotas X */}
          {Array.from({ length: nTramosX }, (_, i) => (
            <g key={`cx-${i}`}>
              <line
                x1={ox + i * luzX * scale}
                y1={oy + nTramosY * luzY * scale + 20}
                x2={ox + (i + 1) * luzX * scale}
                y2={oy + nTramosY * luzY * scale + 20}
                stroke="#333"
                strokeWidth="1"
              />
              <line
                x1={ox + i * luzX * scale}
                y1={oy + nTramosY * luzY * scale + 15}
                x2={ox + i * luzX * scale}
                y2={oy + nTramosY * luzY * scale + 25}
                stroke="#333"
                strokeWidth="1"
              />
              <line
                x1={ox + (i + 1) * luzX * scale}
                y1={oy + nTramosY * luzY * scale + 15}
                x2={ox + (i + 1) * luzX * scale}
                y2={oy + nTramosY * luzY * scale + 25}
                stroke="#333"
                strokeWidth="1"
              />
              <text
                x={ox + (i + 0.5) * luzX * scale - 15}
                y={oy + nTramosY * luzY * scale + 38}
                fill="#333"
                fontSize="11"
              >
                {luzX}m
              </text>
            </g>
          ))}

          {/* Cotas Y */}
          {Array.from({ length: nTramosY }, (_, i) => (
            <g key={`cy-${i}`}>
              <line
                x1={ox - 25}
                y1={oy + i * luzY * scale}
                x2={ox - 25}
                y2={oy + (i + 1) * luzY * scale}
                stroke="#333"
                strokeWidth="1"
              />
              <line
                x1={ox - 30}
                y1={oy + i * luzY * scale}
                x2={ox - 20}
                y2={oy + i * luzY * scale}
                stroke="#333"
                strokeWidth="1"
              />
              <line
                x1={ox - 30}
                y1={oy + (i + 1) * luzY * scale}
                x2={ox - 20}
                y2={oy + (i + 1) * luzY * scale}
                stroke="#333"
                strokeWidth="1"
              />
              <text
                x={ox - 55}
                y={oy + (i + 0.5) * luzY * scale + 4}
                fill="#333"
                fontSize="11"
              >
                {luzY}m
              </text>
            </g>
          ))}

          {/* Leyenda */}
          <g transform={`translate(${svgW - 160}, ${mT})`}>
            <rect x="0" y="0" width="140" height="75" fill="white" stroke="#ddd" strokeWidth="1" rx="6" opacity="0.9" />
            <circle cx="15" cy="18" r="6" fill="#2c3e50" />
            <text x="28" y="22" fill="#333" fontSize="11">Columna / Apoyo</text>
            <line x1="10" y1="38" x2="30" y2="38" stroke="#0d6efd" strokeWidth="2" />
            <text x="38" y="42" fill="#333" fontSize="11">M(+) Tramo</text>
            <line x1="10" y1="55" x2="30" y2="55" stroke="#e74c3c" strokeWidth="2" />
            <text x="38" y="59" fill="#333" fontSize="11">M(-) Apoyo</text>
          </g>

          {/* Título de relación */}
          <text x={svgW / 2} y={25} fill="#2c3e50" fontSize="14" fontWeight="bold" textAnchor="middle">
            {calc.esDosDirecciones
              ? `LOSA EN DOS DIRECCIONES (ratio ${calc.ratio.toFixed(2)} ≤ 2)`
              : `LOSA EN UNA DIRECCIÓN (ratio ${calc.ratio.toFixed(2)} > 2)`}
          </text>
        </svg>
      </div>
    );
  };

  // ==================== SVG SECCIÓN TRANSVERSAL ====================
  const renderSeccion = () => {
    const h = parseFloat(calc.h);
    const svgW = 520;
    const svgH = 280;
    const ox = 60;
    const oy = 220;
    const scale = 4; // 1 cm = 4 px

    return (
      <div style={styles.svgPanel}>
        <h3 style={styles.svgTitle}>Sección Transversal Típica</h3>
        <svg width={svgW} height={svgH} style={styles.svg}>
          <defs>
            <pattern id="hatchBloque" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f1c40f" strokeWidth="1" />
            </pattern>
            <pattern id="hatchConcreto" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#95a5a6" strokeWidth="0.8" />
            </pattern>
            <marker id="ar" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#333" />
            </marker>
          </defs>

          {losaActiva === 'maciza' && (
            <g>
              <rect x={ox} y={oy - h * scale} width={300} height={h * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
              <pattern id="hatchMaciza" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#7f8c8d" strokeWidth="1" />
              </pattern>
              <rect x={ox} y={oy - h * scale} width={300} height={h * scale} fill="url(#hatchMaciza)" opacity="0.3" />

              {/* Acero inferior */}
              <line x1={ox + 20} y1={oy - 2.5 * scale} x2={ox + 280} y2={oy - 2.5 * scale} stroke="#c0392b" strokeWidth="3" strokeDasharray="6,4" />
              <text x={ox + 290} y={oy - 2.5 * scale + 4} fill="#c0392b" fontSize="11">As (+)</text>

              {/* Acero superior */}
              <line x1={ox + 20} y1={oy - (h - 2.5) * scale} x2={ox + 280} y2={oy - (h - 2.5) * scale} stroke="#c0392b" strokeWidth="2" strokeDasharray="4,4" />
              <text x={ox + 290} y={oy - (h - 2.5) * scale + 4} fill="#c0392b" fontSize="11">As (-)</text>

              {/* Cota h */}
              <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <line x1={ox - 25} y1={oy} x2={ox - 15} y2={oy} stroke="#333" strokeWidth="1" />
              <line x1={ox - 25} y1={oy - h * scale} x2={ox - 15} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 50} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>

              {/* Cota d */}
              <line x1={ox + 320} y1={oy} x2={ox + 320} y2={oy - (h - 2.5) * scale} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
              <text x={ox + 325} y={oy - ((h - 2.5) * scale) / 2 + 4} fill="#666" fontSize="11">d = {calc.d} cm</text>
            </g>
          )}

          {losaActiva === 'aligerada' && (
            <g>
              {/* Roseta */}
              <rect x={ox} y={oy - 5 * scale} width={300} height={5 * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
              <rect x={ox} y={oy - 5 * scale} width={300} height={5 * scale} fill="url(#hatchConcreto)" opacity="0.4" />

              {/* Nervios */}
              {[0, 80, 160, 240].map((offset, i) => (
                <g key={i}>
                  <rect x={ox + offset} y={oy - h * scale} width={10 * scale} height={(h - 5) * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="1.5" />
                  <rect x={ox + offset} y={oy - h * scale} width={10 * scale} height={(h - 5) * scale} fill="url(#hatchConcreto)" opacity="0.4" />
                  {/* Acero en nervio */}
                  <circle cx={ox + offset + 5 * scale} cy={oy - 3 * scale} r="3" fill="#c0392b" />
                </g>
              ))}

              {/* Bloques EPS */}
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <rect x={ox + 10 * scale + i * 80} y={oy - h * scale} width={70} height={(h - 5) * scale} fill="url(#hatchBloque)" stroke="#f1c40f" strokeWidth="1" strokeDasharray="2,2" />
                  <text x={ox + 10 * scale + i * 80 + 25} y={oy - (h * scale) / 2} fill="#b7950b" fontSize="9">EPS</text>
                </g>
              ))}

              {/* Cota h */}
              <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 50} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>

              {/* Cota roseta */}
              <line x1={ox + 320} y1={oy} x2={ox + 320} y2={oy - 5 * scale} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
              <text x={ox + 325} y={oy - 2.5 * scale + 4} fill="#666" fontSize="11">5 cm</text>
            </g>
          )}

          {losaActiva === 'colaborante' && (
            <g>
              {/* Concreto sobre deck */}
              <path d={`M ${ox} ${oy - 5 * scale} L ${ox + 300} ${oy - 5 * scale} L ${ox + 300} ${oy - h * scale} L ${ox} ${oy - h * scale} Z`} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
              <path d={`M ${ox} ${oy - 5 * scale} L ${ox + 300} ${oy - 5 * scale} L ${ox + 300} ${oy - h * scale} L ${ox} ${oy - h * scale} Z`} fill="url(#hatchConcreto)" opacity="0.4" />

              {/* Steel Deck (perfil acanalado) */}
              <path
                d={`M ${ox} ${oy} L ${ox + 20} ${oy} L ${ox + 30} ${oy - 5 * scale} L ${ox + 50} ${oy - 5 * scale} L ${ox + 60} ${oy} L ${ox + 80} ${oy} L ${ox + 90} ${oy - 5 * scale} L ${ox + 110} ${oy - 5 * scale} L ${ox + 120} ${oy} L ${ox + 140} ${oy} L ${ox + 150} ${oy - 5 * scale} L ${ox + 170} ${oy - 5 * scale} L ${ox + 180} ${oy} L ${ox + 200} ${oy} L ${ox + 210} ${oy - 5 * scale} L ${ox + 230} ${oy - 5 * scale} L ${ox + 240} ${oy} L ${ox + 260} ${oy} L ${ox + 270} ${oy - 5 * scale} L ${ox + 290} ${oy - 5 * scale} L ${ox + 300} ${oy}`}
                fill="none"
                stroke="#2980b9"
                strokeWidth="3"
              />

              {/* Malla de temperatura */}
              <line x1={ox + 10} y1={oy - 7 * scale} x2={ox + 290} y2={oy - 7 * scale} stroke="#c0392b" strokeWidth="1" strokeDasharray="3,3" />
              <text x={ox + 295} y={oy - 7 * scale + 4} fill="#c0392b" fontSize="10">Malla temp.</text>

              {/* Cota h */}
              <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 50} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>
            </g>
          )}

          {/* Suelo */}
          <line x1={ox - 20} y1={oy} x2={ox + 320} y2={oy} stroke="#555" strokeWidth="3" />
          <text x={ox + 330} y={oy + 4} fill="#555" fontSize="11">Viga / Apoyo</text>
        </svg>
      </div>
    );
  };

  // ==================== PDF / IMPRESIÓN ====================
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Memoria de Cálculo - Losa ${losaActiva.toUpperCase()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f6f8; font-weight: bold; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .logo { font-size: 24px; font-weight: bold; color: #3498db; }
          .status-ok { color: #27ae60; font-weight: bold; }
          .status-fail { color: #e74c3c; font-weight: bold; }
          .total { font-size: 20px; font-weight: bold; color: #2c3e50; background: #ecf0f1; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏗️ Calculadora Estructural</div>
          <div>Fecha: ${new Date().toLocaleDateString()}</div>
        </div>
        <h1>Memoria de Cálculo - Losa ${losaActiva.toUpperCase()}</h1>

        <h2>1. Geometría y Retícula</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Filas de apoyos (Y)</td><td>${grid.filas}</td></tr>
          <tr><td>Columnas de apoyos (X)</td><td>${grid.cols}</td></tr>
          <tr><td>Luz en X</td><td>${grid.luzX} m</td></tr>
          <tr><td>Luz en Y</td><td>${grid.luzY} m</td></tr>
          <tr><td>Tramos en X</td><td>${calc.nTramosX}</td></tr>
          <tr><td>Tramos en Y</td><td>${calc.nTramosY}</td></tr>
          <tr><td>Área total</td><td>${calc.areaTotal.toFixed(2)} m²</td></tr>
          <tr><td>Relación luz mayor/menor</td><td>${calc.ratio.toFixed(2)} ${calc.esDosDirecciones ? '(≤ 2, losa en dos direcciones)' : '(> 2, losa en una dirección)'}</td></tr>
        </table>

        <h2>2. Cargas</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Carga viva (CV)</td><td>${datos.cv} kg/m²</td></tr>
          <tr><td>Sobrecarga muerta (CM extra)</td><td>${datos.cmExtra} kg/m²</td></tr>
          <tr><td>Peso propio de la losa</td><td>${calc.pesoPropio} kg/m²</td></tr>
          <tr><td>W servicio</td><td>${calc.wServicio} kg/m²</td></tr>
          <tr><td>Wu (carga mayorada)</td><td>${calc.wu} kg/m²</td></tr>
        </table>

        <h2>3. Momentos por Tramo (ACI 318-19, Cl. 6.5.2)</h2>
        <table>
          <tr><th>Dirección</th><th>Tramo</th><th>M(+) kg-m</th><th>M(-) Izq kg-m</th><th>M(-) Der kg-m</th></tr>
          ${calc.tramosX.map((t, i) => `<tr><td>X</td><td>${i + 1}</td><td>${t.mPos.toFixed(2)}</td><td>${t.mNegIzq.toFixed(2)}</td><td>${t.mNegDer.toFixed(2)}</td></tr>`).join('')}
          ${calc.tramosY.map((t, i) => `<tr><td>Y</td><td>${i + 1}</td><td>${t.mPos.toFixed(2)}</td><td>${t.mNegIzq.toFixed(2)}</td><td>${t.mNegDer.toFixed(2)}</td></tr>`).join('')}
        </table>

        <h2>4. Diseño a Flexión (ACI 318-19)</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Espesor h</td><td>${calc.h} cm</td></tr>
          <tr><td>Espesor mínimo ACI 7.3.1</td><td>${calc.h_min} cm</td></tr>
          <tr><td>Peralte efectivo d</td><td>${calc.d} cm</td></tr>
          <tr><td>Momento máximo</td><td>${calc.maxMomento} kg-m</td></tr>
          <tr><td>Ru</td><td>${calc.Ru} kg/cm²</td></tr>
          <tr><td>ρ (cuantía)</td><td>${calc.rho}</td></tr>
          <tr><td>As mínimo</td><td>${calc.As_min} cm²/m</td></tr>
          <tr><td>As requerido</td><td><strong>${calc.As_req} cm²/m</strong></td></tr>
          <tr><td>Separación máxima</td><td>${calc.s_max} cm</td></tr>
        </table>

        <h2>5. Verificaciones ACI 318-19</h2>
        <table>
          <tr><th>Verificación</th><th>Valor</th><th>Estado</th></tr>
          <tr><td>Espesor mínimo</td><td>h = ${calc.h} cm ≥ ${calc.h_min} cm</td><td class="${calc.cumpleEspesor ? 'status-ok' : 'status-fail'}">${calc.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          <tr><td>Tensión controlada (εt ≥ εty + 0.003)</td><td>εt = ${calc.εt} ≥ ${calc.εty}</td><td class="${calc.tensionControlada ? 'status-ok' : 'status-fail'}">${calc.tensionControlada ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          <tr><td>Cortante (Vu ≤ φVc)</td><td>Vu = ${calc.vuMax} kg ≤ φVc = ${calc.φVc} kg</td><td class="${calc.cumpleCortante ? 'status-ok' : 'status-fail'}">${calc.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          ${calc.deflexion ? `<tr><td>Deflexión (δ ≤ δ_lim)</td><td>δ = ${calc.deflexion.δ} cm ≤ ${calc.deflexion.δLim} cm</td><td class="${calc.deflexion.cumple ? 'status-ok' : 'status-fail'}">${calc.deflexion.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>` : ''}
        </table>

        <h2>6. Lista de Materiales y Costos</h2>
        <table>
          <tr><th>Material</th><th>Cantidad</th><th>Unidad</th><th>Precio Unit.</th><th>Subtotal</th></tr>
          <tr><td>Concreto</td><td>${calc.volConcreto}</td><td>m³</td><td>$${costos.concretoM3}</td><td>$${(calc.volConcreto * costos.concretoM3).toFixed(2)}</td></tr>
          ${losaActiva !== 'colaborante' ? `<tr><td>Acero de refuerzo</td><td>${calc.kgAcero}</td><td>kg</td><td>$${costos.aceroKg}</td><td>$${(calc.kgAcero * costos.aceroKg).toFixed(2)}</td></tr>` : ''}
          ${losaActiva === 'aligerada' ? `<tr><td>Casetones EPS</td><td>${calc.numBloques}</td><td>und</td><td>$${costos.bloqueEPS}</td><td>$${(calc.numBloques * costos.bloqueEPS).toFixed(2)}</td></tr>` : ''}
          ${losaActiva === 'colaborante' ? `<tr><td>Lámina Steel Deck</td><td>${calc.areaTotal.toFixed(2)}</td><td>m²</td><td>$${costos.steelDeckM2}</td><td>$${(calc.areaTotal * costos.steelDeckM2).toFixed(2)}</td></tr>` : ''}
          ${losaActiva === 'colaborante' ? `<tr><td>Malla electrosoldada</td><td>${calc.areaTotal.toFixed(2)}</td><td>m²</td><td>$${costos.mallaM2}</td><td>$${(calc.areaTotal * costos.mallaM2).toFixed(2)}</td></tr>` : ''}
        </table>

        <div class="total">
          💰 COSTO TOTAL: $${calc.costoTotal} &nbsp;|&nbsp; $${calc.costoM2} / m²
        </div>

        <p style="margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px;">
          Calculado según ACI 318-19. Este documento es para fines de pre-dimensionamiento. Verificar con análisis estructural detallado antes de construcción.
        </p>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ==================== RENDER ====================
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏗️ Calculadora Comparativa de Losas (ACI 318-19)</h2>

      <div style={styles.layout}>
        {/* PANEL RETÍCULA */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#3498db')}>1. Retícula de Apoyos</h3>
          <p style={styles.hint}>La intersección de cada vertical y horizontal es una columna de apoyo.</p>

          {[
            { label: 'Filas de apoyos (Y)', name: 'filas' },
            { label: 'Columnas de apoyos (X)', name: 'cols' },
            { label: 'Luz en X (m)', name: 'luzX', step: 0.1 },
            { label: 'Luz en Y (m)', name: 'luzY', step: 0.1 },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step={f.step || 1} name={f.name} value={grid[f.name]} onChange={handleGrid} style={styles.input} />
            </div>
          ))}

          <div style={styles.highlightBox}>
            <div><strong>Tramos X:</strong> {calc.nTramosX} &nbsp;|&nbsp; <strong>Tramos Y:</strong> {calc.nTramosY}</div>
            <div><strong>Área total:</strong> {calc.areaTotal.toFixed(2)} m²</div>
            <div><strong>Ratio luz mayor/menor:</strong> {calc.ratio.toFixed(2)}</div>
            {calc.esDosDirecciones && (
              <div style={{ color: '#e67e22', fontWeight: 'bold', marginTop: '6px' }}>⚠️ LOSA EN DOS DIRECCIONES (ratio ≤ 2)</div>
            )}
          </div>
        </div>

        {/* PANEL TIPO DE LOSA */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#e67e22')}>2. Tipo de Losa</h3>

          <div style={styles.typeSelector}>
            {[
              { id: 'maciza', label: 'Maciza', color: '#2980b9', desc: 'L/20' },
              { id: 'aligerada', label: 'Aligerada', color: '#d35400', desc: 'L/16' },
              { id: 'colaborante', label: 'Steel Deck', color: '#27ae60', desc: 'SDI' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setLosaActiva(t.id)}
                style={{
                  ...styles.typeBtn,
                  borderColor: t.color,
                  background: losaActiva === t.id ? t.color : '#fff',
                  color: losaActiva === t.id ? '#fff' : t.color,
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{t.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>{t.desc}</div>
              </button>
            ))}
          </div>

          <h3 style={styles.sectionTitle('#27ae60')}>3. Cargas y Materiales</h3>
          {[
            { label: 'Carga Viva CV (kg/m²)', name: 'cv' },
            { label: 'CM Extra (kg/m²)', name: 'cmExtra' },
            { label: "f'c (kg/cm²)", name: 'fc' },
            { label: 'fy (kg/cm²)', name: 'fy' },
            { label: 'Recubrimiento (cm)', name: 'recubrimiento', step: 0.1 },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step={f.step || 1} name={f.name} value={datos[f.name]} onChange={handleDatos} style={styles.input} />
            </div>
          ))}
        </div>

        {/* PANEL COSTOS */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#9b59b6')}>4. Costos Unitarios (USD)</h3>
          {[
            { label: 'Concreto ($/m³)', name: 'concretoM3' },
            { label: 'Acero ($/kg)', name: 'aceroKg' },
            { label: 'Bloque EPS ($/und)', name: 'bloqueEPS' },
            { label: 'Steel Deck ($/m²)', name: 'steelDeckM2' },
            { label: 'Malla ($/m²)', name: 'mallaM2' },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step="0.1" name={f.name} value={costos[f.name]} onChange={handleCostos} style={styles.input} />
            </div>
          ))}

          <div style={styles.divider} />

          <div style={styles.costBox}>
            <div style={{ fontSize: '13px', color: '#666' }}>Costo Total</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50' }}>${calc.costoTotal}</div>
            <div style={{ fontSize: '14px', color: '#888' }}>${calc.costoM2} / m²</div>
          </div>

          <button onClick={handlePrintPDF} style={styles.pdfBtn}>
            📄 Descargar PDF con Memoria de Cálculo
          </button>
        </div>
      </div>

      {/* SVG RETÍCULA */}
      {renderGrid()}

      {/* SVG SECCIÓN TRANSVERSAL */}
      {renderSeccion()}

      {/* PANEL RESULTADOS ACI */}
      <div style={styles.resultPanel}>
        <h3 style={styles.sectionTitle('#e74c3c')}>Verificaciones ACI 318-19</h3>
        <div style={styles.resultGrid}>
          <div style={styles.statusBox(calc.cumpleEspesor)}>
            <div style={{ fontWeight: 'bold' }}>Espesor Mínimo (ACI 7.3.1)</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              h = {calc.h} cm ≥ h_min = {calc.h_min} cm
              <br />{calc.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>

          <div style={styles.statusBox(calc.tensionControlada)}>
            <div style={{ fontWeight: 'bold' }}>Tensión Controlada (ACI 7.3.3)</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              εt = {calc.εt} ≥ εty + 0.003 = {calc.εty}
              <br />{calc.tensionControlada ? '✅ CUMPLE (φ = 0.90)' : '❌ NO CUMPLE'}
            </div>
          </div>

          <div style={styles.statusBox(calc.cumpleCortante)}>
            <div style={{ fontWeight: 'bold' }}>Cortante (ACI 22.5.5)</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Vu = {calc.vuMax} kg ≤ φVc = {calc.φVc} kg
              <br />{calc.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>

          {calc.deflexion && (
            <div style={styles.statusBox(calc.deflexion.cumple)}>
              <div style={{ fontWeight: 'bold' }}>Deflexión (ACI 24.2)</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                δ = {calc.deflexion.δ} cm ≤ δ_lim = {calc.deflexion.δLim} cm
                <br />{calc.deflexion.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'}
              </div>
            </div>
          )}
        </div>

        <div style={styles.divider} />

        <div style={styles.resultGrid}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0d6efd' }}>Diseño a Flexión</h4>
            <p style={styles.resultLine}><span>As req:</span> <strong>{calc.As_req} cm²/m</strong></p>
            <p style={styles.resultLine}><span>As min:</span> <strong>{calc.As_min} cm²/m</strong></p>
            <p style={styles.resultLine}><span>ρ:</span> <strong>{calc.rho}</strong></p>
            <p style={styles.resultLine}><span>Sep. máx:</span> <strong>{calc.s_max} cm</strong></p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0d6efd' }}>Momentos por Tramo</h4>
            <p style={styles.resultLine}><span>M(+) max X:</span> <strong>{calc.maxMomentoX} kg-m</strong></p>
            <p style={styles.resultLine}><span>M(+) max Y:</span> <strong>{calc.maxMomentoY} kg-m</strong></p>
            <p style={styles.resultLine}><span>M gobernante:</span> <strong>{calc.maxMomento} kg-m</strong></p>
            <p style={styles.resultLine}><span>Wu:</span> <strong>{calc.wu} kg/m²</strong></p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0d6efd' }}>Materiales</h4>
            <p style={styles.resultLine}><span>Concreto:</span> <strong>{calc.volConcreto} m³</strong></p>
            {losaActiva !== 'colaborante' && <p style={styles.resultLine}><span>Acero:</span> <strong>{calc.kgAcero} kg</strong></p>}
            {losaActiva === 'aligerada' && <p style={styles.resultLine}><span>Bloques EPS:</span> <strong>{calc.numBloques} und</strong></p>}
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
    maxWidth: '1300px',
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
    marginBottom: '20px',
  },
  panel: {
    flex: '0 0 300px',
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
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  highlightBox: {
    padding: '12px',
    backgroundColor: '#e8f4f8',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#2980b9',
    lineHeight: '1.6',
  },
  typeSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '18px',
  },
  typeBtn: {
    flex: 1,
    padding: '12px 8px',
    border: '2px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  costBox: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    textAlign: 'center',
    marginBottom: '14px',
  },
  pdfBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  svgPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e0e0e0',
    marginBottom: '20px',
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
  resultPanel: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e0e0e0',
  },
  resultGrid: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  statusBox: (ok) => ({
    flex: '1 1 220px',
    marginBottom: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: ok ? '#d4edda' : '#f8d7da',
    border: `1px solid ${ok ? '#c3e6cb' : '#f5c6cb'}`,
  }),
  divider: {
    border: 'none',
    borderTop: '1px solid #eee',
    margin: '16px 0',
  },
  resultLine: {
    margin: '5px 0',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
  },
};

export default CalculadoraLosas;
