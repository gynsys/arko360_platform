import axios from 'axios';

// Get the base API URL from environment variables, fallback to generic
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const cost360ApiClient = axios.create({
  baseURL: `${API_URL}/cost360`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch a list of cost items (Partidas)
 * @param {number} skip - Offset for pagination
 * @param {number} limit - Limit of items to fetch
 * @param {string} search - Search keyword
 * @param {string} chapter - Chapter prefix filter (e.g., 'E', 'I')
 * @returns {Promise<Array>} List of items
 */
export const fetchItems = async (skip = 0, limit = 50, search = '', chapter = '') => {
  const params = { skip, limit };
  if (search) {
    params.search = search;
  }
  if (chapter) {
    params.chapter = chapter;
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

export const fetchCategoriesTree = async () => {
  const response = await cost360ApiClient.get('/categories_tree');
  return response.data;
};

export const generateAIApu = async (description, categoria = null, tipo_actividad = null) => {
  const payload = { description };
  if (categoria) payload.categoria = categoria;
  if (tipo_actividad) payload.tipo_actividad = tipo_actividad;
  
  const response = await cost360ApiClient.post('/generate-ai-apu', payload);
  return response.data;
};

export const saveCustomApu = async (payload) => {
  const response = await cost360ApiClient.post('/custom-apus', payload);
  return response.data;
};

export default {
  fetchItems,
  fetchApuDetails,
  fetchCategoriesTree,
  generateAIApu,
  saveCustomApu,
};
