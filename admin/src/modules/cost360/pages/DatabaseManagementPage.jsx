import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Database, Plus, Trash2, Edit2, Copy, 
  TrendingUp, DollarSign, Users, Settings,
  AlertTriangle, CheckCircle, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cost360DatabaseService } from '../../../services/cost360DatabaseService';
import { useDatabaseContext } from '../../../contexts/DatabaseContext';

export default function DatabaseManagementPage() {
  const navigate = useNavigate();
  const { refreshDatabases: reloadDatabases } = useDatabaseContext();
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
      reloadDatabases(); // Actualizar el contexto global
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
      reloadDatabases(); // Actualizar el contexto global
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
    <div className="flex flex-col h-full bg-transparent">
      {/* ── PAGE HEADER ─── glass style ───────────────────────── */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 1px 24px 0 rgba(80,100,200,0.07)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="p-2.5 rounded-xl shadow-sm"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', color: '#fff' }}
              >
                <Database size={22} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">Gestión de Bases de Datos</h1>
                <p className="text-sm text-blue-600/80 font-medium mt-0.5">Administra y duplica bases de datos de APUpro</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all duration-300 hover:opacity-100 hover:shadow-[0_8px_25px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
            >
              <Plus size={18} /> Nueva Base de Datos
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {databases.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.65)',
              boxShadow: '0 4px 32px 0 rgba(80,100,200,0.08)',
            }}
          >
            <Database className="mx-auto mb-4 text-slate-400" size={48} />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay bases de datos personalizadas</h3>
            <p className="text-slate-500 mb-4">Crea tu primera base de datos duplicando la Base Maestra</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 font-bold transition-all duration-300 hover:text-blue-700 hover:drop-shadow-md hover:-translate-y-0.5"
            >
              Crear Base de Datos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {databases.map((db) => (
              <div
                key={db.id}
                className="rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 group"
                style={{
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(20px)',
                  border: db.is_master ? '2px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.7)',
                  boxShadow: db.is_master ? '0 8px 40px 0 rgba(37,99,235,0.15)' : '0 8px 32px 0 rgba(80,100,200,0.08)',
                }}
              >
                {/* Header */}
                <div
                  className="p-5 border-b"
                  style={{
                    background: db.is_master ? 'linear-gradient(90deg,rgba(37,99,235,0.08),rgba(99,102,241,0.04))' : 'rgba(255,255,255,0.5)',
                    borderBottomColor: 'rgba(148,163,255,0.2)'
                  }}
                >
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
                    <div
                      className="rounded-xl p-3.5 space-y-2.5"
                      style={{
                        background: 'rgba(241,245,249,0.7)',
                        border: '1px solid rgba(148,163,255,0.15)'
                      }}
                    >
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
