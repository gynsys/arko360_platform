export const OpeningType = {
  LINEAR: 'LINEAR',       // Escalera simple recta
  L_SHAPE: 'L_SHAPE',     // Escalera en L
  U_SHAPE: 'U_SHAPE',     // Escalera en U (Herradura)
  DUCT: 'DUCT',           // Ducterías (generalmente cuadradas/rectangulares pequeñas)
  ELEVATOR: 'ELEVATOR',   // Fosa de ascensor (generalmente rectangular grande)
};

export class SlabOpeningGenerator {
  /**
   * Retorna una matriz de vértices locales centrados en (0,0)
   * que representa el polígono del hueco.
   * 
   * @param {string} type Tipo de abertura (OpeningType)
   * @param {Object} params Parámetros geométricos
   * @returns {Array<{x: number, y: number}>} Polígono 2D
   */
  static generatePolygon(type, params) {
    switch (type) {
      case OpeningType.LINEAR:
      case OpeningType.DUCT:
      case OpeningType.ELEVATOR:
        return this._generateLinear(params);
      case OpeningType.L_SHAPE:
        return this._generateLShape(params);
      case OpeningType.U_SHAPE:
        return this._generateUShape(params);
      default:
        throw new Error(`Invalid opening type: ${type}`);
    }
  }

  static _generateLinear({ width = 2, length = 3 }) {
    // Origen (0,0) en esquina inferior izquierda
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: length },
      { x: 0, y: length },
    ];
  }

  static _generateLShape({ width1 = 1, width2 = 1, length1 = 3, length2 = 3 }) {
    // Escuadra "L". Origen (0,0) en esquina inferior izquierda de la L.
    // length1: longitud total en X (base)
    // length2: longitud total en Y (altura)
    // width1: ancho de la rama vertical (Y)
    // width2: ancho de la rama horizontal (X)
    
    return [
      { x: 0, y: 0 },                                // Esquina exterior inf izq
      { x: length1, y: 0 },                          // Esquina exterior inf der
      { x: length1, y: width2 },                     // Sube el ancho horizontal
      { x: width1, y: width2 },                      // Esquina interior
      { x: width1, y: length2 },                     // Sube al tope
      { x: 0, y: length2 }                           // Esquina superior izq
    ];
  }

  static _generateUShape({ width1 = 1, width2 = 1, length1 = 3, length2 = 3, landingWidth = 1 }) {
    // Forma de Herradura (U). Origen (0,0) en esquina inferior izquierda.
    // length1: Ancho total en X (incluye width1, hueco central, y width2)
    // length2: Largo total en Y (ramas hacia arriba)
    // width1: Ancho rama izquierda
    // width2: Ancho rama derecha
    // landingWidth: Espesor del descanso horizontal inferior

    // Calculamos el espacio del "ojo" (hueco interior)
    const eyeSpace = length1 - width1 - width2;

    return [
      { x: 0, y: 0 },                                       // Inf izq
      { x: length1, y: 0 },                                 // Inf der
      { x: length1, y: length2 },                           // Sup der
      { x: length1 - width2, y: length2 },                  // Interior rama der sup
      { x: length1 - width2, y: landingWidth },             // Ojo inf der
      { x: width1, y: landingWidth },                       // Ojo inf izq
      { x: width1, y: length2 },                            // Interior rama izq sup
      { x: 0, y: length2 }                                  // Sup izq
    ];
  }
}
