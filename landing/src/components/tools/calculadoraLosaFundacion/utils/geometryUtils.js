// Helper: rotar un punto alrededor de un pivote
export const rotatePoint = (x, y, cx, cy, angleDeg) => {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + (x - cx) * cos - (y - cy) * sin,
    y: cy + (x - cx) * sin + (y - cy) * cos,
  };
};

// Calcula las paredes rotadas para preview y commit
export const getRotatedWalls = (ids, angleDeg) => {
  const walls = internalWalls.filter(w => ids.has(w.id));
  if (walls.length === 0) return [];
  let cx = 0, cy = 0, count = 0;
  if (rotatePivotMode === 'centroid') {
    walls.forEach(w => { cx += w.x1 + w.x2; cy += w.y1 + w.y2; count += 2; });
    cx /= count; cy /= count;
  } // else origin (0,0)
  return walls.map(w => {
    const p1 = rotatePoint(w.x1, w.y1, cx, cy, angleDeg);
    const p2 = rotatePoint(w.x2, w.y2, cx, cy, angleDeg);
    return { ...w, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  });
};
