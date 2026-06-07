export function getUtilizationColor(ratio) {
  if (ratio === null || ratio === undefined) return "#475569"; // Gris si no hay resultados
  
  // Clamp del ratio entre 0 y 1.1 para el color
  const r = Math.min(Math.max(ratio, 0), 1.1);
  
  // Interpolación simple de Azul -> Verde -> Rojo
  if (r < 0.5) {
    // De Azul (0,0,255) a Verde (0,255,0)
    const factor = r * 2;
    return `rgb(0, ${Math.floor(255 * factor)}, ${Math.floor(255 * (1 - factor))})`;
  } else {
    // De Verde (0,255,0) a Rojo (255,0,0)
    const factor = (r - 0.5) * 2;
    return `rgb(${Math.floor(255 * factor)}, ${Math.floor(255 * (1 - factor))}, 0)`;
  }
}