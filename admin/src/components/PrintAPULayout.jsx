import React from 'react';

export default function PrintAPULayout({ partida, materiales, equipos, mano_obra, options }) {
  if (!partida) return null;

  // Colors
  const isColor = options.color;
  const headerColor = isColor ? 'text-blue-700' : 'text-black';
  const totalColor = isColor ? 'text-red-600' : 'text-black';

  // Borders
  const borderClass = options.format === 'lines' ? 'border border-black' : '';
  const cellClass = options.format === 'lines' ? 'border border-black px-1 py-0.5' : 'px-1 py-0.5';

  const rendimiento = partida.RenPar || partida.rendimiento || 1;
  const adminPercent = partida.admin_percent ?? 15;
  const utilPercent = partida.util_percent ?? 10;
  const fcasFactor = (partida.fcas_percent ?? 988) / 100;

  // Calculos
  const calcMatTotal = () => materiales.reduce((acc, m) => acc + (m.subtotal || 0), 0);
  const calcEqTotal = () => equipos.reduce((acc, eq) => acc + (eq.subtotal || 0), 0);
  
  const calcLabTotalJornalDay = () => mano_obra.reduce((acc, lab) => acc + (lab.tot_jornal || 0), 0);
  const calcLabTotalBonoDay = () => mano_obra.reduce((acc, lab) => acc + (lab.tot_bono || 0), 0);
  const calcLabTotalDay = () => calcLabTotalJornalDay() * (1 + fcasFactor) + calcLabTotalBonoDay();

  const totalMat = calcMatTotal();
  const totalEq = calcEqTotal() / rendimiento;
  const totalLab = calcLabTotalDay() / rendimiento;
  const subtotalA = totalMat + totalEq + totalLab;
  const adminCost = subtotalA * (adminPercent / 100);
  const subtotalB = subtotalA + adminCost;
  const utilCost = subtotalB * (utilPercent / 100);
  const unitPrice = subtotalB + utilCost;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-VE');
  };

  const currentDate = new Date().toLocaleDateString('es-VE');
  // "db" date usually comes from the budget or item. We use current date as fallback or empty.
  const displayDate = options.dateType === 'current' ? currentDate : (options.dateType === 'db' ? (partida.updated_at ? formatDate(partida.updated_at) : currentDate) : '');

  const numFormat = (val) => Number(val).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2});
  const numFormat4 = (val) => Number(val).toLocaleString('es-VE', {minimumFractionDigits:4, maximumFractionDigits:6});

  return (
    <div className="hidden print:block w-full bg-white text-black font-sans text-[11px] leading-tight print-apu-container">
      {/* Header */}
      <div className="mb-4">
        {options.showCompany && options.companyName && (
          <div className="font-bold text-sm mb-2">{options.companyName}</div>
        )}
        <h1 className={`text-center font-bold text-lg mb-4 ${headerColor}`}>ANALISIS DE PRECIO UNITARIO</h1>
        
        <div className="flex mb-2">
          <span className="font-bold mr-2">Descripción:</span>
          <span className="flex-1 uppercase">{partida.Descri || partida.descripcion}</span>
        </div>
        
        <div className="flex justify-between font-bold mt-4">
          <div>Unidad: <span className="font-normal">{partida.UniPar || partida.unidad}</span></div>
          <div>Cantidad: <span className="font-normal">{numFormat(partida.CanPar || partida.cantidad || 1)}</span></div>
          <div>Rendimiento: <span className="font-normal">{Number(rendimiento).toFixed(6)}</span></div>
          <div>Código: <span className="font-normal">{partida.CovPar || partida.CodPar || partida.codigo}</span></div>
        </div>
      </div>

      {/* 1. MATERIALES */}
      <div className="mb-4">
        <h2 className={`font-bold text-sm mb-1 uppercase ${headerColor}`}>1. MATERIALES</h2>
        <table className={`w-full text-left border-collapse ${borderClass}`}>
          <thead>
            <tr className={options.format === 'lines' ? 'border-b border-black' : ''}>
              <th className={`w-8 ${cellClass}`}>N°</th>
              <th className={cellClass}>Descripción</th>
              <th className={`w-12 text-center ${cellClass}`}>Und.</th>
              <th className={`w-20 text-right ${cellClass}`}>Cantidad</th>
              <th className={`w-16 text-right ${cellClass}`}>Desp.</th>
              <th className={`w-24 text-right ${cellClass}`}>Precio</th>
              <th className={`w-24 text-right ${cellClass}`}>Total Material</th>
            </tr>
          </thead>
          <tbody>
            {materiales.map((m, i) => (
              <tr key={i} className={options.format === 'lines' ? 'border-b border-gray-300' : ''}>
                <td className={`text-center ${cellClass}`}>{i + 1}</td>
                <td className={`uppercase ${cellClass}`}>{m.descripcion}</td>
                <td className={`text-center ${cellClass}`}>{m.unidad}</td>
                <td className={`text-right ${cellClass}`}>{numFormat4(m.cantidad)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(m.desperdicio || 0)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(m.precio_unitario)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(m.subtotal)}</td>
              </tr>
            ))}
            {materiales.length === 0 && <tr><td colSpan="7" className={`text-center py-1 ${cellClass}`}>Sin materiales</td></tr>}
          </tbody>
        </table>
        <div className="flex justify-end font-bold mt-1">
          <div className="flex w-64 justify-between">
            <span>Total Materiales:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(totalMat)}</span>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <div className="w-24 text-right">{numFormat(totalMat)}</div>
        </div>
      </div>

      {/* 2. EQUIPOS */}
      <div className="mb-4">
        <h2 className={`font-bold text-sm mb-1 uppercase ${headerColor}`}>2. EQUIPOS</h2>
        <table className={`w-full text-left border-collapse ${borderClass}`}>
          <thead>
            <tr className={options.format === 'lines' ? 'border-b border-black' : ''}>
              <th className={`w-8 ${cellClass}`}>N°</th>
              <th className={cellClass}>Descripción</th>
              <th className={`w-20 text-right ${cellClass}`}>Cantidad</th>
              <th className={`w-24 text-right ${cellClass}`}>COP/Dep/Al</th>
              <th className={`w-24 text-right ${cellClass}`}>Precio</th>
              <th className={`w-24 text-right ${cellClass}`}>Total Equipo</th>
            </tr>
          </thead>
          <tbody>
            {equipos.map((e, i) => (
              <tr key={i} className={options.format === 'lines' ? 'border-b border-gray-300' : ''}>
                <td className={`text-center ${cellClass}`}>{i + 1}</td>
                <td className={`uppercase ${cellClass}`}>{e.descripcion}</td>
                <td className={`text-right ${cellClass}`}>{numFormat4(e.cantidad)}</td>
                <td className={`text-right ${cellClass}`}>{Number(e.depreciacion || 1).toFixed(6)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(e.precio_unitario)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(e.subtotal)}</td>
              </tr>
            ))}
            {equipos.length === 0 && <tr><td colSpan="6" className={`text-center py-1 ${cellClass}`}>Sin equipos</td></tr>}
          </tbody>
        </table>
        <div className="flex justify-end font-bold mt-1">
          <div className="flex w-64 justify-between">
            <span>Total Equipos:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(calcEqTotal())}</span>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <div className="w-24 text-right">{numFormat(totalEq)}</div>
        </div>
      </div>

      {/* 3. MANO DE OBRA */}
      <div className="mb-4">
        <h2 className={`font-bold text-sm mb-1 uppercase ${headerColor}`}>3. MANO DE OBRA</h2>
        <table className={`w-full text-left border-collapse ${borderClass}`}>
          <thead>
            <tr className={options.format === 'lines' ? 'border-b border-black' : ''}>
              <th className={`w-8 ${cellClass}`}>N°</th>
              <th className={cellClass}>Descripción</th>
              <th className={`w-20 text-right ${cellClass}`}>Cantidad</th>
              <th className={`w-20 text-right ${cellClass}`}>Jornal</th>
              <th className={`w-20 text-right ${cellClass}`}>Bono</th>
              <th className={`w-24 text-right ${cellClass}`}>Total Bono</th>
              <th className={`w-24 text-right ${cellClass}`}>Total Jornal</th>
            </tr>
          </thead>
          <tbody>
            {mano_obra.map((l, i) => (
              <tr key={i} className={options.format === 'lines' ? 'border-b border-gray-300' : ''}>
                <td className={`text-center ${cellClass}`}>{i + 1}</td>
                <td className={`uppercase ${cellClass}`}>{l.descripcion}</td>
                <td className={`text-right ${cellClass}`}>{numFormat4(l.cantidad)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(l.jornal)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(l.bono)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(l.tot_bono)}</td>
                <td className={`text-right ${cellClass}`}>{numFormat(l.tot_jornal)}</td>
              </tr>
            ))}
            {mano_obra.length === 0 && <tr><td colSpan="7" className={`text-center py-1 ${cellClass}`}>Sin mano de obra</td></tr>}
          </tbody>
        </table>
        
        <div className="flex justify-end mt-1">
          <div className="w-80">
            <div className="flex justify-between mb-1">
              <span className="font-bold">Sub Total Mano de Obra:</span>
              <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(calcLabTotalBonoDay())}</span>
              <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(calcLabTotalJornalDay())}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-bold">{Number(fcasFactor * 100).toFixed(2)}% Prestaciones Sociales:</span>
              <span className="w-24 text-right">0,00</span>
              <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(calcLabTotalJornalDay() * fcasFactor)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total General Mano de Obra:</span>
              <span className="w-24"></span>
              <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(calcLabTotalDay())}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <div className="w-24 text-right">{numFormat(totalLab)}</div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="flex justify-between items-end mt-8">
        <div className="text-xs">
          Calculado por:<br/>
          {displayDate && <span className="mt-4 block">{displayDate}</span>}
        </div>
        
        <div className="w-96 text-sm">
          <div className="flex justify-between mb-1 font-bold">
            <span>Costo Directo SubTotal A:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(subtotalA)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-right flex-1 pr-4">{numFormat(adminPercent)}% Administración y Gastos Generales:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(adminCost)}</span>
          </div>
          <div className="flex justify-between mb-1 font-bold">
            <span className="text-right flex-1 pr-4">SubTotal B:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(subtotalB)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-right flex-1 pr-4">{numFormat(utilPercent)}% Utilidad e Imprevistos:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(utilCost)}</span>
          </div>
          <div className="flex justify-between mb-1 font-bold">
            <span className="text-right flex-1 pr-4">SubTotal C:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(unitPrice)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-right flex-1 pr-4">0,00% Financiamiento:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>0,00</span>
          </div>
          <div className={`flex justify-between mb-1 font-bold ${headerColor}`}>
            <span className="text-right flex-1 pr-4">Precio Unitario sin Impuesto:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(unitPrice)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-right flex-1 pr-4">0,00% Impuesto (I.V.A.):</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>0,00</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-right flex-1 pr-4">0,00% Otros Impuestos:</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>0,00</span>
          </div>
          <div className={`flex justify-between mt-4 font-bold text-base ${totalColor}`}>
            <span className="text-right flex-1 pr-4">PRECIO UNITARIO USD</span>
            <span className={`w-24 text-right ${options.format === 'lines' ? 'border border-black px-1' : ''}`}>{numFormat(unitPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
