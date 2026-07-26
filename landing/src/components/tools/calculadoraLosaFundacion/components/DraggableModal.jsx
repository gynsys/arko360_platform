import React, { useState, useEffect, useCallback } from 'react';

export const DraggableModal = ({ children, onClose, title, width = '800px' }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="modal-overlay" style={{zIndex: 50, background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', pointerEvents: 'none'}}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{
          maxWidth: '95%', 
          width: width, 
          padding: '20px', 
          pointerEvents: 'auto',
          transform: `translate(${position.x}px, ${position.y}px)`,
          position: 'relative',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
          border: '1px solid #ccc',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div 
          onMouseDown={handleMouseDown}
          style={{display:'flex',justifyContent:'space-between', alignItems:'center', marginBottom:'16px', cursor: 'move', paddingBottom: '10px', borderBottom: '1px solid #eee', userSelect: 'none', flexShrink: 0}}
        >
            <h3 style={{margin:0, fontSize:'16px', color:'#1A6BB5'}}>{title}</h3>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} style={{background:'none', border:'none', color:'#888', fontSize:'20px', cursor:'pointer', padding:'4px', width:'auto', display:'flex', alignItems:'center', justifyContent:'center'}}>✕</button>
        </div>
        <div style={{overflowY: 'auto', flex: 1, paddingRight: '5px'}}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DraggableModal;
