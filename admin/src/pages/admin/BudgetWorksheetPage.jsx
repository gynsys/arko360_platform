import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Settings, Plus, Search, Layers, FileText, 
  DollarSign, Hash, Percent, Loader, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { budgetService } from '../../services/budgetService';
import { API_URL } from '../../services/api';

export default function BudgetWorksheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Settings Panel
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    currency: 'USD',
    exchange_rate: 1.0,
    fcas_percent: 417.0,
    admin_percent: 15.0,
    profit_percent: 10.0
  });

  // Search DB Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadBudget();
  }, [id]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getById(id);
      setBudget(data);
      setSettings({
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        fcas_percent: data.fcas_percent,
        admin_percent: data.admin_percent ?? 15.0,
        profit_percent: data.profit_percent ?? 10.0
      });
    } catch (error) {
      console.error(error);
      toast.error('Error cargando el presupuesto');
      navigate('/budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await budgetService.update(id, settings);
      setBudget(prev => ({ ...prev, ...settings }));
      toast.success('Configuración guardada exitosamente');
      setShowSettings(false);
    } catch (error) {
      toast.error('Error guardando configuración');
    }
  };

  const searchDatabase = async (e) => {
    if (e) e.preventDefault();
    try {
      setSearching(true);
      const url = searchQuery.trim() 
        ? `${API_URL}/cost360/items?search=${encodeURIComponent(searchQuery.trim())}&limit=30`
        : `${API_URL}/cost360/items?limit=30`;
      
      const res = await fetch(url);
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleOpenSearchModal = () => {
    setShowSearchModal(true);
    if (searchResults.length === 0) {
      searchDatabase();
    }
  };

  const handleAddItem = async (item) => {
    try {
      await budgetService.addItem(id, {
        cod_par: item.CodPar,
        cov_par: item.CovPar || '',
        description: item.Descri,
        unit: item.UniPar || 'UND',
        quantity: 1.0,
        performance: item.RenPar || 1.0
      });
      setShowSearchModal(false);
      setSearchQuery('');
      setSearchResults([]);
      loadBudget(); // Reload to get new items
      toast.success('Partida agregada al presupuesto');
    } catch (error) {
      toast.error('Error agregando partida');
    }
  };

  const calculatePU = (item) => {
    let matCost = 0;
    if (item.materials) {
      item.materials.forEach(m => matCost += m.cantidad * m.precio_unitario);
    }
    let eqCost = 0;
    if (item.equipments) {
      item.equipments.forEach(e => eqCost += (e.cantidad * e.precio_unitario) / (item.performance || 1));
    }
    let labCost = 0;
    if (item.labors) {
      item.labors.forEach(l => {
        const daily = (l.jornal + l.bono) * l.cantidad;
        labCost += daily / (item.performance || 1);
      });
      // Apply FCAS from budget config
      labCost = labCost * (1 + (budget.fcas_percent / 100));
    }
    
    // Add Administrative and Profit overheads from budget config
    const subtotal = matCost + eqCost + labCost;
    const admin = subtotal * (budget.admin_percent / 100);
    const util = subtotal * (budget.profit_percent / 100);
    return subtotal + admin + util;
  };

  const calculateBudgetTotal = () => {
    return budget?.items.reduce((sum, item) => sum + (calculatePU(item) * item.quantity), 0) || 0;
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    // Optimistic UI update
    setBudget(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, quantity: parseFloat(newQuantity) || 0 } : i)
    }));
  };

  const saveQuantity = async (itemId, newQuantity) => {
    try {
      await budgetService.updateItem(budget.id, itemId, { quantity: parseFloat(newQuantity) || 0 });
    } catch (error) {
      console.error(error);
      toast.error('Error guardando la cantidad');
    }
  };

  if (loading || !budget) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/budgets')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{budget.name}</h1>
            <p className="text-sm text-slate-500">Hoja de Presupuesto</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm text-sm"
          >
            <Settings size={16} /> Configuración Global
          </button>
          <button 
            onClick={handleOpenSearchModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm"
          >
            <Plus size={16} /> Agregar Partida
          </button>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="text-blue-500" /> Configuración del Presupuesto
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <DollarSign size={14}/> Moneda Base
                  </label>
                  <select 
                    value={settings.currency}
                    onChange={e => setSettings({...settings, currency: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  >
                    <option value="USD">Dólares (USD)</option>
                    <option value="BS">Bolívares (BS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Hash size={14}/> Tasa de Cambio (BS/USD)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={settings.exchange_rate}
                    onChange={e => setSettings({...settings, exchange_rate: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> FCAS Global (%)
                  </label>
                  <input 
                    type="number" 
                    step="1"
                    value={settings.fcas_percent}
                    onChange={e => setSettings({...settings, fcas_percent: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> Administración (%)
                  </label>
                  <input 
                    type="number" 
                    step="1"
                    value={settings.admin_percent}
                    onChange={e => setSettings({...settings, admin_percent: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> Utilidad (%)
                  </label>
                  <input 
                    type="number" 
                    step="1"
                    value={settings.profit_percent}
                    onChange={e => setSettings({...settings, profit_percent: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/30"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORKSHEET TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4 w-32">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 w-20 text-center">Und</th>
                <th className="p-4 w-28 text-right">Cantidad</th>
                <th className="p-4 w-32 text-right">Precio Unit.</th>
                <th className="p-4 w-32 text-right">Total</th>
                <th className="p-4 w-20 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budget.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <Layers className="mx-auto mb-3 text-slate-300" size={32} />
                    <p>No hay partidas en este presupuesto.</p>
                    <button 
                      onClick={handleOpenSearchModal}
                      className="mt-4 text-blue-600 font-medium hover:underline"
                    >
                      Buscar e incluir la primera partida
                    </button>
                  </td>
                </tr>
              ) : (
                budget.items.map((item, idx) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/50 transition-colors group"
                  >
                    <td className="p-4 text-center text-slate-400 font-medium text-sm">{idx + 1}</td>
                    <td className="p-4 text-sm font-mono text-slate-600">{item.cov_par || item.cod_par}</td>
                    <td className="p-4 text-sm text-slate-800">
                      <div className="line-clamp-2 leading-relaxed" title={item.description}>
                        {item.description}
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-medium text-slate-500">{item.unit}</td>
                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={item.quantity}
                        onChange={e => handleQuantityChange(item.id, e.target.value)}
                        onBlur={e => saveQuantity(item.id, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                      />
                    </td>
                    <td className="p-4 text-right text-sm font-medium text-slate-700">
                      {calculatePU(item).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-slate-900">
                      {(calculatePU(item) * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => navigate(`/budgets/${budget.id}/item/${item.id}`)}
                        className="bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 p-2 rounded-lg transition-colors flex items-center justify-center mx-auto tooltip"
                        title="Editar APU"
                      >
                        <Settings size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {budget.items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan="6" className="p-5 text-right font-bold text-slate-700 text-sm tracking-wide">
                    TOTAL PRESUPUESTO ({budget.currency}):
                  </td>
                  <td className="p-5 text-right font-black text-blue-700 text-lg">
                    {calculateBudgetTotal().toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* SEARCH MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Search className="text-blue-500" /> Buscar Partidas
              </h2>
              <button 
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 border-b border-slate-100">
              <form onSubmit={searchDatabase} className="flex gap-3">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ej. Transporte de maquinaria pesada 30 ton..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg"
                />
                <button 
                  type="submit"
                  disabled={searching}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </form>
            </div>

            <div className="overflow-y-auto p-2 bg-slate-50 flex-1">
              {searchResults.length === 0 && !searching ? (
                <div className="text-center py-12 text-slate-400">
                  No se encontraron partidas.
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {searchResults.map(item => (
                    <div 
                      key={item.CodPar}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 hover:border-blue-300 hover:shadow-md transition-all items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.CovPar || item.CodPar}
                          </span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            UND: {item.UniPar}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
                          {item.Descri}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleAddItem(item)}
                        className="shrink-0 flex items-center gap-1 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        <Plus size={16} /> Incluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
