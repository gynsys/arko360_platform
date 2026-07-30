import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  const [configTab, setConfigTab] = useState('general'); // 'general' or 'params'
  const [settings, setSettings] = useState({
    currency: 'USD',
    exchange_rate: 1.0,
    fcas_percent: 417.0,
    admin_percent: 15.0,
    profit_percent: 10.0,
    iva_percent: 16.0,
    material_inflation: 0.0,
    labor_inflation: 0.0,
    equipment_inflation: 0.0,
    company_name: '',
    company_rif: '',
    client_name: '',
    project_name: ''
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
        currency: data.currency || 'USD',
        exchange_rate: data.exchange_rate || 1.0,
        fcas_percent: data.fcas_percent || 417.0,
        admin_percent: data.admin_percent ?? 15.0,
        profit_percent: data.profit_percent ?? 10.0,
        iva_percent: data.iva_percent ?? 16.0,
        material_inflation: data.material_inflation ?? 0.0,
        labor_inflation: data.labor_inflation ?? 0.0,
        equipment_inflation: data.equipment_inflation ?? 0.0,
        company_name: data.company_name || '',
        company_rif: data.company_rif || '',
        client_name: data.client_name || '',
        project_name: data.project_name || ''
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
      item.materials.forEach(m => {
        const cost = m.cantidad * m.precio_unitario;
        matCost += cost * (1 + ((budget?.material_inflation || 0) / 100));
      });
    }
    let eqCost = 0;
    if (item.equipments) {
      item.equipments.forEach(e => {
        const cost = (e.cantidad * e.precio_unitario) / (item.performance || 1);
        eqCost += cost * (1 + ((budget?.equipment_inflation || 0) / 100));
      });
    }
    let labCost = 0;
    if (item.labors) {
      item.labors.forEach(l => {
        const daily = (l.jornal + (budget?.labor_bonus || 0)) * l.cantidad;
        const cost = daily / (item.performance || 1);
        labCost += cost * (1 + ((budget?.labor_inflation || 0) / 100));
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
    const subtotalPresupuesto = budget?.items?.reduce((sum, item) => sum + (calculatePU(item) * item.quantity), 0) || 0;
    const ivaAmount = subtotalPresupuesto * ((budget?.iva_percent ?? 16.0) / 100);
    const totalGeneral = subtotalPresupuesto + ivaAmount;
    return { subtotalPresupuesto, ivaAmount, totalGeneral };
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

  const headerPortalTarget = document.getElementById('header-actions-portal');
  const { subtotalPresupuesto, ivaAmount, totalGeneral } = calculateBudgetTotal();

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
          {headerPortalTarget && createPortal(
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm text-sm mx-2"
            >
              <Settings size={16} /> Configuración Global
            </button>,
            headerPortalTarget
          )}
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
            
            <div className="flex border-b border-slate-200 px-6 pt-4 bg-slate-50/50">
              <button
                className={`pb-3 px-4 font-medium text-sm transition-colors border-b-2 ${configTab === 'general' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setConfigTab('general')}
              >
                Datos Generales
              </button>
              <button
                className={`pb-3 px-4 font-medium text-sm transition-colors border-b-2 ${configTab === 'params' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setConfigTab('params')}
              >
                Parámetros de Cálculo
              </button>
            </div>

            <div className="p-6 h-[400px] overflow-y-auto">
              {configTab === 'general' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre de la Obra / Proyecto</label>
                    <input 
                      type="text" 
                      value={settings.project_name}
                      onChange={e => setSettings({...settings, project_name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                      placeholder="Ej. Construcción de Muro Perimetral"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Empresa</label>
                      <input 
                        type="text" 
                        value={settings.company_name}
                        onChange={e => setSettings({...settings, company_name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">RIF de la Empresa</label>
                      <input 
                        type="text" 
                        value={settings.company_rif}
                        onChange={e => setSettings({...settings, company_rif: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Contratante / Cliente</label>
                    <input 
                      type="text" 
                      value={settings.client_name}
                      onChange={e => setSettings({...settings, client_name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <DollarSign size={14}/> Moneda Base
                  </label>
                  <select 
                    value={settings.currency}
                    onChange={e => setSettings({...settings, currency: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
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
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
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
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> Inflación Materiales
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={settings.material_inflation}
                    onChange={e => setSettings({...settings, material_inflation: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> Inflación Equipos
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={settings.equipment_inflation}
                    onChange={e => setSettings({...settings, equipment_inflation: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> Inflación Mano Obra
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={settings.labor_inflation}
                    onChange={e => setSettings({...settings, labor_inflation: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <DollarSign size={14}/> Bono Mano de Obra
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={settings.labor_bonus}
                    onChange={e => setSettings({...settings, labor_bonus: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> Administración (%)
                  </label>
                  <input 
                    type="number" 
                    step="1"
                    value={settings.admin_percent}
                    onChange={e => setSettings({...settings, admin_percent: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
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
                    className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Percent size={14}/> I.V.A (%)
                  </label>
                  <input 
                    type="number" 
                    step="1"
                    value={settings.iva_percent}
                    onChange={e => setSettings({...settings, iva_percent: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
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
                  <td colSpan="8" className="p-12 text-center text-slate-500">
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
          </table>
        </div>
        
        {/* FOOTER TOTAL */}
        {budget.items?.length > 0 && (
          <div className="mt-8 flex flex-col items-end gap-2 p-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 min-w-[300px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 font-medium text-sm">SUBTOTAL</span>
                <span className="text-lg font-semibold text-slate-700">
                  {subtotalPresupuesto.toLocaleString('es-VE', {minimumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium text-sm">I.V.A. ({budget.iva_percent ?? 16}%)</span>
                <span className="text-lg font-semibold text-slate-700">
                  {ivaAmount.toLocaleString('es-VE', {minimumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-800 font-bold text-sm">TOTAL PRESUPUESTO ({budget.currency})</span>
                <span className="text-2xl font-bold text-blue-700">
                  {totalGeneral.toLocaleString('es-VE', {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>
        )}
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
