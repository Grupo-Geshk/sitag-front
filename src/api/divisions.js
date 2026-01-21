import apiClient from './client';

export const divisionsAPI = {
  // Get all divisions for a specific farm
  getDivisionsByFarm: async (farmId) => {
    const response = await apiClient.get(`/divisions?farmId=${farmId}`);
    return response.data;
  },

  // Get division by ID
  getDivisionById: async (id) => {
    const response = await apiClient.get(`/divisions/${id}`);
    return response.data;
  },

  // Create new division
  createDivision: async (data) => {
    const response = await apiClient.post('/divisions', data);
    return response.data;
  },

  // Update division
  updateDivision: async (id, data) => {
    const response = await apiClient.put(`/divisions/${id}`, data);
    return response.data;
  },

  // Delete division (soft delete)
  deleteDivision: async (id) => {
    const response = await apiClient.delete(`/divisions/${id}`);
    return response.data;
  },
};
