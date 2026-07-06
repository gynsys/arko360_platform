import React, { useRef, useEffect, useState, useMemo } from 'react';

const InteractiveHeatmap = ({ dataMatrix, title, unit, lx, ly }) => {
  const canvasRef = useRef(null);
  const [hoverData, setHoverData] = useState(null);
  
  // Calculate min, max
  const { min, max } = useMemo(() => {
    if (!dataMatrix || !dataMatrix.length) return { min: 0, max: 0 };
    let cmin = Infinity, cmax = -Infinity;
    for(let r=0; r<dataMatrix.length; r++) {
      for(let c=0; c<dataMatrix[r].length; c++) {
        let val = dataMatrix[r][c];
        if (val < cmin) cmin = val;
        if (val > cmax) cmax = val;
      }
    }
    if (cmin > 0 && cmax > 0) cmin = 0;
    if (cmax < 0 && cmin < 0) cmax = 0;
    if (cmax === cmin) { cmax += 1e-6; }
    return { min: cmin, max: cmax };
  }, [dataMatrix]);

  // Colormap function: Jet-like (Blue -> Cyan -> Green -> Yellow -> Red)
  const getColor = (val, minVal, maxVal) => {
    let t = (val - minVal) / (maxVal - minVal);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    // HSL: Blue (240) to Red (0)
    const h = (1.0 - t) * 240; 
    return `hsl(${h}, 100%, 50%)`;
  };

  useEffect(() => {
    if (!dataMatrix || !dataMatrix.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const rows = dataMatrix.length;
    const cols = dataMatrix[0].length;
    
    const cellW = width / cols;
    const cellH = height / rows;
    
    ctx.clearRect(0, 0, width, height);
    
    for(let r=0; r<rows; r++) {
      for(let c=0; c<cols; c++) {
        const val = dataMatrix[r][c];
        ctx.fillStyle = getColor(val, min, max);
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }, [dataMatrix, min, max]);

  const handleMouseMove = (e) => {
    if (!dataMatrix || !dataMatrix.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rows = dataMatrix.length;
    const cols = dataMatrix[0].length;
    
    const c = Math.floor((x / rect.width) * cols);
    const r = Math.floor((y / rect.height) * rows);
    
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      const val = dataMatrix[r][c];
      
      const realX = (c / cols) * lx;
      const realY = (r / rows) * ly;

      setHoverData({
        x: e.clientX,
        y: e.clientY,
        val: val,
        gridX: realX.toFixed(2),
        gridY: realY.toFixed(2)
      });
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => setHoverData(null);
  
  // Responsive sizing maintaining aspect ratio
  const canvasWidth = 350;
  let canvasHeight = (ly / lx) * canvasWidth;
  if (canvasHeight > 350) {
      canvasHeight = 350;
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '15px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>{title}</h4>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ border: '1px solid #cbd5e1', cursor: 'crosshair', backgroundColor: '#fff', borderRadius: '4px' }}
        />
        {hoverData && (
          <div style={{
            position: 'fixed',
            left: hoverData.x + 15,
            top: hoverData.y + 15,
            background: 'rgba(15, 23, 42, 0.9)',
            color: 'white',
            padding: '10px 12px',
            borderRadius: '6px',
            pointerEvents: 'none',
            fontSize: '13px',
            zIndex: 1000,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#38bdf8' }}>
                {hoverData.val.toFixed(3)} {unit}
            </div>
            <div style={{ color: '#cbd5e1' }}>
                Coord: ({hoverData.gridX}m, {hoverData.gridY}m)
            </div>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: `${canvasWidth}px`, fontSize: '12px', marginTop: '10px', color: '#475569', fontWeight: '500' }}>
        <span>{min.toFixed(2)}</span>
        <div style={{ flex: 1, height: '8px', margin: '6px 10px 0 10px', borderRadius: '4px', background: 'linear-gradient(to right, hsl(240,100%,50%), hsl(180,100%,50%), hsl(120,100%,50%), hsl(60,100%,50%), hsl(0,100%,50%))' }} />
        <span>{max.toFixed(2)} {unit}</span>
      </div>
    </div>
  );
};

export default InteractiveHeatmap;
