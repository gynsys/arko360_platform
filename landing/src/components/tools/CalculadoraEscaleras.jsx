import React, { useState, useMemo } from 'react';

const CalculadoraEscaleras = () => {
  // 1. ESTADO: Dimensiones y Tipo
  const [datos, setDatos] = useState({
    tipoEstructura: 'acero2',
    tipoPerfil: 'upn',
    alturaTotal: 280,
    largoMaximo: 400,
    ancho: 100,
  });

  // 2. ESTADO: Cargas, Mayoración y Materiales
  const [parametros, setParametros] = useState({
    cmAcabados: 100,
    cvArea: 488,
    factorCM: 1.2,
    factorCV: 1.6,
    fc: 210,
    fy: 4200,
    fyAcero: 2500,
    pesoLaminas: 150,
    recubrimiento: 2.5,
  });

  // Catálogo de Perfiles
  const catalogos = {
    tubo: [
      { nombre: "Tubo Rect. 100x40x3", Ix: 120, Zx: 30 },
      { nombre: "Tubo Rect. 120x60x4", Ix: 300, Zx: 65 },
      { nombre: "Tubo Rect. 140x60x4", Ix: 420, Zx: 80 },
      { nombre: "Tubo Rect. 160x65x4", Ix: 580, Zx: 100 },
      { nombre: "Tubo Rect. 200x70x5", Ix: 1200, Zx: 160 },
      { nombre: "Tubo Rect. 250x100x5", Ix: 2500, Zx: 280 },
      { nombre: "Tubo Rect. 300x100x6", Ix: 4500, Zx: 350 }
    ],
    ipn: [
      { nombre: "IPN 100", Ix: 171, Zx: 40 },
      { nombre: "IPN 120", Ix: 328, Zx: 65 },
      { nombre: "IPN 140", Ix: 573, Zx: 98 },
      { nombre: "IPN 160", Ix: 935, Zx: 140 },
      { nombre: "IPN 200", Ix: 2140, Zx: 250 },
      { nombre: "IPN 240", Ix: 4250, Zx: 420 }
    ],
    upn: [
      { nombre: "UPN 100", Ix: 206, Zx: 48 },
      { nombre: "UPN 120", Ix: 364, Zx: 73 },
      { nombre: "UPN 140", Ix: 605, Zx: 103 },
      { nombre: "UPN 160", Ix: 925, Zx: 138 },
      { nombre: "UPN 200", Ix: 1910, Zx: 228 },
      { nombre: "UPN 240", Ix: 3600, Zx: 354 }
    ]
  };

  const handleDatosChange = (e) => {
    const { name, value } = e.target;
    if (['tipoEstructura', 'tipoPerfil'].includes(name)) {
      setDatos({ ...datos, [name]: value });
    } else {
      const val = parseFloat(value);
      setDatos({ ...datos, [name]: isNaN(val) || val <= 0 ? 0 : val });
    }
  };

  const handleParametrosChange = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setParametros({ ...parametros, [name]: isNaN(val) || val < 0 ? 0 : val });
  };

  const aplicarPresetUso = (uso) => {
    if (uso === 'habitacional') setParametros({ ...parametros, cvArea: 195 });
    if (uso === 'comercial') setParametros({ ...parametros, cvArea: 488 });
    if (uso === 'industrial') setParametros({ ...parametros, cvArea: 732 });
  };

  // 3. LÓGICA DE INGENIERÍA (ACI 318-19)
  const resultados = useMemo(() => {
    if (datos.alturaTotal === 0) return null;
    const isConcreto = datos.tipoEstructura === 'concreto';

    // --- Geometría ---
    const numEscalones = Math.ceil(datos.alturaTotal / 17.5);
    const contrahuella = datos.alturaTotal / numEscalones;
    let huella = 64 - (2 * contrahuella);
    let longitudTotal = huella * (numEscalones - 1);

    if (datos.largoMaximo > 0 && longitudTotal > datos.largoMaximo) {
      huella = datos.largoMaximo / (numEscalones - 1);
      longitudTotal = datos.largoMaximo;
    }

    const anchoM = datos.ancho / 100;
    const L = longitudTotal / 100;
    const L_cm = longitudTotal;
    const H = datos.alturaTotal / 100;
    const longitudZancaM = Math.sqrt(H * H + L * L);
    const cosTheta = L / longitudZancaM;

    // --- Cargas ---
    let cargaMuertaLineal = 0;
    const espesorLosa = 15;

    if (isConcreto) {
      const volLosa = longitudZancaM * anchoM * (espesorLosa / 100);
      const volEscalones = (((huella / 100) * (contrahuella / 100)) / 2) * anchoM * numEscalones;
      const pesoPropioKg = (volLosa + volEscalones) * 2400;
      cargaMuertaLineal = (pesoPropioKg / L) + (parametros.cmAcabados * anchoM);
    } else {
      cargaMuertaLineal = parametros.pesoLaminas * anchoM;
    }

    const cargaVivaLineal = parametros.cvArea * anchoM;
    const wu = (parametros.factorCM * cargaMuertaLineal) + (parametros.factorCV * cargaVivaLineal);
    const w_servicio = cargaMuertaLineal + cargaVivaLineal;

    // --- Solicitaciones ---
    const vMax = (wu * L) / 2;
    const mMax = (wu * Math.pow(L, 2)) / 8;

    let resultadoFinal = {
      numEscalones,
      contrahuella: contrahuella.toFixed(1),
      huella: huella.toFixed(1),
      L: L.toFixed(2),
      longitudZancaM: longitudZancaM.toFixed(2),
      wu: wu.toFixed(0),
      vMax: vMax.toFixed(0),
      mMax: mMax.toFixed(0),
      w_servicio: w_servicio.toFixed(0),
      isConcreto,
    };

    if (isConcreto) {
      // --- Diseño a flexión (ACI 318-19, Cap. 7) ---
      const d = espesorLosa - parametros.recubrimiento;
      const mu_kg_cm = mMax * 100;
      const b = 100;
      const Ru = mu_kg_cm / (0.90 * b * Math.pow(d, 2));
      let rho = (0.85 * parametros.fc / parametros.fy) * (1 - Math.sqrt(1 - (2 * Ru / (0.85 * parametros.fc))));
      if (isNaN(rho) || rho < 0) rho = 0;

      const As_min = 0.0018 * b * espesorLosa;
      const As_req = Math.max(rho * b * d, As_min);

      // Tensión controlada
      const β1 = parametros.fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (parametros.fc - 280) / 70);
      const a = rho * parametros.fy * d / (0.85 * parametros.fc);
      const c = a / β1;
      const εty = parametros.fy / 2_000_000;
      const εt = c > 0 ? ((d - c) / c) * 0.003 : 0;
      const tensionControlada = εt >= εty + 0.003;

      // Cortante
      const Vc = 0.53 * Math.sqrt(parametros.fc) * b * d;
      const φVc = 0.75 * Vc;
      const cumpleCortante = vMax <= φVc;

      // Espesor mínimo
      const h_min = L * 100 / 20;
      const cumpleEspesor = espesorLosa >= h_min;

      // Deflexión
      let deflexion = null;
      if (!cumpleEspesor) {
        const Ec = 15100 * Math.sqrt(parametros.fc);
        const Ig = (b * Math.pow(espesorLosa, 3)) / 12;
        const wServCm = w_servicio / 100;
        const δ = (5 * wServCm * Math.pow(L_cm, 4)) / (384 * Ec * Ig);
        const δ_lim = L_cm / 360;
        deflexion = { δ: δ.toFixed(3), δ_lim: δ_lim.toFixed(2), cumple: δ <= δ_lim };
      }

      const s_max = Math.min(3 * espesorLosa, 45.7);

      resultadoFinal.concreto = {
        espesorLosa,
        d: d.toFixed(1),
        As_req: As_req.toFixed(2),
        As_min: As_min.toFixed(2),
        rho: rho.toFixed(5),
        Ru: Ru.toFixed(2),
        εt: εt.toFixed(5),
        εty: εty.toFixed(5),
        tensionControlada,
        Vc: Vc.toFixed(0),
        φVc: φVc.toFixed(0),
        cumpleCortante,
        h_min: h_min.toFixed(1),
        cumpleEspesor,
        deflexion,
        s_max: s_max.toFixed(1),
      };
    } else {
      // --- Diseño de acero ---
      const factorZanca = datos.tipoEstructura === 'acero1' ? 1 : 2;
      const mu_zanca_kg_cm = ((wu / factorZanca) * Math.pow(L, 2) / 8) * 100;
      const w_zanca_inclinada = (w_servicio / factorZanca) / cosTheta;
      const w_serv_zanca_kg_cm = w_zanca_inclinada / 100;

      const Z_req = mu_zanca_kg_cm / (0.90 * parametros.fyAcero);
      const L_zanca_cm = longitudZancaM * 100;
      const I_req = (5 * w_serv_zanca_kg_cm * Math.pow(L_zanca_cm, 3) * 360) / (384 * 2_000_000);

      const catalogoActivo = catalogos[datos.tipoPerfil];
      let perfilRecomendado = "Ningún perfil cumple. Diseñar viga armada.";
      let perfilEncontrado = null;

      for (let i = 0; i < catalogoActivo.length; i++) {
        if (catalogoActivo[i].Ix >= I_req && catalogoActivo[i].Zx >= Z_req) {
          perfilRecomendado = catalogoActivo[i].nombre;
          perfilEncontrado = catalogoActivo[i];
          break;
        }
      }

      resultadoFinal.acero = {
        zancas: factorZanca,
        Z_req: Z_req.toFixed(2),
        I_req: I_req.toFixed(2),
        perfilRecomendado,
        perfilEncontrado,
      };
    }

    return resultadoFinal;
  }, [datos, parametros]);

  // 4. DIBUJO DE DIAGRAMAS (Corte y Momento)
  const renderizarDiagramas = () => {
    if (!resultados) return null;

    const svgW = 420;
    const svgH = 160;
    const marginX = 50;
    const midY = svgH / 2;
    const drawW = svgW - (marginX * 2);

    const vMaxPx = 35;
    const vY1 = midY - vMaxPx;
    const vY2 = midY + vMaxPx;
    const pathCorte = `M ${marginX} ${midY} L ${marginX} ${vY1} L ${marginX + drawW} ${vY2} L ${marginX + drawW} ${midY} Z`;

    const mMaxPx = 40;
    const baseY = svgH - 20;
    const mPoints = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = marginX + (drawW * i) / steps;
      const xi = i / steps;
      const y = baseY - 4 * mMaxPx * xi * (1 - xi);
      mPoints.push(`${x},${y}`);
    }
    const pathMomento = `M ${marginX},${baseY} L ${mPoints.join(' L ')} L ${marginX + drawW},${baseY} Z`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
        <div style={styles.diagramBox}>
          <h5 style={{ margin: '0 0 8px 0', color: '#198754', fontSize: '14px' }}>Diagrama de Corte (V)</h5>
          <svg width={svgW} height={svgH} style={{ background: '#f8f9fa', borderRadius: '6px' }}>
            <line x1={marginX} y1={midY} x2={svgW - marginX} y2={midY} stroke="#999" strokeWidth="1" strokeDasharray="4,4" />
            <path d={pathCorte} fill="rgba(25, 135, 84, 0.15)" stroke="#198754" strokeWidth="2" />
            <text x={marginX + 5} y={vY1 - 4} fontSize="11" fill="#198754" fontWeight="bold">+{resultados.vMax} kg</text>
            <text x={svgW - marginX - 75} y={vY2 + 14} fontSize="11" fill="#198754" fontWeight="bold">-{resultados.vMax} kg</text>
            <text x={marginX} y={svgH - 5} fontSize="10" fill="#666">0</text>
            <text x={svgW - marginX - 15} y={svgH - 5} fontSize="10" fill="#666">L</text>
          </svg>
        </div>

        <div style={styles.diagramBox}>
          <h5 style={{ margin: '0 0 8px 0', color: '#0d6efd', fontSize: '14px' }}>Diagrama de Momento (M)</h5>
          <svg width={svgW} height={svgH} style={{ background: '#f8f9fa', borderRadius: '6px' }}>
            <line x1={marginX} y1={baseY} x2={svgW - marginX} y2={baseY} stroke="#999" strokeWidth="1" strokeDasharray="4,4" />
            <path d={pathMomento} fill="rgba(13, 110, 253, 0.15)" stroke="#0d6efd" strokeWidth="2" />
            <text x={marginX + drawW / 2 - 40} y={baseY - mMaxPx - 8} fontSize="12" fill="#0d6efd" fontWeight="bold">{resultados.mMax} kg-m</text>
            <text x={marginX} y={svgH - 5} fontSize="10" fill="#666">0</text>
            <text x={svgW - marginX - 15} y={svgH - 5} fontSize="10" fill="#666">L</text>
          </svg>
        </div>
      </div>
    );
  };

  // 5. DIBUJO DE LA ESCALERA (SVG)
  const renderizarEscalera = () => {
    if (!resultados) return null;
    const { numEscalones, contrahuella, huella, L } = resultados;
    const n = parseInt(numEscalones);
    const c = parseFloat(contrahuella);
    const h = parseFloat(huella);
    const H = parseFloat(datos.alturaTotal);

    const svgW = 500;
    const svgH = 320;
    const mL = 60;
    const mB = 50;

    const scaleX = (svgW - mL - 40) / parseFloat(L);
    const scaleY = (svgH - mB - 40) / H;
    const scale = Math.min(scaleX, scaleY);

    const ox = mL;
    const oy = svgH - mB;

    const steps = [];
    for (let i = 0; i < n; i++) {
      const x = ox + i * h * scale;
      const yBottom = oy - i * c * scale;
      const yTop = oy - (i + 1) * c * scale;
      steps.push({ x, yBottom, yTop, w: h * scale, h: c * scale });
    }

    return (
      <div style={styles.svgPanel}>
        <h3 style={styles.svgTitle}>Vista Lateral de la Escalera</h3>
        <svg width={svgW} height={svgH} style={styles.svg}>
          {/* Suelo inferior */}
          <line x1={0} y1={oy} x2={svgW} y2={oy} stroke="#555" strokeWidth="3" />
          <text x={10} y={oy + 18} fill="#555" fontSize="12">Piso Inferior</text>

          {/* Suelo superior */}
          <line x1={ox} y1={oy - H * scale} x2={svgW} y2={oy - H * scale} stroke="#555" strokeWidth="3" />
          <text x={svgW - 100} y={oy - H * scale - 8} fill="#555" fontSize="12">Piso Superior</text>

          {/* Escalones */}
          {steps.map((s, i) => (
            <g key={i}>
              <rect x={s.x} y={s.yTop} width={s.w} height={s.h} fill="#b0bec5" stroke="#455a64" strokeWidth="1.5" />
              <line x1={s.x + s.w} y1={s.yTop} x2={s.x + s.w} y2={s.yBottom} stroke="#455a64" strokeWidth="1.5" />
              {i < 6 && (
                <text x={s.x + s.w / 2 - 8} y={s.yBottom - 4} fill="#455a64" fontSize="9">{i + 1}</text>
              )}
            </g>
          ))}

          {/* Línea de zanca */}
          <line x1={ox} y1={oy} x2={ox + (n - 1) * h * scale} y2={oy - (n - 1) * c * scale} stroke="#e74c3c" strokeWidth="2" strokeDasharray="6,3" />
          <text x={ox + (n - 1) * h * scale / 2} y={oy - (n - 1) * c * scale / 2 - 10} fill="#e74c3c" fontSize="11">Zanca</text>

          {/* Cotas */}
          <g>
            <line x1={ox - 30} y1={oy} x2={ox - 30} y2={oy - H * scale} stroke="#333" strokeWidth="1" />
            <line x1={ox - 35} y1={oy} x2={ox - 25} y2={oy} stroke="#333" strokeWidth="1" />
            <line x1={ox - 35} y1={oy - H * scale} x2={ox - 25} y2={oy - H * scale} stroke="#333" strokeWidth="1" />
            <text x={ox - 75} y={oy - (H * scale) / 2 + 4} fill="#333" fontSize="11">H={H}cm</text>
          </g>

          <g>
            <line x1={ox} y1={oy + 25} x2={ox + (n - 1) * h * scale} y2={oy + 25} stroke="#333" strokeWidth="1" />
            <line x1={ox} y1={oy + 20} x2={ox} y2={oy + 30} stroke="#333" strokeWidth="1" />
            <line x1={ox + (n - 1) * h * scale} y1={oy + 20} x2={ox + (n - 1) * h * scale} y2={oy + 30} stroke="#333" strokeWidth="1" />
            <text x={ox + ((n - 1) * h * scale) / 2 - 30} y={oy + 42} fill="#333" fontSize="11">L={L}m</text>
          </g>

          <g>
            <line x1={ox + (n - 1) * h * scale + 20} y1={oy} x2={ox + (n - 1) * h * scale + 20} y2={oy - c * scale} stroke="#333" strokeWidth="1" />
            <text x={ox + (n - 1) * h * scale + 25} y={oy - (c * scale) / 2 + 4} fill="#333" fontSize="10">C={c}cm</text>
          </g>

          <g>
            <line x1={ox} y1={oy + 55} x2={ox + h * scale} y2={oy + 55} stroke="#333" strokeWidth="1" />
            <text x={ox + (h * scale) / 2 - 15} y={oy + 68} fill="#333" fontSize="10">Hª={h}cm</text>
          </g>
        </svg>
      </div>
    );
  };

  // ==================== PDF CON MARCA DE AGUA ARKO 360 ====================
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tipoLabel = datos.tipoEstructura === 'concreto' ? 'Concreto Armado' :
      datos.tipoEstructura === 'acero1' ? 'Metálica (1 Zanca)' : 'Metálica (2 Zancas)';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Memoria de Cálculo - Escalera ${tipoLabel}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 40px;
            color: #333;
            position: relative;
            min-height: 100vh;
          }
          /* MARCA DE AGUA ARKO 360 */
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            opacity: 0.06;
            pointer-events: none;
            z-index: 0;
            font-size: 72px;
            font-weight: 900;
            color: #2c3e50;
            letter-spacing: 8px;
            white-space: nowrap;
          }
          .watermark svg {
            width: 500px;
            height: 200px;
          }
          .content { position: relative; z-index: 1; }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; margin-top: 30px; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f6f8; font-weight: bold; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3498db;
          }
          .logo-svg { width: 180px; height: 60px; }
          .status-ok { color: #27ae60; font-weight: bold; }
          .status-fail { color: #e74c3c; font-weight: bold; }
          .total {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            background: #ecf0f1;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .section { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
          .footer {
            margin-top: 40px;
            font-size: 11px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <!-- MARCA DE AGUA -->
        <div class="watermark">
          <svg viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="arkoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#27ae60"/>
                <stop offset="50%" style="stop-color:#2ecc71"/>
                <stop offset="100%" style="stop-color:#27ae60"/>
              </linearGradient>
            </defs>
            <!-- Cubo 3D -->
            <polygon points="20,30 60,10 100,30 60,50" fill="url(#arkoGrad)" opacity="0.8"/>
            <polygon points="20,30 60,50 60,90 20,70" fill="#1e8449" opacity="0.6"/>
            <polygon points="60,50 100,30 100,70 60,90" fill="#2ecc71" opacity="0.5"/>
            <!-- Texto ARKO 360 -->
            <text x="120" y="55" font-family="Arial Black, sans-serif" font-size="42" font-weight="900" fill="#2c3e50" letter-spacing="3">ARKO</text>
            <text x="280" y="55" font-family="Arial Black, sans-serif" font-size="42" font-weight="900" fill="#27ae60" letter-spacing="3">360</text>
            <text x="120" y="80" font-family="Arial, sans-serif" font-size="14" fill="#7f8c8d" letter-spacing="6">RECORRIDOS VIRTUALES</text>
          </svg>
        </div>

        <div class="content">
          <div class="header">
            <div>
              <svg class="logo-svg" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#27ae60"/>
                    <stop offset="100%" style="stop-color:#2ecc71"/>
                  </linearGradient>
                </defs>
                <polygon points="15,25 50,8 85,25 50,42" fill="url(#logoGrad)"/>
                <polygon points="15,25 50,42 50,78 15,61" fill="#1e8449"/>
                <polygon points="50,42 85,25 85,61 50,78" fill="#2ecc71" opacity="0.7"/>
                <text x="100" y="45" font-family="Arial Black, sans-serif" font-size="32" font-weight="900" fill="#2c3e50" letter-spacing="2">ARKO</text>
                <text x="230" y="45" font-family="Arial Black, sans-serif" font-size="32" font-weight="900" fill="#27ae60" letter-spacing="2">360</text>
                <text x="100" y="68" font-family="Arial, sans-serif" font-size="11" fill="#7f8c8d" letter-spacing="4">RECORRIDOS VIRTUALES</text>
              </svg>
            </div>
            <div style="text-align:right;">
              <div style="font-size:18px;font-weight:bold;color:#2c3e50;">Memoria de Cálculo</div>
              <div style="font-size:13px;color:#888;">Escalera ${tipoLabel}</div>
              <div style="font-size:12px;color:#888;margin-top:4px;">${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>

          <h1>1. Parámetros de Diseño</h1>
          <div class="section">
            <table>
              <tr><th>Parámetro</th><th>Valor</th></tr>
              <tr><td>Tipo de estructura</td><td>${tipoLabel}</td></tr>
              ${datos.tipoEstructura !== 'concreto' ? `<tr><td>Tipo de perfil</td><td>${datos.tipoPerfil.toUpperCase()}</td></tr>` : ''}
              <tr><td>Altura total (H)</td><td>${datos.alturaTotal} cm</td></tr>
              <tr><td>Largo máximo disponible</td><td>${datos.largoMaximo} cm</td></tr>
              <tr><td>Ancho de escalera</td><td>${datos.ancho} cm</td></tr>
              <tr><td>Número de escalones</td><td>${resultados.numEscalones}</td></tr>
              <tr><td>Contrahuella (C)</td><td>${resultados.contrahuella} cm</td></tr>
              <tr><td>Huella (Hª)</td><td>${resultados.huella} cm</td></tr>
              <tr><td>Longitud horizontal (L)</td><td>${resultados.L} m</td></tr>
              <tr><td>Longitud de zanca</td><td>${resultados.longitudZancaM} m</td></tr>
            </table>
          </div>

          <h1>2. Cargas (ACI 318-19 / IBC)</h1>
          <div class="section">
            <table>
              <tr><th>Parámetro</th><th>Valor</th></tr>
              <tr><td>Carga viva (CV)</td><td>${parametros.cvArea} kg/m²</td></tr>
              <tr><td>Carga muerta extra (CM)</td><td>${datos.tipoEstructura === 'concreto' ? parametros.cmAcabados : parametros.pesoLaminas} kg/m²</td></tr>
              <tr><td>Factor de carga CM</td><td>${parametros.factorCM}</td></tr>
              <tr><td>Factor de carga CV</td><td>${parametros.factorCV}</td></tr>
              <tr><td>W servicio</td><td>${resultados.w_servicio} kg/m</td></tr>
              <tr><td>Wu (carga mayorada)</td><td><strong>${resultados.wu} kg/m</strong></td></tr>
            </table>
          </div>

          <h1>3. Solicitaciones</h1>
          <div class="section">
            <table>
              <tr><th>Solicitación</th><th>Valor</th></tr>
              <tr><td>Corte máximo (Vmax)</td><td>${resultados.vMax} kg</td></tr>
              <tr><td>Momento máximo (Mmax)</td><td>${resultados.mMax} kg-m</td></tr>
            </table>
          </div>

          ${resultados.isConcreto ? `
          <h1>4. Diseño a Flexión - Losa de Concreto (ACI 318-19)</h1>
          <div class="section">
            <table>
              <tr><th>Parámetro</th><th>Valor</th></tr>
              <tr><td>Espesor de losa (h)</td><td>${resultados.concreto.espesorLosa} cm</td></tr>
              <tr><td>Espesor mínimo ACI 7.3.1 (h_min)</td><td>${resultados.concreto.h_min} cm</td></tr>
              <tr><td>Peralte efectivo (d)</td><td>${resultados.concreto.d} cm</td></tr>
              <tr><td>f'c</td><td>${parametros.fc} kg/cm²</td></tr>
              <tr><td>fy</td><td>${parametros.fy} kg/cm²</td></tr>
              <tr><td>Ru</td><td>${resultados.concreto.Ru} kg/cm²</td></tr>
              <tr><td>ρ (cuantía)</td><td>${resultados.concreto.rho}</td></tr>
              <tr><td>As mínimo</td><td>${resultados.concreto.As_min} cm²/m</td></tr>
              <tr><td><strong>As requerido</strong></td><td><strong>${resultados.concreto.As_req} cm²/m</strong></td></tr>
              <tr><td>Sep. máxima barras</td><td>${resultados.concreto.s_max} cm</td></tr>
            </table>
          </div>

          <h1>5. Verificaciones ACI 318-19</h1>
          <div class="section">
            <table>
              <tr><th>Verificación</th><th>Criterio</th><th>Resultado</th></tr>
              <tr>
                <td>Espesor mínimo</td>
                <td>h ≥ h_min</td>
                <td class="${resultados.concreto.cumpleEspesor ? 'status-ok' : 'status-fail'}">
                  ${resultados.concreto.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'} (${resultados.concreto.espesorLosa} ≥ ${resultados.concreto.h_min} cm)
                </td>
              </tr>
              <tr>
                <td>Tensión controlada (ACI 7.3.3)</td>
                <td>εt ≥ εty + 0.003</td>
                <td class="${resultados.concreto.tensionControlada ? 'status-ok' : 'status-fail'}">
                  ${resultados.concreto.tensionControlada ? '✅ CUMPLE' : '❌ NO CUMPLE'} (εt = ${resultados.concreto.εt})
                </td>
              </tr>
              <tr>
                <td>Cortante (ACI 22.5.5)</td>
                <td>Vu ≤ φVc</td>
                <td class="${resultados.concreto.cumpleCortante ? 'status-ok' : 'status-fail'}">
                  ${resultados.concreto.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'} (${resultados.vMax} ≤ ${resultados.concreto.φVc} kg)
                </td>
              </tr>
              ${resultados.concreto.deflexion ? `
              <tr>
                <td>Deflexión (ACI 24.2)</td>
                <td>δ ≤ δ_lim</td>
                <td class="${resultados.concreto.deflexion.cumple ? 'status-ok' : 'status-fail'}">
                  ${resultados.concreto.deflexion.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'} (δ = ${resultados.concreto.deflexion.δ} ≤ ${resultados.concreto.deflexion.δ_lim} cm)
                </td>
              </tr>` : ''}
            </table>
          </div>
          ` : `
          <h1>4. Diseño de Perfiles Metálicos</h1>
          <div class="section">
            <table>
              <tr><th>Parámetro</th><th>Valor</th></tr>
              <tr><td>Número de zancas</td><td>${resultados.acero.zancas}</td></tr>
              <tr><td>fy del acero</td><td>${parametros.fyAcero} kg/cm²</td></tr>
              <tr><td>Zx requerido</td><td>${resultados.acero.Z_req} cm³</td></tr>
              <tr><td>Ix requerido</td><td>${resultados.acero.I_req} cm⁴</td></tr>
              <tr><td><strong>Perfil recomendado</strong></td><td><strong>${resultados.acero.perfilRecomendado}</strong></td></tr>
              ${resultados.acero.perfilEncontrado ? `
              <tr><td>Ix del perfil</td><td>${resultados.acero.perfilEncontrado.Ix} cm⁴</td></tr>
              <tr><td>Zx del perfil</td><td>${resultados.acero.perfilEncontrado.Zx} cm³</td></tr>
              ` : ''}
            </table>
          </div>
          `}

          <h1>6. Lista de Materiales y Costos</h1>
          <div class="section">
            <table>
              <tr><th>Material</th><th>Cantidad</th><th>Unidad</th><th>Precio Unit.</th><th>Subtotal</th></tr>
              ${resultados.isConcreto ? `
              <tr><td>Concreto</td><td>${(parseFloat(resultados.L) * (datos.ancho/100) * (resultados.concreto.espesorLosa/100)).toFixed(2)}</td><td>m³</td><td>$${parametros.concretoM3 || 130}</td><td>$${((parseFloat(resultados.L) * (datos.ancho/100) * (resultados.concreto.espesorLosa/100)) * (parametros.concretoM3 || 130)).toFixed(2)}</td></tr>
              <tr><td>Acero de refuerzo</td><td>${resultados.concreto.As_req}</td><td>cm²/m</td><td>—</td><td>—</td></tr>
              ` : `
              <tr><td>Láminas de acero</td><td>${parametros.pesoLaminas}</td><td>kg/m²</td><td>—</td><td>—</td></tr>
              <tr><td>Perfiles ${datos.tipoPerfil.toUpperCase()}</td><td>${resultados.acero.perfilRecomendado}</td><td>und</td><td>—</td><td>—</td></tr>
              `}
            </table>
          </div>

          <div class="total">
            📊 RESUMEN: Escalera ${tipoLabel} | ${resultados.numEscalones} escalones | L = ${resultados.L}m | Wu = ${resultados.wu} kg/m
          </div>

          <div class="footer">
            <strong>ARKO 360</strong> — Recorridos Virtuales, Fotografía Arquitectónica y Fotogrametría con Dron<br>
            Documento generado automáticamente para fines de pre-dimensionamiento estructural.<br>
            Verificar con análisis detallado antes de construcción. | ${new Date().toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  // ==================== RENDER PRINCIPAL ====================
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🪜 Calculadora Estructural de Escaleras (ACI 318-19)</h2>

      <div style={styles.layout}>
        {/* PANEL GEOMETRÍA */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#3498db')}>1. Sistema Estructural</h3>

          <select name="tipoEstructura" value={datos.tipoEstructura} onChange={handleDatosChange} style={styles.select}>
            <option value="concreto">Concreto Armado</option>
            <option value="acero2">Metálica (2 Zancas)</option>
            <option value="acero1">Metálica (1 Zanca)</option>
          </select>

          {datos.tipoEstructura !== 'concreto' && (
            <div style={styles.subPanel}>
              <select name="tipoPerfil" value={datos.tipoPerfil} onChange={handleDatosChange} style={styles.select}>
                <option value="upn">Canales (UPN)</option>
                <option value="ipn">Vigas (IPN)</option>
                <option value="tubo">Tubo Rectangular</option>
              </select>
            </div>
          )}

          {[
            { label: 'Altura Total H (cm)', name: 'alturaTotal' },
            { label: 'Largo Máximo (cm)', name: 'largoMaximo' },
            { label: 'Ancho (cm)', name: 'ancho' },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" name={f.name} value={datos[f.name]} onChange={handleDatosChange} style={styles.input} />
            </div>
          ))}

          {resultados && (
            <div style={styles.highlightBox}>
              <div><strong>{resultados.numEscalones}</strong> escalones</div>
              <div>C = {resultados.contrahuella} cm | Hª = {resultados.huella} cm</div>
              <div>L = {resultados.L} m</div>
            </div>
          )}
        </div>

        {/* PANEL CARGAS */}
        <div style={styles.panelGreen}>
          <h3 style={styles.sectionTitle('#27ae60')}>2. Cargas (ACI/IBC)</h3>

          <div style={styles.presetRow}>
            <button onClick={() => aplicarPresetUso('habitacional')} style={styles.presetBtn}>Residencial</button>
            <button onClick={() => aplicarPresetUso('comercial')} style={styles.presetBtn}>Comercial</button>
            <button onClick={() => aplicarPresetUso('industrial')} style={styles.presetBtn}>Industrial</button>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Carga Viva CV (kg/m²)</label>
            <input type="number" name="cvArea" value={parametros.cvArea} onChange={handleParametrosChange} style={styles.input} />
            <div style={styles.hint}>IBC: 195 res / 488 com / 732 ind</div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{datos.tipoEstructura === 'concreto' ? 'CM Acabados (kg/m²)' : 'Peso Láminas (kg/m²)'}</label>
            <input
              type="number"
              name={datos.tipoEstructura === 'concreto' ? 'cmAcabados' : 'pesoLaminas'}
              value={datos.tipoEstructura === 'concreto' ? parametros.cmAcabados : parametros.pesoLaminas}
              onChange={handleParametrosChange}
              style={styles.input}
            />
          </div>

          {[
            { label: 'Factor CM', name: 'factorCM', step: 0.1 },
            { label: 'Factor CV', name: 'factorCV', step: 0.1 },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step={f.step} name={f.name} value={parametros[f.name]} onChange={handleParametrosChange} style={styles.input} />
            </div>
          ))}

          {datos.tipoEstructura === 'concreto' && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>f'c (kg/cm²)</label>
                <input type="number" name="fc" value={parametros.fc} onChange={handleParametrosChange} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>fy (kg/cm²)</label>
                <input type="number" name="fy" value={parametros.fy} onChange={handleParametrosChange} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Recubrimiento (cm)</label>
                <input type="number" step="0.1" name="recubrimiento" value={parametros.recubrimiento} onChange={handleParametrosChange} style={styles.input} />
              </div>
            </>
          )}

          {datos.tipoEstructura !== 'concreto' && (
            <div style={styles.field}>
              <label style={styles.label}>fy Acero (kg/cm²)</label>
              <input type="number" name="fyAcero" value={parametros.fyAcero} onChange={handleParametrosChange} style={styles.input} />
            </div>
          )}
        </div>

        {/* PANEL RESULTADOS + BOTÓN PDF */}
        {resultados && (
          <div style={styles.panelResult}>
            <h3 style={styles.sectionTitle('#9b59b6')}>3. Resultados de Diseño</h3>

            <div style={styles.resultRow}>
              <span>Wu:</span>
              <strong>{resultados.wu} kg/m</strong>
            </div>
            <div style={styles.resultRow}>
              <span>W servicio:</span>
              <strong>{resultados.w_servicio} kg/m</strong>
            </div>
            <div style={styles.resultRow}>
              <span>Vmax:</span>
              <strong>{resultados.vMax} kg</strong>
            </div>
            <div style={styles.resultRow}>
              <span>Mmax:</span>
              <strong>{resultados.mMax} kg-m</strong>
            </div>

            <div style={styles.divider} />

            {resultados.isConcreto ? (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#0d6efd' }}>Losa de {resultados.concreto.espesorLosa} cm</h4>

                <div style={styles.statusBox(resultados.concreto.cumpleEspesor)}>
                  <div style={{ fontWeight: 'bold' }}>Espesor Mínimo ACI 7.3.1</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    h = {resultados.concreto.espesorLosa} cm ≥ h_min = {resultados.concreto.h_min} cm
                    <br />
                    {resultados.concreto.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                  </div>
                </div>

                {!resultados.concreto.cumpleEspesor && resultados.concreto.deflexion && (
                  <div style={styles.statusBox(resultados.concreto.deflexion.cumple)}>
                    <div style={{ fontWeight: 'bold' }}>Deflexión ACI 7.3.2</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      δ = {resultados.concreto.deflexion.δ} cm ≤ δ_lim = {resultados.concreto.deflexion.δ_lim} cm
                      <br />
                      {resultados.concreto.deflexion.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                    </div>
                  </div>
                )}

                <div style={styles.statusBox(resultados.concreto.tensionControlada)}>
                  <div style={{ fontWeight: 'bold' }}>Tensión Controlada (ACI 7.3.3)</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    εt = {resultados.concreto.εt} ≥ εty + 0.003 = {resultados.concreto.εty}
                    <br />
                    {resultados.concreto.tensionControlada ? '✅ CUMPLE (φ = 0.90)' : '❌ NO CUMPLE'}
                  </div>
                </div>

                <div style={styles.statusBox(resultados.concreto.cumpleCortante)}>
                  <div style={{ fontWeight: 'bold' }}>Cortante (ACI 22.5.5)</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Vu = {resultados.vMax} kg ≤ φVc = {resultados.concreto.φVc} kg
                    <br />
                    {resultados.concreto.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                  </div>
                </div>

                <div style={styles.divider} />

                <p style={{ margin: '6px 0', fontSize: '15px' }}>
                  <strong>As Req:</strong>{' '}
                  <span style={{ color: '#0d6efd', fontSize: '18px', fontWeight: 'bold' }}>
                    {resultados.concreto.As_req} cm²/m
                  </span>
                </p>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                  As,min = {resultados.concreto.As_min} cm²/m | ρ = {resultados.concreto.rho}
                </p>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                  Sep. máx = {resultados.concreto.s_max} cm (ACI 7.7.2.3)
                </p>
              </div>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                  {resultados.acero.zancas} Zancas Metálicas
                </h4>

                <div style={styles.resultRow}>
                  <span>Zx req:</span>
                  <strong>{resultados.acero.Z_req} cm³</strong>
                </div>
                <div style={styles.resultRow}>
                  <span>Ix req:</span>
                  <strong>{resultados.acero.I_req} cm⁴</strong>
                </div>

                <div style={styles.statusBox(!!resultados.acero.perfilEncontrado)}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                    {resultados.acero.perfilRecomendado}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {resultados.acero.perfilEncontrado
                      ? `Ix = ${resultados.acero.perfilEncontrado.Ix} cm⁴ | Zx = ${resultados.acero.perfilEncontrado.Zx} cm³`
                      : 'Ningún perfil del catálogo cumple los requisitos'}
                  </div>
                </div>
              </div>
            )}

            {renderizarDiagramas()}

            {/* BOTÓN DESCARGAR PDF */}
            <button onClick={handlePrintPDF} style={styles.pdfBtn}>
              📄 Descargar PDF con Análisis y Costos
            </button>
          </div>
        )}
      </div>

      {/* VISTA LATERAL */}
      {resultados && renderizarEscalera()}
    </div>
  );
};

// ==================== ESTILOS ====================
const styles = {
  container: {
    padding: '20px',
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    maxWidth: '1200px',
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
  panelGreen: {
    flex: '0 0 300px',
    padding: '20px',
    border: '1px solid #c3e6cb',
    borderRadius: '14px',
    backgroundColor: '#f2fdf7',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  panelResult: {
    flex: '1 1 350px',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '14px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    minWidth: '350px',
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
  select: {
    width: '100%',
    padding: '9px 11px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  subPanel: {
    marginBottom: '12px',
    padding: '10px',
    background: '#f8f9fa',
    borderLeft: '3px solid #0d6efd',
    borderRadius: '4px',
  },
  highlightBox: {
    padding: '12px',
    backgroundColor: '#e8f4f8',
    borderRadius: '8px',
    marginTop: '10px',
    fontSize: '13px',
    color: '#2980b9',
    lineHeight: '1.6',
  },
  presetRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '14px',
  },
  presetBtn: {
    flex: 1,
    padding: '7px 4px',
    fontSize: '12px',
    cursor: 'pointer',
    border: '1px solid #27ae60',
    borderRadius: '6px',
    background: '#fff',
    color: '#27ae60',
    fontWeight: 500,
  },
  hint: {
    fontSize: '11px',
    color: '#888',
    marginTop: '3px',
  },
  resultRow: {
    marginBottom: '8px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #eee',
    margin: '14px 0',
  },
  statusBox: (ok) => ({
    marginBottom: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: ok ? '#d4edda' : '#f8d7da',
    border: `1px solid ${ok ? '#c3e6cb' : '#f5c6cb'}`,
  }),
  diagramBox: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
    maxWidth: '600px',
    margin: '0 auto',
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
  pdfBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '18px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.1s',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
  },
};

export default CalculadoraEscaleras;
