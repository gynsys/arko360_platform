import React, { useState, useEffect } from 'react';
import { calculadoraService } from '../../../services/calculadoraService';

const HistorialCorridas = ({ onCargarCorrida, onClose }) => {
  const [corridas, setCorridas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const data = await calculadoraService.obtenerHistorial();
      setCorridas(data);
    } catch (error) {
      console.error(error);
      alert('Error al cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  const eliminarCorrida = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta corrida?')) return;
    try {
      await calculadoraService.eliminarCorrida(id);
      cargarHistorial();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000
    },
    panel: {
      width: '400px',
      backgroundColor: '#fff',
      height: '100%',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #eee',
      paddingBottom: '15px',
      marginBottom: '15px'
    },
    title: { margin: 0, color: '#2c3e50', fontSize: '18px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' },
    list: { flex: 1, overflowY: 'auto' },
    card: {
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: '#f8f9fa'
    },
    cardHover: { backgroundColor: '#e9ecef', borderColor: '#cbd3da' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
    cardTitle: { fontWeight: 'bold', fontSize: '14px', color: '#2c3e50', margin: 0 },
    cardDate: { fontSize: '12px', color: '#95a5a6' },
    badge: {
      display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
      backgroundColor: '#e3f2fd', color: '#1976d2', marginTop: '6px'
    },
    deleteBtn: {
      background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '12px', padding: 0
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Historial de Corridas</h2>
          <button style={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        
        <div style={styles.list}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Cargando...</p>
          ) : corridas.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#7f8c8d' }}>No hay corridas guardadas.</p>
          ) : (
            corridas.map(run => (
              <div 
                key={run.id} 
                style={styles.card}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = styles.cardHover.backgroundColor; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = styles.card.backgroundColor; }}
                onClick={() => onCargarCorrida(run)}
              >
                <div style={styles.cardHeader}>
                  <p style={styles.cardTitle}>{run.nombre_proyecto}</p>
                  <button style={styles.deleteBtn} onClick={(e) => eliminarCorrida(run.id, e)}>🗑️</button>
                </div>
                <div style={styles.cardDate}>{new Date(run.created_at).toLocaleString()}</div>
                <div style={styles.badge}>{run.tipo_losa.toUpperCase()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialCorridas;
