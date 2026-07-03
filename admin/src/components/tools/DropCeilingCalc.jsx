import React, { useState } from 'react';
import { Calculator, DollarSign, RefreshCw } from 'lucide-react';

export default function DropCeilingCalc() {
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(40.00); // Tasa de cambio por defecto
  
  // Precios base en USD
  const [prices, setPrices] = useState({
    laminas: 10.0,
    angulos: 2.5,
    parales: 3.0,
    omegas: 3.0,
    tornillosEstructura: 0.02,
    tornillosLamina: 0.015,
    cintaMalla: 0.10,
    pastaGalones: 15.0
  });

  const [results, setResults] = useState(null);

  const handlePriceChange = (key, value) => {
    const val = parseFloat(value);
    setPrices(prev => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  };

  const calculate = (e) => {
    e.preventDefault();
    const w = parseFloat(width);
    const l = parseFloat(length);

    if (isNaN(w) || isNaN(l) || w <= 0 || l <= 0) return;

    const area = w * l;
    const perimeter = (w + l) * 2;

    // Cálculo estándar para cielo raso de Drywall (Junta Invisible)
    const laminas = Math.ceil((area / 2.97) * 1.10);
    const angulos = Math.ceil((perimeter / 3.05) * 1.05);
    const parales = Math.ceil(((area / 0.61) / 3.05) * 1.10);
    const omegas = Math.ceil(((area / 0.40) / 3.05) * 1.10);
    const tornillosEstructura = Math.ceil(area * 15);
    const tornillosLamina = Math.ceil(area * 25);
    const cintaMalla = Math.ceil(area * 1.5);
    const pastaGalones = Math.ceil(area / 10);

    setResults({
      area: area.toFixed(2),
      perimeter: perimeter.toFixed(2),
      laminas,
      angulos,
      parales,
      omegas,
      tornillosEstructura,
      tornillosLamina,
      cintaMalla,
      pastaGalones
    });
  };

  const formatMoney = (usdAmount) => {
    const amount = currency === 'VES' ? usdAmount * exchangeRate : usdAmount;
    const symbol = currency === 'VES' ? 'Bs.' : '$';
    return `${symbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateTotal = () => {
    if (!results) return 0;
    return (
      results.laminas * prices.laminas +
      results.angulos * prices.angulos +
      results.parales * prices.parales +
      results.omegas * prices.omegas +
      results.tornillosEstructura * prices.tornillosEstructura +
      results.tornillosLamina * prices.tornillosLamina +
      results.cintaMalla * prices.cintaMalla +
      results.pastaGalones * prices.pastaGalones
    );
  };

  return (
    <div className="calculator-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: '8px' }}>
          <Calculator size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--secondary)' }}>Cómputos de Cielo Raso</h2>
          <p style={{ color: 'var(--text-muted)' }}>Calculadora de materiales y presupuesto (Drywall Junta Invisible)</p>
        </div>
        
        {/* Moneda y Tasa */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-alt)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Moneda:</span>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontWeight: 700 }}
            >
              <option value="USD">USD ($)</option>
              <option value="VES">Bolívares (Bs)</option>
            </select>
          </div>
          {currency === 'VES' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Tasa (Bs):</span>
              <input 
                type="number" 
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontWeight: 600 }}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
        {/* Formulario y Precios Base */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form onSubmit={calculate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} /> Dimensiones
            </h3>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Ancho (metros)</label>
              <input
                type="number"
                step="0.01"
                required
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-body)' }}
                placeholder="Ej. 4.50"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Largo (metros)</label>
              <input
                type="number"
                step="0.01"
                required
                value={length}
                onChange={(e) => setLength(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-body)' }}
                placeholder="Ej. 6.00"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
              Calcular Proyecto
            </button>
          </form>

          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} /> Precios Unitarios (Ref. USD)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              {[
                { id: 'laminas', label: 'Lámina Yeso' },
                { id: 'angulos', label: 'Ángulo' },
                { id: 'parales', label: 'Paral' },
                { id: 'omegas', label: 'Omega' },
                { id: 'tornillosEstructura', label: 'Tornillo Frama' },
                { id: 'tornillosLamina', label: 'Tornillo Drywall' },
                { id: 'cintaMalla', label: 'Cinta Malla' },
                { id: 'pastaGalones', label: 'Pasta (Galón)' }
              ].map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>$</span>
                    <input 
                      type="number" 
                      step="0.001"
                      value={prices[item.id]}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-body)', fontSize: '13px', textAlign: 'right' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div style={{ background: 'var(--bg-alt)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>Presupuesto Estimado</h3>
          
          {!results ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <Calculator size={48} style={{ opacity: 0.2 }} />
              <p>Ingresa las dimensiones para generar el cómputo métrico y presupuesto.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Área Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{results.area} m²</div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Perímetro</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{results.perimeter} m</div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '12px' }}>Material</th>
                      <th style={{ textAlign: 'center', paddingBottom: '12px' }}>Cant.</th>
                      <th style={{ textAlign: 'right', paddingBottom: '12px' }}>Precio Unit.</th>
                      <th style={{ textAlign: 'right', paddingBottom: '12px' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Láminas de Yeso (1.22x2.44m)', cant: results.laminas, price: prices.laminas },
                      { label: 'Ángulos Perimetrales (3.05m)', cant: results.angulos, price: prices.angulos },
                      { label: 'Parales / Viguetas (3.05m)', cant: results.parales, price: prices.parales },
                      { label: 'Omegas (3.05m)', cant: results.omegas, price: prices.omegas },
                      { label: 'Tornillos Estructura (Frama)', cant: results.tornillosEstructura, price: prices.tornillosEstructura },
                      { label: 'Tornillos Lámina (Drywall 1")', cant: results.tornillosLamina, price: prices.tornillosLamina },
                      { label: 'Cinta Malla (metros)', cant: results.cintaMalla, price: prices.cintaMalla },
                      { label: 'Pasta Profesional (Galones)', cant: results.pastaGalones, price: prices.pastaGalones },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 0', fontWeight: 500 }}>{row.label}</td>
                        <td style={{ textAlign: 'center', padding: '12px 0' }}>{row.cant}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0', color: 'var(--text-muted)' }}>{formatMoney(row.price)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 600 }}>{formatMoney(row.cant * row.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Costo Total de Materiales</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>No incluye desperdicios extra ni mano de obra</div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--secondary)' }}>
                  {formatMoney(calculateTotal())}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
