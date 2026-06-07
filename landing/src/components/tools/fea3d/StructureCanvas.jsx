import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useStructureStore } from './useStructureStore';

function FrameElement({ start, end, id }) {
  const selectedId = useStructureStore(state => state.selectedId);
  const setSelectedId = useStructureStore(state => state.setSelectedId);
  const isSelected = selectedId === id;

  return (
    <line onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}>
      <bufferGeometry attach="geometry">
        <float32Array attach="attributes-position" args={[new Float32Array([...start, ...end]), 3]} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color={isSelected ? "#facc15" : "#94a3b8"} linewidth={isSelected ? 3 : 1} />
    </line>
  );
}

export function StructureCanvas() {
  const { nodes, elements } = useStructureStore();

  return (
    <div className="flex-grow h-full bg-slate-900">
      <Canvas camera={{ position: [8, 8, 8], up: [0, 0, 1] }}>
        <color attach="background" args={['#0f172a']} />
        <Grid infiniteGrid fadeDistance={50} cellColor="#334155" sectionColor="#475569" rotation={[Math.PI / 2, 0, 0]} />
        
        {elements.map((el) => {
          const n1 = nodes.find(n => n.id === el.nodes[0]);
          const n2 = nodes.find(n => n.id === el.nodes[1]);
          if (!n1 || !n2) return null;
          return <FrameElement key={el.id} id={el.id} start={[n1.x, n1.y, n1.z]} end={[n2.x, n2.y, n2.z]} />;
        })}

        <OrbitControls makeDefault dampingFactor={0.05} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
        <ambientLight intensity={0.5} />
      </Canvas>
    </div>
  );
}