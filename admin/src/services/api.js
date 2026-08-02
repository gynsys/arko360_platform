import { API_URL, apiRequest } from './http';

export { API_URL };

const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || '/arko360/contact';

const credentialsBody = (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  return formData;
};

/**
 * @param {Object} data - Form data to submit
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} data.project_type
 * @param {string} data.message
 * @returns {Promise<Object>}
 */
export function submitContactForm(data) {
  return apiRequest(CONTACT_ENDPOINT, {
    method: 'POST',
    body: data,
    errorMessage: 'Error al enviar el formulario. Intenta nuevamente.',
  });
}

export function getSiteConfig() {
  // Silent fail, fallback to defaults
  return apiRequest('/arko/config', { fallback: null });
}

/**
 * Login admin
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
export function loginArkoAdmin(email, password) {
  return apiRequest('/arko/auth/login', {
    method: 'POST',
    body: credentialsBody(email, password),
    errorMessage: 'Credenciales incorrectas',
  });
}

/**
 * Login for Landing Sites (Cloned Templates)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
export function loginLandingSite(email, password) {
  return apiRequest('/arko/landing_sites/auth/login', {
    method: 'POST',
    body: credentialsBody(email, password),
    errorMessage: 'Credenciales incorrectas',
  });
}

/**
 * Get current Landing Site config
 */
export function getMyLandingSiteConfig(token) {
  return apiRequest('/arko/landing_sites/me/config', { token, fallback: null });
}

/**
 * Update current Landing Site config
 */
export function updateMyLandingSiteConfig(token, config) {
  return apiRequest('/arko/landing_sites/me/config', {
    method: 'PUT',
    token,
    body: config,
    errorMessage: 'Error saving config',
  });
}

/**
 * Get Landing Site posts
 */
export function getMyLandingSitePosts(token) {
  return apiRequest('/arko/landing_sites/me/posts', { token, fallback: [] });
}

/**
 * Create Landing Site post
 */
export function createMyLandingSitePost(token, postData) {
  return apiRequest('/arko/landing_sites/me/posts', {
    method: 'POST',
    token,
    body: postData,
    errorMessage: 'Error creating post',
  });
}

/**
 * Update Landing Site post
 */
export function updateMyLandingSitePost(token, postId, postData) {
  return apiRequest(`/arko/landing_sites/me/posts/${postId}`, {
    method: 'PUT',
    token,
    body: postData,
    errorMessage: 'Error updating post',
  });
}

/**
 * Delete Landing Site post
 */
export function deleteMyLandingSitePost(token, postId) {
  return apiRequest(`/arko/landing_sites/me/posts/${postId}`, {
    method: 'DELETE',
    token,
    errorMessage: 'Error deleting post',
  });
}
