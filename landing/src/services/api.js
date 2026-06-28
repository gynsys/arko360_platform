const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || '/arko360/contact';

/**
 * @param {Object} data - Form data to submit
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} data.project_type
 * @param {string} data.message
 * @returns {Promise<Object>}
 */
export async function submitContactForm(data) {
  const response = await fetch(`${API_URL}${CONTACT_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Error al enviar el formulario. Intenta nuevamente.');
  }

  return response.json();
}

export async function getSiteConfig() {
  // Check if we're viewing a cloned site (based on URL path)
  const path = window.location.pathname;
  
  // If the path is just '/', check if it's a cloned site by looking at the hostname
  // For cloned sites, the URL would be arko360.net/{slug}
  const pathParts = path.split('/').filter(part => part.length > 0);
  
  // If we have a path part that's not a known route, it might be a site slug
  const knownRoutes = ['biblio', 'herramientas', 'arko3d'];
  const potentialSlug = pathParts[0];
  
  let endpoint = '/arko/config'; // Default to global config
  
  // If we have a potential slug that's not a known route, try to get site-specific config
  if (potentialSlug && !knownRoutes.includes(potentialSlug)) {
    endpoint = `/arko/landing_sites/config/${potentialSlug}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    // If site-specific config fails, fall back to global config
    if (endpoint !== '/arko/config') {
      const fallbackResponse = await fetch(`${API_URL}/arko/config`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (fallbackResponse.ok) {
        return fallbackResponse.json();
      }
    }
    return null; // Silent fail, fallback to defaults
  }
  return response.json();
}
