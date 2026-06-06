import React from 'react';

const ReporteImprimible = ({ grid, datos, calc, macizaConfig, costos }) => {
  if (!calc || !grid) return null;

  const hoy = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div id="pdf-report" className="print-only" style={{ padding: '40px', fontFamily: 'sans-serif', color: '#000' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #2c3e50', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '24px' }}>Memoria de Cálculo Estructural</h1>
        <h2 style={{ margin: '10px 0 0', color: '#7f8c8d', fontSize: '18px' }}>Diseño de Losa Maciza (ACI 318)</h2>
        <p style={{ margin: '10px 0 0', fontSize: '14px' }}>Fecha: {hoy}</p>
      </div>

      <div style={{ display: 'flex', gap: '40px', marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ borderBottom: '1px solid #bdc3c7', paddingBottom: '5px' }}>Geometría y Materiales</h3>
          <p><strong>Luz X:</strong> {grid.luzX} m</p>
          <p><strong>Luz Y:</strong> {grid.luzY} m</p>
          <p><strong>Filas x Cols:</strong> {grid.filas} x {grid.cols}</p>
          <p><strong>Área Total / Encofrado:</strong> {calc.areaTotal} m²</p>
          <p><strong>Espesor Diseño (h):</strong> {calc.h} cm</p>
          <p><strong>f'c Concreto:</strong> {datos.fc} kg/cm²</p>
          <p><strong>fy Acero:</strong> {datos.fy} kg/cm²</p>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ borderBottom: '1px solid #bdc3c7', paddingBottom: '5px' }}>Cargas y Verificaciones</h3>
          <p><strong>Carga Viva:</strong> {datos.cv} kg/m²</p>
          <p><strong>Carga Muerta (Extra):</strong> {datos.cmExtra} kg/m²</p>
          <p><strong>Carga Última (wu):</strong> {calc.wu} kg/m²</p>
          <p><strong>Cortante vuMax:</strong> {calc.vuMax} kN ({calc.ratioCortante}) - {calc.cumpleCortante ? '✅ CUMPLE' : '❌ FALLA'}</p>
          <p><strong>Deflexión Máxima:</strong> {calc.deflexion} mm ({calc.ratioDeflexion}) - {calc.cumpleDeflexion ? '✅ CUMPLE' : '❌ FALLA'}</p>
          <p><strong>Flexión As_req vs As_prov:</strong> ({calc.ratioFlexion}) - {calc.ratioFlexion <= 1 ? '✅ CUMPLE' : '❌ FALLA'}</p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ borderBottom: '1px solid #bdc3c7', paddingBottom: '5px' }}>Despiece de Acero (Metrado)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ecf0f1' }}>
              <th style={thStyle}>Posición / Sentido</th>
              <th style={thStyle}>Diámetro</th>
              <th style={thStyle}>Separación</th>
              <th style={thStyle}>Cantidad (Cabillas)</th>
              <th style={thStyle}>Peso Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Fondo (Positivo) - Paralelo a X</td>
              <td style={tdStyle}>{macizaConfig.diametroPosX}"</td>
              <td style={tdStyle}>{calc.metradoX?.posSep} cm</td>
              <td style={tdStyle}>{calc.metradoX?.posCant}</td>
              <td style={tdStyle}>{calc.metradoX?.posPeso} kg</td>
            </tr>
            <tr>
              <td style={tdStyle}>Apoyos (Negativo) - Paralelo a X</td>
              <td style={tdStyle}>{macizaConfig.diametroNegX}"</td>
              <td style={tdStyle}>{calc.metradoX?.negSep} cm</td>
              <td style={tdStyle}>{calc.metradoX?.negCant}</td>
              <td style={tdStyle}>{calc.metradoX?.negPeso} kg</td>
            </tr>
            {calc.esDosDirecciones && (
              <>
                <tr>
                  <td style={tdStyle}>Fondo (Positivo) - Paralelo a Y</td>
                  <td style={tdStyle}>{macizaConfig.diametroPosY}"</td>
                  <td style={tdStyle}>{calc.metradoY?.posSep} cm</td>
                  <td style={tdStyle}>{calc.metradoY?.posCant}</td>
                  <td style={tdStyle}>{calc.metradoY?.posPeso} kg</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Apoyos (Negativo) - Paralelo a Y</td>
                  <td style={tdStyle}>{macizaConfig.diametroNegY}"</td>
                  <td style={tdStyle}>{calc.metradoY?.negSep} cm</td>
                  <td style={tdStyle}>{calc.metradoY?.negCant}</td>
                  <td style={tdStyle}>{calc.metradoY?.negPeso} kg</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        <p style={{ textAlign: 'right', marginTop: '10px' }}><strong>Total Acero de Refuerzo:</strong> {calc.kgAcero} kg</p>
      </div>

      <div>
        <h3 style={{ borderBottom: '1px solid #bdc3c7', paddingBottom: '5px' }}>Cantidades de Obra y Costos (Estimado)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ecf0f1' }}>
              <th style={thStyle}>Partida</th>
              <th style={thStyle}>Cantidad</th>
              <th style={thStyle}>Precio Unitario</th>
              <th style={thStyle}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Concreto (f'c {datos.fc})</td>
              <td style={tdStyle}>{calc.volConcreto} m³</td>
              <td style={tdStyle}>${costos.concretoM3}/m³</td>
              <td style={tdStyle}>${(parseFloat(calc.volConcreto) * costos.concretoM3).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={tdStyle}>Acero de Refuerzo (fy {datos.fy})</td>
              <td style={tdStyle}>{calc.kgAcero} kg</td>
              <td style={tdStyle}>${costos.aceroKg}/kg</td>
              <td style={tdStyle}>${(parseFloat(calc.kgAcero) * costos.aceroKg).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>TOTAL MATERIALES</strong></td>
              <td colSpan="2" style={tdStyle}></td>
              <td style={tdStyle}><strong>${calc.costoTotal}</strong></td>
            </tr>
          </tbody>
        </table>
        <p style={{ textAlign: 'right', marginTop: '10px', fontSize: '18px', color: '#2c3e50' }}>
          <strong>Costo por m²:</strong> ${calc.costoM2} / m²
        </p>
      </div>
      
      <div style={{ marginTop: '50px', fontSize: '12px', color: '#7f8c8d', textAlign: 'center', borderTop: '1px solid #ecf0f1', paddingTop: '20px' }}>
        Reporte generado automáticamente por la Calculadora Estructural de Arko 360. Los resultados son una estimación basada en los parámetros ingresados y no sustituyen el criterio de un ingeniero estructurista.
      </div>
    </div>
  );
};

const thStyle = { padding: '10px', border: '1px solid #bdc3c7', textAlign: 'left', fontSize: '14px' };
const tdStyle = { padding: '10px', border: '1px solid #bdc3c7', fontSize: '14px' };

export default ReporteImprimible;
