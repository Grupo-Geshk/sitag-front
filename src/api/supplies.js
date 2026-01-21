import apiClient from './client';

export const suppliesAPI = {
  // Get all supplies for producer with optional farm filter
  getSupplies: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.status) params.append('status', filters.status);

    const response = await apiClient.get(`/supplies?${params.toString()}`);
    return response.data;
  },

  // Get supply by ID
  getSupplyById: async (id) => {
    const response = await apiClient.get(`/supplies/${id}`);
    return response.data;
  },

  // Get low stock alerts
  getLowStockAlerts: async () => {
    const response = await apiClient.get('/supplies/low-stock');
    return response.data;
  },

  // Get expiring supplies
  getExpiring: async (daysAhead = 30) => {
    const response = await apiClient.get(`/supplies/expiring?daysAhead=${daysAhead}`);
    return response.data;
  },

  // Get aggregated usage data for visualization
  getUsageData: async (farmId = null) => {
    const params = new URLSearchParams();
    if (farmId) params.append('farmId', farmId);

    const response = await apiClient.get(`/supplies/usage?${params.toString()}`);
    return response.data;
  },

  // Get movement history (internal audit - not exposed in main UI)
  getMovementHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.supplyId) params.append('supplyId', filters.supplyId);
    if (filters.farmId) params.append('farmId', filters.farmId);

    const response = await apiClient.get(`/supplies/movements?${params.toString()}`);
    return response.data;
  },

  // Register entry (new stock arrival)
  registerEntry: async (data) => {
    const response = await apiClient.post('/supplies/movements/entry', data);
    return response.data;
  },

  // Register consumption
  registerConsumption: async (data) => {
    const response = await apiClient.post('/supplies/movements/consumption', data);
    return response.data;
  },

  // Adjust stock (corrections, waste, etc.)
  adjustStock: async (data) => {
    const response = await apiClient.post('/supplies/movements/adjustment', data);
    return response.data;
  },

  // Create new supply item
  createSupply: async (data) => {
    const response = await apiClient.post('/supplies', data);
    return response.data;
  },

  // Update supply item
  updateSupply: async (id, data) => {
    const response = await apiClient.put(`/supplies/${id}`, data);
    return response.data;
  },
};
