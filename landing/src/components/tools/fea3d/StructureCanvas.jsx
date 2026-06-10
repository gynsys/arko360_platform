import React, { useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Text, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';

function ShellMesh({ id, nodeIds, getDisplacement, isFaded }) {
  const { nodes, selectedIds, toggleSelection, viewMode } = useStructureStore();
  const isSelected = selectedIds.includes(id);
  const isResultsMode = viewMode === 'results';

  // Triangular el cuadrilátero en 2 triángulos: [0,1,2] y [0,2,3]
  // Se usa BufferGeometry imperativa para evitar el error de <float32Array> en JSX
  const coordKey = useMemo(() => {
    let key = nodeIds.map(nid => { const n = nodes.find(nd => nd.id === nid); return n ? `${n.x},${n.y},${n.z}` : 'x'; }).join('|');
    if (getDisplacement) {
      const disp = nodeIds.map(nid => getDisplacement(nid).join(',')).join('|');
      key += `|${disp}`;
    }
    return key;
  }, [nodeIds, nodes, getDisplacement]);

  const geometry = useMemo(() => {
    const coords = nodeIds.map(nid => {
      const n = nodes.find(nd => nd.id === nid);
      if (!n) return null;
      const d = getDisplacement ? getDisplacement(n.id) : [0, 0, 0];
      return { x: n.x + d[0], y: n.y + d[1], z: n.z + d[2] };
    }).filter(Boolean);
    
    if (coords.length < 3) return null;

    const n0 = coords[0];
    const n1 = coords[1];
    const n2 = coords[2];
    const n3 = coords[3] ?? coords[0]; // Fallback al primero si solo hay 3 nodos

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      n0.x, n0.y, n0.z,
      n1.x, n1.y, n1.z,
      n2.x, n2.y, n2.z,
      n0.x, n0.y, n0.z,
      n2.x, n2.y, n2.z,
      n3.x, n3.y, n3.z,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [coordKey]); // Solo recalcula cuando las coordenadas reales cambian

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      onClick={isResultsMode || isFaded ? undefined : (e) => { e.stopPropagation(); toggleSelection(id, e.shiftKey || e.ctrlKey); }}
    >
      <meshStandardMaterial
        color={isSelected ? '#facc15' : isResultsMode ? '#4f46e5' : '#6366f1'}
        transparent={isFaded}
        depthWrite={!isFaded}
        opacity={isFaded ? 0.05 : isSelected ? 0.5 : isResultsMode ? 0.8 : 0.25}
        side={THREE.DoubleSide}
        wireframe={isFaded}
      />
    </mesh>
  );
}

function FrameElement({ start, end, id, isShadow, isFaded }) {
  const { selectedIds, toggleSelection, setRightClickedElementId, viewMode } = useStructureStore();
  const isSelected = selectedIds.includes(id);
  const isResultsMode = viewMode === 'results';

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([...start, ...end]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  return (
    <line 
      geometry={geometry} 
      onClick={isResultsMode || isShadow || isFaded ? undefined : (e) => { 
        e.stopPropagation(); toggleSelection(id, e.shiftKey || e.ctrlKey); 
      }}
      onContextMenu={isResultsMode && !isShadow && !isFaded ? (e) => {
        e.stopPropagation();
        setRightClickedElementId(id);
      } : undefined}
    >
      <lineBasicMaterial 
        color={isShadow ? '#334155' : isFaded ? '#475569' : isSelected ? '#facc15' : isResultsMode ? '#38bdf8' : '#94a3b8'} 
        linewidth={isShadow ? 1 : 2} 
        transparent={isShadow || isFaded}
        depthWrite={!(isShadow || isFaded)}
        opacity={isShadow ? 0.3 : isFaded ? 0.15 : 1}
      />
    </line>
  );
}

function ForceDiagram({ id, start, end, stations, resultType, scale }) {
  if (!stations || stations.length === 0) return null;

  const geometry = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const dirX = new THREE.Vector3().subVectors(p2, p1).normalize();

    // Ejes locales
    let dirY = new THREE.Vector3();
    let dirZ = new THREE.Vector3();
    
    if (Math.abs(dirX.x) < 1e-6 && Math.abs(dirX.y) < 1e-6) {
      const m = dirX.z > 0 ? 1 : -1;
      dirY.set(0, 1, 0);
      dirZ.set(-m, 0, 0);
    } else {
      const D = Math.sqrt(dirX.x * dirX.x + dirX.y * dirX.y);
      dirY.set(-dirX.y / D, dirX.x / D, 0);
      dirZ.set(-dirX.x * dirX.z / D, -dirX.y * dirX.z / D, D);
    }

    // Eje de dibujo según convención SAP2000: Momentos y cortantes
    let plotDir = dirY;
    if (resultType === 'V3' || resultType === 'M2') {
      plotDir = dirZ;
    } else if (resultType === 'M3') {
      // M3 se dibuja perpendicular a V2, o sea en el plano local Y
      plotDir = dirY.clone().negate(); // Invertido visualmente para tracción abajo
    }

    const geo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    const points = stations.map(st => {
      const val = st[resultType] * scale;
      const basePos = new THREE.Vector3().copy(p1).add(dirX.clone().multiplyScalar(st.x));
      const offsetPos = new THREE.Vector3().copy(basePos).add(plotDir.clone().multiplyScalar(val));
      return { base: basePos, offset: offsetPos, val: st[resultType] };
    });

    for (let i = 0; i < points.length - 1; i++) {
      const pA = points[i];
      const pB = points[i+1];
      
      const v0 = pA.base, v1 = pA.offset, v2 = pB.offset, v3 = pB.base;

      // Colores: Rojo (+) , Azul (-)
      const cA = pA.val >= 0 ? [0.93, 0.26, 0.26] : [0.22, 0.51, 0.96];
      const cB = pB.val >= 0 ? [0.93, 0.26, 0.26] : [0.22, 0.51, 0.96];

      positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      colors.push(...cA, ...cA, ...cB);
      positions.push(v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      colors.push(...cA, ...cB, ...cB);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();

    // Encontrar picos para el texto
    let maxAbsVal = 0;
    let maxPoint = null;
    let minPoint = null;
    let minVal = Infinity;
    let maxVal = -Infinity;

    points.forEach(p => {
      if (p.val > maxVal) { maxVal = p.val; maxPoint = p.offset; }
      if (p.val < minVal) { minVal = p.val; minPoint = p.offset; }
    });

    return { geo, maxPoint, minPoint, maxVal, minVal };
  }, [stations, scale, resultType, start, end]);

  return (
    <group>
      <mesh geometry={geometry.geo}>
        <meshBasicMaterial vertexColors transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Textos de Picos */}
      {geometry.maxPoint && Math.abs(geometry.maxVal) > 1e-4 && (
        <Text 
          position={[geometry.maxPoint.x, geometry.maxPoint.y, geometry.maxPoint.z + 0.2]} 
          fontSize={0.25} color="white" outlineColor="black" outlineWidth={0.05}
          rotation={[Math.PI / 2, 0, 0]}
        >
          {geometry.maxVal.toFixed(2)}
        </Text>
      )}
      {geometry.minPoint && Math.abs(geometry.minVal) > 1e-4 && geometry.maxVal !== geometry.minVal && (
        <Text 
          position={[geometry.minPoint.x, geometry.minPoint.y, geometry.minPoint.z + 0.2]} 
          fontSize={0.25} color="white" outlineColor="black" outlineWidth={0.05}
          rotation={[Math.PI / 2, 0, 0]}
        >
          {geometry.minVal.toFixed(2)}
        </Text>
      )}
    </group>
  );
}

function NodePoint({ x, y, z, dx = 0, dy = 0, dz = 0, id, restraint, isFaded }) {
  const { selectedIds, toggleSelection, isDrawingShell, drawingNodes, addNodeToDrawing, viewMode } = useStructureStore();
  
  const isSelected = selectedIds.includes(id);
  const isPartofDrawing = drawingNodes.includes(id);
  const isResultsMode = viewMode === 'results';
  const hasRestraint = !!restraint;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDrawingShell) {
      addNodeToDrawing(id);
    } else {
      toggleSelection(id, e.shiftKey || e.ctrlKey);
    }
  };

  // Determinar tipo de apoyo
  let supportMesh = null;
  if (hasRestraint) {
    const isFixed = restraint.ux && restraint.uy && restraint.uz && restraint.rx && restraint.ry && restraint.rz;
    const isPinned = restraint.ux && restraint.uy && restraint.uz && !restraint.rx && !restraint.ry && !restraint.rz;
    const isRoller = !restraint.ux && !restraint.uy && restraint.uz && !restraint.rx && !restraint.ry && !restraint.rz;

    if (isFixed) {
      supportMesh = (
        <mesh position={[0, 0, -0.15]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#3b82f6" opacity={0.8} transparent />
        </mesh>
      );
    } else if (isPinned) {
      supportMesh = (
        <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.3, 4]} />
          <meshStandardMaterial color="#10b981" opacity={0.8} transparent />
        </mesh>
      );
    } else if (isRoller) {
      supportMesh = (
        <mesh position={[0, 0, -0.1]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
          <meshStandardMaterial color="#f97316" opacity={0.8} transparent />
        </mesh>
      );
    } else {
      supportMesh = (
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[0.2, 0.2, 0.1]} />
          <meshStandardMaterial color="#64748b" opacity={0.8} transparent />
        </mesh>
      );
    }
  }

  return (
    <group position={[x + dx, y + dy, z + dz]} onClick={isResultsMode || isFaded ? undefined : handleClick}>
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={isFaded ? '#475569' : isPartofDrawing ? '#fb923c' : isSelected ? '#facc15' : hasRestraint ? '#ef4444' : isResultsMode ? '#38bdf8' : '#60a5fa'}
          emissive={isPartofDrawing ? '#fb923c' : '#000'}
          emissiveIntensity={0.5}
          transparent={isFaded}
          depthWrite={!isFaded}
          opacity={isFaded ? 0.15 : 1}
        />
      </mesh>
      {supportMesh && !isResultsMode && !isFaded && supportMesh}
    </group>
  );
}

function PointLoadArrow({ node, load }) {
  const { viewMode } = useStructureStore();
  if (viewMode === 'results') return null;

  const length = 1.5;
  const color = 0xf97316; // Orange-500

  // Direction logic
  let dir = new THREE.Vector3(0, 0, -1);
  if (load.direction === 'X') dir.set(Math.sign(load.magnitude), 0, 0);
  else if (load.direction === 'Y') dir.set(0, Math.sign(load.magnitude), 0);
  else if (load.direction === 'Z') dir.set(0, 0, Math.sign(load.magnitude));
  
  if (load.magnitude === 0) return null;

  const origin = new THREE.Vector3(node.x, node.y, node.z).sub(dir.clone().multiplyScalar(length));

  return (
    <group>
      <arrowHelper args={[dir, origin, length, color, 0.4, 0.2]} />
      <Text 
        position={[origin.x, origin.y, origin.z + 0.2]} 
        fontSize={0.3} 
        color="#f97316" 
        outlineColor="black" 
        outlineWidth={0.05}
        rotation={[Math.PI / 2, 0, 0]} // Mirando hacia arriba en el grid XY
      >
        {Math.abs(load.magnitude)} kN
      </Text>
    </group>
  );
}

// Controlador para animar y posicionar la cámara según la vista activa
function CameraController() {
  const { cameraView, activeLevel, nodes } = useStructureStore();
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!controls) return;

    // Calcular el centro geométrico de la estructura
    let cx = 0, cy = 0, cz = 0;
    if (nodes.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      nodes.forEach(n => {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
        if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
      });
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      cz = (minZ + maxZ) / 2;
    }

    if (cameraView === '3D') {
      controls.enableRotate = true;
      // Posición isométrica predeterminada si venimos de 2D
      if (camera.isOrthographicCamera) {
        // En react-three-fiber, el cambio de cámara lo hacemos con componentes condicionales, 
        // pero reseteamos el target aquí
        controls.target.set(cx, cy, cz);
      }
    } else if (cameraView === 'XY') {
      controls.enableRotate = false;
      camera.position.set(cx, cy, activeLevel + 100);
      camera.up.set(0, 1, 0); // Para que Y sea arriba
      controls.target.set(cx, cy, activeLevel);
    } else if (cameraView === 'XZ') {
      controls.enableRotate = false;
      camera.position.set(cx, activeLevel - 100, cz);
      camera.up.set(0, 0, 1); // Z es arriba
      controls.target.set(cx, activeLevel, cz);
    } else if (cameraView === 'YZ') {
      controls.enableRotate = false;
      camera.position.set(activeLevel + 100, cy, cz);
      camera.up.set(0, 0, 1); // Z es arriba
      controls.target.set(activeLevel, cy, cz);
    }
    controls.update();
  }, [cameraView, activeLevel, controls, camera, nodes]);

  return null;
}

// Controlador de Selección por Ventana
function SelectionHandler() {
  const { gl, camera } = useThree();
  const { 
    nodes, elements, shells, 
    setSelectionBox, setSelectedIds, selectedIds, 
    viewMode, cameraView, activeLevel 
  } = useStructureStore();
  
  const isResultsMode = viewMode === 'results';

  // Tolerancia para vistas 2D (reutilizada)
  const TOLERANCE = 0.05;
  const isNodeActive = (n) => {
    if (cameraView === '3D') return true;
    if (cameraView === 'XY') return Math.abs(n.z - activeLevel) <= TOLERANCE;
    if (cameraView === 'XZ') return Math.abs(n.y - activeLevel) <= TOLERANCE;
    if (cameraView === 'YZ') return Math.abs(n.x - activeLevel) <= TOLERANCE;
    return true;
  };

  useEffect(() => {
    const canvas = gl.domElement;
    let isDragging = false;
    let startPos = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      // Solo clic izquierdo y no en modo resultados
      if (e.button !== 0 || isResultsMode) return;
      
      // Evitar iniciar selección si se hizo clic en un objeto interactivo
      // (Los objetos interactivos consumen el evento gracias a e.stopPropagation() en R3F)
      
      isDragging = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startPos = { x, y };
      
      setSelectionBox({ isSelecting: true, startX: x, startY: y, endX: x, endY: y, mode: 'window' });
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Determinar modo: de Izquierda a Derecha = 'window', de Derecha a Izquierda = 'crossing'
      const mode = x >= startPos.x ? 'window' : 'crossing';
      
      setSelectionBox({ endX: x, endY: y, mode });
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      
      // Si el área es muy pequeña, fue un clic normal
      const dist = Math.hypot(endX - startPos.x, endY - startPos.y);
      if (dist < 5) {
        setSelectionBox({ isSelecting: false });
        return;
      }
      
      // Procesar selección
      const minX = Math.min(startPos.x, endX);
      const maxX = Math.max(startPos.x, endX);
      const minY = Math.min(startPos.y, endY);
      const maxY = Math.max(startPos.y, endY);
      
      const mode = endX >= startPos.x ? 'window' : 'crossing';
      
      const isPointInside = (nx, ny, nz) => {
        const p = new THREE.Vector3(nx, ny, nz);
        p.project(camera);
        // NDC a Píxeles del canvas
        const px = (p.x *  .5 + .5) * rect.width;
        const py = (p.y * -.5 + .5) * rect.height;
        // Comprobar también que no esté detrás de la cámara (z > 1)
        if (p.z > 1 || p.z < -1) return false;
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
      };

      const newSelected = new Set(e.shiftKey || e.ctrlKey ? selectedIds : []);

      // Seleccionar nodos
      nodes.forEach(n => {
        if (!isNodeActive(n)) return;
        if (isPointInside(n.x, n.y, n.z)) {
          newSelected.add(n.id);
        }
      });

      // Seleccionar elementos
      elements.forEach(el => {
        const n1 = nodes.find(n => n.id === el.nodes[0]);
        const n2 = nodes.find(n => n.id === el.nodes[1]);
        if (!n1 || !n2) return;
        if (!isNodeActive(n1) || !isNodeActive(n2)) return;

        const in1 = isPointInside(n1.x, n1.y, n1.z);
        const in2 = isPointInside(n2.x, n2.y, n2.z);

        if (mode === 'window') {
          // Ambos nodos adentro
          if (in1 && in2) newSelected.add(el.id);
        } else {
          // Crossing: Al menos uno adentro, O punto medio adentro (aproximación rápida a intersección de línea)
          if (in1 || in2) {
            newSelected.add(el.id);
          } else {
            const mx = (n1.x + n2.x) / 2;
            const my = (n1.y + n2.y) / 2;
            const mz = (n1.z + n2.z) / 2;
            if (isPointInside(mx, my, mz)) newSelected.add(el.id);
          }
        }
      });

      // Seleccionar shells
      shells.forEach(s => {
        const shellNodes = s.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
        if (shellNodes.length === 0) return;
        if (cameraView !== '3D' && !shellNodes.every(n => isNodeActive(n))) return;

        const insides = shellNodes.map(n => isPointInside(n.x, n.y, n.z));
        const allInside = insides.every(val => val === true);
        const someInside = insides.some(val => val === true);

        if (mode === 'window' && allInside) {
          newSelected.add(s.id);
        } else if (mode === 'crossing' && someInside) {
          newSelected.add(s.id);
        } else if (mode === 'crossing' && !someInside) {
          // Aproximación: punto central del shell
          let cx = 0, cy = 0, cz = 0;
          shellNodes.forEach(n => { cx += n.x; cy += n.y; cz += n.z; });
          cx /= shellNodes.length; cy /= shellNodes.length; cz /= shellNodes.length;
          if (isPointInside(cx, cy, cz)) newSelected.add(s.id);
        }
      });

      setSelectedIds(Array.from(newSelected));
      setSelectionBox({ isSelecting: false });
    };

    // Agregar listeners al window en lugar del canvas para no perder el tracking si sale del área
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, camera, nodes, elements, shells, selectedIds, viewMode, cameraView, activeLevel, setSelectionBox, setSelectedIds]);

  return null;
}

export function StructureCanvas() {
  const { 
    nodes, elements, shells, loads, isDrawingShell, clearSelection,
    viewMode, results, activeResultCombo, activeResultType, displacementScale, diagramScale, showLoads,
    cameraView, activeLevel
  } = useStructureStore();

  const getDisplacement = (nodeId) => {
    if (viewMode === 'results' && results && activeResultCombo && activeResultType === 'deformed') {
      const comboResults = results.results[activeResultCombo];
      if (comboResults && comboResults.displacements && comboResults.displacements[nodeId]) {
        const d = comboResults.displacements[nodeId];
        return [d[0] * displacementScale, d[1] * displacementScale, d[2] * displacementScale];
      }
    }
    return [0, 0, 0];
  };

  // Tolerancia para considerar si un elemento está en el nivel activo
  const TOLERANCE = 0.05;

  const isNodeActive = (n) => {
    if (cameraView === '3D') return true;
    if (cameraView === 'XY') return Math.abs(n.z - activeLevel) <= TOLERANCE;
    if (cameraView === 'XZ') return Math.abs(n.y - activeLevel) <= TOLERANCE;
    if (cameraView === 'YZ') return Math.abs(n.x - activeLevel) <= TOLERANCE;
    return true;
  };

  const isElementActive = (n1, n2) => {
    if (cameraView === '3D') return true;
    return isNodeActive(n1) && isNodeActive(n2);
  };

  // Posición de la grilla
  const gridPosition = [
    cameraView === 'YZ' ? activeLevel : 0,
    cameraView === 'XZ' ? activeLevel : 0,
    cameraView === 'XY' ? activeLevel : 0
  ];
  
  const gridRotation = [
    cameraView === 'XY' || cameraView === '3D' ? Math.PI / 2 : 0, // XY es plano horizontal
    cameraView === 'YZ' ? Math.PI / 2 : 0, // YZ rota en Y
    0
  ];
  if (cameraView === 'XZ') {
    gridRotation[0] = 0; // XZ plano frontal
  }

  return (
    <div className="w-full h-screen bg-slate-900">
      <Canvas 
        onPointerMissed={() => {
          if (!isDrawingShell && viewMode !== 'results') clearSelection();
        }}
      >
        {cameraView === '3D' ? (
          <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={35} up={[0, 0, 1]} />
        ) : (
          <OrthographicCamera makeDefault zoom={20} up={cameraView === 'XY' ? [0, 1, 0] : [0, 0, 1]} />
        )}
        <CameraController />
        
        <color attach="background" args={['#0f172a']} />
        <Grid infiniteGrid fadeDistance={cameraView === '3D' ? 40 : 100} cellColor="#334155" sectionColor="#475569" rotation={gridRotation} position={gridPosition} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        {/* Sombra (Wireframe original) - Solo en modo resultados */}
        {viewMode === 'results' && (
          <group>
            {elements.map(el => {
              const n1 = nodes.find(n => n.id === el.nodes[0]);
              const n2 = nodes.find(n => n.id === el.nodes[1]);
              return n1 && n2 && (
                <FrameElement key={`shadow-${el.id}`} id={el.id} start={[n1.x, n1.y, n1.z]} end={[n2.x, n2.y, n2.z]} isShadow />
              );
            })}
          </group>
        )}

        {/* Nodos */}
        {nodes.map(n => {
          const d = getDisplacement(n.id);
          const active = isNodeActive(n);
          return <NodePoint key={n.id} {...n} dx={d[0]} dy={d[1]} dz={d[2]} restraint={n.restraint} isFaded={!active} />;
        })}

        {/* Cargas Puntuales */}
        {showLoads && loads.map(load => {
          if (load.type !== 'point') return null;
          const targetNode = nodes.find(n => n.id === load.target_id);
          if (!targetNode || !isNodeActive(targetNode)) return null; // Ocultar cargas en nodos atenuados
          return <PointLoadArrow key={load.id} node={targetNode} load={load} />;
        })}
        
        {/* Elementos y Diagramas */}
        {elements.map(el => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          
          const d1 = getDisplacement(n1.id);
          const d2 = getDisplacement(n2.id);
          const active = isElementActive(n1, n2);
          
          let elementForces = null;
          if (viewMode === 'results' && activeResultCombo && activeResultType !== 'deformed') {
            const comboResults = results?.results[activeResultCombo];
            if (comboResults?.element_forces) {
              elementForces = comboResults.element_forces[el.id];
            }
          }

          return (
            <group key={el.id}>
              {/* Línea del elemento */}
              <FrameElement 
                id={el.id} 
                start={[n1.x+d1[0], n1.y+d1[1], n1.z+d1[2]]} 
                end={[n2.x+d2[0], n2.y+d2[1], n2.z+d2[2]]} 
                isFaded={!active}
              />
              
              {/* Diagrama de esfuerzos */}
              {elementForces && active && (
                <ForceDiagram 
                  id={el.id}
                  start={[n1.x, n1.y, n1.z]} // Los diagramas se dibujan sobre la estructura no deformada
                  end={[n2.x, n2.y, n2.z]}
                  stations={elementForces}
                  resultType={activeResultType}
                  scale={diagramScale * 0.0001} // Escala base arbitraria para convertir valores a metros visuales
                />
              )}
            </group>
          );
        })}

        {/* Shells */}
        {shells.map(s => {
          const shellNodes = s.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
          const active = cameraView === '3D' || shellNodes.every(n => isNodeActive(n));
          return <ShellMesh key={s.id} id={s.id} nodeIds={s.nodes} getDisplacement={getDisplacement} isFaded={!active} />;
        })}

        {/* OrbitControls Mapeado al Clic Derecho (Estilo ETABS) */}
        <OrbitControls 
          makeDefault 
          mouseButtons={{ 
            LEFT: THREE.MOUSE.NONE,    // Izquierdo para selección
            MIDDLE: THREE.MOUSE.PAN,   // Medio para paneo
            RIGHT: THREE.MOUSE.ROTATE  // Derecho para rotar
          }}
        />
        
        <SelectionHandler />
        
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}