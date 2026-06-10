/**
 * Retorna un color hexadecimal basado en el ratio de utilización (0 a 1).
 * Escala: Azul (bajo) -> Verde -> Rojo (falla)
 */
export function getUtilizationColor(ratio) {
  if (ratio === null || ratio === undefined) return "#94a3b8"; 
  
  const r = Math.min(Math.max(ratio, 0), 1.1);
  
  if (r < 0.5) {
    // Interpolación Azul a Verde
    const factor = r * 2;
    return `rgb(0, ${Math.floor(255 * factor)}, ${Math.floor(255 * (1 - factor))})`;
  } else {
    // Interpolación Verde a Rojo
    const factor = (r - 0.5) * 2;
    return `rgb(${Math.floor(255 * factor)}, ${Math.floor(255 * (1 - factor))}, 0)`;
  }
}

/**
 * Convierte coordenadas de objeto a array para Three.js si es necesario
 */
export const toVector3 = (node) => [node.x, node.y, node.z];