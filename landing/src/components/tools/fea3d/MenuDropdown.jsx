import React, { useState, useRef, useEffect } from 'react';

export function MenuDropdown({ title, items }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
          isOpen ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        {title}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-600 rounded-md shadow-xl z-50 py-1">
          {items.map((item, idx) => {
            if (item.separator) {
              return <div key={`sep-${idx}`} className="h-px bg-slate-700 my-1"></div>;
            }
            return (
              <button
                key={idx}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  item.disabled 
                    ? 'text-slate-500 cursor-not-allowed' 
                    : 'text-slate-200 hover:bg-blue-600 hover:text-white'
                }`}
              >
                {item.icon && <item.icon size={14} className={item.disabled ? 'opacity-50' : ''} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
