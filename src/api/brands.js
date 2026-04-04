import apiClient from './client';

export const brandsAPI = {
  getByFarm: async (farmId) => {
    const response = await apiClient.get(`/farms/${farmId}/hierros`);
    return response.data;
  },

  create: async (farmId, data) => {
    const response = await apiClient.post(`/farms/${farmId}/hierros`, data);
    return response.data;
  },

  update: async (farmId, brandId, data) => {
    const response = await apiClient.put(`/farms/${farmId}/hierros/${brandId}`, data);
    return response.data;
  },

  delete: async (farmId, brandId) => {
    await apiClient.delete(`/farms/${farmId}/hierros/${brandId}`);
  },
};
