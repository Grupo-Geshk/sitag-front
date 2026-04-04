import apiClient from './client';

export const brandsAPI = {
  getAll: async () => {
    const response = await apiClient.get('/hierros');
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/hierros', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/hierros/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await apiClient.delete(`/hierros/${id}`);
  },
};
