// mesher.js - Structured Quad Mesh Generator for Arko3D
// Strategy: Direct structured grid -> 100% Quads for regular shapes.
// Triangles only appear at boundary transition cells, NEVER in the interior.

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

function isPointValid(pt, boundary, holes) {
  return isPointInPolygon(pt, boundary) && !isPointInAnyHole(pt, holes);
}

// Signed area for convexity check
function cross2D(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function isConvexQuad(p1, p2, p3, p4) {
  const pts = [p1, p2, p3, p4];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross2D(pts[i], pts[(i + 1) % 4], pts[(i + 2) % 4]);
    if (Math.abs(c) < 1e-10) return false; // collinear
    if (sign === 0) sign = c > 0 ? 1 : -1;
    else if ((c > 0 ? 1 : -1) !== sign) return false;
  }
  return true;
}

/**
 * Main API: generateMesh
 * Uses a structured grid approach: 100% Quads inside, triangles only at boundaries.
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

  // --- Step 1: Build structured grid of candidate nodes ---
  // Snap grid to boundary corners for perfect alignment
  const cols = Math.round((maxX - minX) / meshSize);
  const rows = Math.round((maxY - minY) / meshSize);
  const dx = (maxX - minX) / Math.max(cols, 1);
  const dy = (maxY - minY) / Math.max(rows, 1);

  let idCounter = 0;
  const makeId = (prefix) => `${prefix}-${++idCounter}`;

  // grid[row][col] = node or null
  const grid = [];
  for (let r = 0; r <= rows; r++) {
    grid[r] = [];
    for (let c = 0; c <= cols; c++) {
      const x = minX + c * dx;
      const y = minY + r * dy;
      const pt = { id: makeId('G'), x, y, z: avgZ };
      // Keep node if it's inside boundary AND not inside a hole
      grid[r][c] = isPointValid(pt, boundaryNodes, openingsNodes) ? pt : null;
    }
  }

  // --- Step 2: Force boundary corner nodes into the grid ---
  // Find nearest grid position for each boundary node and snap it in
  boundaryNodes.forEach(bn => {
    const cIdx = Math.round((bn.x - minX) / dx);
    const rIdx = Math.round((bn.y - minY) / dy);
    const ci = Math.max(0, Math.min(cols, cIdx));
    const ri = Math.max(0, Math.min(rows, rIdx));
    if (!grid[ri][ci]) {
      grid[ri][ci] = { id: bn.id, x: bn.x, y: bn.y, z: bn.z };
    }
  });

  // --- Step 3: Generate Quad elements from valid grid cells ---
  const elements = [];
  const usedNodeIds = new Set();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p00 = grid[r][c];        // bottom-left
      const p10 = grid[r][c + 1];    // bottom-right
      const p11 = grid[r + 1][c + 1]; // top-right
      const p01 = grid[r + 1][c];    // top-left

      const valid = [p00, p10, p11, p01].filter(Boolean);

      if (valid.length === 4) {
        // Check cell centroid is inside (handles non-axis-aligned boundaries)
        const cx = (p00.x + p10.x + p11.x + p01.x) / 4;
        const cy = (p00.y + p10.y + p11.y + p01.y) / 4;
        if (!isPointValid({ x: cx, y: cy }, boundaryNodes, openingsNodes)) continue;

        if (isConvexQuad(p00, p10, p11, p01)) {
          elements.push({ type: 'quad', nodes: [p00, p10, p11, p01] });
          [p00, p10, p11, p01].forEach(n => usedNodeIds.add(n.id));
        } else {
          // Degenerate quad: split into 2 triangles
          const t1cent = { x: (p00.x + p10.x + p11.x) / 3, y: (p00.y + p10.y + p11.y) / 3 };
          const t2cent = { x: (p00.x + p11.x + p01.x) / 3, y: (p00.y + p11.y + p01.y) / 3 };
          if (isPointValid(t1cent, boundaryNodes, openingsNodes)) {
            elements.push({ type: 'triangle', nodes: [p00, p10, p11] });
            [p00, p10, p11].forEach(n => usedNodeIds.add(n.id));
          }
          if (isPointValid(t2cent, boundaryNodes, openingsNodes)) {
            elements.push({ type: 'triangle', nodes: [p00, p11, p01] });
            [p00, p11, p01].forEach(n => usedNodeIds.add(n.id));
          }
        }
      } else if (valid.length === 3) {
        // Boundary triangle
        const cent = { x: valid.reduce((s, n) => s + n.x, 0) / 3, y: valid.reduce((s, n) => s + n.y, 0) / 3 };
        if (!isPointValid(cent, boundaryNodes, openingsNodes)) continue;
        elements.push({ type: 'triangle', nodes: valid });
        valid.forEach(n => usedNodeIds.add(n.id));
      }
      // 0, 1, or 2 valid corners = outside the shape, skip
    }
  }

  // --- Step 4: Build final node list (only used nodes) ---
  const finalNodes = [];
  const seenIds = new Set();
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const n = grid[r][c];
      if (n && usedNodeIds.has(n.id) && !seenIds.has(n.id)) {
        finalNodes.push(n);
        seenIds.add(n.id);
      }
    }
  }

  // --- Step 5: Serialize elements ---
  elements.forEach((el, idx) => {
    el.id = `FE-${idx}`;
    el.nodeIds = el.nodes.map(n => n.id);
    delete el.nodes;
  });

  return { nodes: finalNodes, elements };
}
