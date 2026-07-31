import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Package, Wrench, Users, Calculator, Save, Sparkles, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateAIApu, saveCustomApu } from '../services/cost360Service';

export default function AIApuGeneratorPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState(null);

  // Defaults for calculations
  const [settings, setSettings] = useState({
    fcas_percent: 417,
    admin_percent: 15.0,
    profit_percent: 10.0,
    labor_bonus: 0,
    currency: 'USD'
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Ingresa una descripción para generar el APU");
      return;
    }
    setLoading(true);
    setItem(null);
    try {
      const response = await generateAIApu(prompt);
      // Map response to the format expected by the editor
      setItem({
        ...response.partida,
        materials: response.materials || [],
        equipments: response.equipments || [],
        labors: response.labors || []
      });
      toast.success("APU generado con IA");
    } catch (error) {
      console.error(error);
      toast.error("Error al generar APU con IA");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await saveCustomApu({
        description: item.description,
        unit: item.unit,
        performance: item.performance,
        apu_data: JSON.stringify(item)
      });
      toast.success("APU guardado exitosamente");
      // Optional: navigate back to list or reset
      setTimeout(() => navigate('/cost360'), 1500);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar APU");
    } finally {
      setSaving(false);
    }
  };

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

  const renderOrigenTag = (origen) => {
    if (origen === 'historico') return <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[9px] font-bold rounded shadow-sm border border-yellow-200" title="Basado en rendimiento histórico">PROMEDIO</span>;
    if (origen === 'catalogo') return <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded shadow-sm border border-green-200" title="Extraído del catálogo">CATÁLOGO</span>;
    if (origen === 'ia') return <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded shadow-sm border border-red-200" title="Estimado por IA (Revisar)">ESTIMADO IA</span>;
    return null;
  };

  // Calculations
  const calculateMaterialTotal = () => {
    return item?.materials?.reduce((sum, mat) => {
      return sum + (mat.cantidad * mat.precio_unitario * (1 + (mat.desperdicio || 0) / 100));
    }, 0) || 0;
  };

  const calculateEquipmentTotalDay = () => {
    return item?.equipments?.reduce((sum, eq) => {
      return sum + (eq.cantidad * (eq.depreciacion ?? 1.0) * eq.precio_unitario);
    }, 0) || 0;
  };

  const calculateLaborTotalJornalDay = () => {
    return item?.labors?.reduce((sum, lab) => {
      return sum + (lab.cantidad * lab.jornal);
    }, 0) || 0;
  };

  const calculateLaborTotalBonoDay = () => {
    return item?.labors?.reduce((sum, lab) => {
      return sum + (lab.cantidad * settings.labor_bonus);
    }, 0) || 0;
  };

  const calculateLaborTotalDay = () => {
    const totJornal = calculateLaborTotalJornalDay();
    const totBono = calculateLaborTotalBonoDay();
    const fcasMonto = totJornal * (settings.fcas_percent / 100);
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/cost360')}
            className="p-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 hover:text-blue-600 transition-colors shrink-0 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={20} className="text-red-500" /> 
            Generador de APU con IA
          </h2>
        </div>
      </div>

      {/* PROMPT SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <label className="block text-sm font-bold text-slate-700 mb-2">Describe la partida a generar</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Fundición de losa de entrepiso de concreto f'c=210 kg/cm2, espesor 15 cm, con acero de refuerzo fy=4200 kg/cm2"
          className="w-full h-24 p-4 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm mb-4"
          disabled={loading}
        />
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-sm font-bold disabled:opacity-50"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? 'Generando...' : 'Generar APU'}
          </button>
        </div>
      </div>

      {item && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <span className="block text-xs font-bold text-slate-400 uppercase">Código</span>
                <span className="text-sm font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                  {item.cod_par}
                </span>
              </div>
              <div className="md:col-span-3">
                <span className="block text-xs font-bold text-slate-400 uppercase">Descripción</span>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-blue-500"
                  value={item.description}
                  onChange={e => setItem({...item, description: e.target.value})}
                />
              </div>
            </div>

            <div className="flex flex-wrap border-b border-slate-200 bg-white">
              <div className="flex-1 p-3 border-r border-slate-100 min-w-[120px]">
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Unidad</span>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  value={item.unit}
                  onChange={e => setItem({...item, unit: e.target.value})}
                />
              </div>
              <div className="flex-1 p-3 border-r border-slate-100 min-w-[120px]">
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Cantidad Base</span>
                <span className="text-sm font-bold text-slate-700">1</span>
              </div>
              <div className="flex-1 p-3 border-r border-slate-100 min-w-[150px] bg-amber-50/30">
                <span className="block text-xs font-bold text-amber-700/70 uppercase mb-1">Rendimiento</span>
                <input 
                  type="number" 
                  className="w-full bg-amber-100/50 border-b-2 border-amber-300 focus:border-amber-500 focus:outline-none focus:bg-amber-100 px-1 font-bold text-amber-900 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={item.performance}
                  onChange={e => setItem({...item, performance: e.target.value})}
                />
              </div>
              <div className="flex-1 p-3 min-w-[150px] bg-blue-50/50">
                <span className="block text-xs font-bold text-blue-500 uppercase mb-1">Precio Unitario ({settings.currency})</span>
                <span className="text-lg font-black text-blue-700">
                  {((calculateCostosDirectos().subtotalA * (1 + (settings.admin_percent/100))) * (1 + (settings.profit_percent/100))).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. MATERIALES */}
            <div className="bg-white border border-slate-400 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-400 flex items-center gap-2">
                <Package className="text-orange-600" size={18} />
                <h3 className="font-bold text-orange-800 text-sm tracking-wide">1. MATERIALES ( {item.materials?.length || 0} )</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-2 w-24 border-r border-slate-200">Ref.</th>
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
                        <td className="p-2 border-r border-slate-200 text-xs">
                          {mat.descripcion}
                          <div className="mt-1">{renderOrigenTag(mat.origen)}</div>
                        </td>
                        <td className="p-2 text-center border-r border-slate-200 text-xs">{mat.unidad}</td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={mat.cantidad}
                            onChange={e => handleComponentChange('materials', mat.id, 'cantidad', e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={mat.desperdicio || 0}
                            onChange={e => handleComponentChange('materials', mat.id, 'desperdicio', e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={mat.precio_unitario}
                            onChange={e => handleComponentChange('materials', mat.id, 'precio_unitario', e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 text-xs">
                          {(mat.cantidad * mat.precio_unitario * (1 + (mat.desperdicio || 0) / 100)).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                        </td>
                      </tr>
                    ))}
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
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-400 flex items-center gap-2">
                <Wrench className="text-indigo-600" size={18} />
                <h3 className="font-bold text-indigo-800 text-sm tracking-wide">2. EQUIPOS ( {item.equipments?.length || 0} )</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-2 w-24 border-r border-slate-200">Ref.</th>
                      <th className="p-2 border-r border-slate-200">Descripción</th>
                      <th className="p-2 w-24 text-right border-r border-slate-200">Cant.</th>
                      <th className="p-2 w-24 text-right border-r border-slate-200">Deprec.</th>
                      <th className="p-2 w-32 text-right border-r border-slate-200">Precio</th>
                      <th className="p-2 w-32 text-right">Total Día</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.equipments?.map(eq => (
                      <tr key={eq.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono text-xs">{eq.codigo}</td>
                        <td className="p-2 border-r border-slate-200 text-xs">
                          {eq.descripcion}
                          <div className="mt-1">{renderOrigenTag(eq.origen)}</div>
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={eq.cantidad}
                            onChange={e => handleComponentChange('equipments', eq.id, 'cantidad', e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={eq.depreciacion ?? 1.0}
                            onChange={e => handleComponentChange('equipments', eq.id, 'depreciacion', e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={eq.precio_unitario}
                            onChange={e => handleComponentChange('equipments', eq.id, 'precio_unitario', e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 text-xs">
                          {(eq.cantidad * (eq.depreciacion ?? 1.0) * eq.precio_unitario).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                        </td>
                      </tr>
                    ))}
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
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-400 flex items-center gap-2">
                <Users className="text-teal-600" size={18} />
                <h3 className="font-bold text-teal-800 text-sm tracking-wide">3. MANO DE OBRA ( {item.labors?.length || 0} )</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-2 w-24 border-r border-slate-200">Ref.</th>
                      <th className="p-2 border-r border-slate-200">Descripción</th>
                      <th className="p-2 w-24 text-right border-r border-slate-200">Cant.</th>
                      <th className="p-2 w-28 text-right border-r border-slate-200">Jornal</th>
                      <th className="p-2 w-28 text-right border-r border-slate-200">Bono</th>
                      <th className="p-2 w-32 text-right border-r border-slate-200">Total Jornal</th>
                      <th className="p-2 w-32 text-right">Total Bono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.labors?.map(lab => (
                      <tr key={lab.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono text-xs">{lab.codigo}</td>
                        <td className="p-2 border-r border-slate-200 text-xs">
                          {lab.descripcion}
                          <div className="mt-1">{renderOrigenTag(lab.origen)}</div>
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={lab.cantidad}
                            onChange={e => handleComponentChange('labors', lab.id, 'cantidad', e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={lab.jornal}
                            onChange={e => handleComponentChange('labors', lab.id, 'jornal', e.target.value)}
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200 bg-amber-50/40">
                          <input 
                            type="number" 
                            className="w-full text-right bg-transparent border-b border-amber-200 focus:border-amber-500 focus:outline-none focus:bg-amber-100 text-xs font-medium [appearance:textfield]"
                            value={settings.labor_bonus}
                            disabled
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 border-r border-slate-200 text-xs">
                          {(lab.cantidad * lab.jornal).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                        </td>
                        <td className="p-2 text-right font-semibold text-slate-700 bg-slate-50 text-xs">
                          {(lab.cantidad * settings.labor_bonus).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 p-4 border-t border-slate-300">
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-4 w-full md:w-1/2 justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                      <span className="bg-teal-100 text-teal-800 px-1 border border-teal-300 rounded text-[10px]">{settings.fcas_percent}%</span>
                      F.C.A.S / Prestaciones:
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{(calculateLaborTotalJornalDay() * (settings.fcas_percent/100)).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
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

            {/* BOTTOM SUMMARY BLOCK */}
            <div className="flex justify-end mt-8">
              <div className="w-full md:w-[450px] bg-slate-50 border border-slate-300 shadow-md p-1">
                <table className="w-full text-xs font-bold text-slate-700 border-collapse">
                  <tbody>
                    <tr>
                      <td className="p-2 text-right border-b border-slate-200">COSTO DIRECTO SUBTOTAL A:</td>
                      <td className="p-2 w-32 text-right border-b border-slate-200 bg-white">
                        {calculateCostosDirectos().subtotalA.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-right border-b border-slate-200 flex items-center justify-end gap-2">
                        <input 
                          type="number"
                          className="w-12 text-center bg-amber-100 text-amber-800 border border-amber-300 rounded [appearance:textfield]"
                          value={settings.admin_percent}
                          onChange={(e) => setSettings({...settings, admin_percent: parseFloat(e.target.value) || 0})}
                        />%
                        ADMINISTRACIÓN:
                      </td>
                      <td className="p-2 w-32 text-right border-b border-slate-200 bg-white text-slate-500">
                        {(calculateCostosDirectos().subtotalA * (settings.admin_percent / 100)).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-right border-b border-slate-200">SUBTOTAL B:</td>
                      <td className="p-2 w-32 text-right border-b border-slate-200 bg-white">
                        {(calculateCostosDirectos().subtotalA * (1 + (settings.admin_percent / 100))).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-right border-b border-slate-200 flex items-center justify-end gap-2">
                        <input 
                          type="number"
                          className="w-12 text-center bg-amber-100 text-amber-800 border border-amber-300 rounded [appearance:textfield]"
                          value={settings.profit_percent}
                          onChange={(e) => setSettings({...settings, profit_percent: parseFloat(e.target.value) || 0})}
                        />%
                        UTILIDAD:
                      </td>
                      <td className="p-2 w-32 text-right border-b border-slate-200 bg-white text-slate-500">
                        {((calculateCostosDirectos().subtotalA * (1 + (settings.admin_percent / 100))) * (settings.profit_percent / 100)).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="p-3 text-right text-blue-800 text-sm">PRECIO UNITARIO:</td>
                      <td className="p-3 w-32 text-right bg-white text-blue-800 font-black text-sm border border-blue-200">
                        {((calculateCostosDirectos().subtotalA * (1 + (settings.admin_percent/100))) * (1 + (settings.profit_percent/100))).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end pt-6 border-t border-slate-200 mt-6">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow font-bold disabled:opacity-50"
              >
                {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'Guardando...' : 'Guardar APU Generado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
