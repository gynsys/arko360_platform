export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Shared fetch wrapper for the admin API.
 *
 * Handles base URL, JSON/urlencoded bodies, bearer auth and error mapping so
 * individual service functions only describe the endpoint they call.
 *
 * @param {string} path - Path appended to `API_URL`.
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object|URLSearchParams|FormData} [options.body]
 * @param {string} [options.token] - Bearer token.
 * @param {Object} [options.headers] - Extra headers.
 * @param {string} [options.errorMessage] - Message thrown when the API gives no detail.
 * @param {'json'|'blob'} [options.responseType='json']
 * @param {*} [options.fallback] - Value returned instead of throwing on a failed response.
 * @returns {Promise<*>}
 */
export async function apiRequest(path, {
  method = 'GET',
  body,
  token,
  headers,
  errorMessage = 'Error en la solicitud',
  responseType = 'json',
  fallback,
} = {}) {
  const isUrlEncoded = body instanceof URLSearchParams;
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;

  const requestHeaders = { 'Accept': 'application/json', ...headers };
  if (isUrlEncoded) {
    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined && !isMultipart) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined || isUrlEncoded || isMultipart ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    if (token && response.status === 401) throw new Error('Unauthorized');
    if (fallback !== undefined) return fallback;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || errorMessage);
  }

  return responseType === 'blob' ? response.blob() : response.json();
}
