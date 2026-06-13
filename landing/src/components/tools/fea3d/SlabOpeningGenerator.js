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
    const hw = width / 2;
    const hl = length / 2;
    return [
      { x: -hw, y: -hl },
      { x: hw, y: -hl },
      { x: hw, y: hl },
      { x: -hw, y: hl },
    ];
  }

  static _generateLShape({ width = 1, length1 = 3, length2 = 3 }) {
    // Escuadra "L". El centro (0,0) es el centro de masa del área total abarcada.
    // Asumimos un "box" de (length1 x length2)
    const hl1 = length1 / 2;
    const hl2 = length2 / 2;
    
    return [
      { x: -hl1, y: -hl2 },           // Esquina exterior inf izq
      { x: hl1, y: -hl2 },            // Esquina inf der
      { x: hl1, y: -hl2 + width },    // Sube el ancho de la L
      { x: -hl1 + width, y: -hl2 + width }, // Esquina interior
      { x: -hl1 + width, y: hl2 },    // Sube al tope
      { x: -hl1, y: hl2 }             // Esquina superior izq
    ];
  }

  static _generateUShape({ width1 = 1, width2 = 1, eyeSpace = 0.5, totalLength = 3, landingLength = 1.5 }) {
    // Forma de Herradura (U)
    // Las ramas (width1 y width2) van hacia arriba.
    // El descanso (landingLength) une abajo.
    const hw = (width1 + eyeSpace + width2) / 2;
    const hl = totalLength / 2;

    return [
      { x: -hw, y: -hl },                                // Inf izq
      { x: hw, y: -hl },                                 // Inf der
      { x: hw, y: hl },                                  // Sup der
      { x: hw - width2, y: hl },                         // Interior rama der sup
      { x: hw - width2, y: -hl + landingLength },        // Ojo inf der
      { x: -hw + width1, y: -hl + landingLength },       // Ojo inf izq
      { x: -hw + width1, y: hl },                        // Interior rama izq sup
      { x: -hw, y: hl }                                  // Sup izq
    ];
  }
}
