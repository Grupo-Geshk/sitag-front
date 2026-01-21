import apiClient from './client';

export const servicesAPI = {
  // Get all services with filters
  getServices: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.estado) params.append('estado', filters.estado);
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.divisionId) params.append('divisionId', filters.divisionId);
    if (filters.workerId) params.append('workerId', filters.workerId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const response = await apiClient.get(`/services?${params.toString()}`);
    return response.data;
  },

  // Get service by ID
  getServiceById: async (id) => {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  },

  // Create new service (services are created as already executed records)
  createService: async (data) => {
    const response = await apiClient.post('/services', data);
    return response.data;
  },

  // Update service
  updateService: async (id, data) => {
    const response = await apiClient.put(`/services/${id}`, data);
    return response.data;
  },

  // Get services by animal ID
  getServicesByAnimal: async (animalId) => {
    const response = await apiClient.get(`/services/animal/${animalId}`);
    return response.data;
  },

  // Get supply consumptions for a service
  getServiceConsumptions: async (serviceId) => {
    const response = await apiClient.get(`/services/${serviceId}/consumptions`);
    return response.data;
  },

  // Delete service
  deleteService: async (id) => {
    const response = await apiClient.delete(`/services/${id}`);
    return response.data;
  },
};
