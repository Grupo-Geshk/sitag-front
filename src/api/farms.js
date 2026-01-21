import apiClient from './client';

export const farmsAPI = {
  // Get all farms (producers see only their farms)
  getAllFarms: async (producerId = null) => {
    const url = producerId ? `/farms?producerId=${producerId}` : '/farms';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get farm by ID
  getFarmById: async (id) => {
    const response = await apiClient.get(`/farms/${id}`);
    return response.data;
  },

  // Create new farm
  createFarm: async (data) => {
    const response = await apiClient.post('/farms', data);
    return response.data;
  },

  // Update farm
  updateFarm: async (id, data) => {
    const response = await apiClient.put(`/farms/${id}`, data);
    return response.data;
  },

  // Delete farm (soft delete)
  deleteFarm: async (id) => {
    const response = await apiClient.delete(`/farms/${id}`);
    return response.data;
  },

  // Get farm overview (aggregated metrics)
  getFarmOverview: async (producerId) => {
    const response = await apiClient.get(`/farms/productor/${producerId}/overview`);
    return response.data;
  },

  // Get farm detail
  getFarmDetail: async (producerId, farmId) => {
    const response = await apiClient.get(`/farms/productor/${producerId}/finca/${farmId}/detalle`);
    return response.data;
  },
};
