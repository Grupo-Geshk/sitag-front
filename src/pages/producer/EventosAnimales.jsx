import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import { animalEventsAPI } from '../../api/animalEvents';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function EventosAnimales() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Event types with neutral icons for display (aligned with backend support)
  const eventTypeConfig = {
    'Nacimiento': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: false
    },
    'Parto': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: false
    },
    'Enfermedad': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: true
    },
    'Compra': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: false
    },
    'Venta': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: false
    },
    'Muerte': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: true
    },
    'Perdida': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: true
    },
    'Encuentro': {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      critical: false
    },
  };

  useEffect(() => {
    fetchData();
  }, [selectedEventType, selectedFarm, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const producerId = getProducerId();

      // Fetch farms for filter
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData);

      // Fetch events with filters
      const filters = { producerId };
      if (selectedFarm) filters.farmId = selectedFarm;
      if (selectedEventType) filters.eventType = selectedEventType;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const eventsData = await animalEventsAPI.getAllEvents(filters);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData();
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedEventType('');
    setSelectedFarm('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchData(), 0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Filter events by search query
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.eventType?.toLowerCase().includes(query) ||
      event.animal?.tagNumber?.toLowerCase().includes(query) ||
      event.animal?.name?.toLowerCase().includes(query) ||
      event.descripcion?.toLowerCase().includes(query) ||
      event.enfermedad?.toLowerCase().includes(query)
    );
  });

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

  // Calculate KPIs
  const totalEvents = events.length;
  const criticalEvents = events.filter(e => eventTypeConfig[e.eventType]?.critical).length;
  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {});

  // Get top 3 event types
  const topEventTypes = Object.entries(eventTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Calculate monthly trends (last 6 months)
  const getMonthlyTrends = () => {
    const months = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = 0;
    }

    // Count events per month
    events.forEach(event => {
      const eventDate = new Date(event.fecha);
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      if (months.hasOwnProperty(monthKey)) {
        months[monthKey]++;
      }
    });

    return Object.entries(months).map(([key, count]) => ({
      month: key,
      count,
      label: new Date(key + '-01').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
    }));
  };

  const monthlyTrends = getMonthlyTrends();
  const maxMonthlyCount = Math.max(...monthlyTrends.map(m => m.count), 1);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <ProducerLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold mb-2" style={{ color: '#3FA79F' }}>
            Eventos Animales
          </h1>
          <p className="text-gray-600">
            ¿Qué ha ocurrido en mi operación?
          </p>
        </div>

        {/* Compact KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Total de Eventos</p>
                <p className="text-2xl font-bold" style={{ color: '#3FA79F' }}>
                  {totalEvents}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center" style={{ color: '#3FA79F' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Eventos Críticos</p>
                <p className="text-2xl font-bold" style={{ color: '#3FA79F' }}>
                  {criticalEvents}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center" style={{ color: '#3FA79F' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Más Frecuente</p>
                <p className="text-base font-semibold" style={{ color: '#3FA79F' }}>
                  {topEventTypes[0] ? topEventTypes[0][0] : 'N/A'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center" style={{ color: '#3FA79F' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
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
              placeholder="Buscar por animal, tipo de evento o descripción..."
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
              title="Filtros Avanzados"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline font-medium">Filtros</span>
            </button>

            {/* Subtle divider between buttons */}
            <div className="h-6 w-px bg-gray-200"></div>

            {/* Navigate to Animals Explorer */}
            <button
              type="button"
              onClick={() => navigate('/producer/animales')}
              className="px-4 py-3 text-white hover:brightness-95 transition-all flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F' }}
              title="Ir a Explorador de Animales"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="hidden sm:inline font-medium">Ver animales</span>
            </button>
          </div>
        </form>

        {/* Filter Drawer */}
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 filter-drawer-backdrop" />

            {/* Drawer Panel */}
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
                  {/* Event Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento</label>
                    <select
                      value={selectedEventType}
                      onChange={(e) => setSelectedEventType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="">Todos los tipos</option>
                      {Object.keys(eventTypeConfig).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Farm Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Finca</label>
                    <select
                      value={selectedFarm}
                      onChange={(e) => setSelectedFarm(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    >
                      <option value="">Todas las fincas</option>
                      {farms.map(farm => (
                        <option key={farm.farmId} value={farm.farmId}>{farm.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                    />
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
              .filter-drawer-backdrop {
                background-color: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                animation: filterBackdropFadeIn 0.25s ease-out;
              }

              .filter-drawer-panel {
                animation: filterDrawerSlideIn 0.3s ease-out;
              }

              @keyframes filterBackdropFadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }

              @keyframes filterDrawerSlideIn {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }

              body.filter-drawer-open {
                overflow: hidden;
              }
            `}</style>
          </>
        )}

        {/* Event Type Distribution - Compact Chips */}
        {topEventTypes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              Distribución por Tipo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topEventTypes.map(([type, count]) => {
                const config = eventTypeConfig[type];
                return (
                  <div key={type} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                        {config?.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{type}</p>
                        <p className="text-xs text-gray-500">{count} evento{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-xl font-bold" style={{ color: '#3FA79F' }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Temporal Trends - Enhanced */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Tendencias Temporales
            </h2>
            <p className="text-sm text-gray-500">Evolución de eventos en los últimos 6 meses</p>
          </div>
          <div className="flex items-end justify-between gap-3 h-56 pt-4">
            {monthlyTrends.map(({ month, count, label }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col justify-end items-center" style={{ height: '180px' }}>
                  <div className="text-sm font-bold mb-2" style={{ color: '#3FA79F' }}>
                    {count > 0 ? count : ''}
                  </div>
                  <div
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${(count / maxMonthlyCount) * 100}%`,
                      backgroundColor: '#3FA79F',
                      minHeight: count > 0 ? '8px' : '0px'
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600 font-medium text-center">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Historial de Eventos
              </h2>
              <span className="text-sm text-gray-500">
                {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#3FA79F' }}></div>
              <p className="mt-4 text-gray-600">Cargando eventos...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-900 text-lg font-medium mb-1">No se encontraron eventos</p>
              <p className="text-gray-500 text-sm">Intenta ajustar los filtros o registra un nuevo evento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Animal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event, index) => {
                    const config = eventTypeConfig[event.eventType] || {
                      icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      ),
                      color: 'text-gray-700',
                      bgColor: 'bg-gray-50',
                      critical: false
                    };
                    return (
                      <tr
                        key={event.eventId}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-100/50 transition-colors border-b border-gray-50 last:border-0`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}>
                              {config.icon}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{event.eventType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              #{event.animal?.tagNumber || 'N/A'}
                            </div>
                            {event.animal?.name && (
                              <div className="text-gray-500 text-xs">{event.animal.name}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{formatDate(event.fecha)}</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-sm text-gray-900">
                            {event.descripcion || '-'}
                          </div>
                          {event.enfermedad && (
                            <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              {event.enfermedad}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-900">{event.animal?.farm?.name || 'N/A'}</div>
                          {event.animal?.division?.name && (
                            <div className="text-xs text-gray-500">{event.animal.division.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {config.critical && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Crítico
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProducerLayout>
  );
}
