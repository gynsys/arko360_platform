import React from 'react';
import { StructureCanvas } from './StructureCanvas';
import { PropertyPanel } from './PropertyPanel';

export default function FEA3DContainer() {
  return (
    <div className="flex h-[calc(100vh-80px)] mt-[80px] overflow-hidden bg-slate-900">
      <div className="flex-1 relative">
        <StructureCanvas />
      </div>
      <div className="w-80 border-l border-slate-700">
        <PropertyPanel />
      </div>
    </div>
  );
}
