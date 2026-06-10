import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';

function ShellMesh({ id, nodeIds, getDisplacement }) {
  const { nodes, selectedId, setSelectedId, viewMode } = useStructureStore();
  const isSelected = selectedId === id;
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
      onClick={(e) => { if(!isResultsMode) { e.stopPropagation(); setSelectedId(id); } }}
    >
      <meshStandardMaterial
        color={isSelected ? '#facc15' : isResultsMode ? '#4f46e5' : '#6366f1'}
        transparent
        opacity={isSelected ? 0.5 : isResultsMode ? 0.8 : 0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FrameElement({ start, end, id, isShadow }) {
  const { selectedId, setSelectedId, setRightClickedElementId, viewMode } = useStructureStore();
  const isSelected = selectedId === id;
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
      onClick={(e) => { 
        if(!isResultsMode && !isShadow) { e.stopPropagation(); setSelectedId(id); } 
      }}
      onContextMenu={(e) => {
        if (isResultsMode && !isShadow) {
          e.stopPropagation();
          setRightClickedElementId(id);
        }
      }}
    >
      <lineBasicMaterial 
        color={isShadow ? '#334155' : isSelected ? '#facc15' : isResultsMode ? '#38bdf8' : '#94a3b8'} 
        linewidth={isShadow ? 1 : 2} 
        transparent={isShadow}
        opacity={isShadow ? 0.3 : 1}
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
    return geo;
  }, [stations, scale, resultType, start, end]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function NodePoint({ x, y, z, dx = 0, dy = 0, dz = 0, id, hasRestraint }) {
  const { selectedId, setSelectedId, isDrawingShell, drawingNodes, addNodeToDrawing, viewMode } = useStructureStore();
  
  const isSelected = selectedId === id;
  const isPartofDrawing = drawingNodes.includes(id);
  const isResultsMode = viewMode === 'results';

  const handleClick = (e) => {
    if (isResultsMode) return;
    e.stopPropagation();
    if (isDrawingShell) {
      addNodeToDrawing(id);
    } else {
      setSelectedId(id);
    }
  };

  return (
    <mesh position={[x + dx, y + dy, z + dz]} onClick={handleClick}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={isPartofDrawing ? '#fb923c' : isSelected ? '#facc15' : hasRestraint ? '#ef4444' : isResultsMode ? '#38bdf8' : '#60a5fa'}
        emissive={isPartofDrawing ? '#fb923c' : '#000'}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

export function StructureCanvas() {
  const { 
    nodes, elements, shells, isDrawingShell, setSelectedId,
    viewMode, results, activeResultCombo, activeResultType, displacementScale, diagramScale 
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

  return (
    <div className="w-full h-full bg-slate-900">
      <Canvas 
        camera={{ position: [20, 20, 20], fov: 35, up: [0, 0, 1] }}
        onPointerMissed={() => {
          if (!isDrawingShell && viewMode !== 'results') setSelectedId(null);
        }}
      >
        <color attach="background" args={['#0f172a']} />
        <Grid infiniteGrid fadeDistance={40} cellColor="#334155" sectionColor="#475569" rotation={[Math.PI / 2, 0, 0]} />
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
          return <NodePoint key={n.id} {...n} dx={d[0]} dy={d[1]} dz={d[2]} hasRestraint={!!n.restraint} />;
        })}
        
        {/* Elementos y Diagramas */}
        {elements.map(el => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          const d1 = getDisplacement(n1.id);
          const d2 = getDisplacement(n2.id);
          
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
              />
              
              {/* Diagrama de esfuerzos */}
              {elementForces && (
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
        {shells.map(s => <ShellMesh key={s.id} id={s.id} nodeIds={s.nodes} getDisplacement={getDisplacement} />)}

        <OrbitControls makeDefault />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}