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
  return (
    <div className="calc-header" style={{ width: '100%' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
          {onBack && (
            <button 
              className="btn-secondary" 
              style={{ whiteSpace: 'nowrap', padding: '4px 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}
              onClick={onBack}
            >
              &larr; Volver
            </button>
          )}
        </div>
        <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          {/* Botón Run compacto */}
          <button 
            onClick={runAnalysis} 
            disabled={loading}
            title="Ejecutar Análisis Estructural"
            style={{
              background: loading ? '#81c784' : '#4caf50',
              border: 'none', color: '#fff',
              padding: '0 14px',
              height: '32px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.5px',
              transition: 'background 0.2s'
            }}
          >
            {loading
              ? <><span style={{display:'inline-block', width:'13px', height:'13px', border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite'}} /> Run<style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style></>
              : <><FaPlay style={{fontSize:'11px'}} /> Run</>
            }
          </button>

          {/* Botón Ver Resultados */}
          {results && !error && (
            <button
              onClick={() => setShowResultsModal(true)}
              title="Ver Resultados del Análisis"
              style={{
                background: '#1A6BB5',
                border: 'none', color: '#fff',
                padding: '0 14px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap',
                animation: 'fadeInBtn 0.3s ease',
              }}
            >
              <FaChartBar style={{fontSize:'12px'}} /> Resultados
              <style>{`@keyframes fadeInBtn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}`}</style>
            </button>
          )}

          <input 
            type="text" 
            value={projectName} 
            onChange={e => setProjectName(e.target.value)} 
            placeholder="Nombre del Proyecto"
            className="project-name-input"
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', width: '160px', outline: 'none' }}
          />
          <button onClick={handleNewProject} className="toolbar-btn">
            <FaFile style={{ fontSize: '12px' }} /> Nuevo
          </button>
          <button onClick={() => { 
            if (!localStorage.getItem('arko_token') || !localStorage.getItem('arko_user')) {
              setAuthModalOpen(true);
              return;
            }
            setShowOpenModal(true); 
            fetchRuns(); 
          }} className="toolbar-btn">
            <FaFolderOpen style={{ fontSize: '12px' }} /> Abrir
          </button>
          <button onClick={handleCloseProject} className="toolbar-btn">
            <FaTimes style={{ fontSize: '12px' }} /> Cerrar
          </button>
          <button onClick={() => saveToDatabase()} className="toolbar-btn">
            <FaSave style={{ fontSize: '12px' }} /> Guardar
          </button>
          <button onClick={() => { setSaveAsName(projectName); setShowSaveAsModal(true); }} className="toolbar-btn">
            <FaSave style={{ fontSize: '12px' }} /> Guardar como
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
          
          {currentUser ? (
            <button onClick={() => {
              localStorage.removeItem('arko_token');
              localStorage.removeItem('arko_user');
              setCurrentUser(null);
              window.dispatchEvent(new Event('arko_logout'));
            }} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: 'rgba(211,47,47,0.15)', color: '#ffcdd2', border: '1px solid rgba(211,47,47,0.3)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <LogOut size={14} /> Cerrar Sesión ({currentUser.name?.split(' ')[0]})
            </button>
          ) : (
            <button onClick={() => setAuthModalOpen(true)} style={{ padding: '0 12px', height: '32px', fontSize: '13px', background: '#1A6BB5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
              <LogIn size={14} /> Iniciar Sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
