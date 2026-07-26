import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MATERIALS } from '../constants/slabConstants';

export function useCanvasInteraction({
  svgRef, isPanningRef, panStartRef, isDraggingRef, stateRef, hudInputRef,
  zoom, setZoom, panOffset, setPanOffset,
  gridStep, params, setParams, offset, setOffset, slabOffset, setSlabOffset, shape, setShape,
  internalWalls, setInternalWalls, columns, setColumns, openings, setOpenings,
  colConfig, material, wallHeight, designParams, setDesignParams, activeLayer,
  saveHistory
}) {
  // Hover interactivo (bidireccional SVG <-> Tabla)
  const [hoveredWallId, setHoveredWallId] = useState(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);

  // Interacción Canvas (Mouse & Snap)
  const [mouseCoord, setMouseCoord] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState('perimetral');
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [hudInput, setHudInput] = useState('');
  const [hudPos, setHudPos] = useState({ x: 0, y: 0 });
  const [orthoLock, setOrthoLock] = useState(false);

  // OFFSET
  const [offsetSourceWall, setOffsetSourceWall] = useState(null);
  const [offsetPreview, setOffsetPreview] = useState(null);
  const [offsetDist, setOffsetDist] = useState(0.15);

  // ROTATE
  const [rotateSelectedIds, setRotateSelectedIds] = useState(new Set());
  const [rotateAngle, setRotateAngle] = useState(0);
  const [rotatePivotMode, setRotatePivotMode] = useState('centroid');

  const rotatePoint = (x, y, cx, cy, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + (x - cx) * cos - (y - cy) * sin,
      y: cy + (x - cx) * sin + (y - cy) * cos,
    };
  };

  const getRotatedWalls = (ids = rotateSelectedIds, angleDeg = rotateAngle) => {
    const walls = internalWalls.filter(w => ids.has(w.id));
    if (walls.length === 0) return [];
    let cx = 0, cy = 0, count = 0;
    if (rotatePivotMode === 'centroid') {
      walls.forEach(w => { cx += w.x1 + w.x2; cy += w.y1 + w.y2; count += 2; });
      cx /= count; cy /= count;
    }
    return walls.map(w => {
      const p1 = rotatePoint(w.x1, w.y1, cx, cy, angleDeg);
      const p2 = rotatePoint(w.x2, w.y2, cx, cy, angleDeg);
      return { ...w, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    });
  };

  const snapToGrid = useCallback((val) => gridStep > 0 ? Math.round(val / gridStep) * gridStep : val, [gridStep]);

  const MARGIN = 40;
  const scale = 50;
  const CANVAS_WIDTH = Math.max(params.Lx, 1) * scale + MARGIN * 2;
  const CANVAS_HEIGHT = Math.max(params.Ly, 1) * scale + MARGIN * 2;

  const toSvg = useCallback((m) => MARGIN + (m * scale), [scale]);

  const toMetersX = useCallback((px, doSnap = false) => {
    let m = (px - MARGIN) / scale;
    m = Math.max(0, Math.min(m, Math.max(params.Lx, 1)));
    if (doSnap) m = snapToGrid(m);
    return m;
  }, [scale, snapToGrid, params.Lx]);

  const toMetersY = useCallback((py, doSnap = false) => {
    let m = (py - MARGIN) / scale;
    m = Math.max(0, Math.min(m, Math.max(params.Ly, 1)));
    if (doSnap) m = snapToGrid(m);
    return m;
  }, [scale, snapToGrid, params.Ly]);

  const getPerimeterVertices = useCallback((overrideOffset = null) => {
    const { Lx, Ly, wingX, wingY, wingX2, baseY, barY } = params;
    const o = overrideOffset !== null ? overrideOffset : (parseFloat(offset) || 0);
    const maxSafe = Math.min(Lx, Ly) / 2.05;
    const safeO = Math.max(0, Math.min(o, maxSafe)); 

    let pts = [];
    switch (shape) {
      case 'libre':
      case 'rectangular':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'L':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: wingY - safeO }, { x: wingX - safeO, y: wingY - safeO }, { x: wingX - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'U':
        pts = [{ x: safeO, y: safeO }, { x: Lx - safeO, y: safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: Lx - wingX2 + safeO, y: Ly - safeO }, { x: Lx - wingX2 + safeO, y: baseY + safeO }, { x: wingX - safeO, y: baseY + safeO }, { x: wingX - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }];
        break;
      case 'T':
        pts = [{ x: wingX + safeO, y: safeO }, { x: Lx - wingX2 - safeO, y: safeO }, { x: Lx - wingX2 - safeO, y: Ly - barY - safeO }, { x: Lx - safeO, y: Ly - barY - safeO }, { x: Lx - safeO, y: Ly - safeO }, { x: safeO, y: Ly - safeO }, { x: safeO, y: Ly - barY - safeO }, { x: wingX + safeO, y: Ly - barY - safeO }];
        break;
      default: pts = [];
    }
    return pts;
  }, [shape, params, offset]);

  const perimeterWalls = useMemo(() => {
    if (shape === 'libre') return [];
    const totalOffset = (parseFloat(offset) || 0) + (parseFloat(slabOffset) || 0);
    const pts = getPerimeterVertices(totalOffset);
    const matProps = MATERIALS[material] || { thickness: 0.15, density: 1200 };
    const walls = [];
    
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      walls.push({
        id: `perim_${i}`,
        type: 'perimetral',
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        thickness: matProps.thickness,
        height: parseFloat(wallHeight) || 2.7,
        density: matProps.density,
        is_plastered: designParams.is_plastered
      });
    }
    return walls;
  }, [getPerimeterVertices, material, wallHeight, designParams.is_plastered, shape, offset, slabOffset]);

  const allWalls = useMemo(() => {
    const matProps = MATERIALS[material] || { thickness: 0.15, density: 1200 };
    const formattedInternal = internalWalls.map(w => {
      const type = w.type || 'interno';
      return {
        ...w,
        type,
        thickness: w.thickness || (type === 'interno' ? 0.12 : type === 'support_beam' ? 0.3 : matProps.thickness),
        height: parseFloat(wallHeight) || 2.7,
        density: matProps.density,
        is_plastered: designParams.is_plastered
      };
    });
    return [...perimeterWalls, ...formattedInternal];
  }, [perimeterWalls, internalWalls, material, wallHeight, designParams.is_plastered]);

  const convertToManual = () => {
    if (shape === 'libre') return;
    saveHistory();
    const perimeterCopy = perimeterWalls.map((w, i) => ({
      id: `man_${Date.now()}_${i}`,
      type: 'perimetral',
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2
    }));
    
    setOpenings(prev => prev.map(op => {
      const perimMatch = perimeterCopy.find((_, idx) => op.wall_id === `perim_${idx}`);
      if (perimMatch) return { ...op, wall_id: perimMatch.id };
      return op;
    }));
    
    setInternalWalls(prev => [
      ...perimeterCopy,
      ...prev.filter(w => !String(w.id).startsWith('man_') && w.type !== 'perimetral')
    ]);
    setShape('libre');
  };

  const handleParamChange = (field, value) => setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  const handleDesignParamChange = (field, value) => setDesignParams(prev => ({ ...prev, [field]: value }));

  const handleShapeChange = (newShape) => {
    saveHistory();
    setShape(newShape);
    if (newShape !== 'libre') {
      setInternalWalls(prev => prev.filter(w => typeof w.id !== 'string' || !w.id.startsWith('man_')));
      setOpenings(prev => prev.filter(op => typeof op.wall_id !== 'string' || !op.wall_id.startsWith('man_')));
    }
  };

  const addInternalWall = (w) => {
    saveHistory();
    setInternalWalls(prev => [...prev, { id: Date.now(), type: drawType, layer_id: activeLayer, x1: w.x1 ?? 0, y1: w.y1 ?? 0, x2: w.x2 ?? 1, y2: w.y2 ?? 1 }]);
  };

  const updateInternalWall = (id, field, value) => {
    saveHistory();
    setInternalWalls(prev => prev.map(w => w.id === id ? { ...w, [field]: (field === 'type' ? value : (parseFloat(value) || 0)) } : w));
  };

  const removeInternalWall = (id) => {
    saveHistory();
    setInternalWalls(prev => prev.filter(w => w.id !== id));
    setOpenings(prev => prev.filter(op => op.wall_id !== id));
  };

  const removeOpening = (id) => {
    saveHistory();
    setOpenings(prev => prev.filter(op => op.id !== id));
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom(prev => Math.max(0.5, Math.min(8, prev * zoomFactor)));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [svgRef, setZoom]);

  const handlePanStart = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey && e.button !== 1) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
  }, [panOffset, isPanningRef, panStartRef]);

  const handlePanMove = useCallback((e) => {
    if (!isPanningRef.current) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleFactorX = CANVAS_WIDTH / (rect.width || CANVAS_WIDTH);
    const scaleFactorY = CANVAS_HEIGHT / (rect.height || CANVAS_HEIGHT);
    const dx = ((e.clientX - panStartRef.current.x) * scaleFactorX) / zoom;
    const dy = ((e.clientY - panStartRef.current.y) * scaleFactorY) / zoom;
    setPanOffset({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
  }, [zoom, isPanningRef, svgRef, CANVAS_WIDTH, CANVAS_HEIGHT, panStartRef, setPanOffset]);

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
  }, [isPanningRef]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoom, setPanOffset]);

  const getSvgPx = (e, svgElement) => {
    if (!svgElement) return { px: 0, py: 0 };
    const rect = svgElement.getBoundingClientRect();
    
    const vbWidth = CANVAS_WIDTH / zoom;
    const vbHeight = CANVAS_HEIGHT / zoom;
    
    const ratio = Math.min(rect.width / vbWidth, rect.height / vbHeight);
    if (ratio === 0) return { px: 0, py: 0 };
    
    const renderWidth = vbWidth * ratio;
    const renderHeight = vbHeight * ratio;
    
    const offsetX = (rect.width - renderWidth) / 2;
    const offsetY = (rect.height - renderHeight) / 2;
    
    const xInRender = (e.clientX - rect.left) - offsetX;
    const yInRender = (e.clientY - rect.top) - offsetY;
    
    const vbX = xInRender / ratio;
    const vbY = yInRender / ratio;
    
    const minX = -panOffset.x * zoom;
    const minY = -panOffset.y * zoom;
    
    return { 
      px: vbX + minX, 
      py: vbY + minY 
    };
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    if (isPanningRef.current) {
      handlePanMove(e);
      return;
    }
    const { px, py } = getSvgPx(e, svgRef.current);
    
    const rawMx = toMetersX(px, false);
    const rawMy = toMetersY(py, false);

    let snapMx = toMetersX(px, true);
    let snapMy = toMetersY(py, true);
    let minD = 0.2;
    
    const checkSnap = (x, y) => {
      const d = Math.sqrt((rawMx - x) ** 2 + (rawMy - y) ** 2);
      if (d < minD) {
        minD = d;
        snapMx = x;
        snapMy = y;
      }
    };
    checkSnap(0, 0); checkSnap(params.Lx, 0); checkSnap(0, params.Ly); checkSnap(params.Lx, params.Ly);
    allWalls.forEach(w => {
      checkSnap(w.x1, w.y1);
      checkSnap(w.x2, w.y2);
      
      const l2 = (w.x2 - w.x1)**2 + (w.y2 - w.y1)**2;
      if (l2 > 0) {
        const t = Math.max(0, Math.min(1, ((rawMx - w.x1)*(w.x2 - w.x1) + (rawMy - w.y1)*(w.y2 - w.y1)) / l2));
        const pX = w.x1 + t * (w.x2 - w.x1);
        const pY = w.y1 + t * (w.y2 - w.y1);
        checkSnap(pX, pY);
      }
    });

    const mx = Math.max(0, Math.min(snapMx, params.Lx));
    const my = Math.max(0, Math.min(snapMy, params.Ly));

    setMouseCoord({ x: mx, y: my });

    setSelectionBox(prev => {
      if (prev) {
        if (Math.abs(prev.startX - rawMx) > 0.1 || Math.abs(prev.startY - rawMy) > 0.1) {
          isDraggingRef.current = true;
        }
        return { ...prev, currentX: rawMx, currentY: rawMy };
      }
      return prev;
    });

    if (isDrawing && drawStart) {
      const manualLen = parseFloat(hudInput);
      if (!isNaN(manualLen) && manualLen > 0) {
        const angle = Math.atan2(my - drawStart.y, mx - drawStart.x);
        const finalAngle = e.shiftKey ? Math.round(angle / (Math.PI / 4)) * (Math.PI / 4) : angle;
        setDrawEnd({
          x: drawStart.x + Math.cos(finalAngle) * manualLen,
          y: drawStart.y + Math.sin(finalAngle) * manualLen
        });
        setOrthoLock(e.shiftKey);
      } else {
        if (e.shiftKey) {
          const angle = Math.atan2(my - drawStart.y, mx - drawStart.x);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.sqrt((mx - drawStart.x) ** 2 + (my - drawStart.y) ** 2);
          setDrawEnd({
            x: drawStart.x + Math.cos(snappedAngle) * dist,
            y: drawStart.y + Math.sin(snappedAngle) * dist
          });
          setOrthoLock(true);
        } else {
          setDrawEnd({ x: mx, y: my });
          setOrthoLock(false);
        }
      }
      setHudPos({ x: e.clientX + 18, y: e.clientY - 10 });
    }

    if (drawType === 'offset' && offsetSourceWall) {
      const w = offsetSourceWall;
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const L = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / L;
      const ny =  dx / L;
      const side = ((mx - w.x1) * nx + (my - w.y1) * ny) >= 0 ? 1 : -1;
      const d = offsetDist * side;
      setOffsetPreview({
        x1: w.x1 + nx * d, y1: w.y1 + ny * d,
        x2: w.x2 + nx * d, y2: w.y2 + ny * d,
        side
      });
    }
  };

  const commitWall = useCallback((overrideEnd = null) => {
    const end = overrideEnd || drawEnd;
    if (drawStart && end && (drawStart.x !== end.x || drawStart.y !== end.y)) {
      addInternalWall({ x1: drawStart.x, y1: drawStart.y, x2: end.x, y2: end.y });
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
    setHudInput('');
    setOrthoLock(false);
  }, [drawStart, drawEnd, addInternalWall]);

  const handleSvgDoubleClick = () => {
    if (!drawType) return;
    if (drawType === 'columna') return;

    if (!isDrawing) {
      setIsDrawing(true);
      setDrawStart({ ...mouseCoord });
      setDrawEnd({ ...mouseCoord });
      setHudInput('');
      setTimeout(() => hudInputRef.current?.focus(), 50);
    } else {
      commitWall();
    }
  };

  const handleSvgClick = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    if (drawType === 'offset' && offsetSourceWall && offsetPreview) {
      saveHistory();
      addInternalWall({
        x1: offsetPreview.x1, y1: offsetPreview.y1,
        x2: offsetPreview.x2, y2: offsetPreview.y2
      });
      setOffsetSourceWall(null);
      setOffsetPreview(null);
      return;
    }
    if (!drawType) {
      setSelectedElement(null);
      return;
    }
    if (drawType === 'columna') {
      saveHistory();
      const loadCalc = colConfig.width * colConfig.length * colConfig.height * 2500;
      setColumns(prev => [...prev, {
        id: Date.now(),
        x: mouseCoord.x,
        y: mouseCoord.y,
        width: colConfig.width,
        length: colConfig.length,
        height: colConfig.height,
        load_kgf: loadCalc
      }]);
    }
  };

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('type', type);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (!type) return;

    const { px, py } = getSvgPx(e, svgRef.current);
    const dropX = toMetersX(px);
    const dropY = toMetersY(py, false);

    let closestWall = null;
    let minD = Infinity;
    let projDist = 0;

    allWalls.forEach(w => {
      const l2 = (w.x2 - w.x1)**2 + (w.y2 - w.y1)**2;
      let t = 0;
      if (l2 > 0) {
        t = Math.max(0, Math.min(1, ((dropX - w.x1)*(w.x2 - w.x1) + (dropY - w.y1)*(w.y2 - w.y1)) / l2));
      }
      const pX = w.x1 + t * (w.x2 - w.x1);
      const pY = w.y1 + t * (w.y2 - w.y1);
      const d = Math.sqrt((dropX - pX)**2 + (dropY - pY)**2);

      if (d < minD) {
        minD = d;
        closestWall = w;
        projDist = Math.sqrt((pX - w.x1)**2 + (pY - w.y1)**2);
      }
    });

    if (minD < 1.0 && closestWall) {
      const isDoor = type.startsWith('door');
      const width_m = isDoor ? 1.0 : 1.5;
      const height_m = isDoor ? 2.1 : 1.2;
      
      const length = Math.sqrt((closestWall.x2 - closestWall.x1)**2 + (closestWall.y2 - closestWall.y1)**2);
      let start_m = projDist - width_m / 2;
      if (start_m < 0) start_m = 0;
      if (start_m + width_m > length) start_m = length - width_m;

      saveHistory();
      setOpenings(prev => [...prev, {
        id: `op_${Date.now()}`,
        wall_id: closestWall.id,
        type: type,
        start_m, width_m, height_m
      }]);
      toast.success(`${isDoor ? 'Puerta' : 'Ventana'} añadida`);
    } else {
      toast.error("Debes soltar la abertura sobre un muro.");
    }
  };

  stateRef.current = {
    isDrawing, drawType, selectedElement, saveHistory,
    setColumns, setInternalWalls, setOpenings,
    setIsDrawing, setDrawStart, setDrawEnd, setDrawType, setSelectedElement,
    setHudInput, setOrthoLock
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = stateRef.current;
      if (!state) return;
      
      if (e.key === 'Escape') {
        if (state.isDrawing) {
          state.setIsDrawing(false);
          state.setDrawStart(null);
          state.setDrawEnd(null);
          state.setHudInput('');
          state.setOrthoLock(false);
        }
        state.setDrawType(null);
        state.setSelectedElement(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElement && !state.isDrawing && !state.drawType) {
          state.saveHistory();
          if (state.selectedElement.type === 'columna') {
            state.setColumns(prev => prev.filter(c => c.id !== state.selectedElement.id));
          }
          state.setSelectedElement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stateRef]);

  return {
    hoveredWallId, setHoveredWallId, hoveredOpeningId, setHoveredOpeningId,
    selectedElement, setSelectedElement, selectionBox, setSelectionBox,
    mouseCoord, setMouseCoord, isDrawing, setIsDrawing, drawType, setDrawType,
    drawStart, setDrawStart, drawEnd, setDrawEnd, hudInput, setHudInput,
    hudPos, setHudPos, orthoLock, setOrthoLock,
    offsetSourceWall, setOffsetSourceWall, offsetPreview, setOffsetPreview, offsetDist, setOffsetDist,
    rotateSelectedIds, setRotateSelectedIds, rotateAngle, setRotateAngle, rotatePivotMode, setRotatePivotMode,
    rotatePoint, getRotatedWalls, snapToGrid, MARGIN, scale, CANVAS_WIDTH, CANVAS_HEIGHT,
    toSvg, toMetersX, toMetersY, getPerimeterVertices, perimeterWalls, allWalls, convertToManual,
    handleParamChange, handleDesignParamChange, handleShapeChange,
    addInternalWall, updateInternalWall, removeInternalWall, removeOpening,
    handlePanStart, handlePanMove, handlePanEnd, resetZoom, getSvgPx,
    handleMouseMove, commitWall, handleSvgDoubleClick, handleSvgClick, handleDragStart, handleDrop
  };
}
