import React from 'react';
import { FaThermometerHalf, FaHardHat, FaTable, FaClipboardList, FaBook, FaFileExcel, FaFilePdf, FaDownload, FaFileCode } from 'react-icons/fa';
import InteractiveHeatmap from '../../InteractiveHeatmap';
import { getLiveSvgDetails } from '../utils/rebarVerifier';
import { InteractiveRebarSelect, InteractiveBeamRebarSelect } from './RebarSelectors';

export function ResultsModal({
  results, showResultsModal, setShowResultsModal,
  lastPayload, buildCurrentPayload, columns, wallHeight, allWalls, openings, designParams,
  customBeamRebar, setCustomBeamRebar, customWallRebars, setCustomWallRebars,
  projectName, downloadAuditJSON, downloadHTML,
  descargarMemoriaCalculoHtml, descargarComputosHtml, descargarExcel, descargarPDFPresupuesto,
  presupuesto, presupuestoTotal, params
}) {
  return (
    <>
      {showResultsModal && results && (
        <div className="modal-overlay" style={{alignItems:'flex-start', padding:'20px', overflowY:'auto'}} onClick={() => setShowResultsModal(false)}>
          <div className="modal-content" style={{maxWidth:'960px', width:'100%', margin:'auto', padding:'0'}} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid #eee', background:'#1A6BB5', borderRadius:'12px 12px 0 0'}}>
              <div>
                <h3 style={{margin:0, color:'#fff', fontSize:'16px'}}>📊 Resultados del Análisis Estructural (ACI 318)</h3>
                <small style={{color:'#e0e0e0'}}>{projectName}</small>
              </div>
              <button onClick={() => setShowResultsModal(false)} style={{background:'none', border:'1px solid rgba(255,255,255,0.5)', color:'#fff', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'14px'}}>✕ Cerrar</button>
            </div>
  
            {/* Cards de métricas clave */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', padding:'20px 24px', background:'#f9f9f9', borderBottom:'1px solid #eee'}}>
              {[{
                label:'Asentamiento Máx', val: `${(results.displacements?.w_max_mm||0).toFixed(2)} mm`, ok: true
              },{
                label:'Momento Mx Máx', val: `${((results.moments?.Mx_max_kNm_m||0)*101.9716).toFixed(0)} kgf·m/m`, ok: true
              },{
                label:'Momento My Máx', val: `${((results.moments?.My_max_kNm_m||0)*101.9716).toFixed(0)} kgf·m/m`, ok: true
              },{
                label:'Cortante Vu Máx', val: `${((results.shear?.Vu_max_kN_m||0)*101.9716).toFixed(0)} kgf/m`, ok: results.shear?.shear_ok
              },{
                label:'φVc Cap.', val: `${((results.shear?.phiVc_kN_m||0)*101.9716).toFixed(0)} kgf/m`, ok: results.shear?.shear_ok
              },{
                label:'Presión Suelo', val: results.soil_pressure ? `${(results.soil_pressure.max_pressure_kN_m2*101.9716).toFixed(0)} kgf/m²` : '-', ok: results.soil_pressure?.ok
              },{
                label:'q_adm', val: results.soil_pressure ? `${(results.soil_pressure.q_adm_kN_m2*101.9716).toFixed(0)} kgf/m²` : '-', ok: true
              },{
                label:'FS Deslizamiento', val: results.sliding?.active ? `${results.sliding.fs > 100 ? '>100' : results.sliding.fs.toFixed(2)}` : 'N/A', ok: results.sliding?.active ? results.sliding.ok : true
              },{
                label:'Acero Mínimo', val: `${(results.As_min_cm2_m||0).toFixed(2)} cm²/m`, ok: true
              }].map((c, i) => (
                <div key={i} style={{background:'#fff', borderRadius:'8px', padding:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', borderLeft:`3px solid ${c.ok ? '#4caf50' : '#e53935'}`}}>
                  <div style={{fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px'}}>{c.label}</div>
                  <div style={{fontSize:'16px', fontWeight:'700', color: c.ok ? '#1a1a1a' : '#c62828'}}>{c.val}</div>
                </div>
              ))}
            </div>
  
            {/* Plano SVG */}
            {results.svg_plan && (
              <div style={{padding:'20px 24px', borderBottom:'1px solid #eee'}}>
                <h4 style={{margin:'0 0 12px 0', color:'#333'}}>Plano Estructural</h4>
                <div style={{background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'12px', overflow:'auto'}} dangerouslySetInnerHTML={{__html: results.svg_plan}} />
                
                {results.svg_details && (
                  <div style={{marginTop: '20px'}}>
                    <h4 style={{margin:'0 0 12px 0', color:'#333'}}>Detalles Constructivos Transversales</h4>
                    <div style={{background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'12px', overflow:'auto'}}
                         dangerouslySetInnerHTML={{__html: getLiveSvgDetails(results.svg_details, customBeamRebar, customWallRebars)}} />
                  </div>
                )}
                
                {/* Tabla de Armadura Adicional (Muros) */}
                {results.bands && (
                  <div style={{marginTop: '20px'}}>
                    <h5 style={{margin:'0 0 10px 0', color:'#444'}}>Armadura Adicional Requerida (Bandas de Refuerzo)</h5>
                    <div style={{overflowX: 'auto'}}>
                      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left'}}>
                        <thead>
                          <tr style={{background: '#f1f1f1', borderBottom: '2px solid #ccc'}}>
                            <th style={{padding: '8px'}}>Muro</th>
                            <th style={{padding: '8px'}}>Ancho Banda</th>
                            <th style={{padding: '8px'}}>Acero Adicional X</th>
                            <th style={{padding: '8px'}}>Acero Adicional Y</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.bands.map((b, idx) => {
                            const asMin = results.As_min_cm2_m || 0;
                            const reqX = b.Asx_cm2_m > asMin + 0.05;
                            const reqY = b.Asy_cm2_m > asMin + 0.05;
                            if (!reqX && !reqY) return null;
                            return (
                              <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '8px', fontWeight: 'bold', color: '#e65100'}}>M{idx+1}</td>
                                <td style={{padding: '8px', color: '#666'}}>{b.band_width?.toFixed(2) || '-'} m</td>
                                <td style={{padding: '8px', color: reqX ? '#d32f2f' : 'inherit'}}>{reqX ? `Ø${b.bar_x?.diam_mm}@${Math.round(b.bar_x?.sep_m * 100)}cm` : '-'}</td>
                                <td style={{padding: '8px', color: reqY ? '#1976d2' : 'inherit'}}>{reqY ? `Ø${b.bar_y?.diam_mm}@${Math.round(b.bar_y?.sep_m * 100)}cm` : '-'}</td>
                              </tr>
                            );
                          })}
                          {results.bands.every(b => {
                            const asMin = results.As_min_cm2_m || 0;
                            return !(b.Asx_cm2_m > asMin + 0.05) && !(b.Asy_cm2_m > asMin + 0.05);
                          }) && (
                            <tr>
                              <td colSpan="3" style={{padding: '12px', textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                                No se requiere acero adicional. La malla base cubre toda la demanda.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
  
            {/* Tabla de Diseño de Muros de Contención */}
            {results.retaining_wall_designs && results.retaining_wall_designs.length > 0 && (
              <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#fff8e1'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                  <h4 style={{margin:0, color:'#f57f17'}}>🧱 Diseño de Pantalla de Muros de Contención</h4>
                  <span style={{fontSize:'12px', background:'#fff3e0', color:'#e65100', padding:'4px 10px', borderRadius:'6px', border:'1px solid #ffe082', fontWeight:'600'}}>
                    💡 Puedes cambiar el diámetro/separación de acero si no lo consigues en el mercado. El sistema verifica el cumplimiento en tiempo real.
                  </span>
                </div>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center', background: '#fff', border: '1px solid #ffca28'}}>
                    <thead>
                      <tr style={{background: '#ffe082', borderBottom: '1px solid #ffca28'}}>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>ID Muro</th>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>H Tierra (m)</th>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Espesor (m)</th>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Mu (kgf·m/m)</th>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Vu (kgf/m)</th>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>φVc (kgf/m)</th>
                        <th rowSpan="2" style={{padding: '8px', borderRight: '1px solid #ffd54f'}}>Corte</th>
                        <th colSpan="2" style={{padding: '8px', borderRight: '2px solid #ffb300', background: '#ffecb3', fontWeight: 'bold', fontSize: '14px'}}>Armadura Tracción (Cara Int)</th>
                        <th colSpan="2" style={{padding: '8px', background: '#fff3e0', fontWeight: 'bold', fontSize: '14px'}}>Armadura Compresión (Cara Ext)</th>
                      </tr>
                      <tr style={{background: '#fff8e1', borderBottom: '2px solid #ffca28'}}>
                        <th style={{padding: '6px', borderRight: '1px solid #ffd54f'}}>Ver.</th>
                        <th style={{padding: '6px', borderRight: '2px solid #ffb300'}}>Hoz.</th>
                        <th style={{padding: '6px', borderRight: '1px solid #ffd54f'}}>Ver.</th>
                        <th style={{padding: '6px'}}>Hoz.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.retaining_wall_designs.map((wd, idx) => {
                        const asTracReq = wd.As_req_cm2_m || 2.25;
                        const asCompReq = wd.As_comp_cm2_m || 1.50;
                        const asHorizReq = wd.As_horiz_cm2_m || 1.50;
                        const asHorizCompReq = wd.As_horiz_comp_cm2_m || 1.50;
  
                        const defaultTracVert = wd.rebar_trac_vert || (wd.proposed_rebar ? wd.proposed_rebar.split('|')[0]?.replace(/.*:/, '').trim() : 'Ø10@29cm');
                        const defaultTracHoriz = wd.rebar_trac_horiz || (wd.proposed_rebar_horiz ? wd.proposed_rebar_horiz.split('|')[0]?.replace(/.*:/, '').trim() : 'Ø10@26cm');
                        const defaultCompVert = wd.rebar_comp_vert || (wd.proposed_rebar ? wd.proposed_rebar.split('|')[1]?.replace(/.*:/, '').trim() : 'Ø10@30cm');
                        const defaultCompHoriz = wd.rebar_comp_horiz || (wd.proposed_rebar_horiz ? wd.proposed_rebar_horiz.split('|')[1]?.replace(/.*:/, '').trim() : 'Ø10@26cm');
  
                        const optsTracVert = wd.rebar_trac_vert_options || [defaultTracVert, 'Ø7@14cm', 'Ø8@18cm', 'Ø10@25cm', 'Ø10@30cm', 'Ø12@30cm'];
                        const optsTracHoriz = wd.rebar_trac_horiz_options || [defaultTracHoriz, 'Ø7@17cm', 'Ø8@22cm', 'Ø10@25cm', 'Ø10@30cm', 'Ø12@30cm'];
                        const optsCompVert = wd.rebar_comp_vert_options || [defaultCompVert, 'Ø7@25cm', 'Ø8@30cm', 'Ø10@30cm', 'Ø12@30cm'];
                        const optsCompHoriz = wd.rebar_comp_horiz_options || [defaultCompHoriz, 'Ø7@25cm', 'Ø8@30cm', 'Ø10@30cm', 'Ø12@30cm'];
  
                        return (
                          <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '8px', fontWeight: 'bold', borderRight: '1px solid #eee'}}>{wd.id.substring(0, 8)}</td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.H_m.toFixed(2)}</td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.thickness_m.toFixed(2)}</td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.Mu_kgfm_m.toFixed(0)}</td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.Vu_kgf_m.toFixed(0)}</td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>{wd.phiVc_kgf_m.toFixed(0)}</td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee', color: wd.shear_ok ? '#2e7d32' : '#c62828', fontWeight: 'bold'}}>
                              {wd.shear_ok ? 'OK' : 'FALLA'}
                            </td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>
                              <InteractiveRebarSelect options={optsTracVert} defaultVal={defaultTracVert} asReq={asTracReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, tracVert: v}))} />
                            </td>
                            <td style={{padding: '8px', borderRight: '2px solid #ffb300'}}>
                              <InteractiveRebarSelect options={optsTracHoriz} defaultVal={defaultTracHoriz} asReq={asHorizReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, tracHoriz: v}))} />
                            </td>
                            <td style={{padding: '8px', borderRight: '1px solid #eee'}}>
                              <InteractiveRebarSelect options={optsCompVert} defaultVal={defaultCompVert} asReq={asCompReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, compVert: v}))} />
                            </td>
                            <td style={{padding: '8px'}}>
                              <InteractiveRebarSelect options={optsCompHoriz} defaultVal={defaultCompHoriz} asReq={asHorizCompReq} onChange={(v) => setCustomWallRebars(prev => ({...prev, compHoriz: v}))} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
  
            {/* Tabla de Diseño de Vigas de Apoyo */}
            {results.support_beam_designs && results.support_beam_designs.length > 0 && (
              <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#e8eaf6'}}>
                <h4 style={{margin:'0 0 12px 0', color:'#3f51b5'}}>📏 Diseño de Vigas de Apoyo</h4>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', background: '#fff'}}>
                    <thead>
                      <tr style={{background: '#c5cae9', borderBottom: '2px solid #9fa8da'}}>
                        <th style={{padding: '8px'}}>ID Viga</th>
                        <th style={{padding: '8px'}}>Dimensiones (cm)</th>
                        <th style={{padding: '8px'}}>Mu (kgf·m)</th>
                        <th style={{padding: '8px'}}>Vu (kgf)</th>
                        <th style={{padding: '8px'}}>Acero Requerido</th>
                        <th style={{padding: '8px'}}>Armadura Principal</th>
                        <th style={{padding: '8px'}}>Estribos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.support_beam_designs.map((sb, idx) => {
                        const asBeamReq = sb.As_req_cm2 || 2.25;
                        const defaultBeamRebar = sb.proposed_rebar || "2Ø12 Inf + 2Ø10 Sup";
                        const beamOptions = sb.proposed_rebar_options || [defaultBeamRebar, '3 - Ø16', '2 - Ø16', '2Ø12 + 1Ø10 Inf + 2Ø10 Sup'];
                        return (
                          <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '8px', fontWeight: 'bold'}}>{sb.id.substring(0, 10)}</td>
                            <td style={{padding: '8px'}}>{Math.round(sb.b_m * 100)} x {Math.round(sb.h_m * 100)}</td>
                            <td style={{padding: '8px'}}>{sb.Mu_kgfm.toFixed(0)}</td>
                            <td style={{padding: '8px'}}>{sb.Vu_kgf.toFixed(0)}</td>
                            <td style={{padding: '8px'}}>{sb.As_req_cm2.toFixed(2)} cm²</td>
                            <td style={{padding: '8px', color: '#1565c0', fontWeight: 'bold'}}>
                              <InteractiveBeamRebarSelect options={beamOptions} defaultVal={defaultBeamRebar} asReq={asBeamReq} onChange={(v) => setCustomBeamRebar(v)} />
                            </td>
                            <td style={{padding: '8px', color: '#2e7d32', fontWeight: 'bold'}}>
                              {sb.proposed_stirrups_options && sb.proposed_stirrups_options.length > 1 ? (
                                <select style={{background:'transparent', border:'1px solid #ddd', borderRadius:'4px', color:'inherit', fontWeight:'inherit', outline:'none', cursor:'pointer', padding:'2px'}} defaultValue={sb.proposed_stirrups}>
                                  {sb.proposed_stirrups_options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                </select>
                              ) : sb.proposed_stirrups}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
  
            {/* Mapas de Calor Interactivos */}
            {results.heatmaps && (
              <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#fff'}}>
                <h4 style={{margin:'0 0 12px 0', color:'#333'}}><FaThermometerHalf style={{color:'#1A6BB5'}}/> Mapas de Calor Interactivos</h4>
                <div style={{display:'flex', flexWrap:'wrap', gap:'15px', justifyContent:'center'}}>
                  <InteractiveHeatmap dataMatrix={results.heatmaps.w_mm} title="Desplazamiento (w)" unit="mm" lx={params.Lx} ly={params.Ly} />
                  <InteractiveHeatmap dataMatrix={results.heatmaps.Mx_kNm.map(r => r.map(v => v * 101.9716))} title="Momento Mx" unit="kgf·m/m" lx={params.Lx} ly={params.Ly} />
                  <InteractiveHeatmap dataMatrix={results.heatmaps.My_kNm.map(r => r.map(v => v * 101.9716))} title="Momento My" unit="kgf·m/m" lx={params.Lx} ly={params.Ly} />
                  <InteractiveHeatmap dataMatrix={results.heatmaps.Vu_kN.map(r => r.map(v => v * 101.9716))} title="Cortante Vu" unit="kgf/m" lx={params.Lx} ly={params.Ly} />
                </div>
              </div>
            )}
  
            {/* Cantidades de Obra */}
            {results.materials_computation && (
              <div style={{padding:'20px 24px', borderBottom:'1px solid #eee', background:'#f5f7fa'}}>
                <h4 style={{margin:'0 0 12px 0', color:'#333'}}><FaHardHat /> Cómputos Métricos (Cantidades Estimadas)</h4>
                <div style={{display:'flex', gap:'20px'}}>
                  <div style={{flex:1, background:'#fff', padding:'12px', borderRadius:'8px', border:'1px solid #e0e0e0'}}>
                    <strong>Volumen de Concreto:</strong>
                    <div style={{fontSize:'20px', color:'#1565c0', fontWeight:'bold'}}>{results.materials_computation.concrete_vol_m3.toFixed(2)} m³</div>
                    <div style={{fontSize:'12px', color:'#777'}}>Área neta x Espesor de Losa</div>
                    <div style={{marginTop: '10px', fontSize: '13px', color: '#444'}}>
                      <div><strong>Perímetro:</strong> {allWalls.filter(w => w.type === 'perimetral').reduce((sum, w) => sum + Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2)), 0).toFixed(2)} m lineales</div>
                      <div><strong>Muros Internos:</strong> {allWalls.filter(w => w.type !== 'perimetral').reduce((sum, w) => sum + Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2)), 0).toFixed(2)} m lineales</div>
                      <div><strong>Total Bandas:</strong> {allWalls.reduce((sum, w) => sum + Math.sqrt(Math.pow(w.x2 - w.x1, 2) + Math.pow(w.y2 - w.y1, 2)), 0).toFixed(2)} m lineales</div>
                    </div>
                  </div>
                  <div style={{flex:1, background:'#fff', padding:'12px', borderRadius:'8px', border:'1px solid #e0e0e0'}}>
                    <h4 style={{margin:'0 0 12px 0', color:'#333'}}>
                      {designParams.custom_mesh_cm2_m > 0 ? 'Acero General (Personalizado):' : 'Acero General Losa (Mínimo):'}
                    </h4>
                    {designParams.custom_mesh_cm2_m > 0 ? (
                      <div style={{fontSize:'14px', color:'#c62828', fontWeight:'bold'}}>
                        {designParams.custom_mesh_cm2_m === 0.61 && 'Malla 6x6 (Ø3.43@15cm)'}
                        {designParams.custom_mesh_cm2_m === 1.41 && 'Ø6@20cm'}
                        {designParams.custom_mesh_cm2_m === 1.88 && 'Malla Sima (Ø6@15cm)'}
                        {designParams.custom_mesh_cm2_m === 1.92 && 'Ø7@20cm'}
                        {designParams.custom_mesh_cm2_m === 2.51 && 'Ø8@20cm'}
                        {designParams.custom_mesh_cm2_m === 3.93 && 'Ø10@20cm'}
                        {designParams.custom_mesh_cm2_m === 5.24 && 'Ø10@15cm'}
                      </div>
                    ) : (
                      <div style={{fontSize:'14px', color:'#c62828', fontWeight:'bold'}}>{results.materials_computation.general_slab_steel.bar_x} en X, {results.materials_computation.general_slab_steel.bar_y} en Y</div>
                    )}
                    <div style={{fontSize:'12px', color:'#777'}}>Peso estimado: {results.materials_computation.steel_weight_general_kg.toFixed(0)} kg</div>
                    {results.materials_computation.general_bars_6m && <div style={{fontSize:'12px', color:'#555'}}>~ {results.materials_computation.general_bars_6m} varillas de 6m</div>}
                  </div>
                  <div style={{flex:1, background:'#fff', padding:'12px', borderRadius:'8px', border:'1px solid #e0e0e0'}}>
                    <strong>Acero de Bandas (Refuerzo):</strong>
                    <div style={{fontSize:'12px', color:'#777'}}>Peso adicional en bandas: {results.materials_computation.steel_weight_bands_kg.toFixed(0)} kg</div>
                    {results.materials_computation.bands_bars_6m !== undefined && <div style={{fontSize:'12px', color:'#555'}}>~ {results.materials_computation.bands_bars_6m} varillas de 6m (eq)</div>}
                    <div style={{fontSize:'14px', color:'#2e7d32', fontWeight:'bold', marginTop:'4px'}}>Total Acero: {(results.materials_computation.steel_weight_general_kg + results.materials_computation.steel_weight_bands_kg).toFixed(0)} kg</div>
                    {results.materials_computation.total_bars_6m && <div style={{fontSize:'13px', color:'#2e7d32'}}>Total varillas 6m: {results.materials_computation.total_bars_6m}</div>}
                  </div>
                </div>
              </div>
            )}
  
            {/* Tabla de Bandas */}
            {results.bands && (
              <div style={{padding:'20px 24px', overflowX:'auto'}}>
                <h4 style={{margin:'0 0 12px 0', color:'#333'}}><FaTable /> Tabla de Armado de Bandas</h4>
                <table className="coords-table" style={{minWidth:'720px', fontSize:'12px'}}>
                  <thead>
                    <tr style={{background:'#1e1e2f', color:'#fff'}}>
                      <th style={{color:'#fff'}}>Muro</th><th style={{color:'#fff'}}>Tipo</th>
                      <th style={{color:'#fff'}}>Ancho Banda</th>
                      <th style={{color:'#fff'}}>Mx (kgf·m/m)</th><th style={{color:'#fff'}}>My (kgf·m/m)</th>
                      <th style={{color:'#fff'}}>Asx (cm²/m)</th><th style={{color:'#fff'}}>Asy (cm²/m)</th>
                      <th style={{color:'#fff'}}>Prop. X</th><th style={{color:'#fff'}}>Prop. Y</th>
                      <th style={{color:'#fff'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.bands.map((b, i) => {
                      const asMin = results.As_min_cm2_m || 0;
                      const isMinX = b.Asx_cm2_m <= asMin + 0.01;
                      const isMinY = b.Asy_cm2_m <= asMin + 0.01;
                      const px = isMinX ? 'Malla General' : (b.bar_x?.diam_mm > 0 ? `Ø${b.bar_x.diam_mm}@${(b.bar_x.sep_m*100).toFixed(0)}cm` : 'Mínimo');
                      const py = isMinY ? 'Malla General' : (b.bar_y?.diam_mm > 0 ? `Ø${b.bar_y.diam_mm}@${(b.bar_y.sep_m*100).toFixed(0)}cm` : 'Mínimo');
                      
                      if (px !== 'Malla General' && py !== 'Malla General' && px === py) {
                        return (
                          <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                            <td>M{i+1}</td>
                            <td>
                              <span style={{
                                padding:'2px 6px', borderRadius:'3px', fontSize:'10px', 
                                background: b.type==='perimetral' ? '#ffebee' : (b.type==='losa' ? '#fff3e0' : (b.type==='parcela' ? '#f5f5f5' : '#e3f2fd')), 
                                color: b.type==='perimetral' ? '#c62828' : (b.type==='losa' ? '#e65100' : (b.type==='parcela' ? '#616161' : '#1565c0'))
                              }}>
                                {b.type==='perimetral' ? 'Perim.' : (b.type==='losa' ? 'Losa' : (b.type==='parcela' ? 'Parcela' : 'Interno'))}
                              </span>
                            </td>
                            <td>{b.band_width.toFixed(2)} m</td>
                            <td>{(b.Mx_design_kNm_m * 101.9716).toFixed(2)}</td>
                            <td>{(b.My_design_kNm_m * 101.9716).toFixed(2)}</td>
                            <td style={{fontWeight:'600'}}>{b.Asx_cm2_m.toFixed(2)}</td>
                            <td style={{fontWeight:'600'}}>{b.Asy_cm2_m.toFixed(2)}</td>
                            <td colSpan="2" style={{color:'#2e7d32', fontWeight:'bold', textAlign: 'center'}}>{px} (ambos sentidos)</td>
                            <td><span style={{color:'#2e7d32', fontWeight:'700'}}>✓</span></td>
                          </tr>
                        );
                      }
  
                      return (
                        <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                          <td>M{i+1}</td>
                          <td>
                            <span style={{
                              padding:'2px 6px', borderRadius:'3px', fontSize:'10px', 
                              background: b.type==='perimetral' ? '#ffebee' : (b.type==='losa' ? '#fff3e0' : (b.type==='parcela' ? '#f5f5f5' : '#e3f2fd')), 
                              color: b.type==='perimetral' ? '#c62828' : (b.type==='losa' ? '#e65100' : (b.type==='parcela' ? '#616161' : '#1565c0'))
                            }}>
                              {b.type==='perimetral' ? 'Perim.' : (b.type==='losa' ? 'Losa' : (b.type==='parcela' ? 'Parcela' : 'Interno'))}
                            </span>
                          </td>
                          <td>{b.band_width.toFixed(2)} m</td>
                          <td>{(b.Mx_design_kNm_m * 101.9716).toFixed(2)}</td>
                          <td>{(b.My_design_kNm_m * 101.9716).toFixed(2)}</td>
                          <td style={{fontWeight:'600'}}>{b.Asx_cm2_m.toFixed(2)}</td>
                          <td style={{fontWeight:'600'}}>{b.Asy_cm2_m.toFixed(2)}</td>
                          <td>{px}</td>
                          <td>{py}</td>
                          <td><span style={{color:'#2e7d32', fontWeight:'700'}}>✓</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
  
            {/* Tabla de Presupuesto */}
            {presupuesto.length > 0 && (
              <div style={{padding:'20px 24px', overflowX:'auto', background:'#fff'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                  <h4 style={{margin:0, color:'#333'}}><FaClipboardList /> Presupuesto Estimado</h4>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button className="btn-success" onClick={descargarMemoriaCalculoHtml} style={{background:'#1A6BB5', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                      <FaBook /> Memoria Estructural
                    </button>
                    <button className="btn-success" onClick={descargarComputosHtml} style={{background:'#673ab7', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                      <FaClipboardList /> Cómputos Métricos
                    </button>
                    <button className="btn-success" onClick={descargarExcel} style={{background:'#1976d2', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                      <FaFileExcel /> Excel Fórmulas
                    </button>
                    <button className="btn-success" onClick={descargarPDFPresupuesto} style={{background:'#2e7d32', display:'flex', alignItems:'center', gap:'8px', border:'none', padding:'8px 12px', borderRadius:'4px', color:'#fff', cursor:'pointer'}}>
                      <FaFilePdf /> Descargar PDF
                    </button>
                  </div>
                </div>
                <table className="coords-table" style={{minWidth:'720px', fontSize:'13px'}}>
                  <thead>
                    <tr style={{background:'#1e1e2f', color:'#fff'}}>
                      <th style={{color:'#fff', textAlign:'left'}}>Material</th>
                      <th style={{color:'#fff'}}>Unidad</th>
                      <th style={{color:'#fff'}}>Cantidad</th>
                      <th style={{color:'#fff'}}>P.U. ($)</th>
                      <th style={{color:'#fff', textAlign:'right'}}>Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Losa de Fundación', 'Mampostería', 'Machones'].map((chap) => {
                      const items = presupuesto.filter(p => p.chapter === chap);
                      if (items.length === 0) return null;
                      const subtotal = items.reduce((acc, it) => acc + it.total, 0);
                      return (
                        <React.Fragment key={chap}>
                          <tr style={{background:'#e3f2fd'}}>
                            <td colSpan="4" style={{fontWeight:'bold', color:'#0d47a1'}}>{chap}</td>
                            <td style={{textAlign:'right', fontWeight:'bold', color:'#0d47a1'}}>${subtotal.toFixed(2)}</td>
                          </tr>
                          {items.map((p, i) => (
                            <tr key={`${chap}-${i}`} style={{background: i % 2 === 0 ? '#f9f9f9' : '#fff'}}>
                              <td style={{textAlign:'left', fontWeight:'500', paddingLeft:'24px'}}>{p.material}</td>
                              <td>{p.unit}</td>
                              <td>{p.qty}</td>
                              <td>{p.pu.toFixed(2)}</td>
                              <td style={{textAlign:'right', fontWeight:'500'}}>${p.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#eeeeee'}}>
                      <td colSpan="4" style={{textAlign:'right', fontWeight:'bold', fontSize:'14px'}}>GRAN TOTAL:</td>
                      <td style={{textAlign:'right', fontWeight:'bold', fontSize:'16px', color:'#1b5e20'}}>${presupuestoTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
  
            {/* Footer */}
            <div style={{padding:'12px 24px', borderTop:'1px solid #eee', display:'flex', justifyContent:'flex-end', gap:'8px', background:'#fafafa', borderRadius:'0 0 12px 12px'}}>
              <button className="btn-secondary" onClick={downloadAuditJSON} style={{display:'flex', alignItems:'center', gap:'6px'}}><FaDownload /> JSON Auditoría MKS</button>
              <button className="btn-secondary" onClick={downloadHTML} style={{background:'#e3f2fd', borderColor:'#90caf9', display:'flex', alignItems:'center', gap:'6px'}}><FaFileCode /> Plano HTML</button>
              <button onClick={() => setShowResultsModal(false)} className="btn-success" style={{background:'#4caf50', border:'none', color:'#fff'}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
