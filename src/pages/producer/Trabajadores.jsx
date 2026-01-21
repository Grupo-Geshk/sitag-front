import { useState, useEffect } from 'react';
import ProducerLayout from '../../components/layout/ProducerLayout';
import WorkerModal from '../../components/producer/WorkerModal';
import { workersAPI } from '../../api/workers';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function Trabajadores() {
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState(null);
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({
    totalCount: 0,
    pageNumber: 1,
    pageSize: 15,
    totalPages: 1,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    farmId: '',
    status: '',
    page: 1,
    pageSize: 15,
  });

  useEffect(() => {
    fetchFarms();
    fetchWorkers();
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [filters.page]);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const fetchWorkers = async () => {
    try {
      setLoading(true);

      // Build filters object - backend now supports optional farmId
      const queryFilters = {
        search: filters.search || undefined,
        role: filters.role || undefined,
        farmId: filters.farmId || undefined,
        status: filters.status || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      };

      // Remove undefined values
      Object.keys(queryFilters).forEach(key =>
        queryFilters[key] === undefined && delete queryFilters[key]
      );

      const data = await workersAPI.getWorkers(queryFilters);
      setWorkers(data || []);

      setPagination({
        totalCount: data?.length || 0,
        pageNumber: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil((data?.length || 0) / filters.pageSize),
      });
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('Error al cargar trabajadores');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleApplyFilters = () => {
    fetchWorkers();
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      role: '',
      farmId: '',
      status: '',
      page: 1,
      pageSize: 15,
    });
    setTimeout(() => fetchWorkers(), 0);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleWorkerSaved = () => {
    setShowWorkerModal(false);
    setSelectedWorker(null);
    fetchWorkers();
  };

  const handleEditWorker = (worker) => {
    setSelectedWorker(worker);
    setShowWorkerModal(true);
  };

  const handleDeactivateWorker = async (workerId) => {
    if (!confirm('¿Estás seguro de que quieres desactivar este trabajador?')) {
      return;
    }

    try {
      await workersAPI.deactivateWorker(workerId);
      toast.success('Trabajador desactivado exitosamente');
      await fetchWorkers();

      // Refresh details panel if it's open for this worker
      if (selectedWorkerDetail?.id === workerId) {
        const updatedWorker = await workersAPI.getWorkerById(workerId);
        if (updatedWorker) {
          setSelectedWorkerDetail(updatedWorker);
        }
      }
    } catch (error) {
      console.error('Error deactivating worker:', error);
      toast.error('Error al desactivar trabajador');
    }
  };

  const handleActivateWorker = async (workerId) => {
    try {
      await workersAPI.activateWorker(workerId);
      toast.success('Trabajador activado exitosamente');
      await fetchWorkers();

      // Refresh details panel if it's open for this worker
      if (selectedWorkerDetail?.id === workerId) {
        const updatedWorker = await workersAPI.getWorkerById(workerId);
        if (updatedWorker) {
          setSelectedWorkerDetail(updatedWorker);
        }
      }
    } catch (error) {
      console.error('Error activating worker:', error);
      toast.error('Error al activar trabajador');
    }
  };

  const handleViewWorkerDetail = async (worker) => {
    try {
      setSelectedWorkerDetail(worker);

      // Fetch activity timeline
      const timeline = await workersAPI.getActivityTimeline(worker.id);
      setActivityTimeline(timeline?.timeline || []);

      // Fetch assignment history
      const history = await workersAPI.getAssignmentHistory(worker.id);
      setAssignmentHistory(history || []);
    } catch (error) {
      console.error('Error fetching worker details:', error);
      toast.error('Error al cargar detalles del trabajador');
      // Set empty arrays on error to avoid undefined errors
      setActivityTimeline([]);
      setAssignmentHistory([]);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      Activo: { label: 'Activo', color: 'bg-green-100 text-green-800', icon: '✓' },
      Inactivo: { label: 'Inactivo', color: 'bg-gray-100 text-gray-800', icon: '○' },
    };
    return configs[status] || configs.Inactivo;
  };

  const getRoleIcon = (role) => {
    const icons = {
      'Administrador de finca': '👔',
      'Veterinario': '🩺',
      'Cuidador de animales': '🐄',
      'Ordeñador': '🥛',
      'Alimentador': '🌾',
      'Mantenimiento': '🔧',
      'Conductor': '🚚',
      'Auxiliar general': '👷',
    };
    return icons[role] || '👤';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProducerLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold" style={{ color: '#3FA79F' }}>
              Trabajadores
            </h1>
            <p className="text-gray-600 mt-1">¿Quién está trabajando y qué está haciendo?</p>
          </div>
          <button
            onClick={() => {
              setSelectedWorker(null);
              setShowWorkerModal(true);
            }}
            className="px-6 py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            style={{ backgroundColor: '#3FA79F' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear trabajador
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#3FA79F' }}>
            Filtros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar trabajador
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Nombre o apellido..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              >
                <option value="">Todos los roles</option>
                <option value="Administrador de finca">👔 Administrador de finca</option>
                <option value="Veterinario">🩺 Veterinario</option>
                <option value="Cuidador de animales">🐄 Cuidador de animales</option>
                <option value="Ordeñador">🥛 Ordeñador</option>
                <option value="Alimentador">🌾 Alimentador</option>
                <option value="Mantenimiento">🔧 Mantenimiento</option>
                <option value="Conductor">🚚 Conductor</option>
                <option value="Auxiliar general">👷 Auxiliar general</option>
              </select>
            </div>

            {/* Farm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Finca
              </label>
              <select
                value={filters.farmId}
                onChange={(e) => handleFilterChange('farmId', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              >
                <option value="">Todas las fincas</option>
                {farms.map(farm => (
                  <option key={farm.farmId} value={farm.farmId}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              >
                <option value="">Todos</option>
                <option value="Activo">✓ Activo</option>
                <option value="Inactivo">○ Inactivo</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2.5 text-white rounded-lg font-medium flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Aplicar filtros
            </button>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Workers List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className={selectedWorkerDetail ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {loading ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                <p className="mt-4 text-gray-600">Cargando trabajadores...</p>
              </div>
            ) : workers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron trabajadores</h3>
                <p className="text-gray-500">
                  {Object.values(filters).some(v => v && v !== 1 && v !== 15)
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Aún no hay trabajadores registrados'}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold" style={{ color: '#3FA79F' }}>
                      Lista de Trabajadores ({pagination.totalCount})
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {workers.map((worker) => {
                      const statusConfig = getStatusConfig(worker.status);
                      const roleIcon = getRoleIcon(worker.role);

                      return (
                        <div
                          key={worker.workerId}
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleViewWorkerDetail(worker)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Worker Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="text-2xl">{roleIcon}</div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {worker.firstName} {worker.lastName}
                                  </h3>
                                  <p className="text-sm text-gray-600">{worker.role}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <p className="text-xs text-gray-500">Finca asignada</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {worker.assignedFarms && worker.assignedFarms.length > 0
                                      ? worker.assignedFarms.map(f => f.farmName).join(', ')
                                      : 'Sin asignar'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Estado</p>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                                    <span>{statusConfig.icon}</span>
                                    {statusConfig.label}
                                  </span>
                                </div>
                              </div>

                              {worker.lastActivity && (
                                <div className="mt-3 p-2 bg-blue-50 rounded">
                                  <p className="text-xs text-gray-600">Actividad reciente</p>
                                  <p className="text-sm text-gray-900">{worker.lastActivity.action}</p>
                                  <p className="text-xs text-gray-500">{formatDateTime(worker.lastActivity.date)}</p>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditWorker(worker);
                                }}
                                className="px-3 py-2 bg-white border-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                style={{ borderColor: '#3FA79F', color: '#3FA79F' }}
                              >
                                ✏️ Editar
                              </button>
                              {worker.status === 'Activo' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeactivateWorker(worker.workerId);
                                  }}
                                  className="px-3 py-2 bg-white border-2 border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                                >
                                  ✖ Desactivar
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivateWorker(worker.workerId);
                                  }}
                                  className="px-3 py-2 bg-white border-2 border-green-300 text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
                                >
                                  ✓ Activar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white rounded-xl shadow-md p-4 mt-4">
                    <button
                      onClick={() => handlePageChange(pagination.pageNumber - 1)}
                      disabled={pagination.pageNumber === 1}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {pagination.pageNumber} de {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.pageNumber + 1)}
                      disabled={pagination.pageNumber === pagination.totalPages}
                      className="px-4 py-2 text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#3FA79F' }}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail Panel */}
          {selectedWorkerDetail && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md sticky top-6">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold" style={{ color: '#3FA79F' }}>
                      Detalles
                    </h2>
                    <button
                      onClick={() => setSelectedWorkerDetail(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getRoleIcon(selectedWorkerDetail.role)}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedWorkerDetail.firstName} {selectedWorkerDetail.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedWorkerDetail.role}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                {(selectedWorkerDetail.email || selectedWorkerDetail.phone) && (
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Contacto</h3>
                    {selectedWorkerDetail.email && (
                      <p className="text-sm text-gray-600 mb-1">📧 {selectedWorkerDetail.email}</p>
                    )}
                    {selectedWorkerDetail.phone && (
                      <p className="text-sm text-gray-600">📱 {selectedWorkerDetail.phone}</p>
                    )}
                  </div>
                )}

                {/* Assignment History */}
                <div className="p-4 border-b border-gray-200 max-h-64 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Historial de Asignaciones</h3>
                  {assignmentHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay historial de asignaciones</p>
                  ) : (
                    <div className="space-y-2">
                      {assignmentHistory.map((assignment, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium text-gray-900">{assignment.farmName}</p>
                          <p className="text-gray-600">
                            {formatDate(assignment.startDate)} - {assignment.endDate ? formatDate(assignment.endDate) : 'Actual'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity Timeline */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Actividad Reciente</h3>
                  {activityTimeline.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay actividad registrada</p>
                  ) : (
                    <div className="space-y-3">
                      {activityTimeline.map((activity, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-teal-500 mt-1.5"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            {activity.details && (
                              <p className="text-sm text-gray-600">{activity.details}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{formatDateTime(activity.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Worker Modal */}
      {showWorkerModal && (
        <WorkerModal
          worker={selectedWorker}
          onClose={() => {
            setShowWorkerModal(false);
            setSelectedWorker(null);
          }}
          onWorkerSaved={handleWorkerSaved}
        />
      )}
    </ProducerLayout>
  );
}
