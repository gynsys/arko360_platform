import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Database, Plus, Trash2, Edit2, Copy, 
  TrendingUp, DollarSign, Users, Settings,
  AlertTriangle, CheckCircle, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cost360DatabaseService } from '../../../services/cost360DatabaseService';

export default function DatabaseManagementPage() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState(null);
  
  // Form state for creating database
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source_database_id: 'master',
    material_inflation: 0,
    labor_inflation: 0,
    equipment_inflation: 0
  });

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const data = await cost360DatabaseService.getAll();
      setDatabases(data.databases || []);
    } catch (error) {
      toast.error('Error cargando bases de datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDatabase = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      await cost360DatabaseService.create(formData);
      toast.success('Base de datos creada exitosamente');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        source_database_id: 'master',
        material_inflation: 0,
        labor_inflation: 0,
        equipment_inflation: 0
      });
      loadDatabases();
    } catch (error) {
      toast.error('Error al crear base de datos');
      console.error(error);
    }
  };

  const handleDeleteDatabase = async () => {
    if (!databaseToDelete) return;

    try {
      await cost360DatabaseService.delete(databaseToDelete.id);
      toast.success('Base de datos eliminada exitosamente');
      setShowDeleteModal(false);
      setDatabaseToDelete(null);
      loadDatabases();
    } catch (error) {
      toast.error('Error al eliminar base de datos');
      console.error(error);
    }
  };

  const confirmDelete = (database) => {
    if (database.is_master) {
      toast.error('No se puede eliminar la base de datos maestra');
      return;
    }
    setDatabaseToDelete(database);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        <Settings className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/cost360')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Bases de Datos</h1>
                <p className="text-sm text-slate-500">Administra y duplica bases de datos de Cost360</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
            >
              <Plus size={16} /> Nueva Base de Datos
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {databases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Database className="mx-auto mb-4 text-slate-300" size={48} />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay bases de datos personalizadas</h3>
            <p className="text-slate-500 mb-4">Crea tu primera base de datos duplicando la Base Maestra</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 font-medium hover:underline"
            >
              Crear Base de Datos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {databases.map((db) => (
              <div
                key={db.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  db.is_master ? 'border-blue-200' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b ${
                  db.is_master ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Database className={db.is_master ? 'text-blue-600' : 'text-slate-600'} size={20} />
                      <div>
                        <h3 className="font-semibold text-slate-800">{db.name}</h3>
                        {db.is_master && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Base Maestra
                          </span>
                        )}
                      </div>
                    </div>
                    {!db.is_master && (
                      <button
                        onClick={() => confirmDelete(db)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {db.description && (
                    <p className="text-sm text-slate-600">{db.description}</p>
                  )}

                  {/* Inflation Stats */}
                  {(db.material_inflation > 0 || db.labor_inflation > 0 || db.equipment_inflation > 0) && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-medium text-slate-500 mb-2">Índices de Inflación Aplicados</div>
                      
                      {db.material_inflation > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-slate-600">
                            <DollarSign size={14} /> Materiales
                          </span>
                          <span className="font-medium text-green-600">+{db.material_inflation}%</span>
                        </div>
                      )}
                      
                      {db.labor_inflation > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Users size={14} /> Mano de Obra
                          </span>
                          <span className="font-medium text-green-600">+{db.labor_inflation}%</span>
                        </div>
                      )}
                      
                      {db.equipment_inflation > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Settings size={14} /> Equipos
                          </span>
                          <span className="font-medium text-green-600">+{db.equipment_inflation}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1">
                      <Copy size={12} />
                      Origen: {db.source_database_id || 'master'}
                    </div>
                    <div>
                      Creado: {db.created_at ? new Date(db.created_at).toLocaleDateString('es-VE') : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <div className={`flex items-center gap-2 text-sm ${
                    db.is_active ? 'text-green-600' : 'text-slate-400'
                  }`}>
                    {db.is_active ? (
                      <>
                        <CheckCircle size={16} />
                        Activa
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        Inactiva
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Copy className="text-blue-500" /> Duplicar Base de Datos
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDatabase} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la Base de Datos</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Base Julio 2024"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción (opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Ej. Base de datos con precios actualizados a julio 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base de Datos Origen</label>
                  <select
                    value={formData.source_database_id}
                    onChange={(e) => setFormData({ ...formData, source_database_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="master">Base Maestra</option>
                    {databases.filter(db => !db.is_master).map(db => (
                      <option key={db.id} value={db.id}>{db.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inflation Factors */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-slate-800">Índices de Inflación</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                      <DollarSign size={14} /> Materiales (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.material_inflation}
                      onChange={(e) => setFormData({ ...formData, material_inflation: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                      <Users size={14} /> Mano de Obra (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.labor_inflation}
                      onChange={(e) => setFormData({ ...formData, labor_inflation: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                      <Settings size={14} /> Equipos (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.equipment_inflation}
                      onChange={(e) => setFormData({ ...formData, equipment_inflation: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all"
                >
                  Crear Base de Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && databaseToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Eliminar Base de Datos</h2>
              </div>
              <p className="text-slate-600 mb-6">
                ¿Estás seguro de que deseas eliminar la base de datos <strong>"{databaseToDelete.name}"</strong>? 
                Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDatabaseToDelete(null);
                  }}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteDatabase}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-red-500/30 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
