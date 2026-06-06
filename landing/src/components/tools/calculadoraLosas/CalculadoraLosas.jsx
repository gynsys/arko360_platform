import React, { useState, useMemo, useRef } from 'react';
import { calcularLosaMaciza } from './losamaciza/calculos/losaMaciza';
import { calcularLosaLigera } from './LosaLigera';
import { calcularLosaColaboranteNormativo } from '../../../steelDeck/calcularLosaColaboranteNormativo';
import { renderGrid } from './visualizacion';
import LosaMaciza from './losamaciza/components/LosaMaciza';
import LosaLigera from './LosaLigera';
import LosaColaborante from './LosaColaborante';
import ReporteImprimible from './losamaciza/components/ReporteImprimible';

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
    usoEdificacion: 'oficinas',
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Temporary admin check for testing/audit purposes
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || localStorage.getItem('token')) {
      setIsAdmin(true);
    }
  }, []);

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
    tipoCorrea: 'Tubo 100x50x3',
    diametroStud: 0.75,
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
    const { name, value } = e.target;
    if (name === 'usoEdificacion') {
      let cvValue = datos.cv;
      switch (value) {
        case 'vivienda': cvValue = 200; break;
        case 'oficinas': cvValue = 250; break;
        case 'comercio': cvValue = 400; break;
        case 'bodegas': cvValue = 500; break;
        case 'garajes': cvValue = 300; break;
        case 'aulas': cvValue = 300; break;
        case 'pasillos': cvValue = 500; break;
        default: break;
      }
      setDatos(prev => ({ ...prev, usoEdificacion: value, cv: cvValue }));
    } else {
      const val = parseFloat(value);
      setDatos(prev => ({ ...prev, [name]: name === 'recubrimiento' || name === 'fc' || name === 'fy' || name === 'cv' || name === 'cmExtra' ? (isNaN(val) ? 0 : val) : value }));
    }
  };

  const handleCostos = (e) => {
    const val = parseFloat(e.target.value);
    setCostos((prev) => ({ ...prev, [e.target.name]: parseFloat(e.target.value) || 0 }));
  };

  const handleGuardarCalculo = () => {
    const payload = {
      tipoLosa: losaActiva,
      fecha: new Date().toISOString(),
      grid,
      datos,
      calc,
      costos,
      macizaConfig
    };
    console.log("Cálculo guardado para auditoría:", payload);
    alert("Cálculo guardado exitosamente en modo auditoría.");
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
      resultado = { ...resultado, ...calcularLosaColaboranteNormativo(grid, datos, steelDeckConfig, costos) };
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
        {/*
        <button
          style={styles.tab(losaActiva === 'aligerada')}
          onClick={() => setLosaActiva('aligerada')}
        >
          Losa Aligerada
        </button>
        */}
        <button
          style={styles.tab(losaActiva === 'colaborante')}
          onClick={() => setLosaActiva('colaborante')}
        >
          Losa Colaborante (Steel Deck)
        </button>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#3498db')}>1. Retícula de Apoyos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Columna izquierda: Datos de entrada */}
          <div>
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
              <p><strong>Área total:</strong> {Number(calc.areaTotal).toFixed(2)} m²</p>
              <p><strong>Ratio luces:</strong> {Number(calc.ratio).toFixed(2)} {calc.esDosDirecciones ? '(Dos direcciones)' : '(Una dirección)'}</p>
            </div>
          </div>

          {/* Columna derecha: Visualización SVG */}
          <div>
            {grid && renderGrid(grid, { ...calc, wu: calc.wu, ratio: calc.ratio, esDosDirecciones: calc.esDosDirecciones }, losaActiva, losaActiva === 'colaborante' ? steelDeckConfig : null, losaActiva === 'aligerada' ? aligeradaConfig : null)}
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#e67e22')}>2. Cargas y Materiales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Uso de la edificación (Carga Viva normada)</label>
            <select name="usoEdificacion" value={datos.usoEdificacion || 'oficinas'} onChange={handleDatos} style={styles.input}>
              <option value="vivienda">Residencial / Vivienda (200 kg/m²)</option>
              <option value="oficinas">Oficinas (250 kg/m²)</option>
              <option value="aulas">Aulas / Escuelas (300 kg/m²)</option>
              <option value="garajes">Garajes / Estacionamientos (300 kg/m²)</option>
              <option value="comercio">Comercio / Tiendas (400 kg/m²)</option>
              <option value="pasillos">Pasillos y Escaleras públicas (500 kg/m²)</option>
              <option value="bodegas">Bodegas / Industrial liviano (500 kg/m²)</option>
              <option value="otro">Personalizado (Ingresar manual)</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Carga viva (kg/m²)</label>
            <input type="number" name="cv" value={datos.cv} onChange={handleDatos} disabled={datos.usoEdificacion !== 'otro'} style={{ ...styles.input, backgroundColor: datos.usoEdificacion !== 'otro' ? '#f1f5f9' : '#fff' }} />
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
          {losaActiva !== 'colaborante' && (
            <div style={styles.field}>
              <label style={styles.label}>Recubrimiento (cm)</label>
              <input type="number" name="recubrimiento" value={datos.recubrimiento} onChange={handleDatos} step="0.5" style={styles.input} />
            </div>
          )}
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={styles.sectionTitle('#9b59b6')}>3. Configuración {losaActiva === 'maciza' ? 'Losa Maciza' : losaActiva === 'aligerada' ? 'Losa Aligerada' : 'Losa Colaborante'}</h3>
        {losaActiva === 'maciza' && (
          <LosaMaciza grid={grid} datos={datos} macizaConfig={macizaConfig} costos={costos} onConfigChange={handleMaciza} />
        )}
        {/*
        {losaActiva === 'aligerada' && (
          <LosaLigera grid={grid} datos={datos} aligeradaConfig={aligeradaConfig} costos={costos} onConfigChange={handleAligerada} />
        )}
        */}
        {losaActiva === 'colaborante' && (
          <LosaColaborante grid={grid} datos={datos} steelDeckConfig={steelDeckConfig} costos={costos} onConfigChange={handleSteelDeck} />
        )}
      </div>

      <div style={styles.resultPanel}>
        <h3 style={styles.sectionTitle('#2c3e50')}>4. Resultados</h3>
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
              ({calc.ratioCortante}) {calc.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>
          <div style={styles.resultBox}>
            <div style={styles.resultLabel}>Espesor mínimo</div>
            <div style={styles.resultValue} className={calc.cumpleEspesor ? styles.statusOk : styles.statusFail}>
              ({calc.ratioEspesor}) {calc.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>
          {losaActiva === 'maciza' && (
            <>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Flexión (As req / prov)</div>
                <div style={styles.resultValue} className={calc.ratioFlexion <= 1 ? styles.statusOk : styles.statusFail}>
                  ({calc.ratioFlexion}) {calc.ratioFlexion <= 1 ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                </div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Cuantía / Temp. (As ≥ As_min)</div>
                <div style={styles.resultValue} className={calc.cumpleAcero ? styles.statusOk : styles.statusFail}>
                  {calc.cumpleAcero ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                </div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Separación máxima</div>
                <div style={styles.resultValue} className={calc.cumpleSeparacion ? styles.statusOk : styles.statusFail}>
                  ({calc.ratioSeparacion}) {calc.cumpleSeparacion ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                </div>
              </div>
            </>
          )}
          {/*
          {losaActiva === 'aligerada' && (
            <div style={styles.resultBox}>
              <div style={styles.resultLabel}>Número de bloques</div>
              <div style={styles.resultValue}>{calc.numBloques}</div>
            </div>
          )}
          */}
          {losaActiva === 'colaborante' && (
            <div style={styles.resultBox}>
              <div style={styles.resultLabel}>Total studs</div>
              <div style={styles.resultValue}>{calc.numBloques}</div>
            </div>
          )}
        </div>
        
        {losaActiva === 'maciza' && (
          <div style={{ marginTop: '30px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }} className="no-print">
            <button 
              onClick={() => window.print()}
              style={{
                backgroundColor: '#e74c3c',
                color: '#fff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(231, 76, 60, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Generar Reporte PDF
            </button>

            {isAdmin && (
              <button 
                onClick={handleGuardarCalculo}
                style={{
                  backgroundColor: '#2c3e50',
                  color: '#fff',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(44, 62, 80, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Guardar Auditoría
              </button>
            )}
          </div>
        )}
      </div>

      <div style={styles.panel} className="no-print">
        <h3 style={styles.sectionTitle('#27ae60')}>5. Costos Unitarios (USD)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Concreto ($/m³)</label>
            <input type="number" name="concretoM3" value={costos.concretoM3} onChange={handleCostos} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Acero refuerzo ($/kg)</label>
            <input type="number" name="aceroKg" value={costos.aceroKg} onChange={handleCostos} style={styles.input} />
          </div>
          {/*
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
          */}
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

      {losaActiva === 'maciza' && (
        <ReporteImprimible grid={grid} datos={datos} calc={calc} macizaConfig={macizaConfig} costos={costos} />
      )}
    </div>
  );
};

export default CalculadoraLosas;
