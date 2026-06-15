// mesher.js
// Auto Meshing Algorithm for Arko3D
// Generates a finite element mesh (Quads + Triangles) for a slab with openings.

// --- Helper Math Functions ---

function isPointInPolygon(point, vs) {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x, yi = vs[i].y;
    let xj = vs[j].x, yj = vs[j].y;
    let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distSq(p1, p2) {
  return (p1.x - p2.x)**2 + (p1.y - p2.y)**2;
}

// Circumcircle of a triangle (p1, p2, p3)
function getCircumcircle(p1, p2, p3) {
  const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  if (Math.abs(d) < 1e-9) return null; // collinear
  
  const ux = ((p1.x**2 + p1.y**2) * (p2.y - p3.y) + (p2.x**2 + p2.y**2) * (p3.y - p1.y) + (p3.x**2 + p3.y**2) * (p1.y - p2.y)) / d;
  const uy = ((p1.x**2 + p1.y**2) * (p3.x - p2.x) + (p2.x**2 + p2.y**2) * (p1.x - p3.x) + (p3.x**2 + p3.y**2) * (p2.x - p1.x)) / d;
  
  const rSq = (ux - p1.x)**2 + (uy - p1.y)**2;
  return { x: ux, y: uy, rSq };
}

// Bowyer-Watson Delaunay Triangulation
function delaunayTriangulate(vertices) {
  if (vertices.length < 3) return [];

  // Super triangle
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  vertices.forEach(v => {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  });

  const dx = maxX - minX;
  const dy = maxY - minY;
  const deltaMax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const st1 = { id: 'ST1', x: midX - 20 * deltaMax, y: midY - deltaMax, z: 0 };
  const st2 = { id: 'ST2', x: midX, y: midY + 20 * deltaMax, z: 0 };
  const st3 = { id: 'ST3', x: midX + 20 * deltaMax, y: midY - deltaMax, z: 0 };

  let triangles = [
    { p1: st1, p2: st2, p3: st3, circle: getCircumcircle(st1, st2, st3) }
  ];

  for (let i = 0; i < vertices.length; i++) {
    const pt = vertices[i];
    const badTriangles = [];
    
    for (let t of triangles) {
      if (!t.circle) continue;
      if (distSq(pt, t.circle) <= t.circle.rSq + 1e-9) {
        badTriangles.push(t);
      }
    }

    const polygon = [];
    for (let t of badTriangles) {
      const edges = [
        { a: t.p1, b: t.p2 },
        { a: t.p2, b: t.p3 },
        { a: t.p3, b: t.p1 }
      ];
      for (let edge of edges) {
        let isShared = false;
        for (let other of badTriangles) {
          if (other === t) continue;
          if ((other.p1 === edge.a || other.p2 === edge.a || other.p3 === edge.a) &&
              (other.p1 === edge.b || other.p2 === edge.b || other.p3 === edge.b)) {
            isShared = true;
            break;
          }
        }
        if (!isShared) polygon.push(edge);
      }
    }

    triangles = triangles.filter(t => !badTriangles.includes(t));

    for (let edge of polygon) {
      triangles.push({
        p1: edge.a,
        p2: edge.b,
        p3: pt,
        circle: getCircumcircle(edge.a, edge.b, pt)
      });
    }
  }

  triangles = triangles.filter(t => {
    return t.p1.id !== 'ST1' && t.p1.id !== 'ST2' && t.p1.id !== 'ST3' &&
           t.p2.id !== 'ST1' && t.p2.id !== 'ST2' && t.p2.id !== 'ST3' &&
           t.p3.id !== 'ST1' && t.p3.id !== 'ST2' && t.p3.id !== 'ST3';
  });

  return triangles;
}

function getTriangleArea(p1, p2, p3) {
  return Math.abs((p1.x*(p2.y-p3.y) + p2.x*(p3.y-p1.y) + p3.x*(p1.y-p2.y))/2);
}

function getCentroid(p1, p2, p3) {
  return {
    x: (p1.x + p2.x + p3.x) / 3,
    y: (p1.y + p2.y + p3.y) / 3
  };
}

function isConvexQuad(p1, p2, p3, p4) {
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const cp1 = cross(p1, p2, p3);
  const cp2 = cross(p2, p3, p4);
  const cp3 = cross(p3, p4, p1);
  const cp4 = cross(p4, p1, p2);
  return (cp1 > 0 && cp2 > 0 && cp3 > 0 && cp4 > 0) || (cp1 < 0 && cp2 < 0 && cp3 < 0 && cp4 < 0);
}

function mergeIntoQuads(triangles) {
  const elements = [];
  const used = new Set();

  for (let i = 0; i < triangles.length; i++) {
    if (used.has(i)) continue;
    let t1 = triangles[i];
    let merged = false;

    for (let j = i + 1; j < triangles.length; j++) {
      if (used.has(j)) continue;
      let t2 = triangles[j];

      const n1 = [t1.p1, t1.p2, t1.p3];
      const n2 = [t2.p1, t2.p2, t2.p3];
      
      const shared = n1.filter(n => n2.includes(n));
      
      if (shared.length === 2) {
        const unshared1 = n1.find(n => !shared.includes(n));
        const unshared2 = n2.find(n => !shared.includes(n));

        const quadNodes = [unshared1, shared[0], unshared2, shared[1]];

        if (isConvexQuad(quadNodes[0], quadNodes[1], quadNodes[2], quadNodes[3])) {
          elements.push({
            type: 'quad',
            nodes: quadNodes
          });
          used.add(i);
          used.add(j);
          merged = true;
          break;
        }
      }
    }

    if (!merged) {
      elements.push({
        type: 'triangle',
        nodes: [t1.p1, t1.p2, t1.p3]
      });
    }
  }

  return elements;
}

/**
 * Main API: generateMesh
 * @param {Array} boundaryNodes - [{id, x, y, z}] ordered perimeter
 * @param {Array} openingsNodes - Array of arrays [[{id, x, y, z}], ...]
 * @param {Number} meshSize - Target size for elements
 */
export function generateMesh(boundaryNodes, openingsNodes = [], meshSize = 1.0) {
  if (!boundaryNodes || boundaryNodes.length < 3) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const avgZ = boundaryNodes.reduce((sum, n) => sum + n.z, 0) / boundaryNodes.length;

  boundaryNodes.forEach(v => {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  });

  const allVertices = [];
  const existingIds = new Set();

  const addVertex = (n) => {
    if (!existingIds.has(n.id)) {
      allVertices.push(n);
      existingIds.add(n.id);
    }
  };

  boundaryNodes.forEach(addVertex);
  openingsNodes.forEach(hole => hole.forEach(addVertex));

  let currentNewId = 1;

  for (let x = minX + meshSize/2; x < maxX; x += meshSize) {
    for (let y = minY + meshSize/2; y < maxY; y += meshSize) {
      const pt = { x, y, z: avgZ };
      
      if (!isPointInPolygon(pt, boundaryNodes)) continue;
      
      let inHole = false;
      for (let hole of openingsNodes) {
        if (isPointInPolygon(pt, hole)) {
          inHole = true;
          break;
        }
      }
      if (inHole) continue;

      let tooClose = false;
      const minDistanceSq = (meshSize * 0.3)**2; 
      
      for (let v of allVertices) {
        if (distSq(pt, v) < minDistanceSq) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      pt.id = `M-${Date.now().toString(36)}-${currentNewId++}`;
      allVertices.push(pt);
    }
  }

  const rawTriangles = delaunayTriangulate(allVertices);

  let validTriangles = [];
  for (let t of rawTriangles) {
    if (getTriangleArea(t.p1, t.p2, t.p3) < 1e-6) continue;
    
    const centroid = getCentroid(t.p1, t.p2, t.p3);
    
    if (!isPointInPolygon(centroid, boundaryNodes)) continue;
    
    let inHole = false;
    for (let hole of openingsNodes) {
      if (isPointInPolygon(centroid, hole)) {
        inHole = true;
        break;
      }
    }
    if (inHole) continue;

    validTriangles.push(t);
  }

  const feElements = mergeIntoQuads(validTriangles);

  const usedVertexIds = new Set();
  feElements.forEach(el => {
    el.nodes.forEach(n => usedVertexIds.add(n.id));
  });

  const finalNodes = allVertices.filter(v => usedVertexIds.has(v.id));

  feElements.forEach((el, index) => {
    el.id = `FE-${Date.now().toString(36)}-${index}`;
    el.nodeIds = el.nodes.map(n => n.id);
    delete el.nodes; // remove reference to keep serializable
  });

  return { nodes: finalNodes, elements: feElements };
}
