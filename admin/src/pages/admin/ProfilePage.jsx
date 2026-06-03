import { useState } from 'react';
import { FiUpload, FiUser, FiSettings, FiFileText, FiGrid } from 'react-icons/fi';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('identidad');

  const tabs = [
    { id: 'identidad', label: 'Identidad', icon: FiUser },
    { id: 'apariencia', label: 'Apariencia', icon: FiSettings },
    { id: 'contacto', label: 'Contacto', icon: FiFileText },
    { id: 'contenido', label: 'Contenido', icon: FiGrid },
    { id: 'modulos', label: 'Módulos', icon: FiGrid },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-1">Configura la información de Arko 360</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'identidad' && (
        <div className="space-y-6">
          {/* Logo Profesional */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Logo Profesional</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-indigo-600">A360</span>
                </div>
                <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">Arrastra y suelta tu logo aquí</p>
                <p className="text-xs text-gray-500 mb-4">o</p>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm">
                  Seleccionar desde dispositivo
                </button>
                <p className="text-xs text-gray-500 mt-4">JPEG, PNG, WebP (Máximo 5MB)</p>
              </div>
            </div>
          </div>

          {/* Foto de Perfil */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Foto de Perfil</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <FiUser className="w-12 h-12 text-gray-400" />
                </div>
                <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">Arrastra y suelta tu foto aquí</p>
                <p className="text-xs text-gray-500 mb-4">o</p>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm">
                  Seleccionar desde dispositivo
                </button>
                <p className="text-xs text-gray-500 mt-4">JPEG, PNG, WebP (Máximo 5MB)</p>
              </div>
            </div>
          </div>

          {/* Campos de Texto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  defaultValue="Ingeniería Arko 360"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidad
                </label>
                <input
                  type="text"
                  defaultValue="Ingeniería y Construcción"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'apariencia' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Apariencia</h3>
          <p className="text-gray-600">Configura los colores y diseño del panel.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Primario
              </label>
              <input
                type="color"
                defaultValue="#0a4275"
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contacto' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Contacto</h3>
          <p className="text-gray-600">Configura los datos de contacto de Arko 360.</p>
        </div>
      )}

      {activeTab === 'contenido' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Gestión de Contenido</h3>
          <p className="text-gray-600">Administra el contenido del sitio.</p>
        </div>
      )}

      {activeTab === 'modulos' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Módulos Activos</h3>
          <p className="text-gray-600">Configura los módulos disponibles en el panel.</p>
        </div>
      )}
    </div>
  );
}
