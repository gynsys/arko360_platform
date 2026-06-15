// mesher.js - Conforming Structured Quad Mesh Generator for Arko3D
//
// STRATEGY (SAP2000/ETABS style):
//   1. Build base grid lines from meshSize.
//   2. ADD extra grid lines passing through every opening corner (x and y coords).
//      This makes the mesh "conform" to openings of ANY shape (rect, L, U, etc.)
//   3. Every cell centroid is tested: inside boundary & NOT in a hole → Quad element.
//   4. 100% quads for axis-aligned geometry. Openings get perfectly aligned border cells.

// ─── Geometry Helpers ────────────────────────────────────────────────────────

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

function isCellValid(cx, cy, boundary, holes) {
  const pt = { x: cx, y: cy };
  if (!isPointInPolygon(pt, boundary)) return false;
  for (const h of holes) {
    if (isPointInPolygon(pt, h)) return false;
  }
  return true;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * generateMesh
 * @param {Array}  boundaryNodes  [{id, x, y, z}] - ordered slab perimeter
 * @param {Array}  openingsNodes  [[{id, x, y, z}], ...] - array of hole polygons
 * @param {Number} meshSize       Target element size (in project length units)
 * @returns {{ nodes: Array, elements: Array } | null}
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

  const cols = Math.round((maxX - minX) / meshSize);
  const rows = Math.round((maxY - minY) / meshSize);
  const dx = (maxX - minX) / Math.max(cols, 1);
  const dy = (maxY - minY) / Math.max(rows, 1);

  // ── Step 1: Collect X grid line positions ─────────────────────────────────
  // Base lines + one line through every opening corner's X coordinate
  const PREC = 6; // decimal places for deduplication
  const fmt = (v) => parseFloat(v.toFixed(PREC));

  const xSet = new Set();
  for (let c = 0; c <= cols; c++) xSet.add(fmt(minX + c * dx));

  openingsNodes.forEach(hole => {
    hole.forEach(n => {
      const x = fmt(n.x);
      // Only add if it falls within the slab bounding box
      if (x >= fmt(minX) && x <= fmt(maxX)) xSet.add(x);
    });
  });

  const sortedX = [...xSet].sort((a, b) => a - b);

  // ── Step 2: Collect Y grid line positions ─────────────────────────────────
  const ySet = new Set();
  for (let r = 0; r <= rows; r++) ySet.add(fmt(minY + r * dy));

  openingsNodes.forEach(hole => {
    hole.forEach(n => {
      const y = fmt(n.y);
      if (y >= fmt(minY) && y <= fmt(maxY)) ySet.add(y);
    });
  });

  const sortedY = [...ySet].sort((a, b) => a - b);

  // ── Step 3: Build 2D node grid ────────────────────────────────────────────
  let idCounter = 0;
  // grid[rowIdx][colIdx] → node object
  const grid = sortedY.map(y =>
    sortedX.map(x => ({ id: `G-${++idCounter}`, x, y, z: avgZ }))
  );

  // ── Step 4: Generate Quad elements (centroid test) ────────────────────────
  const elements = [];
  const usedNodeIds = new Set();

  for (let r = 0; r < sortedY.length - 1; r++) {
    for (let c = 0; c < sortedX.length - 1; c++) {
      // Cell centroid
      const cx = (sortedX[c] + sortedX[c + 1]) / 2;
      const cy = (sortedY[r] + sortedY[r + 1]) / 2;

      if (!isCellValid(cx, cy, boundaryNodes, openingsNodes)) continue;

      const p00 = grid[r][c];          // bottom-left
      const p10 = grid[r][c + 1];      // bottom-right
      const p11 = grid[r + 1][c + 1];  // top-right
      const p01 = grid[r + 1][c];      // top-left

      elements.push({ type: 'quad', nodes: [p00, p10, p11, p01] });
      [p00, p10, p11, p01].forEach(n => usedNodeIds.add(n.id));
    }
  }

  // ── Step 5: Collect only referenced nodes ─────────────────────────────────
  const finalNodes = [];
  const seenIds = new Set();
  for (let r = 0; r < sortedY.length; r++) {
    for (let c = 0; c < sortedX.length; c++) {
      const n = grid[r][c];
      if (usedNodeIds.has(n.id) && !seenIds.has(n.id)) {
        finalNodes.push(n);
        seenIds.add(n.id);
      }
    }
  }

  // ── Step 6: Serialize elements (remove node refs, keep nodeIds) ───────────
  elements.forEach((el, idx) => {
    el.id = `FE-${idx}`;
    el.nodeIds = el.nodes.map(n => n.id);
    delete el.nodes;
  });

  return { nodes: finalNodes, elements };
}
