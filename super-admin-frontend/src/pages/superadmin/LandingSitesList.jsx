import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../services/api';

export default function LandingSitesList() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Landing Site Form State
  const [showForm, setShowForm] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_cliente: '',
    telefono: '',
    especialidad: '',
    slug: '',
    custom_domain: '',
    template_name: 'construccion'
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const token = localStorage.getItem('arko_admin_token');
      const response = await fetch(`${API_URL}/arko/landing_sites/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch landing sites');
      const data = await response.json();
      setSites(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('arko_admin_token');
      const payload = { ...formData };
      if (!payload.custom_domain) {
        delete payload.custom_domain;
      }
      
      const response = await fetch(`${API_URL}/arko/landing_sites/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Error creating landing site');
      }
      
      await fetchSites();
      setShowForm(false);
      setFormData({
        email: '', password: '', nombre_cliente: '', telefono: '', especialidad: '', slug: '', custom_domain: '', template_name: 'construccion'
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmDelete = (site) => {
    setSiteToDelete(site);
  };

  const deleteSite = async () => {
    if (!siteToDelete) return;
    try {
      const token = localStorage.getItem('arko_admin_token');
      const response = await fetch(`${API_URL}/arko/landing_sites/${siteToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchSites();
        setSiteToDelete(null);
      } else {
        alert('Error deleting site');
      }
    } catch (err) {
      alert('Error deleting site');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando sitios...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      {/* Delete Confirmation Modal */}
      {siteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 mb-2">¿Eliminar sitio clonado?</h3>
              <p className="text-sm text-center text-gray-500">
                Estás a punto de eliminar el sitio clonado de <span className="font-semibold text-gray-700">{siteToDelete.nombre_cliente}</span>. 
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setSiteToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteSite}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sitios Clonados</h1>
          <p className="mt-2 text-sm text-gray-600">
            Administra las instancias estáticas clonadas a partir de las plantillas para clientes sin membresía SaaS.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          {showForm ? 'Cancelar' : 'Clonar Plantilla Manual'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-6 border-b pb-2">Datos para Clonar Plantilla</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla Base</label>
                <select
                  name="template_name"
                  value={formData.template_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="construccion">Arko360 - Construcción</option>
                  <option value="medico">Arko360 - Médico</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  name="nombre_cliente"
                  value={formData.nombre_cliente}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Ej. Dr. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  value={formData.especialidad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Ej. Ginecología"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del Cliente (Acceso)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (Acceso)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL del Sitio (Slug)</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                    https://arko360.net/
                  </span>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="pablo-milano"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dominio Personalizado (Opcional)</label>
                <input
                  type="text"
                  name="custom_domain"
                  value={formData.custom_domain}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="ej. mi-sitio.com"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 mr-4 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-medium transition-colors shadow-sm"
              >
                Crear Sitio
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plantilla</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sites.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No hay sitios clonados todavía.
                </td>
              </tr>
            ) : sites.map((site) => (
              <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{site.nombre_cliente}</div>
                      <div className="text-sm text-gray-500">{site.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                    {site.template_name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <a href={`https://arko360.net/${site.slug}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      arko360.net/{site.slug}
                    </a>
                  </div>
                  {site.custom_domain && (
                    <div className="text-xs text-gray-500">
                       <a href={`https://${site.custom_domain}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {site.custom_domain}
                      </a>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    site.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {site.status === 'active' ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => confirmDelete(site)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                    title="Eliminar sitio"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
