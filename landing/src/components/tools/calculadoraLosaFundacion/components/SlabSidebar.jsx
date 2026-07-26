import React from 'react';
import { FaDrawPolygon, FaCubes, FaCogs, FaBorderAll, FaColumns, FaDoorOpen } from 'react-icons/fa';

export function SlabSidebar({
  activeModal,
  setActiveModal,
  imgInputRef,
  layerImportTarget,
  setLayers,
  handleDragStart
}) {
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: '48px',
      background: '#1e2235',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '10px',
      gap: '4px',
      zIndex: 20,
      boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
    }}>
      {/* Separador */}
      <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* Botón Geometría */}
      <button
        onClick={() => setActiveModal(activeModal === 'geometry' ? null : 'geometry')}
        title="Geometría de Losa"
        style={{
          background: activeModal === 'geometry' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'geometry' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px',
          transition: 'all 0.15s'
        }}
      >
        <FaDrawPolygon />
      </button>

      {/* Botón Materiales */}
      <button
        onClick={() => setActiveModal(activeModal === 'materials' ? null : 'materials')}
        title="Materiales y Muros"
        style={{
          background: activeModal === 'materials' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'materials' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px',
          transition: 'all 0.15s'
        }}
      >
        <FaCubes />
      </button>

      {/* Botón Parámetros Diseño */}
      <button
        onClick={() => setActiveModal(activeModal === 'fem' ? null : 'fem')}
        title="Parámetros de Diseño FEM"
        style={{
          background: activeModal === 'fem' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'fem' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px',
          transition: 'all 0.15s'
        }}
      >
        <FaCogs />
      </button>

      {/* Botón Paredes */}
      <button
        onClick={() => setActiveModal(activeModal === 'walls' ? null : 'walls')}
        title="Paredes"
        style={{
          background: activeModal === 'walls' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'walls' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px',
          transition: 'all 0.15s'
        }}
      >
        <FaBorderAll />
      </button>

      {/* Botón Columnas */}
      <button
        onClick={() => setActiveModal(activeModal === 'columns' ? null : 'columns')}
        title="Columnas"
        style={{
          background: activeModal === 'columns' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'columns' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px',
          transition: 'all 0.15s'
        }}
      >
        <FaColumns />
      </button>

      {/* Botón Aberturas */}
      <button
        onClick={() => setActiveModal(activeModal === 'openings' ? null : 'openings')}
        title="Listado de Aberturas"
        style={{
          background: activeModal === 'openings' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'openings' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px',
          transition: 'all 0.15s'
        }}
      >
        <FaDoorOpen />
      </button>

      {/* Botón Capas */}
      <button
        onClick={() => setActiveModal(activeModal === 'layers' ? null : 'layers')}
        title="Capas"
        style={{
          background: activeModal === 'layers' ? '#1A6BB5' : 'transparent',
          border: 'none', borderRadius: '8px',
          color: activeModal === 'layers' ? '#fff' : 'rgba(255,255,255,0.65)',
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '18px',
          transition: 'all 0.15s'
        }}
      >
        ≡
      </button>

      {/* Separador arrastrar */}
      <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* Input oculto para importar imagen de capa */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files[0];
          if (!file || !layerImportTarget) return;
          const reader = new FileReader();
          reader.onload = ev => {
            setLayers(prev => prev.map(l =>
              l.id === layerImportTarget ? { ...l, image: ev.target.result } : l
            ));
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* Puerta Izq Adentro */}
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'door_left')}
        title="Puerta Izquierda (Adentro)"
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M4 20 L4 4" /><path d="M4 4 A16 16 0 0 1 20 20" strokeDasharray="2 3" /></svg>
      </div>

      {/* Puerta Izq Afuera */}
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'door_left_out')}
        title="Puerta Izquierda (Afuera)"
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M4 4 L4 20" /><path d="M4 20 A16 16 0 0 0 20 4" strokeDasharray="2 3" /></svg>
      </div>

      {/* Puerta Der Adentro */}
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'door_right')}
        title="Puerta Derecha (Adentro)"
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="20" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M20 20 L20 4" /><path d="M20 4 A16 16 0 0 0 4 20" strokeDasharray="2 3" /></svg>
      </div>

      {/* Puerta Der Afuera */}
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'door_right_out')}
        title="Puerta Derecha (Afuera)"
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><rect x="18" y="0" width="4" height="4" fill="rgba(255,255,255,0.65)" stroke="none" /><path d="M20 4 L20 20" /><path d="M20 20 A16 16 0 0 1 4 4" strokeDasharray="2 3" /></svg>
      </div>

      {/* Ventana */}
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, 'window')}
        title="Ventana"
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'transparent' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
      </div>
    </div>
  );
}
