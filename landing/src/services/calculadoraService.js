import axios from 'axios';

// Usamos la variable de entorno de Vite o un fallback para dev local
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const calculadoraService = {
  // Guardar una corrida
  guardarCorrida: async (nombreProyecto, tipoLosa, payloadJSON) => {
    try {
      const response = await axios.post(`${API_URL}/calculadora-losas/runs`, {
        nombre_proyecto: nombreProyecto,
        tipo_losa: tipoLosa,
        inputs: {
          grid: payloadJSON.grid,
          datos: payloadJSON.datos,
          costos: payloadJSON.costos,
          macizaConfig: payloadJSON.macizaConfig,
          steelDeckConfig: payloadJSON.steelDeckConfig,
          aligeradaConfig: payloadJSON.aligeradaConfig
        },
        resultados: payloadJSON.calc
      });
      return response.data;
    } catch (error) {
      console.error('Error al guardar corrida:', error);
      throw error;
    }
  },

  // Obtener historial
  obtenerHistorial: async () => {
    try {
      const response = await axios.get(`${API_URL}/calculadora-losas/runs`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  },

  // Obtener corrida por ID
  obtenerCorrida: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/calculadora-losas/runs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener corrida ${id}:`, error);
      throw error;
    }
  },

  // Eliminar corrida
  eliminarCorrida: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/calculadora-losas/runs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar corrida ${id}:`, error);
      throw error;
    }
  }
};
