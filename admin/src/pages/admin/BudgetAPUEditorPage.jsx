import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Package, Wrench, Users, Percent, Search } from 'lucide-react';
import { budgetService } from '../../services/budgetService';

export default function BudgetAPUEditorPage() {
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState('materiales');

  useEffect(() => {
    loadData();
  }, [id, itemId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const budgetData = await budgetService.getById(id);
      setBudget(budgetData);
      
      const foundItem = budgetData.items.find(i => i.id === itemId);
      if (!foundItem) {
        alert('Partida no encontrada en este presupuesto');
        navigate(`/budgets/${id}`);
      }
      setItem(foundItem);
    } catch (error) {
      console.error(error);
      alert('Error cargando APU');
    } finally {
      setLoading(false);
    }
  };

  const calculateMaterialTotal = () => {
    return item?.materials?.reduce((sum, mat) => sum + (mat.cantidad * mat.precio_unitario), 0) || 0;
  };

  const calculateEquipmentTotal = () => {
    return item?.equipments?.reduce((sum, eq) => sum + (eq.cantidad * eq.precio_unitario), 0) || 0;
  };

  const calculateLaborTotal = () => {
    const fcasFactor = 1 + (budget?.fcas_percent / 100);
    return item?.labors?.reduce((sum, lab) => {
      const costoDiario = (lab.jornal * fcasFactor) + lab.bono;
      return sum + (lab.cantidad * costoDiario);
    }, 0) || 0;
  };

  const calculateUnitCost = () => {
    const mat = calculateMaterialTotal();
    const eq = calculateEquipmentTotal();
    const lab = calculateLaborTotal();
    return mat + eq + lab;
  };

  if (loading || !item || !budget) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex items-start gap-4 mb-8">
        <button 
          onClick={() => navigate(`/budgets/${id}`)}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0 mt-1"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
              {item.cov_par || item.cod_par}
            </span>
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold tracking-wider">
              UND: {item.unit}
            </span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs font-bold tracking-wider flex items-center gap-1">
              <Percent size={12}/> REND: {item.performance}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            {item.description}
          </h1>
        </div>
        
        {/* SUMMARY CARD */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shrink-0 min-w-[200px] shadow-xl shadow-slate-900/20">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Costo Unitario</p>
          <div className="text-2xl font-bold flex items-baseline gap-1">
            <span className="text-sm text-slate-400 font-normal">{budget.currency}</span>
            {calculateUnitCost().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
        <button 
          onClick={() => setActiveTab('materiales')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'materiales' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Package size={16} /> Materiales
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">{item.materials.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('equipos')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'equipos' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Wrench size={16} /> Equipos
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">{item.equipments.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('mano_obra')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'mano_obra' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} /> Mano de Obra
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">{item.labors.length}</span>
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {/* MATERIALES */}
        {activeTab === 'materiales' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 w-32">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 w-20 text-center">Und</th>
                <th className="p-4 w-28 text-right">Cantidad</th>
                <th className="p-4 w-32 text-right">Precio ({budget.currency})</th>
                <th className="p-4 w-32 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {item.materials.map(mat => (
                <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-mono text-slate-500">{mat.codigo}</td>
                  <td className="p-4 text-sm text-slate-800">{mat.descripcion}</td>
                  <td className="p-4 text-center text-sm font-medium text-slate-500">{mat.unidad}</td>
                  <td className="p-4 text-right">
                    <input 
                      type="number" 
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:bg-blue-50 py-1 transition-all"
                      value={mat.cantidad}
                      onChange={() => {}}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <input 
                      type="number" 
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:bg-blue-50 py-1 transition-all"
                      value={mat.precio_unitario}
                      onChange={() => {}}
                    />
                  </td>
                  <td className="p-4 text-right text-sm font-bold text-slate-700">
                    {(mat.cantidad * mat.precio_unitario).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
              ))}
              {item.materials.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay materiales asociados</td></tr>
              )}
            </tbody>
            {item.materials.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan="5" className="p-4 text-right font-bold text-slate-600 text-sm">TOTAL MATERIALES:</td>
                  <td className="p-4 text-right font-bold text-blue-600 text-sm">
                    {calculateMaterialTotal().toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* EQUIPOS */}
        {activeTab === 'equipos' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 w-32">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 w-28 text-right">Cantidad</th>
                <th className="p-4 w-32 text-right">Tarifa Diaria</th>
                <th className="p-4 w-32 text-right">Total / Día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {item.equipments.map(eq => (
                <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-mono text-slate-500">{eq.codigo}</td>
                  <td className="p-4 text-sm text-slate-800">{eq.descripcion}</td>
                  <td className="p-4 text-right">
                    <input 
                      type="number" 
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:outline-none focus:bg-indigo-50 py-1 transition-all"
                      value={eq.cantidad}
                      onChange={() => {}}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <input 
                      type="number" 
                      className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:outline-none focus:bg-indigo-50 py-1 transition-all"
                      value={eq.precio_unitario}
                      onChange={() => {}}
                    />
                  </td>
                  <td className="p-4 text-right text-sm font-bold text-slate-700">
                    {(eq.cantidad * eq.precio_unitario).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
              ))}
              {item.equipments.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay equipos asociados</td></tr>
              )}
            </tbody>
            {item.equipments.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan="4" className="p-4 text-right font-bold text-slate-600 text-sm">COSTO EQUIPOS POR DÍA:</td>
                  <td className="p-4 text-right font-bold text-indigo-600 text-sm">
                    {calculateEquipmentTotal().toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* MANO DE OBRA */}
        {activeTab === 'mano_obra' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 w-32">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 w-28 text-right">Cantidad</th>
                <th className="p-4 w-28 text-right">Jornal</th>
                <th className="p-4 w-28 text-right">Bono</th>
                <th className="p-4 w-32 text-right">Total Diario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {item.labors.map(lab => {
                const fcasFactor = 1 + (budget.fcas_percent / 100);
                const costoDiario = (lab.jornal * fcasFactor) + lab.bono;
                const totalDiario = lab.cantidad * costoDiario;
                return (
                  <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-500">{lab.codigo}</td>
                    <td className="p-4 text-sm text-slate-800">{lab.descripcion}</td>
                    <td className="p-4 text-right">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:bg-teal-50 py-1 transition-all"
                        value={lab.cantidad}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:bg-teal-50 py-1 transition-all"
                        value={lab.jornal}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-dashed border-slate-300 hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:bg-teal-50 py-1 transition-all"
                        value={lab.bono}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-slate-700">
                      {totalDiario.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </td>
                  </tr>
                );
              })}
              {item.labors.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay mano de obra asociada</td></tr>
              )}
            </tbody>
            {item.labors.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan="5" className="p-4 text-right font-bold text-slate-600 text-sm">
                    COSTO MANO DE OBRA POR DÍA (Inc. FCAS {budget.fcas_percent}%):
                  </td>
                  <td className="p-4 text-right font-bold text-teal-600 text-sm">
                    {calculateLaborTotal().toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
