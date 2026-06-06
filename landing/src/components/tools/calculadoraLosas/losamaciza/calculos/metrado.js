import { N, toM2 } from '../config/unidades';
import { DENSIDAD, FACTORES } from '../config/materiales';

/**
 * Calcula metrado de acero para una dirección
 * @param {Object} armado - resultado de seleccionarBarras
 * @param {number} areaTotal - m²
 * @param {number} luzParalela - m (longitud de las barras)
 * @param {number} luzPerpendicular - m (ancho total donde se distribuyen)
 * @param {number} nTramosPerpendicular - cantidad de tramos en dirección perpendicular
 */
export const calcularMetradoDireccion = (armado, areaTotal, luzParalela, luzPerpendicular, nTramosPerpendicular) => {
  const anchoTotal = luzPerpendicular * nTramosPerpendicular; // m
  
  // Barras positivas (en tramo)
  const sepPos = N(armado.pos.sep) / 100; // convertido de cm a m
  const cantidadBandasPos = sepPos > 0 ? Math.ceil(anchoTotal / sepPos) : 0;
  const longitudTotalPos = cantidadBandasPos * luzParalela; // m
  const areaBarraPos = toM2(armado.diametroPos ? { '3/8': 71, '1/2': 129, '5/8': 199, '3/4': 284, '1': 519 }[armado.diametroPos] : 0);
  const pesoPos = longitudTotalPos * areaBarraPos * DENSIDAD.ACERO * FACTORES.DESPERDICIO_ACERO;

  // Barras negativas (en apoyo, ~50% del área)
  const sepNeg = N(armado.neg.sep) / 100; // convertido de cm a m
  const cantidadBandasNeg = sepNeg > 0 ? Math.ceil(anchoTotal / sepNeg) : 0;
  const longitudTotalNeg = cantidadBandasNeg * luzParalela * 0.5; // asumen 50% de longitud en apoyos
  const areaBarraNeg = toM2(armado.diametroNeg ? { '3/8': 71, '1/2': 129, '5/8': 199, '3/4': 284, '1': 519 }[armado.diametroNeg] : 0);
  const pesoNeg = longitudTotalNeg * areaBarraNeg * DENSIDAD.ACERO * FACTORES.DESPERDICIO_ACERO;

  return {
    pos: {
      sep: sepPos || null,
      diametro: armado.diametroPos,
      cantidad: cantidadBandasPos,
      longitudTotal: longitudTotalPos,
      peso: pesoPos,
    },
    neg: {
      sep: sepNeg || null,
      diametro: armado.diametroNeg,
      cantidad: cantidadBandasNeg,
      longitudTotal: longitudTotalNeg,
      peso: pesoNeg,
    },
    pesoTotal: pesoPos + pesoNeg,
  };
};

export const calcularCostos = (volConcretoM3, kgAceroTotal, costos) => {
  const costoConcreto = volConcretoM3 * N(costos?.concretoM3);
  const costoAcero = kgAceroTotal * N(costos?.aceroKg);
  const costoTotal = costoConcreto + costoAcero;
  return { costoConcreto, costoAcero, costoTotal };
};
