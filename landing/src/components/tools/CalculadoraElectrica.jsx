import React, { useState, useMemo } from 'react';

const CalculadoraElectrica = () => {
  // 1. ESTADO: Equipos e instalaciones en la vivienda
  const [cargas, setCargas] = useState({
    lucesLed: 10,        // 15W c/u
    lucesFilamento: 0,   // 60W c/u
    tomacorrientes: 8,   // 180W (1.5A) c/u
    extractores: 1,      // 150W c/u
    ac12k: 1,            // 1200W ~ 220V
    ac18k: 0,            // 1800W ~ 220V
    ac24k: 0,            // 2400W ~ 220V
    microondas: 0,       // 1200W ~ 120V
    calentador: 0,        // 3000W ~ 220V
    distanciaAcometida: 15 // metros
  });

  const [material, setMaterial] = useState('cobre'); // cobre | aluminio

  const handleChange = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setCargas(prev => ({ ...prev, [name]: isNaN(val) || val < 0 ? 0 : val }));
  };

  // 2. LÓGICA DE CÁLCULO CORREGIDA (Basada en NEC 2023 / NFPA 70)
  const resultados = useMemo(() => {
    // --- Watts por categoría ---
    const wLucesLed = cargas.lucesLed * 15;
    const wLucesFil = cargas.lucesFilamento * 60;
    const wLuces = wLucesLed + wLucesFil;
    const wTomas = cargas.tomacorrientes * 180;
    const wExtractores = cargas.extractores * 150;
    const wMicroondas = cargas.microondas * 1200;

    // Cargas de 120V (uso general: iluminación + tomas + extractores + microondas)
    const cargaGeneral120V = wLuces + wTomas + wExtractores + wMicroondas;

    // Cargas de 220V (fase-fase)
    const wAires = (cargas.ac12k * 1200) + (cargas.ac18k * 1800) + (cargas.ac24k * 2400);
    const wCalentador = cargas.calentador * 3000;
    const cargaFuerza220V = wAires + wCalentador;

    // --- Factor de Demanda NEC (Art. 220) ---
    // Carga general (iluminación + tomas): 100% primeros 3,000W + 35% del resto
    const demandaGeneral = cargaGeneral120V <= 3000
      ? cargaGeneral120V
      : 3000 + (cargaGeneral120V - 3000) * 0.35;

    // Aires y calentador: 100% (se asume simultaneidad máxima en climas cálidos)
    const demandaAires = wAires;
    const demandaCalentador = wCalentador;

    // Microondas: si hay 1, NEC permite incluirlo en carga general o 100% dedicado.
    // Aquí ya está incluido en cargaGeneral120V, pero para circuitos derivados lo tratamos dedicado.

    const cargaTotalDemanda = demandaGeneral + demandaAires + demandaCalentador;

    // --- Cálculo de Amperaje por separado (NO sumar watts y dividir por un solo voltaje) ---
    // Cargas 120V: I = W / 120
    const amps120V = cargaGeneral120V / 120;
    // Cargas 220V: I = W / 220
    const amps220V = cargaFuerza220V / 220;

    // --- Balanceo de Fases (Acometida 120/240V) ---
    // Las cargas 120V se distribuyen entre 2 fases (L1-N y L2-N).
    // Asumimos distribución 50/50 ideal. La fase más cargada lleva:
    // (mitad de corriente 120V) + (toda la corriente 220V, porque afecta L1-L2)
    const ampsPorFase = (amps120V / 2) + amps220V;

    // Amperaje de diseño = corriente por fase (la peor fase)
    // NOTA: NEC permite usar la carga con demanda para calcular el servicio,
    // pero para el breaker principal usamos la corriente de la fase más cargada.
    const amperajeDiseño = ampsPorFase;

    // --- Caída de Tensión (simplificación para acometida) ---
    // Vd = 2 * I * L * R / 1000  (ida y vuelta)
    // R en ohm/km (aprox): Cu 12AWG=5.21, 10AWG=3.28, 8AWG=2.06, 6AWG=1.30, 4AWG=0.82, 2AWG=0.52, 1/0=0.33, 3/0=0.21
    // R en ohm/km (aprox): Al 8AWG=3.44, 6AWG=2.16, 4AWG=1.36, 2AWG=0.86, 1/0=0.54, 3/0=0.34
    const resistencias = {
      cobre: {
        '14': 8.45, '12': 5.21, '10': 3.28, '8': 2.06, '6': 1.30,
        '4': 0.82, '2': 0.52, '1/0': 0.33, '2/0': 0.26, '3/0': 0.21, '4/0': 0.17
      },
      aluminio: {
        '12': 8.45, '10': 5.29, '8': 3.44, '6': 2.16, '4': 1.36,
        '2': 0.86, '1/0': 0.54, '2/0': 0.43, '3/0': 0.34, '4/0': 0.27
      }
    };

    // --- Selección de Breaker Principal y Cable AWG ---
    let breakerPrincipal = 0;
    let cableAWG = "";
    let caidaTensionPct = 0;
    let espaciosTablero = 2; // breaker principal ocupa 2 espacios (2 polos)

    // Tabla de capacidad por material (ampacidad a 75°C, NEC 310.16)
    const ampacidad = {
      cobre: {
        '14': 20, '12': 25, '10': 35, '8': 50, '6': 65, '4': 85, '2': 115,
        '1/0': 150, '2/0': 175, '3/0': 200, '4/0': 230
      },
      aluminio: {
        '12': 20, '10': 30, '8': 40, '6': 50, '4': 65, '2': 90,
        '1/0': 120, '2/0': 135, '3/0': 155, '4/0': 180
      }
    };

    // Seleccionamos el calibre más pequeño que cumpla:
    // 1. Ampacidad >= amperajeDiseño
    // 2. Caída de tensión <= 3% (NEC recomienda máx 3% en ramales, 5% total)
    const distancia = cargas.distanciaAcometida; // metros
    const voltajeSistema = 240; // L-L

    const calibres = material === 'cobre'
      ? ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0']
      : ['12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0'];

    let calibreSeleccionado = null;
    for (const awg of calibres) {
      const amp = ampacidad[material][awg];
      if (amp < amperajeDiseño) continue;

      const R = resistencias[material][awg]; // ohm/km
      const caidaV = (2 * amperajeDiseño * (distancia / 1000) * R);
      const caidaPct = (caidaV / voltajeSistema) * 100;

      if (caidaPct <= 3.0) {
        calibreSeleccionado = awg;
        caidaTensionPct = caidaPct;
        break;
      }
    }

    if (calibreSeleccionado) {
      cableAWG = `${calibreSeleccionado} AWG ${material === 'cobre' ? 'THHN/THWN-2 (Cobre)' : 'THHN/THWN-2 (Aluminio)'}`;
      // Breaker estándar inmediatamente superior al amperaje de diseño
      const stdBreakers = [40, 60, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300, 400];
      breakerPrincipal = stdBreakers.find(b => b >= amperajeDiseño) || 400;
    } else {
      cableAWG = "Requiere cable mayor a 4/0 AWG o paralelo. Consultar ingeniero.";
      breakerPrincipal = 400;
      caidaTensionPct = 999;
    }

    // --- Circuitos Derivados (NEC 210) ---
    const circuitos = [];
    let breakers1P = 0;
    let breakers2P = 0;

    // Iluminación: 15A breaker -> 1,440W máximo continuo (80% de 1,800W)
    const numCircLuces = Math.ceil(wLuces / 1440) || 1;
    circuitos.push({
      texto: `${numCircLuces}x Breaker 1x15A (Cable 14 AWG) — Iluminación (${wLuces}W)`,
      tipo: '1P'
    });
    breakers1P += numCircLuces;

    // Tomacorrientes + Extractores: 20A breaker -> 1,920W máximo continuo
    const wTomasExtractores = wTomas + wExtractores;
    const numCircTomas = Math.ceil(wTomasExtractores / 1920) || 1;
    circuitos.push({
      texto: `${numCircTomas}x Breaker 1x20A (Cable 12 AWG) — Tomacorrientes + Extractores (${wTomasExtractores}W)`,
      tipo: '1P'
    });
    breakers1P += numCircTomas;

    // Microondas: circuito dedicado 20A
    if (cargas.microondas > 0) {
      circuitos.push({
        texto: `${cargas.microondas}x Breaker 1x20A (Cable 12 AWG) — Microondas dedicado (${wMicroondas}W)`,
        tipo: '1P'
      });
      breakers1P += cargas.microondas;
    }

    // Aires 12k/18k: 220V, ~5.5-8.2A. Breaker 2x15A, cable 12 AWG
    const airesPequenos = cargas.ac12k + cargas.ac18k;
    if (airesPequenos > 0) {
      circuitos.push({
        texto: `${airesPequenos}x Breaker 2x15A (Cable 12 AWG) — AC 12k/18k BTU`,
        tipo: '2P'
      });
      breakers2P += airesPequenos;
    }

    // Aires 24k: 220V, ~11A. Breaker 2x20A, cable 10 AWG
    if (cargas.ac24k > 0) {
      circuitos.push({
        texto: `${cargas.ac24k}x Breaker 2x20A (Cable 10 AWG) — AC 24k BTU`,
        tipo: '2P'
      });
      breakers2P += cargas.ac24k;
    }

    // Calentador: 220V, ~13.6A. Breaker 2x20A, cable 10 AWG
    if (cargas.calentador > 0) {
      circuitos.push({
        texto: `${cargas.calentador}x Breaker 2x20A (Cable 10 AWG) — Calentador de Agua (${wCalentador}W)`,
        tipo: '2P'
      });
      breakers2P += cargas.calentador;
    }

    espaciosTablero += breakers1P + (breakers2P * 2);
    // Se recomienda tablero con 20% de espacios libres mínimo
    const espaciosRecomendados = Math.ceil(espaciosTablero * 1.25);

    return {
      cargaGeneral120V,
      cargaFuerza220V,
      cargaTotalW: cargaGeneral120V + cargaFuerza220V,
      demandaGeneral: Math.round(demandaGeneral),
      demandaTotal: Math.round(cargaTotalDemanda),
      amps120V: amps120V.toFixed(1),
      amps220V: amps220V.toFixed(1),
      ampsPorFase: ampsPorFase.toFixed(1),
      amperajeDiseño: amperajeDiseño.toFixed(1),
      breakerPrincipal,
      cableAWG,
      caidaTensionPct: caidaTensionPct.toFixed(2),
      circuitos,
      espaciosTablero,
      espaciosRecomendados,
      material
    };
  }, [cargas, material]);

  // 3. INTERFAZ DE USUARIO
  return (
    <div style={{ padding: '24px', fontFamily: 'Segoe UI, Arial, sans-serif', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#1a237e' }}>⚡ Calculadora de Carga y Acometida Eléctrica</h2>
        <p style={{ color: '#555', margin: 0 }}>Cálculo basado en NEC 2023 / NFPA 70. Separa correctamente cargas 120V y 220V con balanceo de fases.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* PANEL DE INGRESO DE DATOS */}
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Sección 1: Iluminación y Tomas */}
          <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #ff9800' }}>
            <h4 style={{ margin: '0 0 14px 0', color: '#e65100' }}>💡 Iluminación y Tomas (120V)</h4>

            <InputRow label="Luces LED" name="lucesLed" value={cargas.lucesLed} onChange={handleChange} suffix="× 15W" />
            <InputRow label="Luces Filamento/Incandescentes" name="lucesFilamento" value={cargas.lucesFilamento} onChange={handleChange} suffix="× 60W" />
            <InputRow label="Tomacorrientes Generales" name="tomacorrientes" value={cargas.tomacorrientes} onChange={handleChange} suffix="× 180W" />
            <InputRow label="Extractores de Aire" name="extractores" value={cargas.extractores} onChange={handleChange} suffix="× 150W" />
          </div>

          {/* Sección 2: Climatización */}
          <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #2196f3' }}>
            <h4 style={{ margin: '0 0 14px 0', color: '#0d47a1' }}>❄️ Climatización (220V)</h4>
            <InputRow label="Aires Acond. 12,000 BTU" name="ac12k" value={cargas.ac12k} onChange={handleChange} suffix="× 1200W" />
            <InputRow label="Aires Acond. 18,000 BTU" name="ac18k" value={cargas.ac18k} onChange={handleChange} suffix="× 1800W" />
            <InputRow label="Aires Acond. 24,000 BTU" name="ac24k" value={cargas.ac24k} onChange={handleChange} suffix="× 2400W" />
          </div>

          {/* Sección 3: Equipos Especiales */}
          <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #f44336' }}>
            <h4 style={{ margin: '0 0 14px 0', color: '#b71c1c' }}>🔌 Equipos Especiales</h4>
            <InputRow label="Microondas" name="microondas" value={cargas.microondas} onChange={handleChange} suffix="× 1200W (120V)" />
            <InputRow label="Calentador de Agua" name="calentador" value={cargas.calentador} onChange={handleChange} suffix="× 3000W (220V)" />
          </div>

          {/* Sección 4: Parámetros de Instalación */}
          <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #4caf50' }}>
            <h4 style={{ margin: '0 0 14px 0', color: '#1b5e20' }}>⚙️ Parámetros de Instalación</h4>
            <InputRow label="Distancia Acometida" name="distanciaAcometida" value={cargas.distanciaAcometida} onChange={handleChange} suffix="metros" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <label style={{ fontWeight: 500, color: '#333' }}>Material del Cable:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setMaterial('cobre')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: '1px solid #ccc',
                    backgroundColor: material === 'cobre' ? '#4caf50' : '#fff',
                    color: material === 'cobre' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 500
                  }}
                >Cobre</button>
                <button
                  onClick={() => setMaterial('aluminio')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: '1px solid #ccc',
                    backgroundColor: material === 'aluminio' ? '#4caf50' : '#fff',
                    color: material === 'aluminio' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 500
                  }}
                >Aluminio</button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DE RESULTADOS */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Resumen de Cargas */}
          <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '10px', border: '1px solid #bbdefb' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1565c0' }}>📊 Resumen de Cargas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <StatBox label="Carga General (120V)" value={`${resultados.cargaGeneral120V} W`} color="#333" />
              <StatBox label="Carga Fuerza (220V)" value={`${resultados.cargaFuerza220V} W`} color="#333" />
              <StatBox label="Carga Total (sin demanda)" value={`${resultados.cargaTotalW} W`} color="#d32f2f" />
              <StatBox label="Carga con Demanda NEC" value={`${resultados.demandaTotal} W`} color="#2e7d32" />
            </div>
          </div>

          {/* Amperajes */}
          <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '10px', border: '1px solid #ffe0b2' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#e65100' }}>🔢 Amperajes Calculados</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <StatBox label="Corriente 120V" value={`${resultados.amps120V} A`} color="#333" />
              <StatBox label="Corriente 220V" value={`${resultados.amps220V} A`} color="#333" />
              <StatBox label="Por Fase (balanceo)" value={`${resultados.ampsPorFase} A`} color="#1565c0" bg="#e3f2fd" />
              <StatBox label="Amperaje de Diseño" value={`${resultados.amperajeDiseño} A`} color="#d32f2f" bg="#ffebee" />
            </div>
            <small style={{ color: '#666', display: 'block', marginTop: '10px' }}>
              El amperaje de diseño considera la fase más cargada tras balancear las cargas 120V entre L1 y L2, más la corriente 220V (L1-L2).
            </small>
          </div>

          {/* Acometida Principal */}
          <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '10px', border: '2px solid #4caf50' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1b5e20' }}>🏠 Acometida Principal Recomendada</h3>
            <p style={{ margin: '6px 0', fontSize: '15px' }}>
              <strong>Interruptor Principal:</strong> <span style={{ color: '#d32f2f', fontSize: '18px' }}>{resultados.breakerPrincipal} A</span> (2 polos)
            </p>
            <p style={{ margin: '6px 0', fontSize: '15px' }}>
              <strong>Cable Fase/Neutro:</strong> {resultados.cableAWG}
            </p>
            <p style={{ margin: '6px 0', fontSize: '15px' }}>
              <strong>Cable de Tierra:</strong> Mismo calibre que el neutro ({resultados.cableAWG.split(' ')[0]} AWG)
            </p>
            <p style={{ margin: '6px 0', fontSize: '15px' }}>
              <strong>Caída de Tensión estimada:</strong> {resultados.caidaTensionPct}% <span style={{ color: '#666' }}>(máx. recomendado 3%)</span>
            </p>
          </div>

          {/* Tablero */}
          <div style={{ padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '10px', border: '1px solid #ce93d8' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#4a148c' }}>🗂️ Tablero de Distribución</h3>
            <p style={{ margin: '6px 0' }}><strong>Espacios ocupados:</strong> {resultados.espaciosTablero} espacios</p>
            <p style={{ margin: '6px 0' }}><strong>Espacios recomendados (20% libre):</strong> {resultados.espaciosRecomendados} espacios</p>
            <p style={{ margin: '6px 0', color: '#666' }}>Incluye breaker principal (2 espacios) + todos los circuitos derivados.</p>
          </div>

          {/* Circuitos Derivados */}
          <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e0e0e0' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>🔌 Circuitos Derivados</h3>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.7', color: '#444', margin: 0 }}>
              {resultados.circuitos.map((circuito, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  <strong>{circuito.texto}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#fffde7', borderRadius: '8px', border: '1px solid #fff9c4' }}>
            <small style={{ color: '#666' }}>
              ⚠️ <strong>Nota importante:</strong> Este cálculo es una guía técnica basada en NEC 2023. La instalación eléctrica debe ser diseñada y ejecutada por un electricista certificado. Se asume acometida monofásica 120/240V. Las cargas 120V se balancean 50/50 entre fases en este modelo.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para filas de input
const InputRow = ({ label, name, value, onChange, suffix }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
    <label style={{ fontWeight: 500, color: '#333', fontSize: '14px' }}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min="0"
        style={{
          width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc',
          textAlign: 'right', fontSize: '14px', outline: 'none'
        }}
      />
      <span style={{ fontSize: '12px', color: '#888', minWidth: '80px', textAlign: 'right' }}>{suffix}</span>
    </div>
  </div>
);

// Componente auxiliar para cajas de estadísticas
const StatBox = ({ label, value, color, bg }) => (
  <div style={{
    backgroundColor: bg || '#fff', padding: '12px', borderRadius: '8px',
    border: '1px solid #e0e0e0', textAlign: 'center'
  }}>
    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: 'bold', color: color }}>{value}</div>
  </div>
);

export default CalculadoraElectrica;