import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Package, Wrench, Users, Calculator, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { budgetService } from '../../services/budgetService';
import { API_URL } from '../../services/api';
import ComponentSearchModal from '../../components/ComponentSearchModal';

export default function BudgetAPUEditorPage() {
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchModal, setSearchModal] = useState({ isOpen: false, type: '', title: '' });
  const [syncing, setSyncing] = useState(false);

  const handleComponentChange = (type, compId, field, value) => {
    const val = parseFloat(value) || 0;
    setItem(prev => {
      const updated = { ...prev };
      updated[type] = updated[type].map(c => 
        c.id === compId ? { ...c, [field]: val } : c
      );
      return updated;
    });
  };

  const handleComponentBlur = async (type, compId, field, value) => {
    const val = parseFloat(value) || 0;
    try {
      await budgetService.updateComponent(id, itemId, type, compId, { [field]: val });
    } catch (error) {
      toast.error('Error al actualizar el componente');
      loadData(); // revert on fail
    }
  };

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
        toast.error('Partida no encontrada en este presupuesto');
        navigate(`/budgets/${id}`);
      }
      setItem(foundItem);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando APU');
    } finally {
      setLoading(false);
    }
  };

  const handlePerformanceChange = async (newPerf) => {
    const val = parseFloat(newPerf) || 1;
    setItem(prev => ({ ...prev, performance: val }));
    try {
      await budgetService.updateItem(id, itemId, { performance: val });
    } catch (error) {
      toast.error('Error actualizando rendimiento');
    }
  };

  const handleAddComponent = async (componentData) => {
    try {
      setLoading(true);
      await budgetService.addComponent(id, itemId, searchModal.type, componentData);
      toast.success('Agregado con éxito');
      setSearchModal({ isOpen: false, type: '', title: '' });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar el insumo');
      setLoading(false); // only needed if error, otherwise loadData sets it
    }
  };

  // For Maprex Style Calculations
  const calculateMaterialTotal = () => {
    return item?.materials?.reduce((sum, mat) => {
      const baseCost = mat.cantidad * mat.precio_unitario * (1 + (mat.desperdicio || 0) / 100);
      return sum + (baseCost * (1 + ((budget?.material_inflation || 0) / 100)));
    }, 0) || 0;
  };

  const calculateEquipmentTotalDay = () => {
    return item?.equipments?.reduce((sum, eq) => {
      const baseCost = eq.cantidad * (eq.depreciacion ?? 1.0) * eq.precio_unitario;
      return sum + (baseCost * (1 + ((budget?.equipment_inflation || 0) / 100)));
    }, 0) || 0;
  };

  const calculateLaborTotalJornalDay = () => {
    return item?.labors?.reduce((sum, lab) => {
      const baseCost = lab.cantidad * lab.jornal;
      return sum + (baseCost * (1 + ((budget?.labor_inflation || 0) / 100)));
    }, 0) || 0;
  };

  const calculateLaborTotalBonoDay = () => {
    return item?.labors?.reduce((sum, lab) => {
      const baseCost = lab.cantidad * (budget?.labor_bonus || 0);
      return sum + (baseCost * (1 + ((budget?.labor_inflation || 0) / 100)));
    }, 0) || 0;
  };

  const calculateLaborTotalDay = () => {
    const totJornal = calculateLaborTotalJornalDay();
    const totBono = calculateLaborTotalBonoDay();
    const fcasPercent = budget?.fcas_percent || 417; // Should this be configurable globally? Yes, using budget.fcas_percent
    const fcasMonto = totJornal * (fcasPercent / 100);
    // Assuming prestaciones are 0 for now as per image, or could be a parameter.
    return totJornal + totBono + fcasMonto;
  };

  const calculateCostosDirectos = () => {
    const matTotal = calculateMaterialTotal();
    const eqTotal = calculateEquipmentTotalDay() / (item?.performance || 1);
    const labTotal = calculateLaborTotalDay() / (item?.performance || 1);
    
    return {
      materiales: matTotal,
      equipos: eqTotal,
      manoObra: labTotal,
      subtotalA: matTotal + eqTotal + labTotal
    };
  };

  if (loading || !item || !budget) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  const costos = calculateCostosDirectos();
  const adminPercent = budget.admin_percent ?? 15.0;
  const utilPercent = budget.profit_percent ?? 10.0;
  
  const adminCost = costos.subtotalA * (adminPercent / 100);
  const subtotalB = costos.subtotalA + adminCost;
  const utilCost = subtotalB * (utilPercent / 100);
  const unitPrice = subtotalB + utilCost;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen pb-20">
      {/* TOOLBAR */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => navigate(`/budgets/${id}`)}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Calculator size={16} /> ANÁLISIS DE PRECIO UNITARIO
          </h2>
        </div>
        <div className="ml-auto">
          {/* Action buttons can go here */}
        </div>
      </div>

      {/* MAPREX STYLE TOP HEADER */}
      <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        {/* Info row */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <span className="block text-xs font-bold text-slate-400 uppercase">Referencia / Código</span>
            <span className="text-sm font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
              {item.cov_par || item.cod_par}
            </span>
          </div>
          <div className="md:col-span-3">
            <span className="block text-xs font-bold text-slate-400 uppercase">Descripción</span>
            <span className="text-sm font-medium text-slate-800 leading-tight">
              {item.description}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap border-b border-slate-200 bg-white">
          <div className="flex-1 p-3 border-r border-slate-100 min-w-[120px]">
            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Unidad</span>
            <span className="text-sm font-bold text-slate-700">{item.unit}</span>
          </div>
          <div className="flex-1 p-3 border-r border-slate-100 min-w-[120px]">
            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Cantidad</span>
            <span className="text-sm font-bold text-slate-700">{item.quantity}</span>
          </div>
          <div className="flex-1 p-3 border-r border-slate-100 min-w-[150px] bg-amber-50/30">
            <span className="block text-xs font-bold text-amber-700/70 uppercase mb-1">Rendimiento</span>
            <input 
              type="number" 
              className="w-full bg-amber-100/50 border-b-2 border-amber-300 focus:border-amber-500 focus:outline-none focus:bg-amber-100 px-1 font-bold text-amber-900 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={item.performance}
              onChange={e => setItem({...item, performance: e.target.value})}
              onBlur={e => handlePerformanceChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') e.target.blur();
              }}
            />
          </div>
          <div className="flex-1 p-3 min-w-[150px] bg-blue-50/50">
            <span className="block text-xs font-bold text-blue-500 uppercase mb-1">Precio Unitario ({budget.currency})</span>
            <span className="text-lg font-black text-blue-700">
              {unitPrice.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
          </div>
        </div>
      </div>

      {/* SECTIONS */}
      <div className="space-y-6">
        
        {/* 1. MATERIALES */}
        <div className="bg-white border border-slate-400 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-400 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Package className="text-orange-600" size={18} />
              <h3 className="font-bold text-orange-800 text-sm tracking-wide">1. MATERIALES ( {item.materials?.length || 0} )</h3>
            </div>
            <button 
              onClick={() => setSearchModal({ isOpen: true, type: 'materials', title: 'Agregar Material' })}
              className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-2 w-24 border-r border-slate-200">Ref. / Código</th>
                  <th className="p-2 border-r border-slate-200">Descripción</th>
                  <th className="p-2 w-16 text-center border-r border-slate-200">Und.</th>
                  <th className="p-2 w-24 text-right border-r border-slate-200">Cant.</th>
                  <th className="p-2 w-20 text-right border-r border-slate-200">Desp. %</th>
                  <th className="p-2 w-32 text-right border-r border-slate-200">Precio</th>
                  <th className="p-2 w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {item.materials?.map(mat => (
                  <tr key={mat.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-mono text-xs">{mat.codigo}</td>
                    <td className="p-2 border-r border-slate-200 text-xs">{mat.descripcion}</td>
                    <td className="p-2 text-center border-r border-slate-200 text-xs">{mat.unidad}</td>
                    <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={mat.cantidad}
                        onChange={e => handleComponentChange('materials', mat.id, 'cantidad', e.target.value)}
                        onBlur={e => handleComponentBlur('materials', mat.id, 'cantidad', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={mat.desperdicio || 0}
                        onChange={e => handleComponentChange('materials', mat.id, 'desperdicio', e.target.value)}
                        onBlur={e => handleComponentBlur('materials', mat.id, 'desperdicio', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={mat.precio_unitario}
                        onChange={e => handleComponentChange('materials', mat.id, 'precio_unitario', e.target.value)}
                        onBlur={e => handleComponentBlur('materials', mat.id, 'precio_unitario', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 text-xs">
                      {((mat.cantidad * mat.precio_unitario * (1 + (mat.desperdicio || 0) / 100)) * (1 + ((budget?.material_inflation || 0) / 100))).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </td>
                  </tr>
                ))}
                {(!item.materials || item.materials.length === 0) && (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-400 text-xs">Sin materiales</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-300 flex justify-end items-center gap-4">
            <span className="text-xs font-bold text-slate-600 uppercase">Total Materiales:</span>
            <span className="text-sm font-black text-slate-800 bg-white border border-slate-300 px-3 py-1 rounded min-w-[120px] text-right">
              {calculateMaterialTotal().toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </span>
          </div>
        </div>

        {/* 2. EQUIPOS */}
        <div className="bg-white border border-slate-400 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-400 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wrench className="text-indigo-600" size={18} />
              <h3 className="font-bold text-indigo-800 text-sm tracking-wide">2. EQUIPOS ( {item.equipments?.length || 0} )</h3>
            </div>
            <button 
              onClick={() => setSearchModal({ isOpen: true, type: 'equipments', title: 'Agregar Equipo' })}
              className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-2 w-24 border-r border-slate-200">Ref. / Código</th>
                  <th className="p-2 border-r border-slate-200">Descripción</th>
                  <th className="p-2 w-24 text-right border-r border-slate-200">Cant.</th>
                  <th className="p-2 w-24 text-right border-r border-slate-200">COP/Dep/Al</th>
                  <th className="p-2 w-32 text-right border-r border-slate-200">Precio</th>
                  <th className="p-2 w-32 text-right">Total Día</th>
                </tr>
              </thead>
              <tbody>
                {item.equipments?.map(eq => (
                  <tr key={eq.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-mono text-xs">{eq.codigo}</td>
                    <td className="p-2 border-r border-slate-200 text-xs">{eq.descripcion}</td>
                    <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={eq.cantidad}
                        onChange={e => handleComponentChange('equipments', eq.id, 'cantidad', e.target.value)}
                        onBlur={e => handleComponentBlur('equipments', eq.id, 'cantidad', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={eq.depreciacion ?? 1.0}
                        onChange={e => handleComponentChange('equipments', eq.id, 'depreciacion', e.target.value)}
                        onBlur={e => handleComponentBlur('equipments', eq.id, 'depreciacion', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                      <input 
                        type="number" 
                        className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={eq.precio_unitario}
                        onChange={e => handleComponentChange('equipments', eq.id, 'precio_unitario', e.target.value)}
                        onBlur={e => handleComponentBlur('equipments', eq.id, 'precio_unitario', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 text-xs">
                      {(eq.cantidad * (eq.depreciacion ?? 1.0) * eq.precio_unitario * (1 + ((budget?.equipment_inflation || 0) / 100))).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </td>
                  </tr>
                ))}
                {(!item.equipments || item.equipments.length === 0) && (
                  <tr><td colSpan="6" className="p-4 text-center text-slate-400 text-xs">Sin equipos</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-300 flex justify-end items-center gap-4">
            <span className="text-xs font-bold text-slate-600 uppercase">Total Equipos (Día):</span>
            <span className="text-sm font-black text-slate-800 bg-white border border-slate-300 px-3 py-1 rounded min-w-[120px] text-right">
              {calculateEquipmentTotalDay().toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </span>
          </div>
        </div>

        {/* 3. MANO DE OBRA */}
        <div className="bg-white border border-slate-400 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-400 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="text-teal-600" size={18} />
              <h3 className="font-bold text-teal-800 text-sm tracking-wide">3. MANO DE OBRA ( {item.labors?.length || 0} )</h3>
            </div>
            <button 
              onClick={() => setSearchModal({ isOpen: true, type: 'labors', title: 'Agregar Personal' })}
              className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-2 w-24 border-r border-slate-200">Ref. / Código</th>
                  <th className="p-2 border-r border-slate-200">Descripción</th>
                  <th className="p-2 w-24 text-right border-r border-slate-200">Cuadrilla</th>
                  <th className="p-2 w-28 text-right border-r border-slate-200">Jornal</th>
                  <th className="p-2 w-28 text-right border-r border-slate-200">Bono</th>
                  <th className="p-2 w-32 text-right border-r border-slate-200">Total Jornal</th>
                  <th className="p-2 w-32 text-right">Total Bono</th>
                </tr>
              </thead>
              <tbody>
                {item.labors?.map(lab => {
                  const totalJornal = lab.cantidad * lab.jornal;
                  const totalBono = lab.cantidad * (budget?.labor_bonus || 0);
                  return (
                    <tr key={lab.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-mono text-xs">{lab.codigo}</td>
                      <td className="p-2 border-r border-slate-200 text-xs">{lab.descripcion}</td>
                      <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                        <input 
                          type="number" 
                          className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={lab.cantidad}
                          onChange={e => handleComponentChange('labors', lab.id, 'cantidad', e.target.value)}
                          onBlur={e => handleComponentBlur('labors', lab.id, 'cantidad', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                        <input 
                          type="number" 
                          className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={lab.jornal}
                          onChange={e => handleComponentChange('labors', lab.id, 'jornal', e.target.value)}
                          onBlur={e => handleComponentBlur('labors', lab.id, 'jornal', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                        <input 
                          type="number" 
                          className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={budget?.labor_bonus || 0}
                          disabled
                          title="El bono se configura de manera global en el Presupuesto"
                        />
                      </td>
                      <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 border-r border-slate-200 text-xs">
                        {(totalJornal * (1 + ((budget?.labor_inflation || 0) / 100))).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                      <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 text-xs">
                        {(totalBono * (1 + ((budget?.labor_inflation || 0) / 100))).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                    </tr>
                  )
                })}
                {(!item.labors || item.labors.length === 0) && (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-400 text-xs">Sin mano de obra</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-300">
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-4 w-full md:w-1/2 justify-between">
                <span className="text-xs font-bold text-slate-600">Total Jornal:</span>
                <span className="text-sm font-semibold text-slate-700">{calculateLaborTotalJornalDay().toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2 justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-800 px-1 border border-teal-300 rounded text-[10px]">{budget.fcas_percent}%</span>
                  F.C.A.S / Prestaciones Sociales:
                </span>
                <span className="text-sm font-semibold text-slate-700">{(calculateLaborTotalJornalDay() * ((budget.fcas_percent || 417)/100)).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2 justify-between">
                <span className="text-xs font-bold text-slate-600">Total Bono:</span>
                <span className="text-sm font-semibold text-slate-700">{calculateLaborTotalBonoDay().toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div className="flex items-center gap-4 w-full md:w-1/2 justify-between mt-2 pt-2 border-t-2 border-slate-300">
                <span className="text-sm font-bold text-slate-800 uppercase">Total Mano de Obra (Día):</span>
                <span className="text-base font-black text-slate-800 bg-white border border-slate-400 px-3 py-1 rounded min-w-[120px] text-right shadow-sm">
                  {calculateLaborTotalDay().toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SUMMARY BLOCK (Maprex Style) */}
        <div className="flex justify-end mt-8">
          <div className="w-full md:w-[450px] bg-slate-50 border border-slate-300 shadow-md p-1">
            <table className="w-full text-xs font-bold text-slate-700 border-collapse">
              <tbody>
                <tr>
                  <td className="p-2 text-right border-b border-slate-200">COSTO DIRECTO SUBTOTAL A:</td>
                  <td className="p-2 w-32 text-right border-b border-slate-200 bg-white">
                    {costos.subtotalA.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-right border-b border-slate-200 flex items-center justify-end gap-2">
                    <span className="bg-amber-100 text-amber-800 px-1 border border-amber-300 rounded">% {adminPercent}</span>
                    ADMINISTRACIÓN Y GASTOS GENERALES:
                  </td>
                  <td className="p-2 w-32 text-right border-b border-slate-200 bg-white text-slate-500">
                    {adminCost.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-right border-b border-slate-200">SUBTOTAL B:</td>
                  <td className="p-2 w-32 text-right border-b border-slate-200 bg-white">
                    {subtotalB.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-right border-b border-slate-200 flex items-center justify-end gap-2">
                    <span className="bg-amber-100 text-amber-800 px-1 border border-amber-300 rounded">% {utilPercent}</span>
                    UTILIDAD E IMPREVISTOS:
                  </td>
                  <td className="p-2 w-32 text-right border-b border-slate-200 bg-white text-slate-500">
                    {utilCost.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-right border-b border-slate-200">SUBTOTAL C (Precio sin I.V.A):</td>
                  <td className="p-2 w-32 text-right border-b border-slate-200 bg-white">
                    {unitPrice.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="p-3 text-right text-blue-800 text-sm">PRECIO UNITARIO ({budget.currency}):</td>
                  <td className="p-3 w-32 text-right bg-white text-blue-800 font-black text-sm border border-blue-200">
                    {unitPrice.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Component Search Modal */}
      <ComponentSearchModal 
        isOpen={searchModal.isOpen} 
        type={searchModal.type} 
        title={searchModal.title}
        onClose={() => setSearchModal({ isOpen: false, type: '', title: '' })}
        onAdd={handleAddComponent}
      />
    </div>
  );
}
