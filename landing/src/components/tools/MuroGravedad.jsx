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
    b: 1.5, // Base ampliada un poco para la visualización inicial
  });

  const [secciones, setSecciones] = useState([
    { id: 1, area: 0.35, brazo: 0.133 },
    { id: 2, area: 2.80, brazo: 0.600 }
  ]);

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

    const pah = 0.5 * datos.gamma1 * Math.pow(datos.h, 2) * ka;
    const brazoPah = datos.h / 3;
    const mv = pah * brazoPah;

    let wt = 0;
    let mr = 0;
    secciones.forEach((sec) => {
      const peso = sec.area * datos.gammaMuro;
      mr += peso * sec.brazo;
      wt += peso;
    });

    const fr = wt * Math.tan(phi2Rad);
    const fsVolteo = mv > 0 ? mr / mv : Infinity;
    const fsDeslizamiento = pah > 0 ? fr / pah : Infinity;

    // Ubicación de la Resultante (xBar medido desde la punta/talón)
    const xBar = wt > 0 ? (mr - mv) / wt : 0;
    const excentricidad = (datos.b / 2) - xBar;
    const esfuerzoMax = ((wt / datos.b) * (1 + (6 * excentricidad / datos.b))) / 1000;

    return {
      ka: ka.toFixed(3),
      pah: pah.toFixed(2),
      mv: mv.toFixed(2),
      wt: wt.toFixed(2),
      fsVolteo: fsVolteo.toFixed(2),
      fsDeslizamiento: fsDeslizamiento.toFixed(2),
      esfuerzoMax: esfuerzoMax.toFixed(2),
      xBar: xBar, // Extraemos xBar para dibujarlo en el SVG
      brazoPah: brazoPah
    };
  }, [datos, secciones]);

  // 3. LÓGICA DE DIBUJO (SVG)
  // Calculamos una escala dinámica para que el muro siempre quepa en el cuadro
  const maxDim = Math.max(datos.h, datos.b);
  const scale = maxDim > 0 ? 250 / maxDim : 1; 
  
  // Coordenadas base (Punta del muro a la izquierda, Suelo a la derecha)
  const originX = 80;  // Margen izquierdo
  const originY = 320; // Margen inferior

  // Coordenadas del muro
  const toeX = originX;
  const heelX = originX + datos.b * scale;
  const topY = originY - datos.h * scale;
  const coronaWidth = Math.min(0.4 * scale, (datos.b * scale) * 0.5); // Ancho superior visual
  
  // Path del muro (Trapecio asumiendo cara vertical contra el suelo)
  const pathMuro = `M ${toeX},${originY} L ${heelX},${originY} L ${heelX},${topY} L ${heelX - coronaWidth},${topY} Z`;

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
            <label>Base B (m): </label>
            <input type="number" step="0.1" name="b" value={datos.b} onChange={handleChange} style={{ width: '100%' }} />
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
        </div>

        {/* DIAGRAMA INTERACTIVO */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
          <h3>Diagrama de Fuerzas</h3>
          <svg width="400" height="400" style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
            
            {/* Nivel del Suelo (Derecha) */}
            <line x1={heelX} y1={topY} x2={400} y2={topY} stroke="#8B4513" strokeWidth="3" />
            <text x={heelX + 10} y={topY - 10} fill="#8B4513" fontSize="12">Suelo</text>

            {/* Suelo Base (Abajo) */}
            <line x1={0} y1={originY} x2={400} y2={originY} stroke="#555" strokeWidth="4" />

            {/* Forma del Muro */}
            <path d={pathMuro} fill="#b0bec5" stroke="#455a64" strokeWidth="2" />

            {/* Flecha de Empuje Activo (Pah) */}
            <line x1={heelX + 60} y1={pahY} x2={heelX} y2={pahY} stroke="red" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <text x={heelX + 65} y={pahY + 5} fill="red" fontSize="14" fontWeight="bold">Pah</text>
            <text x={heelX + 5} y={pahY + 20} fill="#666" fontSize="12">H/3</text>

            {/* Flecha de Fuerza Resultante en la Base */}
            {resultados.xBar > 0 && (
              <>
                <circle cx={resultanteX} cy={originY} r="5" fill="blue" />
                <line x1={resultanteX} y1={originY + 40} x2={resultanteX} y2={originY} stroke="blue" strokeWidth="3" markerEnd="url(#arrowhead-blue)" />
                <text x={resultanteX - 30} y={originY + 55} fill="blue" fontSize="12" fontWeight="bold">Resultante</text>
              </>
            )}

            {/* Cotas (H y B) */}
            <line x1={toeX} y1={originY + 15} x2={heelX} y2={originY + 15} stroke="#000" strokeWidth="1" />
            <text x={toeX + (datos.b * scale)/2 - 10} y={originY + 30} fontSize="12">B = {datos.b}m</text>

            <line x1={toeX - 15} y1={originY} x2={toeX - 15} y2={topY} stroke="#000" strokeWidth="1" />
            <text x={toeX - 55} y={originY - (datos.h * scale)/2} fontSize="12">H = {datos.h}m</text>

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
        <div style={{ flex: '1 1 200px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
          <h3>Resultados</h3>
          <p><strong>Pah:</strong> {resultados.pah} Kg/m</p>
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
        </div>

      </div>
    </div>
  );
};

export default MuroGravedad;