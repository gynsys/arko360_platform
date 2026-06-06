import React, { useMemo } from 'react';
import { calcularLosaMaciza } from '../calculos/losaMaciza';
import ConfiguracionMaciza from './ConfiguracionMaciza';
import { renderGrid, renderSeccion } from '../../visualizacion';

export default function LosaMaciza({ grid, datos, macizaConfig, costos, onConfigChange }) {
  const resultados = useMemo(() => {
    if (!grid || !datos || !costos) return null;
    return calcularLosaMaciza(grid, datos, macizaConfig, costos);
  }, [grid, datos, macizaConfig, costos]);

  // Preparar props para visualizadores (si aún los usas como funciones)
  const vizProps = resultados
    ? {
        wu: parseFloat(resultados.wu),
        ratio: parseFloat(resultados.ratio),
        esDosDirecciones: resultados.esDosDirecciones,
      }
    : {};

  return (
    <div>
      <ConfiguracionMaciza config={macizaConfig} onChange={onConfigChange} />
    </div>
  );
}
