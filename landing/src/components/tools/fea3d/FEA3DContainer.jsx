import React, { useState, useRef } from 'react';
import { Settings, Play, Building2, Save, FolderOpen, Plus, MousePointer2, Layers } from 'lucide-react';
import { StructureCanvas } from './StructureCanvas';
import { PropertyPanel } from './PropertyPanel';
import { TemplateWizard } from './TemplateWizard';
import { ShellPanel } from './ShellPanel';
import { LoadCombosModal } from './LoadCombosModal';
import { ResultsPanel } from './ResultsPanel';
import { ElementResultsModal } from './ElementResultsModal';
import { DefineMaterialsModal } from './DefineMaterialsModal';
import { DefineSectionsModal } from './DefineSectionsModal';
import { ResultsTableModal } from './ResultsTableModal';
import { useStructureStore } from './useStructureStore';
import { useSolver } from './useSolver';
import { Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FEA3DContainer() {
  const [wizardOpen, setWizardOpen] = useState(true);
  const [shellPanelOpen, setShellPanelOpen] = useState(false);
  const [combosModalOpen, setCombosModalOpen] = useState(false);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [sectionsModalOpen, setSectionsModalOpen] = useState(false);
  const [tablesModalOpen, setTablesModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const { 
    wizardConfig, elements, shells, metadata, setMetadata,
    exportProject, importProject, isDrawingShell, toggleDrawingShell, drawingNodes,
    viewMode, setResultsMode
  } = useStructureStore();

  const hasModel = wizardConfig !== null;
  const isResultsMode = viewMode === 'results';
  const totalElements = elements.length + shells.length;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => importProject(ev.target.result);
      reader.readAsText(file);
    }
  };

  const { solveMutation } = useSolver('project-001');
  const [isSolving, setIsSolving] = useState(false);

  const handleRunAnalysis = async () => {
    setIsSolving(true);
    try {
      const state = useStructureStore.getState();
      
      const mappedMaterials = state.materials.map(m => ({
        id: m.id,
        E: m.E,
        G: m.G,
        nu: m.u !== undefined ? m.u : 0.2,
        density: m.mass !== undefined ? m.mass : (m.density || 2.4)
      }));

      const mappedSections = state.sections.map(s => ({
        id: s.id,
        A: s.A,
        Ix: s.I3 !== undefined ? s.I3 : s.Ix,
        Iy: s.I2 !== undefined ? s.I2 : s.Iy,
        J: s.J,
        params: { b: s.b || 0, h: s.h || 0 }
      }));

      const payload = {
        nodes: state.nodes,
        elements: state.elements,
        shells: state.shells,
        materials: mappedMaterials,
        sections: mappedSections,
        loads: state.loads || [],
        combinations: state.loadCombinations || []
      };
      
      const res = await solveMutation.mutateAsync(payload);
      if (res && res.data) {
        setResultsMode(res.data);
        toast.success('Análisis estructural completado con éxito.');
      } else {
        toast.error('Error al interpretar los resultados.');
      }
    } catch (err) {
      console.error('[ARKO3D] Error en el solver:', err);
      toast.error('Error de conexión con el motor de cálculo en el servidor.');
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] mt-[80px] overflow-hidden bg-slate-900 font-sans">
      
      {/* ── Toolbar Superior ── */}
      <div className="flex items-center gap-3 px-4 h-14 min-h-[56px] bg-slate-800 border-b border-slate-700 z-50">
        
        {/* Archivo */}
        <div className="flex items-center gap-1 border-r border-slate-700 pr-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="Abrir Proyecto (.arko3d)"
          >
            <FolderOpen size={18} />
          </button>
          <button 
            onClick={exportProject}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="Descargar Copia Local"
          >
            <Save size={18} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".arko3d,.json" />
        </div>

        {/* Geometría */}
        <button
          onClick={() => setWizardOpen(true)}
          disabled={isResultsMode}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${
            isResultsMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
          }`}
        >
          <Settings size={14} />
          GEOMETRÍA
        </button>

        {/* Dibujo de Losas (click en canvas) */}
        <button
          onClick={toggleDrawingShell}
          disabled={isResultsMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isResultsMode ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
            isDrawingShell 
            ? 'bg-orange-600 text-white animate-pulse' 
            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {isDrawingShell ? <MousePointer2 size={14} /> : <Plus size={14} />}
          {isDrawingShell ? `SELECCIONE NUDOS (${drawingNodes.length}/4)` : 'DIBUJAR LOSA'}
        </button>

        {/* Losa por formulario */}
        <button
          onClick={() => setShellPanelOpen(true)}
          disabled={isResultsMode}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${
            isResultsMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-indigo-900/60 border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/60'
          }`}
          title="Definir losa por formulario"
        >
          <Layers size={14} />
          + LOSA
        </button>

        {/* Combinaciones */}
        <button
          onClick={() => setCombosModalOpen(true)}
          disabled={isResultsMode}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ml-2 ${
            isResultsMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
          }`}
          title="Gestionar Combinaciones de Carga"
        >
          <Calculator size={14} />
          COMBINACIONES
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-slate-700 mx-1"></div>

        {/* Define Materials & Sections */}
        <button
          onClick={() => setMaterialsModalOpen(true)}
          disabled={isResultsMode}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${
            isResultsMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
          }`}
          title="Definir Materiales"
        >
          MATERIALES
        </button>
        <button
          onClick={() => setSectionsModalOpen(true)}
          disabled={isResultsMode}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${
            isResultsMode ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
          }`}
          title="Definir Secciones"
        >
          SECCIONES
        </button>

        {isResultsMode && (
          <button
            onClick={() => setTablesModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-indigo-500 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold text-white transition-all ml-2"
            title="Ver Tablas de Resultados"
          >
            TABLAS
          </button>
        )}

        <div className="flex-1" />

        {/* Metadata & Status */}
        <div className="flex flex-col items-end px-4">
          <input 
            value={metadata.name}
            onChange={(e) => setMetadata({ name: e.target.value })}
            className="bg-transparent text-white text-sm font-bold text-right outline-none focus:border-b border-blue-500"
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              {totalElements} Elementos
            </span>
            <select
              value={metadata.units || 'm, kN, C'}
              onChange={(e) => setMetadata({ units: e.target.value })}
              className="bg-slate-800 text-slate-300 text-[9px] uppercase font-bold outline-none border border-slate-600 rounded px-1 py-0.5 cursor-pointer"
            >
              <option value="m, kN, C">m, kN, C</option>
              <option value="mm, N, C">mm, N, C</option>
              <option value="m, kgf, C">m, kgf, C</option>
              <option value="m, tonf, C">m, tonf, C</option>
              <option value="ft, kip, F">ft, kip, F</option>
              <option value="in, lb, F">in, lb, F</option>
            </select>
          </div>
        </div>

        {/* Acción Principal */}
        <button
          onClick={handleRunAnalysis}
          disabled={isSolving || totalElements === 0 || isResultsMode}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 ${
            isSolving || isResultsMode
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
          }`}
        >
          <Play size={14} fill="currentColor" className={isSolving ? 'animate-spin' : ''} />
          {isSolving ? 'CALCULANDO...' : 'CALCULAR'}
        </button>
      </div>

      {/* ── Área de Trabajo ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {isDrawingShell && !isResultsMode && (
            <div className="absolute top-4 left-4 z-10 bg-orange-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-orange-400">
              MODO DIBUJO: Seleccione 4 nudos para crear la losa
            </div>
          )}
          <ResultsPanel />
          <StructureCanvas />
          <ElementResultsModal />
        </div>

        <div className="w-[340px] border-l border-slate-800 shadow-2xl z-20 bg-slate-900">
          <PropertyPanel />
        </div>
      </div>

      <TemplateWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
      <ShellPanel isOpen={shellPanelOpen} onClose={() => setShellPanelOpen(false)} />
      <LoadCombosModal isOpen={combosModalOpen} onClose={() => setCombosModalOpen(false)} />
      {materialsModalOpen && <DefineMaterialsModal onClose={() => setMaterialsModalOpen(false)} />}
      {sectionsModalOpen && <DefineSectionsModal onClose={() => setSectionsModalOpen(false)} />}
      {tablesModalOpen && <ResultsTableModal onClose={() => setTablesModalOpen(false)} />}
    </div>
  );
}