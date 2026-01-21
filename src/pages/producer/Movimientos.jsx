import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ProducerLayout from '../../components/layout/ProducerLayout';
import MovimientoModal from '../../components/producer/MovimientoModal';
import { movementsAPI } from '../../api/movements';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { getProducerId } from '../../lib/auth';

export default function Movimientos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    farmId: null,
    divisionId: null,
    dateFrom: null,
    dateTo: null
  });

  useEffect(() => {
    fetchFarms();
    fetchMovimientos();
  }, []);

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

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const producerId = getProducerId();
      const params = {
        producerId: producerId
      };

      if (filters.farmId) params.farmId = filters.farmId;
      if (filters.divisionId) params.divisionId = filters.divisionId;
      if (filters.dateFrom) params.startDate = filters.dateFrom;
      if (filters.dateTo) params.endDate = filters.dateTo;

      const movimientosData = await movementsAPI.getAllMovements(params);
      setMovimientos(movimientosData || []);
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleMovementSuccess = () => {
    fetchMovimientos();
  };

  const handleApplyFilters = () => {
    fetchMovimientos();
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      farmId: null,
      divisionId: null,
      dateFrom: null,
      dateTo: null
    });
    setTimeout(() => fetchMovimientos(), 100);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search is handled by filtering the displayed movements
  };

  // Filter movements by search query
  const filteredMovimientos = movimientos.filter(mov => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mov.animalTagNumber?.toLowerCase().includes(query) ||
      mov.fromDivisionName?.toLowerCase().includes(query) ||
      mov.toDivisionName?.toLowerCase().includes(query) ||
      mov.fromFarmName?.toLowerCase().includes(query) ||
      mov.toFarmName?.toLowerCase().includes(query)
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
  const totalMovimientos = movimientos.length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const movimientosThisMonth = movimientos.filter(m => {
    const movDate = new Date(m.movementDate);
    return movDate.getMonth() === currentMonth && movDate.getFullYear() === currentYear;
  });

  const animalsMovedThisMonth = movimientosThisMonth.length;

  const lastMovement = movimientos.length > 0 ? movimientos[0] : null;

  return (
    <ProducerLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header - Clear Hierarchy */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Movimientos de Animales</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona el traslado de animales entre divisiones
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow transition-all text-white"
            style={{ backgroundColor: '#3FA79F' }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#368D86')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#3FA79F')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Movimiento
          </button>
        </div>

        {/* Unified Search/Control Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por animal, división o finca..."
              className="w-full pl-12 pr-4 py-3 focus:outline-none transition-all bg-transparent text-sm"
            />
          </div>
          <div className="h-10 w-px bg-gray-200"></div>
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Filtros</span>
            {(filters.farmId || filters.divisionId || filters.dateFrom || filters.dateTo) && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full" style={{ backgroundColor: '#3FA79F' }}>
                !
              </span>
            )}
          </button>
        </form>

        {/* Compact KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Total Movimientos</p>
                <p className="text-2xl font-bold text-gray-900">{totalMovimientos}</p>
              </div>
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">{animalsMovedThisMonth}</p>
              </div>
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Último Movimiento</p>
                <p className="text-lg font-bold text-gray-900">
                  {lastMovement ? format(new Date(lastMovement.movementDate), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                </p>
              </div>
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Movement History Table - Primary Focal Point */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Historial de Movimientos</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredMovimientos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {searchQuery || filters.farmId || filters.divisionId || filters.dateFrom || filters.dateTo
                  ? 'No se encontraron movimientos'
                  : 'No hay movimientos registrados'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {searchQuery || filters.farmId || filters.divisionId || filters.dateFrom || filters.dateTo
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza registrando tu primer movimiento de animales'}
              </p>
              {!searchQuery && !filters.farmId && !filters.divisionId && !filters.dateFrom && !filters.dateTo && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors text-sm"
                  style={{ backgroundColor: '#3FA79F' }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#368D86')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#3FA79F')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar Primer Movimiento
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Animal
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Origen
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider w-12">
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Destino
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Alcance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {format(new Date(mov.movementDate), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(mov.movementDate), 'HH:mm', { locale: es })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-sm font-medium text-gray-900">
                          #{mov.animalTagNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">{mov.fromDivisionName}</span>
                          </div>
                          <p className="text-xs text-gray-500 pl-5">{mov.fromFarmName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <svg className="w-5 h-5 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">{mov.toDivisionName}</span>
                          </div>
                          <p className="text-xs text-gray-500 pl-5">{mov.toFarmName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {mov.fromFarmId === mov.toFarmId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-md text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Interna
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border text-xs font-medium rounded-md" style={{ backgroundColor: '#F0F9F8', borderColor: '#3FA79F', color: '#3FA79F' }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Entre Fincas
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Filter Drawer */}
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setIsFilterDrawerOpen(false)}
            />

            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-xl z-50 transform transition-transform">
              <div className="h-full flex flex-col">
                {/* Drawer Header */}
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Filtros</h3>
                  <button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Finca</label>
                    <select
                      value={filters.farmId || ''}
                      onChange={(e) => setFilters({ ...filters, farmId: e.target.value ? parseInt(e.target.value) : null, divisionId: null })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    >
                      <option value="">Todas las fincas</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>{farm.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">División</label>
                    <select
                      value={filters.divisionId || ''}
                      onChange={(e) => setFilters({ ...filters, divisionId: e.target.value ? parseInt(e.target.value) : null })}
                      disabled={!filters.farmId || divisions.length === 0}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    >
                      <option value="">Todas las divisiones</option>
                      {divisions.map(division => (
                        <option key={division.id} value={division.id}>{division.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Fecha desde</label>
                    <input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Fecha hasta</label>
                    <input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 text-sm"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors text-sm"
                    style={{ backgroundColor: '#3FA79F' }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#368D86')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#3FA79F')}
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Movement Modal */}
        {isModalOpen && (
          <MovimientoModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleMovementSuccess}
          />
        )}
      </div>
    </ProducerLayout>
  );
}
