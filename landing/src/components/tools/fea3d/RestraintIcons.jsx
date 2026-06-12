import React from 'react';

export const FixedIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Base horizontal */}
    <line x1="4" y1="18" x2="20" y2="18" strokeWidth="2" />
    {/* Hatches */}
    <line x1="6" y1="18" x2="4" y2="22" />
    <line x1="10" y1="18" x2="8" y2="22" />
    <line x1="14" y1="18" x2="12" y2="22" />
    <line x1="18" y1="18" x2="16" y2="22" />
    <line x1="22" y1="18" x2="20" y2="22" />
    {/* Vertical column */}
    <line x1="12" y1="18" x2="12" y2="4" strokeWidth="2" className="text-blue-500" />
  </svg>
);

export const PinnedIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Base horizontal */}
    <line x1="4" y1="18" x2="20" y2="18" strokeWidth="2" />
    {/* Hatches */}
    <line x1="6" y1="18" x2="4" y2="22" />
    <line x1="10" y1="18" x2="8" y2="22" />
    <line x1="14" y1="18" x2="12" y2="22" />
    <line x1="18" y1="18" x2="16" y2="22" />
    <line x1="22" y1="18" x2="20" y2="22" />
    {/* Triangle */}
    <polygon points="12,6 6,18 18,18" fill="currentColor" className="text-blue-500" strokeWidth="0" />
    <polygon points="12,6 6,18 18,18" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export const RollerIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Base horizontal */}
    <line x1="4" y1="21" x2="20" y2="21" strokeWidth="2" />
    {/* Roller */}
    <circle cx="12" cy="18" r="2.5" fill="currentColor" className="text-slate-800" strokeWidth="0" />
    {/* Triangle */}
    <polygon points="12,4 6,15.5 18,15.5" fill="currentColor" className="text-blue-500" strokeWidth="0" />
    <polygon points="12,4 6,15.5 18,15.5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export const FreeIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" fill="currentColor" strokeWidth="0" className="text-slate-500" />
  </svg>
);
