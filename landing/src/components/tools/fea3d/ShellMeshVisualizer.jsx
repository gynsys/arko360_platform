import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// Color map from blue (min) to red (max) using discrete ETABS-style bands
function getColor(value, min, max) {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    return new THREE.Color('#3b82f6'); // default blue
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const numBands = 11;
  const band = Math.floor(ratio * 0.99999 * numBands);
  const discreteRatio = band / (numBands - 1);
  
  // HSL: Blue (240°) → Red (0°)
  const hue = (1 - discreteRatio) * 240 / 360;
  const color = new THREE.Color();
  color.setHSL(hue, 1.0, 0.5);
  return color;
}

// Safely check if a node object has valid finite coordinates
function isValidNode(n) {
  return n != null &&
    isFinite(n.x) && !isNaN(n.x) &&
    isFinite(n.y) && !isNaN(n.y) &&
    isFinite(n.z) && !isNaN(n.z);
}

export function ShellMeshVisualizer({ mesh, shellId, results, activeResultMap, globalRange, unit, getDisplacement }) {
  const [hovered, setHovered] = useState(null);

  const { lineGeometry, faceGeometry, hasFaces } = useMemo(() => {
    const EMPTY = {
      lineGeometry: new THREE.BufferGeometry(),
      faceGeometry: new THREE.BufferGeometry(),
      hasFaces: false,
    };

    if (!mesh || !Array.isArray(mesh.elements) || !Array.isArray(mesh.nodes)) {
      return EMPTY;
    }
    if (mesh.elements.length === 0 || mesh.nodes.length === 0) {
      return EMPTY;
    }

    // Build node lookup map
    const nodeMap = new Map();
    mesh.nodes.forEach(n => {
      if (isValidNode(n)) nodeMap.set(n.id, n);
    });

    if (nodeMap.size === 0) return EMPTY;

    // --- Compute heatmap range ---
    let valMin = Infinity;
    let valMax = -Infinity;
    const showHeatmap =
      results &&
      results.shell_forces &&
      activeResultMap &&
      activeResultMap !== 'None';

    if (showHeatmap) {
      if (globalRange) {
        valMin = globalRange.min;
        valMax = globalRange.max;
      } else {
        mesh.elements.forEach(el => {
          const forces = results.shell_forces[el.id];
          if (forces) {
            const v = forces[activeResultMap];
            if (v !== undefined && isFinite(v)) {
              if (v < valMin) valMin = v;
              if (v > valMax) valMax = v;
            }
          }
        });
      }
    }

    const hasRange = isFinite(valMin) && isFinite(valMax);

    // --- Build geometry buffers ---
    const linePositions = [];
    const facePositions = [];
    const faceColors    = [];
    const faceToElement = [];

    mesh.elements.forEach(el => {
      const ids = el.nodeIds || [];
      const p = ids.map(id => {
        const n = nodeMap.get(id);
        if (!n) return null;

        let dx = 0, dy = 0, dz = 0;
        
        // Use deformed nodes from backend directly
        if (results && results.deformed_shell_nodes && results.deformed_shell_nodes[shellId] && results.deformed_shell_nodes[shellId][id]) {
          const defNode = results.deformed_shell_nodes[shellId][id];
          dx = (defNode.x - n.x) * displacementScale;
          dy = (defNode.y - n.y) * displacementScale;
          dz = (defNode.z - n.z) * displacementScale;
        } else {
          // Fallback to getDisplacement if backend deformed nodes are missing
          const d = getDisplacement ? getDisplacement(id) : [0, 0, 0];
          dx = isFinite(d[0]) ? d[0] : 0;
          dy = isFinite(d[1]) ? d[1] : 0;
          dz = isFinite(d[2]) ? d[2] : 0;
        }
        
        return { ...n, x: n.x + dx, y: n.y + dy, z: n.z + dz };
      });

      // Resolve element color
      let elColor = new THREE.Color(0x1f2937);
      if (showHeatmap && hasRange) {
        const forces = results.shell_forces[el.id];
        if (forces) {
          const v = forces[activeResultMap];
          if (v !== undefined && isFinite(v)) {
            elColor = getColor(v, valMin, valMax);
          }
        }
      }

      const { r, g, b } = elColor;

      if (el.type === 'triangle' && p.length >= 3 &&
          isValidNode(p[0]) && isValidNode(p[1]) && isValidNode(p[2])) {
        const [a, c1, c2] = p;
        linePositions.push(
          a.x, a.y, a.z,  c1.x, c1.y, c1.z,
          c1.x, c1.y, c1.z, c2.x, c2.y, c2.z,
          c2.x, c2.y, c2.z,  a.x,  a.y,  a.z,
        );
        facePositions.push(a.x, a.y, a.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
        faceColors.push(r, g, b, r, g, b, r, g, b);
        faceToElement.push(el.id);

      } else if (el.type === 'quad' && p.length >= 4 &&
          isValidNode(p[0]) && isValidNode(p[1]) &&
          isValidNode(p[2]) && isValidNode(p[3])) {
        const [a, b2, c, d] = p;
        linePositions.push(
          a.x, a.y, a.z,  b2.x, b2.y, b2.z,
          b2.x, b2.y, b2.z, c.x,  c.y,  c.z,
          c.x,  c.y,  c.z,  d.x,  d.y,  d.z,
          d.x,  d.y,  d.z,  a.x,  a.y,  a.z,
        );
        // Triangle 1: a, b2, c
        facePositions.push(a.x, a.y, a.z, b2.x, b2.y, b2.z, c.x, c.y, c.z);
        faceColors.push(r, g, b, r, g, b, r, g, b);
        faceToElement.push(el.id);
        // Triangle 2: a, c, d
        facePositions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
        faceColors.push(r, g, b, r, g, b, r, g, b);
        faceToElement.push(el.id);
      }
    });

    // Guard: if no valid geometry was produced, return empty
    if (linePositions.length === 0) return EMPTY;

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    const fGeo = new THREE.BufferGeometry();
    if (facePositions.length > 0) {
      fGeo.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
      fGeo.setAttribute('color',    new THREE.Float32BufferAttribute(faceColors, 3));
      fGeo.computeVertexNormals();
      fGeo.userData = { faceToElement };
    }

    return {
      lineGeometry: lGeo,
      faceGeometry: fGeo,
      hasFaces: facePositions.length > 0,
    };
  }, [mesh, results, activeResultMap, globalRange, getDisplacement, displacementScale]);

  return (
    <group>
      {/* Solid Faces with Heatmap */}
      {hasFaces && showingHeatmap(results, activeResultMap) && (
        <mesh 
          geometry={faceGeometry}
          onPointerMove={(e) => {
            if (e.faceIndex !== undefined) {
              e.stopPropagation();
              const elId = faceGeometry.userData.faceToElement[e.faceIndex];
              if (elId) {
                const forces = results.shell_forces[elId];
                const val = forces && forces[activeResultMap] !== undefined ? forces[activeResultMap] : 0;
                setHovered({ x: e.point.x, y: e.point.y, z: e.point.z, id: elId, val });
              }
            }
          }}
          onPointerOut={() => setHovered(null)}
        >
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} opacity={0.85} transparent depthWrite={false} />
        </mesh>
      )}

      {hovered && (
        <Html position={[hovered.x, hovered.y, hovered.z]} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
          <div className="bg-slate-900/90 text-white text-xs px-2 py-1.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap transform -translate-x-1/2 -translate-y-[150%] border border-slate-700 backdrop-blur-sm flex flex-col gap-1 items-center">
            <span className="text-slate-400 font-medium">Element {hovered.id}</span>
            <span className="font-bold text-blue-400">{activeResultMap} = {hovered.val.toExponential(3)} {unit}</span>
          </div>
        </Html>
      )}

      {/* Wireframe overlay — only render if geometry has vertices */}
      {lineGeometry && lineGeometry.attributes.position && (
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color="#10b981" opacity={0.6} transparent depthTest={false} />
        </lineSegments>
      )}
    </group>
  );
}

function showingHeatmap(results, activeResultMap) {
  return results && results.shell_forces && activeResultMap && activeResultMap !== 'None';
}
