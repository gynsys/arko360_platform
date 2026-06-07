import React from 'react';

// ==================== SVG RETÍCULA ====================
export const renderGrid = (grid, calc, losaActiva, steelDeckConfig, aligeradaConfig, onCeldasToggle) => {
  const { filas, cols, luzX: defaultLuzX, luzY: defaultLuzY } = grid;
  const nTramosX = Math.max(Math.floor(cols) - 1, 1);
  const nTramosY = Math.max(Math.floor(filas) - 1, 1);
  
  const arrX = grid.lucesX || Array(nTramosX).fill(defaultLuzX || 4.5);
  const arrY = grid.lucesY || Array(nTramosY).fill(defaultLuzY || 4.0);

  const totalW = arrX.slice(0, nTramosX).reduce((a, b) => a + b, 0);
  const totalH = arrY.slice(0, nTramosY).reduce((a, b) => a + b, 0);

  const svgW = 720;
  const svgH = 520;
  const mL = 80;
  const mR = 40;
  const mT = 50;
  const mB = 60;

  const scale = Math.min((svgW - mL - mR) / totalW, (svgH - mT - mB) / totalH);

  const ox = mL + (svgW - mL - mR - totalW * scale) / 2;
  const oy = mT + (svgH - mT - mB - totalH * scale) / 2;

  // Compute accumulated X and Y coordinates for lines
  const cx = [ox];
  for(let i=0; i<nTramosX; i++) cx.push(cx[i] + arrX[i]*scale);
  const cy = [oy];
  for(let i=0; i<nTramosY; i++) cy.push(cy[i] + arrY[i]*scale);

  const apoyos = [];
  for (let r = 0; r <= nTramosY; r++) {
    for (let c = 0; c <= nTramosX; c++) {
      apoyos.push({ x: cx[c], y: cy[r], id: `${r}-${c}` });
    }
  }

  // Combinar aberturas explícitas con celdas vacías del perímetro
  const allAberturas = [...(grid.aberturas || [])];
  if (grid.celdas) {
    grid.celdas.forEach(c => {
      if (c.tipo === 'vacio' && c.r < nTramosY && c.c < nTramosX) {
        const ax = arrX.slice(0, c.c).reduce((sum, val) => sum + val, 0);
        const ayFromTop = arrY.slice(0, c.r).reduce((sum, val) => sum + val, 0);
        const yFromBottom = totalH - (ayFromTop + arrY[c.r]);
        allAberturas.push({ 
          id: `vac-${c.r}-${c.c}`, 
          tipo: 'vacio', 
          x: ax, y: yFromBottom, w: arrX[c.c], h: arrY[c.r] 
        });
      }
    });
  }

  // Elementos de steel deck: correas y vigas principales
  const correasElements = [];
  const vigasElements = [];
  const studsElements = [];

  if (losaActiva === 'colaborante') {
    const sepReal = calc.steelDeckData?.sepReal || steelDeckConfig?.sepCorreas || 1.5;
    const sepPx = sepReal * scale;

    const correasHorizontales = (totalW / nTramosX) < (totalH / nTramosY);

    const isCellVacio = (r, c) => grid.celdas?.some(cell => cell.r === r && cell.c === c && cell.tipo === 'vacio');

    if (correasHorizontales) {
      // 1. DIBUJAR CORREAS HORIZONTALES (celda por celda)
      for (let r = 0; r < nTramosY; r++) {
        const yStart = cy[r];
        const luzTramoY = arrY[r];
        const nEspacios = Math.ceil(luzTramoY / (calc.steelDeckData?.sepCorreas || steelDeckConfig?.sepCorreas || 1.5));
        const numCorreas = Math.max(0, nEspacios - 1);
        const sepPxLocal = (luzTramoY * scale) / nEspacios;
        
        for (let k = 1; k <= numCorreas; k++) {
          const y = yStart + k * sepPxLocal;
          for (let c = 0; c < nTramosX; c++) {
            if (!isCellVacio(r, c)) {
              correasElements.push(
                <line key={`cx-${r}-${c}-${k}`} x1={cx[c]} y1={y} x2={cx[c+1]} y2={y} stroke="#8e44ad" strokeWidth="3" strokeDasharray="4,2" opacity="0.8" />
              );
            }
          }
        }
      }

      // 2. DIBUJAR VIGAS PRINCIPALES Y SECUNDARIAS
      // Vigas Principales en Y (verticales)
      for (let c = 0; c <= nTramosX; c++) {
        for (let r = 0; r < nTramosY; r++) {
          if (!isCellVacio(r, c - 1) || !isCellVacio(r, c)) {
            vigasElements.push(
              <line key={`vpy-main-${r}-${c}`} x1={cx[c]} y1={cy[r]} x2={cx[c]} y2={cy[r+1]} stroke="#2c3e50" strokeWidth="6" opacity="0.95" />
            );
          }
        }
      }
      // Vigas Secundarias en X (horizontales)
      for (let r = 0; r <= nTramosY; r++) {
        for (let c = 0; c < nTramosX; c++) {
          if (!isCellVacio(r - 1, c) || !isCellVacio(r, c)) {
            vigasElements.push(
              <line key={`vpx-sec-${r}-${c}`} x1={cx[c]} y1={cy[r]} x2={cx[c+1]} y2={cy[r]} stroke="#7f8c8d" strokeWidth="4" opacity="0.85" />
            );
          }
        }
      }
    } else {
      // 1. DIBUJAR CORREAS VERTICALES
      for (let c = 0; c < nTramosX; c++) {
        const xStart = cx[c];
        const luzTramoX = arrX[c];
        const nEspacios = Math.ceil(luzTramoX / (calc.steelDeckData?.sepCorreas || steelDeckConfig?.sepCorreas || 1.5));
        const numCorreas = Math.max(0, nEspacios - 1);
        const sepPxLocal = (luzTramoX * scale) / nEspacios;
        
        for (let k = 1; k <= numCorreas; k++) {
          const x = xStart + k * sepPxLocal;
          for (let r = 0; r < nTramosY; r++) {
            if (!isCellVacio(r, c)) {
              correasElements.push(
                <line key={`cy-${r}-${c}-${k}`} x1={x} y1={cy[r]} x2={x} y2={cy[r+1]} stroke="#8e44ad" strokeWidth="3" strokeDasharray="4,2" opacity="0.8" />
              );
            }
          }
        }
      }

      // 2. DIBUJAR VIGAS PRINCIPALES Y SECUNDARIAS
      // Vigas Principales en X (horizontales)
      for (let r = 0; r <= nTramosY; r++) {
        for (let c = 0; c < nTramosX; c++) {
          if (!isCellVacio(r - 1, c) || !isCellVacio(r, c)) {
            vigasElements.push(
              <line key={`vpx-main-${r}-${c}`} x1={cx[c]} y1={cy[r]} x2={cx[c+1]} y2={cy[r]} stroke="#2c3e50" strokeWidth="6" opacity="0.95" />
            );
          }
        }
      }
      // Vigas Secundarias en Y (verticales)
      for (let c = 0; c <= nTramosX; c++) {
        for (let r = 0; r < nTramosY; r++) {
          if (!isCellVacio(r, c - 1) || !isCellVacio(r, c)) {
            vigasElements.push(
              <line key={`vpy-sec-${r}-${c}`} x1={cx[c]} y1={cy[r]} x2={cx[c]} y2={cy[r+1]} stroke="#7f8c8d" strokeWidth="4" opacity="0.85" />
            );
          }
        }
      }
    }

    // 3. DIBUJAR FLECHAS DE SENTIDO DE ARMADO
    for (let i = 0; i < nTramosX; i++) {
      for (let j = 0; j < nTramosY; j++) {
        const cxC = cx[i] + (arrX[i] * scale) / 2;
        const cyC = cy[j] + (arrY[j] * scale) / 2;

        const isVacio = grid.celdas?.some(c => c.r === j && c.c === i && c.tipo === 'vacio');
        if (isVacio) continue;

        if (correasHorizontales) {
          studsElements.push(
            <g key={`arrow-${i}-${j}`} stroke="#3498db" strokeWidth="2.5" fill="none" opacity="0.85">
              <line x1={cxC} y1={cyC - 22} x2={cxC} y2={cyC + 22} />
              <polyline points={`${cxC - 6},${cyC - 16} ${cxC},${cyC - 22} ${cxC + 6},${cyC - 16}`} />
              <polyline points={`${cxC - 6},${cyC + 16} ${cxC},${cyC + 22} ${cxC + 6},${cyC + 16}`} />
              <circle cx={cxC} cy={cyC} r="3" fill="#3498db" />
              <text x={cxC} y={cyC + 34} stroke="none" fill="#2980b9" fontSize="9" fontWeight="bold" textAnchor="middle">
                ARMADO LOSA
              </text>
            </g>
          );
        } else {
          studsElements.push(
            <g key={`arrow-${i}-${j}`} stroke="#3498db" strokeWidth="2.5" fill="none" opacity="0.85">
              <line x1={cxC - 22} y1={cyC} x2={cxC + 22} y2={cyC} />
              <polyline points={`${cxC - 16},${cyC - 6} ${cxC - 22},${cyC} ${cxC - 16},${cyC + 6}`} />
              <polyline points={`${cxC + 16},${cyC - 6} ${cxC + 22},${cyC} ${cxC + 16},${cyC + 6}`} />
              <circle cx={cxC} cy={cyC} r="3" fill="#3498db" />
              <text x={cxC} y={cyC - 12} stroke="none" fill="#2980b9" fontSize="9" fontWeight="bold" textAnchor="middle">
                ARMADO LOSA
              </text>
            </g>
          );
        }
      }
    }
    // 4. CONECTORES DE CORTE (studs) - Removida representación en planta por solicitud del usuario
  }

  const aberturasMasks = [];
  const aberturasGraphics = [];
  
  allAberturas.forEach(ab => {
    const vx = ox + ab.x * scale;
    const vy = (oy + totalH * scale) - (ab.y + ab.h) * scale;
    const vw = ab.w * scale;
    const vh = ab.h * scale;

    // 1. Máscara para tapar los nervios/correas/diagramas debajo (va ANTES que las vigas)
    aberturasMasks.push(
      <rect key={`mask-${ab.id}`} x={vx} y={vy} width={vw} height={vh} fill="#fafbfc" stroke="none" />
    );

    // 2. Si es colaborante, vigas de borde/cabezal (va DESPUÉS de las vigas, en gráficos)
    if (losaActiva === 'colaborante' && ab.tipo !== 'vacio') {
      aberturasGraphics.push(
        <rect key={`beam-${ab.id}`} x={vx} y={vy} width={vw} height={vh} fill="none" stroke="#2c3e50" strokeWidth="2.5" />
      );
    }

    // 3. Dibujar gráficos específicos del tipo de abertura
    if (ab.tipo === 'hueco') {
      aberturasGraphics.push(
        <g key={`graf-${ab.id}`}>
          <rect x={vx} y={vy} width={vw} height={vh} fill="#ecf0f1" opacity="0.8" stroke="#bdc3c7" strokeWidth="1" />
          <line x1={vx} y1={vy} x2={vx + vw} y2={vy + vh} stroke="#bdc3c7" strokeWidth="2" />
          <line x1={vx + vw} y1={vy} x2={vx} y2={vy + vh} stroke="#bdc3c7" strokeWidth="2" />
          <text x={vx + vw/2} y={vy + vh/2 + 4} fill="#7f8c8d" fontSize="10" fontWeight="bold" textAnchor="middle">HUECO</text>
        </g>
      );
    } else if (ab.tipo === 'escalera_recta' || ab.tipo === 'escalera_l') {
      const isL = ab.tipo === 'escalera_l';
      aberturasGraphics.push(
        <g key={`graf-${ab.id}`}>
          <rect x={vx} y={vy} width={vw} height={vh} fill="#fdebd0" opacity="0.9" stroke="#e67e22" strokeWidth="1" />
          {/* Líneas de gradas */}
          {Array.from({length: 5}).map((_, i) => (
            <line key={`st-${i}`} x1={vx + vw * 0.2} y1={vy + (i+1)*(vh/6)} x2={vx + vw * 0.8} y2={vy + (i+1)*(vh/6)} stroke="#e67e22" strokeWidth="1" />
          ))}
          <text x={vx + vw/2} y={vy + vh/2 + 4} fill="#d35400" fontSize="10" fontWeight="bold" textAnchor="middle">{isL ? 'ESC (L)' : 'ESC'}</text>
          {isL && (
             <circle 
               cx={ab.orientacion?.includes('right') ? vx + vw : vx} 
               cy={ab.orientacion?.includes('bottom') ? vy + vh : vy} 
               r="4" fill="#c0392b" 
             />
          )}
        </g>
      );
    }
  });

  // Celdas clickeables (para toggle vacio/lleno)
  const celdasClickElements = [];
  if (grid.celdas) {
    grid.celdas.forEach(celda => {
      const { r, c, tipo } = celda;
      if (r >= nTramosY || c >= nTramosX) return;
      const x1 = cx[c];
      const y1 = cy[r];
      const w = arrX[c] * scale;
      const h = arrY[r] * scale;
      celdasClickElements.push(
        <rect 
          key={`click-${r}-${c}`} 
          x={x1} y={y1} width={w} height={h} 
          fill="transparent" 
          onClick={() => { if(onCeldasToggle) onCeldasToggle(r, c) }} 
          style={{ cursor: onCeldasToggle ? 'pointer' : 'default' }} 
        />
      );
    });
  }

  // Nervios para aligerada
  const nerviosElements = [];
  if (losaActiva === 'aligerada') {
    const { anchoBloque, nerviosEnX, nerviosEnY } = calc.aligeradaData;
    const sepNervios = (anchoBloque / 100) * scale;

    if (nerviosEnX) {
      for (let r = 0; r < filas; r++) {
        const numNervios = Math.ceil(totalH / (anchoBloque / 100));
        for (let k = 0; k < numNervios; k++) {
          const y = oy + k * sepNervios;
          if (y <= cy[nTramosY] + 1) {
            nerviosElements.push(
              <line key={`nx-${r}-${k}`}
                x1={ox} y1={y}
                x2={cx[nTramosX]} y2={y}
                stroke="#d35400" strokeWidth="2" opacity="0.7"
              />
            );
            if (k % 2 === 0) {
              nerviosElements.push(
                <text key={`nxl-${r}-${k}`} x={ox + 5} y={y - 3} fill="#d35400" fontSize="8">As+</text>
              );
            }
          }
        }
      }
    }

    if (nerviosEnY) {
      for (let c = 0; c < cols; c++) {
        const numNervios = Math.ceil(totalW / (anchoBloque / 100));
        for (let k = 0; k < numNervios; k++) {
          const x = ox + k * sepNervios;
          if (x <= cx[nTramosX] + 1) {
            nerviosElements.push(
              <line key={`ny-${c}-${k}`}
                x1={x} y1={oy}
                x2={x} y2={cy[nTramosY]}
                stroke="#d35400" strokeWidth="2" opacity="0.7"
              />
            );
            if (k % 2 === 0) {
              nerviosElements.push(
                <text key={`nyl-${c}-${k}`} x={x + 3} y={oy + 10} fill="#d35400" fontSize="8">As+</text>
              );
            }
          }
        }
      }
    }
  }

  // Diagramas de momento (solo para maciza y aligerada)
  const momentPathsX = [];
  const momentPathsY = [];

  if (losaActiva !== 'colaborante') {
    // X
    const tramosX = calc.aligeradaData?.tramosX || [];
    const usetrX = tramosX.length > 0 ? tramosX : Array(nTramosX).fill(0).map((_, i) => ({
      mPos: (calc.wu * arrX[i] * arrX[i]) / (i === 0 || i === nTramosX - 1 ? 14 : 16),
      mNegIzq: (calc.wu * arrX[i] * arrX[i]) / (i === 0 ? 16 : 11),
      mNegDer: (calc.wu * arrX[i] * arrX[i]) / (i === nTramosX - 1 ? 16 : 11),
    }));

    for (let r = 0; r < filas; r++) {
      for (let i = 0; i < nTramosX; i++) {
        const tramo = usetrX[i];
        const x1 = cx[i];
        const x2 = cx[i + 1];
        const y = cy[r];
        const midX = (x1 + x2) / 2;
        const maxM = Math.max(tramo.mPos || 0, tramo.mNegIzq || 0, tramo.mNegDer || 0);
        const scaleM = maxM > 0 ? 25 / maxM : 0;

        momentPathsX.push(
          <g key={`mx-${r}-${i}`}>
            <path d={`M ${x1},${y} Q ${midX},${y + (tramo.mPos || 0) * scaleM} ${x2},${y}`}
              fill="none" stroke="#0d6efd" strokeWidth="2" opacity="0.7" />
            <path d={`M ${x1},${y} Q ${x1 + (x2 - x1) * 0.25},${y - (tramo.mNegIzq || 0) * scaleM} ${midX},${y}`}
              fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
            <path d={`M ${midX},${y} Q ${x2 - (x2 - x1) * 0.25},${y - (tramo.mNegDer || 0) * scaleM} ${x2},${y}`}
              fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
          </g>
        );
      }
    }

    // Y
    const tramosY = calc.aligeradaData?.tramosY || [];
    const usetrY = tramosY.length > 0 ? tramosY : Array(nTramosY).fill(0).map((_, i) => ({
      mPos: (calc.wu * arrY[i] * arrY[i]) / (i === 0 || i === nTramosY - 1 ? 14 : 16),
      mNegIzq: (calc.wu * arrY[i] * arrY[i]) / (i === 0 ? 16 : 11),
      mNegDer: (calc.wu * arrY[i] * arrY[i]) / (i === nTramosY - 1 ? 16 : 11),
    }));

    for (let c = 0; c < cols; c++) {
      for (let i = 0; i < nTramosY; i++) {
        const tramo = usetrY[i];
        const y1 = cy[i];
        const y2 = cy[i + 1];
        const x = cx[c];
        const midY = (y1 + y2) / 2;
        const maxM = Math.max(tramo.mPos || 0, tramo.mNegIzq || 0, tramo.mNegDer || 0);
        const scaleM = maxM > 0 ? 25 / maxM : 0;

        momentPathsY.push(
          <g key={`my-${c}-${i}`}>
            <path d={`M ${x},${y1} Q ${x + (tramo.mPos || 0) * scaleM},${midY} ${x},${y2}`}
              fill="none" stroke="#0d6efd" strokeWidth="2" opacity="0.7" />
            <path d={`M ${x},${y1} Q ${x - (tramo.mNegIzq || 0) * scaleM},${y1 + (y2 - y1) * 0.25} ${x},${midY}`}
              fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
            <path d={`M ${x},${midY} Q ${x - (tramo.mNegDer || 0) * scaleM},${y2 - (y2 - y1) * 0.25} ${x},${y2}`}
              fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
          </g>
        );
      }
    }
  }

  const styles = {
    svgPanel: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
      marginBottom: '20px',
    },
    svgTitle: {
      marginTop: 0,
      color: '#34495e',
      fontSize: '17px',
      fontWeight: '600',
      marginBottom: '10px',
    },
    svg: {
      background: '#fafbfc',
      borderRadius: '10px',
      border: '1px solid #e0e0e0',
    },
  };

  return (
    <div style={styles.svgPanel}>
      <h3 style={styles.svgTitle}>Retícula de Apoyos y Elementos Estructurales</h3>
      <svg width={svgW} height={svgH} style={styles.svg}>
        {/* Grid de fondo */}
        {Array.from({ length: Math.ceil(svgW / 40) }, (_, i) => (
          <line key={`gv${i}`} x1={i * 40} y1={0} x2={i * 40} y2={svgH} stroke="#f0f0f0" strokeWidth="1" />
        ))}
        {Array.from({ length: Math.ceil(svgH / 40) }, (_, i) => (
          <line key={`gh${i}`} x1={0} y1={i * 40} x2={svgW} y2={i * 40} stroke="#f0f0f0" strokeWidth="1" />
        ))}

        {/* Correas Steel Deck (quedan debajo de máscaras) */}
        {correasElements}

        {/* Studs y símbolos de armado */}
        {studsElements}

        {/* Nervios Aligerada */}
        {nerviosElements}

        {/* Máscaras de aberturas (esconden correas y texto debajo de huecos) */}
        {aberturasMasks}

        {/* Vigas principales y secundarias (Steel Deck / Aligerada) - dibujadas sobre máscaras */}
        {vigasElements}

        {/* Gráficos de aberturas (bordes, texto HUECO/ESCALERA) */}
        {aberturasGraphics}

        {/* Vigas X (líneas base de losa) */}
        {Array.from({ length: filas }, (_, r) =>
          Array.from({ length: nTramosX }, (_, i) => {
            if (grid.celdas?.some(c => (c.r === r || c.r === r - 1) && c.c === i && c.tipo === 'vacio')) return null;
            return (
              <line key={`vx-${r}-${i}`}
                x1={cx[i]} y1={cy[r]}
                x2={cx[i+1]} y2={cy[r]}
                stroke={losaActiva === 'colaborante' ? "#bdc3c7" : "#7f8c8d"} strokeWidth={losaActiva === 'colaborante' ? "1" : "2"}
              />
            );
          })
        )}

        {/* Líneas auxiliares Y */}
        {Array.from({ length: nTramosX + 1 }, (_, c) =>
          Array.from({ length: nTramosY }, (_, i) => {
            if (grid.celdas?.some(cell => (cell.c === c || cell.c === c - 1) && cell.r === i && cell.tipo === 'vacio')) return null;
            return (
              <line key={`vy-${c}-${i}`}
                x1={cx[c]} y1={cy[i]}
                x2={cx[c]} y2={cy[i+1]}
                stroke={losaActiva === 'colaborante' ? "#bdc3c7" : "#7f8c8d"} strokeWidth={losaActiva === 'colaborante' ? "1" : "2"}
              />
            );
          })
        )}
        
        {/* Diagramas de momento */}
        {momentPathsX}
        {momentPathsY}

        {/* Capa de clicks */}
        {celdasClickElements}

        {/* Apoyos / Columnas (Ocultar si las 4 celdas adyacentes son vacías) */}
        {apoyos.map((a) => {
          const r = parseInt(a.id.split('-')[0]);
          const c = parseInt(a.id.split('-')[1]);
          const isVacio = (row, col) => 
            row < 0 || row >= nTramosY || col < 0 || col >= nTramosX || 
            grid.celdas?.some(cell => cell.r === row && cell.c === col && cell.tipo === 'vacio');
          
          if (isVacio(r-1, c-1) && isVacio(r-1, c) && isVacio(r, c-1) && isVacio(r, c)) {
            return null; // Nodo huérfano
          }

          return (
            <g key={a.id}>
              <circle cx={a.x} cy={a.y} r="8" fill="#2c3e50" stroke="#fff" strokeWidth="2" />
              <circle cx={a.x} cy={a.y} r="4" fill="#e74c3c" />
            </g>
          );
        })}

        {/* Cotas X */}
        {Array.from({ length: nTramosX }, (_, i) => (
          <g key={`cx-${i}`}>
            <line x1={cx[i]} y1={cy[nTramosY] + 20}
              x2={cx[i+1]} y2={cy[nTramosY] + 20} stroke="#333" strokeWidth="1" />
            <line x1={cx[i]} y1={cy[nTramosY] + 15}
              x2={cx[i]} y2={cy[nTramosY] + 25} stroke="#333" strokeWidth="1" />
            <line x1={cx[i+1]} y1={cy[nTramosY] + 15}
              x2={cx[i+1]} y2={cy[nTramosY] + 25} stroke="#333" strokeWidth="1" />
            <text x={cx[i] + (arrX[i] * scale) / 2} y={cy[nTramosY] + 38} fill="#333" fontSize="11" textAnchor="middle">{arrX[i]}m</text>
          </g>
        ))}

        {/* Cotas Y */}
        {Array.from({ length: nTramosY }, (_, i) => (
          <g key={`cy-${i}`}>
            <line x1={cx[0] - 25} y1={cy[i]}
              x2={cx[0] - 25} y2={cy[i+1]} stroke="#333" strokeWidth="1" />
            <line x1={cx[0] - 30} y1={cy[i]}
              x2={cx[0] - 20} y2={cy[i]} stroke="#333" strokeWidth="1" />
            <line x1={cx[0] - 30} y1={cy[i+1]}
              x2={cx[0] - 20} y2={cy[i+1]} stroke="#333" strokeWidth="1" />
            <text x={cx[0] - 40} y={cy[i] + (arrY[i] * scale) / 2 + 4} fill="#333" fontSize="11" textAnchor="end">{arrY[i]}m</text>
          </g>
        ))}

        {/* Leyenda */}
        <g transform={`translate(${svgW - 180}, ${mT})`}>
          <rect x="0" y="0" width="170" height={losaActiva === 'colaborante' ? 90 : 50} fill="white" stroke="#ddd" strokeWidth="1" rx="6" opacity="0.95" />
          
          <circle cx="15" cy="18" r="6" fill="#2c3e50" />
          <text x="28" y="22" fill="#333" fontSize="11">Columna / Apoyo</text>

          {losaActiva === 'colaborante' && (
            <>
              <line x1="10" y1="38" x2="30" y2="38" stroke="#2c3e50" strokeWidth="4" />
              <text x="38" y="42" fill="#333" fontSize="11">Viga Principal</text>
              
              <line x1="10" y1="56" x2="30" y2="56" stroke="#8e44ad" strokeWidth="2" strokeDasharray="4,2" />
              <text x="38" y="60" fill="#333" fontSize="11">Correa (Joist)</text>
              
              <line x1="10" y1="74" x2="30" y2="74" stroke="#3498db" strokeWidth="2" />
              <polyline points="12,71 10,74 12,77" stroke="#3498db" strokeWidth="2" fill="none" />
              <polyline points="28,71 30,74 28,77" stroke="#3498db" strokeWidth="2" fill="none" />
              <text x="38" y="78" fill="#333" fontSize="11">Dir. Armado</text>
            </>
          )}
          {losaActiva === 'aligerada' && (
            <>
              <line x1="10" y1="38" x2="30" y2="38" stroke="#d35400" strokeWidth="2" />
              <text x="38" y="42" fill="#333" fontSize="11">Nervio + Armado</text>
            </>
          )}
        </g>

        {/* Título de relación */}
        <text x={svgW / 2} y={25} fill="#2c3e50" fontSize="14" fontWeight="bold" textAnchor="middle">
          {calc && typeof calc.ratio !== 'undefined' && (
            calc.esDosDirecciones 
            ? `LOSA EN DOS DIRECCIONES (ratio ${Number(calc.ratio).toFixed(2)} ≤ 2)` 
            : `LOSA EN UNA DIRECCIÓN (ratio ${Number(calc.ratio).toFixed(2)} > 2)`
          )}
        </text>
      </svg>
    </div>
  );
};

// ==================== SVG SECCIÓN TRANSVERSAL ====================
export const renderSeccion = (calc, losaActiva, steelDeckConfig, aligeradaConfig) => {
  const h = parseFloat(calc.h) || 10;
  const svgW = 600;
  const svgH = 340;
  const ox = 80;      // x origin of left support
  const oy = 200;     // y baseline (bottom of deck / top of main beam)
  const scale = 3.5;

  const styles = {
    svgPanel: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
      marginBottom: '20px',
    },
    svgTitle: {
      marginTop: 0,
      color: '#34495e',
      fontSize: '17px',
      fontWeight: '600',
      marginBottom: '10px',
    },
    svg: {
      background: '#fafbfc',
      borderRadius: '10px',
      border: '1px solid #e0e0e0',
    },
  };

  const espesorConcreto = steelDeckConfig?.espesorConcreto || 6;
  const alturaDeck = steelDeckConfig?.alturaDeck || 5;
  const alturaStud = Math.min(steelDeckConfig?.alturaStud || 10, espesorConcreto + alturaDeck - 1.5); // Stud no puede sobresalir
  const tipoVigaPrincipal = steelDeckConfig?.tipoVigaPrincipal || 'IPE 200';
  const tipoCorrea = steelDeckConfig?.tipoCorrea || 'Tubo 160x65x3.40';

  const drawIBeam = (cx, cy, w, h, tf = 3.5, tw = 3.5, color = "#2c3e50", strokeColor = "#1a252f") => {
    const x1 = cx - w/2, x2 = cx + w/2;
    const y1 = cy - h/2, y2 = cy + h/2;
    return (
      <path d={`M ${x1} ${y1} H ${x2} V ${y1+tf} H ${cx+tw/2} V ${y2-tf} H ${x2} V ${y2} H ${x1} V ${y2-tf} H ${cx-tw/2} V ${y1+tf} H ${x1} Z`}
            fill={color} stroke={strokeColor} strokeWidth="1.5" />
    );
  };

  const drawTuboRect = (cx, cy, w, h, t = 2.5, color = "#7f8c8d", strokeColor = "#34495e") => {
    const x1 = cx - w/2, y1 = cy - h/2;
    return (
      <g>
        <rect x={x1} y={y1} width={w} height={h} fill={color} stroke={strokeColor} strokeWidth="1.5" rx="1.5" />
        <rect x={x1+t} y={y1+t} width={w-2*t} height={h-2*t} fill="#fafbfc" stroke="none" />
      </g>
    );
  };

  // Width of drawing area for the slab section
  const slabWidth = 380;
  const slabLeft = ox + 40;

  // Heights in SVG pixels
  const hConc = espesorConcreto * scale;       // concreto por encima de cresta
  const hDeck = alturaDeck * scale;            // altura del deck
  const hStud = alturaStud * scale;            // stud dentro del concreto

  // Y positions
  const yTopConc = oy - hConc - hDeck;         // top of concrete
  const yBottomDeck = oy;                       // bottom of deck = top of vigas

  // Viga principal: shown at left edge as large I-beam going below
  const vpH = 50; const vpW = 44;
  const vpCx = ox + 20;
  const vpCy = oy + vpH / 2 + 2;

  // Correa: shown in center going below deck
  const corrH = 28; const corrW = 28;
  const corrCx = slabLeft + slabWidth * 0.5;
  const corrCy = oy + corrH / 2 + 2;

  const isVPTubo = tipoVigaPrincipal.startsWith('Tubo') || tipoVigaPrincipal.includes('TUBO');
  const isVPIPE = tipoVigaPrincipal.startsWith('IPE') || tipoVigaPrincipal.startsWith('IPN') || tipoVigaPrincipal.startsWith('HEA') || tipoVigaPrincipal.startsWith('W') || tipoVigaPrincipal.startsWith('C');
  const isCorrTubo = tipoCorrea.startsWith('Tubo') || tipoCorrea.includes('TUBO');

  return (
    <div style={styles.svgPanel}>
      <h3 style={styles.svgTitle}>Sección Transversal Típica</h3>
      <svg width={svgW} height={svgH} style={styles.svg}>
        <defs>
          <pattern id="hatchConcreto" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#95a5a6" strokeWidth="0.8" />
          </pattern>
        </defs>

        {losaActiva === 'colaborante' && (
          <g>
            {/* === CONCRETO === */}
            <rect x={slabLeft} y={yTopConc} width={slabWidth} height={hConc} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="1.5" />
            <rect x={slabLeft} y={yTopConc} width={slabWidth} height={hConc} fill="url(#hatchConcreto)" opacity="0.35" />

            {/* === STEEL DECK (perfil acanalado) === */}
            {(() => {
              const nw = 65; // canal width
              const canals = Math.floor(slabWidth / nw);
              const paths = [];
              for (let i = 0; i < canals; i++) {
                const x0 = slabLeft + i * nw;
                paths.push(
                  <path key={i} d={`M ${x0} ${oy} L ${x0+12} ${oy} L ${x0+18} ${oy-hDeck} L ${x0+47} ${oy-hDeck} L ${x0+53} ${oy} L ${x0+nw} ${oy}`}
                    fill="none" stroke="#2980b9" strokeWidth="3" />
                );
              }
              return paths;
            })()}

            {/* === MALLA temperatura (línea punteada dentro del concreto) === */}
            <line x1={slabLeft+10} y1={yTopConc + hConc * 0.35}
              x2={slabLeft+slabWidth-10} y2={yTopConc + hConc * 0.35}
              stroke="#c0392b" strokeWidth="1.5" strokeDasharray="4,3" />
            <text x={slabLeft+slabWidth+6} y={yTopConc + hConc * 0.35 + 4} fill="#a93226" fontSize="10" fontWeight="bold">Malla Truskon</text>

            {/* === STUD en el deck (dentro del concreto, sobre cresta del deck) === */}
            <rect x={slabLeft+90} y={oy-hDeck-hStud} width="5" height={hStud} fill="#e67e22" stroke="#d35400" strokeWidth="1" rx="2" />
            <circle cx={slabLeft+92.5} cy={oy-hDeck-hStud} r="5" fill="#e67e22" stroke="#d35400" strokeWidth="1" />
            <text x={slabLeft+100} y={oy-hDeck-hStud*0.5} fill="#d35400" fontSize="10" fontWeight="bold">
              Stud {steelDeckConfig?.diametroStud ? `Ø${steelDeckConfig.diametroStud}"` : 'Ø3/4"'}
            </text>

            {/* === VIGA PRINCIPAL (extremo izquierdo como apoyo) === */}
            {isVPTubo
              ? drawTuboRect(vpCx, vpCy, vpW, vpH, 3, "#1a6b8a", "#0d4f6b")
              : drawIBeam(vpCx, vpCy, vpW+8, vpH, 5, 4.5, "#1a6b8a", "#0d4f6b")
            }
            <text x={vpCx} y={vpCy + vpH/2 + 14} fill="#0d4f6b" fontSize="9" fontWeight="bold" textAnchor="middle">Viga Principal</text>
            <text x={vpCx} y={vpCy + vpH/2 + 24} fill="#0d4f6b" fontSize="8" textAnchor="middle">{tipoVigaPrincipal}</text>

            {/* === CORREA (centro de la losa) === */}
            {isCorrTubo
              ? drawTuboRect(corrCx, corrCy, corrW, corrH, 2.5, "#8e44ad", "#6c3483")
              : drawIBeam(corrCx, corrCy, corrW, corrH, 3.5, 3.5, "#8e44ad", "#6c3483")
            }
            <text x={corrCx} y={corrCy + corrH/2 + 14} fill="#6c3483" fontSize="9" fontWeight="bold" textAnchor="middle">Correa</text>
            <text x={corrCx} y={corrCy + corrH/2 + 24} fill="#6c3483" fontSize="8" textAnchor="middle">{tipoCorrea}</text>

            {/* === LÍNEA DE APOYO (top of main beam) === */}
            <line x1={ox} y1={oy} x2={slabLeft+slabWidth+20} y2={oy} stroke="#555" strokeWidth="2.5" />

            {/* === COTAS === */}
            {/* h total */}
            <line x1={slabLeft-30} y1={yTopConc} x2={slabLeft-30} y2={oy} stroke="#333" strokeWidth="1" markerStart="url(#arr)" />
            <text x={slabLeft-60} y={oy - (hConc+hDeck)/2 + 4} fill="#111" fontSize="11" fontWeight="bold">h={h} cm</text>
            {/* t concreto */}
            <line x1={slabLeft+slabWidth+35} y1={yTopConc} x2={slabLeft+slabWidth+35} y2={oy-hDeck} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
            <text x={slabLeft+slabWidth+40} y={yTopConc + hConc/2 + 4} fill="#333" fontSize="10" fontWeight="bold">t={espesorConcreto} cm</text>

            {/* hr deck */}
            <text x={slabLeft+slabWidth+40} y={oy-hDeck/2+4} fill="#2980b9" fontSize="10">hr={alturaDeck} cm</text>

            {/* Etiqueta VP/Apoyo */}
            <text x={ox} y={oy+vpH+42} fill="#0d4f6b" fontSize="10" fontWeight="bold">VP / Apoyo</text>
          </g>
        )}
      </svg>
    </div>
  );
};

