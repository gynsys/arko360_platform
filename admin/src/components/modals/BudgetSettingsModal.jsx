import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, DollarSign, Hash, Percent } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { budgetService } from '../../services/budgetService';

export default function BudgetSettingsModal({ budget, onClose, onSave }) {
  const [configTab, setConfigTab] = useState('general');
  const [settings, setSettings] = useState({
    currency: budget.currency || 'USD',
    exchange_rate: budget.exchange_rate || 1.0,
    fcas_percent: budget.fcas_percent || 417.0,
    admin_percent: budget.admin_percent ?? 15.0,
    profit_percent: budget.profit_percent ?? 10.0,
    iva_percent: budget.iva_percent ?? 16.0,
    labor_bonus: budget.labor_bonus ?? 0.0,
    material_inflation: budget.material_inflation ?? 0.0,
    labor_inflation: budget.labor_inflation ?? 0.0,
    equipment_inflation: budget.equipment_inflation ?? 0.0,
    company_name: budget.company_name || '',
    company_rif: budget.company_rif || '',
    client_name: budget.client_name || '',
    project_name: budget.project_name || ''
  });

  const handleSaveSettings = async () => {
    try {
      await budgetService.update(budget.id, settings);
      toast.success('Configuración guardada exitosamente');
      onSave(settings);
    } catch (error) {
      toast.error('Error guardando configuración');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-500" /> Configuración del Presupuesto
          </h2>
          <button 
            onClick={onClose}
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
                onChange={e => setSettings({...settings, exchange_rate: e.target.value})}
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
                onChange={e => setSettings({...settings, fcas_percent: e.target.value})}
                className="w-full bg-slate-50 border border-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
              />
            </div>
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
                onChange={e => setSettings({...settings, material_inflation: e.target.value})}
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
                onChange={e => setSettings({...settings, equipment_inflation: e.target.value})}
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
                onChange={e => setSettings({...settings, labor_inflation: e.target.value})}
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
                onChange={e => setSettings({...settings, labor_bonus: e.target.value})}
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
                onChange={e => setSettings({...settings, admin_percent: e.target.value})}
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
                onChange={e => setSettings({...settings, profit_percent: e.target.value})}
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
                onChange={e => setSettings({...settings, iva_percent: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
            <button 
              onClick={onClose}
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
      </div>,
    document.body
  );
}
