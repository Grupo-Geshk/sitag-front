import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ProducerLayout from '../../components/layout/ProducerLayout';
import ServiceModal from '../../components/producer/ServiceModal';
import CompleteServiceModal from '../../components/producer/CompleteServiceModal';
import { servicesAPI } from '../../api/services';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { workersAPI } from '../../api/workers';
import { getProducerId } from '../../lib/auth';

export default function Servicios() {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [workers, setWorkers] = useState([]);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const [filters, setFilters] = useState({
    tipo: null,
    farmId: null,
    divisionId: null,
    workerId: null,
    dateFrom: null,
    dateTo: null
  });

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    if (farms.length > 0) {
      fetchWorkers();
    }
  }, [farms]);

  useEffect(() => {
    fetchServices();
  }, [filters]);

  useEffect(() => {
    if (filters.farmId) {
      fetchDivisions(filters.farmId);
    } else {
      setDivisions([]);
    }
  }, [filters.farmId]);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const fetchDivisions = async (farmId) => {
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setDivisions(divisionsData || []);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchWorkers = async () => {
    try {
      // Fetch workers for all farms and combine
      if (farms.length === 0) {
        // Wait for farms to be loaded first
        return;
      }

      const allWorkers = [];
      for (const farm of farms) {
        try {
          const farmWorkers = await workersAPI.getWorkers({ farmId: farm.id, status: 'Activo', pageSize: 100 });
          // Avoid duplicates by checking worker ID
          farmWorkers.forEach(worker => {
            if (!allWorkers.find(w => w.id === worker.id)) {
              allWorkers.push(worker);
            }
          });
        } catch (err) {
          console.error(`Error fetching workers for farm ${farm.id}:`, err);
        }
      }

      setWorkers(allWorkers);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = {
        pageSize: 100,
        ...filters
      };

      const response = await servicesAPI.getServices(params);
      setServices(response.items || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      if (error.response?.status === 400 || error.response?.status === 404) {
        toast.error('No se pudo completar la acción (endpoint pendiente)');
        setServices([]); // Mock empty state
      } else {
        toast.error('Error al cargar los servicios');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleCompleteService = (service) => {
    setSelectedService(service);
    setShowCompleteModal(true);
  };

  const handleApplyFilters = () => {
    fetchServices();
  };

  const handleClearFilters = () => {
    setFilters({
      tipo: null,
      farmId: null,
      divisionId: null,
      workerId: null,
      dateFrom: null,
      dateTo: null
    });
    setTimeout(() => fetchServices(), 100);
  };

  const getEstadoConfig = (estado) => {
    const configs = {
      'Pendiente': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳' },
      'Completado': { color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' }
    };
    return configs[estado] || configs['Pendiente'];
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'Vacunación': '💉',
      'Medicación': '💊',
      'Desparasitación': '🐛',
      'Baño': '🚿',
      'Inseminación': '🧬',
      'Revisión veterinaria': '🩺',
      'Corte de pezuñas': '✂️',
      'Otro': '📋'
    };
    return icons[tipo] || '📋';
  };

  return (
    <ProducerLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold" style={{ color: '#3FA79F' }}>
              Servicios
            </h1>
            <p className="text-gray-600 mt-1">
              Registra y gestiona los servicios aplicados a tus animales
            </p>
          </div>
          <button
            onClick={() => setShowServiceModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: '#3FA79F', color: 'white' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Servicio
          </button>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={filters.tipo || ''}
                  onChange={(e) => setFilters({ ...filters, tipo: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Vacunación">💉 Vacunación</option>
                  <option value="Medicación">💊 Medicación</option>
                  <option value="Desparasitación">🐛 Desparasitación</option>
                  <option value="Baño">🚿 Baño</option>
                  <option value="Otro">📋 Otro</option>
                </select>
              </div>

              {/* Finca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Finca</label>
                <select
                  value={filters.farmId || ''}
                  onChange={(e) => setFilters({ ...filters, farmId: e.target.value ? parseInt(e.target.value) : null, divisionId: null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todas las fincas</option>
                  {farms.map(farm => (
                    <option key={farm.id || farm.farmId} value={farm.id || farm.farmId}>{farm.name}</option>
                  ))}
                </select>
              </div>

              {/* División */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">División</label>
                <select
                  value={filters.divisionId || ''}
                  onChange={(e) => setFilters({ ...filters, divisionId: e.target.value ? parseInt(e.target.value) : null })}
                  disabled={!filters.farmId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  <option value="">Todas las divisiones</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>

              {/* Trabajador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsable</label>
                <select
                  value={filters.workerId || ''}
                  onChange={(e) => setFilters({ ...filters, workerId: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Todos</option>
                  {workers.map(worker => (
                    <option key={worker.workerId} value={worker.workerId}>
                      {worker.firstName} {worker.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: '#3FA79F' }}
              >
                Aplicar filtros
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Services List */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-8 w-8 mx-auto" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay servicios registrados</h3>
                <p className="text-gray-600 mb-4">Comienza registrando el primer servicio aplicado a tus animales</p>
                <button
                  onClick={() => setShowServiceModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                  style={{ backgroundColor: '#3FA79F' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar Primer Servicio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service => {
                  const estadoConfig = getEstadoConfig(service.estado);
                  const tipoIcon = getTipoIcon(service.tipo);

                  return (
                    <div key={service.id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{tipoIcon}</span>
                          <h3 className="font-bold text-gray-900">{service.tipo}</h3>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${estadoConfig.color}`}>
                          {estadoConfig.icon} {service.estado}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">📍</span>
                          <span className="text-gray-900">{service.farmName}{service.divisionName && ` / ${service.divisionName}`}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">👷</span>
                          <span className="text-gray-900">
                            {service.responsables && service.responsables.length > 0
                              ? service.responsables.map(r => r.name).join(', ')
                              : 'Sin asignar'}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">🐄</span>
                          <span className="text-gray-900">
                            {service.animalCount || 0} {service.animalCount === 1 ? 'animal' : 'animales'}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">📅</span>
                          <span className="text-gray-900">
                            {service.fechaProgramada
                              ? format(new Date(service.fechaProgramada), 'dd/MM/yyyy', { locale: es })
                              : 'Sin fecha'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        {service.estado === 'Pendiente' && (
                          <button
                            onClick={() => handleCompleteService(service)}
                            className="flex-1 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: '#3FA79F' }}
                          >
                            Completar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedService(service);
                            // Open detail view
                          }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <ServiceModal
          service={selectedService && !showCompleteModal ? selectedService : null}
          onClose={() => {
            setShowServiceModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            fetchServices();
          }}
        />
      )}

      {/* Complete Service Modal */}
      {showCompleteModal && selectedService && (
        <CompleteServiceModal
          service={selectedService}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            fetchServices();
          }}
        />
      )}
    </ProducerLayout>
  );
}
