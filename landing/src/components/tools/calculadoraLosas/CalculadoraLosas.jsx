import React, { useState, useMemo, useRef } from 'react';
import { calcularLosaMaciza } from './LosaMaciza';
import { calcularLosaLigera } from './LosaLigera';
import { calcularLosaColaborante } from './LosaColaborante';
import LosaMaciza from './LosaMaciza';
import LosaLigera from './LosaLigera';
import LosaColaborante from './LosaColaborante';

const CalculadoraLosas = () => {
  const [grid, setGrid] = useState({
    filas: 2,
    cols: 3,
    luzX: 4.5,
    luzY: 4.0,
  });

  const [datos, setDatos] = useState({
    cv: 250,
    cmExtra: 150,
    fc: 210,
    fy: 4200,
    recubrimiento: 2.0,
  });

  const [costos, setCostos] = useState({
    concretoM3: 130,
    aceroKg: 1.5,
    bloqueArcillaUnd: 2.5,
    bloqueEPSUnd: 3.5,
    steelDeckM2: 22,
    mallaM2: 3.0,
    correaKg: 2.0,
    vigaPrincipalKg: 2.2,
    studUnd: 4.0,
  });

  const [losaActiva, setLosaActiva] = useState('maciza');

  const [aligeradaConfig, setAligeradaConfig] = useState({
    tipoBloque: 'eps',
    anchoBloque: 50,
    anchoNervio: 10,
    espesorRoseta: 5,
    dirNervios: 'auto',
  });

  const [steelDeckConfig, setSteelDeckConfig] = useState({
    espesorConcreto: 6,
    calibre: 22,
    sepCorreas: 1.5,
    tipoVigaPrincipal: 'W12x26',
    tipoCorrea: 'C6x10.5',
    densidadStuds: 2,
    alturaDeck: 7.5,
  });

  const [macizaConfig, setMacizaConfig] = useState({
    diametroPosX: '1/2',
    diametroPosY: '1/2',
    diametroNegX: '1/2',
    diametroNegY: '1/2',
  });

  const printRef = useRef();

  // Handlers
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

  const handleAligerada = (e) => {
    const { name, value } = e.target;
    const val = name === 'tipoBloque' || name === 'dirNervios' ? value : parseFloat(value);
    setAligeradaConfig({ ...aligeradaConfig, [name]: val });
  };

  const handleSteelDeck = (e) => {
    const { name, value } = e.target;
    const val = name.startsWith('tipo') ? value : parseFloat(value);
    setSteelDeckConfig({ ...steelDeckConfig, [name]: val });
  };

  const handleMaciza = (e) => {
    setMacizaConfig({ ...macizaConfig, [e.target.name]: e.target.value });
  };

  // Cálculos
  const calc = useMemo(() => {
    const { filas, cols, luzX, luzY } = grid;
    const nTramosX = Math.max(cols - 1, 1);
    const nTramosY = Math.max(filas - 1, 1);
    const areaTotal = luzX * nTramosX * luzY * nTramosY;

    const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
    const esDosDirecciones = ratio <= 2;

    let resultado = {
      areaTotal,
      nTramosX,
      nTramosY,
      ratio,
      esDosDirecciones,
    };

    if (losaActiva === 'maciza') {
      resultado = { ...resultado, ...calcularLosaMaciza(grid, datos, macizaConfig, costos) };
    } else if (losaActiva === 'aligerada') {
      resultado = { ...resultado, ...calcularLosaLigera(grid, datos, aligeradaConfig, costos) };
    } else {
      resultado = { ...resultado, ...calcularLosaColaborante(grid, datos, steelDeckConfig, costos) };
    }

    return resultado;
  }, [grid, datos, costos, losaActiva, macizaConfig, aligeradaConfig, steelDeckConfig]);

  // Estilos
  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '24px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#7f8c8d',
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      flexWrap: 'wrap',
    },
    tab: (active) => ({
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: active ? '#3498db' : '#ecf0f1',
      color: active ? '#fff' : '#2c3e50',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    }),
    panel: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
    },
    sectionTitle: (color) => ({
      fontSize: '16px',
      fontWeight: '600',
      color: color || '#2c3e50',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: `2px solid ${color || '#2c3e50'}`,
    }),
    field: {
      marginBottom: '12px',
    },
    label: {
      fontSize: '13px',
      color: '#555',
      marginBottom: '4px',
      display: 'block',
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
    },
    highlightBox: {
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginTop: '12px',
      border: '1px solid #e0e0e0',
    },
    resultPanel: {
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
    },
    resultGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
    },
    resultBox: {
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
    },
    resultLabel: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '4px',
    },
    resultValue: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#2c3e50',
    },
    statusOk: {
      color: '#27ae60',
      fontWeight: 'bold',
    },
    statusFail: {
      color: '#e74c3c',
      fontWeight: 'bold',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Calculadora de Losas Estructurales</h1>
        <p style={styles.subtitle}>Diseño según ACI 318-19 y SDI para losas macizas, aligeradas y colaborantes</p>
      </div>

      <div style={styles.tabs}>
        <button
          style={styles.tab(losaActiva === 'maciza')}
          onClick={() => setLosaActiva('maciza')}
        >
          Losa Maciza
        </button>
        <button
          style={styles.tab(losaActiva === 'aligerada')}
          onClick={() => setLosaActiva('aligerada')}
        >
          Losa Aligerada
        </button>
        <button
          style={styles.tab(losaActiva === 'colaborante')}
          onClick={() => setLosaActiva('colaborante')}
        >
          Losa Colaborante (Steel Deck)
        </button>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#3498db')}>1. Retícula de Apoyos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Filas de apoyos</label>
            <input type="number" name="filas" value={grid.filas} onChange={handleGrid} min="1" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Columnas de apoyos</label>
            <input type="number" name="cols" value={grid.cols} onChange={handleGrid} min="1" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Luz X (m)</label>
            <input type="number" name="luzX" value={grid.luzX} onChange={handleGrid} step="0.1" min="1" style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Luz Y (m)</label>
            <input type="number" name="luzY" value={grid.luzY} onChange={handleGrid} step="0.1" min="1" style={styles.input} />
          </div>
        </div>
        <div style={styles.highlightBox}>
          <p><strong>Área total:</strong> {calc.areaTotal.toFixed(2)} m²</p>
          <p><strong>Ratio luces:</strong> {calc.ratio.toFixed(2)} {calc.esDosDirecciones ? '(Dos direcciones)' : '(Una dirección)'}</p>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#e67e22')}>2. Cargas y Materiales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Carga viva (kg/m²)</label>
            <input type="number" name="cv" value={datos.cv} onChange={handleDatos} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Carga muerta extra (kg/m²)</label>
            <input type="number" name="cmExtra" value={datos.cmExtra} onChange={handleDatos} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>f'c concreto (kg/cm²)</label>
            <input type="number" name="fc" value={datos.fc} onChange={handleDatos} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>fy acero (kg/cm²)</label>
            <input type="number" name="fy" value={datos.fy} onChange={handleDatos} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Recubrimiento (cm)</label>
            <input type="number" name="recubrimiento" value={datos.recubrimiento} onChange={handleDatos} step="0.5" style={styles.input} />
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#9b59b6')}>3. Configuración {losaActiva === 'maciza' ? 'Losa Maciza' : losaActiva === 'aligerada' ? 'Losa Aligerada' : 'Losa Colaborante'}</h3>
        {losaActiva === 'maciza' && (
          <LosaMaciza macizaConfig={macizaConfig} onConfigChange={handleMaciza} />
        )}
        {losaActiva === 'aligerada' && (
          <LosaLigera aligeradaConfig={aligeradaConfig} onConfigChange={handleAligerada} />
        )}
        {losaActiva === 'colaborante' && (
          <LosaColaborante steelDeckConfig={steelDeckConfig} onConfigChange={handleSteelDeck} />
        )}
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#27ae60')}>4. Costos Unitarios (USD)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Concreto ($/m³)</label>
            <input type="number" name="concretoM3" value={costos.concretoM3} onChange={handleCostos} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Acero refuerzo ($/kg)</label>
            <input type="number" name="aceroKg" value={costos.aceroKg} onChange={handleCostos} style={styles.input} />
          </div>
          {losaActiva === 'aligerada' && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Bloque Arcilla ($/und)</label>
                <input type="number" name="bloqueArcillaUnd" value={costos.bloqueArcillaUnd} onChange={handleCostos} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Bloque EPS ($/und)</label>
                <input type="number" name="bloqueEPSUnd" value={costos.bloqueEPSUnd} onChange={handleCostos} style={styles.input} />
              </div>
            </>
          )}
          {losaActiva === 'colaborante' && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Steel Deck ($/m²)</label>
                <input type="number" name="steelDeckM2" value={costos.steelDeckM2} onChange={handleCostos} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Malla ($/m²)</label>
                <input type="number" name="mallaM2" value={costos.mallaM2} onChange={handleCostos} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Correa acero ($/kg)</label>
                <input type="number" name="correaKg" value={costos.correaKg} onChange={handleCostos} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Viga principal ($/kg)</label>
                <input type="number" name="vigaPrincipalKg" value={costos.vigaPrincipalKg} onChange={handleCostos} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Stud conector ($/und)</label>
                <input type="number" name="studUnd" value={costos.studUnd} onChange={handleCostos} style={styles.input} />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={styles.resultPanel}>
        <h3 style={styles.sectionTitle('#2c3e50')}>5. Resultados</h3>
        <div style={styles.resultGrid}>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Espesor total (h)</div>
            <div style={styles.resultValue}>{calc.h} cm</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Peso propio</div>
            <div style={styles.resultValue}>{calc.pesoPropio} kg/m²</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Carga última (wu)</div>
            <div style={styles.resultValue}>{calc.wu} kg/m²</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Volumen concreto</div>
            <div style={styles.resultValue}>{calc.volConcreto} m³</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Acero total</div>
            <div style={styles.resultValue}>{calc.kgAcero} kg</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Costo total</div>
            <div style={styles.resultValue}>${calc.costoTotal}</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Costo por m²</div>
            <div style={styles.resultValue}>${calc.costoM2}</div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Cortante</div>
            <div style={styles.resultValue} className={calc.cumpleCortante ? styles.statusOk : styles.statusFail}>
              {calc.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Espesor mínimo</div>
            <div style={styles.resultValue} className={calc.cumpleEspesor ? styles.statusOk : styles.statusFail}>
              {calc.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>
          {losaActiva === 'aligerada' && (
            <div style={styles.resultBox}>
              <div style={styles.resultLabel}>Número de bloques</div>
              <div style={styles.resultValue}>{calc.numBloques}</div>
            </div>
          )}
          {losaActiva === 'colaborante' && (
            <div style={styles.resultBox}>
              <div style={styles.resultLabel}>Total studs</div>
              <div style={styles.resultValue}>{calc.numBloques}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculadoraLosas;
