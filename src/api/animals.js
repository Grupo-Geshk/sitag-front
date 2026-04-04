import apiClient from './client';

export const animalsAPI = {
  getAnimals: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.farmId)       params.append('farmId',       filters.farmId);
    if (filters.divisionId)   params.append('divisionId',   filters.divisionId);
    if (filters.status)       params.append('status',       filters.status);
    // Accept both Spanish and English param names
    if (filters.sex || filters.sexo)
      params.append('sex', filters.sex ?? filters.sexo);
    if (filters.healthStatus || filters.estadoSalud)
      params.append('healthStatus', filters.healthStatus ?? filters.estadoSalud);
    const ageMin = filters.ageMin ?? filters.edadMin;
    if (ageMin !== null && ageMin !== undefined && ageMin !== '')
      params.append('ageMin', ageMin);
    const ageMax = filters.ageMax ?? filters.edadMax;
    if (ageMax !== null && ageMax !== undefined && ageMax !== '')
      params.append('ageMax', ageMax);
    if (filters.search)       params.append('search',       filters.search);
    if (filters.page)         params.append('page',         filters.page);
    if (filters.pageSize)     params.append('pageSize',     filters.pageSize);
    const response = await apiClient.get(`/animals?${params.toString()}`);
    return response.data;
  },

  getAnimalById: async (id) => {
    const response = await apiClient.get(`/animals/${id}`);
    return response.data;
  },

  createAnimal: async (data) => {
    const response = await apiClient.post('/animals', data);
    return response.data;
  },

  createAnimalWithPurchase: async (data) => {
    const response = await apiClient.post('/animals/purchase', data);
    return response.data;
  },

  updateAnimal: async (id, data) => {
    const response = await apiClient.put(`/animals/${id}`, data);
    return response.data;
  },

  updateHealth: async (id, data) => {
    const response = await apiClient.patch(`/animals/${id}/health`, data);
    return response.data;
  },

  assignTag: async (id, tagNumber) => {
    const response = await apiClient.patch(`/animals/${id}/tag`, { tagNumber });
    return response.data;
  },

  closeAnimal: async (id, data) => {
    const response = await apiClient.patch(`/animals/${id}/close`, data);
    return response.data;
  },

  getAnimalTimeline: async (animalId) => {
    const response = await apiClient.get(`/reports/animal-timeline/${animalId}`);
    return response.data;
  },

  getAnimalMovements: async (animalId) => {
    const response = await apiClient.get(`/animals/${animalId}/movements`);
    return response.data;
  },

  getAnimalEvents: async (animalId) => {
    const response = await apiClient.get(`/animals/${animalId}/events`);
    return response.data;
  },

  processBulkMovement: async (data) => {
    const response = await apiClient.post('/animals/bulk-movement', data);
    return response.data;
  },

  getAnimalGenealogy: async (animalId) => {
    const response = await apiClient.get(`/animals/${animalId}/genealogy`);
    return response.data;
  },

  assignBrand: async (animalId, data) => {
    await apiClient.patch(`/animals/${animalId}/brand`, data);
  },
};
