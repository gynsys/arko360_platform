import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { API_URL } from '../../../services/api';

const CatalogResourceTab = ({ resourceType, title, config }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 50;
  const [hasMore, setHasMore] = useState(false);

  const fetchItems = async (searchQuery = '', currentSkip = 0, append = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cost360/${resourceType}?search=${encodeURIComponent(searchQuery)}&skip=${currentSkip}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Since backend was updated to return { total, items }
        const newItems = Array.isArray(data) ? data : data.items;
        const total = Array.isArray(data) ? data.length : data.total;
        
        if (append) {
          setItems(prev => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        
        setTotalItems(total || 0);
        setHasMore((currentSkip + limit) < total);
        setSkip(currentSkip);
      }
    } catch (e) {
      toast.error('Error cargando ' + title);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(search);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(search, 0, false);
  };

  const handleLoadMore = () => {
    fetchItems(search, skip + limit, true);
  };

  const startEdit = (item) => {
    setEditingId(item[config.idKey]);
    const form = {};
    config.editableFields.forEach(f => {
      form[f.key] = item[f.key] || 0;
    });
    setEditForm(form);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_URL}/cost360/${resourceType}/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        toast.success(`${title} actualizado`);
        setEditingId(null);
        fetchItems(search);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error al actualizar');
      }
    } catch (e) {
      toast.error('Error de red');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este insumo de la Base Maestra? Esto es irreversible.')) return;
    try {
      const res = await fetch(`${API_URL}/cost360/${resourceType}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success(`${title} eliminado`);
        fetchItems(search);
      } else {
        toast.error('Error al eliminar');
      }
    } catch (e) {
      toast.error('Error de red');
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder={`Buscar en ${title}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <div className="mb-4 text-gray-500 font-medium">
        {totalItems > 0 && (
          <span>
            {new Intl.NumberFormat('es-VE').format(totalItems)} 
            {search ? (totalItems === 1 ? ' coincidencia' : ' coincidencias en total') : ` Total ${title}`}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden mb-6" style={{height: 'calc(100vh - 300px)'}}>
        <div className="overflow-y-auto h-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50 border-b-2 border-gray-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                {config.editableFields.map(f => (
                  <th key={f.key} className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{f.label}</th>
                ))}
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="100%" className="text-center py-8 text-gray-500">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="100%" className="text-center py-8 text-gray-500">No se encontraron resultados</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item[config.idKey]} className="hover:bg-blue-50 border-l-4 border-l-transparent hover:border-l-blue-500 transition-all duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 font-mono">{item[config.idKey]}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 group-hover:text-gray-900">{item[config.descKey]}</td>
                    
                    {config.editableFields.map(f => (
                      <td key={f.key} className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {editingId === item[config.idKey] ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 text-right border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1"
                            value={editForm[f.key]}
                            onChange={(e) => setEditForm({ ...editForm, [f.key]: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          <span className="text-gray-900">${(item[f.key] || 0).toFixed(2)}</span>
                        )}
                      </td>
                    ))}

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === item[config.idKey] ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={handleUpdate} className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-full transition-colors" title="Guardar"><FiCheck size={16} /></button>
                          <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors" title="Cancelar"><FiX size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(item)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full transition-colors" title="Editar Precio"><FiEdit2 size={16} /></button>
                          <button onClick={() => handleDelete(item[config.idKey])} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full transition-colors" title="Eliminar"><FiTrash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
      
      {/* Load More Button */}
      {hasMore && !loading && items.length > 0 && (
        <div className="flex justify-center pb-12">
          <button
            onClick={handleLoadMore}
            className="bg-white text-blue-600 border border-blue-200 px-8 py-3 rounded-full hover:bg-blue-50 transition-colors font-medium text-sm shadow-sm flex items-center gap-2"
          >
            Cargar Más {title}
          </button>
        </div>
      )}
    </div>
  );
};

export default CatalogResourceTab;
