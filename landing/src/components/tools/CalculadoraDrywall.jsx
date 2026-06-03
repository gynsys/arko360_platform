import React, { useState, useMemo } from 'react';

const CalculadoraDrywall = () => {
  // 1. ESTADO: Datos de entrada del usuario
  const [datos, setDatos] = useState({
    largo: 4.0,
    alto: 2.5,
  });

  const [puertas, setPuertas] = useState({
    incluir: false,
    cantidad: 1,
  });

  const [ventanas, setVentanas] = useState({
    incluir: false,
    cantidad: 1,
  });

  // Manejadores de cambios
  const handleDatosChange = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setDatos({ ...datos, [name]: isNaN(val) ? 0 : val });
  };

  const handlePuertasChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPuertas({
      ...puertas,
      [name]: type === 'checkbox' ? checked : parseInt(value) || 0,
    });
  };

  const handleVentanasChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVentanas({
      ...ventanas,
      [name]: type === 'checkbox' ? checked : parseInt(value) || 0,
    });
  };

  // 2. LÓGICA DE CÁLCULO DE MATERIALES
  const resultados = useMemo(() => {
    // Dimensiones estándar asumidas (metros)
    const areaLamina = 1.22 * 2.44; // 2.97 m2
    const anchoPuerta = 0.9;
    const altoPuerta = 2.1;
    const anchoVentana = 1.2;
    const altoVentana = 1.2;

    // Cálculos de Área
    const areaTotal = datos.largo * datos.alto;
    const areaPuertas = puertas.incluir ? (puertas.cantidad * anchoPuerta * altoPuerta) : 0;
    const areaVentanas = ventanas.incluir ? (ventanas.cantidad * anchoVentana * altoVentana) : 0;
    
    // Evitar áreas negativas si el usuario pone demasiadas puertas/ventanas
    const areaNeta = Math.max(0, areaTotal - areaPuertas - areaVentanas);

    // Cálculo de Materiales (Asumiendo pared de 1 cara para forrar, multiplica por 2 si son ambas caras)
    const laminas = Math.ceil(areaNeta / areaLamina);
    const canales = Math.ceil((datos.largo * 2) / 3.05); // Superior e inferior (piezas de 3.05m)
    
    // Parales: 1 cada 0.61m + refuerzos para marcos de puertas y ventanas
    let parales = Math.ceil(datos.largo / 0.61) + 1;
    if (puertas.incluir) parales += puertas.cantidad * 2; // 2 parales extra por puerta
    if (ventanas.incluir) parales += ventanas.cantidad * 2; // 2 parales extra por ventana

    const tornillosEstructura = parales * 4; // Tornillos metal-metal
    const tornillosDrywall = laminas * 25; // Tornillos drywall-metal
    const pastaMastic = Math.ceil((areaNeta * 0.8) / 15); // Cuñetes de 15kg aprox
    const cinta = Math.ceil((laminas * 2.44) / 75); // Rollos de cinta de 75m aprox

    return {
      areaTotal: areaTotal.toFixed(2),
      areaNeta: areaNeta.toFixed(2),
      materiales: {
        laminas,
        canales,
        parales,
        tornillosEstructura,
        tornillosDrywall,
        pastaMastic,
        cinta
      }
    };
  }, [datos, puertas, ventanas]);

  // 3. LÓGICA DE DIBUJO (SVG)
  // Escala dinámica para encajar en el cuadro de 400x300
  const maxAncho = datos.largo > 0 ? datos.largo : 1;
  const maxAlto = datos.alto > 0 ? datos.alto : 1;
  const scale = Math.min(360 / maxAncho, 260 / maxAlto);

  const svgWidth = 400;
  const svgHeight = 300;
  const originX = (svgWidth - datos.largo * scale) / 2; // Centrado horizontal
  const originY = svgHeight - 20; // Margen inferior

  const topY = originY - (datos.alto * scale);
  const rectWidth = datos.largo * scale;
  const rectHeight = datos.alto * scale;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Calculadora de Paredes de Drywall</h2>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* PANEL DE CONFIGURACIÓN */}
        <div style={{ flex: '1 1 300px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Dimensiones (Metros)</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Largo: </label>
            <input type="number" step="0.1" name="largo" value={datos.largo} onChange={handleDatosChange} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label>Alto: </label>
            <input type="number" step="0.1" name="alto" value={datos.alto} onChange={handleDatosChange} style={{ width: '100%' }} />
          </div>

          <hr />
          <h3>Aberturas</h3>
          
          {/* TOGGLE PUERTAS */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
              <input type="checkbox" name="incluir" checked={puertas.incluir} onChange={handlePuertasChange} style={{ marginRight: '10px' }} />
              Incluir Puertas
            </label>
            {puertas.incluir && (
              <div style={{ marginTop: '5px', paddingLeft: '25px' }}>
                <label>Cantidad: </label>
                <input type="number" min="1" name="cantidad" value={puertas.cantidad} onChange={handlePuertasChange} style={{ width: '80px' }} />
              </div>
            )}
          </div>

          {/* TOGGLE VENTANAS */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
              <input type="checkbox" name="incluir" checked={ventanas.incluir} onChange={handleVentanasChange} style={{ marginRight: '10px' }} />
              Incluir Ventanas
            </label>
            {ventanas.incluir && (
              <div style={{ marginTop: '5px', paddingLeft: '25px' }}>
                <label>Cantidad: </label>
                <input type="number" min="1" name="cantidad" value={ventanas.cantidad} onChange={handleVentanasChange} style={{ width: '80px' }} />
              </div>
            )}
          </div>
        </div>

        {/* DIAGRAMA INTERACTIVO */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
          <h3>Plano de la Pared</h3>
          <svg width={svgWidth} height={svgHeight} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
            
            {/* Pared Principal */}
            <rect x={originX} y={topY} width={rectWidth} height={rectHeight} fill="#e0e0e0" stroke="#9e9e9e" strokeWidth="2" />
            
            {/* Dibujar Puertas */}
            {puertas.incluir && Array.from({ length: puertas.cantidad }).map((_, i) => {
              const pWidth = 0.9 * scale;
              const pHeight = 2.1 * scale;
              const spacing = rectWidth / (puertas.cantidad + 1);
              const x = originX + spacing * (i + 1) - (pWidth / 2);
              const y = originY - pHeight;
              
              // No dibujar si se sale de la pared
              if (2.1 > datos.alto) return null; 

              return <rect key={`puerta-${i}`} x={x} y={y} width={pWidth} height={pHeight} fill="#8d6e63" stroke="#5d4037" strokeWidth="2" />;
            })}

            {/* Dibujar Ventanas */}
            {ventanas.incluir && Array.from({ length: ventanas.cantidad }).map((_, i) => {
              const vWidth = 1.2 * scale;
              const vHeight = 1.2 * scale;
              const spacing = rectWidth / (ventanas.cantidad + 1);
              const x = originX + spacing * (i + 1) - (vWidth / 2);
              // Colocamos las ventanas a 1 metro del suelo
              const sillHeight = 1.0 * scale; 
              const y = originY - sillHeight - vHeight;

              // No dibujar si se sale de la pared
              if ((1.0 + 1.2) > datos.alto) return null;

              return <rect key={`ventana-${i}`} x={x} y={y} width={vWidth} height={vHeight} fill="#bbdefb" stroke="#1976d2" strokeWidth="2" />;
            })}

            {/* Nivel del piso */}
            <line x1="0" y1={originY} x2={svgWidth} y2={originY} stroke="#555" strokeWidth="4" />

            {/* Cotas */}
            <text x={originX + rectWidth / 2 - 20} y={originY + 15} fontSize="12" fill="#333">{datos.largo}m</text>
            <text x={originX - 35} y={originY - rectHeight / 2 + 5} fontSize="12" fill="#333">{datos.alto}m</text>
          </svg>
        </div>

        {/* LISTA DE MATERIALES */}
        <div style={{ flex: '1 1 200px', padding: '15px', border: '1px solid #2e7d32', borderRadius: '8px', backgroundColor: '#e8f5e9' }}>
          <h3 style={{ color: '#2e7d32', marginTop: 0 }}>Lista de Materiales</h3>
          <p style={{ fontSize: '0.9em', color: '#555' }}>Cálculo para <strong>1 cara</strong>. Área neta a cubrir: {resultados.areaNeta} m².</p>
          <hr style={{ borderColor: '#a5d6a7' }}/>
          <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '1.8' }}>
            <li><strong>Láminas (1.22 x 2.44):</strong> {resultados.materiales.laminas} pzas</li>
            <li><strong>Canales (3.05m):</strong> {resultados.materiales.canales} pzas</li>
            <li><strong>Parales (3.05m):</strong> {resultados.materiales.parales} pzas</li>
            <li><strong>Tornillos (Estructura):</strong> {resultados.materiales.tornillosEstructura} und</li>
            <li><strong>Tornillos (Drywall):</strong> {resultados.materiales.tornillosDrywall} und</li>
            <li><strong>Pasta Mastic (15kg):</strong> {resultados.materiales.pastaMastic} cuñete(s)</li>
            <li><strong>Cinta de Papel:</strong> {resultados.materiales.cinta} rollo(s)</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default CalculadoraDrywall;