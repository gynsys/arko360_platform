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
  const navigate = useNavigate();
  const { config } = useContext(SiteConfigContext);

  const fetchPartidas = async (searchQuery = '') => {
    setLoading(true);
    try {
      const data = await cost360Service.fetchItems(0, 50, searchQuery);
      setItems(data);
    } catch (error) {
      toast.error('Error al cargar la base de datos de Cost360');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartidas();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPartidas(search);
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

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8">
        <div className="relative">
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
          <button 
            type="submit"
            className="absolute inset-y-2 right-2 bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Results Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length > 0 ? (
          <ul className="divide-y divide-gray-50">
            {items.map((item) => (
              <li 
                key={item.CodPar}
                className="hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer group"
                onClick={() => navigate(`/admin/cost360/apu/${item.CodPar}`)}
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
        ) : (
          <div className="py-20 text-center">
            <p className="text-gray-500">No se encontraron partidas con ese criterio de búsqueda.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Cost360Dashboard;
