const API_URL = import.meta.env.VITE_API_URL || 'https://api.arko360.net';
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
  const response = await fetch(`${API_URL}/api/v1/arko/config`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    return null; // Silent fail, fallback to defaults
  }
  return response.json();
}
