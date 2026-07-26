import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

export function SlabCanvas({
  drawType, setDrawType,
  undo, historyPast,
  redo, historyFuture,
  mouseCoord,
  zoom, setZoom, resetZoom,
  colConfig, setColConfig,
  offsetDist, setOffsetDist, offsetSourceWall, setOffsetSourceWall, offsetPreview, setOffsetPreview,
  rotateAngle, setRotateAngle, rotatePivotMode, setRotatePivotMode, rotateSelectedIds, setRotateSelectedIds,
  getRotatedWalls, saveHistory, setInternalWalls,
  selectedElement, setSelectedElement,
  columns, setColumns,
  svgRef, panOffset, CANVAS_WIDTH, CANVAS_HEIGHT, isDrawing, handleMouseMove, handlePanStart, getSvgPx, toMetersX, toMetersY, setSelectionBox, isDraggingRef, isPanningRef, handlePanEnd, selectionBox, handleSvgDoubleClick, handleSvgClick, handleDrop, layers, params, scale, toSvg, MARGIN, gridStep, getPerimeterVertices, offset, allWalls, hoveredWallId, setHoveredWallId, openings, setHoveredOpeningId, hoveredOpeningId, drawStart, drawEnd, hudInputRef, hudInput, setHudInput, orthoLock, setDrawEnd, commitWall, setIsDrawing, setDrawStart, setOrthoLock, hudPos
}) {
  return (
    <div className="canvas-wrapper hybrid-canvas">
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <div style={{display:'flex', gap:'8px', marginLeft:'0px', border: '1px solid #ddd', padding: '4px', borderRadius: '6px', background: '#f5f5f5'}}>
            <button onClick={() => setDrawType(null)} title="Seleccionar / Soltar" style={{padding:'6px', borderRadius:'4px', border: !drawType ? '2px solid #333' : '1px solid transparent', background: !drawType ? '#e0e0e0' : 'transparent', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
            </button>
            <button onClick={() => setDrawType('parcela')} title="Parcela" style={{padding:'6px', borderRadius:'4px', border: drawType === 'parcela' ? '2px solid #555' : '1px solid transparent', background: drawType === 'parcela' ? '#fff' : 'transparent', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20" strokeDasharray="4 4" />
                <path d="M5 20l3-9" strokeDasharray="4 4" />
                <path d="M19 20l-3-9" strokeDasharray="4 4" />
                <path d="M8 11h8" strokeDasharray="4 4" />
                <path d="M10 17v-4h4v4" />
                <path d="M8 17v-6h8v6" />
                <path d="M7 11l5-5 5 5" />
              </svg>
            </button>
            <button onClick={() => setDrawType('losa')} title="Borde Losa" style={{padding:'6px', borderRadius:'4px', border: drawType === 'losa' ? '2px solid #757575' : '1px solid transparent', background: drawType === 'losa' ? '#fff' : 'transparent', color: '#757575', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.2" />
                <path d="M2 12v4l10 5 10-5v-4" />
              </svg>
            </button>
            <button onClick={() => setDrawType('perimetral')} title="Muro Perimetral" style={{padding:'6px', borderRadius:'4px', border: drawType === 'perimetral' ? '2px solid #e53935' : '1px solid transparent', background: drawType === 'perimetral' ? '#fff' : 'transparent', color: '#e53935', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="1" />
                <path d="M3 12h18" /><path d="M3 8.5h18" /><path d="M3 15.5h18" />
                <path d="M8 5v3.5" /><path d="M16 5v3.5" />
                <path d="M12 8.5V12" />
                <path d="M7 12v3.5" /><path d="M17 12v3.5" />
                <path d="M12 15.5V19" />
              </svg>
            </button>
            <button onClick={() => setDrawType('interno')} title="Muro Interno" style={{padding:'6px', borderRadius:'4px', border: drawType === 'interno' ? '2px solid #1e88e5' : '1px solid transparent', background: drawType === 'interno' ? '#fff' : 'transparent', color: '#1e88e5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
                <rect x="3" y="5" width="18" height="14" rx="1" />
                <path d="M3 12h18" /><path d="M3 8.5h18" /><path d="M3 15.5h18" />
                <path d="M8 5v3.5" /><path d="M16 5v3.5" />
                <path d="M12 8.5V12" />
                <path d="M7 12v3.5" /><path d="M17 12v3.5" />
                <path d="M12 15.5V19" />
              </svg>
            </button>
            <button onClick={() => setDrawType('columna')} title="Machón" style={{padding:'6px', borderRadius:'4px', border: drawType === 'columna' ? '2px solid #9c27b0' : '1px solid transparent', background: drawType === 'columna' ? '#fff' : 'transparent', color: '#9c27b0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 14l6-3 6 3v6l-6 3-6-3v-6z" />
                <path d="M6 14l6 3 6-3" />
                <path d="M12 17v7" />
                <path d="M10 12V2" />
                <path d="M14 12V2" />
                <path d="M8 5h8" />
                <path d="M8 9h8" />
              </svg>
            </button>
            <button onClick={() => setDrawType('retaining_wall')} title="Muro de Contención" style={{padding:'6px', borderRadius:'4px', border: drawType === 'retaining_wall' ? '2px solid #8d6e63' : '1px solid transparent', background: drawType === 'retaining_wall' ? '#fff' : 'transparent', color: '#8d6e63', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22V2h4v20H4z" fill="currentColor" fillOpacity="0.3"/>
                <path d="M8 22h8L12 12" />
              </svg>
            </button>
            <button onClick={() => setDrawType('support_beam')} title="Viga de Apoyo" style={{padding:'6px', borderRadius:'4px', border: drawType === 'support_beam' ? '2px solid #4caf50' : '1px solid transparent', background: drawType === 'support_beam' ? '#fff' : 'transparent', color: '#4caf50', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="10" width="20" height="4" rx="1" fill="currentColor" fillOpacity="0.3"/>
                <path d="M2 14v4h20v-4" />
              </svg>
            </button>
            {/* Herramienta Offset */}
            <button onClick={() => { setDrawType('offset'); setOffsetSourceWall(null); setOffsetPreview(null); }} title="Offset / Desfase Paralelo" style={{padding:'6px', borderRadius:'4px', border: drawType === 'offset' ? '2px solid #00897b' : '1px solid transparent', background: drawType === 'offset' ? '#fff' : 'transparent', color: '#00897b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16" />
                <path d="M4 12h12" strokeDasharray="3 2"/>
                <path d="M18 9l3 3-3 3" />
              </svg>
            </button>
            {/* Herramienta Rotar */}
            <button onClick={() => { setDrawType('rotate'); setRotateSelectedIds(new Set()); setRotateAngle(0); }} title="Rotar Elementos" style={{padding:'6px', borderRadius:'4px', border: drawType === 'rotate' ? '2px solid #e65100' : '1px solid transparent', background: drawType === 'rotate' ? '#fff' : 'transparent', color: '#e65100', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7a9 9 0 1 0 1 5" />
                <polyline points="20 2 20 7 15 7" />
              </svg>
            </button>
          </div>
          <div style={{display:'flex', gap:'4px', marginLeft:'12px'}}>
            <button onClick={undo} disabled={historyPast.length === 0} title="Deshacer" style={{padding:'4px 8px', cursor: historyPast.length === 0 ? 'not-allowed' : 'pointer', background:'#fff', border:'1px solid #ccc', borderRadius:'4px'}}><Undo2 size={16} color={historyPast.length === 0 ? '#ccc' : '#333'}/></button>
            <button onClick={redo} disabled={historyFuture.length === 0} title="Rehacer" style={{padding:'4px 8px', cursor: historyFuture.length === 0 ? 'not-allowed' : 'pointer', background:'#fff', border:'1px solid #ccc', borderRadius:'4px'}}><Redo2 size={16} color={historyFuture.length === 0 ? '#ccc' : '#333'}/></button>
          </div>
        </div>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <span className="mouse-tracker">📍 X: {mouseCoord.x.toFixed(1)}m, Y: {mouseCoord.y.toFixed(1)}m</span>
          {/* Botones de Zoom */}
          <div style={{display:'flex', gap:'3px', alignItems:'center', border:'1px solid #ddd', borderRadius:'6px', padding:'3px 6px', background:'#f5f5f5'}}>
            <button onClick={() => setZoom(z => Math.min(8, z * 1.3))} title="Acercar" style={{padding:'2px 7px', fontSize:'16px', fontWeight:'bold', background:'transparent', border:'none', cursor:'pointer', lineHeight:1}}>+</button>
            <button onClick={resetZoom} title="Restablecer zoom" style={{padding:'2px 6px', fontSize:'11px', background:'transparent', border:'none', cursor:'pointer', color:'#555', minWidth:'40px'}}>{Math.round(zoom*100)}%</button>
            <button onClick={() => setZoom(z => Math.max(0.5, z / 1.3))} title="Alejar" style={{padding:'2px 7px', fontSize:'16px', fontWeight:'bold', background:'transparent', border:'none', cursor:'pointer', lineHeight:1}}>−</button>
          </div>
        </div>
      </div>

      {drawType === 'columna' && (
        <div style={{display:'flex', gap:'12px', marginBottom: '10px', background: '#f3e5f5', padding: '8px', borderRadius: '6px', border: '1px solid #ce93d8'}}>
          <label style={{fontSize: '13px', color: '#6a1b9a'}}><strong>Configuración Machón:</strong></label>
          <label style={{fontSize: '13px'}}>Ancho (X) m: <input type="number" step="0.05" value={colConfig.width} onChange={e=>setColConfig({...colConfig, width: parseFloat(e.target.value)||0})} style={{width: '60px'}}/></label>
          <label style={{fontSize: '13px'}}>Largo (Y) m: <input type="number" step="0.05" value={colConfig.length} onChange={e=>setColConfig({...colConfig, length: parseFloat(e.target.value)||0})} style={{width: '60px'}}/></label>
          <label style={{fontSize: '13px'}}>Alto (Z) m: <input type="number" step="0.1" value={colConfig.height} onChange={e=>setColConfig({...colConfig, height: parseFloat(e.target.value)||0})} style={{width: '60px'}}/></label>
          <span style={{fontSize: '12px', color: '#6a1b9a', fontStyle: 'italic'}}>(Haz clic en el plano para ubicarlo)</span>
        </div>
      )}
      {drawType === 'offset' && (
        <div style={{display:'flex', gap:'14px', alignItems:'center', marginBottom: '10px', background: '#e0f2f1', padding: '8px 12px', borderRadius: '6px', border: '1px solid #80cbc4'}}>
          <span style={{fontSize: '13px', color: '#00695c', fontWeight: 700}}>📏 Offset — Distancia:</span>
          <input type="number" step="0.01" min="0.01" value={offsetDist}
            onChange={e => setOffsetDist(Math.max(0.01, parseFloat(e.target.value) || 0.15))}
            style={{width: '70px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #80cbc4', fontWeight: 700, color: '#00695c'}}
          />
          <span style={{fontSize: '12px', color: '#00695c'}}>m</span>
          <span style={{fontSize: '12px', color: '#555', fontStyle: 'italic'}}>
            {offsetSourceWall ? '✅ Muro seleccionado — mueve el cursor al lado deseado y haz clic para confirmar' : '👆 Haz clic sobre un muro para seleccionarlo'}
          </span>
          {offsetSourceWall && (
            <button onClick={() => { setOffsetSourceWall(null); setOffsetPreview(null); }}
              style={{marginLeft: 'auto', padding: '3px 10px', background: '#fff', border: '1px solid #80cbc4', borderRadius: '4px', cursor: 'pointer', color: '#00695c', fontSize: '12px'}}>
              Cancelar
            </button>
          )}
        </div>
      )}
      {drawType === 'rotate' && (
        <div style={{display:'flex', gap:'12px', alignItems:'center', marginBottom: '10px', background: '#fff3e0', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffcc80', flexWrap:'wrap'}}>
          <span style={{fontSize: '13px', color: '#e65100', fontWeight: 700}}>🔄 Rotar — Ángulo:</span>
          <input type="number" step="1" value={rotateAngle}
            onChange={e => setRotateAngle(parseFloat(e.target.value) || 0)}
            style={{width: '70px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #ffcc80', fontWeight: 700, color: '#e65100'}}
          />
          <span style={{fontSize: '12px', color: '#e65100'}}>grados (°)</span>
          <select value={rotatePivotMode} onChange={e => setRotatePivotMode(e.target.value)}
            style={{padding:'3px 6px', borderRadius:'4px', border:'1px solid #ffcc80', fontSize:'12px'}}>
            <option value="centroid">Pivote: Centroide selección</option>
            <option value="origin">Pivote: Origen (0,0)</option>
          </select>
          <span style={{fontSize: '12px', color: '#555', fontStyle:'italic'}}>
            {rotateSelectedIds.size === 0 ? '👆 Clic en muros para seleccionar (Shift+clic para multi-selección)' : `✅ ${rotateSelectedIds.size} muro(s) seleccionado(s)`}
          </span>
          {rotateSelectedIds.size > 0 && (
            <>
              <button
                onClick={() => {
                  const rotated = getRotatedWalls(rotateSelectedIds, rotateAngle);
                  if (rotated.length === 0) return;
                  saveHistory();
                  setInternalWalls(prev => prev.map(w => {
                    const r = rotated.find(rw => rw.id === w.id);
                    return r || w;
                  }));
                  setRotateSelectedIds(new Set());
                  setRotateAngle(0);
                }}
                style={{padding: '4px 12px', background: '#e65100', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '13px'}}>
                Aplicar ↺
              </button>
              <button onClick={() => { setRotateSelectedIds(new Set()); setRotateAngle(0); }}
                style={{padding: '4px 10px', background: '#fff', border: '1px solid #ffcc80', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', color: '#e65100'}}>
                Limpiar
              </button>
            </>
          )}
        </div>
      )}
      
      {selectedElement && selectedElement.type === 'columna' && (
        <div style={{display:'flex', gap:'12px', marginBottom: '10px', background: '#fff9c4', padding: '8px', borderRadius: '6px', border: '1px solid #fbc02d', alignItems: 'center'}}>
          <label style={{fontSize: '13px', color: '#f57f17'}}><strong>Machón Seleccionado:</strong></label>
          {(() => {
            const c = columns.find(col => col.id === selectedElement.id);
            if (!c) return null;
            return (
              <>
                <label style={{fontSize: '13px'}}>Pos X (m): <input type="number" step="0.01" value={c.x.toFixed(2)} onChange={e=>{
                  const nx = parseFloat(e.target.value);
                  setColumns(columns.map(col => col.id === c.id ? {...col, x: isNaN(nx) ? c.x : nx} : col));
                }} style={{width: '60px'}}/></label>
                <label style={{fontSize: '13px'}}>Pos Y (m): <input type="number" step="0.01" value={c.y.toFixed(2)} onChange={e=>{
                  const ny = parseFloat(e.target.value);
                  setColumns(columns.map(col => col.id === c.id ? {...col, y: isNaN(ny) ? c.y : ny} : col));
                }} style={{width: '60px'}}/></label>
                <span style={{fontSize: '12px', color: '#f57f17', marginLeft: 'auto'}}>(Presiona <b>Suprimir</b> para eliminar)</span>
              </>
            );
          })()}
        </div>
      )}
      
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`${-panOffset.x * zoom} ${-panOffset.y * zoom} ${CANVAS_WIDTH / zoom} ${CANVAS_HEIGHT / zoom}`}
        className={`drawing-board ${isDrawing ? 'drawing-mode' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) { handlePanStart(e); return; }
          if (!drawType) {
            const { px, py } = getSvgPx(e, svgRef.current);
            const mx = toMetersX(px, false);
            const my = toMetersY(py, false);
            setSelectionBox({ startX: mx, startY: my, currentX: mx, currentY: my });
            isDraggingRef.current = false;
          }
        }}
        onMouseUp={(e) => {
          if (isPanningRef.current) { handlePanEnd(); return; }
          if (selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.currentX);
            const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
            const minY = Math.min(selectionBox.startY, selectionBox.currentY);
            const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
            if (isDraggingRef.current) {
              const foundCols = columns.filter(c => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY);
              if (foundCols.length > 0) {
                setSelectedElement({ type: 'columna', id: foundCols[0].id });
              } else {
                setSelectedElement(null);
              }
            }
            setSelectionBox(null);
          }
        }}
        onDoubleClick={(e) => { if (!drawType && (e.ctrlKey || e.metaKey || zoom !== 1)) { resetZoom(); return; } handleSvgDoubleClick(e); }}
        onClick={handleSvgClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ cursor: isPanningRef.current ? 'grabbing' : (isDrawing ? 'crosshair' : (drawType === 'columna' ? 'crosshair' : 'pointer')), userSelect: 'none', touchAction: 'none' }}
      >
        <g id="viewport-matrix-reference" />
        {/* ===== CAPAS: Imágenes de fondo ===== */}
        {layers.filter(l => l.visible && l.image).map(layer => (
          <image
            key={`bg-${layer.id}`}
            href={layer.image}
            x={toSvg(0)} y={toSvg(0)}
            width={params.Lx * scale}
            height={params.Ly * scale}
            opacity={layer.opacity}
            preserveAspectRatio="none"
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* Ejes X (Ruler Top) */}
        <rect x={0} y={0} width={CANVAS_WIDTH} height={MARGIN-5} fill="#f0f0f0" />
        {Array.from({ length: Math.floor(params.Lx) + 1 }).map((_, i) => (
          <g key={`rx${i}`}>
            <line x1={toSvg(i)} y1={MARGIN-5} x2={toSvg(i)} y2={MARGIN} stroke="#333" strokeWidth="1.5" />
            <text x={toSvg(i)} y={MARGIN-10} fontSize="10" textAnchor="middle" fill="#555">{i}</text>
          </g>
        ))}

        {/* Ejes Y (Ruler Left) */}
        <rect x={0} y={0} width={MARGIN-5} height={CANVAS_HEIGHT} fill="#f0f0f0" />
        {Array.from({ length: Math.floor(params.Ly) + 1 }).map((_, i) => (
          <g key={`ry${i}`}>
            <line x1={MARGIN-5} y1={toSvg(i)} x2={MARGIN} y2={toSvg(i)} stroke="#333" strokeWidth="1.5" />
            <text x={MARGIN-10} y={toSvg(i)+3} fontSize="10" textAnchor="end" fill="#555">{i}</text>
          </g>
        ))}

        {/* Grid Mayor (1m) e Intenso */}
        {Array.from({ length: Math.floor(params.Lx) + 1 }).map((_, i) => (
          <line key={`vx${i}`} x1={toSvg(i)} y1={MARGIN} x2={toSvg(i)} y2={toSvg(params.Ly)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
        ))}
        {Array.from({ length: Math.floor(params.Ly) + 1 }).map((_, i) => (
          <line key={`vy${i}`} x1={MARGIN} y1={toSvg(i)} x2={toSvg(params.Lx)} y2={toSvg(i)} stroke="#b0bec5" strokeWidth="1.5" opacity="0.6" />
        ))}
        
        {/* Grid Menor (Depende de gridStep) */}
        {gridStep > 0 && Array.from({ length: Math.floor(params.Lx / gridStep) + 1 }).map((_, i) => {
          const val = i * gridStep;
          // Evitar superponer sobre la linea mayor (1m) para mantener la jerarquía visual
          if (Math.abs(val % 1) < 0.001) return null;
          return <line key={`vx_sub${i}`} x1={toSvg(val)} y1={MARGIN} x2={toSvg(val)} y2={toSvg(params.Ly)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />;
        })}
        {gridStep > 0 && Array.from({ length: Math.floor(params.Ly / gridStep) + 1 }).map((_, i) => {
          const val = i * gridStep;
          if (Math.abs(val % 1) < 0.001) return null;
          return <line key={`vy_sub${i}`} x1={MARGIN} y1={toSvg(val)} x2={toSvg(params.Lx)} y2={toSvg(val)} stroke="#cfd8dc" strokeWidth="1" strokeDasharray="4,4" />;
        })}

        {/* Parcela Boundary (Visual Fijo) */}
        {(() => {
          const boundaryPts = getPerimeterVertices(0);
          if (boundaryPts.length === 0) return null;
          const pointsStr = boundaryPts.map(p => `${toSvg(p.x)},${toSvg(p.y)}`).join(' ');
          return (
            <polygon 
              points={pointsStr} 
              fill="rgba(255, 152, 0, 0.08)" 
              stroke="#ff9800" 
              strokeWidth="2" 
              strokeDasharray="6,4" 
              pointerEvents="none"
            />
          );
        })()}

        {/* Losa Boundary (Visual Fijo) */}
        {(() => {
          const numOffset = parseFloat(offset) || 0;
          if (numOffset <= 0) return null;
          const losaPts = getPerimeterVertices(numOffset);
          if (losaPts.length === 0) return null;
          const pointsStr = losaPts.map(p => `${toSvg(p.x)},${toSvg(p.y)}`).join(' ');
          return (
            <polygon 
              points={pointsStr} 
              fill="rgba(158, 158, 158, 0.1)" 
              stroke="#9e9e9e" 
              strokeWidth="2" 
              strokeDasharray="4,2" 
              pointerEvents="none"
            />
          );
        })()}

        {/* Render Columnas */}
        {columns.map(c => {
          const isSel = selectedElement && selectedElement.type === 'columna' && selectedElement.id === c.id;
          return (
          <g key={c.id} style={{cursor: 'pointer'}} 
             onMouseDown={(e) => e.stopPropagation()}
             onClick={(e) => { 
               e.stopPropagation(); 
               setSelectedElement({ type: 'columna', id: c.id }); 
               setDrawType(null);
             }}
             onDoubleClick={(e) => { e.stopPropagation(); saveHistory(); setColumns(columns.filter(col => col.id !== c.id)); setSelectedElement(null); }} 
             title="Clic para seleccionar y presionar Suprimir. Doble clic para eliminar rápido">
            <rect 
              x={toSvg(c.x - c.width/2)} 
              y={toSvg(c.y - c.length/2)} 
              width={c.width * scale} 
              height={c.length * scale} 
              fill={isSel ? "#e1bee7" : "#9c27b0"} stroke={isSel ? "#d50000" : "#7b1fa2"} strokeWidth={isSel ? "3" : "2"} 
            />
            <text x={toSvg(c.x)} y={toSvg(c.y - c.length/2) - 5} fontSize="10" textAnchor="middle" fill={isSel ? "#d50000" : "#9c27b0"} fontWeight="bold">C{String(c.id).slice(-3)}</text>
          </g>
        )})}

        {/* Render Selection Box */}
        {selectionBox && isDraggingRef.current && (
          <rect 
            x={toSvg(Math.min(selectionBox.startX, selectionBox.currentX))}
            y={toSvg(Math.min(selectionBox.startY, selectionBox.currentY))}
            width={(Math.max(selectionBox.startX, selectionBox.currentX) - Math.min(selectionBox.startX, selectionBox.currentX)) * scale}
            height={(Math.max(selectionBox.startY, selectionBox.currentY) - Math.min(selectionBox.startY, selectionBox.currentY)) * scale}
            fill="rgba(33, 150, 243, 0.2)"
            stroke="#2196f3"
            strokeWidth="1"
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
        
        {/* Muros y Líneas */}
        {allWalls.map(w => {
          const isHovered = hoveredWallId === w.id;
          let strokeColor = '#1e88e5'; // interno
          if (w.type === 'perimetral') strokeColor = '#e53935';
          if (w.type === 'losa') strokeColor = '#757575';
          if (w.type === 'parcela') strokeColor = '#9e9e9e';
          if (w.type === 'retaining_wall') strokeColor = '#8d6e63';
          if (w.type === 'support_beam') strokeColor = '#4caf50';
          
          const isSel = selectedElement && selectedElement.type === 'muro' && selectedElement.id === w.id;
          
          if (isSel) strokeColor = '#9c27b0'; // seleccionado
          else if (drawType === 'rotate' && rotateSelectedIds.has(w.id)) strokeColor = '#e65100'; // seleccionado para rotar
          else if (drawType === 'offset' && offsetSourceWall && offsetSourceWall.id === w.id) strokeColor = '#ff9800'; // seleccionado para offset
          else if (isHovered) strokeColor = '#4caf50';

          const isLineOnly = w.type === 'losa' || w.type === 'parcela';
          // Grosor de línea de los muros ajustado (más delgado)
          const strokeW = isLineOnly ? (isHovered ? 4 : 2) : Math.max(isHovered ? 5 : 3, ((w.thickness || 0.15) * scale) * 0.5);
          const strokeDash = w.type === 'parcela' ? '6,6' : 'none';

          return (
          <g key={w.id} 
             onMouseEnter={() => setHoveredWallId(w.id)}
             onMouseLeave={() => setHoveredWallId(null)}
             style={{ cursor: drawType === 'offset' ? 'copy' : drawType === 'rotate' ? 'cell' : 'pointer' }}
             onClick={e => {
               if (drawType === 'offset') {
                 e.stopPropagation();
                 setOffsetSourceWall(w);
                 setOffsetPreview(null);
               } else if (drawType === 'rotate') {
                 e.stopPropagation();
                 setRotateSelectedIds(prev => {
                   const next = new Set(prev);
                   if (next.has(w.id)) next.delete(w.id);
                   else next.add(w.id);
                   return next;
                 });
               }
             }}
          >
              {isHovered && (
                <line 
                  x1={toSvg(w.x1)} y1={toSvg(w.y1)} 
                  x2={toSvg(w.x2)} y2={toSvg(w.y2)} 
                  stroke="#ffe0b2" 
                  strokeWidth={strokeW + 6} strokeLinecap="round" 
                />
              )}
              <line 
                x1={toSvg(w.x1)} y1={toSvg(w.y1)} 
                x2={toSvg(w.x2)} y2={toSvg(w.y2)} 
                stroke={strokeColor} 
                strokeWidth={strokeW} strokeLinecap="round" 
                strokeDasharray={strokeDash}
              />
              {openings.filter(op => op.wall_id === w.id).map(op => {
                const len = Math.sqrt((w.x2-w.x1)**2 + (w.y2-w.y1)**2);
                if (len < 0.01) return null;
                const t1 = op.start_m / len;
                const t2 = Math.min((op.start_m + op.width_m) / len, 1);
                const ox1 = toSvg(w.x1 + t1 * (w.x2 - w.x1));
                const oy1 = toSvg(w.y1 + t1 * (w.y2 - w.y1));
                const ox2 = toSvg(w.x1 + t2 * (w.x2 - w.x1));
                const oy2 = toSvg(w.y1 + t2 * (w.y2 - w.y1));
                
                const thickPx = Math.max(4, w.thickness * scale);
                const w_px = Math.sqrt((ox2-ox1)**2 + (oy2-oy1)**2);
                if (w_px < 1) return null;

                let p1x = ox1, p1y = oy1;
                let p2x = ox2, p2y = oy2;
                // Ensure p1 is always to the "left" or "top" of p2 to match icon spatial orientation
                if (p1x > p2x || (Math.abs(p1x - p2x) < 0.001 && p1y > p2y)) {
                  p1x = ox2; p1y = oy2;
                  p2x = ox1; p2y = oy1;
                }

                // Unit vector along wall (in SVG coords), forced L-to-R or T-to-B
                const ux = (p2x-p1x)/w_px;
                const uy = (p2y-p1y)/w_px;
                // Perpendicular: always points "UP" for horizontal walls, or "RIGHT" for vertical walls
                let vx = uy;
                let vy = -ux;

                if (op.type.startsWith('door')) {
                  const isLeft = op.type.includes('left');
                  const isOut = op.type.includes('out');
                  
                  if (isOut) {
                    vx = -vx;
                    vy = -vy;
                  }

                  // Hinge point and free end
                  const hx = isLeft ? p1x : p2x;
                  const hy = isLeft ? p1y : p2y;
                  const ex = isLeft ? p2x : p1x;
                  const ey = isLeft ? p2y : p1y;
                  // Leaf swings toward interior
                  const lx = hx + vx * w_px;
                  const ly = hy + vy * w_px;
                  // Arc sweep: in SVG Y-down, we need to determine CW vs CCW
                  // Bulletproof sweep flag: cross product of vectors HL and HE
                  const hl_x = lx - hx;
                  const hl_y = ly - hy;
                  const he_x = ex - hx;
                  const he_y = ey - hy;
                  const cross = (hl_x * he_y) - (hl_y * he_x);
                  const sweep = cross > 0 ? 1 : 0;
                  
                  const isOpHovered = hoveredOpeningId === op.id;
                  return (
                    <g key={op.id} onMouseEnter={() => setHoveredOpeningId(op.id)} onMouseLeave={() => setHoveredOpeningId(null)} style={{cursor: 'pointer'}}>
                      <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#fafafa" strokeWidth={thickPx + 2} strokeLinecap="butt" />
                      <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={isOpHovered ? "#ff9800" : "#222"} strokeWidth={isOpHovered ? "3.5" : "2.5"} strokeLinecap="square" />
                      <path d={`M ${lx.toFixed(1)} ${ly.toFixed(1)} A ${w_px.toFixed(1)} ${w_px.toFixed(1)} 0 0 ${sweep} ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill={isOpHovered ? "rgba(255,152,0,0.1)" : "none"} stroke={isOpHovered ? "#ff9800" : "#444"} strokeWidth={isOpHovered ? "2.5" : "1.5"} strokeDasharray="5,3" />
                    </g>
                  );
                } else {
                  // Window: double glass lines
                  const gap = thickPx * 0.35;
                  const isOpHovered = hoveredOpeningId === op.id;
                  const winColor = isOpHovered ? "#ff9800" : "#5bc0de";
                  const glassColor = isOpHovered ? "#ffb74d" : "#333";
                  return (
                    <g key={op.id} onMouseEnter={() => setHoveredOpeningId(op.id)} onMouseLeave={() => setHoveredOpeningId(null)} style={{cursor: 'pointer'}}>
                      <line x1={ox1} y1={oy1} x2={ox2} y2={oy2} stroke="#fafafa" strokeWidth={thickPx + 2} strokeLinecap="butt" />
                      <line x1={ox1 + vx*gap} y1={oy1 + vy*gap} x2={ox2 + vx*gap} y2={oy2 + vy*gap} stroke={glassColor} strokeWidth="1.2" />
                      <line x1={ox1 - vx*gap} y1={oy1 - vy*gap} x2={ox2 - vx*gap} y2={oy2 - vy*gap} stroke={glassColor} strokeWidth="1.2" />
                      <line x1={ox1 + vx*2} y1={oy1 + vy*2} x2={ox2 + vx*2} y2={oy2 + vy*2} stroke={winColor} strokeWidth={isOpHovered ? "3" : "2"} />
                      <line x1={ox1 - vx*2} y1={oy1 - vy*2} x2={ox2 - vx*2} y2={oy2 - vy*2} stroke={winColor} strokeWidth={isOpHovered ? "3" : "2"} />
                    </g>
                  );
                }
              })}
            </g>
          );
        })}

        {/* Pre-visualización de Muro dibujándose */}
        {isDrawing && drawStart && drawEnd && (
          <line 
            x1={toSvg(drawStart.x)} y1={toSvg(drawStart.y)}
            x2={toSvg(drawEnd.x)} y2={toSvg(drawEnd.y)}
            stroke="#ff9800" strokeWidth="4" strokeDasharray="5,5" strokeLinecap="round"
          />
        )}

        {/* Pre-visualización Offset */}
        {drawType === 'offset' && offsetPreview && (
          <>
            {/* Línea paralela preview */}
            <line
              x1={toSvg(offsetPreview.x1)} y1={toSvg(offsetPreview.y1)}
              x2={toSvg(offsetPreview.x2)} y2={toSvg(offsetPreview.y2)}
              stroke="#00897b" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round"
            />
            {/* Líneas de cota (distancia visual) */}
            {offsetSourceWall && (
              <>
                <line
                  x1={toSvg((offsetSourceWall.x1 + offsetSourceWall.x2)/2)}
                  y1={toSvg((offsetSourceWall.y1 + offsetSourceWall.y2)/2)}
                  x2={toSvg((offsetPreview.x1 + offsetPreview.x2)/2)}
                  y2={toSvg((offsetPreview.y1 + offsetPreview.y2)/2)}
                  stroke="#00897b" strokeWidth="1.5" strokeDasharray="3,3"
                />
                <text
                  x={toSvg(((offsetSourceWall.x1 + offsetSourceWall.x2)/2 + (offsetPreview.x1 + offsetPreview.x2)/2) / 2)}
                  y={toSvg(((offsetSourceWall.y1 + offsetSourceWall.y2)/2 + (offsetPreview.y1 + offsetPreview.y2)/2) / 2) - 6}
                  fontSize="11" fill="#00695c" fontWeight="bold" textAnchor="middle"
                >
                  {offsetDist.toFixed(2)}m
                </text>
              </>
            )}
          </>
        )}

        {/* Pre-visualización Rotación */}
        {drawType === 'rotate' && rotateSelectedIds.size > 0 && rotateAngle !== 0 && (
          <g style={{ pointerEvents: 'none' }}>
            {getRotatedWalls(rotateSelectedIds, rotateAngle).map((rw, i) => (
              <line
                key={`rot-prev-${i}`}
                x1={toSvg(rw.x1)} y1={toSvg(rw.y1)}
                x2={toSvg(rw.x2)} y2={toSvg(rw.y2)}
                stroke="#ff9800" strokeWidth="3" strokeDasharray="5,5" strokeLinecap="round" opacity="0.8"
              />
            ))}
          </g>
        )}

        {/* Punto indicador de Snap Mouse */}
        <circle cx={toSvg(mouseCoord.x)} cy={toSvg(mouseCoord.y)} r="4" fill="#ff9800" />

      </svg>
      {/* HUD: input flotante de precisión */}
      {isDrawing && drawStart && (
        <input
          ref={hudInputRef}
          type="number"
          step="0.01"
          min="0"
          value={hudInput}
          onChange={e => {
            const val = e.target.value;
            setHudInput(val);
            const len = parseFloat(val);
            if (!isNaN(len) && len > 0 && drawEnd) {
              // Calcular dirección actual del cursor
              let angle = Math.atan2(drawEnd.y - drawStart.y, drawEnd.x - drawStart.x);
              if (orthoLock) {
                angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
              }
              setDrawEnd({
                x: drawStart.x + Math.cos(angle) * len,
                y: drawStart.y + Math.sin(angle) * len
              });
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              commitWall();
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              setIsDrawing(false);
              setDrawStart(null);
              setDrawEnd(null);
              setHudInput('');
              setOrthoLock(false);
              setDrawType(null);
            }
          }}
          placeholder="Longitud (m)"
          style={{
            position: 'fixed',
            left: hudPos.x,
            top: hudPos.y,
            width: '110px',
            padding: '4px 8px',
            background: 'rgba(15,25,45,0.92)',
            border: '1px solid #ff9800',
            borderRadius: '6px',
            color: '#ff9800',
            fontSize: '13px',
            fontWeight: 'bold',
            outline: 'none',
            zIndex: 9999,
            pointerEvents: 'auto',
            fontFamily: 'monospace',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}
        />
      )}
      {isDrawing && (
        <div className="drawing-hint">
          {orthoLock ? '🔒 Ortho ON (Shift)' : '📐 Libre'}
          {' · '}
          {drawEnd && drawStart ? `L = ${Math.sqrt((drawEnd.x - drawStart.x)**2 + (drawEnd.y - drawStart.y)**2).toFixed(2)} m` : ''}
          {' · '}
          Escribe la longitud exacta y presiona <strong>Enter</strong>. Doble clic para fijar. <strong>ESC</strong> para cancelar.
        </div>
      )}
    </div>
  );
}
