import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SiteConfigContext } from '../../App.jsx';

export default function BudgetCalculatorModal({ promo, onClose }) {
  const config = useContext(SiteConfigContext);
  const [largo, setLargo] = useState(4);
  const [ancho, setAncho] = useState(3);
  const [puertas, setPuertas] = useState(0.9); // Ancho típico de una puerta
  const [m2Manual, setM2Manual] = useState(10); // Para casos donde solo se pide m2 directo
  
  const [unlocked, setUnlocked] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', contact_info: '' });
  
  // Default unit prices
  const [prices, setPrices] = useState({
    material_principal: 15,
    material_secundario: 5,
    rodapie: 8,
    mano_obra: 12
  });

  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mat = [];
    let matCost = 0;
    let moCost = 0;

    const isPerimeterMode = promo.id === 'porcelanato' || promo.id === 'vinil';
    const currentM2 = isPerimeterMode ? (largo * ancho) : m2Manual;
    const perimetro = isPerimeterMode ? Math.max(0, ((largo + ancho) * 2) - puertas) : 0;

    if (promo.id === 'porcelanato') {
      const boxes = Math.ceil((currentM2 * 1.1) / 1.44); // 10% waste, 1.44m2 per box
      const pego = Math.ceil(currentM2 / 3); // 1 bag per 3m2
      const rodapieLineal = Math.ceil(perimetro * 1.05); // 5% desperdicio rodapie
      
      mat.push({ name: 'Cajas de Porcelanato', qty: boxes, unitPrice: prices.material_principal, key: 'material_principal' });
      mat.push({ name: 'Sacos de Pego', qty: pego, unitPrice: prices.material_secundario, key: 'material_secundario' });
      mat.push({ name: 'Rodapié (ml)', qty: rodapieLineal, unitPrice: prices.rodapie, key: 'rodapie' });
      
      matCost = (boxes * prices.material_principal) + (pego * prices.material_secundario) + (rodapieLineal * prices.rodapie);
      moCost = currentM2 * prices.mano_obra;
    } else if (promo.id === 'bano') {
      mat.push({ name: 'Kit Remodelación Baño', qty: 1, unitPrice: prices.material_principal * currentM2, key: 'material_principal' });
      matCost = 1 * (prices.material_principal * currentM2);
      moCost = currentM2 * prices.mano_obra;
    } else if (promo.id === 'vinil') {
      const boxes = Math.ceil((currentM2 * 1.05) / 2.2); // 5% waste, 2.2m2 per box
      const rodapieLineal = Math.ceil(perimetro * 1.05);
      mat.push({ name: 'Cajas Vinil SPC', qty: boxes, unitPrice: prices.material_principal, key: 'material_principal' });
      mat.push({ name: 'Rodapié (ml)', qty: rodapieLineal, unitPrice: prices.rodapie, key: 'rodapie' });
      matCost = (boxes * prices.material_principal) + (rodapieLineal * prices.rodapie);
      moCost = currentM2 * prices.mano_obra;
    }

    setMaterials(mat);
    setTotal(matCost + moCost);
  }, [largo, ancho, puertas, m2Manual, prices, promo.id]);

  const handlePriceClick = () => {
    if (!unlocked) {
      setShowLeadForm(true);
    }
  };

  const handlePriceChange = (key, value) => {
    if (unlocked) {
      setPrices(prev => ({ ...prev, [key]: Number(value) }));
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadData.name || !leadData.contact_info) {
      toast.error('Por favor completa los datos.');
      return;
    }
    
    // Simulate API call for now or call real endpoint
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.arko360.net/api/v1'}/leads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadData.name,
          contact_info: leadData.contact_info,
          source: `calculadora_${promo.id}`
        })
      });
      
      if (res.ok) {
        toast.success('¡Precios desbloqueados!');
        setUnlocked(true);
        setShowLeadForm(false);
      } else {
        toast.error('Error al registrar. Intenta de nuevo.');
      }
    } catch (err) {
      // Unlocking anyway for offline testing if needed
      toast.success('¡Precios desbloqueados!');
      setUnlocked(true);
      setShowLeadForm(false);
    }
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Presupuesto: ${promo.title}`, 14, 22);
    doc.setFontSize(12);
    
    const isPerimeterMode = promo.id === 'porcelanato' || promo.id === 'vinil';
    const currentM2 = isPerimeterMode ? (largo * ancho) : m2Manual;
    
    doc.text(`Área Total: ${currentM2.toFixed(2)} m2`, 14, 32);
    
    const tableData = materials.map(m => [
      m.name,
      m.qty,
      `$${Number(m.unitPrice).toFixed(2)}`,
      `$${(m.qty * m.unitPrice).toFixed(2)}`
    ]);
    
    // Add Mano de Obra
    tableData.push([
      'Mano de Obra (por m2)',
      currentM2.toFixed(2),
      `$${Number(prices.mano_obra).toFixed(2)}`,
      `$${(currentM2 * prices.mano_obra).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Item', 'Cantidad', 'Precio Unitario', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Estimado: $${total.toFixed(2)}`, 14, finalY + 15);
    
    doc.save(`Presupuesto_${promo.id}.pdf`);
  };

  const handleWhatsApp = () => {
    const isPerimeterMode = promo.id === 'porcelanato' || promo.id === 'vinil';
    const currentM2 = isPerimeterMode ? (largo * ancho) : m2Manual;
    const phone = config?.phone || '1234567890'; // Config phone or fallback
    
    const message = `Hola, quisiera solicitar más información sobre el presupuesto estimado que realicé (${currentM2.toFixed(2)} m2) para el servicio de: ${promo.title}.`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', 
        width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: '32px'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
        >
          &times;
        </button>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
          Calculadora: {promo.title}
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Ajusta los metros y obtén un estimado de materiales y mano de obra.
        </p>

        { (promo.id === 'porcelanato' || promo.id === 'vinil') ? (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 calc(33% - 16px)', minWidth: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Largo (m)</label>
              <input 
                type="number" value={largo} onChange={(e) => setLargo(Number(e.target.value))}
                className="input" min="0.1" step="0.1"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
              />
            </div>
            <div style={{ flex: '1 1 calc(33% - 16px)', minWidth: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Ancho (m)</label>
              <input 
                type="number" value={ancho} onChange={(e) => setAncho(Number(e.target.value))}
                className="input" min="0.1" step="0.1"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
              />
            </div>
            <div style={{ flex: '1 1 calc(33% - 16px)', minWidth: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Puertas (m lineales)</label>
              <input 
                type="number" value={puertas} onChange={(e) => setPuertas(Number(e.target.value))}
                className="input" min="0" step="0.1"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
              />
            </div>
            <div style={{ width: '100%', marginTop: '8px', color: '#64748b', fontSize: '0.9rem' }}>
              Área total: <strong>{(largo * ancho).toFixed(2)} m²</strong> | Perímetro (sin puertas): <strong>{Math.max(0, ((largo + ancho) * 2) - puertas).toFixed(2)} m</strong>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Área (m²)</label>
            <input 
              type="number" 
              value={m2Manual} 
              onChange={(e) => setM2Manual(Number(e.target.value))}
              className="input"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
              min="1"
            />
          </div>
        )}

        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#334155' }}>Desglose Estimado</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem' }}>
            <span style={{ width: '50%' }}>Item</span>
            <span style={{ width: '20%', textAlign: 'center' }}>Cant.</span>
            <span style={{ width: '30%', textAlign: 'right' }}>Precio Unit.</span>
          </div>

          {materials.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
              <span style={{ width: '50%', color: '#0f172a' }}>{m.name}</span>
              <span style={{ width: '20%', textAlign: 'center', color: '#0f172a' }}>{m.qty}</span>
              <div style={{ width: '30%', textAlign: 'right', position: 'relative' }}>
                {!unlocked && <span style={{ position: 'absolute', left: '-15px', top: '5px', fontSize: '0.8rem' }}>🔒</span>}
                <input 
                  type="number" 
                  value={m.unitPrice} 
                  onChange={(e) => handlePriceChange(m.key, e.target.value)}
                  onClick={handlePriceClick}
                  readOnly={!unlocked}
                  style={{ 
                    width: '100%', padding: '6px', textAlign: 'right', 
                    border: unlocked ? '1px solid #3b82f6' : '1px solid transparent', 
                    backgroundColor: unlocked ? 'white' : 'transparent',
                    cursor: unlocked ? 'text' : 'pointer',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <span style={{ width: '50%', color: '#0f172a' }}>Mano de Obra (por m²)</span>
            <span style={{ width: '20%', textAlign: 'center', color: '#0f172a' }}>{ (promo.id === 'porcelanato' || promo.id === 'vinil') ? (largo * ancho).toFixed(2) : m2Manual }</span>
            <div style={{ width: '30%', textAlign: 'right', position: 'relative' }}>
                {!unlocked && <span style={{ position: 'absolute', left: '-15px', top: '5px', fontSize: '0.8rem' }}>🔒</span>}
                <input 
                  type="number" 
                  value={prices.mano_obra} 
                  onChange={(e) => handlePriceChange('mano_obra', e.target.value)}
                  onClick={handlePriceClick}
                  readOnly={!unlocked}
                  style={{ 
                    width: '100%', padding: '6px', textAlign: 'right', 
                    border: unlocked ? '1px solid #3b82f6' : '1px solid transparent', 
                    backgroundColor: unlocked ? 'white' : 'transparent',
                    cursor: unlocked ? 'text' : 'pointer',
                    borderRadius: '4px'
                  }}
                />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #cbd5e1', fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }}>
            <span>Total Estimado:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button 
            onClick={handleGeneratePDF}
            style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#0f172a', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Descargar PDF
          </button>
          
          <button 
            onClick={handleWhatsApp}
            style={{ flex: 1, padding: '14px', background: '#25D366', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Consultar por WhatsApp
          </button>
        </div>

        {showLeadForm && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '32px', textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#0f172a' }}>
              Desbloquea los Precios 🔒
            </h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Para personalizar este presupuesto con tus propios costos, por favor ingresa tus datos.
            </p>
            <form onSubmit={handleLeadSubmit} style={{ width: '100%', maxWidth: '300px' }}>
              <input 
                type="text" 
                placeholder="Tu Nombre" 
                value={leadData.name}
                onChange={e => setLeadData({...leadData, name: e.target.value})}
                style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                required
              />
              <input 
                type="text" 
                placeholder="Tu WhatsApp o Correo" 
                value={leadData.contact_info}
                onChange={e => setLeadData({...leadData, contact_info: e.target.value})}
                style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                required
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowLeadForm(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary, #3b82f6)', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
