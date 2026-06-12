import React, { useState, useRef } from 'react';
import { Settings, Play, Building2, Save, FolderOpen, Plus, MousePointer2, Layers, Grid, ArrowDownToLine, Calculator, ChevronRight, ChevronLeft, LogIn, Cloud } from 'lucide-react';
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
import { SelectElementsModal } from './SelectElementsModal';
import { AssignSectionModal } from './AssignSectionModal';
import { AssignLoadsModal } from './AssignLoadsModal';
import { AssignFrameLoadsModal } from './AssignFrameLoadsModal';
import { AssignRestraintsModal } from './AssignRestraintsModal';
import { ViewControls } from './ViewControls';
import { useStructureStore } from './useStructureStore';
import { useSolver } from './useSolver';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { MenuDropdown } from './MenuDropdown';
import { AuthModal } from './AuthModal';
import { ProjectsDashboardModal } from './ProjectsDashboardModal';
import { createProject, updateProject, loadTokenFromStorage } from './api';

export default function FEA3DContainer() {
  const [wizardOpen, setWizardOpen] = useState(true);
  const [shellPanelOpen, setShellPanelOpen] = useState(false);
  const [combosModalOpen, setCombosModalOpen] = useState(false);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [sectionsModalOpen, setSectionsModalOpen] = useState(false);
  const [tablesModalOpen, setTablesModalOpen] = useState(false);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignLoadsModalOpen, setAssignLoadsModalOpen] = useState(false);
  const [assignFrameLoadsModalOpen, setAssignFrameLoadsModalOpen] = useState(false);
  const [assignRestraintsModalOpen, setAssignRestraintsModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState(null); // ID en base de datos
  
  const fileInputRef = useRef(null);

  const { 
    wizardConfig, elements, shells, metadata, setMetadata,
    exportProject, importProject, isDrawingShell, toggleDrawingShell, drawingNodes,
    viewMode, activeResultType, setResultsMode,
    isSaved, currentUser, setCurrentUser, showLoads, toggleShowLoads,
    selectionBox
  } = useStructureStore();

  useEffect(() => {
    // Intentar cargar token de sesión al iniciar
    loadTokenFromStorage();
    // En un app real, harías fetch del /me para obtener el usuario.
    // Por ahora confiaremos en que el token está si loadTokenFromStorage no lanza error (simplificado).
  }, []);

  // Prevenir cierre de pestaña si hay cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (elements.length > 0 && !isSaved) {
        e.preventDefault();
        e.returnValue = ''; // Requerido por navegadores modernos para mostrar el prompt
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [elements.length, isSaved]);

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

  const handleSaveToCloud = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    
    const projectData = {
      name: metadata.name || 'Sin Título',
      topology: {
        nodes: useStructureStore.getState().nodes,
        elements: useStructureStore.getState().elements,
        shells: useStructureStore.getState().shells,
        materials: useStructureStore.getState().materials,
        sections: useStructureStore.getState().sections,
        loads: useStructureStore.getState().loads,
        combinations: useStructureStore.getState().loadCombinations,
      },
      results: useStructureStore.getState().results
    };

    try {
      if (currentProjectId) {
        await updateProject(currentProjectId, projectData);
        toast.success("Proyecto actualizado en la nube");
      } else {
        const res = await createProject(projectData);
        setCurrentProjectId(res.id);
        toast.success("Proyecto guardado en la nube");
      }
      useStructureStore.setState({ isSaved: true });
    } catch (err) {
      toast.error("Error al guardar en la nube");
    }
  };

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
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 font-sans">
      
      {/* ── Toolbar Superior ── */}
      <div className="flex items-center justify-between px-4 h-14 min-h-[56px] bg-slate-800 border-b border-slate-700 z-50">
        
        <div className="flex items-center gap-1">
          <MenuDropdown title="File" items={[
            { label: 'Nuevo Proyecto', icon: Plus, onClick: () => setWizardOpen(true), disabled: isResultsMode },
            { label: 'Editar Geometría', icon: Grid, onClick: () => setWizardOpen(true), disabled: isResultsMode },
            { separator: true },
            { label: 'Abrir de la Nube', icon: Cloud, onClick: () => {
                if (!currentUser) setAuthModalOpen(true);
                else setProjectsModalOpen(true);
              } 
            },
            { label: 'Guardar en la Nube', icon: Save, onClick: handleSaveToCloud },
            { separator: true },
            { label: 'Abrir Local (.arko3d)', icon: FolderOpen, onClick: () => fileInputRef.current?.click() },
            { label: 'Guardar Copia Local', icon: Save, onClick: exportProject }
          ]} />

          <MenuDropdown title="Define" items={[
            { label: 'Materiales', icon: Settings, onClick: () => setMaterialsModalOpen(true), disabled: isResultsMode },
            { label: 'Secciones', icon: Settings, onClick: () => setSectionsModalOpen(true), disabled: isResultsMode },
            { label: 'Combinaciones de Carga', icon: Calculator, onClick: () => setCombosModalOpen(true), disabled: isResultsMode }
          ]} />

          <MenuDropdown title="Draw" items={[
            { label: isDrawingShell ? `Seleccione Nudos (${drawingNodes.length}/4)` : 'Dibujar Losa', icon: MousePointer2, onClick: toggleDrawingShell, disabled: isResultsMode },
            { label: 'Losa (Formulario)', icon: Layers, onClick: () => setShellPanelOpen(true), disabled: isResultsMode }
          ]} />

          <MenuDropdown title="Assign" items={[
            { label: 'Seleccionar (Select)', icon: MousePointer2, onClick: () => setSelectModalOpen(true), disabled: isResultsMode },
            { label: 'Asignar Secciones (Frame)', icon: Settings, onClick: () => setAssignModalOpen(true), disabled: isResultsMode },
            { separator: true },
            { label: 'Restricciones / Apoyos', icon: Settings, onClick: () => setAssignRestraintsModalOpen(true), disabled: isResultsMode },
            { label: 'Cargas en Nudos (Joint)', icon: ArrowDownToLine, onClick: () => setAssignLoadsModalOpen(true), disabled: isResultsMode },
            { label: 'Cargas en Vigas (Frame)', icon: ArrowDownToLine, onClick: () => setAssignFrameLoadsModalOpen(true), disabled: isResultsMode }
          ]} />

          <MenuDropdown title="Analyze" items={[
            { label: 'Ejecutar Análisis', icon: Play, onClick: handleRunAnalysis, disabled: isResultsMode || totalElements === 0 }
          ]} />

          <MenuDropdown title="Display" items={[
            { label: showLoads ? 'Ocultar Cargas' : 'Mostrar Cargas', icon: Settings, onClick: toggleShowLoads, disabled: isResultsMode },
            { label: 'Tablas de Resultados', icon: Settings, onClick: () => setTablesModalOpen(true), disabled: !isResultsMode }
          ]} />
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".arko3d,.json" />
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30">
                {currentUser.name}
              </span>
            </div>
          ) : (
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <LogIn size={14} />
              Iniciar Sesión
            </button>
          )}
          
          <button
            onClick={handleRunAnalysis}
            disabled={isSolving || totalElements === 0}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-all ${
              isSolving || totalElements === 0 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                : isResultsMode 
                  ? 'bg-orange-600 hover:bg-orange-500 text-white animate-pulse'
                  : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isSolving ? (
              <span className="animate-spin">⌛</span>
            ) : (
              <Play size={16} className={isResultsMode ? 'fill-current' : ''} />
            )}
            {isSolving ? 'CALCULANDO...' : isResultsMode ? 'ACTUALIZAR RESULTADOS' : 'RUN'}
          </button>
        </div>
      </div>

      {/* ── Area Principal (Canvas + Sidebar) ── */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Render Canvas ocupando flex-1 */}
        <div 
          className="flex-1 relative"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Overlay de Selección 2D */}
          {selectionBox.isSelecting && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
                backgroundColor: selectionBox.mode === 'window' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                border: `1px ${selectionBox.mode === 'window' ? 'solid' : 'dashed'} ${selectionBox.mode === 'window' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(34, 197, 94, 0.8)'}`,
                pointerEvents: 'none',
                zIndex: 50
              }}
            />
          )}

          <ViewControls />
          {hasModel ? (
            <StructureCanvas />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500 bg-slate-900">
              <div className="text-center">
                <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                <p>Usa la barra de menús para iniciar un proyecto.</p>
              </div>
            </div>
          )}
          <ElementResultsModal />

          {/* Selector de Unidades Esquina Inferior Derecha */}
          <div 
            className="absolute bottom-4 z-50 transition-all duration-300"
            style={{ right: isSidebarOpen ? '336px' : '16px' }}
          >
            <select
              value={metadata?.units || 'm, kgf, C'}
              onChange={(e) => useStructureStore.getState().convertUnits(e.target.value)}
              className="bg-slate-800/80 backdrop-blur-md border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg focus:outline-none hover:bg-slate-700 shadow-lg cursor-pointer transition-colors"
            >
              <option value="m, kgf, C">MKS (m, kgf, C)</option>
              <option value="m, kN, C">SI (m, kN, C)</option>
              <option value="ft, kip, F">US Customary (ft, kip, F)</option>
            </select>
          </div>
        </div>

        {/* Botón Abatible del Sidebar */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-40" style={{ transform: isSidebarOpen ? 'translateX(-320px) translateY(-50%)' : 'translateY(-50%)' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="bg-slate-800 border border-slate-700 rounded-l-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 shadow-xl"
            title={isSidebarOpen ? "Ocultar Panel" : "Mostrar Panel"}
          >
            {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Panel Lateral (Property / Results) */}
        <div 
          className="bg-slate-800 border-l border-slate-700 flex flex-col h-full shadow-2xl transition-all duration-300 absolute right-0 top-0 bottom-0 z-30"
          style={{ width: '320px', transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          {isResultsMode ? <ResultsPanel /> : <PropertyPanel />}
        </div>
      </div>

      <TemplateWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
      <ShellPanel isOpen={shellPanelOpen} onClose={() => setShellPanelOpen(false)} />
      <LoadCombosModal isOpen={combosModalOpen} onClose={() => setCombosModalOpen(false)} />
      {materialsModalOpen && <DefineMaterialsModal onClose={() => setMaterialsModalOpen(false)} />}
      {sectionsModalOpen && <DefineSectionsModal onClose={() => setSectionsModalOpen(false)} />}
      {tablesModalOpen && <ResultsTableModal onClose={() => setTablesModalOpen(false)} />}
      {selectModalOpen && <SelectElementsModal onClose={() => setSelectModalOpen(false)} />}
      {assignModalOpen && <AssignSectionModal onClose={() => setAssignModalOpen(false)} />}
      {assignLoadsModalOpen && <AssignLoadsModal onClose={() => setAssignLoadsModalOpen(false)} />}
      {assignFrameLoadsModalOpen && <AssignFrameLoadsModal onClose={() => setAssignFrameLoadsModalOpen(false)} />}
      {assignRestraintsModalOpen && <AssignRestraintsModal onClose={() => setAssignRestraintsModalOpen(false)} />}
      
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onLoginSuccess={(u) => { setCurrentUser(u); setAuthModalOpen(false); }} />}
      {projectsModalOpen && <ProjectsDashboardModal onClose={() => setProjectsModalOpen(false)} />}
    </div>
  );
}