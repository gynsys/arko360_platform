import axios from 'axios';

// Get the base API URL from environment variables, fallback to generic
const API_URL = import.meta.env.VITE_API_URL || 'https://api.arko360.net';

const cost360ApiClient = axios.create({
  baseURL: `${API_URL}/api/v1/cost360`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch a list of cost items (Partidas)
 * @param {number} skip - Offset for pagination
 * @param {number} limit - Limit of items to fetch
 * @param {string} search - Search keyword
 * @returns {Promise<Array>} List of items
 */
export const fetchItems = async (skip = 0, limit = 50, search = '') => {
  const params = { skip, limit };
  if (search) {
    params.search = search;
  }
  const response = await cost360ApiClient.get('/items', { params });
  return response.data;
};

/**
 * Fetch detailed APU (Análisis de Precio Unitario) for a specific item
 * @param {string} itemCode - The unique code of the item (CodPar)
 * @returns {Promise<Object>} APU details including materials, labor, and equipment
 */
export const fetchApuDetails = async (itemCode) => {
  const response = await cost360ApiClient.get(`/items/${itemCode}/apu`);
  return response.data;
};

export default {
  fetchItems,
  fetchApuDetails,
};
