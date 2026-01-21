import apiClient from './client';

export const producersAPI = {
  // Register a new producer with user account
  registerProducer: async (data) => {
    const response = await apiClient.post('/producers', data);
    return response.data;
  },

  // Get all producers (Admin only)
  getAllProducers: async () => {
    const response = await apiClient.get('/producers');
    return response.data;
  },

  // Get producer by ID (Admin only)
  getProducerById: async (id) => {
    const response = await apiClient.get(`/producers/${id}`);
    return response.data;
  },

  // Update producer (Admin only)
  updateProducer: async (id, data) => {
    const response = await apiClient.put(`/producers/${id}`, data);
    return response.data;
  },

  // Delete producer (Admin only)
  deleteProducer: async (id) => {
    const response = await apiClient.delete(`/producers/${id}`);
    return response.data;
  },
};
