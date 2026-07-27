import React from 'react';
import { FaPlay, FaChartBar, FaFile, FaFolderOpen, FaTimes, FaSave } from 'react-icons/fa';
import { LogIn, LogOut } from 'lucide-react';

export function SlabHeader({
  onBack,
  runAnalysis,
  loading,
  results,
  error,
  setShowResultsModal,
  projectName,
  setProjectName,
  handleNewProject,
  setAuthModalOpen,
  setShowOpenModal,
  fetchRuns,
  handleCloseProject,
  saveToDatabase,
  setSaveAsName,
  setShowSaveAsModal,
  currentUser,
  setCurrentUser
}) {
  const btnStyle = {
    height: '30px',
    padding: '0 10px',
    fontSize: '12.5px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxSizing: 'border-box',
    borderRadius: '5px',
    cursor: 'pointer'
  };

  return (
    <div className="calc-header" style={{ width: '100%', height: '44px', padding: '0 12px', display: 'flex', alignItems: 'center', background: '#1A6BB5', boxSizing: 'border-box', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', flexWrap: 'nowrap' }}>
        {onBack && (
          <button 
            style={{
              ...btnStyle,
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.35)'
            }}
            onClick={onBack}
          >
            &larr; Volver
          </button>
        )}

        {/* Botón Run */}
        <button 
          onClick={runAnalysis} 
          disabled={loading}
          title="Ejecutar Análisis Estructural"
          style={{
            ...btnStyle,
            background: loading ? '#81c784' : '#4caf50',
            border: 'none',
            color: '#fff',
            fontWeight: '700',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          {loading
            ? <><span style={{display:'inline-block', width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite'}} /> Run<style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style></>
            : <><FaPlay style={{fontSize:'10px'}} /> Run</>
          }
        </button>

        {/* Botón Ver Resultados */}
        {results && !error && (
          <button
            onClick={() => setShowResultsModal(true)}
            title="Ver Resultados del Análisis"
            style={{
              ...btnStyle,
              background: '#0288d1',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            <FaChartBar style={{fontSize:'11px'}} /> Resultados
          </button>
        )}

        <input 
          type="text" 
          value={projectName} 
          onChange={e => setProjectName(e.target.value)} 
          placeholder="Nombre del Proyecto"
          className="project-name-input"
          style={{
            height: '30px',
            padding: '0 10px',
            borderRadius: '5px',
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '12.5px',
            width: '160px',
            outline: 'none',
            boxSizing: 'border-box',
            flexShrink: 0
          }}
        />

        <button onClick={handleNewProject} className="toolbar-btn" style={btnStyle}>
          <FaFile style={{ fontSize: '11px' }} /> Nuevo
        </button>
        
        <button onClick={() => { 
          if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
            setAuthModalOpen(true);
            return;
          }
          setShowOpenModal(true); 
          fetchRuns(); 
        }} className="toolbar-btn" style={btnStyle}>
          <FaFolderOpen style={{ fontSize: '11px' }} /> Abrir
        </button>
        
        <button onClick={handleCloseProject} className="toolbar-btn" style={btnStyle}>
          <FaTimes style={{ fontSize: '11px' }} /> Cerrar
        </button>
        
        <button onClick={() => saveToDatabase()} className="toolbar-btn" style={btnStyle}>
          <FaSave style={{ fontSize: '11px' }} /> Guardar
        </button>
        
        <button onClick={() => { setSaveAsName(projectName); setShowSaveAsModal(true); }} className="toolbar-btn" style={btnStyle}>
          <FaSave style={{ fontSize: '11px' }} /> Guardar como
        </button>
        
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.25)', margin: '0 4px', flexShrink: 0 }} />
        
        {currentUser ? (
          <button onClick={() => {
            localStorage.removeItem('arko_token');
            localStorage.removeItem('arko_user');
            setCurrentUser(null);
            window.dispatchEvent(new Event('arko_logout'));
          }} style={{
            ...btnStyle,
            background: 'rgba(211,47,47,0.2)',
            color: '#ffcdd2',
            border: '1px solid rgba(211,47,47,0.4)',
            marginLeft: 'auto'
          }}>
            <LogOut size={13} /> Cerrar Sesión ({currentUser.name?.split(' ')[0]})
          </button>
        ) : (
          <button onClick={() => setAuthModalOpen(true)} style={{
            ...btnStyle,
            background: '#0d47a1',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            marginLeft: 'auto'
          }}>
            <LogIn size={13} /> Iniciar Sesión
          </button>
        )}
      </div>
    </div>
  );
}
