import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import AnimalModal from '../../components/producer/AnimalModal';
import HealthStatusModal from '../../components/producer/HealthStatusModal';
import EventModal from '../../components/producer/EventModal';
import { animalsAPI } from '../../api/animals';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { getPlanLimit } from '../../lib/plan';
import toast from 'react-hot-toast';

export default function Animales() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
  const [selectedAnimalForHealthChange, setSelectedAnimalForHealthChange] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedAnimalForEvent, setSelectedAnimalForEvent] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [limitBannerDismissed, setLimitBannerDismissed] = useState(false);
  const [showUnidentified, setShowUnidentified] = useState(false);
  const [unidentifiedAnimals, setUnidentifiedAnimals] = useState([]);
  const [unidentifiedLoading, setUnidentifiedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
    totalPages: 1,
  });

  // Filters — pre-populate from URL params when navigating from FarmDetail
  const AGE_PRESETS = [
    { key: 'lt6',   label: 'Menos de 6 meses', edadMin: '',  edadMax: 5  },
    { key: '6to12', label: '6 meses a 1 año',  edadMin: 6,   edadMax: 11 },
    { key: '1to2',  label: '1 a 2 años',       edadMin: 12,  edadMax: 23 },
    { key: 'gt2',   label: 'Más de 2 años',    edadMin: 24,  edadMax: '' },
  ];

  const [filters, setFilters] = useState({
    farmId: searchParams.get('farmId') || '',
    divisionId: searchParams.get('divisionId') || '',
    status: 'Activo',
    sexo: '',
    edadMin: '',
    edadMax: '',
    agePreset: '',
    estadoSalud: '',
    searchQuery: '',
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    fetchFarms();
    fetchActiveCount();
  }, []);

  useEffect(() => {
    if (showUnidentified) fetchUnidentified();
  }, [showUnidentified]);

  useEffect(() => {
    fetchAnimals();
  }, [filters.page, filters.searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchQuery, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (filters.farmId) {
      fetchDivisions(filters.farmId);
    } else {
      setDivisions([]);
      setFilters(prev => ({ ...prev, divisionId: '' }));
    }
  }, [filters.farmId]);

  const fetchActiveCount = async () => {
    try {
      const data = await animalsAPI.getAnimals({ status: 'Activo', pageSize: 1, page: 1 });
      setActiveCount(data.totalCount ?? 0);
    } catch {
      // non-fatal
    }
  };

  const fetchUnidentified = async () => {
    setUnidentifiedLoading(true);
    try {
      const data = await animalsAPI.getAnimals({ status: 'Activo', pageSize: 500 });
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setUnidentifiedAnimals(list.filter(a => !a.tagNumber || !a.name));
    } catch {
      toast.error('Error al cargar animales sin identificar');
    } finally {
      setUnidentifiedLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const farmsData = await farmsAPI.getAllFarms();
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
      status: 'Activo',
      sexo: '',
      edadMin: '',
      edadMax: '',
      agePreset: '',
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
    fetchActiveCount();
    setLimitBannerDismissed(false); // re-show warning if now closer to limit
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
      Fallecido: { label: 'Fallecido', color: 'bg-gray-100 text-gray-600 border-gray-300' },
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
    const birth = new Date(birthDate + 'T00:00:00');
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
        {/* ── Plan limit banner ── */}
        {(() => {
          const limit = getPlanLimit('animals');
          if (!isFinite(limit) || activeCount === 0) return null;
          const atLimit   = activeCount >= limit;
          const nearLimit = !atLimit && activeCount >= Math.floor(limit * 0.8);
          if (atLimit) {
            return (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700">Límite de animales alcanzado</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Tienes <strong>{activeCount}</strong> de <strong>{limit}</strong> animales activos permitidos en tu plan. Para añadir más, inactiva animales o actualiza tu plan.
                  </p>
                </div>
              </div>
            );
          }
          if (nearLimit && !limitBannerDismissed) {
            return (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700">Próximo al límite de tu plan</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Tienes <strong>{activeCount}</strong> de <strong>{limit}</strong> animales activos. Te quedan <strong>{limit - activeCount}</strong> {limit - activeCount === 1 ? 'espacio' : 'espacios'} disponibles.
                  </p>
                </div>
                <button
                  onClick={() => setLimitBannerDismissed(true)}
                  className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
                  aria-label="Cerrar aviso"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Explorador de Animales</h1>
          <p className="text-sm text-gray-400 mt-0.5">
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
              onClick={() => {
                const limit = getPlanLimit('animals');
                if (isFinite(limit) && activeCount >= limit) {
                  toast.error(`Has alcanzado el límite de ${limit} animales activos de tu plan. Marca animales como vendidos o muertos para liberar cupo, o actualiza tu plan.`);
                  return;
                }
                setIsAnimalModalOpen(true);
              }}
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

                  {/* Health Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Salud</label>
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
                  {/* Age Preset Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Edad</label>
                    <div className="grid grid-cols-2 gap-2">
                      {AGE_PRESETS.map(preset => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            const isActive = filters.agePreset === preset.key;
                            setFilters(prev => ({
                              ...prev,
                              agePreset: isActive ? '' : preset.key,
                              edadMin: isActive ? '' : preset.edadMin,
                              edadMax: isActive ? '' : preset.edadMax,
                              page: 1,
                            }));
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            filters.agePreset === preset.key
                              ? 'border-[#3FA79F] bg-teal-50 text-teal-800 font-medium'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
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

        {/* Quick filter: unidentified */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnidentified(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              showUnidentified
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Sin identificar
            {showUnidentified && !unidentifiedLoading && (
              <span className="bg-amber-200 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unidentifiedAnimals.length}
              </span>
            )}
          </button>
        </div>

        {/* Unidentified view */}
        {showUnidentified ? (
          <div className="space-y-4">
            {/* Tip banner */}
            <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800">Animales sin nombre o sin arete</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Puedes registrar un animal sin arete y asignarlo después. Para reconocer fácilmente qué animal estás editando, se recomienda agregar una foto desde el perfil del animal.
                </p>
              </div>
            </div>

            {unidentifiedLoading ? (
              <div className="flex justify-center py-10">
                <svg className="animate-spin h-8 w-8" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : unidentifiedAnimals.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <svg className="w-12 h-12 mx-auto text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">Todos los animales están identificados</p>
                <p className="text-xs text-gray-400 mt-1">No hay animales sin nombre ni arete pendiente.</p>
              </div>
            ) : (() => {
                const noTag  = unidentifiedAnimals.filter(a => !a.tagNumber);
                const noName = unidentifiedAnimals.filter(a => a.tagNumber && !a.name);

                const AnimalCard = ({ animal, highlightTag }) => {
                  const healthConfig = getHealthStatusConfig(animal.healthStatus);
                  const sexConfig = getSexIconConfig(animal.sex);
                  const age = calculateAge(animal.birthDate);
                  return (
                    <div
                      key={animal.id}
                      onClick={() => navigate(`/producer/animales/${animal.id}`)}
                      className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-all cursor-pointer group ${highlightTag ? 'border-amber-200 hover:border-amber-300' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${animal.photoUrl ? 'border-gray-200' : `${sexConfig.bgColor} ${sexConfig.borderColor}`}`}>
                            {animal.photoUrl
                              ? <img src={animal.photoUrl} alt="animal" className="w-full h-full object-cover" />
                              : <div className={`w-full h-full flex items-center justify-center ${sexConfig.bgColor} ${sexConfig.textColor}`}>{sexConfig.icon}</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-base font-semibold text-gray-900 truncate">
                                {animal.name
                                  ? animal.tagNumber ? `#${animal.tagNumber} · ${animal.name}` : animal.name
                                  : animal.tagNumber
                                    ? <span className="font-mono">#{animal.tagNumber}</span>
                                    : <span className="text-gray-400 italic">Sin identificar</span>
                                }
                              </h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${healthConfig.color}`}>
                                {healthConfig.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {!animal.tagNumber && (
                                <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-medium">Sin arete</span>
                              )}
                              {!animal.name && (
                                <span className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Sin nombre</span>
                              )}
                              {!animal.photoUrl && (
                                <span className="text-xs bg-gray-50 border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded">Sin foto</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                        <span>{animal.farmName || 'Sin ubicación'}{animal.divisionName ? ` · ${animal.divisionName}` : ''}</span>
                        <span className="text-gray-400">{age}</span>
                      </div>
                      <div className="px-4 py-2.5 bg-white border-t border-gray-100">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/producer/animales/${animal.id}`); }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded transition-colors"
                          style={{ backgroundColor: '#3FA79F' }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Completar información
                        </button>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-6">
                    {/* Section 1: Sin arete */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-semibold text-gray-800">Sin arete / número</h4>
                        <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">{noTag.length}</span>
                      </div>
                      {noTag.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3 pl-1">Todos los animales tienen arete asignado.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {noTag.map(a => <AnimalCard key={a.id} animal={a} highlightTag />)}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Sin nombre */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-semibold text-gray-800">Sin nombre</h4>
                        <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">{noName.length}</span>
                      </div>
                      {noName.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3 pl-1">Todos los animales con arete tienen nombre registrado.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {noName.map(a => <AnimalCard key={a.id} animal={a} highlightTag={false} />)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            }
          </div>
        ) : (
        <>

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
                      {/* Photo / Sex Indicator */}
                      <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${animal.photoUrl ? 'border-gray-200' : `${sexConfig.bgColor} ${sexConfig.borderColor}`}`}>
                        {animal.photoUrl
                          ? <img src={animal.photoUrl} alt={animal.tagNumber} className="w-full h-full object-cover" />
                          : <div className={`w-full h-full flex items-center justify-center ${sexConfig.bgColor} ${sexConfig.textColor}`}>{sexConfig.icon}</div>
                        }
                      </div>

                      {/* Identity & Health */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {animal.name || (animal.tagNumber ? `#${animal.tagNumber}` : 'Sin nombre')}
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
                              <span className="font-mono font-medium">{animal.tagNumber ? `#${animal.tagNumber}` : 'Sin arete'}</span>
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
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {animal.farmName
                            ? animal.divisionName
                              ? `${animal.farmName} (${animal.divisionName})`
                              : animal.farmName
                            : 'Sin ubicación'}
                        </p>
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
                          <span className="text-xs text-gray-900">{animal.weight ? `${animal.weight} kg` : 'Sin registro'}</span>
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
        </>
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
