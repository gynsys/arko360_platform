import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiLayers, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import cost360Service from '../services/cost360Service';
import { SiteConfigContext } from '../../../App';

const Cost360Dashboard = () => {
  const [items, setItems] = null || useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [chapter, setChapter] = useState('');
  const [skip, setSkip] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;
  const navigate = useNavigate();
  const { config } = useContext(SiteConfigContext);

  const fetchPartidas = async (searchQuery = '', chapterQuery = '', currentSkip = 0, append = false) => {
    setLoading(true);
    try {
      const response = await cost360Service.fetchItems(currentSkip, LIMIT, searchQuery, chapterQuery);
      if (append) {
        setItems(prev => [...prev, ...response.items]);
      } else {
        setItems(response.items);
      }
      setTotalItems(response.total);
      setHasMore(response.items.length === LIMIT && (currentSkip + LIMIT) < response.total);
    } catch (error) {
      toast.error('Error al cargar la base de datos de Cost360');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSkip(0);
    fetchPartidas(search, chapter, 0, false);
  }, [chapter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSkip(0);
    fetchPartidas(search, chapter, 0, false);
  };

  const handleLoadMore = () => {
    const newSkip = skip + LIMIT;
    setSkip(newSkip);
    fetchPartidas(search, chapter, newSkip, true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Arko360 Logo" className="h-8 object-contain" />
            ) : (
              <span className="text-xl font-bold text-blue-800">ARKO360</span>
            )}
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FiArrowLeft /> Regresar
          </button>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Cost360</h1>
          <p className="text-gray-500">Base de Datos de Partidas y Análisis de Precio Unitario</p>
        </div>

      {/* Search Bar & Filters */}
      <form onSubmit={handleSearch} className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400 text-lg" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all duration-200"
            placeholder="Buscar partida por código (ej. E01) o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="sm:w-64">
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="block w-full px-4 py-4 border border-gray-200 rounded-xl leading-5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all duration-200 appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
          >
            <option value="">Todas las Categorías</option>
            <option value="E">Edificaciones (E)</option>
            <option value="I">Instalaciones (I)</option>
            <option value="V">Vialidad (V)</option>
            <option value="U">Urbanismo (U)</option>
            <option value="M">Mantenimiento (M)</option>
          </select>
        </div>

        <button 
          type="submit"
          className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          Filtrar
        </button>
      </form>

      {/* Results Grid */}
      <div className="mb-4 text-gray-500 font-medium">
        {totalItems > 0 && (
          <span>
            {new Intl.NumberFormat('es-VE').format(totalItems)} {totalItems === 1 ? 'coincidencia' : 'coincidencias'} en total
          </span>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {items.length > 0 ? (
          <ul className="divide-y divide-gray-50">
            {items.map((item) => (
              <li 
                key={item.CodPar}
                className="hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer group"
                onClick={() => navigate(`/cost360/apu/${item.CodPar}`)}
              >
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-blue-100 text-blue-600 p-2 rounded-lg">
                      <FiLayers className="text-lg" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-mono mb-1">{item.CodPar}</p>
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-3xl">{item.Descri}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Und: {item.UniPar}
                    </span>
                    <FiArrowRight className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : !loading ? (
          <div className="py-20 text-center">
            <p className="text-gray-500">No se encontraron partidas con ese criterio de búsqueda.</p>
          </div>
        ) : null}
        
        {loading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && !loading && items.length > 0 && (
        <div className="flex justify-center pb-12">
          <button
            onClick={handleLoadMore}
            className="bg-white text-blue-600 border border-blue-200 px-8 py-3 rounded-full hover:bg-blue-50 transition-colors font-medium text-sm shadow-sm flex items-center gap-2"
          >
            Cargar Más Partidas
          </button>
        </div>
      )}
    </div>
    </div>
  );
};

export default Cost360Dashboard;
