export const EdgeType = {
  PARALLEL: 'PARALLEL',
  PERPENDICULAR: 'PERPENDICULAR',
  DIAGONAL: 'DIAGONAL',
};

export class SlabReinforcementEngine {
  /**
   * Recibe el polígono de la abertura (en coordenadas locales o globales) 
   * y la losa colaborante. Clasifica los bordes para determinar refuerzos.
   * 
   * @param {Array<{x: number, y: number}>} openingPolygon Vertices del poligono
   * @param {Object} slabProperties Propiedades de la losa (debe tener direccionNervios)
   * @returns {Object} Clasificación de bordes y flags de refuerzo
   */
  static calcularRefuerzoLosaColaborante(openingPolygon, slabProperties) {
    // Si no tiene dirección definida, asumimos 0 (nervios horizontales)
    const angleRad = slabProperties.direccionNervios || 0; 
    const deckVector = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    
    const bordesClasificados = [];
    const vertices = openingPolygon;

    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      
      const edgeVector = { x: p2.x - p1.x, y: p2.y - p1.y };
      const dotProduct = Math.abs(this._normalizeDot(deckVector, edgeVector));
      
      const TOLERANCE = 0.1; // 10% de tolerancia para considerar paralelo/perpendicular
      let tipoBorde = EdgeType.DIAGONAL; 
      
      if (dotProduct > 1 - TOLERANCE) {
        tipoBorde = EdgeType.PARALLEL;
      } else if (dotProduct < TOLERANCE) {
        tipoBorde = EdgeType.PERPENDICULAR;
      }
      
      bordesClasificados.push({ p1, p2, tipoBorde, dotProduct });
    }

    return {
      bordes: bordesClasificados,
      requiresSecondaryBeams: bordesClasificados.some(b => b.tipoBorde === EdgeType.PERPENDICULAR)
    };
  }
  
  static _normalizeDot(v1, v2) {
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    
    // Evitar division por cero en bordes de longitud 0
    if (len1 === 0 || len2 === 0) return 0;
    
    return ((v1.x * v2.x) + (v1.y * v2.y)) / (len1 * len2);
  }
}
