import { apiRequest } from './http';

export const budgetService = {
  // BUDGETS
  getAll: () => apiRequest('/budgets/', { errorMessage: 'Error al cargar presupuestos' }),

  generateAPUReport: (id) => apiRequest(`/budgets/${id}/report`, {
    responseType: 'blob',
    errorMessage: 'Error al generar reporte',
  }),

  // type is 'materials', 'equipments', or 'labors'
  searchComponents: (type, query) => apiRequest(
    `/cost360/${type}?search=${encodeURIComponent(query)}`,
    { errorMessage: `Error al buscar ${type}` },
  ),

  // type is 'materials', 'equipments', or 'labors'
  addComponent: (budgetId, itemId, type, data) => apiRequest(
    `/budgets/${budgetId}/items/${itemId}/${type}`,
    { method: 'POST', body: data, errorMessage: 'Error al agregar componente' },
  ),

  // type is 'materials', 'equipments', or 'labors'
  updateComponent: (budgetId, itemId, type, componentId, data) => apiRequest(
    `/budgets/${budgetId}/items/${itemId}/${type}/${componentId}`,
    { method: 'PUT', body: data, errorMessage: 'Error al actualizar componente' },
  ),

  syncPrices: (budgetId) => apiRequest(`/budgets/${budgetId}/sync_prices`, {
    method: 'POST',
    errorMessage: 'Error al sincronizar precios',
  }),

  getById: (id) => apiRequest(`/budgets/${id}`, { errorMessage: 'Error al cargar el presupuesto' }),

  create: (data) => apiRequest('/budgets/', {
    method: 'POST',
    body: data,
    errorMessage: 'Error al crear el presupuesto',
  }),

  updateItem: (budgetId, itemId, data) => apiRequest(`/budgets/${budgetId}/items/${itemId}`, {
    method: 'PUT',
    body: data,
    errorMessage: 'Error al actualizar item',
  }),

  deleteItem: (budgetId, itemId) => apiRequest(`/budgets/${budgetId}/items/${itemId}`, {
    method: 'DELETE',
    errorMessage: 'Error al eliminar partida',
  }),

  reorderItems: (budgetId, itemIds) => apiRequest(`/budgets/${budgetId}/items/reorder`, {
    method: 'POST',
    body: itemIds,
    errorMessage: 'Error al reordenar partidas',
  }),

  update: (id, data) => apiRequest(`/budgets/${id}`, {
    method: 'PUT',
    body: data,
    errorMessage: 'Error al actualizar el presupuesto',
  }),

  delete: (id) => apiRequest(`/budgets/${id}`, {
    method: 'DELETE',
    errorMessage: 'Error al eliminar el presupuesto',
  }),

  duplicateBudget: (id, newName) => apiRequest(
    `/budgets/${id}/duplicate?new_name=${encodeURIComponent(newName)}`,
    { method: 'POST', errorMessage: 'Error al duplicar el presupuesto' },
  ),

  // ITEMS (Partidas del Presupuesto)
  addItem: (budgetId, data) => apiRequest(`/budgets/${budgetId}/items`, {
    method: 'POST',
    body: data,
    errorMessage: 'Error al agregar partida al presupuesto',
  }),
};
