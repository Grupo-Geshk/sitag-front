import apiClient from './client';

export const movementsAPI = {
  // Get all movements with optional filtering
  getAllMovements: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.producerId) params.append('producerId', filters.producerId);
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.divisionId) params.append('divisionId', filters.divisionId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/movements${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Get movement history for a specific animal
  getMovementsByAnimal: async (animalId) => {
    const response = await apiClient.get(`/movements/${animalId}`);
    return response.data;
  },

  // Create a single movement (transfer animal between farms/divisions)
  createMovement: async (data) => {
    const response = await apiClient.post('/movements', data);
    return response.data;
  },

  // Process bulk movement of multiple animals to the same division
  processBulkMovement: async (data) => {
    const response = await apiClient.post('/movements/bulk', data);
    return response.data;
  },
};
