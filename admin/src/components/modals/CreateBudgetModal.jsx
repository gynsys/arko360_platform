import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, DollarSign, Hash, Percent } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { budgetService } from '../../services/budgetService';

export default function CreateBudgetModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    company_rif: '',
    client_name: '',
    currency: 'USD',
    exchange_rate: 1.0,
    fcas_percent: 417.0,
    labor_bonus: 0.0,
    admin_percent: 15.0,
    profit_percent: 10.0,
    iva_percent: 16.0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del proyecto es obligatorio');
      return;
    }
    
    try {
      setLoading(true);
      // Pass all the form data so the backend can save it upon creation
      const newBudget = await budgetService.create({ 
        ...formData,
        name: formData.name.trim(),
        project_name: formData.name.trim() // Usually the name is the project name
      });
      toast.success('Presupuesto creado con éxito');
      onSuccess(newBudget);
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Nuevo Presupuesto</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-4 text-sm">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del Proyecto <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="name"
                  autoFocus
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej. Construcción Casa Modelo A"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Empresa</label>
                <input 
                  type="text" 
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">RIF / ID</label>
                <input 
                  type="text" 
                  name="company_rif"
                  value={formData.company_rif}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Contratante / Cliente</label>
                <input 
                  type="text" 
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
            </div>

            <hr className="border-slate-100 my-2" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <DollarSign size={12}/> Moneda Base
                </label>
                <select 
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                >
                  <option value="USD">Dólares (USD)</option>
                  <option value="BS">Bolívares (BS)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Hash size={12}/> Tasa (BS/USD)
                </label>
                <input 
                  type="number" step="0.01" name="exchange_rate"
                  value={formData.exchange_rate} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Percent size={12}/> FCAS Global
                </label>
                <input 
                  type="number" step="1" name="fcas_percent"
                  value={formData.fcas_percent} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <DollarSign size={12}/> Bono M.O.
                </label>
                <input 
                  type="number" step="0.01" name="labor_bonus"
                  value={formData.labor_bonus} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Percent size={12}/> Admin.
                </label>
                <input 
                  type="number" step="1" name="admin_percent"
                  value={formData.admin_percent} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Percent size={12}/> Utilidad
                </label>
                <input 
                  type="number" step="1" name="profit_percent"
                  value={formData.profit_percent} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Percent size={12}/> I.V.A
                </label>
                <input 
                  type="number" step="1" name="iva_percent"
                  value={formData.iva_percent} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-blue-500"
                />
              </div>
            </div>

            <hr className="border-slate-100 my-2" />

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Logo de la Empresa (Opcional)</label>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                  <UploadCloud size={20} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium mb-1">Cargar imagen del logo</p>
                  <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-block">
                    Explorar archivos
                    <input type="file" className="hidden" accept="image/png, image/jpeg" />
                  </label>
                </div>
              </div>
            </div>
            
          </div>
          
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
