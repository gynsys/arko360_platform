import React, { useState, useMemo } from 'react';

const MuroGravedad = () => {
  // 1. ESTADO: Datos de entrada del usuario
  const [datos, setDatos] = useState({
    gamma1: 1500,
    gamma2: 1800,
    gammaMuro: 2000,
    phi1: 30,
    phi2: 47,
    vs: 25,
    h: 3.5,
    b1: 0.2, // Inclinación cara 1 (talón)
    b2: 0.2, // Inclinación cara 2 (punta)
    df: 1.2, // Profundidad de desplante
    a: 0.8, // Ancho de corona
  });

  // Calcular automáticamente la base B y las secciones en base a la geometría
  const b = useMemo(() => {
    // Base = corona + inclinaciones
    return datos.a + datos.b1 + datos.b2;
  }, [datos.a, datos.b1, datos.b2]);

  const secciones = useMemo(() => {
    // Sección 1: Corona (rectángulo superior)
    const sec1Area = datos.a * 0.5; // Altura aproximada de corona
    const sec1Brazo = datos.b - (datos.a / 2);

    // Sección 2: Cuerpo principal (trapecio)
    const alturaCuerpo = datos.h - 0.5; // Restando corona
    const anchoSuperior = datos.a;
    const anchoInferior = datos.a + datos.b1 + datos.b2;
    const sec2Area = (anchoSuperior + anchoInferior) * alturaCuerpo / 2;
    const sec2Brazo = datos.b / 2;

    // Sección 3: Talón (triángulo izquierdo)
    const sec3Area = datos.b1 * alturaCuerpo / 2;
    const sec3Brazo = datos.b - (datos.b1 / 3);

    // Sección 4: Punta (triángulo derecho)
    const sec4Area = datos.b2 * alturaCuerpo / 2;
    const sec4Brazo = datos.b2 / 3;

    return [
      { id: 1, area: sec1Area, brazo: sec1Brazo },
      { id: 2, area: sec2Area, brazo: sec2Brazo },
      { id: 3, area: sec3Area, brazo: sec3Brazo },
      { id: 4, area: sec4Area, brazo: sec4Brazo }
    ];
  }, [datos.a, datos.b1, datos.b2, datos.h]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Evitamos valores negativos o cero en dimensiones para que el dibujo no colapse
    const val = parseFloat(value);
    setDatos({ ...datos, [name]: isNaN(val) ? 0 : val });
  };

  // 2. LÓGICA DE CÁLCULO
  const resultados = useMemo(() => {
    const phi1Rad = datos.phi1 * (Math.PI / 180);
    const phi2Rad = datos.phi2 * (Math.PI / 180);

    const ka = (1 - Math.sin(phi1Rad)) / (1 + Math.sin(phi1Rad));
    const kp = (1 + Math.sin(phi2Rad)) / (1 - Math.sin(phi2Rad));

    // Empuje activo considerando Df
    const hTotal = datos.h + datos.df;
    const pah = 0.5 * datos.gamma1 * Math.pow(hTotal, 2) * ka;
    const brazoPah = hTotal / 3;
    const mv = pah * brazoPah;

    let wt = 0;
    let mr = 0;
    secciones.forEach((sec) => {
      const peso = sec.area * datos.gammaMuro;
      mr += peso * sec.brazo;
      wt += peso;
    });

    // Resistencia por fricción considerando Df
    const fr = wt * Math.tan(phi2Rad);
    const pp = 0.5 * datos.gamma1 * Math.pow(datos.df, 2) * kp; // Empuje pasivo
    const fsVolteo = mv > 0 ? mr / mv : Infinity;
    const fsDeslizamiento = pah > 0 ? (fr + pp) / pah : Infinity;

    // Ubicación de la Resultante (xBar medido desde la punta/talón)
    const xBar = wt > 0 ? (mr - mv) / wt : 0;
    const excentricidad = (b / 2) - xBar;
    const esfuerzoMax = ((wt / b) * (1 + (6 * excentricidad / b))) / 1000;
    const esfuerzoMin = ((wt / b) * (1 - (6 * excentricidad / b))) / 1000;

    return {
      ka: ka.toFixed(3),
      kp: kp.toFixed(3),
      pah: pah.toFixed(2),
      mv: mv.toFixed(2),
      wt: wt.toFixed(2),
      mr: mr.toFixed(2),
      fr: fr.toFixed(2),
      pp: pp.toFixed(2),
      fsVolteo: fsVolteo.toFixed(2),
      fsDeslizamiento: fsDeslizamiento.toFixed(2),
      esfuerzoMax: esfuerzoMax.toFixed(2),
      esfuerzoMin: esfuerzoMin.toFixed(2),
      xBar: xBar,
      brazoPah: brazoPah,
      b: b // Base calculada
    };
  }, [datos, secciones, b]);

  // 3. LÓGICA DE DIBUJO (SVG)
  // Calculamos una escala dinámica para que el muro siempre quepa en el cuadro
  const maxDim = Math.max(datos.h + datos.df, b);
  const scale = maxDim > 0 ? 250 / maxDim : 1;

  // Coordenadas base (Punta del muro a la izquierda, Suelo a la derecha)
  const originX = 80;  // Margen izquierdo
  const originY = 320; // Margen inferior

  // Coordenadas del muro con geometría b1 y b2
  const toeX = originX;
  const heelX = originX + b * scale;
  const topY = originY - datos.h * scale;
  const dfY = originY + datos.df * scale; // Nivel de fundación

  // Path del muro con inclinaciones b1 y b2
  const pathMuro = `M ${toeX},${originY} L ${heelX},${originY} L ${heelX - datos.b2 * scale},${topY} L ${toeX + datos.b1 * scale},${topY} Z`;

  // Df (profundidad de desplante)
  const pathDf = `M ${toeX},${originY} L ${toeX},${dfY} L ${heelX},${dfY} L ${heelX},${originY} Z`;

  // Coordenadas de Fuerzas
  const pahY = originY - resultados.brazoPah * scale;
  const resultanteX = toeX + resultados.xBar * scale;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Calculadora Interactiva: Muro de Gravedad</h2>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* FORMULARIO */}
        <div style={{ flex: '1 1 300px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Dimensiones</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Altura H (m): </label>
            <input type="number" step="0.1" name="h" value={datos.h} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Ancho Corona A (m): </label>
            <input type="number" step="0.1" name="a" value={datos.a} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Inclinación Talón b1 (m): </label>
            <input type="number" step="0.1" name="b1" value={datos.b1} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Inclinación Punta b2 (m): </label>
            <input type="number" step="0.1" name="b2" value={datos.b2} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Profundidad Desplante Df (m): </label>
            <input type="number" step="0.1" name="df" value={datos.df} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f0f4f8', borderRadius: '4px' }}>
            <label><strong>Base Calculada B:</strong> {resultados.b.toFixed(2)} m</label>
          </div>
          <h3>Propiedades del Suelo</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Peso Relleno (Kg/m3): </label>
            <input type="number" name="gamma1" value={datos.gamma1} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Fricción Relleno (°): </label>
            <input type="number" name="phi1" value={datos.phi1} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Fricción Fundación (°): </label>
            <input type="number" name="phi2" value={datos.phi2} onChange={handleChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Capacidad Soporte Vs (Kg/m2): </label>
            <input type="number" name="vs" value={datos.vs} onChange={handleChange} style={{ width: '100%' }} />
          </div>
        </div>

        {/* DIAGRAMA INTERACTIVO */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
          <h3>Diagrama de Fuerzas</h3>
          <svg width="400" height="450" style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>

            {/* Nivel del Suelo (Derecha) */}
            <line x1={heelX} y1={topY} x2={400} y2={topY} stroke="#8B4513" strokeWidth="3" />
            <text x={heelX + 10} y={topY - 10} fill="#8B4513" fontSize="12">Suelo</text>

            {/* Suelo Base (Abajo) */}
            <line x1={0} y1={originY} x2={400} y2={originY} stroke="#555" strokeWidth="4" />

            {/* Df (Profundidad de desplante) */}
            <path d={pathDf} fill="#e0e0e0" stroke="#666" strokeWidth="1" strokeDasharray="4" />
            <text x={toeX + 10} y={dfY - 10} fill="#666" fontSize="11">Df = {datos.df}m</text>

            {/* Forma del Muro */}
            <path d={pathMuro} fill="#b0bec5" stroke="#455a64" strokeWidth="2" />

            {/* Líneas de inclinación b1 y b2 */}
            <line x1={toeX + datos.b1 * scale} y1={topY} x2={toeX} y2={originY} stroke="#666" strokeWidth="1" strokeDasharray="3" />
            <text x={toeX + datos.b1 * scale / 2 - 15} y={topY + 20} fill="#666" fontSize="10">b1</text>

            <line x1={heelX - datos.b2 * scale} y1={topY} x2={heelX} y2={originY} stroke="#666" strokeWidth="1" strokeDasharray="3" />
            <text x={heelX - datos.b2 * scale / 2 - 15} y={topY + 20} fill="#666" fontSize="10">b2</text>

            {/* Flecha de Empuje Activo (Pah) */}
            <line x1={heelX + 60} y1={pahY} x2={heelX} y2={pahY} stroke="red" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <text x={heelX + 65} y={pahY + 5} fill="red" fontSize="14" fontWeight="bold">Pah</text>
            <text x={heelX + 5} y={pahY + 20} fill="#666" fontSize="12">(H+Df)/3</text>

            {/* Flecha de Fuerza Resultante en la Base */}
            {resultados.xBar > 0 && (
              <>
                <circle cx={resultanteX} cy={originY} r="5" fill="blue" />
                <line x1={resultanteX} y1={originY + 40} x2={resultanteX} y2={originY} stroke="blue" strokeWidth="3" markerEnd="url(#arrowhead-blue)" />
                <text x={resultanteX - 30} y={originY + 55} fill="blue" fontSize="12" fontWeight="bold">Resultante</text>
              </>
            )}

            {/* Cotas (B, H, Df) */}
            <line x1={toeX} y1={originY + 15} x2={heelX} y2={originY + 15} stroke="#000" strokeWidth="1" />
            <text x={toeX + (b * scale)/2 - 10} y={originY + 30} fontSize="12">B = {b.toFixed(2)}m</text>

            <line x1={toeX - 15} y1={originY} x2={toeX - 15} y2={topY} stroke="#000" strokeWidth="1" />
            <text x={toeX - 55} y={originY - (datos.h * scale)/2} fontSize="12">H = {datos.h}m</text>

            <line x1={heelX + 15} y1={originY} x2={heelX + 15} y2={dfY} stroke="#000" strokeWidth="1" />
            <text x={heelX + 20} y={originY + (datos.df * scale)/2} fontSize="12">Df = {datos.df}m</text>

            {/* Definición de Flechas para SVG */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="red" />
              </marker>
              <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="blue" />
              </marker>
            </defs>
          </svg>
        </div>

        {/* RESULTADOS NUMÉRICOS */}
        <div style={{ flex: '1 1 250px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h3>Resultados</h3>
          <p><strong>Ka:</strong> {resultados.ka}</p>
          <p><strong>Kp:</strong> {resultados.kp}</p>
          <p><strong>Pah:</strong> {resultados.pah} Kg/m</p>
          <p><strong>Mv:</strong> {resultados.mv} Kg-m/m</p>
          <hr />
          <p><strong>Wt:</strong> {resultados.wt} Kg/m</p>
          <p><strong>MR:</strong> {resultados.mr} Kg-m/m</p>
          <p><strong>Fr:</strong> {resultados.fr} Kg/m</p>
          <p><strong>Pp:</strong> {resultados.pp} Kg/m</p>
          <hr />
          <p>
            <strong>F.S. Volteo:</strong> {resultados.fsVolteo} <br/>
            <span style={{ color: resultados.fsVolteo >= 1.5 ? 'green' : 'red', fontSize: '0.9em' }}>
              {resultados.fsVolteo >= 1.5 ? '✔ CUMPLE' : '✖ FALLA'}
            </span>
          </p>
          <p>
            <strong>F.S. Deslizamiento:</strong> {resultados.fsDeslizamiento} <br/>
            <span style={{ color: resultados.fsDeslizamiento >= 1.5 ? 'green' : 'red', fontSize: '0.9em' }}>
              {resultados.fsDeslizamiento >= 1.5 ? '✔ CUMPLE' : '✖ FALLA'}
            </span>
          </p>
          <p>
            <strong>Punto Resultante:</strong> a {resultados.xBar.toFixed(2)}m de la punta.
          </p>
          <hr />
          <p><strong>qmax:</strong> {resultados.esfuerzoMax} Kg/m2</p>
          <p><strong>qmin:</strong> {resultados.esfuerzoMin} Kg/m2</p>
          <p>
            <strong>Capacidad Soporte:</strong> {datos.vs} Kg/m2 <br/>
            <span style={{ color: parseFloat(resultados.esfuerzoMax) <= datos.vs ? 'green' : 'red', fontSize: '0.9em' }}>
              {parseFloat(resultados.esfuerzoMax) <= datos.vs ? '✔ CUMPLE' : '✖ FALLA'}
            </span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default MuroGravedad;