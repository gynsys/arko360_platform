import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';

function ShellMesh({ id, nodeIds }) {
  const { nodes, selectedId, setSelectedId } = useStructureStore();
  const isSelected = selectedId === id;

  // Triangular el cuadrilátero en 2 triángulos: [0,1,2] y [0,2,3]
  // Se usa BufferGeometry imperativa para evitar el error de <float32Array> en JSX
  // Clave estable basada solo en las coordenadas de los 4 nudos del shell (no en todo el array de nodes)
  const coordKey = useMemo(() => {
    return nodeIds
      .map(nid => { const n = nodes.find(nd => nd.id === nid); return n ? `${n.x},${n.y},${n.z}` : 'x'; })
      .join('|');
  }, [nodeIds, nodes]);

  const geometry = useMemo(() => {
    const coords = nodeIds.map(nid => nodes.find(n => n.id === nid)).filter(Boolean);
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
      onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}
    >
      <meshStandardMaterial
        color={isSelected ? '#facc15' : '#6366f1'}
        transparent
        opacity={isSelected ? 0.5 : 0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FrameElement({ start, end, id }) {
  const { selectedId, setSelectedId } = useStructureStore();
  const isSelected = selectedId === id;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([...start, ...end]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
    // Deps son valores primitivos para evitar re-renders infinitos con referencias de array
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  return (
    <line geometry={geometry} onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}>
      <lineBasicMaterial color={isSelected ? '#facc15' : '#94a3b8'} linewidth={2} />
    </line>
  );
}

function NodePoint({ x, y, z, id, hasRestraint }) {
  const { selectedId, setSelectedId, isDrawingShell, drawingNodes, addNodeToDrawing } = useStructureStore();
  
  const isSelected = selectedId === id;
  const isPartofDrawing = drawingNodes.includes(id);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDrawingShell) {
      addNodeToDrawing(id);
    } else {
      setSelectedId(id);
    }
  };

  return (
    <mesh position={[x, y, z]} onClick={handleClick}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={isPartofDrawing ? '#fb923c' : isSelected ? '#facc15' : hasRestraint ? '#ef4444' : '#60a5fa'}
        emissive={isPartofDrawing ? '#fb923c' : '#000'}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

export function StructureCanvas() {
  const { nodes, elements, shells } = useStructureStore();

  return (
    <div className="w-full h-full bg-slate-900">
      <Canvas camera={{ position: [10, 10, 10], up: [0, 0, 1] }}>
        <color attach="background" args={['#0f172a']} />
        <Grid infiniteGrid fadeDistance={40} cellColor="#334155" sectionColor="#475569" rotation={[Math.PI / 2, 0, 0]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        {nodes.map(n => <NodePoint key={n.id} {...n} hasRestraint={!!n.restraint} />)}
        
        {elements.map(el => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          return n1 && n2 && <FrameElement key={el.id} id={el.id} start={[n1.x, n1.y, n1.z]} end={[n2.x, n2.y, n2.z]} />;
        })}

        {shells.map(s => <ShellMesh key={s.id} id={s.id} nodeIds={s.nodes} />)}

        <OrbitControls makeDefault />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}