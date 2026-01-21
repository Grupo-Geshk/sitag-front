import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import AnimalModal from '../../components/producer/AnimalModal';
import HealthStatusModal from '../../components/producer/HealthStatusModal';
import EventModal from '../../components/producer/EventModal';
import { animalsAPI } from '../../api/animals';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function Animales() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
  const [selectedAnimalForHealthChange, setSelectedAnimalForHealthChange] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedAnimalForEvent, setSelectedAnimalForEvent] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
    totalPages: 1,
  });

  // Filters
  const [filters, setFilters] = useState({
    farmId: '',
    divisionId: '',
    status: 'Activo', // Default to showing active animals
    sexo: '',
    edadMin: '',
    edadMax: '',
    estadoSalud: '',
    searchQuery: '',
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    fetchAnimals();
  }, [filters.page]);

  useEffect(() => {
    if (filters.farmId) {
      fetchDivisions(filters.farmId);
    } else {
      setDivisions([]);
      setFilters(prev => ({ ...prev, divisionId: '' }));
    }
  }, [filters.farmId]);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const fetchDivisions = async (farmId) => {
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setDivisions(divisionsData);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      const data = await animalsAPI.getAnimals(filters);
      setAnimals(data.items || []);
      setPagination({
        totalCount: data.totalCount || 0,
        pageNumber: data.pageNumber || 1,
        pageSize: data.pageSize || 20,
        totalPages: data.totalPages || 1,
      });
    } catch (error) {
      console.error('Error fetching animals:', error);
      toast.error('Error al cargar los animales');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleApplyFilters = () => {
    setFilters(prev => ({ ...prev, searchQuery, page: 1 }));
    setTimeout(() => fetchAnimals(), 0);
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      farmId: '',
      divisionId: '',
      status: 'Activo', // Default to active animals
      sexo: '',
      edadMin: '',
      edadMax: '',
      estadoSalud: '',
      searchQuery: '',
      page: 1,
      pageSize: 20,
    });
    setTimeout(() => fetchAnimals(), 0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, searchQuery, page: 1 }));
    setTimeout(() => fetchAnimals(), 0);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleAnimalCreated = () => {
    fetchAnimals();
  };

  const handleHealthStatusChanged = () => {
    fetchAnimals();
    setSelectedAnimalForHealthChange(null);
  };

  const handleEventCreated = () => {
    setShowEventModal(false);
    setSelectedAnimalForEvent(null);
    fetchAnimals();
    toast.success('Evento registrado exitosamente');
  };

  // Prevent Escape key from closing filter drawer
  useEffect(() => {
    if (!isFilterDrawerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isFilterDrawerOpen]);

  // Prevent body scroll when filter drawer is open
  useEffect(() => {
    if (isFilterDrawerOpen) {
      document.body.classList.add('filter-drawer-open');
    } else {
      document.body.classList.remove('filter-drawer-open');
    }

    return () => {
      document.body.classList.remove('filter-drawer-open');
    };
  }, [isFilterDrawerOpen]);

  const getHealthStatusConfig = (status) => {
    const configs = {
      Sano: { label: 'Sano', color: 'bg-green-50 text-green-700 border-green-200' },
      Enfermo: { label: 'Enfermo', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      EnTratamiento: { label: 'En Tratamiento', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      Critico: { label: 'Crítico', color: 'bg-red-50 text-red-700 border-red-200' },
    };
    return configs[status] || { label: 'Sin datos', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  };

  const getSexIconConfig = (sex) => {
    if (sex === 'Macho') {
      return {
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4v6h-2V7.425l-3.975 3.95q.475.7.725 1.488T15 14.5q0 2.3-1.6 3.9T9.5 20t-3.9-1.6T4 14.5t1.6-3.9T9.5 9q.825 0 1.625.237t1.475.738L16.575 6H14V4zM9.5 11q-1.45 0-2.475 1.025T6 14.5t1.025 2.475T9.5 18t2.475-1.025T13 14.5t-1.025-2.475T9.5 11"/>
          </svg>
        ),
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-100'
      };
    } else {
      return {
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 14 14">
            <path fillRule="evenodd" d="M7 1.5A3.25 3.25 0 1 0 7 8a3.25 3.25 0 0 0 0-6.5m4.75 3.25a4.75 4.75 0 0 1-4 4.691v1.309h.75a.75.75 0 0 1 0 1.5h-.75v1a.75.75 0 0 1-1.5 0v-1H5.5a.75.75 0 0 1 0-1.5h.75V9.441a4.751 4.751 0 1 1 5.5-4.691" clipRule="evenodd"/>
          </svg>
        ),
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-600',
        borderColor: 'border-rose-100'
      };
    }
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

  return (
    <ProducerLayout>
      <AnimalModal
        isOpen={isAnimalModalOpen}
        onClose={() => setIsAnimalModalOpen(false)}
        onAnimalCreated={handleAnimalCreated}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold mb-2" style={{ color: '#3FA79F' }}>
            Explorador de Animales
          </h1>
          <p className="text-gray-600">
            ¿Dónde está cada animal y cuáles requieren atención?
          </p>
        </div>

        {/* Unified Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Search Input Area */}
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, número de arete o identificador..."
              className="w-full pl-12 pr-4 py-3 focus:outline-none transition-all bg-transparent"
              onFocus={(e) => (e.target.parentElement.parentElement.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.parentElement.parentElement.style.borderColor = '#D1D5DB')}
            />
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-gray-200"></div>

          {/* Action Buttons */}
          <div className="flex items-center">
            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline font-medium">Filtros</span>
            </button>

            {/* Subtle divider between buttons */}
            <div className="h-6 w-px bg-gray-200"></div>

            {/* Register Animal Button */}
            <button
              type="button"
              onClick={() => setIsAnimalModalOpen(true)}
              className="px-4 py-3 text-white hover:brightness-95 transition-all flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F' }}
              title="Registrar Animal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline font-medium">Registrar</span>
            </button>
          </div>
        </form>

        {/* Filter Drawer */}
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop - Translucent with Blur */}
            <div className="fixed inset-0 z-40 filter-drawer-backdrop" />

            {/* Drawer Panel - Slide Animation */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto filter-drawer-panel">
              <div className="p-6 space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Filtros Avanzados</h3>
                  <button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                  {/* Farm Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Finca</label>
                    <select
                      value={filters.farmId}
                      onChange={(e) => handleFilterChange('farmId', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="">Todas las fincas</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>{farm.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Division Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">División</label>
                    <select
                      value={filters.divisionId}
                      onChange={(e) => handleFilterChange('divisionId', e.target.value)}
                      disabled={!filters.farmId || divisions.length === 0}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      onFocus={(e) => !e.target.disabled && (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="">Todas las divisiones</option>
                      {divisions.map(division => (
                        <option key={division.id} value={division.id}>{division.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado del Animal</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="Activo">Activos</option>
                      <option value="NoActivo">No activos</option>
                      <option value="">Todos</option>
                    </select>
                  </div>

                  {/* Sex Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                    <select
                      value={filters.sexo}
                      onChange={(e) => handleFilterChange('sexo', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="">Todos</option>
                      <option value="Macho">Macho</option>
                      <option value="Hembra">Hembra</option>
                    </select>
                  </div>

                  {/* Age Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Edad Mínima (meses)</label>
                    <input
                      type="number"
                      value={filters.edadMin}
                      onChange={(e) => handleFilterChange('edadMin', e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Edad Máxima (meses)</label>
                    <input
                      type="number"
                      value={filters.edadMax}
                      onChange={(e) => handleFilterChange('edadMax', e.target.value)}
                      min="0"
                      placeholder="Sin límite"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
                  </div>

                  {/* Health Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado Sanitario</label>
                    <select
                      value={filters.estadoSalud}
                      onChange={(e) => handleFilterChange('estadoSalud', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="">Todos</option>
                      <option value="Sano">Sano</option>
                      <option value="Enfermo">Enfermo</option>
                      <option value="EnTratamiento">En Tratamiento</option>
                      <option value="Critico">Crítico</option>
                    </select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleApplyFilters}
                    className="w-full px-6 py-2.5 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#3FA79F' }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#368D86')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#3FA79F')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Aplicar Filtros
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="w-full px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Drawer Styles */}
            <style>{`
              /* Backdrop - Soft translucent with blur */
              .filter-drawer-backdrop {
                background-color: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                animation: filterBackdropFadeIn 0.25s ease-out;
              }

              /* Drawer Panel - Slide from right */
              .filter-drawer-panel {
                animation: filterDrawerSlideIn 0.3s ease-out;
              }

              /* Backdrop fade in animation */
              @keyframes filterBackdropFadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }

              /* Drawer slide in from right to left */
              @keyframes filterDrawerSlideIn {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }

              /* Prevent body scroll when drawer is open */
              body.filter-drawer-open {
                overflow: hidden;
              }
            `}</style>
          </>
        )}

        {/* Results Info */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {animals.length === 0 ? 0 : ((pagination.pageNumber - 1) * pagination.pageSize + 1)} - {Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount)} de {pagination.totalCount} animales
          </p>
        </div>

        {/* Animals List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Cargando animales...</p>
            </div>
          </div>
        ) : animals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron animales</h3>
            <p className="text-gray-500">
              {Object.values(filters).some(v => v && v !== 1 && v !== 20)
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay animales registrados'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {animals.map((animal) => {
              const healthConfig = getHealthStatusConfig(animal.healthStatus);
              const sexConfig = getSexIconConfig(animal.sex);
              const age = calculateAge(animal.birthDate);

              return (
                <div
                  key={animal.id}
                  onClick={() => navigate(`/producer/animales/${animal.id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
                >
                  {/* Card Header - Identity & Health Status */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      {/* Circular Sex Indicator */}
                      <div className={`w-10 h-10 rounded-full ${sexConfig.bgColor} ${sexConfig.borderColor} border flex items-center justify-center flex-shrink-0 ${sexConfig.textColor}`}>
                        {sexConfig.icon}
                      </div>

                      {/* Identity & Health */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {animal.name || `#${animal.tagNumber}`}
                          </h3>
                          <div className="flex flex-col gap-1 items-end">
                            {/* Animal Status Badge (if not active) */}
                            {animal.status && animal.status !== 'Activo' && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border flex-shrink-0 ${
                                animal.status === 'Vendido' ? 'bg-red-50 border-red-200 text-red-800' :
                                animal.status === 'Muerto' ? 'bg-gray-100 border-gray-300 text-gray-700' :
                                animal.status === 'Perdido' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                'bg-gray-50 border-gray-200 text-gray-600'
                              }`}>
                                {animal.status}
                              </span>
                            )}
                            {/* Health Status Badge - Top Right */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${healthConfig.color}`}>
                              {healthConfig.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          {animal.name && (
                            <>
                              <span className="font-mono font-medium">#{animal.tagNumber}</span>
                              <span className="text-gray-400">•</span>
                            </>
                          )}
                          <span className="truncate">{animal.breed}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compact Metadata Block */}
                  <div className="px-4 py-3 bg-gray-50">
                    <div className="space-y-2">
                      {/* Location */}
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{animal.farmName}</p>
                          <p className="text-xs text-gray-600 truncate">{animal.divisionName || 'Sin división'}</p>
                        </div>
                      </div>

                      {/* Age & Weight */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs text-gray-900">{age}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          <span className="text-xs text-gray-900">{animal.currentWeight ? `${animal.currentWeight} kg` : 'Sin registro'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="px-4 py-3 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnimalForHealthChange(animal);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                        title="Cambiar estado"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="hidden sm:inline">Estado</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnimalForEvent(animal);
                          setShowEventModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                        title="Registrar evento"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Evento</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/producer/animales/${animal.id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded transition-colors"
                        style={{ backgroundColor: '#3FA79F' }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#368D86')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#3FA79F')}
                        title="Ver detalle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">Detalle</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl shadow-md p-4 border-2 border-gray-100">
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
      </div>

      {/* Event Modal */}
      {showEventModal && selectedAnimalForEvent && (
        <EventModal
          isOpen={showEventModal}
          animalId={selectedAnimalForEvent.id}
          animal={selectedAnimalForEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedAnimalForEvent(null);
          }}
          onEventCreated={handleEventCreated}
        />
      )}

      {/* Health Status Modal */}
      {selectedAnimalForHealthChange && (
        <HealthStatusModal
          animal={selectedAnimalForHealthChange}
          onClose={() => setSelectedAnimalForHealthChange(null)}
          onStatusChanged={handleHealthStatusChanged}
        />
      )}
    </ProducerLayout>
  );
}
