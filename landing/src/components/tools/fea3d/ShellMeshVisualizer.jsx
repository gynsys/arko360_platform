import React, { useMemo } from 'react';
import * as THREE from 'three';

// Color map from blue (min) to red (max)
function getColor(value, min, max) {
  if (min === max) return new THREE.Color('#3b82f6'); // default blue if no variation
  const ratio = (value - min) / (max - min);
  // HSL: Blue (240) to Red (0)
  const hue = (1 - ratio) * 240 / 360; 
  const color = new THREE.Color();
  color.setHSL(hue, 1.0, 0.5);
  return color;
}

export function ShellMeshVisualizer({ mesh, shellId, results, activeResultMap }) {
  if (!mesh || !mesh.elements || !mesh.nodes) return null;

  // Render both Wireframe and Solid Faces
  const { lineGeometry, faceGeometry } = useMemo(() => {
    const linePoints = [];
    const facePositions = [];
    const faceColors = [];
    
    // Map node IDs to coordinates for quick lookup
    const nodeMap = new Map();
    mesh.nodes.forEach(n => nodeMap.set(n.id, n));

    // Get Min/Max values for heatmap
    let valMin = Infinity;
    let valMax = -Infinity;
    
    if (results && results.shell_forces && activeResultMap && activeResultMap !== 'None') {
      mesh.elements.forEach(el => {
        const forces = results.shell_forces[el.id];
        if (forces && forces[activeResultMap] !== undefined) {
          const v = forces[activeResultMap];
          if (v < valMin) valMin = v;
          if (v > valMax) valMax = v;
        }
      });
    }

    mesh.elements.forEach(el => {
      const p1 = nodeMap.get(el.nodeIds[0]);
      const p2 = nodeMap.get(el.nodeIds[1]);
      const p3 = nodeMap.get(el.nodeIds[2]);
      const p4 = el.nodeIds.length === 4 ? nodeMap.get(el.nodeIds[3]) : null;
      
      let elColor = new THREE.Color('#1f2937'); // Default gray/dark for face
      if (results && results.shell_forces && activeResultMap && activeResultMap !== 'None') {
        const forces = results.shell_forces[el.id];
        if (forces && forces[activeResultMap] !== undefined) {
           elColor = getColor(forces[activeResultMap], valMin, valMax);
        }
      }

      if (el.type === 'triangle' && p1 && p2 && p3) {
        // Lines
        linePoints.push(
          new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z),
          new THREE.Vector3(p2.x, p2.y, p2.z), new THREE.Vector3(p3.x, p3.y, p3.z),
          new THREE.Vector3(p3.x, p3.y, p3.z), new THREE.Vector3(p1.x, p1.y, p1.z)
        );
        // Faces
        facePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
        faceColors.push(elColor.r, elColor.g, elColor.b, elColor.r, elColor.g, elColor.b, elColor.r, elColor.g, elColor.b);
        
      } else if (el.type === 'quad' && p1 && p2 && p3 && p4) {
        // Lines
        linePoints.push(
          new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p2.x, p2.y, p2.z),
          new THREE.Vector3(p2.x, p2.y, p2.z), new THREE.Vector3(p3.x, p3.y, p3.z),
          new THREE.Vector3(p3.x, p3.y, p3.z), new THREE.Vector3(p4.x, p4.y, p4.z),
          new THREE.Vector3(p4.x, p4.y, p4.z), new THREE.Vector3(p1.x, p1.y, p1.z)
        );
        // Faces (2 triangles for WebGL)
        // Tri 1: 1, 2, 3
        facePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
        faceColors.push(elColor.r, elColor.g, elColor.b, elColor.r, elColor.g, elColor.b, elColor.r, elColor.g, elColor.b);
        // Tri 2: 1, 3, 4
        facePositions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
        faceColors.push(elColor.r, elColor.g, elColor.b, elColor.r, elColor.g, elColor.b, elColor.r, elColor.g, elColor.b);
      }
    });

    const lGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
    fGeo.setAttribute('color', new THREE.Float32BufferAttribute(faceColors, 3));
    fGeo.computeVertexNormals();

    return { lineGeometry: lGeo, faceGeometry: fGeo };
  }, [mesh, results, activeResultMap]);

  return (
    <group>
      {/* Solid Faces with Heatmap */}
      {(results && activeResultMap && activeResultMap !== 'None') ? (
         <mesh geometry={faceGeometry}>
           <meshBasicMaterial vertexColors={true} side={THREE.DoubleSide} opacity={0.8} transparent />
         </mesh>
      ) : null}
      
      {/* Wireframe overlay */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#10b981" opacity={0.5} transparent depthTest={false} />
      </lineSegments>
    </group>
  );
}
