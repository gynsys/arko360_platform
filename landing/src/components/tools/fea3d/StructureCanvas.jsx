import React, { useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Text, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';
import { SlabOpeningGenerator } from './SlabOpeningGenerator';

function ShellMesh({ id, nodeIds, getDisplacement, isFaded }) {
  const { nodes, selectedIds, toggleSelection, viewMode, openings } = useStructureStore();
  const isSelected = selectedIds.includes(id);
  const isResultsMode = viewMode === 'results';

  // Obtener las aberturas de esta losa
  const slabOpenings = useMemo(() => openings.filter(o => o.hostSlabId === id), [openings, id]);

  const coordKey = useMemo(() => {
    let key = nodeIds.map(nid => { const n = nodes.find(nd => nd.id === nid); return n ? `${n.x},${n.y},${n.z}` : 'x'; }).join('|');
    if (getDisplacement) {
      const disp = nodeIds.map(nid => getDisplacement(nid).join(',')).join('|');
      key += `|${disp}`;
    }
    if (slabOpenings.length > 0) {
      key += `|ops=${slabOpenings.length}-${JSON.stringify(slabOpenings.map(o => o.id))}`;
    }
    return key;
  }, [nodeIds, nodes, getDisplacement, slabOpenings]);

  const geometry = useMemo(() => {
    const coords = nodeIds.map(nid => {
      const n = nodes.find(nd => nd.id === nid);
      if (!n) return null;
      const d = getDisplacement ? getDisplacement(n.id) : [0, 0, 0];
      return { x: n.x + d[0], y: n.y + d[1], z: n.z + d[2] };
    }).filter(Boolean);
    
    if (coords.length < 3) return null;

    // Verificar si es una losa plana en Z
    const isFlatZ = coords.every(c => Math.abs(c.z - coords[0].z) < 1e-4);

    if (isFlatZ) {
      // Dibujar con ShapeGeometry para soportar huecos (Booleanos Visuales)
      const shape = new THREE.Shape();
      shape.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        shape.lineTo(coords[i].x, coords[i].y);
      }
      // Cerrar el polígono
      shape.lineTo(coords[0].x, coords[0].y);

      // Añadir huecos
      slabOpenings.forEach(o => {
        // Coordenada base del hueco: coords[0] + offsets
        const baseX = coords[0].x + o.offsetX;
        const baseY = coords[0].y + o.offsetY;

        // Generamos el polígono 2D local
        const localVertices = SlabOpeningGenerator.generatePolygon(o.type, o.params);
        
        // Creamos la trayectoria negativa (hueco)
        const holePath = new THREE.Path();
        const startPoint = localVertices[0];
        holePath.moveTo(baseX + startPoint.x, baseY + startPoint.y);
        
        for (let i = 1; i < localVertices.length; i++) {
          holePath.lineTo(baseX + localVertices[i].x, baseY + localVertices[i].y);
        }
        holePath.lineTo(baseX + startPoint.x, baseY + startPoint.y); // Cerrar polígono

        shape.holes.push(holePath);
      });

      const shapeGeo = new THREE.ShapeGeometry(shape);
      shapeGeo.translate(0, 0, coords[0].z); // Mover al Z de la losa
      return shapeGeo;
    }

    // Fallback: Losa no plana (BufferGeometry simple, sin huecos)
    const n0 = coords[0];
    const n1 = coords[1];
    const n2 = coords[2];
    const n3 = coords[3] ?? coords[0];

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
      userData={{ shellId: id }}
      onClick={isResultsMode || isFaded ? undefined : (e) => { 
        if (e.delta > 5) return; // Ignorar si fue un drag
        e.stopPropagation(); toggleSelection(id, e.shiftKey || e.ctrlKey); 
      }}
    >
      <meshStandardMaterial
        color={isSelected ? '#facc15' : isResultsMode ? '#4f46e5' : '#6366f1'}
        transparent={true}
        depthWrite={!isFaded}
        opacity={isFaded ? 0.05 : isSelected ? 0.5 : isResultsMode ? 0.15 : 0.25}
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
        if (e.delta > 5) return; // Ignorar si fue un drag (ej. selección por ventana)
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

      const addQuad = (A, B) => {
        const v0 = A.base, v1 = A.offset, v2 = B.offset, v3 = B.base;
        // ETABS Colors: Red for positive array values (usually supports), Yellow for negative (usually center span)
        const cA = A.val >= 0 ? [1, 0.1, 0.1] : [1, 0.9, 0]; // Bright Red : Bright Yellow
        const cB = B.val >= 0 ? [1, 0.1, 0.1] : [1, 0.9, 0]; // Bright Red : Bright Yellow

        positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        colors.push(...cA, ...cA, ...cB);
        positions.push(v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
        colors.push(...cA, ...cB, ...cB);
      };

      if ((pA.val >= 0 && pB.val >= 0) || (pA.val <= 0 && pB.val <= 0)) {
        addQuad(pA, pB);
      } else {
        // Sign change: calculate zero-crossing point
        const t = Math.abs(pA.val) / (Math.abs(pA.val) + Math.abs(pB.val));
        const zBase = new THREE.Vector3().lerpVectors(pA.base, pB.base, t);
        const pZ = { base: zBase, offset: zBase, val: 0 };
        addQuad(pA, pZ);
        addQuad(pZ, pB);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();

    // Encontrar picos para el texto
    let maxAbsVal = 0;
    let maxPoint = null;
    let minPoint = null;
    let maxBase = null;
    let minBase = null;
    let minVal = Infinity;
    let maxVal = -Infinity;

    points.forEach(p => {
      if (p.val > maxVal) { maxVal = p.val; maxPoint = p.offset; maxBase = p.base; }
      if (p.val < minVal) { minVal = p.val; minPoint = p.offset; minBase = p.base; }
    });

    return { geo, maxPoint, minPoint, maxBase, minBase, maxVal, minVal };
  }, [stations, scale, resultType, start, end]);

  return (
    <group>
      <mesh geometry={geometry.geo}>
        <meshBasicMaterial 
          vertexColors 
          side={THREE.DoubleSide} 
          transparent={true}
          opacity={0.85}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      
      {/* Textos de Picos */}
      {geometry.maxPoint && Math.abs(geometry.maxVal) > 1e-4 && (() => {
        const dir = new THREE.Vector3().subVectors(geometry.maxPoint, geometry.maxBase);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        else dir.normalize();
        const pos = geometry.maxPoint.clone().add(dir.multiplyScalar(0.4));
        return (
          <Text 
            position={[pos.x, pos.y, pos.z]} 
            fontSize={0.25} color="white"
            rotation={[Math.PI / 2, 0, 0]}
          >
            {geometry.maxVal.toFixed(2)}
          </Text>
        );
      })()}
      {geometry.minPoint && Math.abs(geometry.minVal) > 1e-4 && geometry.maxVal !== geometry.minVal && (() => {
        const dir = new THREE.Vector3().subVectors(geometry.minPoint, geometry.minBase);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
        else dir.normalize();
        const pos = geometry.minPoint.clone().add(dir.multiplyScalar(0.4));
        return (
          <Text 
            position={[pos.x, pos.y, pos.z]} 
            fontSize={0.25} color="white"
            rotation={[Math.PI / 2, 0, 0]}
          >
            {geometry.minVal.toFixed(2)}
          </Text>
        );
      })()}
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
    if (e.delta > 5) return; // Ignorar si fue un drag
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
        <group position={[0, 0, -0.05]}>
          <mesh>
            <boxGeometry args={[0.4, 0.1, 0.1]} />
            <meshStandardMaterial color="#3b82f6" opacity={0.8} transparent />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshStandardMaterial color="#3b82f6" opacity={0.8} transparent />
          </mesh>
        </group>
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
      {/* Hitbox invisible para atrapar clics más fácilmente que la viga */}
      <mesh visible={false}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      
      {/* Geometría visual del nodo */}
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
  const { viewMode, metadata } = useStructureStore();
  if (viewMode === 'results') return null;

  const length = 1.5;
  const units = metadata?.units?.split(',')[1]?.trim() || 'kN';

  // Construir flechas para cada componente de fuerza no nulo
  const forces = [
    { val: load.fx || 0, dir: new THREE.Vector3(1, 0, 0), label: 'Fx' },
    { val: load.fy || 0, dir: new THREE.Vector3(0, 1, 0), label: 'Fy' },
    { val: load.fz || 0, dir: new THREE.Vector3(0, 0, 1), label: 'Fz' },
  ].filter(f => f.val !== 0);

  if (forces.length === 0) return null;

  return (
    <group>
      {forces.map((f, i) => {
        const dir = f.val > 0 ? f.dir.clone() : f.dir.clone().negate();
        const origin = new THREE.Vector3(node.x, node.y, node.z).sub(dir.clone().multiplyScalar(length));
        return (
          <group key={i}>
            <arrowHelper args={[dir, origin, length, 0xf97316, 0.4, 0.2]} />
              <Text
                position={[origin.x + dir.x * (length / 2) + 0.15, origin.y + dir.y * (length / 2) + 0.15, origin.z + dir.z * (length / 2) + 0.15]}
                fontSize={0.28}
                color="#fdba74"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                anchorX="center"
                rotation={[Math.PI / 2, 0, 0]}
              >
                {`${f.label}: ${Number(Math.abs(f.val).toFixed(2))} ${units}`}
              </Text>
          </group>
        );
      })}
    </group>
  );
}

function FrameLoadGraphic({ element, load, nodes }) {
  const { viewMode, metadata } = useStructureStore();
  if (viewMode === 'results') return null;

  const n1 = nodes.find(n => n.id === element.nodes[0]);
  const n2 = nodes.find(n => n.id === element.nodes[1]);
  if (!n1 || !n2) return null;

  const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
  const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  dir.normalize();

  const arrowLength = 1.0;
  const units = metadata?.units?.split(',')[1]?.trim() || 'kN';
  const lenUnit = metadata?.units?.split(',')[0]?.trim() || 'm';

  const forces = [
    { val: load.fx || 0, dir: new THREE.Vector3(1, 0, 0), label: 'Fx' },
    { val: load.fy || 0, dir: new THREE.Vector3(0, 1, 0), label: 'Fy' },
    { val: load.fz || 0, dir: new THREE.Vector3(0, 0, 1), label: 'Fz' },
  ].filter(f => f.val !== 0);

  if (forces.length === 0) return null;

  if (load.type === 'point_frame') {
    const offset = load.offset ?? 0.5;
    const pos = p1.clone().add(dir.clone().multiplyScalar(length * offset));
    
    return (
      <group>
        {forces.map((f, i) => {
          const fdir = f.val > 0 ? f.dir.clone() : f.dir.clone().negate();
          const origin = pos.clone().sub(fdir.clone().multiplyScalar(arrowLength));
          return (
            <group key={i}>
              <arrowHelper args={[fdir, origin, arrowLength, 0xef4444, 0.3, 0.15]} />
              <Text
                position={[origin.x + fdir.x * (arrowLength / 2) + 0.15, origin.y + fdir.y * (arrowLength / 2) + 0.15, origin.z + fdir.z * (arrowLength / 2) + 0.15]}
                fontSize={0.25}
                color="#fca5a5"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                anchorX="center"
                rotation={[Math.PI / 2, 0, 0]}
              >
                {`${f.label}: ${Number(Math.abs(f.val).toFixed(2))} ${units}`}
              </Text>
            </group>
          );
        })}
      </group>
    );
  }

  if (load.type === 'distributed') {
    const numArrows = 5;
    return (
      <group>
        {forces.map((f, i) => {
          const fdir = f.val > 0 ? f.dir.clone() : f.dir.clone().negate();
          const topPoints = [];
          
          const arrows = [];
          for (let j = 0; j <= numArrows; j++) {
            const fraction = j / numArrows;
            const pos = p1.clone().add(dir.clone().multiplyScalar(length * fraction));
            const origin = pos.clone().sub(fdir.clone().multiplyScalar(arrowLength));
            topPoints.push(origin);
            arrows.push(<arrowHelper key={j} args={[fdir, origin, arrowLength, 0x3b82f6, 0.2, 0.1]} />);
          }

          const lineGeom = new THREE.BufferGeometry().setFromPoints(topPoints);
          
          return (
            <group key={i}>
              {arrows}
              <line geometry={lineGeom}>
                <lineBasicMaterial color={0x3b82f6} linewidth={2} />
              </line>
              <Text
                position={[topPoints[Math.floor(numArrows/2)].x + fdir.x * (arrowLength / 2) + 0.15, topPoints[Math.floor(numArrows/2)].y + fdir.y * (arrowLength / 2) + 0.15, topPoints[Math.floor(numArrows/2)].z + fdir.z * (arrowLength / 2) + 0.15]}
                fontSize={0.25}
                color="#93c5fd"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
                anchorX="center"
                rotation={[Math.PI / 2, 0, 0]}
              >
                {`${f.label}: ${Number(Math.abs(f.val).toFixed(2))} ${units}/${lenUnit}`}
              </Text>
            </group>
          );
        })}
      </group>
    );
  }

  return null;
}

function CameraController() {
  const { camera } = useThree();
  const { cameraView, activeLevel, nodes, projectLoadedTrigger } = useStructureStore();
  const controls = useThree(state => state.controls);

  useEffect(() => {
    if (!controls) return;

    // Calcular el centro geométrico de la estructura
    let cx = 0, cy = 0, cz = 0;
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    if (nodes.length > 0) {
      minX = Infinity; maxX = -Infinity;
      minY = Infinity; maxY = -Infinity;
      minZ = Infinity; maxZ = -Infinity;
      nodes.forEach(n => {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
        if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
      });
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      cz = (minZ + maxZ) / 2;
    }

    // Effect for centering camera when a new project loads
    if (projectLoadedTrigger > 0 && cameraView === '3D') {
      const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 10);
      camera.position.set(cx - span * 1.5, cy - span * 1.5, cz + span * 1.2);
      controls.target.set(cx, cy, cz);
      controls.update();
      return;
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
    setSelectionBox, setSelectedIds
  } = useStructureStore();
  
  // Tolerancia para vistas 2D (reutilizada)
  const TOLERANCE = 0.15; // tolerancia amplia para comparaciones de float
  const isNodeActive = (n, cameraView, activeLevel) => {
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
      // Ignorar si el clic no es directamente en el canvas (ej. paneles superpuestos)
      if (e.target !== canvas) return;
      if (e.button !== 0) return;
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
      const mode = x >= startPos.x ? 'window' : 'crossing';
      setSelectionBox({ endX: x, endY: y, mode });
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      
      const dist = Math.hypot(endX - startPos.x, endY - startPos.y);
      if (dist < 5) {
        setSelectionBox({ isSelecting: false });
        return;
      }
      
      const state = useStructureStore.getState();
      const { 
        nodes: freshNodes, 
        elements: freshElements, 
        shells: freshShells, 
        cameraView: freshView, 
        activeLevel: freshLevel,
        selectedIds: freshSelected,
        viewMode: freshViewMode
      } = state;

      if (freshViewMode === 'results') {
        setSelectionBox({ isSelecting: false });
        return;
      }
      
      const minX = Math.min(startPos.x, endX);
      const maxX = Math.max(startPos.x, endX);
      const minY = Math.min(startPos.y, endY);
      const maxY = Math.max(startPos.y, endY);
      const mode = endX >= startPos.x ? 'window' : 'crossing';
      
      const TOL = 0.15;
      const isActive = (n) => {
        if (freshView === '3D') return true;
        if (freshView === 'XY') return Math.abs(n.z - freshLevel) <= TOL;
        if (freshView === 'XZ') return Math.abs(n.y - freshLevel) <= TOL;
        if (freshView === 'YZ') return Math.abs(n.x - freshLevel) <= TOL;
        return true;
      };

      const isPointInside = (nx, ny, nz, margin = 0) => {
        const p = new THREE.Vector3(nx, ny, nz);
        p.project(camera);
        const px = (p.x * 0.5 + 0.5) * rect.width;
        const py = (p.y * -0.5 + 0.5) * rect.height;
        return px >= minX - margin && px <= maxX + margin && py >= minY - margin && py <= maxY + margin;
      };

      const newSelected = new Set(e.shiftKey || e.ctrlKey ? freshSelected : []);

      freshNodes.forEach(n => {
        if (!isActive(n)) return;
        // Usar margen de 4px para nodos para facilitar su selección
        if (isPointInside(n.x, n.y, n.z, 4)) {
          newSelected.add(n.id);
        }
      });

      freshElements.forEach(el => {
        const n1 = freshNodes.find(n => n.id === el.nodes[0]);
        const n2 = freshNodes.find(n => n.id === el.nodes[1]);
        if (!n1 || !n2) return;
        if (!isActive(n1) || !isActive(n2)) return;

        const in1 = isPointInside(n1.x, n1.y, n1.z);
        const in2 = isPointInside(n2.x, n2.y, n2.z);

        if (mode === 'window') {
          if (in1 && in2) newSelected.add(el.id);
        } else {
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
      
      console.log("[SELECTION DEBUG] Mode:", mode, "Selected count:", newSelected.size, "Selected IDs:", Array.from(newSelected));

      freshShells.forEach(s => {
        const shellNodes = s.nodes.map(nid => freshNodes.find(n => n.id === nid)).filter(Boolean);
        if (shellNodes.length === 0) return;
        if (freshView !== '3D' && !shellNodes.every(n => isActive(n))) return;

        const insides = shellNodes.map(n => isPointInside(n.x, n.y, n.z));
        const allInside = insides.every(val => val === true);
        const someInside = insides.some(val => val === true);

        if (mode === 'window' && allInside) {
          newSelected.add(s.id);
        } else if (mode === 'crossing' && someInside) {
          newSelected.add(s.id);
        } else if (mode === 'crossing' && !someInside) {
          let cx = 0, cy = 0, cz = 0;
          shellNodes.forEach(n => { cx += n.x; cy += n.y; cz += n.z; });
          cx /= shellNodes.length; cy /= shellNodes.length; cz /= shellNodes.length;
          if (isPointInside(cx, cy, cz)) newSelected.add(s.id);
        }
      });

      setSelectedIds(Array.from(newSelected));
      setSelectionBox({ isSelecting: false });
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, camera, setSelectionBox, setSelectedIds]);

  return null;
}

function GlobalAxes() {
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const dirX = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const dirY = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dirZ = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  
  return (
    <group position={[0, 0, 0]}>
      <arrowHelper args={[dirX, origin, 1.5, 0xef4444, 0.3, 0.2]} />
      <arrowHelper args={[dirY, origin, 1.5, 0x22c55e, 0.3, 0.2]} />
      <arrowHelper args={[dirZ, origin, 1.5, 0x3b82f6, 0.3, 0.2]} />
      <Text position={[1.8, 0, 0]} fontSize={0.25} color="#ef4444">X</Text>
      <Text position={[0, 1.8, 0]} fontSize={0.25} color="#22c55e">Y</Text>
      <Text position={[0, 0, 1.8]} fontSize={0.25} color="#3b82f6">Z</Text>
    </group>
  );
}

function GridAxes() {
  const { nodes, viewMode } = useStructureStore();
  
  const uniqueX = useMemo(() => {
    const xs = [...new Set(nodes.map(n => Math.round(n.x * 10) / 10))];
    return xs.sort((a, b) => a - b);
  }, [nodes]);

  const uniqueY = useMemo(() => {
    const ys = [...new Set(nodes.map(n => Math.round(n.y * 10) / 10))];
    return ys.sort((a, b) => a - b); // Ascendente para que A parta de Y menor (hacia arriba)
  }, [nodes]);

  if (uniqueX.length === 0 || uniqueY.length === 0 || viewMode === 'results') return null;

  const minX = uniqueX[0] - 2;
  const maxX = uniqueX[uniqueX.length - 1] + 2;
  const minY = uniqueY[0] - 2;
  const maxY = uniqueY[uniqueY.length - 1] + 2;

  // Dibujar al nivel de la base
  const minZ = nodes.reduce((min, n) => Math.min(min, n.z), 0);

  return (
    <group position={[0, 0, minZ - 0.05]}>
      {uniqueX.map((x, i) => {
        const pts = [new THREE.Vector3(x, minY, 0), new THREE.Vector3(x, maxY, 0)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <group key={`gx-${i}`}>
            <line geometry={geo}>
              <lineBasicMaterial color="#0891b2" transparent opacity={0.6} />
            </line>
            {/* Burbuja inferior */}
            <mesh position={[x, minY - 0.6, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshBasicMaterial color="#1e293b" />
              <mesh position={[0, 0, -0.01]}>
                 <circleGeometry args={[0.45, 32]} />
                 <meshBasicMaterial color="#475569" />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.4} color="#94a3b8">{i + 1}</Text>
            </mesh>
          </group>
        );
      })}

      {uniqueY.map((y, i) => {
        const pts = [new THREE.Vector3(minX, y, 0), new THREE.Vector3(maxX, y, 0)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <group key={`gy-${i}`}>
            <line geometry={geo}>
              <lineBasicMaterial color="#0891b2" transparent opacity={0.6} />
            </line>
            {/* Burbuja izquierda */}
            <mesh position={[minX - 0.6, y, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshBasicMaterial color="#1e293b" />
              <mesh position={[0, 0, -0.01]}>
                 <circleGeometry args={[0.45, 32]} />
                 <meshBasicMaterial color="#475569" />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.4} color="#94a3b8">{String.fromCharCode(65 + i)}</Text>
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function StructureCanvas() {
  const { 
    nodes, elements, shells, openings, viewMode, showLoads, loads, 
    activeResultCombo, activeResultType, diagramScale, results,
    cameraView, activeLevel, isDrawingShell, isQuickDrawingShell, clearSelection,
    displacementScale
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
  const TOLERANCE = 0.15;

  const isNodeActive = (n) => {
    if (cameraView === '3D') return true;
    if (cameraView === 'XY') return Math.abs(n.z - activeLevel) <= TOLERANCE;
    if (cameraView === 'XZ') return Math.abs(n.y - activeLevel) <= TOLERANCE;
    if (cameraView === 'YZ') return Math.abs(n.x - activeLevel) <= TOLERANCE;
    return true;
  };

  // Auto-scale para diagramas (asegura que siempre sean visibles sin importar las unidades)
  const autoDiagramScale = useMemo(() => {
    if (viewMode !== 'results' || !results || !activeResultCombo || activeResultType === 'deformed') return 0.0001;
    
    const comboResults = results.results[activeResultCombo];
    if (!comboResults || !comboResults.element_forces) return 0.0001;

    let maxAbsVal = 0;
    Object.values(comboResults.element_forces).forEach(stations => {
      stations.forEach(st => {
        const val = Math.abs(st[activeResultType] || 0);
        if (val > maxAbsVal) maxAbsVal = val;
      });
    });

    if (maxAbsVal < 1e-8) return 0.0001;

    let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
      if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
    });
    
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;
    const targetHeight = maxDim * 0.15; // 15% de la dimensión máxima de la estructura
    return targetHeight / maxAbsVal;
  }, [results, activeResultCombo, activeResultType, viewMode, nodes]);

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

  const handleQuickDrawClick = (point) => {
    if (!isQuickDrawingShell) return;
    
    // We only support drawing on the active XY plane for now
    if (cameraView !== '3D' && cameraView !== 'XY') return;
    
    const px = point.x;
    const py = point.y;
    const pz = activeLevel;

    // Find bounding uniqueX and uniqueY
    const uniqueX = [...new Set(nodes.map(n => Math.round(n.x * 10) / 10))].sort((a,b) => a - b);
    const uniqueY = [...new Set(nodes.map(n => Math.round(n.y * 10) / 10))].sort((a,b) => a - b);

    let xLeft = null, xRight = null;
    for(let i=0; i<uniqueX.length - 1; i++) {
      if (px >= uniqueX[i] && px <= uniqueX[i+1]) {
        xLeft = uniqueX[i]; xRight = uniqueX[i+1]; break;
      }
    }

    let yBottom = null, yTop = null;
    for(let i=0; i<uniqueY.length - 1; i++) {
      if (py >= uniqueY[i] && py <= uniqueY[i+1]) {
        yBottom = uniqueY[i]; yTop = uniqueY[i+1]; break;
      }
    }

    if (xLeft === null || xRight === null || yBottom === null || yTop === null) {
      return; // Clic fuera de la cuadrícula válida
    }

    const corners = [
      {x: xLeft, y: yBottom, z: pz},
      {x: xRight, y: yBottom, z: pz},
      {x: xRight, y: yTop, z: pz},
      {x: xLeft, y: yTop, z: pz}
    ];

    const currentState = useStructureStore.getState();
    const newNodes = [...currentState.nodes];
    const shellNodeIds = [];

    corners.forEach(c => {
      const existing = newNodes.find(n => Math.abs(n.x - c.x) < 0.1 && Math.abs(n.y - c.y) < 0.1 && Math.abs(n.z - c.z) < 0.1);
      if (existing) {
        shellNodeIds.push(existing.id);
      } else {
        const newId = `N${Date.now()}_${Math.floor(Math.random()*10000)}`;
        newNodes.push({ id: newId, x: c.x, y: c.y, z: c.z, restraint: null });
        shellNodeIds.push(newId);
      }
    });

    const shellId = `S${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const newShell = {
      id: shellId,
      type: 'shell',
      nodes: shellNodeIds,
      thickness: 0.15,
      material_id: currentState.materials[0]?.id || 'conc',
      loads: { CM: 0, CV: 0 }
    };

    useStructureStore.setState({
      nodes: newNodes,
      shells: [...currentState.shells, newShell],
      isSaved: false
    });
  };

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
        <Grid infiniteGrid fadeDistance={cameraView === '3D' ? 40 : 100} cellColor="#1e293b" sectionColor="#334155" rotation={gridRotation} position={gridPosition} />
        
        {/* Plano invisible para capturar clics en Quick Draw Area */}
        {isQuickDrawingShell && (
          <mesh 
            rotation={[0, 0, 0]} 
            position={[0, 0, activeLevel]} 
            onPointerDown={(e) => {
              e.stopPropagation();
              handleQuickDrawClick(e.point);
            }}
          >
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        
        <GlobalAxes />
        <GridAxes />

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
          // En vista 2D: omitir completamente los nodos de otros niveles
          if (!active && cameraView !== '3D') return null;
          return <NodePoint key={n.id} {...n} dx={d[0]} dy={d[1]} dz={d[2]} restraint={n.restraint} isFaded={false} />;
        })}

        {/* Cargas */}
        {showLoads && loads.map(load => {
          if (load.type === 'point') {
            const targetNode = nodes.find(n => n.id === load.target_id);
            if (!targetNode || !isNodeActive(targetNode)) return null;
            return <PointLoadArrow key={load.id} node={targetNode} load={load} />;
          } else if (load.type === 'distributed' || load.type === 'point_frame') {
            const targetElem = elements.find(e => e.id === load.target_id);
            if (!targetElem) return null;
            const n1 = nodes.find(n => n.id === targetElem.nodes[0]);
            const n2 = nodes.find(n => n.id === targetElem.nodes[1]);
            if (!n1 || !n2 || (!isNodeActive(n1) && !isNodeActive(n2))) return null;
            return <FrameLoadGraphic key={load.id} element={targetElem} load={load} nodes={nodes} />;
          }
          return null;
        })}
        
        {/* Elementos y Diagramas */}
        {elements.map(el => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          
          const d1 = getDisplacement(n1.id);
          const d2 = getDisplacement(n2.id);
          const active = isElementActive(n1, n2);
          // En vista 2D: omitir completamente los elementos de otros niveles
          if (!active && cameraView !== '3D') return null;
          
          let elementForces = null;
          if (viewMode === 'results' && activeResultCombo && activeResultType !== 'deformed') {
            const comboResults = results?.results[activeResultCombo];
            if (comboResults?.element_forces) {
              elementForces = comboResults.element_forces[el.id];
            }
          }

          return (
            <group key={el.id}>
              {/* Línea del elemento - siempre activo si llegamos aquí */}
              <FrameElement 
                id={el.id} 
                start={[n1.x+d1[0], n1.y+d1[1], n1.z+d1[2]]} 
                end={[n2.x+d2[0], n2.y+d2[1], n2.z+d2[2]]} 
                isFaded={false}
              />
              
              {/* Diagrama de esfuerzos */}
              {elementForces && active && (
                <ForceDiagram 
                  id={el.id}
                  start={[n1.x, n1.y, n1.z]} // Los diagramas se dibujan sobre la estructura no deformada
                  end={[n2.x, n2.y, n2.z]}
                  stations={elementForces}
                  resultType={activeResultType}
                  scale={diagramScale * autoDiagramScale} // Escala calculada dinámicamente + factor del usuario
                />
              )}
            </group>
          );
        })}

        {/* Shells */}
        {shells.map(s => {
          const shellNodes = s.nodes.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
          const active = cameraView === '3D' || shellNodes.every(n => isNodeActive(n));
          // En vista 2D: omitir shells de otros niveles
          if (!active && cameraView !== '3D') return null;
          return <ShellMesh key={s.id} id={s.id} nodeIds={s.nodes} getDisplacement={getDisplacement} isFaded={false} />;
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
        
      </Canvas>
    </div>
  );
}