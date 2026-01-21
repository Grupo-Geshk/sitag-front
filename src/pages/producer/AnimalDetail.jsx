import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import EventModal from '../../components/producer/EventModal';
import HealthStatusModal from '../../components/producer/HealthStatusModal';
import { animalsAPI } from '../../api/animals';
import { servicesAPI } from '../../api/services';
import toast from 'react-hot-toast';

export default function AnimalDetail() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTypePreset, setEventTypePreset] = useState(null);

  useEffect(() => {
    fetchAnimalDetails();
    fetchAnimalTimeline();
    fetchAnimalServices();
  }, [animalId]);

  const fetchAnimalDetails = async () => {
    try {
      setLoading(true);
      const data = await animalsAPI.getAnimalById(animalId);
      setAnimal(data);
    } catch (error) {
      console.error('Error fetching animal:', error);
      toast.error('Error al cargar los detalles del animal');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnimalTimeline = async () => {
    try {
      const data = await animalsAPI.getAnimalTimeline(animalId);
      setTimeline(data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const fetchAnimalServices = async () => {
    try {
      setServicesLoading(true);
      const data = await servicesAPI.getServicesByAnimal(animalId);
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      // Silently handle - endpoint might not be ready
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleEventCreated = () => {
    setShowEventModal(false);
    setEventTypePreset(null);
    fetchAnimalDetails();
    fetchAnimalTimeline();
    toast.success('Evento registrado exitosamente');
  };

  const handleQuickWeightRegistration = () => {
    setEventTypePreset('Pesaje');
    setShowEventModal(true);
    setShowActionMenu(false);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Desconocida';
    const today = new Date();
    const birth = new Date(birthDate);
    const months = Math.floor((today - birth) / (1000 * 60 * 60 * 24 * 30));
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years}a ${remainingMonths}m`;
  };

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showHealthStatusModal, setShowHealthStatusModal] = useState(false);

  const getHealthStatusConfig = (status) => {
    const configs = {
      Sano: {
        label: 'Sano',
        color: 'text-gray-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      Enfermo: {
        label: 'Enfermo',
        color: 'text-gray-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      },
      Critico: {
        label: 'Crítico',
        color: 'text-gray-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    };
    return configs[status] || {
      label: 'Sin datos',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
  };

  const getStatusConfig = (status) => {
    const configs = {
      Activo: { label: 'Activo', color: 'bg-green-50 text-green-700 border-green-200' },
      Vendido: { label: 'Vendido', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      Muerto: { label: 'Muerto', color: 'bg-red-50 text-red-700 border-red-200' },
      Perdido: { label: 'Perdido', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    };
    return configs[status] || { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const getEventTypeIcon = (eventType) => {
    const icons = {
      Nacimiento: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      Muerte: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      Compra: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      Venta: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      Perdida: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      Encuentro: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      Parto: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      Enfermedad: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    };
    return icons[eventType] || (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Cargando detalles del animal...</p>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  if (!animal) {
    return (
      <ProducerLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Animal no encontrado</h3>
            <button
              onClick={() => navigate('/producer/animales')}
              className="mt-4 px-6 py-2.5 text-white rounded-lg font-medium"
              style={{ backgroundColor: '#3FA79F' }}
            >
              Volver a Animales
            </button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  const healthConfig = getHealthStatusConfig(animal.healthStatus);
  const statusConfig = getStatusConfig(animal.status);
  const age = calculateAge(animal.birthDate);
  const weightGain = timeline?.weightGain || (animal.currentWeight - animal.birthWeight);

  return (
    <ProducerLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Contextual Header */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/producer/animales')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Explorador
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-gray-50 text-gray-700 font-mono rounded border border-gray-200 text-sm font-medium">
                  #{animal.tagNumber}
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <span className={`px-2.5 py-1 text-xs rounded font-medium border ${animal.sex === 'Macho' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  {animal.sex}
                </span>
                <span className={`px-2.5 py-1 text-xs rounded font-medium border ${healthConfig.color} ${healthConfig.bgColor} ${healthConfig.borderColor}`}>
                  {healthConfig.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#3FA79F' }}>
                {animal.name || 'Sin nombre asignado'}
              </h1>
              <p className="text-sm text-gray-600">{animal.breed}</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Primary Action */}
              <button
                onClick={() => setShowEventModal(true)}
                className="px-4 py-2.5 text-white rounded-lg font-medium hover:brightness-95 transition-all flex items-center gap-2"
                style={{ backgroundColor: '#3FA79F' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Evento
              </button>

              {/* Secondary Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Más acciones"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {showActionMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      <button
                        onClick={handleQuickWeightRegistration}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        Registrar Peso
                      </button>
                      <button
                        onClick={() => { setShowActionMenu(false); toast.info('Función en desarrollo'); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Registrar Movimiento
                      </button>
                      <button
                        onClick={() => { setShowActionMenu(false); toast.info('Función en desarrollo'); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Aplicar Servicio
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => { setShowActionMenu(false); toast.info('Función en desarrollo'); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Marcar como Inactivo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* General Information - Technical Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
            Información General
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Ubicación Actual</p>
              <p className="text-sm font-semibold text-gray-900">{timeline?.currentFarmName || animal.farmName || 'Sin finca'}</p>
              <p className="text-xs text-gray-600">{timeline?.currentDivisionName || animal.divisionName || 'Sin división'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Nacimiento</p>
              <p className="text-sm font-semibold text-gray-900">
                {animal.birthDate ? new Date(animal.birthDate).toLocaleDateString('es-ES') : 'Desconocida'}
              </p>
              <p className="text-xs text-gray-600">Edad: {age}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Peso Actual</p>
              <p className="text-sm font-semibold text-gray-900">{animal.currentWeight ? `${animal.currentWeight} kg` : 'Sin registro'}</p>
              <p className="text-xs text-gray-600">
                Al nacer: {animal.birthWeight ? `${animal.birthWeight} kg` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Ganancia</p>
              <p className="text-sm font-semibold text-gray-900">
                {weightGain > 0 ? `+${weightGain.toFixed(1)} kg` : 'N/A'}
              </p>
              <p className="text-xs text-gray-600">Desde nacimiento</p>
            </div>
          </div>
        </div>

        {/* Two-Column Layout for Status and Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Status Cards */}
          <div className="space-y-5">
            {/* Sanitary Status - Status-Focused Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Estado Sanitario
                </h3>
                <button
                  onClick={() => setShowHealthStatusModal(true)}
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#3FA79F' }}
                >
                  Cambiar Estado
                </button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-lg ${healthConfig.bgColor} border ${healthConfig.borderColor} flex items-center justify-center ${healthConfig.color}`}>
                  {healthConfig.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{healthConfig.label}</p>
                  <p className="text-xs text-gray-500">Estado actual del animal</p>
                </div>
              </div>
              {animal.healthStatus === 'Enfermo' || animal.healthStatus === 'Critico' ? (
                <div className={`px-3 py-2 rounded-lg ${healthConfig.bgColor} border ${healthConfig.borderColor}`}>
                  <p className="text-xs font-medium text-gray-700">
                    Requiere atención veterinaria
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700">
                    Animal en buen estado
                  </p>
                </div>
              )}
            </div>

            {/* Reproductive Status - Mirrored Structure */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                Estado Reproductivo
              </h3>
              {animal.sex === 'Hembra' ? (
                <div className="space-y-3">
                  {animal.estadoReproductivo ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {animal.estadoReproductivo.diasGestacion ?
                              `Preñada (${animal.estadoReproductivo.diasGestacion} días)` :
                              'Vacía'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {animal.estadoReproductivo.fechaPartoEstimada ?
                              `Parto estimado: ${new Date(animal.estadoReproductivo.fechaPartoEstimada).toLocaleDateString('es-ES')}` :
                              'Estado reproductivo actual'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Último parto</p>
                          <p className="text-gray-700">
                            {animal.estadoReproductivo.ultimoParto ?
                              new Date(animal.estadoReproductivo.ultimoParto).toLocaleDateString('es-ES') :
                              'Sin registros'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Crías</p>
                          <p className="text-gray-700">{animal.estadoReproductivo.numeroCrias || 0} registradas</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Sin datos</p>
                          <p className="text-xs text-gray-500">Información no disponible</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Último parto</p>
                          <p className="text-gray-700">Sin registros</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Crías</p>
                          <p className="text-gray-700">0 registradas</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">No aplica</p>
                    <p className="text-xs text-gray-500">Animal macho</p>
                  </div>
                </div>
              )}
            </div>

            {/* Movement History - Secondary Block */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                Historial de Movimientos
              </h3>
              {timeline?.movements && timeline.movements.length > 0 ? (
                <div className="space-y-2">
                  {timeline.movements.slice(0, 3).map((movement) => (
                    <div key={movement.id} className="px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <p className="text-xs font-medium text-gray-900">
                          {movement.fromFarmName} → {movement.toFarmName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(movement.movementDate).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Sin movimientos registrados</p>
              )}
            </div>
          </div>

          {/* Right Column: Timeline and Services */}
          <div className="space-y-5">
            {/* Events Timeline - Compact Chronological */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                Línea de Tiempo
              </h3>
              {timeline?.events && timeline.events.length > 0 ? (
                <div className="space-y-2">
                  {timeline.events.map((event) => (
                    <div key={event.id} className="flex gap-3 px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <div className="flex-shrink-0 w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                        {getEventTypeIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-900">{event.type}</p>
                            {(event.notes || event.description) && (
                              <p className="text-xs text-gray-600 truncate">{event.notes || event.description}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(event.eventDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">Sin eventos registrados</p>
              )}
            </div>

            {/* Applied Services - Secondary Block */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                Servicios Aplicados
              </h3>
              {servicesLoading ? (
                <div className="text-center py-6">
                  <svg className="animate-spin h-5 w-5 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : services.length > 0 ? (
                <div className="space-y-2">
                  {services.slice(0, 3).map((service) => (
                    <div key={service.id} className="px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-900">{service.tipo}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          service.estado === 'Completado' ? 'bg-green-50 text-green-700 border-green-200' :
                          service.estado === 'En proceso' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {service.estado}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {service.fechaProgramada
                          ? new Date(service.fechaProgramada).toLocaleDateString('es-ES')
                          : 'Sin fecha'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : timeline?.services && timeline.services.length > 0 ? (
                <div className="space-y-2">
                  {timeline.services.slice(0, 3).map((service) => (
                    <div key={service.id} className="px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <p className="text-xs font-medium text-gray-900 mb-1">{service.type}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(service.serviceDate).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">Sin servicios registrados</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        animalId={animal.id}
        animal={animal}
        eventTypePreset={eventTypePreset}
        onClose={() => {
          setShowEventModal(false);
          setEventTypePreset(null);
        }}
        onEventCreated={handleEventCreated}
      />

      {/* Health Status Modal */}
      {showHealthStatusModal && (
        <HealthStatusModal
          animal={animal}
          onClose={() => setShowHealthStatusModal(false)}
          onStatusChanged={() => {
            setShowHealthStatusModal(false);
            fetchAnimalDetails();
            fetchAnimalTimeline();
            toast.success('Estado sanitario actualizado');
          }}
        />
      )}
    </ProducerLayout>
  );
}
