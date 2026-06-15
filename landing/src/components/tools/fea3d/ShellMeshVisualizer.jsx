import React, { useMemo } from 'react';
import * as THREE from 'three';

// Color map from blue (min) to red (max)
function getColor(value, min, max) {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    return new THREE.Color('#3b82f6'); // default blue
  }
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // HSL: Blue (240°) → Red (0°)
  const hue = (1 - ratio) * 240 / 360;
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

export function ShellMeshVisualizer({ mesh, shellId, results, activeResultMap }) {
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

    const hasRange = isFinite(valMin) && isFinite(valMax);

    // --- Build geometry buffers ---
    const linePositions = [];
    const facePositions = [];
    const faceColors    = [];

    mesh.elements.forEach(el => {
      const ids = el.nodeIds || [];
      const p = ids.map(id => nodeMap.get(id));

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
        // Triangle 2: a, c, d
        facePositions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
        faceColors.push(r, g, b, r, g, b, r, g, b);
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
    }

    return {
      lineGeometry: lGeo,
      faceGeometry: fGeo,
      hasFaces: facePositions.length > 0,
    };
  }, [mesh, results, activeResultMap]);

  return (
    <group>
      {/* Solid Faces with Heatmap */}
      {hasFaces && showingHeatmap(results, activeResultMap) && (
        <mesh geometry={faceGeometry}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} opacity={0.85} transparent depthWrite={false} />
        </mesh>
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
