import { useState, useEffect } from 'react';
import { FiUpload, FiUser, FiSettings, FiFileText, FiGrid, FiSave } from 'react-icons/fi';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('identidad');
  const [primaryColor, setPrimaryColor] = useState('#0a4275');
  const [siteConfig, setSiteConfig] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Cargar configuración del sitio al montar
  useEffect(() => {
    fetchSiteConfig();
  }, []);

  const fetchSiteConfig = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/arko/config`);
      if (response.ok) {
        const config = await response.json();
        setSiteConfig(config);
        if (config.branding?.primaryColor) {
          setPrimaryColor(config.branding.primaryColor);
        }
      }
    } catch (error) {
      console.error('Error fetching site config:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const token = localStorage.getItem('arko_token');
      const configData = {
        ...siteConfig,
        branding: {
          ...siteConfig.branding,
          primaryColor: primaryColor
        }
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/arko/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        const result = await response.json();
        setSiteConfig(result.config);
        setSaveMessage('Configuración guardada exitosamente');
        // Aplicar el color dinámicamente al dashboard
        applyThemeColor(primaryColor);
      } else {
        setSaveMessage('Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setSaveMessage('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const applyThemeColor = (color) => {
    // Aplicar el color a las variables CSS globales
    document.documentElement.style.setProperty('--primary-color', color);
    // También puedes guardar en localStorage para persistencia local
    localStorage.setItem('arko_primary_color', color);
  };

  const adjustColorBrightness = (hex, percent) => {
    // Convertir hex a rgb
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Ajustar brillo
    const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
    const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
    const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));

    // Convertir de vuelta a hex
    return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
  };

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
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 border border-gray-300 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                  placeholder="#0a4275"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Este color se aplicará a todos los elementos del dashboard.</p>
            </div>
          </div>

          {/* Botón de Guardar */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('exitosamente') ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMessage}
                </span>
              )}
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                style={{ backgroundColor: primaryColor }}
                onMouseEnter={(e) => e.target.style.backgroundColor = adjustColorBrightness(primaryColor, -20)}
                onMouseLeave={(e) => e.target.style.backgroundColor = primaryColor}
              >
                <FiSave className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
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
