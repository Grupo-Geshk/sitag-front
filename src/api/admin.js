import apiClient from './client';

export const adminAPI = {
  // User Management
  createUser: async (userData) => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Producer Management
  getAllProducers: async () => {
    const response = await apiClient.get('/admin/producers');
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await apiClient.get('/admin/statistics');
    return response.data;
  },
};
