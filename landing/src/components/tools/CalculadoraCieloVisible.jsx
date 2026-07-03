import React, { useState, useMemo } from 'react';

const CalculadoraCieloVisible = () => {
  // ─── ESTADO ───
  const [techo, setTecho] = useState({ largo: 5.0, ancho: 4.0 });
  const [correas, setCorreas] = useState('largo'); // Dirección de las correas ('largo' o 'ancho')
  const [secundarias, setSecundarias] = useState('1.22'); // '1.22' o '0.61'
  const [desperdicio, setDesperdicio] = useState(10); // %
  
  const [costos, setCostos] = useState({
    lamina: 8.50,
    principal366: 4.50,
    secundaria122: 1.80,
    secundaria061: 0.90,
    angulo305: 3.20,
    alambre: 2.50, // por kg
    clavoFulminante: 0.20 // par (clavo + fulminante)
  });

  // ─── HANDLERS ───
  const handleTecho = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setTecho(p => ({ ...p, [name]: isNaN(val) || val < 0 ? 0 : val }));
  };

  const handleCosto = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setCostos(c => ({ ...c, [name]: isNaN(val) || val < 0 ? 0 : val }));
  };

  // ─── CÁLCULOS ───
  const resultados = useMemo(() => {
    const area = techo.largo * techo.ancho;
    const perimetro = 2 * (techo.largo + techo.ancho);
    const factorDesperdicio = 1 + (desperdicio / 100);

    // Dimensiones en base a la dirección de las correas
    // Las principales van PERPENDICULARES a las correas.
    let dimPrincipal = correas === 'largo' ? techo.ancho : techo.largo; // Longitud paralela a las principales
    let dimPerpendicular = correas === 'largo' ? techo.largo : techo.ancho; // Longitud para calcular líneas de principales

    // Perfiles Principales (3.66m) - Separadas cada 1.22m
    const lineasPrincipales = Math.ceil(dimPerpendicular / 1.22);
    const metrosPrincipales = lineasPrincipales * dimPrincipal;
    const principales = Math.ceil((metrosPrincipales / 3.66) * factorDesperdicio);

    // Ángulo Perimetral (3.05m)
    const angulos = Math.ceil((perimetro / 3.05) * factorDesperdicio);

    let secundarias122 = 0;
    let secundarias061 = 0;

    if (secundarias === '1.22') {
      // Secundarias de 1.22m instaladas cada 0.61m entre las principales
      // Cantidad de módulos de 1.22m a lo largo de dimPrincipal
      const lineasSecundarias = Math.ceil(dimPrincipal / 1.22);
      // Puestas cada 0.61m a lo largo de dimPerpendicular
      const espacios061 = Math.ceil(dimPerpendicular / 0.61);
      secundarias122 = Math.ceil((lineasSecundarias * espacios061) * factorDesperdicio);
    } else {
      // Sistema cruzado (Secundarias 1.22m instaladas cada 1.22m, y secundarias 0.61m cruzando)
      const lineasSecundarias = Math.ceil(dimPrincipal / 1.22);
      const espacios122 = Math.ceil(dimPerpendicular / 1.22);
      secundarias122 = Math.ceil((lineasSecundarias * espacios122) * factorDesperdicio);
      
      // Las de 0.61m van entre las de 1.22m (2 por cada recuadro de 1.22x1.22)
      secundarias061 = Math.ceil((lineasSecundarias * espacios122 * 2) * factorDesperdicio);
    }

    // Láminas (0.61 x 1.22m)
    const areaLamina = 0.61 * 1.22;
    const laminas = Math.ceil((area / areaLamina) * factorDesperdicio);

    // Cuelgues (cada 1.22m en las principales)
    const cuelguesPrincipales = lineasPrincipales * Math.ceil(dimPrincipal / 1.22);
    const clavosPerimetrales = Math.ceil(perimetro / 0.60); // fijación del ángulo cada 60cm
    const totalFijaciones = Math.ceil((cuelguesPrincipales + clavosPerimetrales) * factorDesperdicio);

    // Alambre galvanizado (aprox 1 metro por cuelgue, ~25m por kg)
    const kgAlambre = Math.ceil((cuelguesPrincipales * factorDesperdicio) / 25) || 1;

    // Costos
    const totalLamina = laminas * costos.lamina;
    const totalPrincipal = principales * costos.principal366;
    const totalSecundaria122 = secundarias122 * costos.secundaria122;
    const totalSecundaria061 = secundarias061 * costos.secundaria061;
    const totalAngulo = angulos * costos.angulo305;
    const totalAlambre = kgAlambre * costos.alambre;
    const totalFijacion = totalFijaciones * costos.clavoFulminante;
    
    const totalGeneral = totalLamina + totalPrincipal + totalSecundaria122 + totalSecundaria061 + totalAngulo + totalAlambre + totalFijacion;

    const materialesArray = [
      { nombre: 'Láminas (0.61×1.22m)', cantidad: laminas, unidad: 'pzas', precio: costos.lamina, total: totalLamina },
      { nombre: 'Perfil Principal (3.66m)', cantidad: principales, unidad: 'pzas', precio: costos.principal366, total: totalPrincipal },
      { nombre: 'Perfil Secundaria (1.22m)', cantidad: secundarias122, unidad: 'pzas', precio: costos.secundaria122, total: totalSecundaria122 },
    ];

    if (secundarias === '0.61') {
      materialesArray.push({ nombre: 'Perfil Terciaria (0.61m)', cantidad: secundarias061, unidad: 'pzas', precio: costos.secundaria061, total: totalSecundaria061 });
    }

    materialesArray.push(
      { nombre: 'Ángulo Perimetral (3.05m)', cantidad: angulos, unidad: 'pzas', precio: costos.angulo305, total: totalAngulo },
      { nombre: 'Clavos + Fulminantes', cantidad: totalFijaciones, unidad: 'pares', precio: costos.clavoFulminante, total: totalFijacion },
      { nombre: 'Alambre Galvanizado', cantidad: kgAlambre, unidad: 'kg', precio: costos.alambre, total: totalAlambre }
    );

    return {
      area: area.toFixed(2),
      perimetro: perimetro.toFixed(2),
      materiales: materialesArray,
      totalGeneral
    };
  }, [techo, correas, secundarias, desperdicio, costos]);

  // ─── EXPORTAR PDF ───
  const exportarPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Cotización Cielo Raso Visible</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
            h2 { color: #2e7d32; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #e8f5e9; }
            .total { font-weight: bold; font-size: 18px; color: #d32f2f; text-align: right; margin-top: 20px; }
            .info { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Cotización – Cielo Raso Junta Visible</h1>
          <div class="info">
            <strong>Dimensiones:</strong> ${techo.largo}m × ${techo.ancho}m (${resultados.area} m²)<br/>
            <strong>Perímetro:</strong> ${resultados.perimetro} m<br/>
            <strong>Desperdicio aplicado:</strong> ${desperdicio}%<br/>
            <strong>Secundarias utilizadas:</strong> ${secundarias === '1.22' ? 'Perfiles de 1.22m cruzando cada 60cm' : 'Red cruzada (1.22m y 0.61m)'}<br/>
            <strong>Dirección de Correas:</strong> Paralelas al ${correas}<br/>
          </div>

          <h2>Lista de Materiales y Costos</h2>
          <table>
            <tr>
              <th>Material</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
            ${resultados.materiales.map(m => `
              <tr>
                <td>${m.nombre}</td>
                <td>${m.cantidad}</td>
                <td>${m.unidad}</td>
                <td>$${m.precio.toFixed(2)}</td>
                <td>$${m.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="total">TOTAL ESTIMADO: $${resultados.totalGeneral.toFixed(2)}</div>

          <div class="footer">
            Generado el ${new Date().toLocaleDateString()} · Calculadora Cielo Raso · Precios en USD referenciales.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Segoe UI, Arial, sans-serif', maxWidth: '1100px', margin: '0 auto', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#1a237e' }}>📐 Calculadora de Cielo Raso Visible</h2>
        <p style={{ color: '#555', margin: 0 }}>Cálculo preciso de materiales para techos desmontables (suspensión a la vista) con láminas de 0.61 x 1.22m.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* PANEL IZQUIERDO: INPUTS */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <Card title="📐 Dimensiones del Área" color="#1a237e">
            <InputRow label="Largo (m)" name="largo" value={techo.largo} onChange={handleTecho} step={0.1} />
            <InputRow label="Ancho (m)" name="ancho" value={techo.ancho} onChange={handleTecho} step={0.1} />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontWeight: 500, fontSize: '14px' }}>Desperdicio (%):</label>
              <input type="number" min="0" max="30" value={desperdicio} onChange={e => setDesperdicio(parseInt(e.target.value) || 0)} style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', textAlign: 'right', fontSize: '14px' }} />
            </div>
          </Card>

          <Card title="🏗️ Estructura" color="#00695c">
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Dirección de las Correas del Techo</label>
              <select value={correas} onChange={e => setCorreas(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="largo">Paralelas al Largo (Correas a lo largo)</option>
                <option value="ancho">Paralelas al Ancho (Correas a lo ancho)</option>
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>Las Principales (3.66m) se instalarán perpendicularmente a estas correas.</small>
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px', fontSize: '14px' }}>Tipo de Secundarias</label>
              <select value={secundarias} onChange={e => setSecundarias(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="1.22">Solo Secundarias de 1.22m (Cada 60cm)</option>
                <option value="0.61">Red Cruzada (Secundarias de 1.22m y 0.61m)</option>
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>Ambas opciones usan láminas de 0.61x1.22m.</small>
            </div>
          </Card>

          <Card title="💰 Costos Unitarios (USD)" color="#e65100">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CostInput label="Lámina (0.61x1.22)" name="lamina" value={costos.lamina} onChange={handleCosto} />
              <CostInput label="Principal 3.66m" name="principal366" value={costos.principal366} onChange={handleCosto} />
              <CostInput label="Secundaria 1.22m" name="secundaria122" value={costos.secundaria122} onChange={handleCosto} />
              {secundarias === '0.61' && <CostInput label="Secundaria 0.61m" name="secundaria061" value={costos.secundaria061} onChange={handleCosto} />}
              <CostInput label="Ángulo 3.05m" name="angulo305" value={costos.angulo305} onChange={handleCosto} />
              <CostInput label="Clavo+Fulminante" name="clavoFulminante" value={costos.clavoFulminante} onChange={handleCosto} />
              <CostInput label="Alambre (kg)" name="alambre" value={costos.alambre} onChange={handleCosto} />
            </div>
          </Card>

        </div>

        {/* PANEL DERECHO: RESULTADOS */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1b5e20' }}>📋 Resumen del Proyecto</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <StatBox label="Área Total" value={`${resultados.area} m²`} />
              <StatBox label="Perímetro" value={`${resultados.perimetro} m`} />
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#333' }}>🧾 Desglose de Costos</h3>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Material</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {resultados.materiales.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 4px' }}>{m.nombre} <br/><small style={{ color: '#888' }}>{m.cantidad} {m.unidad}</small></td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', verticalAlign: 'top' }}>${m.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#555' }}>TOTAL ESTIMADO</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>${resultados.totalGeneral.toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={exportarPDF}
            style={{
              padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#d32f2f',
              color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'background 0.2s'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#b71c1c'}
            onMouseOut={e => e.target.style.backgroundColor = '#d32f2f'}
          >
            📄 Exportar Cotización a PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── COMPONENTES AUXILIARES ───

const Card = ({ title, color, children }) => (
  <div style={{ padding: '18px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
    <h4 style={{ margin: '0 0 14px 0', color }}>{title}</h4>
    {children}
  </div>
);

const InputRow = ({ label, name, value, onChange, step = 1 }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
    <label style={{ fontWeight: 500, color: '#333', fontSize: '14px' }}>{label}</label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      step={step}
      min={0}
      style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', textAlign: 'right', fontSize: '14px' }}
    />
  </div>
);

const CostInput = ({ label, name, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '12px', color: '#555', fontWeight: 500 }}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#888', fontSize: '13px' }}>$</span>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        step={0.01}
        min={0}
        style={{ width: '70px', padding: '5px 6px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '13px', textAlign: 'right' }}
      />
    </div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{value}</div>
  </div>
);

export default CalculadoraCieloVisible;
