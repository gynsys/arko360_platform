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
    cvArea: 488,      // ACI/IBC: 100 psf ≈ 488 kg/m² para uso general
    factorCM: 1.2,
    factorCV: 1.6,
    fc: 210,
    fy: 4200,
    fyAcero: 2500,
    pesoLaminas: 150,
    recubrimiento: 2.5,
  });

  // Catálogo de Perfiles (valores aproximados en cm⁴ y cm³)
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
    if (uso === 'habitacional') setParametros({ ...parametros, cvArea: 195 });  // 40 psf
    if (uso === 'comercial') setParametros({ ...parametros, cvArea: 488 });    // 100 psf
    if (uso === 'industrial') setParametros({ ...parametros, cvArea: 732 });   // 150 psf
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
    const sinTheta = H / longitudZancaM;

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
      const b = 100; // ancho unitario en cm
      const Ru = mu_kg_cm / (0.90 * b * Math.pow(d, 2));
      let rho = (0.85 * parametros.fc / parametros.fy) * (1 - Math.sqrt(1 - (2 * Ru / (0.85 * parametros.fc))));
      if (isNaN(rho) || rho < 0) rho = 0;

      // ACI 318-19, 7.6.1.1: As,min = 0.0018 * Ag (unificado para todos los grados)
      const As_min = 0.0018 * b * espesorLosa;
      const As_req = Math.max(rho * b * d, As_min);

      // Verificación tensión controlada (ACI 318-19, 7.3.3.1)
      const β1 = parametros.fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (parametros.fc - 280) / 70);
      const a = rho * parametros.fy * d / (0.85 * parametros.fc);
      const c = a / β1;
      const εty = parametros.fy / 2_000_000;
      const εt = c > 0 ? ((d - c) / c) * 0.003 : 0;
      const tensionControlada = εt >= εty + 0.003;

      // Verificación cortante (ACI 318-19, 22.5.5.1)
      // Vc = 0.53 * √fc * b * d (en kg/cm², fórmula simplificada equivalente a 2√fc' en psi)
      const Vc = 0.53 * Math.sqrt(parametros.fc) * b * d;
      const φVc = 0.75 * Vc;
      const cumpleCortante = vMax <= φVc;

      // Espesor mínimo (ACI 318-19, 7.3.1.1)
      const h_min = L * 100 / 20; // simplemente apoyada
      const cumpleEspesor = espesorLosa >= h_min;

      // Deflexión (ACI 318-19, 7.3.2)
      // Si h < h_min, calcular deflexión
      let deflexion = null;
      if (!cumpleEspesor) {
        const I_g = (b * Math.pow(espesorLosa, 3)) / 12;
        const Ec = 15100 * Math.sqrt(parametros.fc); // kg/cm²
        const w_serv_cm = w_servicio / 100; // kg/cm
        const δ = (5 * w_serv_cm * Math.pow(L_cm, 4)) / (384 * Ec * I_g);
        const δ_lim = L_cm / 360;
        deflexion = { δ: δ.toFixed(2), δ_lim: δ_lim.toFixed(2), cumple: δ <= δ_lim };
      }

      // Separación máxima (ACI 318-19, 7.7.2.3)
      const s_max = Math.min(3 * espesorLosa, 45.7); // 45.7 cm = 18 in

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
      // --- Diseño de acero (AISC / ACI adaptado) ---
      const factorZanca = datos.tipoEstructura === 'acero1' ? 1 : 2;
      const mu_zanca_kg_cm = ((wu / factorZanca) * Math.pow(L, 2) / 8) * 100;
      // Carga por zanca inclinada (corregido)
      const w_zanca_inclinada = (w_servicio / factorZanca) / cosTheta;
      const w_serv_zanca_kg_cm = w_zanca_inclinada / 100;

      const Z_req = mu_zanca_kg_cm / (0.90 * parametros.fyAcero);
      // Deflexión sobre longitud de zanca (corregido)
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

  // 4. DIBUJO DE DIAGRAMAS (Corte y Momento) — CORREGIDO
  const renderizarDiagramas = () => {
    if (!resultados) return null;

    const svgW = 420;
    const svgH = 160;
    const marginX = 50;
    const midY = svgH / 2;
    const drawW = svgW - (marginX * 2);

    // Diagrama de corte: triángulo correcto
    const vMaxPx = 35;
    const vY1 = midY - vMaxPx;
    const vY2 = midY + vMaxPx;
    const pathCorte = `M ${marginX} ${midY} L ${marginX} ${vY1} L ${marginX + drawW} ${vY2} L ${marginX + drawW} ${midY} Z`;

    // Diagrama de momento: parábola real (cuadrática Bézier)
    const mMaxPx = 40;
    const baseY = svgH - 20;
    const peakY = baseY - mMaxPx;
    // Parábola por puntos para mayor precisión
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
            <text x={marginX + drawW / 2 - 40} y={peakY - 8} fontSize="12" fill="#0d6efd" fontWeight="bold">{resultados.mMax} kg-m</text>
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

        {/* PANEL RESULTADOS */}
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
};

export default CalculadoraEscaleras;
