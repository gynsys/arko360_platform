import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader, Package, Wrench, Users, Calculator, Save, Sparkles, Check, Filter, Plus, Search, FileText, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateAIApu, saveCustomApu, fetchCategoriesTree, fetchItems, fetchApuDetails } from '../services/cost360Service';
import { cost360DatabaseService } from '../../../services/cost360DatabaseService';
import ApuEditorUI from '../../../components/ApuEditorUI';

export default function AIApuGeneratorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  
  const [creationMode, setCreationMode] = useState(modeParam || 'ia'); // 'ia', 'manual', 'import'
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState(null);
  const searchTimeoutRef = useRef(null);

  const [categoriesTree, setCategoriesTree] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDesc, setSearchDesc] = useState(true);
  const [searchInsumos, setSearchInsumos] = useState(false);
  const [searchChapter, setSearchChapter] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('master');

  useEffect(() => {
    fetchCategoriesTree().then(setCategoriesTree).catch(console.error);
    const loadDatabases = async () => {
      try {
        const dbs = await cost360DatabaseService.getAll();
        const loadedDbs = dbs.databases || [];
        if (!loadedDbs.find(db => db.id === 'personalizada')) {
          loadedDbs.push({ id: 'personalizada', name: 'Base Personalizada', is_master: false });
        }
        setDatabases(loadedDbs);
      } catch (err) {
        console.error("Error loading databases", err);
      }
    };
    loadDatabases();
  }, []);

  // Defaults for calculations
  const [settings, setSettings] = useState({
    fcas_percent: 417,
    admin_percent: 15.0,
    profit_percent: 10.0,
    iva_percent: 16.0,
    labor_bonus: 0,
    currency: 'USD'
  });

  const handleCreateManual = () => {
    setItem({
      cod_par: "CUST-" + Math.floor(Math.random() * 10000),
      description: "Nueva Partida Personalizada",
      unit: "und",
      performance: 1,
      materials: [],
      equipments: [],
      labors: [],
      advertencias: []
    });
  };

  useEffect(() => {
    if (modeParam === 'manual') {
      setCreationMode('manual');
      handleCreateManual();
    } else if (modeParam === 'import') {
      setCreationMode('import');
      setItem(null);
    } else if (modeParam === 'ia') {
      setCreationMode('ia');
      setItem(null);
    }
  }, [modeParam]);

  const triggerSearch = async (query = searchQuery, chapter = searchChapter, db = selectedDatabase) => {
    setIsSearching(true);
    try {
      const data = await fetchItems(0, 50, query, chapter, db, searchDesc, searchInsumos);
      setSearchResults(data.items || []);
      setTotalMatches(data.total || (data.items || []).length);
    } catch (error) {
      toast.error('Error al buscar partidas');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  // Al cambiar la base de datos o el tipo de búsqueda, disparamos la búsqueda automáticamente
  useEffect(() => {
    if (creationMode === 'import') {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        triggerSearch(searchQuery, searchChapter, selectedDatabase);
      }, 400);
    }
  }, [selectedDatabase, searchDesc, searchInsumos, creationMode]);

  const handleSearchToImport = async (e) => {
    e.preventDefault();
    triggerSearch();
  };

  const handleImportApu = async (itemCode) => {
    try {
      setLoading(true);
      const data = await fetchApuDetails(itemCode, selectedDatabase);
      
      setItem({
        cod_par: data.partida.CodPar,
        description: data.partida.Descri,
        unit: data.partida.UniPar,
        performance: data.partida.RenPar || 1,
        materials: (data.materiales || []).map(m => ({ id: m.codigo, codigo: m.codigo, descripcion: m.descripcion, unidad: m.unidad, cantidad: m.cantidad, precio_unitario: m.precio_unitario, desperdicio: m.desperdicio || 5, origen: 'historico' })),
        equipments: (data.equipos || []).map(e => ({ id: e.codigo, codigo: e.codigo, descripcion: e.descripcion, unidad: 'día', cantidad: e.cantidad, precio_unitario: e.precio_unitario, depreciacion: e.depreciacion || 1.0, origen: 'historico' })),
        labors: (data.mano_obra || []).map(l => ({ id: l.codigo, codigo: l.codigo, descripcion: l.descripcion, unidad: 'día', cantidad: l.cantidad, jornal: l.jornal, bono: l.bono, origen: 'historico' })),
        advertencias: []
      });
      toast.success('APU importado correctamente. Ahora puedes editarlo.');
      setSearchResults([]);
      setSearchQuery('');
    } catch(err) {
      console.error(err);
      toast.error('Error importando APU');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Ingresa una descripción para generar el APU");
      return;
    }
    setLoading(true);
    setItem(null);
    try {
      const response = await generateAIApu(prompt, selectedCategory, selectedActivity);
      // Map response to the format expected by the editor
      setItem({
        ...response.partida,
        materials: response.materials || [],
        equipments: response.equipments || [],
        labors: response.labors || [],
        advertencias: response.advertencias || []
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
    setItem(prev => {
      const updated = { ...prev };
      updated[type] = updated[type].map(c => {
        if (c.id === compId) {
          // If it's a numeric field, parse it
          const isNumeric = ['cantidad', 'precio_unitario', 'desperdicio', 'depreciacion', 'jornal'].includes(field);
          return { ...c, [field]: isNumeric ? (parseFloat(value) || 0) : value };
        }
        return c;
      });
      return updated;
    });
  };

  const handleAddRow = (type) => {
    setItem(prev => {
      const updated = { ...prev };
      const newRow = {
        id: "NEW-" + Math.floor(Math.random() * 100000),
        codigo: "",
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
      };
      
      if (type === 'materials') {
        newRow.unidad = "und";
        newRow.desperdicio = 0;
      } else if (type === 'equipments') {
        newRow.depreciacion = 1.0;
      } else if (type === 'labors') {
        newRow.jornal = 0;
      }
      
      updated[type] = [...(updated[type] || []), newRow];
      return updated;
    });
  };

  const handleRemoveRow = (type, rowId) => {
    setItem(prev => {
      const updated = { ...prev };
      updated[type] = updated[type].filter(c => c.id !== rowId);
      return updated;
    });
  };

  const renderOrigenTag = (origen) => {
    if (origen === 'historico') return <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded shadow-sm border border-green-200" title="Cantidad basada en promedio de partidas históricas">HISTÓRICO</span>;
    if (origen === 'ia') return <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[9px] font-bold rounded shadow-sm border border-yellow-200" title="Cantidad ajustada/estimada por IA. Revisar.">ESTIMADO IA</span>;
    if (origen === 'faltante') return <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded shadow-sm border border-red-200" title="Insumo no existe en catálogo. Precio = 0. Agregar antes de usar.">FALTANTE</span>;
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
            {creationMode === 'manual' ? <Plus size={20} className="text-blue-600" /> : creationMode === 'import' ? <FileText size={20} className="text-indigo-600" /> : <Sparkles size={20} className="text-red-500" />}
            {creationMode === 'manual' ? 'Nuevo APU (Desde Cero)' : creationMode === 'import' ? 'Importar / Clonar APU' : 'Generador de APU con IA'}
          </h2>
        </div>
      </div>


      {creationMode === 'import' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-bold text-slate-700 mb-2">Explora las Bases de Datos, Insumos, Materiales o Personal</label>
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="sm:w-64">
                <select
                  value={selectedDatabase}
                  onChange={(e) => setSelectedDatabase(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all appearance-none"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(148,163,255,0.35)',
                    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                    backgroundPosition: 'right 1rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em'
                  }}
                >
                  <option value="master">Base Maestra (Defecto)</option>
                  {databases.filter(db => db.id !== 'master' && db.is_master !== true).map(db => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
             </div>
             
             <form onSubmit={(e) => { e.preventDefault(); triggerSearch(); }} className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-slate-400 text-base" size={16} />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all font-medium"
                    style={{
                      background: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(148,163,255,0.35)',
                      boxShadow: 'inset 0 1px 4px rgba(80,100,200,0.06)',
                    }}
                    placeholder="Buscar partida por código (ej. E01) o descripción..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="sm:w-56">
                  <select
                    value={searchChapter}
                    onChange={(e) => setSearchChapter(e.target.value)}
                    className="block w-full px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all appearance-none"
                    style={{
                      background: 'rgba(255,255,255,0.8)',
                      border: '1px solid rgba(148,163,255,0.35)',
                      backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="">Todas las Categorías</option>
                    <option value="E">Edificaciones (E)</option>
                    <option value="I">Instalaciones (I)</option>
                    <option value="C">Vialidad (C)</option>
                    <option value="V">Vivienda (V)</option>
                    <option value="U">Urbanismo (U)</option>
                    <option value="M">Mantenimiento (M)</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSearching ? <Loader className="animate-spin" size={16} /> : null}
                  Filtrar
                </button>
             </form>

             {/* Búsqueda Inversa Toggles */}
             <div className="flex flex-wrap items-center gap-4 px-1 mt-1 text-sm">
              <span className="text-slate-600 font-medium">Buscar por:</span>
              
              <label className="flex items-center cursor-pointer gap-2">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={searchDesc} onChange={(e) => setSearchDesc(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${searchDesc ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${searchDesc ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="text-slate-700 select-none">Título y Código</span>
              </label>

              <label className="flex items-center cursor-pointer gap-2" title="Busca dentro de los Materiales, Equipos y Mano de Obra de las partidas">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={searchInsumos} onChange={(e) => setSearchInsumos(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${searchInsumos ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${searchInsumos ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="text-slate-700 select-none">Materiales</span>
              </label>
            </div>
          </div>

          <div className="mt-2 text-xs text-slate-500 font-medium">
            {totalMatches > 0 ? new Intl.NumberFormat('es-VE').format(totalMatches) : 0} coincidencias
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {searchResults.map((res) => (
                  <li key={res.CodPar} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono mb-1">{res.CovPar || res.CodPar}</p>
                      <p className="text-xs text-slate-600 line-clamp-1">{res.Descri}</p>
                    </div>
                    <button
                      onClick={() => handleImportApu(res.CodPar)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 shrink-0 transition-colors"
                    >
                      Usar como base
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {creationMode === 'ia' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* FILTERS */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría de Obra</label>
              <select 
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedActivity('');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Todas las categorías...</option>
                {categoriesTree.map(cat => (
                  <option key={cat.categoria} value={cat.categoria}>{cat.categoria}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Actividad</label>
              <select 
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                disabled={!selectedCategory}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
              >
                <option value="">Todas las actividades...</option>
                {selectedCategory && categoriesTree.find(c => c.categoria === selectedCategory)?.actividades.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-sm font-bold text-slate-700 mb-2">Describe la partida a generar</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Fundición de losa de entrepiso de concreto f'c=210 kg/cm2, espesor 15 cm, con acero de refuerzo fy=4200 kg/cm2"
            className="w-full h-24 p-4 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm mb-4"
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
      )}

      {item && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {item.advertencias && item.advertencias.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl shadow-sm">
              <h4 className="text-amber-800 font-bold mb-2 flex items-center gap-2">⚠️ Advertencias del Análisis</h4>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                {item.advertencias.map((adv, idx) => (
                  <li key={idx}>{adv}</li>
                ))}
              </ul>
            </div>
          )}
          <ApuEditorUI
            item={item}
            settings={settings}
            onHeaderChange={(field, value) => setItem({ ...item, [field]: value })}
            onHeaderBlur={() => {}} // Not strictly needed here, local state
            onComponentChange={handleComponentChange}
            onComponentBlur={() => {}} // Changes are saved when they click "Guardar APU"
            onRemoveRow={handleRemoveRow}
            onAddBlankRow={handleAddRow}
            onAddSearchRow={() => { toast.error("La búsqueda no está disponible en este modo, usa fila en blanco"); }} // Optional: connect to ComponentSearchModal later
            onSettingsChange={(field, value) => setSettings({ ...settings, [field]: value })}
          />

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
      )}
    </div>
  );
}
