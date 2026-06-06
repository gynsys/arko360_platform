import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle } from 'lucide-react';

const initialTemplates = [
  {
    id: 'construccion',
    name: 'Arko360 - Construcción',
    description: 'Plantilla ideal para empresas de construcción, contratistas y arquitectos. Diseño robusto y profesional.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80',
    features: ['Galería de Proyectos', 'Formulario de Cotización', 'Servicios Destacados', 'Diseño Responsivo'],
    demoUrl: 'https://arko360.net'
  },
  {
    id: 'medico',
    name: 'Arko360 - Médico',
    description: 'Perfecta para doctores, clínicas y profesionales de la salud. Incluye reserva de citas y sección de servicios médicos.',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
    features: ['Reserva de Citas', 'Perfil Profesional', 'Testimonios', 'Integración WhatsApp'],
    demoUrl: 'https://arko360.net'
  }
];

export default function TemplatesList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(initialTemplates);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const confirmDelete = (template) => {
    setTemplateToDelete(template);
  };

  const deleteTemplate = () => {
    if (!templateToDelete) return;
    setTemplates(templates.filter(t => t.id !== templateToDelete.id));
    setTemplateToDelete(null);
  };

  const handleClone = (templateId) => {
    // Redirigir a LandingSitesList pero podríamos pasar el templateId por state o URL param
    // para pre-seleccionar la plantilla en el formulario.
    // Por ahora, simplemente redirigimos a la vista de sitios.
    navigate('/admin/landing-sites', { state: { openForm: true, templateId } });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 mb-2">¿Eliminar plantilla?</h3>
              <p className="text-sm text-center text-gray-500">
                Estás a punto de eliminar la plantilla <span className="font-semibold text-gray-700">{templateToDelete.name}</span>. 
                Esta acción ocultará la plantilla de la galería.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setTemplateToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteTemplate}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Plantillas Disponibles</h1>
        <p className="mt-2 text-sm text-gray-600">
          Explora la galería de plantillas listas para ser clonadas y entregadas a clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <div className="h-48 overflow-hidden relative">
              <img 
                src={template.image} 
                alt={template.name} 
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
                <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  NUEVO
                </div>
                <button 
                  onClick={() => confirmDelete(template)}
                  className="bg-white text-red-600 hover:text-white hover:bg-red-600 transition-colors p-1.5 rounded-full shadow-md"
                  title="Eliminar Plantilla"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-1">{template.description}</p>
              
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Características</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {template.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <a 
                  href={template.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-center font-medium text-sm"
                >
                  Ver Demo
                </a>
                <button 
                  onClick={() => handleClone(template.id)}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm text-center"
                >
                  Clonar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
