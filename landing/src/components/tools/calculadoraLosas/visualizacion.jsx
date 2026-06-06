import React from 'react';

// ==================== SVG RETÍCULA ====================
export const renderGrid = (grid, calc, losaActiva, steelDeckConfig, aligeradaConfig) => {
  const { filas, cols, luzX, luzY } = grid;
  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);

  const svgW = 720;
  const svgH = 520;
  const mL = 80;
  const mR = 40;
  const mT = 50;
  const mB = 60;

  const totalW = nTramosX * luzX;
  const totalH = nTramosY * luzY;
  const scale = Math.min((svgW - mL - mR) / totalW, (svgH - mT - mB) / totalH);

  const ox = mL + (svgW - mL - mR - totalW * scale) / 2;
  const oy = mT + (svgH - mT - mB - totalH * scale) / 2;

  const apoyos = [];
  for (let r = 0; r < filas; r++) {
    for (let c = 0; c < cols; c++) {
      apoyos.push({
        x: ox + c * luzX * scale,
        y: oy + r * luzY * scale,
        id: `${r}-${c}`,
      });
    }
  }

  // Elementos de steel deck: correas y vigas principales
  const correasElements = [];
  const vigasElements = [];
  const studsElements = [];

  if (losaActiva === 'colaborante') {
    const sepReal = calc.steelDeckData?.sepReal || steelDeckConfig.sepCorreas;
    const sepPx = sepReal * scale;

    const correasHorizontales = luzX < luzY;

    if (correasHorizontales) {
      // 1. DIBUJAR CORREAS HORIZONTALES (una sola vez, sin bucles redundantes)
      for (let j = 0; j < nTramosY; j++) {
        const yStart = oy + j * luzY * scale;
        const nEspacios = Math.ceil(luzY / (calc.steelDeckData?.sepCorreas || steelDeckConfig.sepCorreas));
        const numCorreas = Math.max(0, nEspacios - 1);
        for (let k = 1; k <= numCorreas; k++) {
          const y = yStart + k * sepPx;
          correasElements.push(
            <line key={`cx-${j}-${k}`}
              x1={ox} y1={y}
              x2={ox + nTramosX * luzX * scale} y2={y}
              stroke="#8e44ad" strokeWidth="3" strokeDasharray="4,2" opacity="0.8"
            />
          );
        }
      }

      // 2. DIBUJAR VIGAS PRINCIPALES Y SECUNDARIAS
      // Vigas Principales en Y (verticales)
      for (let c = 0; c < cols; c++) {
        vigasElements.push(
          <line key={`vpx-main-${c}`}
            x1={ox + c * luzX * scale} y1={oy}
            x2={ox + c * luzX * scale} y2={oy + nTramosY * luzY * scale}
            stroke="#2c3e50" strokeWidth="6" opacity="0.95"
          />
        );
      }
      // Vigas Secundarias en X (horizontales)
      for (let r = 0; r < filas; r++) {
        vigasElements.push(
          <line key={`vpx-sec-${r}`}
            x1={ox} y1={oy + r * luzY * scale}
            x2={ox + nTramosX * luzX * scale} y2={oy + r * luzY * scale}
            stroke="#7f8c8d" strokeWidth="4" opacity="0.85"
          />
        );
      }
    } else {
      // 1. DIBUJAR CORREAS VERTICALES
      for (let i = 0; i < nTramosX; i++) {
        const xStart = ox + i * luzX * scale;
        const nEspacios = Math.ceil(luzX / (calc.steelDeckData?.sepCorreas || steelDeckConfig.sepCorreas));
        const numCorreas = Math.max(0, nEspacios - 1);
        for (let k = 1; k <= numCorreas; k++) {
          const x = xStart + k * sepPx;
          correasElements.push(
            <line key={`cy-${i}-${k}`}
              x1={x} y1={oy}
              x2={x} y2={oy + nTramosY * luzY * scale}
              stroke="#8e44ad" strokeWidth="3" strokeDasharray="4,2" opacity="0.8"
            />
          );
        }
      }

      // 2. DIBUJAR VIGAS PRINCIPALES Y SECUNDARIAS
      // Vigas Principales en X (horizontales)
      for (let r = 0; r < filas; r++) {
        vigasElements.push(
          <line key={`vpy-main-${r}`}
            x1={ox} y1={oy + r * luzY * scale}
            x2={ox + nTramosX * luzX * scale} y2={oy + r * luzY * scale}
            stroke="#2c3e50" strokeWidth="6" opacity="0.95"
          />
        );
      }
      // Vigas Secundarias en Y (verticales)
      for (let c = 0; c < cols; c++) {
        vigasElements.push(
          <line key={`vpy-sec-${c}`}
            x1={ox + c * luzX * scale} y1={oy}
            x2={ox + c * luzX * scale} y2={oy + nTramosY * luzY * scale}
            stroke="#7f8c8d" strokeWidth="4" opacity="0.85"
          />
        );
      }
    }

    // 3. DIBUJAR FLECHAS DE SENTIDO DE ARMADO
    for (let i = 0; i < nTramosX; i++) {
      for (let j = 0; j < nTramosY; j++) {
        const cx = ox + (i + 0.5) * luzX * scale;
        const cy = oy + (j + 0.5) * luzY * scale;

        if (correasHorizontales) {
          studsElements.push(
            <g key={`arrow-${i}-${j}`} stroke="#3498db" strokeWidth="2.5" fill="none" opacity="0.85">
              <line x1={cx} y1={cy - 22} x2={cx} y2={cy + 22} />
              <polyline points={`${cx - 6},${cy - 16} ${cx},${cy - 22} ${cx + 6},${cy - 16}`} />
              <polyline points={`${cx - 6},${cy + 16} ${cx},${cy + 22} ${cx + 6},${cy + 16}`} />
              <circle cx={cx} cy={cy} r="3" fill="#3498db" />
              <text x={cx} y={cy + 34} stroke="none" fill="#2980b9" fontSize="9" fontWeight="bold" textAnchor="middle">
                ARMADO LOSA
              </text>
            </g>
          );
        } else {
          studsElements.push(
            <g key={`arrow-${i}-${j}`} stroke="#3498db" strokeWidth="2.5" fill="none" opacity="0.85">
              <line x1={cx - 22} y1={cy} x2={cx + 22} y2={cy} />
              <polyline points={`${cx - 16},${cy - 6} ${cx - 22},${cy} ${cx - 16},${cy + 6}`} />
              <polyline points={`${cx + 16},${cy - 6} ${cx + 22},${cy} ${cx + 16},${cy + 6}`} />
              <circle cx={cx} cy={cy} r="3" fill="#3498db" />
              <text x={cx} y={cy - 12} stroke="none" fill="#2980b9" fontSize="9" fontWeight="bold" textAnchor="middle">
                ARMADO LOSA
              </text>
            </g>
          );
        }
      }
    }

    // 4. CONECTORES DE CORTE (studs) en las vigas principales únicamente
    if (correasHorizontales) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * luzX * scale;
        const totalHeight = nTramosY * luzY * scale;
        const nStuds = Math.max(5, Math.ceil(totalHeight / 30));
        for (let k = 0; k <= nStuds; k++) {
          const y = oy + (k / nStuds) * totalHeight;
          studsElements.push(
            <circle key={`stud-v-${c}-${k}`}
              cx={x} cy={y}
              r="4.5" fill="#e67e22" stroke="#d35400" strokeWidth="1.5"
            />
          );
        }
      }
    } else {
      for (let r = 0; r < filas; r++) {
        const y = oy + r * luzY * scale;
        const totalWidth = nTramosX * luzX * scale;
        const nStuds = Math.max(5, Math.ceil(totalWidth / 30));
        for (let k = 0; k <= nStuds; k++) {
          const x = ox + (k / nStuds) * totalWidth;
          studsElements.push(
            <circle key={`stud-h-${r}-${k}`}
              cx={x} cy={y}
              r="4.5" fill="#e67e22" stroke="#d35400" strokeWidth="1.5"
            />
          );
        }
      }
    }
  }

  // Nervios para aligerada
  const nerviosElements = [];
  if (losaActiva === 'aligerada') {
    const { anchoBloque, nerviosEnX, nerviosEnY } = calc.aligeradaData;
    const sepNervios = (anchoBloque / 100) * scale;

    if (nerviosEnX) {
      for (let r = 0; r < filas; r++) {
        const numNervios = Math.ceil((luzY * nTramosY) / (anchoBloque / 100));
        for (let k = 0; k < numNervios; k++) {
          const y = oy + k * sepNervios;
          if (y <= oy + nTramosY * luzY * scale + 1) {
            nerviosElements.push(
              <line key={`nx-${r}-${k}`}
                x1={ox} y1={y}
                x2={ox + nTramosX * luzX * scale} y2={y}
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
        const numNervios = Math.ceil((luzX * nTramosX) / (anchoBloque / 100));
        for (let k = 0; k < numNervios; k++) {
          const x = ox + k * sepNervios;
          if (x <= ox + nTramosX * luzX * scale + 1) {
            nerviosElements.push(
              <line key={`ny-${c}-${k}`}
                x1={x} y1={oy}
                x2={x} y2={oy + nTramosY * luzY * scale}
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
      mPos: (calc.wu * luzX * luzX) / (i === 0 || i === nTramosX - 1 ? 14 : 16),
      mNegIzq: (calc.wu * luzX * luzX) / (i === 0 ? 16 : 11),
      mNegDer: (calc.wu * luzX * luzX) / (i === nTramosX - 1 ? 16 : 11),
    }));

    for (let r = 0; r < filas; r++) {
      for (let i = 0; i < nTramosX; i++) {
        const tramo = usetrX[i];
        const x1 = ox + i * luzX * scale;
        const x2 = ox + (i + 1) * luzX * scale;
        const y = oy + r * luzY * scale;
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
      mPos: (calc.wu * luzY * luzY) / (i === 0 || i === nTramosY - 1 ? 14 : 16),
      mNegIzq: (calc.wu * luzY * luzY) / (i === 0 ? 16 : 11),
      mNegDer: (calc.wu * luzY * luzY) / (i === nTramosY - 1 ? 16 : 11),
    }));

    for (let c = 0; c < cols; c++) {
      for (let i = 0; i < nTramosY; i++) {
        const tramo = usetrY[i];
        const y1 = oy + i * luzY * scale;
        const y2 = oy + (i + 1) * luzY * scale;
        const x = ox + c * luzX * scale;
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

        {/* Vigas principales Steel Deck */}
        {vigasElements}

        {/* Correas Steel Deck */}
        {correasElements}

        {/* Nervios Aligerada */}
        {nerviosElements}

        {/* Vigas X (líneas base) */}
        {Array.from({ length: filas }, (_, r) =>
          Array.from({ length: nTramosX }, (_, i) => (
            <line key={`vx-${r}-${i}`}
              x1={ox + i * luzX * scale} y1={oy + r * luzY * scale}
              x2={ox + (i + 1) * luzX * scale} y2={oy + r * luzY * scale}
              stroke={losaActiva === 'colaborante' ? "#bdc3c7" : "#7f8c8d"} strokeWidth={losaActiva === 'colaborante' ? "1" : "2"}
            />
          ))
        )}

        {/* Vigas Y */}
        {Array.from({ length: cols }, (_, c) =>
          Array.from({ length: nTramosY }, (_, i) => (
            <line key={`vy-${c}-${i}`}
              x1={ox + c * luzX * scale} y1={oy + i * luzY * scale}
              x2={ox + c * luzX * scale} y2={oy + (i + 1) * luzY * scale}
              stroke={losaActiva === 'colaborante' ? "#bdc3c7" : "#7f8c8d"} strokeWidth={losaActiva === 'colaborante' ? "1" : "2"}
            />
          ))
        )}

        {/* Diagramas de momento */}
        {momentPathsX}
        {momentPathsY}

        {/* Apoyos / Columnas */}
        {apoyos.map((a) => (
          <g key={a.id}>
            <circle cx={a.x} cy={a.y} r="8" fill="#2c3e50" stroke="#fff" strokeWidth="2" />
            <circle cx={a.x} cy={a.y} r="4" fill="#e74c3c" />
          </g>
        ))}

        {/* Studs */}
        {studsElements}

        {/* Cotas X */}
        {Array.from({ length: nTramosX }, (_, i) => (
          <g key={`cx-${i}`}>
            <line x1={ox + i * luzX * scale} y1={oy + nTramosY * luzY * scale + 20}
              x2={ox + (i + 1) * luzX * scale} y2={oy + nTramosY * luzY * scale + 20} stroke="#333" strokeWidth="1" />
            <line x1={ox + i * luzX * scale} y1={oy + nTramosY * luzY * scale + 15}
              x2={ox + i * luzX * scale} y2={oy + nTramosY * luzY * scale + 25} stroke="#333" strokeWidth="1" />
            <line x1={ox + (i + 1) * luzX * scale} y1={oy + nTramosY * luzY * scale + 15}
              x2={ox + (i + 1) * luzX * scale} y2={oy + nTramosY * luzY * scale + 25} stroke="#333" strokeWidth="1" />
            <text x={ox + (i + 0.5) * luzX * scale - 15} y={oy + nTramosY * luzY * scale + 38} fill="#333" fontSize="11">{luzX}m</text>
          </g>
        ))}

        {/* Cotas Y */}
        {Array.from({ length: nTramosY }, (_, i) => (
          <g key={`cy-${i}`}>
            <line x1={ox - 25} y1={oy + i * luzY * scale}
              x2={ox - 25} y2={oy + (i + 1) * luzY * scale} stroke="#333" strokeWidth="1" />
            <line x1={ox - 30} y1={oy + i * luzY * scale}
              x2={ox - 20} y2={oy + i * luzY * scale} stroke="#333" strokeWidth="1" />
            <line x1={ox - 30} y1={oy + (i + 1) * luzY * scale}
              x2={ox - 20} y2={oy + (i + 1) * luzY * scale} stroke="#333" strokeWidth="1" />
            <text x={ox - 55} y={oy + (i + 0.5) * luzY * scale + 4} fill="#333" fontSize="11">{luzY}m</text>
          </g>
        ))}

        {/* Leyenda */}
        <g transform={`translate(${svgW - 180}, ${mT})`}>
          <rect x="0" y="0" width="170" height={losaActiva === 'colaborante' ? 145 : 110} fill="white" stroke="#ddd" strokeWidth="1" rx="6" opacity="0.95" />
          <circle cx="15" cy="18" r="6" fill="#2c3e50" />
          <text x="28" y="22" fill="#333" fontSize="11">Columna / Apoyo</text>
          <line x1="10" y1="38" x2="30" y2="38" stroke="#0d6efd" strokeWidth="2" />
          <text x="38" y="42" fill="#333" fontSize="11">M(+) Tramo</text>
          <line x1="10" y1="55" x2="30" y2="55" stroke="#e74c3c" strokeWidth="2" />
          <text x="38" y="59" fill="#333" fontSize="11">M(-) Apoyo</text>
          {losaActiva === 'colaborante' && (
            <>
              <line x1="10" y1="72" x2="30" y2="72" stroke="#2c3e50" strokeWidth="4" />
              <text x="38" y="76" fill="#333" fontSize="11">Viga Principal</text>
              <line x1="10" y1="86" x2="30" y2="86" stroke="#7f8c8d" strokeWidth="3" />
              <text x="38" y="90" fill="#333" fontSize="11">Viga Secundaria</text>
              <line x1="10" y1="100" x2="30" y2="100" stroke="#8e44ad" strokeWidth="2" strokeDasharray="4,2" />
              <text x="38" y="104" fill="#333" fontSize="11">Correa (Joist)</text>
              <circle cx="20" cy="115" r="4.5" fill="#e67e22" stroke="#d35400" strokeWidth="1" />
              <text x="38" y="119" fill="#333" fontSize="11">Stud (corte)</text>
              <line x1="10" y1="130" x2="30" y2="130" stroke="#3498db" strokeWidth="2" />
              <polyline points="12,127 10,130 12,133" stroke="#3498db" strokeWidth="2" fill="none" />
              <polyline points="28,127 30,130 28,133" stroke="#3498db" strokeWidth="2" fill="none" />
              <text x="38" y="134" fill="#333" fontSize="11">Dir. Armado</text>
            </>
          )}
          {losaActiva === 'aligerada' && (
            <>
              <line x1="10" y1="72" x2="30" y2="72" stroke="#d35400" strokeWidth="2" />
              <text x="38" y="76" fill="#333" fontSize="11">Nervio + Armado</text>
            </>
          )}
        </g>

        {/* Título de relación */}
        <text x={svgW / 2} y={25} fill="#2c3e50" fontSize="14" fontWeight="bold" textAnchor="middle">
          {calc.esDosDirecciones
            ? `LOSA EN DOS DIRECCIONES (ratio ${calc.ratio.toFixed(2)} ≤ 2)` 
            : `LOSA EN UNA DIRECCIÓN (ratio ${calc.ratio.toFixed(2)} > 2)`}
        </text>
      </svg>
    </div>
  );
};

// ==================== SVG SECCIÓN TRANSVERSAL ====================
export const renderSeccion = (calc, losaActiva, steelDeckConfig, aligeradaConfig) => {
  const h = parseFloat(calc.h) || 10;
  const svgW = 560;
  const svgH = 320;
  const ox = 60;
  const oy = 240;
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

  const tipoVigaPrincipal = steelDeckConfig.tipoVigaPrincipal || 'W12x26';
  const tipoCorrea = steelDeckConfig.tipoCorrea || 'Tubo 100x50x3';

  // Helpers de dibujo de perfiles
  const drawIBeam = (cx, cy, w, h, tf = 3.5, tw = 3.5, color = "#2c3e50", strokeColor = "#1a252f") => {
    const x1 = cx - w/2;
    const x2 = cx + w/2;
    const y1 = cy - h/2;
    const y2 = cy + h/2;
    return (
      <path d={`M ${x1} ${y1} H ${x2} V ${y1 + tf} H ${cx + tw/2} V ${y2 - tf} H ${x2} V ${y2} H ${x1} V ${y2 - tf} H ${cx - tw/2} V ${y1 + tf} H ${x1} Z`}
            fill={color} stroke={strokeColor} strokeWidth="1.5" />
    );
  };

  const drawTuboRect = (cx, cy, w, h, t = 2.5, color = "#7f8c8d", strokeColor = "#34495e") => {
    const x1 = cx - w/2;
    const y1 = cy - h/2;
    return (
      <g>
        <rect x={x1} y={y1} width={w} height={h} fill={color} stroke={strokeColor} strokeWidth="1.5" rx="1.5" />
        <rect x={x1 + t} y={y1 + t} width={w - 2*t} height={h - 2*t} fill="#fafbfc" stroke="none" />
      </g>
    );
  };

  const drawCChannel = (cx, cy, w, h, tf = 3.5, tw = 3.5, color = "#8e44ad", strokeColor = "#6c3483") => {
    const x1 = cx - w/2;
    const x2 = cx + w/2;
    const y1 = cy - h/2;
    const y2 = cy + h/2;
    return (
      <path d={`M ${x2} ${y1} H ${x1} V ${y2} H ${x2} V ${y2 - tf} H ${x1 + tw} V ${y1 + tf} H ${x2} Z`}
            fill={color} stroke={strokeColor} strokeWidth="1.5" />
    );
  };

  return (
    <div style={styles.svgPanel}>
      <h3 style={styles.svgTitle}>Sección Transversal Típica</h3>
      <svg width={svgW} height={svgH} style={styles.svg}>
        <defs>
          <pattern id="hatchBloque" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#f1c40f" strokeWidth="1" />
          </pattern>
          <pattern id="hatchConcreto" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#95a5a6" strokeWidth="0.8" />
          </pattern>
          <pattern id="hatchMaciza" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#7f8c8d" strokeWidth="1" />
          </pattern>
        </defs>

        {/* STEEL DECK */}
        {losaActiva === 'colaborante' && (
          <g>
            {/* Concreto sobre deck */}
            <rect x={ox} y={oy - steelDeckConfig.espesorConcreto * scale} width={340}
              height={steelDeckConfig.espesorConcreto * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
            <rect x={ox} y={oy - steelDeckConfig.espesorConcreto * scale} width={340}
              height={steelDeckConfig.espesorConcreto * scale} fill="url(#hatchConcreto)" opacity="0.4" />

            {/* Steel Deck (perfil acanalado) */}
            <path d={`M ${ox} ${oy} 
              L ${ox + 25} ${oy} L ${ox + 35} ${oy - 3 * scale} L ${ox + 55} ${oy - 3 * scale} 
              L ${ox + 65} ${oy} L ${ox + 90} ${oy} L ${ox + 100} ${oy - 3 * scale} L ${ox + 120} ${oy - 3 * scale}
              L ${ox + 130} ${oy} L ${ox + 155} ${oy} L ${ox + 165} ${oy - 3 * scale} L ${ox + 185} ${oy - 3 * scale}
              L ${ox + 195} ${oy} L ${ox + 220} ${oy} L ${ox + 230} ${oy - 3 * scale} L ${ox + 250} ${oy - 3 * scale}
              L ${ox + 260} ${oy} L ${ox + 285} ${oy} L ${ox + 295} ${oy - 3 * scale} L ${ox + 315} ${oy - 3 * scale}
              L ${ox + 325} ${oy} L ${ox + 340} ${oy}`}
              fill="none" stroke="#2980b9" strokeWidth="3" />

            {/* Malla de temperatura */}
            <line x1={ox + 10} y1={oy - (steelDeckConfig.espesorConcreto - 2) * scale}
              x2={ox + 330} y2={oy - (steelDeckConfig.espesorConcreto - 2) * scale}
              stroke="#c0392b" strokeWidth="1" strokeDasharray="3,3" />
            <text x={ox + 335} y={oy - (steelDeckConfig.espesorConcreto - 2) * scale + 4} fill="#c0392b" fontSize="10">Malla 6x6-10/10</text>

            {/* Conector de corte (stud) */}
            <rect x={ox + 80} y={oy - (steelDeckConfig.espesorConcreto + 1) * scale} width="6" height={steelDeckConfig.espesorConcreto * scale + 8} fill="#e67e22" stroke="#d35400" strokeWidth="1" rx="2" />
            <circle cx={ox + 83} cy={oy - (steelDeckConfig.espesorConcreto + 1) * scale} r="5" fill="#e67e22" stroke="#d35400" strokeWidth="1" />
            <text x={ox + 95} y={oy - (steelDeckConfig.espesorConcreto + 2) * scale} fill="#e67e22" fontSize="10">Stud Ø3/4"</text>

            {/* Cota h total */}
            <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
            <text x={ox - 55} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>

            {/* Cota concreto */}
            <line x1={ox + 360} y1={oy - 3 * scale} x2={ox + 360} y2={oy - h * scale} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
            <text x={ox + 365} y={oy - (h * scale + 3 * scale) / 2 + 4} fill="#666" fontSize="11">t = {steelDeckConfig.espesorConcreto} cm</text>

            {/* Viga principal debajo */}
            {tipoVigaPrincipal.startsWith('Tubo') || tipoVigaPrincipal.includes('TUBO')
              ? drawTuboRect(ox + 80, oy + 15, 36, 30, 2.5, "#2c3e50", "#1a252f")
              : drawIBeam(ox + 80, oy + 20, 36, 40, 4, 4, "#2c3e50", "#1a252f")
            }
            <text x={ox + 80} y={oy + 45} fill="#2c3e50" fontSize="9" fontWeight="bold" textAnchor="middle">{tipoVigaPrincipal}</text>
            <text x={ox + 80} y={oy + 58} fill="#7f8c8d" fontSize="9" textAnchor="middle">Viga Principal</text>

            {/* Correa intermedia */}
            {tipoCorrea.startsWith('Tubo') || tipoCorrea.includes('TUBO')
              ? drawTuboRect(ox + 215, oy + 12.5, 30, 25, 2.5, "#8e44ad", "#6c3483")
              : (tipoCorrea.startsWith('C') || tipoCorrea.includes('C ')
                  ? drawCChannel(ox + 215, oy + 15, 26, 30, 3.5, 3.5, "#8e44ad", "#6c3483")
                  : drawIBeam(ox + 215, oy + 15, 26, 30, 3.5, 3.5, "#8e44ad", "#6c3483")
                )
            }
            <text x={ox + 215} y={oy + 38} fill="#8e44ad" fontSize="9" fontWeight="bold" textAnchor="middle">{tipoCorrea}</text>
            <text x={ox + 215} y={oy + 50} fill="#7f8c8d" fontSize="9" textAnchor="middle">Correa</text>
          </g>
        )}

        {/* Suelo / Apoyo */}
        <line x1={ox - 20} y1={oy} x2={ox + 380} y2={oy} stroke="#555" strokeWidth="3" />
        <text x={ox + 385} y={oy + 4} fill="#555" fontSize="11">Viga / Apoyo</text>
      </svg>
    </div>
  );
};
