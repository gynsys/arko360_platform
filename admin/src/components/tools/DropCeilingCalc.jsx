import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

export default function DropCeilingCalc() {
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [results, setResults] = useState(null);

  const calculate = (e) => {
    e.preventDefault();
    const w = parseFloat(width);
    const l = parseFloat(length);

    if (isNaN(w) || isNaN(l) || w <= 0 || l <= 0) return;

    const area = w * l;
    const perimeter = (w + l) * 2;

    // Cálculo estándar para cielo raso de Drywall (Junta Invisible)
    // Láminas de yeso estándar (1.22 x 2.44 = 2.97m2) + 10% desperdicio
    const laminas = Math.ceil((area / 2.97) * 1.10);
    
    // Perfilería (Longitud estándar 3.05m)
    // Ángulos perimetrales (1.05 factor de desperdicio)
    const angulos = Math.ceil((perimeter / 3.05) * 1.05);
    
    // Parales/Viguetas (cada 0.61m)
    const parales = Math.ceil(((area / 0.61) / 3.05) * 1.10);
    
    // Omegas (cada 0.40m)
    const omegas = Math.ceil(((area / 0.40) / 3.05) * 1.10);

    // Accesorios
    const tornillosEstructura = Math.ceil(area * 15); // ~15 por m2
    const tornillosLamina = Math.ceil(area * 25); // ~25 por m2
    const cintaMalla = Math.ceil(area * 1.5); // ~1.5m lineales por m2
    const pastaGalones = Math.ceil(area / 10); // ~1 galón por cada 10m2

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

  return (
    <div className="calculator-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: '8px' }}>
          <Calculator size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--secondary)' }}>Cómputos de Cielo Raso</h2>
          <p style={{ color: 'var(--text-muted)' }}>Calculadora para techo continuo (Drywall Junta Invisible)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Formulario */}
        <div>
          <form onSubmit={calculate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Ancho del espacio (metros)</label>
              <input
                type="number"
                step="0.01"
                required
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                placeholder="Ej. 4.50"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Largo del espacio (metros)</label>
              <input
                type="number"
                step="0.01"
                required
                value={length}
                onChange={(e) => setLength(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                placeholder="Ej. 6.00"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
              Calcular Materiales
            </button>
          </form>
        </div>

        {/* Resultados */}
        <div style={{ background: 'var(--bg-alt)', padding: '24px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Cantidades Estimadas</h3>
          
          {!results ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              Ingresa las dimensiones para ver el cálculo aproximado (incluye 10% desperdicio).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Área Total:</span>
                <strong>{results.area} m²</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Láminas de Yeso (1.22x2.44m):</span>
                <strong>{results.laminas} und</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Ángulos Perimetrales (3.05m):</span>
                <strong>{results.angulos} und</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Parales / Viguetas (3.05m):</span>
                <strong>{results.parales} und</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Omegas (3.05m):</span>
                <strong>{results.omegas} und</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Tornillos Estructura (Frama):</span>
                <strong>{results.tornillosEstructura} und</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Tornillos Lámina (Drywall 1"):</span>
                <strong>{results.tornillosLamina} und</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <span>Cinta Malla / Papel:</span>
                <strong>{results.cintaMalla} metros</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <span>Pasta Profesional:</span>
                <strong>{results.pastaGalones} Galones</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
