import apiClient from './client';

export const animalEventsAPI = {
  // Get events by animal
  getEventsByAnimal: async (animalId) => {
    const response = await apiClient.get(`/animalevents?animalId=${animalId}`);
    return response.data;
  },

  // Get all events (for eventos page)
  getAllEvents: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.producerId) params.append('producerId', filters.producerId);
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/animalevents${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  },

  // Create animal event
  createEvent: async (data) => {
    const response = await apiClient.post('/animalevents', data);
    return response.data;
  },

  // Create purchase/sale event (atomic with economy transaction)
  createPurchaseSaleEvent: async (data) => {
    const response = await apiClient.post('/animalevents/purchase-sale', data);
    return response.data;
  },
};
