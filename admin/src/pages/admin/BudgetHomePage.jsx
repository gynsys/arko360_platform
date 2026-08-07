import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Plus, FileText, Trash2, Edit3, Copy, Search, 
  Settings, Printer,
  MoreVertical, Clock, DollarSign, Loader
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { budgetService } from '../../services/budgetService';
import BudgetSettingsModal from '../../components/modals/BudgetSettingsModal';
import CreateBudgetModal from '../../components/modals/CreateBudgetModal';

export default function BudgetHomePage() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  
  const [duplicatingBudget, setDuplicatingBudget] = useState(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [renamingBudget, setRenamingBudget] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [settingsBudget, setSettingsBudget] = useState(null);
  
  const navigate = useNavigate();

  const [budgetTotals, setBudgetTotals] = useState({});

  useEffect(() => {
    loadBudgets();
  }, []);

  const calculatePU = (item, budget) => {
    if (item.is_chapter) return 0;
    const matCost = (item.materials || []).reduce((acc, curr) => {
      const q = parseFloat(curr.cantidad || 0);
      const w = parseFloat(curr.desperdicio || 0);
      const p = parseFloat(curr.precio_unitario || 0);
      return acc + (q * (1 + w / 100) * p);
    }, 0);
    const eqCost = (item.equipments || []).reduce((acc, curr) => {
      const q = parseFloat(curr.cantidad || 0);
      const d = parseFloat(curr.depreciacion ?? 1.0);
      const p = parseFloat(curr.precio_unitario || 0);
      return acc + (q * d * p);
    }, 0) / (item.performance || 1);
    const totJornal = (item.labors || []).reduce((acc, curr) => acc + (parseFloat(curr.cantidad || 0) * parseFloat(curr.jornal || 0)), 0);
    const totBono = (item.labors || []).reduce((acc, curr) => acc + (parseFloat(curr.cantidad || 0) * parseFloat(curr.bono || 0)), 0);
    const labCost = (totJornal + totBono + (totJornal * ((budget.fcas_percent ?? 417) / 100))) / (item.performance || 1);
    const subtotal = matCost + eqCost + labCost;
    const subtotalB = subtotal + (subtotal * ((budget.admin_percent ?? 15.0) / 100));
    return subtotalB + (subtotalB * ((budget.profit_percent ?? 10.0) / 100));
  };

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getAll();
      setBudgets(data);
      
      // Fetch full details to compute totals
      data.forEach(async (b) => {
        try {
          const fullBudget = await budgetService.getById(b.id);
          const totalItems = fullBudget.items?.filter(i => !i.is_chapter).length || 0;
          const subtotalPresupuesto = fullBudget.items?.reduce((sum, item) => sum + (calculatePU(item, fullBudget) * item.quantity), 0) || 0;
          const ivaAmount = subtotalPresupuesto * ((fullBudget.iva_percent ?? 16.0) / 100);
          const totalGeneral = subtotalPresupuesto + ivaAmount;
          
          setBudgetTotals(prev => ({
            ...prev,
            [b.id]: { items: totalItems, amount: totalGeneral }
          }));
        } catch (e) {
          console.error("Error loading details for budget", b.id, e);
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (e) => {
    e.preventDefault();
    if (!duplicateName.trim()) return;
    try {
      await budgetService.duplicateBudget(duplicatingBudget.id, duplicateName.trim());
      toast.success('Presupuesto duplicado exitosamente');
      setDuplicatingBudget(null);
      loadBudgets();
    } catch (err) {
      toast.error('Error al duplicar el presupuesto');
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameName.trim()) return;
    try {
      await budgetService.update(renamingBudget.id, { name: renameName.trim() });
      toast.success('Nombre actualizado');
      setRenamingBudget(null);
      loadBudgets();
    } catch (err) {
      toast.error('Error al actualizar el nombre');
    }
  };

  const confirmDelete = (id) => {
    setDeletingId(id);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await budgetService.delete(deletingId);
      setBudgets(budgets.filter(b => b.id !== deletingId));
      toast.success('Presupuesto eliminado');
      setDeletingId(null);
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar');
      setDeletingId(null);
    }
  };

  const filteredBudgets = budgets.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="absolute inset-0 p-6 md:p-8 flex flex-col overflow-hidden gap-4 max-w-7xl mx-auto w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Gestor de Presupuestos
          </h1>
          <p className="text-slate-500 mt-1">Administra, crea y organiza todos tus proyectos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          <div className="absolute inset-0 bg-[#e0f2fe] transform scale-x-0 origin-left transition-transform duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-x-100"></div>
          <div className="relative z-10 flex items-center gap-2 font-medium text-white group-hover:text-[#1e3a8a] transition-colors">
            <Plus size={18} />
            <span>Nuevo Presupuesto</span>
          </div>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-4 shadow-sm flex gap-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar presupuestos por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* BUDGET LIST */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-16 pt-2">
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
              className="tarjeta-presupuesto-ambar cursor-pointer group"
            >
              <div className="tarjeta-header">
                <div className="icono-archivo-ambar">
                  <FileText size={20} strokeWidth={2} />
                </div>
                
                <div className="acciones-rapidas">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDuplicatingBudget(budget); setDuplicateName(budget.name + ' (Copia)'); }}
                    className="btn-accion"
                    title="Duplicar"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSettingsBudget(budget); }}
                    className="btn-accion"
                    title="Configuración Global"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); window.print(); }}
                    className="btn-accion"
                    title="Imprimir"
                  >
                    <Printer size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setRenamingBudget(budget); setRenameName(budget.name); }}
                    className="btn-accion"
                    title="Editar"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); confirmDelete(budget.id); }}
                    className="btn-accion"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="tarjeta-body">
                <h3 className="tarjeta-titulo-ambar truncate" title={budget.name}>
                  {budget.name}
                </h3>
                <p className="text-xs text-amber-700 font-semibold mb-3">
                  Total Partidas: {budgetTotals[budget.id] ? budgetTotals[budget.id].items : '...'}
                </p>
                
                <div className="tarjeta-detalles flex justify-between items-center w-full mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="detalle-fecha">
                      <Clock size={13} className="mini-icono"/>
                      {new Date(budget.created_at).toLocaleDateString()}
                    </span>
                    <span className="detalle-moneda">
                      <DollarSign size={13} className="mini-icono"/>
                      {budget.currency}
                    </span>
                  </div>
                  {budgetTotals[budget.id] ? (
                    <span className="text-[13px] font-bold text-amber-900">
                      {budget.currency === 'USD' ? '$' : 'Bs.'} {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(budgetTotals[budget.id].amount)}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700/50">Calculando...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* NEW BUDGET MODAL */}
      {isModalOpen && (
        <CreateBudgetModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newBudget) => {
            setIsModalOpen(false);
            navigate(`/budgets/${newBudget.id}`);
          }}
        />
      )}
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Eliminar Presupuesto</h2>
              <p className="text-sm text-slate-600 mb-6">¿Estás seguro que deseas eliminar este presupuesto de forma permanente?</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/30"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renamingBudget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[550px] bg-amber-100 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden font-sans flex flex-col max-h-[90vh]">
            <div className="flex flex-col gap-2 px-6 pt-6 pb-2">
              <h2 className="m-0 text-xl font-bold text-amber-900">Renombrar Presupuesto</h2>
              <p className="text-[13px] text-amber-700 m-0">Ingresa el nuevo nombre para este proyecto.</p>
            </div>
            
            <form onSubmit={handleRename} className="px-6 pb-6 pt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-2 w-full">
                <label className="text-[13px] font-semibold text-amber-900">Nombre del Proyecto</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="px-3 py-1 border border-sky-200 rounded-xl text-sm text-sky-700 bg-sky-50 outline-none transition-all focus:border-sky-600 focus:bg-sky-100 focus:ring-4 focus:ring-sky-700/10"
                />
              </div>
              <div className="flex justify-end gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setRenamingBudget(null)}
                  className="bg-transparent border-none text-amber-700 text-sm font-semibold px-6 py-2 cursor-pointer rounded-xl hover:bg-white/30 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-sky-600 text-white border-none text-sm font-semibold px-6 py-2 rounded-xl cursor-pointer shadow-[0_4px_6px_rgba(2,132,199,0.2)] transition-all hover:bg-sky-700 hover:-translate-y-[1px]"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUPLICATE MODAL */}
      {duplicatingBudget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[550px] bg-amber-100 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden font-sans flex flex-col max-h-[90vh]">
            <div className="flex flex-col gap-2 px-6 pt-6 pb-2">
              <h2 className="m-0 text-xl font-bold text-amber-900">Duplicar Presupuesto</h2>
              <p className="text-[13px] text-amber-700 m-0">Se creará una copia exacta con todas sus partidas y APUs.</p>
            </div>
            
            <form onSubmit={handleDuplicate} className="px-6 pb-6 pt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-2 w-full">
                <label className="text-[13px] font-semibold text-amber-900">Nombre de la Copia</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  className="px-3 py-1 border border-sky-200 rounded-xl text-sm text-sky-700 bg-sky-50 outline-none transition-all focus:border-sky-600 focus:bg-sky-100 focus:ring-4 focus:ring-sky-700/10"
                />
              </div>
              <div className="flex justify-end gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setDuplicatingBudget(null)}
                  className="bg-transparent border-none text-amber-700 text-sm font-semibold px-6 py-2 cursor-pointer rounded-xl hover:bg-white/30 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-sky-600 text-white border-none text-sm font-semibold px-6 py-2 rounded-xl cursor-pointer shadow-[0_4px_6px_rgba(2,132,199,0.2)] transition-all hover:bg-sky-700 hover:-translate-y-[1px]"
                >
                  Crear Copia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {settingsBudget && (
        <BudgetSettingsModal
          budget={settingsBudget}
          onClose={() => setSettingsBudget(null)}
          onSave={() => {
            setSettingsBudget(null);
            loadBudgets();
          }}
        />
      )}
    </div>
  );
}
