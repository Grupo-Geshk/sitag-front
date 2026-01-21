import apiClient from './client';

export const dashboardAPI = {
  // Get complete dashboard data with KPIs, distributions, and recent events
  getDashboard: async (producerId) => {
    const response = await apiClient.get(`/productor/${producerId}/dashboard`);
    return response.data;
  },

  // Get alerts for a producer
  getAlerts: async (producerId, unreadOnly = false) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');

    const response = await apiClient.get(
      `/productor/${producerId}/dashboard/alerts?${params.toString()}`
    );
    return response.data;
  },

  // Mark an alert as read
  markAlertAsRead: async (producerId, alertId) => {
    const response = await apiClient.patch(
      `/productor/${producerId}/dashboard/alerts/${alertId}/mark-read`
    );
    return response.data;
  },
};
