import { API_URL } from './api';

export const budgetService = {
  // BUDGETS
  getAll: async () => {
    const response = await fetch(`${API_URL}/budgets/`);
    if (!response.ok) throw new Error('Error al cargar presupuestos');
    return response.json();
  },

  getById: async (id) => {
    const response = await fetch(`${API_URL}/budgets/${id}`);
    if (!response.ok) throw new Error('Error al cargar el presupuesto');
    return response.json();
  },

  create: async (data) => {
    const response = await fetch(`${API_URL}/budgets/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al crear el presupuesto');
    return response.json();
  },

  updateItem: async (budgetId, itemId, data) => {
    const response = await api.put(`/budgets/${budgetId}/items/${itemId}`, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await fetch(`${API_URL}/budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al actualizar el presupuesto');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/budgets/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Error al eliminar el presupuesto');
    return response.json();
  },

  // ITEMS (Partidas del Presupuesto)
  addItem: async (budgetId, data) => {
    const response = await fetch(`${API_URL}/budgets/${budgetId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al agregar partida al presupuesto');
    return response.json();
  }
};
