import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function BudgetCalculatorModal({ promo, onClose }) {
  const [m2, setM2] = useState(10);
  const [unlocked, setUnlocked] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', contact_info: '' });
  
  // Default unit prices
  const [prices, setPrices] = useState({
    material_principal: 15,
    material_secundario: 5,
    mano_obra: 12
  });

  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Basic math based on promo
    let mat = [];
    let matCost = 0;
    let moCost = 0;

    if (promo.id === 'porcelanato') {
      const boxes = Math.ceil((m2 * 1.1) / 1.44); // 10% waste, 1.44m2 per box
      const pego = Math.ceil(m2 / 3); // 1 bag per 3m2
      
      mat.push({ name: 'Cajas de Porcelanato', qty: boxes, unitPrice: prices.material_principal, key: 'material_principal' });
      mat.push({ name: 'Sacos de Pego', qty: pego, unitPrice: prices.material_secundario, key: 'material_secundario' });
      
      matCost = (boxes * prices.material_principal) + (pego * prices.material_secundario);
      moCost = m2 * prices.mano_obra;
    } else if (promo.id === 'bano') {
      mat.push({ name: 'Kit Remodelación Baño', qty: 1, unitPrice: prices.material_principal * m2, key: 'material_principal' });
      matCost = 1 * (prices.material_principal * m2);
      moCost = m2 * prices.mano_obra;
    } else if (promo.id === 'vinil') {
      const boxes = Math.ceil((m2 * 1.05) / 2.2); // 5% waste, 2.2m2 per box
      mat.push({ name: 'Cajas Vinil SPC', qty: boxes, unitPrice: prices.material_principal, key: 'material_principal' });
      matCost = boxes * prices.material_principal;
      moCost = m2 * prices.mano_obra;
    }

    setMaterials(mat);
    setTotal(matCost + moCost);
  }, [m2, prices, promo.id]);

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

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Área (m²)</label>
          <input 
            type="number" 
            value={m2} 
            onChange={(e) => setM2(Number(e.target.value))}
            className="input"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem' }}
            min="1"
          />
        </div>

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
            <span style={{ width: '20%', textAlign: 'center', color: '#0f172a' }}>{m2}</span>
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
