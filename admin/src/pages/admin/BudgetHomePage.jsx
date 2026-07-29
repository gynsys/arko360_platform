import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Plus, FileText, Trash2, Edit3, Copy, Search, 
  MoreVertical, Clock, DollarSign, Loader
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { budgetService } from '../../services/budgetService';

export default function BudgetHomePage() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getAll();
      setBudgets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBudgetName.trim()) return;
    
    try {
      const newBudget = await budgetService.create({ name: newBudgetName });
      setIsModalOpen(false);
      setNewBudgetName('');
      navigate(`/budgets/${newBudget.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Error creando presupuesto');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar este presupuesto?')) return;
    try {
      await budgetService.delete(id);
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar');
    }
  };

  const filteredBudgets = budgets.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Gestor de Presupuestos
          </h1>
          <p className="text-slate-500 mt-1">Administra, crea y organiza todos tus proyectos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Nuevo Presupuesto</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-4 mb-8 shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar presupuestos por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* BUDGET LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader className="animate-spin mb-4" size={32} />
          <p>Cargando presupuestos...</p>
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center">
          <div className="bg-blue-50 text-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No se encontraron presupuestos</h3>
          <p className="text-slate-500 mt-1 max-w-md mx-auto">
            {searchTerm ? 'Intenta usar otros términos de búsqueda.' : 'Crea tu primer presupuesto para empezar a organizar tus costos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBudgets.map(budget => (
            <div 
              key={budget.id}
              onClick={() => navigate(`/budgets/${budget.id}`)}
              className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer relative overflow-hidden"
            >
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                  <FileText size={22} />
                </div>
                
                {/* Actions Dropdown (Simple for now) */}
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => handleDelete(budget.id, e)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-slate-800 text-lg truncate mb-1" title={budget.name}>
                {budget.name}
              </h3>
              
              <div className="flex items-center text-xs text-slate-500 mb-4 gap-2">
                <span className="flex items-center gap-1"><Clock size={12}/> {new Date(budget.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><DollarSign size={12}/> {budget.currency}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW BUDGET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Nuevo Presupuesto</h2>
              <p className="text-sm text-slate-500 mb-6">Asigna un nombre a tu nuevo proyecto de estimación.</p>
              
              <form onSubmit={handleCreate}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Proyecto</label>
                  <input 
                    type="text" 
                    autoFocus
                    required
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
                    placeholder="Ej. Construcción Casa Modelo A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                  >
                    Crear Proyecto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
