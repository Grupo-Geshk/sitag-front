import apiClient from './client';

export const economyAPI = {
  // Get economy summary with income, expenses, and breakdown by category
  getEconomySummary: async (producerId, startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(
      `/productor/${producerId}/economia/resumen?${params.toString()}`
    );
    return response.data;
  },

  // Get economy trends over time (income vs expenses)
  getEconomyTrends: async (producerId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.period) params.append('period', filters.period); // 'monthly' or 'weekly'

    const response = await apiClient.get(
      `/productor/${producerId}/economia/tendencias?${params.toString()}`
    );
    return response.data;
  },

  // Get list of transactions with filters and pagination
  getTransactions: async (producerId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.type) params.append('type', filters.type); // 'Ingreso' or 'Egreso'
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const response = await apiClient.get(
      `/productor/${producerId}/economia/transacciones?${params.toString()}`
    );
    return response.data;
  },

  // Create a new transaction (income or expense)
  createTransaction: async (producerId, data) => {
    const response = await apiClient.post(
      `/productor/${producerId}/economia/transaccion`,
      data
    );
    return response.data;
  },

  // Delete a transaction (soft delete)
  deleteTransaction: async (producerId, transactionId) => {
    const response = await apiClient.delete(
      `/productor/${producerId}/economia/transaccion/${transactionId}`
    );
    return response.data;
  },
};

// Keep backward compatibility alias
export const transactionsAPI = economyAPI;
