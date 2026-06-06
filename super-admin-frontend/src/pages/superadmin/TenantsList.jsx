import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';

export default function TenantsList() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Tenant Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    telefono: '',
    especialidad: '',
    slug: '',
    status: 'active'
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/arko/tenants/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const data = await response.json();
      setTenants(data);
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/arko/tenants/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Error creating tenant');
      }
      
      await fetchTenants();
      setShowForm(false);
      setFormData({
        email: '', password: '', nombre_completo: '', telefono: '', especialidad: '', slug: '', status: 'active'
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleStatus = async (tenant) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/arko/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchTenants();
    } catch (err) {
      alert('Error updating status');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando inquilinos...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Inquilinos</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Inquilino'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-lg font-semibold mb-4">Crear Nuevo Inquilino</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="nombre_completo" placeholder="Nombre de la Clínica/Doctor" required value={formData.nombre_completo} onChange={handleInputChange} className="border p-2 rounded" />
            <input type="email" name="email" placeholder="Correo Electrónico" required value={formData.email} onChange={handleInputChange} className="border p-2 rounded" />
            <input type="password" name="password" placeholder="Contraseña Temporal" required value={formData.password} onChange={handleInputChange} className="border p-2 rounded" />
            <input type="text" name="slug" placeholder="Slug (ej: dr-perez)" required value={formData.slug} onChange={handleInputChange} className="border p-2 rounded" />
            <input type="text" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleInputChange} className="border p-2 rounded" />
            <input type="text" name="especialidad" placeholder="Especialidad" value={formData.especialidad} onChange={handleInputChange} className="border p-2 rounded" />
            <div className="md:col-span-2 mt-4">
              <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Guardar Inquilino</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug (Landing)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{tenant.nombre_completo}</div>
                  <div className="text-sm text-gray-500">{tenant.especialidad || 'Sin especialidad'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tenant.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  <a href={`http://arko360.net/${tenant.slug}`} target="_blank" rel="noreferrer">/{tenant.slug}</a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tenant.status === 'active' ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => toggleStatus(tenant)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {tenant.status === 'active' ? 'Suspender' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No hay inquilinos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
