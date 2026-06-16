import React, { useEffect, useState } from 'react';
import { X, FileText, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjects, deleteProject } from './api';
import { useStructureStore } from './useStructureStore';

export function ProjectsDashboardModal({ onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (project) => {
    const topo = project.topology || {};
    
    // 1. Construir estado base SIN projectLoadedTrigger
    const newState = {
      nodes: topo.nodes || [],
      elements: topo.elements || [],
      shells: topo.shells || [],
      openings: topo.openings || [],
      materials: topo.materials || [],
      sections: topo.sections || [],
      loads: topo.loads || [],
      loadCombinations: topo.loadCombinations || topo.combinations || [],
      isSaved: true,
      viewMode: 'model',
      results: null,
      selectedIds: [],
    };
    
    if (topo.metadata) {
      newState.metadata = topo.metadata;
    } else {
      newState.metadata = { name: project.name, author: '', units: 'm, kgf, C' };
    }
    
    // 2. Cargar estado inicial
    useStructureStore.setState(newState);
    
    // 3. Regenerar meshes y aplicar resultados de forma asíncrona
    const shellsRaw = topo.shells || [];
    setTimeout(() => {
      // Regenerar meshes con getState() fresco
      shellsRaw.forEach(shell => {
        useStructureStore.getState().generateMeshForShell(shell.id);
      });
      
      // Aplicar resultados AHORA que los meshes existen
      if (project.results) {
        useStructureStore.getState().setResultsMode(project.results);
      }
      
      // UN SOLO trigger al final, con estado fresco
      useStructureStore.setState(s => ({ 
        projectLoadedTrigger: s.projectLoadedTrigger + 1 
      }));
    }, 0);
    
    toast.success(`Proyecto "${project.name}" cargado`);
    onClose();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este proyecto de la nube?")) return;
    try {
      await deleteProject(id);
      toast.success("Proyecto eliminado");
      fetchProjects();
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden relative">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            Mis Proyectos Guardados
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span className="text-slate-400 animate-pulse">Cargando proyectos...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-500">
              <FileText size={48} className="opacity-20 mb-4" />
              <p>Aún no tienes proyectos guardados en la nube.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(p => (
                <div key={p.id} className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition-all group">
                  <h3 className="text-white font-bold text-lg mb-1">{p.name}</h3>
                  <p className="text-slate-400 text-xs flex items-center gap-1 mb-4">
                    <Clock size={12} />
                    Modificado: {new Date(p.updated_at).toLocaleString()}
                  </p>
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => handleOpen(p)}
                      className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded text-sm font-bold transition-colors"
                    >
                      Abrir Proyecto
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar Proyecto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
