import apiClient from './client';

export const animalsAPI = {
  // Get animals with filters and pagination
  getAnimals: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.divisionId) params.append('divisionId', filters.divisionId);
    if (filters.status) params.append('status', filters.status);
    if (filters.sexo) params.append('sexo', filters.sexo);
    if (filters.estadoSalud) params.append('estadoSalud', filters.estadoSalud);
    if (filters.edadMin) params.append('edadMin', filters.edadMin);
    if (filters.edadMax) params.append('edadMax', filters.edadMax);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const response = await apiClient.get(`/animals?${params.toString()}`);
    return response.data;
  },

  // Get animal by ID
  getAnimalById: async (id) => {
    const response = await apiClient.get(`/animals/${id}`);
    return response.data;
  },

  // Create new animal
  createAnimal: async (data) => {
    const response = await apiClient.post('/animals', data);
    return response.data;
  },

  // Create animal with purchase (atomic with economy transaction)
  createAnimalWithPurchase: async (data) => {
    const response = await apiClient.post('/animals/purchase', data);
    return response.data;
  },

  // Update animal
  updateAnimal: async (id, data) => {
    const response = await apiClient.put(`/animals/${id}`, data);
    return response.data;
  },

  // Get animal timeline (from reports endpoint)
  getAnimalTimeline: async (animalId) => {
    const response = await apiClient.get(`/reports/animal-timeline/${animalId}`);
    return response.data;
  },

  // Process bulk movement of animals between divisions
  processBulkMovement: async (data) => {
    const response = await apiClient.post('/animals/bulk-movement', data);
    return response.data;
  },
};
