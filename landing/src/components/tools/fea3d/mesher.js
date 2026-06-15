// mesher.js - Structured Quad Mesh Generator for Arko3D
// Strategy: Direct structured grid -> 100% Quads for regular shapes.
// Cell inclusion is decided by CENTROID, never by corner nodes.
// This avoids boundary node ambiguity (points exactly on edge of polygon).

// --- Geometry Helpers ---

function isPointInPolygon(pt, vs) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointInAnyHole(pt, holes) {
  return holes.some(h => isPointInPolygon(pt, h));
}

function isCellValid(cx, cy, boundary, holes) {
  const pt = { x: cx, y: cy };
  return isPointInPolygon(pt, boundary) && !isPointInAnyHole(pt, holes);
}

function cross2D(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function isConvexQuad(p1, p2, p3, p4) {
  const pts = [p1, p2, p3, p4];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross2D(pts[i], pts[(i + 1) % 4], pts[(i + 2) % 4]);
    if (Math.abs(c) < 1e-10) return false;
    if (sign === 0) sign = c > 0 ? 1 : -1;
    else if ((c > 0 ? 1 : -1) !== sign) return false;
  }
  return true;
}

/**
 * Main API: generateMesh
 * @param {Array} boundaryNodes - [{id, x, y, z}] ordered perimeter
 * @param {Array} openingsNodes - Array of arrays [[{id, x, y, z}], ...]
 * @param {Number} meshSize - Target element size
 */
export function generateMesh(boundaryNodes, openingsNodes = [], meshSize = 1.0) {
  if (!boundaryNodes || boundaryNodes.length < 3) return null;

  const avgZ = boundaryNodes.reduce((s, n) => s + n.z, 0) / boundaryNodes.length;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  boundaryNodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  });

  // --- Step 1: Build structured grid (ALL nodes, no filtering) ---
  const cols = Math.round((maxX - minX) / meshSize);
  const rows = Math.round((maxY - minY) / meshSize);
  const dx = (maxX - minX) / Math.max(cols, 1);
  const dy = (maxY - minY) / Math.max(rows, 1);

  let idCounter = 0;

  // grid[r][c] always exists - all boundary nodes included
  const grid = [];
  for (let r = 0; r <= rows; r++) {
    grid[r] = [];
    for (let c = 0; c <= cols; c++) {
      grid[r][c] = {
        id: `G-${++idCounter}`,
        x: minX + c * dx,
        y: minY + r * dy,
        z: avgZ
      };
    }
  }

  // --- Step 2: Decide which CELLS are active using centroid test ---
  const elements = [];
  const usedNodeIds = new Set();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p00 = grid[r][c];         // bottom-left
      const p10 = grid[r][c + 1];     // bottom-right
      const p11 = grid[r + 1][c + 1]; // top-right
      const p01 = grid[r + 1][c];     // top-left

      // Test centroid of this cell
      const cx = (p00.x + p10.x + p11.x + p01.x) / 4;
      const cy = (p00.y + p10.y + p11.y + p01.y) / 4;

      if (!isCellValid(cx, cy, boundaryNodes, openingsNodes)) continue;

      // Full quad cell - add as Quad element
      elements.push({ type: 'quad', nodes: [p00, p10, p11, p01] });
      [p00, p10, p11, p01].forEach(n => usedNodeIds.add(n.id));
    }
  }

  // --- Step 3: Only keep nodes that are actually referenced by elements ---
  const finalNodes = [];
  const seenIds = new Set();
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const n = grid[r][c];
      if (usedNodeIds.has(n.id) && !seenIds.has(n.id)) {
        finalNodes.push(n);
        seenIds.add(n.id);
      }
    }
  }

  // --- Step 4: Serialize elements ---
  elements.forEach((el, idx) => {
    el.id = `FE-${idx}`;
    el.nodeIds = el.nodes.map(n => n.id);
    delete el.nodes;
  });

  return { nodes: finalNodes, elements };
}
