import React, { useState, useRef } from 'react';
import { Settings, Play, Building2, Save, FolderOpen, Plus, MousePointer2, Layers, Grid, ArrowDownToLine, Calculator, ChevronRight, ChevronLeft, LogIn, Cloud, BookOpen, FileText, Download, HelpCircle, LogOut, X, Copy, Wind } from 'lucide-react';
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
import { ReplicateModal } from './ReplicateModal';
import { DrawCantileverModal } from './DrawCantileverModal';
import { ViewControls } from './ViewControls';
import { useStructureStore } from './useStructureStore';
import { useSolver } from './useSolver';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { MenuDropdown } from './MenuDropdown';
import { AuthModal } from './AuthModal';
import { ProjectsDashboardModal } from './ProjectsDashboardModal';
import { createProject, updateProject, loadTokenFromStorage } from './api';
import { HelpDocsModal } from './HelpDocsModal';
import { WindLoadModal } from './WindLoadModal';

export default function FEA3DContainer() {
  const [wizardOpen, setWizardOpen] = useState(false);
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
  const [replicateModalOpen, setReplicateModalOpen] = useState(false);
  const [cantileverModalOpen, setCantileverModalOpen] = useState(false);
  const [windLoadModalOpen, setWindLoadModalOpen] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenReplicate = () => setReplicateModalOpen(true);
    const handleOpenMaterials = () => setMaterialsModalOpen(true);
    const handleOpenProjects = () => setProjectsModalOpen(true);
    
    window.addEventListener('open-replicate-modal', handleOpenReplicate);
    window.addEventListener('open-materials-modal', handleOpenMaterials);
    window.addEventListener('open-projects-modal', handleOpenProjects);
    
    return () => {
      window.removeEventListener('open-replicate-modal', handleOpenReplicate);
      window.removeEventListener('open-materials-modal', handleOpenMaterials);
      window.removeEventListener('open-projects-modal', handleOpenProjects);
    };
  }, []);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsInitialTab, setDocsInitialTab] = useState('manual');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState(null); // ID en base de datos
  
  const fileInputRef = useRef(null);

  const { 
    wizardConfig, elements, shells, metadata, setMetadata,
    exportProject, importProject, isDrawingShell, toggleDrawingShell, drawingNodes,
    isQuickDrawingShell, toggleQuickDrawingShell,
    viewMode, activeResultType, setResultsMode,
    isSaved, currentUser, setCurrentUser, showLoads, toggleShowLoads,
    showMesh, toggleShowMesh,
    selectionBox
  } = useStructureStore();

  useEffect(() => {
    const initAuth = async () => {
      const token = loadTokenFromStorage();
      if (token) {
        if (!currentUser) {
          setAuthModalOpen(true);
        } else {
          setAuthModalOpen(false);
          setWizardOpen(true);
        }
      } else {
        setAuthModalOpen(true);
      }
    };
    initAuth();
  }, [currentUser]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (elements.length > 0 && !isSaved) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [elements.length, isSaved]);

  const hasModel = wizardConfig !== null || elements.length > 0 || shells.length > 0 || useStructureStore.getState().nodes.length > 0;
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const state = useStructureStore.getState();
        if (state.isDrawingShell || state.isQuickDrawingShell || state.selectedIds.length > 0) {
          useStructureStore.setState({
            isDrawingShell: false,
            isQuickDrawingShell: false,
            drawingNodes: [],
            selectedIds: []
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveToCloud = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    
    let projectName = metadata.name || 'Sin Título';
    
    const executeSave = async (finalName) => {
      const projectData = {
        name: finalName,
        topology: {
          nodes: useStructureStore.getState().nodes,
          elements: useStructureStore.getState().elements,
          shells: useStructureStore.getState().shells,
          openings: useStructureStore.getState().openings,
          materials: useStructureStore.getState().materials,
          sections: useStructureStore.getState().sections,
          loads: useStructureStore.getState().loads,
          combinations: useStructureStore.getState().loadCombinations,
          metadata: useStructureStore.getState().metadata,
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
        toast.error("Error guardando proyecto en la nube");
      }
    };

    if (!currentProjectId) {
      toast.custom((t) => {
        let inputValue = projectName === 'Sin Título' ? "Nuevo Proyecto" : projectName;
        return (
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl flex flex-col gap-3 min-w-[300px]">
            <p className="text-white text-sm font-bold flex items-center gap-2">
              <Cloud size={16} className="text-blue-400" /> Guardar Nuevo Proyecto
            </p>
            <input 
              type="text" 
              defaultValue={inputValue}
              id={`save-input-${t.id}`}
              className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Nombre del proyecto"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.target.value.trim() || 'Sin Título';
                  setMetadata({ ...metadata, name: val });
                  toast.dismiss(t.id);
                  executeSave(val);
                }
              }}
            />
            <div className="flex gap-2 justify-end mt-2">
              <button 
                onClick={() => toast.dismiss(t.id)} 
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const val = document.getElementById(`save-input-${t.id}`)?.value.trim() || 'Sin Título';
                  setMetadata({ ...metadata, name: val });
                  toast.dismiss(t.id);
                  executeSave(val);
                }} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        );
      }, { duration: Infinity });
    } else {
      executeSave(projectName);
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
      toast.error('Ocurrió un error al ejecutar el análisis.');
      toast.error('Error de conexión con el motor de cálculo en el servidor.');
    } finally {
      setIsSolving(false);
    }
  };

  const handleProjectSelect = (project) => {
    setCurrentProjectId(project.id);
    setProjectsModalOpen(false);
    setWizardOpen(false);
    if (project.topology) {
       const shellsRaw = project.topology.shells || [];
       
       useStructureStore.setState({
         nodes: project.topology.nodes || [],
         elements: project.topology.elements || [],
         shells: shellsRaw,
         openings: project.topology.openings || [],
         materials: project.topology.materials || [],
         sections: project.topology.sections || [],
         loads: project.topology.loads || [],
         loadCombinations: project.topology.combinations || [],
         isSaved: true,
         projectLoadedTrigger: useStructureStore.getState().projectLoadedTrigger + 1
       });
       if (project.topology.metadata) {
         useStructureStore.setState({ metadata: project.topology.metadata });
       }
       // Regenerate FEM mesh for all shells (needed for visualization)
       setTimeout(() => {
         shellsRaw.forEach(shell => {
           useStructureStore.getState().generateMeshForShell(shell.id);
         });
         useStructureStore.setState({ projectLoadedTrigger: useStructureStore.getState().projectLoadedTrigger + 1 });
       }, 0);
       if (project.results) {
         useStructureStore.getState().setResultsMode(project.results);
       } else {
         useStructureStore.setState({ viewMode: 'model', results: null });
       }
       setMetadata({ name: project.name || 'Sin Título' });
       toast.success(`Proyecto ${project.name} cargado`);
    } else {
       toast.error("El proyecto no tiene topología válida");
    }
  };

  const handleDownloadAudit = () => {
    const state = useStructureStore.getState();
    // Generar un resumen legible para auditoría de unidades y dimensiones
    const verificacion_fisica = {
      notas_unidades: "Las propiedades geométricas y de materiales se listan tal como el solver las interpreta (típicamente MKS: m, kgf).",
      elementos_tipo_frame: state.elements.map(el => {
        const n1 = state.nodes.find(n => n.id === el.nodes[0]);
        const n2 = state.nodes.find(n => n.id === el.nodes[1]);
        const dx = n2.x - n1.x; const dy = n2.y - n1.y; const dz = n2.z - n1.z;
        const L = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const sec = state.sections.find(s => s.id === el.section_id);
        const mat = sec ? state.materials.find(m => m.id === sec.material_id) : null;
        return {
          id: el.id,
          longitud_calculada: L,
          seccion: sec ? { nombre: sec.name, params: sec.params, area: sec.A, inercias: [sec.Ix, sec.Iy, sec.J] } : "No asignada",
          material: mat ? { nombre: mat.name, E: mat.E, fc: mat.fc, G: mat.G } : "No asignado"
        };
      }),
      elementos_tipo_losa: state.shells.map(sh => {
        const mat = state.materials.find(m => m.id === sh.material_id);
        return {
          id: sh.id,
          espesor_m: sh.thickness,
          material: mat ? { nombre: mat.name, E: mat.E, fc: mat.fc, peso: mat.weightVol } : "No asignado",
          nodos_asignados: sh.nodes
        };
      }),
      materiales_registrados: state.materials,
      secciones_registradas: state.sections
    };

    let verificacion_viento = null;
    if (state.wizardConfig && state.wizardConfig.type === 'galpon') {
      verificacion_viento = {
        notas_metodologia: "Procedimiento Analítico COVENIN 2003-89 / Método Direccional",
        parametros_entrada: {
          velocidad_basica_V: "Tomada de la normativa regional (km/h)",
          factor_importancia_I: 1.0,
          categoria_exposicion: "C",
          altura_media_techo_h: (state.wizardConfig.floorHeight + state.wizardConfig.apexHeight) / 2
        },
        formulas_aplicadas: {
          "presion_dinamica_q": "q = 0.00482 * Kz * Kzt * Kd * V^2 * I",
          "coeficiente_Kz": "2.01 * (z/Zg)^(2/alpha) para exposición C",
          "factor_rafaga_G": "0.85 (estructuras rígidas)",
          "presion_diseno_p": "p = q * G * Cp - q_i * (GCpi)",
          "transferencia_cubierta": "q_lineal_correa [kgf/m] = p [kgf/m²] * (L/2 / n_paneles)"
        },
        transferencias_calculadas: "Revisar las cargas con loadCase WX y WY sobre los elementos. Las cargas de cubierta aplican en elementos longitudinales (dy > 0) como correas."
      };
    }

    const auditData = {
      timestamp: new Date().toISOString(),
      metadata: state.metadata,
      wizard_config: state.wizardConfig,
      verificacion_fisica: verificacion_fisica,
      ...(verificacion_viento ? { verificacion_viento_galpon: verificacion_viento } : {}),
      formulas_aplicadas_analisis: {
        "matriz_rigidez_local": "[k_loc] = f(E, G, A, J, Iy, Ix, L)",
        "transformacion_coordenadas": "[K_global] = [T]^T * [k_loc] * [T]",
        "ensamblaje_global": "Sumatoria de [K_global_elem] para todos los elementos",
        "ecuacion_principal": "[K] * {U} = {F}",
        "penalty_method": "Multiplicación de la diagonal de [K] por 1e30 en los Grados de Libertad restringidos",
        "recuperacion_fuerzas_locales": "{f_local} = [k_loc] * {u_local} + {f_fixed_local}",
        "teoria_aplicada": "Flexión 3D de Euler-Bernoulli y Kirchhoff-Mindlin para Placas"
      },
      nodes: state.nodes,
      elements: state.elements,
      shells: state.shells,
      materials: state.materials,
      sections: state.sections,
      loads: state.loads,
      loadCombinations: state.loadCombinations,
      results: state.results
    };
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arko3d_frontend_audit_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo de auditoría descargado");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 font-sans">
      
      <div className="flex items-center justify-between px-4 h-14 min-h-[56px] bg-slate-800 border-b border-slate-700 z-50">
        
        <div className="flex items-center gap-1">
          <div className="mr-4 flex items-center">
            <img src="/images/logo_arko360_light.png" alt="Arko360" className="h-[29px]" />
          </div>
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
            { label: 'Guardar Como', icon: Save, onClick: () => {
                toast.custom((t) => (
                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-xl flex flex-col gap-3">
                    <p className="text-white text-sm font-bold">¿Cómo deseas guardar el proyecto?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { handleSaveToCloud(); toast.dismiss(t.id); }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Cloud size={14} /> En la Nube</button>
                      <button onClick={() => { exportProject(); toast.dismiss(t.id); }} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><FolderOpen size={14} /> Local (.arko3d)</button>
                    </div>
                  </div>
                ), { duration: 5000 });
              }
            },
            { separator: true },
            { label: 'Abrir Local (.arko3d)', icon: FolderOpen, onClick: () => fileInputRef.current?.click() },
            { label: 'Guardar Copia Local', icon: Save, onClick: exportProject },
            { separator: true },
            { label: 'Salir', icon: LogOut, onClick: () => window.location.href = '/' }
          ]} />

          <MenuDropdown title="Edit" items={[
            { label: 'Replicar', icon: Copy, onClick: () => setReplicateModalOpen(true), disabled: isResultsMode }
          ]} />

          <MenuDropdown title="Define" items={[
            { label: 'Materiales', icon: Settings, onClick: () => setMaterialsModalOpen(true), disabled: isResultsMode },
            { label: 'Secciones', icon: Settings, onClick: () => setSectionsModalOpen(true), disabled: isResultsMode },
            { label: 'Combinaciones de Carga', icon: Calculator, onClick: () => setCombosModalOpen(true), disabled: isResultsMode }
          ]} />

          <MenuDropdown title="Draw" items={[
            { label: isDrawingShell ? `Seleccione Nudos (${drawingNodes.length}/4)` : 'Losa (Nodo a Nodo)', icon: MousePointer2, onClick: toggleDrawingShell, disabled: isResultsMode },
            { label: isQuickDrawingShell ? 'Losa Rápida Activa' : 'Losa Rápida', icon: Grid, onClick: toggleQuickDrawingShell, disabled: isResultsMode },
            { label: 'Losa (Formulario)', icon: Layers, onClick: () => setShellPanelOpen(true), disabled: isResultsMode },
            { 
              label: 'Abertura', 
              icon: Layers, 
              onClick: () => {
                const state = useStructureStore.getState();
                const selectedSlabId = state.selectedIds.find(id => state.shells.some(s => s.id === id));
                if (selectedSlabId) {
                  state.addOpening({
                    hostSlabId: selectedSlabId,
                    offsetX: 0,
                    offsetY: 0,
                    type: 'LINEAR',
                    params: { width: 1, length: 3 }
                  });
                } else {
                  toast.error('Selecciona primero una losa en el modelo para añadirle una abertura.', { duration: 4000 });
                }
              }, 
              disabled: isResultsMode 
            },
            {
              label: 'Volados (Ejes)...',
              icon: Layers,
              onClick: () => setCantileverModalOpen(true),
              disabled: isResultsMode
            }
          ]} />

          <MenuDropdown title="Assign" items={[
            { label: 'Seleccionar (Select)', icon: MousePointer2, onClick: () => setSelectModalOpen(true), disabled: isResultsMode },
            { label: 'Asignar Secciones (Frame)', icon: Settings, onClick: () => setAssignModalOpen(true), disabled: isResultsMode },
            { separator: true },
            { label: 'Restricciones / Apoyos', icon: Settings, onClick: () => setAssignRestraintsModalOpen(true), disabled: isResultsMode },
            { label: 'Cargas en Nudos (Joint)', icon: ArrowDownToLine, onClick: () => setAssignLoadsModalOpen(true), disabled: isResultsMode },
            { label: 'Cargas en Vigas (Frame)', icon: ArrowDownToLine, onClick: () => setAssignFrameLoadsModalOpen(true), disabled: isResultsMode },
            { separator: true },
            { label: 'Cargas de Viento (Galpón)', icon: Wind, onClick: () => setWindLoadModalOpen(true), disabled: isResultsMode }
          ]} />

          <MenuDropdown title="Analyze" items={[
            { label: 'Ejecutar Análisis', icon: Play, onClick: handleRunAnalysis, disabled: isResultsMode || totalElements === 0 }
          ]} />

          <MenuDropdown title="Display" items={[
            { label: showLoads ? 'Ocultar Cargas' : 'Mostrar Cargas', icon: Settings, onClick: toggleShowLoads, disabled: isResultsMode },
            { label: showMesh ? 'Ocultar Mallado' : 'Mostrar Mallado', icon: Settings, onClick: toggleShowMesh },
            { label: 'Tablas de Resultados', icon: Settings, onClick: () => setTablesModalOpen(true), disabled: !isResultsMode }
          ]} />

          <MenuDropdown title="Help" items={[
            { label: 'Manual de Usuario', icon: BookOpen, onClick: () => { setDocsInitialTab('manual'); setDocsModalOpen(true); } },
            { label: 'Soporte Teórico', icon: FileText, onClick: () => { setDocsInitialTab('theory'); setDocsModalOpen(true); } },
            { separator: true },
            { label: 'Descargar Auditoría JSON (Dev)', icon: Download, onClick: handleDownloadAudit }
          ]} />
          
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".arko3d,.json" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden h-8">
            <input 
              type="text" 
              value={metadata.name || ''} 
              onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
              placeholder="Nombre del proyecto..."
              className="bg-transparent text-white text-xs px-3 outline-none w-48"
            />
            <button 
              onClick={handleSaveToCloud}
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-l border-slate-700"
              title="Guardar en la Nube"
            >
              <Save size={14} />
            </button>
          </div>
          
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
          
          {!isResultsMode && (
            <button
              onClick={handleRunAnalysis}
              disabled={isSolving || totalElements === 0}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-all ${
                isSolving || totalElements === 0 
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isSolving ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Play size={16} />
              )}
              {isSolving ? 'CALCULANDO...' : 'RUN'}
            </button>
          )}

          <div className="w-px h-6 bg-slate-700 mx-1"></div>
          
          <button 
            onClick={() => {
              // Cerrar proyecto y volver al wizard
              useStructureStore.setState({ 
                nodes: [], elements: [], shells: [], loads: [], 
                selectedIds: [], results: null, wizardConfig: null, metadata: { name: 'Proyecto ARKO3D', author: '', units: 'm, kgf, C' } 
              });
              setWizardOpen(true);
            }}
            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
            title="Cerrar Proyecto Activo"
          >
            <X size={20} />
          </button>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="p-1.5 ml-1 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors border border-slate-700"
            title="Salir de ARKO3D"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 relative overflow-hidden">
        
        <div 
          className="flex-1 relative"
          onContextMenu={(e) => e.preventDefault()}
        >
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

          <div 
            id="coord-indicator"
            className="absolute bottom-4 left-4 z-50 bg-slate-800/80 backdrop-blur-md border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs px-3 py-1.5 rounded-lg shadow-lg font-mono min-w-[150px] text-center"
          >
            X: 0.000, Y: 0.000, Z: 0.000
          </div>

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

        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-40" style={{ transform: isSidebarOpen ? 'translateX(-320px) translateY(-50%)' : 'translateY(-50%)' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="bg-slate-800 border border-slate-700 rounded-l-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 shadow-xl"
            title={isSidebarOpen ? "Ocultar Panel" : "Mostrar Panel"}
          >
            {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div 
          className="bg-slate-800 border-l border-slate-700 flex flex-col h-full shadow-2xl transition-all duration-300 absolute right-0 top-0 bottom-0 z-30"
          style={{ width: '320px', transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          {isResultsMode ? <ResultsPanel /> : <PropertyPanel />}
        </div>
      </div>

      <TemplateWizard 
        isOpen={wizardOpen} 
        onClose={() => setWizardOpen(false)} 
        onProjectSelect={handleProjectSelect}
      />
      <ShellPanel isOpen={shellPanelOpen} onClose={() => setShellPanelOpen(false)} />
      <LoadCombosModal isOpen={combosModalOpen} onClose={() => setCombosModalOpen(false)} />
      <ReplicateModal isOpen={replicateModalOpen} onClose={() => setReplicateModalOpen(false)} />
      <WindLoadModal isOpen={windLoadModalOpen} onClose={() => setWindLoadModalOpen(false)} />
      {materialsModalOpen && <DefineMaterialsModal onClose={() => setMaterialsModalOpen(false)} />}
      {sectionsModalOpen && <DefineSectionsModal onClose={() => setSectionsModalOpen(false)} />}
      {tablesModalOpen && <ResultsTableModal onClose={() => setTablesModalOpen(false)} />}
      {selectModalOpen && <SelectElementsModal onClose={() => setSelectModalOpen(false)} />}
      {assignModalOpen && <AssignSectionModal onClose={() => setAssignModalOpen(false)} />}
      {assignLoadsModalOpen && <AssignLoadsModal onClose={() => setAssignLoadsModalOpen(false)} />}
      {assignFrameLoadsModalOpen && <AssignFrameLoadsModal onClose={() => setAssignFrameLoadsModalOpen(false)} />}
      {assignRestraintsModalOpen && <AssignRestraintsModal onClose={() => setAssignRestraintsModalOpen(false)} />}
      {cantileverModalOpen && <DrawCantileverModal onClose={() => setCantileverModalOpen(false)} />}
      
      {authModalOpen && (
        <AuthModal 
          onClose={() => setAuthModalOpen(false)} 
          onLoginSuccess={(u) => { setCurrentUser(u); setAuthModalOpen(false); }}
        />
      )}

      {projectsModalOpen && (
        <ProjectsDashboardModal 
          onClose={() => setProjectsModalOpen(false)} 
          onProjectSelect={handleProjectSelect}
        />
      )}

      <HelpDocsModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        initialTab={docsInitialTab}
      />
    </div>
  );
}