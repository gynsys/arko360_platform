import React, { useState } from 'react';
import BudgetCalculatorModal from '../../components/budget/BudgetCalculatorModal.jsx';

const promos = [
  {
    id: 'porcelanato',
    title: 'Instalación de Porcelanato',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Formatos grandes y estándar. Incluye nivelación y acabados de primera.',
    basePrice: 'Desde $15 / m²'
  },
  {
    id: 'bano',
    title: 'Remodelación de Baño',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Renovación completa: plomería, revestimientos y piezas sanitarias.',
    basePrice: 'Cotización por m²'
  },
  {
    id: 'vinil',
    title: 'Pisos de Vinil SPC',
    image: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    description: 'Instalación rápida, resistente al agua y alto tráfico.',
    basePrice: 'Desde $12 / m²'
  }
];

export default function Promotions() {
  const [selectedPromo, setSelectedPromo] = useState(null);

  return (
    <section className="section bg-slate-50" id="promociones">
      <div className="container">
        <div className="text-center" style={{ marginBottom: 48 }}>
          <div className="section-tag">Cotizador Interactivo</div>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            Calcula tu <span>Presupuesto</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Selecciona el tipo de trabajo que deseas realizar y obtén un estimado al instante.
          </p>
        </div>

        <div className="grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '32px' 
        }}>
          {promos.map(promo => (
            <div key={promo.id} className="card" style={{ 
              backgroundColor: 'white', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}>
              <div style={{ height: '200px', width: '100%', overflow: 'hidden' }}>
                <img 
                  src={promo.image} 
                  alt={promo.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                />
              </div>
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
                  {promo.title}
                </h3>
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '0.95rem' }}>
                  {promo.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{promo.basePrice}</span>
                  <button 
                    onClick={() => setSelectedPromo(promo)}
                    className="btn btn-primary" 
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    Calcular
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPromo && (
        <BudgetCalculatorModal 
          promo={selectedPromo} 
          onClose={() => setSelectedPromo(null)} 
        />
      )}
    </section>
  );
}
