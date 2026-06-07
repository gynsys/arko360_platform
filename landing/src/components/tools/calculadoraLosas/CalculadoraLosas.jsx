import React, { useState, useMemo, useRef, useEffect } from 'react';
import { calcularLosaMaciza } from './losamaciza/calculos/losaMaciza';
import { calcularLosaLigera } from './LosaLigera';
import { calcularLosaColaboranteNormativo } from '../../../steelDeck/calcularLosaColaboranteNormativo';
import { renderGrid } from './visualizacion';
import LosaMaciza from './losamaciza/components/LosaMaciza';
import LosaLigera from './LosaLigera';
import LosaColaborante from './LosaColaborante';
import ReporteImprimible from './losamaciza/components/ReporteImprimible';
import HistorialCorridas from './HistorialCorridas';
import { calculadoraService } from '../../../services/calculadoraService';
import { FaHistory, FaCloudUploadAlt, FaFileCode } from 'react-icons/fa';

const CalculadoraLosas = () => {
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [grid, setGrid] = useState({
    filas: 2,
    cols: 3,
    luzX: 4.5,
    luzY: 4.0,
    aberturas: [],
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
    const finalVal = isNaN(val) || val <= 0 ? 1 : val;
    
    setGrid(prev => {
      const next = { ...prev, [name]: finalVal };
      const nTramosX = Math.max(Math.floor(next.cols) - 1, 1);
      const nTramosY = Math.max(Math.floor(next.filas) - 1, 1);
      
      // Ajustar lucesX
      if (name === 'cols' || name === 'luzX') {
        const arrX = [];
        for (let i = 0; i < nTramosX; i++) {
          arrX.push(name === 'luzX' ? finalVal : (prev.lucesX?.[i] || next.luzX));
        }
        next.lucesX = arrX;
      }
      
      // Ajustar lucesY
      if (name === 'filas' || name === 'luzY') {
        const arrY = [];
        for (let i = 0; i < nTramosY; i++) {
          arrY.push(name === 'luzY' ? finalVal : (prev.lucesY?.[i] || next.luzY));
        }
        next.lucesY = arrY;
      }

      // Ajustar celdas
      if (name === 'cols' || name === 'filas') {
        const oldCeldas = prev.celdas || [];
        const newCeldas = [];
        for (let r = 0; r < nTramosY; r++) {
          for (let c = 0; c < nTramosX; c++) {
            const ext = oldCeldas.find(x => x.r === r && x.c === c);
            newCeldas.push(ext || { r, c, tipo: 'lleno' });
          }
        }
        next.celdas = newCeldas;
      }
      
      return next;
    });
  };

  const handleCeldasToggle = (r, c) => {
    setGrid(prev => {
      const newCeldas = prev.celdas.map(celda => {
        if (celda.r === r && celda.c === c) {
          return { ...celda, tipo: celda.tipo === 'lleno' ? 'vacio' : 'lleno' };
        }
        return celda;
      });
      return { ...prev, celdas: newCeldas };
    });
  };

  const handleLuzChange = (e, index, isX) => {
    const val = parseFloat(e.target.value) || 1;
    setGrid(prev => {
      if (isX) {
        const newArr = [...(prev.lucesX || [])];
        newArr[index] = val;
        return { ...prev, lucesX: newArr };
      } else {
        const newArr = [...(prev.lucesY || [])];
        newArr[index] = val;
        return { ...prev, lucesY: newArr };
      }
    });
  };

  const handleAddAbertura = () => {
    setGrid(prev => ({
      ...prev,
      aberturas: [
        ...(prev.aberturas || []),
        { id: Date.now().toString(), tipo: 'hueco', x: 0, y: 0, w: 1, h: 1, orientacion: 'top_left' }
      ]
    }));
  };

  const handleUpdateAbertura = (id, field, value) => {
    setGrid(prev => ({
      ...prev,
      aberturas: prev.aberturas.map(ab => ab.id === id ? { ...ab, [field]: value } : ab)
    }));
  };

  const handleRemoveAbertura = (id) => {
    setGrid(prev => ({
      ...prev,
      aberturas: prev.aberturas.filter(ab => ab.id !== id)
    }));
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

  const handleGuardarCalculo = (guardarEnNube = false) => {
    const formulasAuditoria = {
      h_min: "Luz mayor / 20 (m)",
      h_diseno: "max(h_min, 0.10m)",
      pesoPropio: "h * Densidad Concreto (2400 kg/m³) [kg/m²]",
      wu: "1.2 * (pesoPropio + cmExtra) + 1.6 * cv [kg/m²]",
      wServicio: "pesoPropio + cmExtra + cv [kg/m²]",
      vuMax: "(wu * luzMayor / 2) [kg] * 9.81 / 1000 [kN]",
      Vc: "0.53 * sqrt(fc en MPa) * b * d [N] -> kN",
      phiVc: "0.75 * Vc [kN]",
      ratioCortante: "vuMax / phiVc",
      As_min: "0.0018 * b * d [mm²]",
      As_req: "rho * b * d (Fórmula flexión ACI con Ru y beta1) [mm²]",
      deflexion: "5 * wServicio * L^4 / (384 * Ec * Ig) [mm]",
      limiteDeflexion: "L / 360 [mm]",
      costoTotal: "(volConcreto * costoConcreto) + (kgAcero * costoAcero) [USD]"
    };

    const payload = {
      tipoLosa: losaActiva,
      fecha: new Date().toISOString(),
      grid: {
        ...grid,
        lucesX: grid.lucesX || Array(Math.max(Math.floor(grid.cols) - 1, 1)).fill(grid.luzX),
        lucesY: grid.lucesY || Array(Math.max(Math.floor(grid.filas) - 1, 1)).fill(grid.luzY),
      },
      datos,
      costos,
      macizaConfig,
      steelDeckConfig,
      aligeradaConfig,
      auditoriaMetodologia: {
        norma: "ACI 318-19",
        unidades: {
          geometria: "m",
          cargas: "kg/m²",
          fuerzas: "kN",
          momentos: "kg.m/m",
          esfuerzos: "MPa y kg/cm²",
          acero: "mm²",
          deflexion: "mm"
        },
        formulas: formulasAuditoria
      },
      calc
    };

    if (guardarEnNube) {
      if (isSaving) return;
      const nombre = prompt('Ingresa un nombre para guardar esta corrida:', `Losa ${losaActiva} - ${new Date().toLocaleDateString()}`);
      if (!nombre) return;
      
      setIsSaving(true);
      calculadoraService.guardarCorrida(nombre, losaActiva, payload)
        .then(() => {
          alert('¡Corrida guardada exitosamente en la nube!');
        })
        .catch(err => {
          alert('Error al guardar en la nube.');
          console.error(err);
        })
        .finally(() => {
          setIsSaving(false);
        });
      return;
    }
    
    // Crear un archivo JSON descargable ("Guardar como")
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `auditoria_losa_${losaActiva}_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    downloadAnchorNode.remove();
    
    alert("Cálculo exportado exitosamente en modo auditoría.");
  };

  const cargarDesdeHistorial = (run) => {
    setLosaActiva(run.tipo_losa);
    if (run.inputs) {
      if (run.inputs.grid) setGrid(run.inputs.grid);
      if (run.inputs.datos) setDatos(run.inputs.datos);
      if (run.inputs.costos) setCostos(run.inputs.costos);
      if (run.inputs.macizaConfig) setMacizaConfig(run.inputs.macizaConfig);
      if (run.inputs.steelDeckConfig) setSteelDeckConfig(run.inputs.steelDeckConfig);
      if (run.inputs.aligeradaConfig) setAligeradaConfig(run.inputs.aligeradaConfig);
    }
    setMostrarHistorial(false);
    alert(`Se ha cargado la corrida: ${run.nombre_proyecto}`);
  };

  const exportarPDFMaciza = () => {
    if (!calc || !grid) return;
    const w = window.open('', '_blank');
    
    const hoy = new Date().toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const metradoYHtml = calc.esDosDirecciones ? `
      <tr>
        <td>Fondo (Positivo) - Paralelo a Y</td>
        <td>${macizaConfig.diametroPosY}"</td>
        <td>${calc.metradoY?.posSep ? (calc.metradoY.posSep * 100).toFixed(1) : '-'} cm</td>
        <td>${calc.metradoY?.posCant}</td>
        <td>${calc.metradoY?.posPeso} kg</td>
      </tr>
      <tr>
        <td>Apoyos (Negativo) - Paralelo a Y</td>
        <td>${macizaConfig.diametroNegY}"</td>
        <td>${calc.metradoY?.negSep ? (calc.metradoY.negSep * 100).toFixed(1) : '-'} cm</td>
        <td>${calc.metradoY?.negCant}</td>
        <td>${calc.metradoY?.negPeso} kg</td>
      </tr>
    ` : '';

    w.document.write(`
      <html>
        <head>
          <title>Memoria de Cálculo - Losa Maciza</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            h1 { color: #2c3e50; font-size: 24px; margin: 0; }
            h2 { color: #7f8c8d; font-size: 18px; margin: 10px 0 0; }
            h3 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
            th, td { border: 1px solid #bdc3c7; padding: 10px; text-align: left; }
            th { background-color: #ecf0f1; }
            .badge-ok { color: #27ae60; font-weight: bold; }
            .badge-fail { color: #c0392b; font-weight: bold; }
            .header-section { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
            .flex-container { display: flex; gap: 40px; margin-bottom: 30px; }
            .flex-child { flex: 1; }
            .footer { margin-top: 50px; font-size: 12px; color: #7f8c8d; text-align: center; border-top: 1px solid #ecf0f1; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header-section">
            <h1>Memoria de Cálculo Estructural</h1>
            <h2>Diseño de Losa Maciza (ACI 318)</h2>
            <p>Fecha: ${hoy}</p>
          </div>

          <div class="flex-container">
            <div class="flex-child">
              <h3>Geometría y Materiales</h3>
              <p><strong>Luz X:</strong> ${grid.luzX} m</p>
              <p><strong>Luz Y:</strong> ${grid.luzY} m</p>
              <p><strong>Filas x Cols:</strong> ${grid.filas} x ${grid.cols}</p>
              <p><strong>Área Total / Encofrado:</strong> ${calc.areaTotal} m²</p>
              <p><strong>Espesor Diseño (h):</strong> ${calc.h} cm</p>
              <p><strong>f'c Concreto:</strong> ${datos.fc} kg/cm²</p>
              <p><strong>fy Acero:</strong> ${datos.fy} kg/cm²</p>
            </div>
            <div class="flex-child">
              <h3>Cargas y Verificaciones</h3>
              <p><strong>Carga Viva:</strong> ${datos.cv} kg/m²</p>
              <p><strong>Carga Muerta (Extra):</strong> ${datos.cmExtra} kg/m²</p>
              <p><strong>Carga Última (wu):</strong> ${calc.wu} kg/m²</p>
              <p><strong>Cortante vuMax:</strong> ${calc.vuMax} kN (${calc.ratioCortante}) - <span class="${calc.cumpleCortante ? 'badge-ok' : 'badge-fail'}">${calc.cumpleCortante ? 'CUMPLE' : 'FALLA'}</span></p>
              <p><strong>Deflexión Máxima:</strong> ${calc.deflexion} mm (${calc.ratioDeflexion}) - <span class="${calc.cumpleDeflexion ? 'badge-ok' : 'badge-fail'}">${calc.cumpleDeflexion ? 'CUMPLE' : 'FALLA'}</span></p>
              <p><strong>Flexión As_req vs As_prov:</strong> (${calc.ratioFlexion}) - <span class="${calc.ratioFlexion <= 1 ? 'badge-ok' : 'badge-fail'}">${calc.ratioFlexion <= 1 ? 'CUMPLE' : 'FALLA'}</span></p>
            </div>
          </div>

          <div>
            <h3>Despiece de Acero (Metrado)</h3>
            <table>
              <thead>
                <tr>
                  <th>Posición / Sentido</th>
                  <th>Diámetro</th>
                  <th>Separación</th>
                  <th>Cantidad (Cabillas)</th>
                  <th>Peso Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fondo (Positivo) - Paralelo a X</td>
                  <td>${macizaConfig.diametroPosX}"</td>
                  <td>${calc.metradoX?.posSep ? (calc.metradoX.posSep * 100).toFixed(1) : '-'} cm</td>
                  <td>${calc.metradoX?.posCant}</td>
                  <td>${calc.metradoX?.posPeso} kg</td>
                </tr>
                <tr>
                  <td>Apoyos (Negativo) - Paralelo a X</td>
                  <td>${macizaConfig.diametroNegX}"</td>
                  <td>${calc.metradoX?.negSep ? (calc.metradoX.negSep * 100).toFixed(1) : '-'} cm</td>
                  <td>${calc.metradoX?.negCant}</td>
                  <td>${calc.metradoX?.negPeso} kg</td>
                </tr>
                ${metradoYHtml}
              </tbody>
            </table>
            <p style="text-align: right; margin-top: 10px;"><strong>Total Acero de Refuerzo:</strong> ${calc.kgAcero} kg</p>
          </div>

          <div>
            <h3>Cantidades de Obra y Costos (Estimado)</h3>
            <table>
              <thead>
                <tr>
                  <th>Partida</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Concreto (f'c ${datos.fc})</td>
                  <td>${calc.volConcreto} m³</td>
                  <td>$${costos.concretoM3}/m³</td>
                  <td>$${(parseFloat(calc.volConcreto) * costos.concretoM3).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Acero de Refuerzo (fy ${datos.fy})</td>
                  <td>${calc.kgAcero} kg</td>
                  <td>$${costos.aceroKg}/kg</td>
                  <td>$${(parseFloat(calc.kgAcero) * costos.aceroKg).toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>TOTAL MATERIALES</strong></td>
                  <td colspan="2"></td>
                  <td><strong>$${calc.costoTotal}</strong></td>
                </tr>
              </tbody>
            </table>
            <p style="text-align: right; margin-top: 10px; font-size: 18px; color: #2c3e50;">
              <strong>Costo por m²:</strong> $${calc.costoM2} / m²
            </p>
          </div>
          
          <div class="footer">
            Reporte generado automáticamente por la Calculadora Estructural de Arko 360. Los resultados son una estimación basada en los parámetros ingresados y no sustituyen el criterio de un ingeniero estructurista.
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
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
    const nTramosX = Math.max(Math.floor(cols) - 1, 1);
    const nTramosY = Math.max(Math.floor(filas) - 1, 1);
    
    const arrX = grid.lucesX || Array(nTramosX).fill(luzX || 4.5);
    const arrY = grid.lucesY || Array(nTramosY).fill(luzY || 4.0);
    const L_totalX = arrX.slice(0, nTramosX).reduce((a, b) => a + b, 0);
    const L_totalY = arrY.slice(0, nTramosY).reduce((a, b) => a + b, 0);
    
    const maxLuzX = Math.max(...arrX.slice(0, nTramosX));
    const maxLuzY = Math.max(...arrY.slice(0, nTramosY));

    const areaTotal = L_totalX * L_totalY;
    const ratio = Math.max(maxLuzX, maxLuzY) / Math.min(maxLuzX, maxLuzY);
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
        <p style={styles.subtitle}>Diseño y dimensionamiento normativo de sistemas de entrepiso</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={() => setMostrarHistorial(true)} style={{ ...styles.tab(false), backgroundColor: '#f39c12', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaHistory /> Abrir Historial
          </button>
          <button onClick={() => handleGuardarCalculo(true)} style={{ ...styles.tab(false), backgroundColor: '#27ae60', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaCloudUploadAlt /> {isSaving ? 'Guardando...' : 'Guardar en la nube'}
          </button>
          <button onClick={() => handleGuardarCalculo(false)} style={{ ...styles.tab(false), backgroundColor: '#8e44ad', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaFileCode /> JSON Auditoría
          </button>
        </div>
      </div>

      {mostrarHistorial && (
        <HistorialCorridas 
          onCargarCorrida={cargarDesdeHistorial} 
          onClose={() => setMostrarHistorial(false)} 
        />
      )}

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
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={styles.label}>Luces horizontales (X) por tramo (m)</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {(grid.lucesX || Array(Math.max(1, Math.floor(grid.cols) - 1)).fill(grid.luzX || 4.5)).map((lx, i) => (
                  <input 
                    key={`lx-${i}`} type="number" value={lx} 
                    onChange={e => handleLuzChange(e, i, true)} 
                    step="0.1" min="0.1" style={{ ...styles.input, width: '70px', flexShrink: 0 }} 
                    title={`Tramo X ${i+1}`}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <label style={styles.label}>Luces verticales (Y) por tramo (m)</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {(grid.lucesY || Array(Math.max(1, Math.floor(grid.filas) - 1)).fill(grid.luzY || 4.0)).map((ly, i) => (
                  <input 
                    key={`ly-${i}`} type="number" value={ly} 
                    onChange={e => handleLuzChange(e, i, false)} 
                    step="0.1" min="0.1" style={{ ...styles.input, width: '70px', flexShrink: 0 }} 
                    title={`Tramo Y ${i+1}`}
                  />
                ))}
              </div>
            </div>
            <div style={styles.highlightBox}>
              <p><strong>Área total:</strong> {Number(calc.areaTotal).toFixed(2)} m²</p>
              <p><strong>Ratio luces:</strong> {Number(calc.ratio).toFixed(2)} {calc.esDosDirecciones ? '(Dos direcciones)' : '(Una dirección)'}</p>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: '#34495e', marginBottom: '10px' }}>Aberturas y Escaleras Internas</h4>
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>Define huecos o escaleras exactas (X, Y desde la esquina superior izquierda).</p>
              {grid.aberturas?.map((ab, idx) => (
                <div key={ab.id} style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', marginBottom: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>Abertura {idx + 1}</span>
                    <button onClick={() => handleRemoveAbertura(ab.id)} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✖ Eliminar</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <select value={ab.tipo} onChange={(e) => handleUpdateAbertura(ab.id, 'tipo', e.target.value)} style={{ ...styles.input, gridColumn: 'span 2' }}>
                      <option value="hueco">Hueco / Vacío Libre</option>
                      <option value="escalera_recta">Escalera Recta</option>
                      <option value="escalera_l">Escalera en L</option>
                    </select>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666' }}>Pos X (m):</label>
                      <input type="number" step="0.1" value={ab.x} onChange={e => handleUpdateAbertura(ab.id, 'x', parseFloat(e.target.value)||0)} style={styles.input} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666' }}>Pos Y (m):</label>
                      <input type="number" step="0.1" value={ab.y} onChange={e => handleUpdateAbertura(ab.id, 'y', parseFloat(e.target.value)||0)} style={styles.input} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666' }}>Ancho (m):</label>
                      <input type="number" step="0.1" value={ab.w} onChange={e => handleUpdateAbertura(ab.id, 'w', parseFloat(e.target.value)||0.1)} style={styles.input} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666' }}>Largo (m):</label>
                      <input type="number" step="0.1" value={ab.h} onChange={e => handleUpdateAbertura(ab.id, 'h', parseFloat(e.target.value)||0.1)} style={styles.input} />
                    </div>
                    {ab.tipo === 'escalera_l' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '11px', color: '#666' }}>Ubicación del descanso (Vértice):</label>
                        <select value={ab.orientacion || 'top_left'} onChange={e => handleUpdateAbertura(ab.id, 'orientacion', e.target.value)} style={styles.input}>
                          <option value="top_left">Superior Izquierdo</option>
                          <option value="top_right">Superior Derecho</option>
                          <option value="bottom_left">Inferior Izquierdo</option>
                          <option value="bottom_right">Inferior Derecho</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={handleAddAbertura} style={{ width: '100%', padding: '8px', backgroundColor: '#ecf0f1', color: '#2c3e50', border: '1px dashed #bdc3c7', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Añadir Abertura Exacta
              </button>
            </div>
          </div>

          {/* Columna derecha: Visualización SVG */}
          <div>
            <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px', fontStyle: 'italic' }}>
              * Haz clic en una celda perimetral para vaciarla y crear losas irregulares (ej. forma de "L").
            </p>
            {grid && renderGrid(grid, { ...calc, wu: calc.wu, ratio: calc.ratio, esDosDirecciones: calc.esDosDirecciones }, losaActiva, losaActiva === 'colaborante' ? steelDeckConfig : null, losaActiva === 'aligerada' ? aligeradaConfig : null, handleCeldasToggle)}
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
              onClick={exportarPDFMaciza}
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

    </div>
  );
};

export default CalculadoraLosas;
