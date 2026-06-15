import React, { useMemo } from 'react';
import * as THREE from 'three';

export function ShellMeshVisualizer({ mesh }) {
  if (!mesh || !mesh.elements || !mesh.nodes) return null;

  const geometry = useMemo(() => {
    const points = [];
    
    // Map node IDs to coordinates for quick lookup
    const nodeMap = new Map();
    mesh.nodes.forEach(n => nodeMap.set(n.id, n));

    mesh.elements.forEach(el => {
      if (el.type === 'triangle' && el.nodeIds.length === 3) {
        const p1 = nodeMap.get(el.nodeIds[0]);
        const p2 = nodeMap.get(el.nodeIds[1]);
        const p3 = nodeMap.get(el.nodeIds[2]);
        if (p1 && p2 && p3) {
          // Lines: p1-p2, p2-p3, p3-p1
          points.push(
            new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z),
            new THREE.Vector3(p2.x, p2.y, p2.z), new THREE.Vector3(p3.x, p3.y, p3.z),
            new THREE.Vector3(p3.x, p3.y, p3.z), new THREE.Vector3(p1.x, p1.y, p1.z)
          );
        }
      } else if (el.type === 'quad' && el.nodeIds.length === 4) {
        const p1 = nodeMap.get(el.nodeIds[0]);
        const p2 = nodeMap.get(el.nodeIds[1]);
        const p3 = nodeMap.get(el.nodeIds[2]);
        const p4 = nodeMap.get(el.nodeIds[3]);
        if (p1 && p2 && p3 && p4) {
          // Lines: p1-p2, p2-p3, p3-p4, p4-p1
          points.push(
            new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z),
            new THREE.Vector3(p2.x, p2.y, p2.z), new THREE.Vector3(p3.x, p3.y, p3.z),
            new THREE.Vector3(p3.x, p3.y, p3.z), new THREE.Vector3(p4.x, p4.y, p4.z),
            new THREE.Vector3(p4.x, p4.y, p4.z), new THREE.Vector3(p1.x, p1.y, p1.z)
          );
        }
      }
    });

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [mesh]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#10b981" opacity={0.5} transparent depthTest={false} />
    </lineSegments>
  );
}
