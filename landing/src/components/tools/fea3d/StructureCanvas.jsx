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
  const { selectedId, setSelectedId, viewMode } = useStructureStore();
  const isSelected = selectedId === id;
  const isResultsMode = viewMode === 'results';

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([...start, ...end]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
    // Deps son valores primitivos para evitar re-renders infinitos con referencias de array
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  return (
    <line geometry={geometry} onClick={(e) => { if(!isResultsMode && !isShadow) { e.stopPropagation(); setSelectedId(id); } }}>
      <lineBasicMaterial 
        color={isShadow ? '#334155' : isSelected ? '#facc15' : isResultsMode ? '#38bdf8' : '#94a3b8'} 
        linewidth={isShadow ? 1 : 2} 
        transparent={isShadow}
        opacity={isShadow ? 0.3 : 1}
      />
    </line>
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
    viewMode, results, activeResultCombo, displacementScale 
  } = useStructureStore();

  const getDisplacement = (nodeId) => {
    if (viewMode === 'results' && results && activeResultCombo) {
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
        
        {/* Elementos */}
        {elements.map(el => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          const d1 = getDisplacement(n1.id);
          const d2 = getDisplacement(n2.id);
          return <FrameElement key={el.id} id={el.id} start={[n1.x+d1[0], n1.y+d1[1], n1.z+d1[2]]} end={[n2.x+d2[0], n2.y+d2[1], n2.z+d2[2]]} />;
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