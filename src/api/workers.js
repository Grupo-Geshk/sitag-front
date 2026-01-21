import apiClient from './client';

export const workersAPI = {
  // Get all workers with filters and pagination
  getWorkers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const response = await apiClient.get(`/workers?${params.toString()}`);
    return response.data;
  },

  // Get worker by ID
  getWorkerById: async (id) => {
    const response = await apiClient.get(`/workers/${id}`);
    return response.data;
  },

  // Create worker
  createWorker: async (data) => {
    const response = await apiClient.post('/workers', data);
    return response.data;
  },

  // Update worker
  updateWorker: async (id, data) => {
    const response = await apiClient.put(`/workers/${id}`, data);
    return response.data;
  },

  // Deactivate worker
  deactivateWorker: async (id) => {
    const response = await apiClient.patch(`/workers/${id}/deactivate`);
    return response.data;
  },

  // Activate worker
  activateWorker: async (id) => {
    const response = await apiClient.patch(`/workers/${id}/activate`);
    return response.data;
  },

  // Assign farms to worker
  assignFarms: async (workerId, farmIds, assignToAll = false) => {
    const response = await apiClient.post(`/workers/${workerId}/assign-farms`, {
      farmIds,
      assignToAll,
    });
    return response.data;
  },

  // Unassign farms from worker
  unassignFarms: async (workerId, farmIds) => {
    const response = await apiClient.post(`/workers/${workerId}/unassign-farms`, {
      farmIds,
    });
    return response.data;
  },

  // Get worker assignment history
  getAssignmentHistory: async (workerId) => {
    const response = await apiClient.get(`/workers/${workerId}/assignment-history`);
    return response.data;
  },

  // Get worker activity timeline
  getActivityTimeline: async (workerId) => {
    const response = await apiClient.get(`/workers/${workerId}/activity-timeline`);
    return response.data;
  },
};
