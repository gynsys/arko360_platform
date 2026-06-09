import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';

/**
 * Renders a structural frame element (beam/column) as a line between two 3D points.
 * Uses useMemo to avoid recreating BufferGeometry on every render.
 */
function FrameElement({ start, end, id }) {
  const selectedId = useStructureStore(state => state.selectedId);
  const setSelectedId = useStructureStore(state => state.setSelectedId);
  const isSelected = selectedId === id;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      start[0], start[1], start[2],
      end[0],   end[1],   end[2],
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  return (
    <line
      geometry={geometry}
      onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}
    >
      <lineBasicMaterial
        attach="material"
        color={isSelected ? '#facc15' : '#94a3b8'}
        linewidth={isSelected ? 3 : 1}
      />
    </line>
  );
}

/**
 * Renders a structural node as a small sphere in 3D space.
 */
function NodePoint({ x, y, z, id, hasRestraint }) {
  const selectedId = useStructureStore(state => state.selectedId);
  const setSelectedId = useStructureStore(state => state.setSelectedId);
  const isSelected = selectedId === id;

  return (
    <mesh
      position={[x, y, z]}
      onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}
    >
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={isSelected ? '#facc15' : hasRestraint ? '#ef4444' : '#60a5fa'}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  );
}

export function StructureCanvas() {
  const { nodes, elements } = useStructureStore();

  return (
    <div className="flex-grow h-full bg-slate-900">
      <Canvas camera={{ position: [8, 8, 8], up: [0, 0, 1] }}>
        <color attach="background" args={['#0f172a']} />
        <Grid
          infiniteGrid
          fadeDistance={50}
          cellColor="#334155"
          sectionColor="#475569"
          rotation={[Math.PI / 2, 0, 0]}
        />

        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />

        {/* Render nodes */}
        {nodes.map((node) => (
          <NodePoint
            key={node.id}
            id={node.id}
            x={node.x}
            y={node.y}
            z={node.z}
            hasRestraint={!!node.restraint}
          />
        ))}

        {/* Render frame elements */}
        {elements.map((el) => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          return (
            <FrameElement
              key={el.id}
              id={el.id}
              start={[n1.x, n1.y, n1.z]}
              end={[n2.x, n2.y, n2.z]}
            />
          );
        })}

        <OrbitControls makeDefault dampingFactor={0.05} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labelColor="white"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}