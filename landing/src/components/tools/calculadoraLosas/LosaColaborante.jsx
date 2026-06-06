import React, { useState, useMemo, useEffect } from "react";
import { RefreshCw, Save, FileDown, CheckCircle, XCircle, AlertTriangle, Info, Plus, Trash2, ArrowRight } from "lucide-react";
import { calcularLosaColaboranteNormativo } from "../../../steelDeck/calcularLosaColaboranteNormativo";
import { PERFILES_I_H_TUBO } from "../../../steelDeck/catalogos";

export default function LosaColaborante({ steelDeckConfig, onConfigChange, grid, datos, costos }) {
  const [tabActivo, setTabActivo] = useState('general');
  const [normParams, setNormParams] = useState({
    f_c: 210,
    fy_rebar: 4200,
    alturaStud: 15,
    numStudsPorReborde: 1,
    anchoReborde: 15,
    mallaTruskon: 1.88, // cm²/m - Malla Truskon T-188 por defecto
  });

  const handleNormChange = (e) => {
    const { name, value } = e.target;
    setNormParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const resultados = useMemo(() => {
    if (!grid || !datos || !costos) return null;
    const config = { ...steelDeckConfig, ...normParams };
    return calcularLosaColaboranteNormativo(grid, datos, config, costos);
  }, [grid, datos, steelDeckConfig, costos, normParams]);

  const theme = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#ca8a04',
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
  };

  const styles = {
    container: { fontFamily: '"Inter", system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto', padding: '24px', background: theme.bg, minHeight: '100vh' },
    mainLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' },
    header: { marginBottom: '24px' },
    title: { fontSize: '22px', fontWeight: 700, color: theme.text, margin: '0 0 4px 0' },
    subtitle: { fontSize: '13px', color: theme.textMuted, margin: 0 },
    card: { background: theme.card, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${theme.border}`, padding: '20px', marginBottom: '16px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
    input: { width: '100%', padding: '8px 10px', border: `1px solid ${theme.border}`, borderRadius: '8px', fontSize: '13px', background: '#fff', transition: 'border 0.2s', boxSizing: 'border-box' },
    label: { fontSize: '12px', fontWeight: 600, color: theme.textMuted, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.3px' },
    tabs: { display: 'flex', gap: '2px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' },
    tab: (active) => ({
      padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      background: active ? theme.card : 'transparent', color: active ? theme.primary : theme.textMuted,
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s',
    }),
    badge: (ok) => ({
      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      background: ok ? '#dcfce7' : '#fee2e2', color: ok ? theme.success : theme.danger, border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
    }),
    progressBar: (ratio) => {
      const pct = Math.min(parseFloat(ratio) * 100, 100);
      return { height: '6px', width: '100%', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' };
    },
    progressFill: (ratio) => {
      const pct = Math.min(parseFloat(ratio) * 100, 100);
      const color = pct < 60 ? '#22c55e' : pct < 90 ? '#eab308' : '#ef4444';
      return { height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s ease' };
    },
    verifRow: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.border}`, fontSize: '13px' },
    verifLabel: { flex: 1.5, color: theme.text, fontWeight: 500 },
    verifValue: { flex: 1, textAlign: 'center', color: theme.textMuted, fontSize: '12px', fontFamily: 'monospace' },
    verifRatio: { flex: 0.8, textAlign: 'center' },
    verifStatus: { flex: 0.5, textAlign: 'center' },
    infoCard: { padding: '14px', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${theme.border}` },
    infoTitle: { margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: theme.text },
    infoRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', borderBottom: `1px solid ${theme.border}` },
    infoLabel: { color: theme.textMuted },
    infoValue: { color: theme.text, fontWeight: 600, fontFamily: 'monospace' },
    alert: { padding: '14px 16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '10px', fontSize: '12px', color: '#713f12', lineHeight: 1.6, marginTop: '16px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th: { textAlign: 'left', padding: '8px', borderBottom: `2px solid ${theme.border}`, color: theme.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' },
    td: { padding: '8px', borderBottom: `1px solid ${theme.border}`, color: theme.text },
  };

  const verifRow = (label, demanda, capacidad, cumple, ratio, extra = null) => (
    <div style={styles.verifRow}>
      <span style={styles.verifLabel}>{label}</span>
      <span style={styles.verifValue}>{demanda}</span>
      <span style={styles.verifValue}>{capacidad}</span>
      <span style={styles.verifValue}>{ratio}</span>
      <span style={styles.verifStatus}><span style={styles.badge(cumple)}>{cumple ? '✓ OK' : '✗ FAIL'}</span></span>
      {extra && <span style={{ flex: 1.2, textAlign: 'right', color: theme.textMuted, fontSize: '11px' }}>{extra}</span>}
    </div>
  );

  const infoCard = (title, items) => (
    <div style={styles.infoCard}>
      <h6 style={styles.infoTitle}>{title}</h6>
      {items.map(([label, value], i) => (
        <div key={i} style={{ ...styles.infoRow, borderBottom: i < items.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
          <span style={styles.infoLabel}>{label}</span>
          <span style={styles.infoValue}>{value}</span>
        </div>
      ))}
    </div>
  );

  const progressBar = (ratio) => (
    <div style={styles.progressBar(ratio)}>
      <div style={styles.progressFill(ratio)} />
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'deck', label: 'Deck' },
    { id: 'compuesta', label: 'Compuesta' },
    { id: 'vigas', label: 'Vigas' },
    { id: 'conectores', label: 'Studs' },
    { id: 'losa', label: 'Losa' },
    { id: 'optimizador', label: 'Optimizador' },
    { id: 'costos', label: 'Costos' },
  ];

  const exportarPDF = () => {
    if (!resultados) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>Memoria de Cálculo - Losa Colaborante</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            h1, h2 { color: #1a252f; border-bottom: 2px solid #34495e; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f6f7; }
            .badge-ok { color: #27ae60; font-weight: bold; }
            .badge-fail { color: #c0392b; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Memoria de Cálculo: Losa Colaborante Steel Deck</h1>
          
          <h2>1. Datos de Entrada</h2>
          <table>
            <tr><th>Paño a evaluar (Luz X / Luz Y)</th><td>${grid.luzX} m x ${grid.luzY} m</td></tr>
            <tr><th>Carga Viva</th><td>${datos.cv} kg/m²</td></tr>
            <tr><th>Carga Muerta Extra</th><td>${datos.cmExtra} kg/m²</td></tr>
            <tr><th>f'c Concreto</th><td>${normParams.f_c || 210} kg/cm²</td></tr>
            <tr><th>Calibre Deck</th><td>${steelDeckConfig.calibre}</td></tr>
            <tr><th>Espesor Losa (sobre deck)</th><td>${steelDeckConfig.espesorConcreto} cm</td></tr>
          </table>

          <h2>2. Resultados Generales y Volúmenes</h2>
          <table>
            <tr><th>Espesor Total de Losa (h)</th><td>${resultados.h} m</td></tr>
            <tr><th>Volumen Concreto Estimado</th><td>${resultados.volConcreto} m³</td></tr>
            <tr><th>Peso Acero (Vigas+Correas+Malla)</th><td>${resultados.kgAcero} kg</td></tr>
            <tr><th>Studs Requeridos</th><td>${resultados.numBloques} unidades</td></tr>
            <tr><th>Costo Total Estimado</th><td>$${resultados.costoTotal} ($${resultados.costoM2}/m²)</td></tr>
          </table>

          <h2>3. Verificaciones Estructurales (AISC 360-16 / ACI 318-19)</h2>
          <table>
            <tr>
              <th>Elemento / Revisión</th>
              <th>Demanda</th>
              <th>Capacidad / Límite</th>
              <th>Estado</th>
            </tr>
            <tr>
              <td>Viga Principal - ${steelDeckConfig.tipoVigaPrincipal}</td>
              <td>
                M: ${resultados.verificaciones.vigaPrincipal.momento.demanda}<br/>
                V: ${resultados.verificaciones.vigaPrincipal.cortante.demanda}<br/>
                Defl: ${resultados.verificaciones.vigaPrincipal.deflexion.demanda}<br/>
                Defl (Comp): ${resultados.verificaciones.vigaPrincipal.deflexionCompuesta.demanda}
              </td>
              <td>
                M: ${resultados.verificaciones.vigaPrincipal.momento.capacidad}<br/>
                V: ${resultados.verificaciones.vigaPrincipal.cortante.capacidad}<br/>
                Lim: ${resultados.verificaciones.vigaPrincipal.deflexion.limite}<br/>
                Lim: ${resultados.verificaciones.vigaPrincipal.deflexionCompuesta.limite}
              </td>
              <td class="${resultados.verificaciones.vigaPrincipal.cumpleGlobal ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.vigaPrincipal.cumpleGlobal ? 'CUMPLE' : 'Falla V/M/Defl'}
              </td>
            </tr>
            <tr>
              <td>Correa Típica - ${steelDeckConfig.tipoCorrea}</td>
              <td>
                M: ${resultados.verificaciones.correas.momento.demanda}<br/>
                V: ${resultados.verificaciones.correas.cortante.demanda}<br/>
                Defl: ${resultados.verificaciones.correas.deflexion.demanda}<br/>
                Defl (Comp): ${resultados.verificaciones.correas.deflexionCompuesta.demanda}
              </td>
              <td>
                M: ${resultados.verificaciones.correas.momento.capacidad}<br/>
                V: ${resultados.verificaciones.correas.cortante.capacidad}<br/>
                Lim: ${resultados.verificaciones.correas.deflexion.limite}<br/>
                Lim: ${resultados.verificaciones.correas.deflexionCompuesta.limite}
              </td>
              <td class="${resultados.verificaciones.correas.cumpleGlobal ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.correas.cumpleGlobal ? 'CUMPLE' : 'Falla V/M/Defl'}
              </td>
            </tr>
            <tr>
              <td>Correa de Borde (Mitad de área) - ${resultados.verificaciones.correaBorde?.optimo || 'N/A'}</td>
              <td>${resultados.verificaciones.correaBorde?.momento?.demanda || 'N/A'}</td>
              <td>-</td>
              <td class="${resultados.verificaciones.correaBorde?.cumpleGlobal ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.correaBorde?.cumpleGlobal ? 'CUMPLE' : 'NO CUMPLE'}
              </td>
            </tr>
            <tr>
              <td>Conectores de Corte (Studs)</td>
              <td>${resultados.numBloques} requeridos</td>
              <td>-</td>
              <td class="${resultados.verificaciones.conectoresCorte.cumple ? 'badge-ok' : 'badge-fail'}">
                ${resultados.verificaciones.conectoresCorte.cumple ? 'CUMPLE' : 'NO CUMPLE'}
              </td>
            </tr>
            <tr>
              <td>Losa Concreto (Flexión Positiva)</td>
              <td>${resultados.verificaciones.losaConcreto.momentoPos.demanda}</td>
              <td>-</td>
              <td class="badge-ok">OK</td>
            </tr>
          </table>

          <p style="margin-top: 40px; font-size: 11px; color: #7f8c8d; text-align: center;">
            Documento generado por Calculadora Arko360. Este pre-dimensionamiento normativo (ACI/AISC) no sustituye el diseño detallado ni la firma de un ingeniero estructural calificado.
          </p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  return (
    <div style={styles.container}>
      <div style={{...styles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <h2 style={styles.title}>Losa Colaborante Steel Deck</h2>
          <p style={styles.subtitle}>Pre-dimensionamiento normativo ACI 318-19 · AISC 360-16 LRFD · Optimización</p>
        </div>
        <button 
          onClick={exportarPDF}
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
        >
          📄 Exportar Memoria
        </button>
      </div>

      <div style={styles.mainLayout}>
        {/* PANEL IZQUIERDO: CONFIGURACIÓN Y RESULTADOS */}
        <div>
          {/* CONFIGURACIÓN */}
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>⚙️ Configuración</h3>
            <div style={styles.grid4}>
              {[
                ['espesorConcreto', 'Espesor concreto (cm)', 'number', 0.5, 4, 25],
                ['calibre', 'Calibre deck', 'select-deck', null, null, null],
                ['sepCorreas', 'Separación real correas (m)', 'number', 0.1, 0.9, 3.0],
                ['alturaDeck', 'Altura deck (cm)', 'number', 0.5, 5, 15],
                ['tipoVigaPrincipal', 'Viga principal', 'select-w', null, null, null],
                ['tipoCorrea', 'Correa', 'select-c', null, null, null],
                ['diametroStud', 'Diámetro stud', 'select-ds', null, null, null],
                ['mallaTruskon', 'Malla Truskon', 'select-malla', null, null, null],
                ['f_c', "f'c (kg/cm²)", 'number', 10, 140, 420],
                ['fy_rebar', 'fy rebar (kg/cm²)', 'number', 100, 2800, 6000],
                ['alturaStud', 'Altura stud (cm)', 'number', 1, 10, 25],
                ['numStudsPorReborde', 'Studs/reborde', 'select-nc', null, null, null],
                ['anchoReborde', 'Ancho reborde (cm)', 'number', 1, 10, 25],
              ].map(([name, label, type, step, min, max]) => (
                <div key={name}>
                  <label style={styles.label}>{label}</label>
                  {type === 'select-deck' ? (
                    <select name="calibre" value={steelDeckConfig.calibre} onChange={onConfigChange} style={styles.input}>
                      <option value="22">22 (7.3 kg/m²)</option>
                      <option value="20">20 (9.1 kg/m²)</option>
                      <option value="18">18 (11.4 kg/m²)</option>
                      <option value="16">16 (14.6 kg/m²)</option>
                    </select>
                  ) : type === 'select-w' ? (
                    <select name="tipoVigaPrincipal" value={steelDeckConfig.tipoVigaPrincipal} onChange={onConfigChange} style={styles.input}>
                      {PERFILES_I_H_TUBO.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : type === 'select-c' ? (
                    <select name="tipoCorrea" value={steelDeckConfig.tipoCorrea} onChange={onConfigChange} style={styles.input}>
                      {PERFILES_I_H_TUBO.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : type === 'select-ds' ? (
                    <select name="diametroStud" value={steelDeckConfig.diametroStud || 0.75} onChange={onConfigChange} style={styles.input}>
                      <option value="0.5">1/2" (12.7 mm)</option>
                      <option value="0.625">5/8" (15.9 mm)</option>
                      <option value="0.75">3/4" (19.1 mm)</option>
                      <option value="0.875">7/8" (22.2 mm)</option>
                    </select>
                  ) : type === 'select-nc' ? (
                    <select name="numStudsPorReborde" value={normParams.numStudsPorReborde} onChange={handleNormChange} style={styles.input}>
                      <option value={1}>1 stud/reborde</option>
                      <option value={2}>2 studs/reborde</option>
                    </select>
                  ) : type === 'select-malla' ? (
                    <select name="mallaTruskon" value={normParams.mallaTruskon} onChange={handleNormChange} style={styles.input}>
                      <option value="0.97">Truskon T-97 (0.97 cm²/m)</option>
                      <option value="1.42">Truskon T-142 (1.42 cm²/m)</option>
                      <option value="1.59">Truskon T-159 (1.59 cm²/m)</option>
                      <option value="1.88">Truskon T-188 (1.88 cm²/m)</option>
                      <option value="2.57">Truskon T-257 (2.57 cm²/m)</option>
                      <option value="3.55">Truskon T-355 (3.55 cm²/m)</option>
                      <option value="5.11">Truskon T-511 (5.11 cm²/m)</option>
                    </select>
                  ) : (
                    <input type="number" name={name} value={type === 'number' && name in steelDeckConfig ? steelDeckConfig[name] : normParams[name]} onChange={name in steelDeckConfig ? onConfigChange : handleNormChange} step={step} min={min} max={max} style={styles.input} />
                  )}
                </div>
              ))}
            </div>
            {steelDeckConfig.espesorConcreto < 5 && (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '12px', color: '#856404' }}>
                ⚠️ <strong>Espesor mínimo ACI:</strong> El espesor ingresado ({steelDeckConfig.espesorConcreto} cm) es menor al mínimo normativo de <strong>5 cm</strong> sobre la cresta del deck (ACI 318-19 §26.3.3). Se calcula automáticamente con <strong>5 cm</strong>.
              </div>
            )}
          </div>

          {/* ADVERTENCIA REUBICADA */}
          {resultados && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
              <div style={styles.alert}>
                <strong>⚠️ Advertencia Normativa:</strong> Esta herramienta realiza verificaciones de pre-dimensionamiento basadas en ACI 318-19 y AISC 360-16 (LRFD). Incluye: método de la transformada para sección compuesta, factor de reducción R de conectores (AISC I3.2d), pandeo lateral-torsional con arriostramiento (AISC Cap. F / App. 6), cortante del concreto y punzonamiento (ACI 318), deflexiones en servicio y vibración. <strong>No sustituye el diseño estructural detallado</strong> ni la supervisión de un ingeniero estructural calificado.
              </div>
            </div>
          )}

          {/* RESULTADOS */}
          {resultados && (
            <div style={styles.card}>
              {/* HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: `2px solid ${theme.border}` }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: theme.text }}>📋 Resumen Normativo</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: theme.textMuted }}>
                    φb=0.90 · φv=0.90 · φc=0.75 · φconc=0.90 · φVc=0.75
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: theme.textMuted }}>Estado global:</span>
                  <span style={{
                    padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                    background: resultados.cumpleGlobal ? '#dcfce7' : '#fee2e2',
                    color: resultados.cumpleGlobal ? theme.success : theme.danger,
                    border: `1px solid ${resultados.cumpleGlobal ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    {resultados.cumpleGlobal ? '✓ CUMPLE TODAS' : '✗ NO CUMPLE'}
                  </span>
                </div>
              </div>

              {/* TABS */}
              <div style={styles.tabs}>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setTabActivo(t.id)} style={styles.tab(tabActivo === t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB: GENERAL */}
              {tabActivo === 'general' && (
                <div style={styles.grid3}>
                  {infoCard('Cargas', [
                    ['Peso propio', resultados.pesoPropio + ' kg/m²'],
                    ['wD permanente', resultados.wu + ' kg/m²'],
                    ['wL viva', (datos.cv || 0).toFixed(2) + ' kg/m²'],
                    ['wu última', resultados.wu + ' kg/m²'],
                    ['w servicio', resultados.wServicio + ' kg/m²'],
                  ])}
                  {infoCard('Geometría', [
                    ['Luz mayor', Math.max(grid.luzX, grid.luzY).toFixed(2) + ' m'],
                    ['Luz menor', Math.min(grid.luzX, grid.luzY).toFixed(2) + ' m'],
                    ['Ratio luz', (Math.max(grid.luzX, grid.luzY) / Math.min(grid.luzX, grid.luzY)).toFixed(2)],
                    ['Área total', (grid.luzX * Math.max(grid.cols - 1, 1) * grid.luzY * Math.max(grid.filas - 1, 1)).toFixed(2) + ' m²'],
                  ])}
                  {infoCard('Estado por elemento', [
                    ['Deck construcción', resultados.verificaciones.deckConstruccion.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                    ['Viga principal', resultados.verificaciones.vigaPrincipal.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                    ['Correas', resultados.verificaciones.correas.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                    ['Conectores', resultados.verificaciones.conectoresCorte.cumple ? '✓ OK' : '✗ FAIL'],
                    ['Losa concreto', resultados.verificaciones.losaConcreto.cumpleGlobal ? '✓ OK' : '✗ FAIL'],
                  ])}
                </div>
              )}

              {/* TAB: DECK */}
              {tabActivo === 'deck' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>{resultados.verificaciones.deckConstruccion.descripcion}</span>
                  </div>
                  {verifRow('Momento (+)', resultados.verificaciones.deckConstruccion.momentoPos.demanda, resultados.verificaciones.deckConstruccion.momentoPos.capacidad, resultados.verificaciones.deckConstruccion.momentoPos.cumple, resultados.verificaciones.deckConstruccion.momentoPos.ratio)}
                  {verifRow('Momento (-)', resultados.verificaciones.deckConstruccion.momentoNeg.demanda, resultados.verificaciones.deckConstruccion.momentoNeg.capacidad, resultados.verificaciones.deckConstruccion.momentoNeg.cumple, resultados.verificaciones.deckConstruccion.momentoNeg.ratio)}
                  {verifRow('Cortante', resultados.verificaciones.deckConstruccion.cortante.demanda, resultados.verificaciones.deckConstruccion.cortante.capacidad, resultados.verificaciones.deckConstruccion.cortante.cumple, resultados.verificaciones.deckConstruccion.cortante.ratio)}
                  {verifRow('Deflexión', resultados.verificaciones.deckConstruccion.deflexion.demanda, resultados.verificaciones.deckConstruccion.deflexion.limite, resultados.verificaciones.deckConstruccion.deflexion.cumple, resultados.verificaciones.deckConstruccion.deflexion.ratio)}
                  <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: theme.textMuted, lineHeight: 1.5 }}>
                    <strong style={{ color: theme.text }}>Nota técnica:</strong> Verificación en fase de construcción según AISC 360 Cap. I3. El deck actúa como encofrado permanente. Carga de construcción = peso del concreto húmedo + 100 kg/m² de sobrecarga de trabajo.
                  </div>
                </div>
              )}

              {/* TAB: COMPUESTA */}
              {tabActivo === 'compuesta' && (
                <div style={styles.grid2}>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Sección transformada</h4>
                    {infoCard('', [
                      ['Ancho efectivo (beff)', resultados.verificaciones.seccionCompuesta.anchoEfectivo],
                      ['Módulo modular (n)', resultados.verificaciones.seccionCompuesta.n],
                      ['Ancho transformado', resultados.verificaciones.seccionCompuesta.bTransformado],
                      ['Inercia transformada (Itr)', resultados.verificaciones.seccionCompuesta.inerciaTransformada],
                      ['Centroide (ȳ)', resultados.verificaciones.seccionCompuesta.yBar],
                      ['Módulo sección sup. (S+)', resultados.verificaciones.seccionCompuesta.S_sup],
                      ['Módulo sección inf. (S−)', resultados.verificaciones.seccionCompuesta.S_inf],
                    ])}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Momento resistente compuesto</h4>
                    {infoCard('', [
                      ['Fuerza plástica acero (Py)', resultados.verificaciones.momentoCompuesto.P_acero],
                      ['Fuerza plástica concreto (Cc)', resultados.verificaciones.momentoCompuesto.P_conc],
                      ['Fuerza transferible studs (ΣQn)', resultados.verificaciones.momentoCompuesto.P_studs],
                      ['PNA', resultados.verificaciones.momentoCompuesto.PNA],
                      ['Bloque compresión (a)', resultados.verificaciones.momentoCompuesto.a],
                      ['Distancia PNA (Y2)', resultados.verificaciones.momentoCompuesto.Y2],
                      ['Mn compuesta', resultados.verificaciones.momentoCompuesto.Mn_comp],
                      ['φMn compuesta', resultados.verificaciones.momentoCompuesto.phiMn_comp],
                    ])}
                    <div style={{ marginTop: '10px', padding: '10px', background: '#eff6ff', borderRadius: '8px', fontSize: '12px', color: '#1e40af' }}>
                      <strong>Tipo de compuesta:</strong> {resultados.verificaciones.momentoCompuesto.completa ? 'Sección completamente compuesta' : 'Sección parcialmente compuesta (limitada por studs)'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: VIGAS */}
              {tabActivo === 'vigas' && (
                <div>
                  {/* VIGA PRINCIPAL */}
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>
                    {resultados.verificaciones.vigaPrincipal.descripcion}
                  </h4>
                  {verifRow('Momento', resultados.verificaciones.vigaPrincipal.momento.demanda, resultados.verificaciones.vigaPrincipal.momento.capacidad, resultados.verificaciones.vigaPrincipal.momento.cumple, resultados.verificaciones.vigaPrincipal.momento.ratio)}
                  <div style={{ padding: '0 0 10px 20px' }}>{progressBar(resultados.verificaciones.vigaPrincipal.momento.ratio)}</div>
                  {verifRow('Cortante', resultados.verificaciones.vigaPrincipal.cortante.demanda, resultados.verificaciones.vigaPrincipal.cortante.capacidad, resultados.verificaciones.vigaPrincipal.cortante.cumple, resultados.verificaciones.vigaPrincipal.cortante.ratio)}
                  {verifRow('Deflexión acero', resultados.verificaciones.vigaPrincipal.deflexion.demanda, resultados.verificaciones.vigaPrincipal.deflexion.limite, resultados.verificaciones.vigaPrincipal.deflexion.cumple, resultados.verificaciones.vigaPrincipal.deflexion.ratio)}
                  {verifRow('Deflexión compuesta', resultados.verificaciones.vigaPrincipal.deflexionCompuesta.demanda, resultados.verificaciones.vigaPrincipal.deflexionCompuesta.limite, resultados.verificaciones.vigaPrincipal.deflexionCompuesta.cumple, resultados.verificaciones.vigaPrincipal.deflexionCompuesta.ratio)}

                  {/* ARRIOSTRAMIENTO VIGA PRINCIPAL */}
                  <div style={{ marginTop: '16px', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#14532d' }}>🔧 Arriostramiento lateral (AISC 360 App. 6)</h5>
                    <div style={styles.grid3}>
                      {infoCard('Parámetros', [
                        ['Lb actual', resultados.verificaciones.vigaPrincipal.arriostramiento.Lb_m + ' m'],
                        ['Lp (límite plástico)', resultados.verificaciones.vigaPrincipal.arriostramiento.Lp_m + ' m'],
                        ['Lr (límite inelástico)', resultados.verificaciones.vigaPrincipal.arriostramiento.Lr_m + ' m'],
                        ['Zona de pandeo', resultados.verificaciones.vigaPrincipal.pandeo.zona],
                      ])}
                      {infoCard('Recomendación', [
                        ['Estado', resultados.verificaciones.vigaPrincipal.arriostramiento.cumpleSinArriostre ? 'No requiere arriostramiento' : 'Requiere arriostramiento'],
                        ['Máx. sin arriostre', resultados.verificaciones.vigaPrincipal.arriostramiento.Lb_max_m + ' m'],
                        ['Fuerza bracing (Pbr)', resultados.verificaciones.vigaPrincipal.arriostramiento.Pbr_kg + ' kg'],
                      ])}
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#14532d' }}>
                      <strong>Nota:</strong> {resultados.verificaciones.vigaPrincipal.arriostramiento.recomendacion}. La fuerza de arriostramiento se calcula según AISC 360 App. 6.3 como Pbr = 0.02·Mf/h0.
                    </p>
                  </div>

                  {/* CORREAS */}
                  <h4 style={{ margin: '24px 0 12px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>
                    {resultados.verificaciones.correas.descripcion}
                  </h4>
                  {verifRow('Momento', resultados.verificaciones.correas.momento.demanda, resultados.verificaciones.correas.momento.capacidad, resultados.verificaciones.correas.momento.cumple, resultados.verificaciones.correas.momento.ratio)}
                  <div style={{ padding: '0 0 10px 20px' }}>{progressBar(resultados.verificaciones.correas.momento.ratio)}</div>
                  {verifRow('Cortante', resultados.verificaciones.correas.cortante.demanda, resultados.verificaciones.correas.cortante.capacidad, resultados.verificaciones.correas.cortante.cumple, resultados.verificaciones.correas.cortante.ratio)}
                  {verifRow('Deflexión', resultados.verificaciones.correas.deflexion.demanda, resultados.verificaciones.correas.deflexion.limite, resultados.verificaciones.correas.deflexion.cumple, resultados.verificaciones.correas.deflexion.ratio)}

                  <div style={{ marginTop: '12px', padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#14532d' }}>🔧 Arriostramiento lateral de correas</h5>
                    <div style={styles.grid3}>
                      {infoCard('Parámetros', [
                        ['Lb actual', resultados.verificaciones.correas.arriostramiento.Lb_m + ' m'],
                        ['Lp', resultados.verificaciones.correas.arriostramiento.Lp_m + ' m'],
                        ['Lr', resultados.verificaciones.correas.arriostramiento.Lr_m + ' m'],
                        ['Zona', resultados.verificaciones.correas.arriostramiento.zona === 1 ? 'Zona 1' : (resultados.verificaciones.correas.arriostramiento.zona === 2 ? 'Zona 2' : 'Zona 3')],
                      ])}
                      {infoCard('Recomendación', [
                        ['Estado', resultados.verificaciones.correas.arriostramiento.cumpleSinArriostre ? 'No requiere arriostre' : 'Requiere arriostre'],
                        ['Máx. sin arriostre', resultados.verificaciones.correas.arriostramiento.Lb_max_m + ' m'],
                        ['Fuerza bracing (Pbr)', resultados.verificaciones.correas.arriostramiento.Pbr_kg + ' kg'],
                      ])}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CONECTORES */}
              {tabActivo === 'conectores' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>📐 Geometría y Límites del Stud</h4>
                      {infoCard('', [
                        ['Diámetro seleccionado (ds)', resultados.verificaciones.conectoresCorte.diametroStud],
                        ['Espesor ala VP (tf)', resultados.verificaciones.conectoresCorte.tf_vp],
                        ['Límite ala VP (ds ≤ 2.5·tf)', resultados.verificaciones.conectoresCorte.cumpleTf_vp ? '✓ CUMPLE' : '✗ EXCEDE'],
                        ['Espesor ala Correa (tf)', resultados.verificaciones.conectoresCorte.tf_correa],
                        ['Límite ala Correa (ds ≤ 2.5·tf)', resultados.verificaciones.conectoresCorte.cumpleTf_correa ? '✓ CUMPLE' : '✗ EXCEDE'],
                        ['Altura del stud (Hs)', resultados.verificaciones.conectoresCorte.alturaStud],
                        ['Rango Hs admisible', `${resultados.verificaciones.conectoresCorte.Hs_min} a ${resultados.verificaciones.conectoresCorte.Hs_max}`],
                        ['Verificación altura', resultados.verificaciones.conectoresCorte.cumpleHs ? '✓ CUMPLE' : '✗ FUERA DE RANGO'],
                      ])}
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>📊 Resumen de Distribución total</h4>
                      {infoCard('', [
                        ['Total studs requeridos', resultados.verificaciones.conectoresCorte.totalStuds.toLocaleString() + ' und'],
                        ['Separación en Viga Principal', resultados.verificaciones.conectoresCorte.s_vp],
                        ['Separación en Correas', resultados.verificaciones.conectoresCorte.s_correa],
                        ['Capacidad total ΣφQn', resultados.verificaciones.conectoresCorte.capacidadTotal],
                        ['Costo total conectores', `$${(resultados.verificaciones.conectoresCorte.totalStuds * (costos.studUnd || 0)).toFixed(2)}`],
                        ['Estado conectores', resultados.verificaciones.conectoresCorte.cumple ? '✓ OK' : '✗ REVISAR LÍMITES'],
                      ])}
                      <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '11px', color: theme.textMuted, lineHeight: 1.5 }}>
                        <strong style={{ color: theme.text }}>Normas AISC/ACI:</strong> La altura mínima de los studs sobre el tope del deck es de 1.5" (38 mm) y el recubrimiento de concreto superior mínimo es de 0.5" (13 mm). El diámetro del stud no debe exceder 2.5 veces el espesor de la ala de apoyo.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>🌉 Vigas Principales (Pórticos)</h4>
                      {infoCard('', [
                        ['Capacidad φQn (perpendicular)', resultados.verificaciones.conectoresCorte.phiQn_vp],
                        ['Fuerza plástica Py', resultados.verificaciones.conectoresCorte.P_acero_vp],
                        ['Fuerza plástica Cc', resultados.verificaciones.conectoresCorte.P_conc_vp],
                        ['Studs requeridos / tramo', resultados.verificaciones.conectoresCorte.N_total_vp + ' und'],
                        ['Separación teórica (s)', resultados.verificaciones.conectoresCorte.s_vp],
                        ['Rango s (mín / máx)', `${resultados.verificaciones.conectoresCorte.s_min_vp} / ${resultados.verificaciones.conectoresCorte.s_max_vp}`],
                        ['Verificación s', resultados.verificaciones.conectoresCorte.cumpleS_vp ? '✓ CUMPLE' : '✗ REVISAR LÍMITES'],
                        ['Acción compuesta', `${(parseFloat(resultados.verificaciones.conectoresCorte.ratio_vp) * 100).toFixed(0)}%`],
                      ])}
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>📐 Correas (Viguetas secundarias)</h4>
                      {infoCard('', [
                        ['Capacidad φQn (paralela)', resultados.verificaciones.conectoresCorte.phiQn_correa],
                        ['Fuerza plástica Py', resultados.verificaciones.conectoresCorte.P_acero_correa],
                        ['Fuerza plástica Cc', resultados.verificaciones.conectoresCorte.P_conc_correa],
                        ['Studs requeridos / correa', resultados.verificaciones.conectoresCorte.N_total_correa + ' und'],
                        ['Separación teórica (s)', resultados.verificaciones.conectoresCorte.s_correa],
                        ['Rango s (mín / máx)', `${resultados.verificaciones.conectoresCorte.s_min_correa} / ${resultados.verificaciones.conectoresCorte.s_max_correa}`],
                        ['Verificación s', resultados.verificaciones.conectoresCorte.cumpleS_correa ? '✓ CUMPLE' : '✗ REVISAR LÍMITES'],
                        ['Acción compuesta', `${(parseFloat(resultados.verificaciones.conectoresCorte.ratio_correa) * 100).toFixed(0)}%`],
                      ])}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: LOSA */}
              {tabActivo === 'losa' && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Momentos de losa (ACI 318 Tabla 6.5.2.2)</h4>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    {infoCard('Momento positivo', [
                      ['Demanda', resultados.verificaciones.losaConcreto.momentoPos.demanda],
                      ['Coef. Ca', resultados.verificaciones.losaConcreto.momentoPos.coef],
                    ])}
                    {infoCard('Momento neg. exterior', [
                      ['Demanda', resultados.verificaciones.losaConcreto.momentoNegExt.demanda],
                      ['Coef. Ca', resultados.verificaciones.losaConcreto.momentoNegExt.coef],
                    ])}
                    {infoCard('Momento neg. interior', [
                      ['Demanda', resultados.verificaciones.losaConcreto.momentoNegInt.demanda],
                      ['Coef. Ca', resultados.verificaciones.losaConcreto.momentoNegInt.coef],
                    ])}
                  </div>

                  {verifRow('Cortante losa', resultados.verificaciones.losaConcreto.cortante.demanda, resultados.verificaciones.losaConcreto.cortante.capacidad, resultados.verificaciones.losaConcreto.cortante.cumple, resultados.verificaciones.losaConcreto.cortante.ratio)}
                  {verifRow('Punzonamiento', resultados.verificaciones.losaConcreto.punzonamiento.demanda, resultados.verificaciones.losaConcreto.punzonamiento.capacidad, resultados.verificaciones.losaConcreto.punzonamiento.cumple, resultados.verificaciones.losaConcreto.punzonamiento.ratio)}
                  {verifRow('Deflexión total', resultados.verificaciones.losaConcreto.deflexion.demanda, resultados.verificaciones.losaConcreto.deflexion.limite, resultados.verificaciones.losaConcreto.deflexion.cumple, resultados.verificaciones.losaConcreto.deflexion.ratio)}
                  {verifRow('Deflexión viva', resultados.verificaciones.losaConcreto.deflexionViva.demanda, resultados.verificaciones.losaConcreto.deflexionViva.limite, resultados.verificaciones.losaConcreto.deflexionViva.cumple, resultados.verificaciones.losaConcreto.deflexionViva.ratio)}

                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.border}`, fontSize: '13px' }}>
                    <span style={styles.verifLabel}>Vibración (frecuencia natural)</span>
                    <span style={styles.verifValue}>{resultados.verificaciones.losaConcreto.vibracion.frecuencia}</span>
                    <span style={styles.verifValue}>{resultados.verificaciones.losaConcreto.vibracion.limite}</span>
                    <span style={styles.verifValue}>—</span>
                    <span style={styles.verifStatus}><span style={styles.badge(resultados.verificaciones.losaConcreto.vibracion.cumple)}>{resultados.verificaciones.losaConcreto.vibracion.cumple ? '✓ OK' : '✗ FAIL'}</span></span>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                    <span style={{ fontSize: '13px', color: theme.text }}>As mínimo: Req <strong>{resultados.verificaciones.losaConcreto.asMinimo.requerido}</strong> | Prov <strong>{resultados.verificaciones.losaConcreto.asMinimo.provisto}</strong></span>
                    <span style={styles.badge(resultados.verificaciones.losaConcreto.asMinimo.cumple)}>{resultados.verificaciones.losaConcreto.asMinimo.cumple ? '✓ OK' : '✗ FAIL'}</span>
                  </div>
                </div>
              )}

              {/* TAB: OPTIMIZADOR */}
              {tabActivo === 'optimizador' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: theme.text }}>🔍 Optimizador automático de perfiles</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
                    El optimizador itera todos los perfiles disponibles y selecciona el más económico que cumpla momento, cortante y deflexión. Los ratios indican el grado de utilización.
                  </p>

                  <div style={styles.grid2}>
                    {/* VIGA PRINCIPAL OPTIMIZADA */}
                    <div>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Viga principal optimizada</h5>
                      <div style={{ ...styles.infoCard, background: resultados.optimizador.viga.optimo.cumple ? '#f0fdf4' : '#fef2f2', borderColor: resultados.optimizador.viga.optimo.cumple ? '#bbf7d0' : '#fecaca' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: theme.text }}>{resultados.optimizador.viga.optimo.perfil}</span>
                          <span style={styles.badge(resultados.optimizador.viga.optimo.cumple)}>
                            {resultados.optimizador.viga.optimo.cumple ? 'ÓPTIMO' : 'MEJOR OPCIÓN'}
                          </span>
                        </div>
                        {infoCard('', [
                          ['φMn', (resultados.optimizador.viga.optimo.phiMn / 100000).toFixed(2) + ' t·m'],
                          ['φVn', (resultados.optimizador.viga.optimo.phiVn / 1000).toFixed(2) + ' t'],
                          ['Deflexión', resultados.optimizador.viga.optimo.defl.toFixed(2) + ' cm'],
                          ['Peso', resultados.optimizador.viga.optimo.peso + ' kg/m'],
                          ['Costo aprox.', '$' + resultados.optimizador.viga.optimo.costo.toFixed(2)],
                          ['Ratio momento', resultados.optimizador.viga.optimo.ratioFlex],
                          ['Ratio cortante', resultados.optimizador.viga.optimo.ratioCort],
                          ['Ratio deflexión', resultados.optimizador.viga.optimo.ratioDefl],
                          ['tf ala', resultados.optimizador.viga.optimo.tf ? resultados.optimizador.viga.optimo.tf.toFixed(2) + ' cm' : 'N/A'],
                          ['Ratio stud/tf', resultados.optimizador.viga.optimo.ratioStud],
                        ])}
                      </div>


                      {resultados.optimizador.viga.sugerenciasStud && resultados.optimizador.viga.sugerenciasStud.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                          <h6 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>⚠️ Incompatibilidad Stud-Perfil</h6>
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#7f1d1d' }}>
                            El perfil óptimo <strong>{resultados.optimizador.viga.optimo.perfil}</strong> tiene tf = {resultados.optimizador.viga.optimo.tf?.toFixed(2)} cm, 
                            pero el stud de {steelDeckConfig.diametroStud}" ({(parseFloat(steelDeckConfig.diametroStud || 0.75) * 2.54 * 10).toFixed(1)} mm) 
                            requiere tf ≥ {(parseFloat(steelDeckConfig.diametroStud || 0.75) * 2.54 / 2.5).toFixed(2)} cm.
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#7f1d1d' }}>
                            <strong>Sugerencias de stud compatibles:</strong> {resultados.optimizador.viga.sugerenciasStud.join(', ')}
                          </p>
                        </div>
                      )}

                      {resultados.optimizador.correa.sugerenciasStud && resultados.optimizador.correa.sugerenciasStud.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                          <h6 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>⚠️ Incompatibilidad Stud-Perfil</h6>
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#7f1d1d' }}>
                            El perfil óptimo <strong>{resultados.optimizador.correa.optimo.perfil}</strong> tiene tf = {resultados.optimizador.correa.optimo.tf?.toFixed(2)} cm, 
                            pero el stud de {steelDeckConfig.diametroStud}" ({(parseFloat(steelDeckConfig.diametroStud || 0.75) * 2.54 * 10).toFixed(1)} mm) 
                            requiere tf ≥ {(parseFloat(steelDeckConfig.diametroStud || 0.75) * 2.54 / 2.5).toFixed(2)} cm.
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#7f1d1d' }}>
                            <strong>Sugerencias de stud compatibles:</strong> {resultados.optimizador.correa.sugerenciasStud.join(', ')}
                          </p>
                        </div>
                      )}
                      <h6 style={{ margin: '16px 0 8px 0', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>Todos los candidatos</h6>
                      <table style={styles.table}>
                        <thead>
                          <tr><th style={styles.th}>Perfil</th><th style={styles.th}>φMn (t·m)</th><th style={styles.th}>φVn (t)</th><th style={styles.th}>Defl (cm)</th><th style={styles.th}>tf (cm)</th><th style={styles.th}>Stud</th><th style={styles.th}>Cumple</th><th style={styles.th}>Costo ($)</th></tr>
                        </thead>
                        <tbody>
                          {resultados.optimizador.viga.candidatos.map((c, i) => (
                            <tr key={i} style={{ background: c.perfil === resultados.optimizador.viga.optimo.perfil ? '#eff6ff' : 'transparent' }}>
                              <td style={styles.td}><strong>{c.perfil}</strong></td>
                              <td style={styles.td}>{(c.phiMn / 100000).toFixed(2)}</td>
                              <td style={styles.td}>{(c.phiVn / 1000).toFixed(2)}</td>
                              <td style={styles.td}>{c.defl.toFixed(2)}</td>
                              <td style={styles.td}>{c.tf ? c.tf.toFixed(2) : 'N/A'}</td>
                              <td style={styles.td}><span style={styles.badge(c.cumpleStud !== false)}>{c.cumpleStud !== false ? '✓' : '✗'}</span></td>
                              <td style={styles.td}><span style={styles.badge(c.cumple)}>{c.cumple ? 'Sí' : 'No'}</span></td>
                              <td style={styles.td}>{c.costo.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* CORREA OPTIMIZADA */}
                    <div>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: theme.text }}>Correa optimizada</h5>
                      <div style={{ ...styles.infoCard, background: resultados.optimizador.correa.optimo.cumple ? '#f0fdf4' : '#fef2f2', borderColor: resultados.optimizador.correa.optimo.cumple ? '#bbf7d0' : '#fecaca' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: theme.text }}>{resultados.optimizador.correa.optimo.perfil}</span>
                          <span style={styles.badge(resultados.optimizador.correa.optimo.cumple)}>
                            {resultados.optimizador.correa.optimo.cumple ? 'ÓPTIMO' : 'MEJOR OPCIÓN'}
                          </span>
                        </div>
                        {infoCard('', [
                          ['φMn', (resultados.optimizador.correa.optimo.phiMn / 100000).toFixed(2) + ' t·m'],
                          ['φVn', (resultados.optimizador.correa.optimo.phiVn / 1000).toFixed(2) + ' t'],
                          ['Deflexión', resultados.optimizador.correa.optimo.defl.toFixed(2) + ' cm'],
                          ['Peso', resultados.optimizador.correa.optimo.peso + ' kg/m'],
                          ['Costo aprox.', '$' + resultados.optimizador.correa.optimo.costo.toFixed(2)],
                          ['Ratio momento', resultados.optimizador.correa.optimo.ratioFlex],
                          ['Ratio cortante', resultados.optimizador.correa.optimo.ratioCort],
                          ['Ratio deflexión', resultados.optimizador.correa.optimo.ratioDefl],
                          ['tf ala', resultados.optimizador.correa.optimo.tf ? resultados.optimizador.correa.optimo.tf.toFixed(2) + ' cm' : 'N/A'],
                          ['Ratio stud/tf', resultados.optimizador.correa.optimo.ratioStud],
                        ])}
                      </div>

                      <h6 style={{ margin: '16px 0 8px 0', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>Todos los candidatos</h6>
                      <table style={styles.table}>
                        <thead>
                          <tr><th style={styles.th}>Perfil</th><th style={styles.th}>φMn (t·m)</th><th style={styles.th}>φVn (t)</th><th style={styles.th}>Defl (cm)</th><th style={styles.th}>tf (cm)</th><th style={styles.th}>Stud</th><th style={styles.th}>Cumple</th><th style={styles.th}>Costo ($)</th></tr>
                        </thead>
                        <tbody>
                          {resultados.optimizador.correa.candidatos.map((c, i) => (
                            <tr key={i} style={{ background: c.perfil === resultados.optimizador.correa.optimo.perfil ? '#eff6ff' : 'transparent' }}>
                              <td style={styles.td}><strong>{c.perfil}</strong></td>
                              <td style={styles.td}>{(c.phiMn / 100000).toFixed(2)}</td>
                              <td style={styles.td}>{(c.phiVn / 1000).toFixed(2)}</td>
                              <td style={styles.td}>{c.defl.toFixed(2)}</td>
                              <td style={styles.td}>{c.tf ? c.tf.toFixed(2) : 'N/A'}</td>
                              <td style={styles.td}><span style={styles.badge(c.cumpleStud !== false)}>{c.cumpleStud !== false ? '✓' : '✗'}</span></td>
                              <td style={styles.td}><span style={styles.badge(c.cumple)}>{c.cumple ? 'Sí' : 'No'}</span></td>
                              <td style={styles.td}>{c.costo.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: COSTOS */}
              {tabActivo === 'costos' && (
                <div style={styles.grid3}>
                  {infoCard('Materiales', [
                    ['Vol. concreto', resultados.volConcreto + ' m³'],
                    ['Acero total', resultados.kgAcero + ' kg'],
                    ['Studs', resultados.numBloques.toLocaleString() + ' und'],
                    ['Deck', ((grid.luzX * Math.max(grid.cols - 1, 1) * grid.luzY * Math.max(grid.filas - 1, 1)) * 1.15).toFixed(2) + ' m²'],
                  ])}
                  {infoCard('Costos', [
                    ['Costo total', '$' + resultados.costoTotal],
                    ['Costo/m²', '$' + resultados.costoM2],
                    ['Peso propio', resultados.pesoPropio + ' kg/m²'],
                  ])}
                  {infoCard('Eficiencia', [
                    ['Ratio viga principal', resultados.verificaciones.vigaPrincipal.momento.ratio],
                    ['Ratio correas', resultados.verificaciones.correas.momento.ratio],
                    ['Ratio conectores', resultados.verificaciones.conectoresCorte.ratio_vp],
                  ])}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}