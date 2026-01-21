import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import FarmModal from '../../components/producer/FarmModal';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function Farms() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farmsData, setFarmsData] = useState([]);
  const [overview, setOverview] = useState(null);

  // Fetch farms on mount
  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const producerId = getProducerId();
      const data = await farmsAPI.getFarmOverview(producerId);
      setOverview(data);

      // Map overview farms data to UI structure (data comes with animal counts)
      if (data.fincas && Array.isArray(data.fincas)) {
        const mappedFarms = data.fincas.map(farm => {
          const hasAlerts = farm.alertas && farm.alertas.length > 0;
          const hasHealthIssues = farm.animalesEnfermos > 0;

          let status = 'bueno';
          if (farm.alertas && farm.alertas.length > 2) {
            status = 'critico';
          } else if (hasAlerts || hasHealthIssues) {
            status = 'alerta';
          }

          return {
            id: farm.id,
            name: farm.nombre,
            ownership: farm.enPropiedad ? 'propia' : 'arrendada',
            location: farm.ubicacion || '',
            type: farm.tipo || '',
            totalAnimals: farm.totalAnimales || 0,
            activeAnimals: farm.animalesActivos || 0,
            sickAnimals: farm.animalesEnfermos || 0,
            lastEvent: farm.ultimoEvento
              ? `${farm.ultimoEvento.tipo} - ${formatRelativeDate(farm.ultimoEvento.fecha)}`
              : 'Sin eventos recientes',
            status: status,
            income: farm.economiaResumen?.ingresosMes || 0,
            expenses: farm.economiaResumen?.egresosMes || 0,
            monthlyTrend: [0, 0, 0, 0, 0, 0], // Placeholder for trend data
            alerts: farm.alertas || [],
          };
        });

        setFarmsData(mappedFarms);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
      toast.error('Error al cargar las fincas');
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  const handleFarmCreated = () => {
    fetchOverview();
  };

  // Mock data for demonstration (keeping a few for reference)
  const mockFarmsData = [
    {
      id: 1,
      name: 'Finca El Paraíso',
      ownership: 'propia',
      totalAnimals: 150,
      lastEvent: 'Vacunación - Hace 2 días',
      status: 'bueno',
      income: 45000,
      expenses: 32000,
      monthlyTrend: [30, 35, 32, 38, 42, 45]
    },
    {
      id: 2,
      name: 'Rancho Santa María',
      ownership: 'arrendada',
      totalAnimals: 85,
      lastEvent: 'Revisión veterinaria - Hace 1 semana',
      status: 'alerta',
      income: 28000,
      expenses: 26000,
      monthlyTrend: [35, 33, 30, 28, 27, 28]
    },
    {
      id: 3,
      name: 'Hacienda Los Robles',
      ownership: 'propia',
      totalAnimals: 220,
      lastEvent: 'Parto asistido - Hace 5 días',
      status: 'bueno',
      income: 67000,
      expenses: 48000,
      monthlyTrend: [55, 58, 60, 63, 65, 67]
    },
    {
      id: 4,
      name: 'Finca La Esperanza',
      ownership: 'arrendada',
      totalAnimals: 45,
      lastEvent: 'Tratamiento enfermedad - Hace 3 días',
      status: 'critico',
      income: 15000,
      expenses: 22000,
      monthlyTrend: [25, 22, 20, 18, 16, 15]
    },
    {
      id: 5,
      name: 'Campo Verde',
      ownership: 'propia',
      totalAnimals: 180,
      lastEvent: 'Inseminación - Hace 4 días',
      status: 'bueno',
      income: 52000,
      expenses: 39000,
      monthlyTrend: [45, 47, 49, 50, 51, 52]
    },
    {
      id: 6,
      name: 'Potrero San José',
      ownership: 'arrendada',
      totalAnimals: 60,
      lastEvent: 'Pesaje - Hace 1 semana',
      status: 'alerta',
      income: 18000,
      expenses: 17500,
      monthlyTrend: [20, 19, 18, 18, 18, 18]
    }
  ];

  // Calculate aggregated KPIs
  const kpis = useMemo(() => {
    if (overview && overview.resumen) {
      return {
        totalFarms: overview.resumen.totalFincas || farmsData.length,
        totalAnimals: overview.resumen.totalAnimales || 0,
        monthlyMovements: overview.resumen.movimientosMes || 0,
      };
    }

    return {
      totalFarms: farmsData.length,
      totalAnimals: farmsData.reduce((sum, farm) => sum + farm.totalAnimals, 0),
      monthlyMovements: 0,
    };
  }, [farmsData, overview]);

  // Filter farms - FIXED: Added farmsData to dependencies
  const filteredFarms = useMemo(() => {
    return farmsData.filter(farm => {
      const matchesSearch = farm.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOwnership = ownershipFilter === 'todas' || farm.ownership === ownershipFilter;
      return matchesSearch && matchesOwnership;
    });
  }, [farmsData, searchTerm, ownershipFilter]);

  // Status configuration
  const statusConfig = {
    bueno: {
      label: 'Óptimo',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✓',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    alerta: {
      label: 'Atención',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⚠',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    critico: {
      label: 'Crítico',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '!',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  };

  const MiniChart = ({ data, income, expenses }) => {
    const hasData = data.some(v => v > 0) || income > 0 || expenses > 0;

    if (!hasData) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 text-center py-4">
            No hay datos económicos disponibles
          </p>
        </div>
      );
    }

    const max = Math.max(...data, 1);
    const normalized = data.map(v => (v / max) * 100);
    const isPositive = income >= expenses;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3FA79F' }}></div>
            <span className="text-gray-600">Ingresos: ${income > 0 ? (income / 1000).toFixed(0) : '0'}k</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-gray-600">Egresos: ${expenses > 0 ? (expenses / 1000).toFixed(0) : '0'}k</span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-12">
          {normalized.map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(height, 5)}%`,
                  backgroundColor: i === normalized.length - 1 ? '#3FA79F' : '#cbd5e1'
                }}
              ></div>
            </div>
          ))}
        </div>
        <div className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{((income - expenses) / 1000).toFixed(1)}k neto
        </div>
      </div>
    );
  };

  return (
    <ProducerLayout>
      <FarmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFarmCreated={handleFarmCreated}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2" style={{ color: '#3FA79F' }}>
              Explorador de Fincas
            </h1>
            <p className="text-gray-600">
              Monitoreo y gestión de todas tus fincas ganaderas
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            style={{ backgroundColor: '#3FA79F' }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#368D86')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#3FA79F')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Finca
          </button>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Farms */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total de Fincas</p>
                <p className="text-3xl font-bold" style={{ color: '#3FA79F' }}>
                  {kpis.totalFarms}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3FA79F20' }}>
                <svg className="w-6 h-6" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Animals */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total de Animales</p>
                <p className="text-3xl font-bold" style={{ color: '#3FA79F' }}>
                  {kpis.totalAnimals}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3FA79F20' }}>
                <svg className="w-6 h-6" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Monthly Movements */}
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Movimientos Mensuales</p>
                <p className="text-3xl font-bold" style={{ color: '#3FA79F' }}>
                  ${(kpis.monthlyMovements / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3FA79F20' }}>
                <svg className="w-6 h-6" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Filter Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Left: Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar finca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3FA79F] focus:border-transparent transition-all text-sm"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Right: Ownership Toggle + Count */}
            <div className="flex items-center gap-4">
              {/* Results count */}
              <span className="text-sm text-gray-600 whitespace-nowrap">
                <span className="font-semibold">{filteredFarms.length}</span> de {farmsData.length}
              </span>

              {/* Ownership segmented toggle */}
              <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1">
                <button
                  onClick={() => setOwnershipFilter('todas')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    ownershipFilter === 'todas'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setOwnershipFilter('propia')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    ownershipFilter === 'propia'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Propia
                </button>
                <button
                  onClick={() => setOwnershipFilter('arrendada')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    ownershipFilter === 'arrendada'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Arrendada
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Cargando fincas...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Farm Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFarms.map((farm) => {
            const status = statusConfig[farm.status];

            return (
              <div
                key={farm.id}
                className={`bg-white rounded-xl shadow-md border-2 ${status.borderColor} overflow-hidden hover:shadow-xl transition-shadow`}
              >
                {/* Status Banner */}
                <div className={`px-4 py-2 ${status.bgColor} border-b-2 ${status.borderColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${status.color} border font-bold text-sm`}>
                      {status.icon}
                    </span>
                    <span className={`text-sm font-semibold ${status.color.split(' ')[1]}`}>
                      {status.label}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${farm.ownership === 'propia' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {farm.ownership === 'propia' ? 'Propia' : 'Arrendada'}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-4">
                  {/* Farm Name */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {farm.name}
                    </h3>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-3">
                    {/* Last Event */}
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Último evento</p>
                        <p className="text-sm text-gray-900">{farm.lastEvent}</p>
                      </div>
                    </div>

                    {/* Total Animals */}
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500">Total de animales</p>
                        <p className="text-xl font-bold" style={{ color: '#3FA79F' }}>
                          {farm.totalAnimals}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-3">Ingresos vs Egresos (6 meses)</p>
                    <MiniChart
                      data={farm.monthlyTrend}
                      income={farm.income}
                      expenses={farm.expenses}
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 space-y-2">
                    <button
                      onClick={() => navigate(`/producer/fincas/${farm.id}`)}
                      className="w-full px-4 py-2.5 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#3FA79F' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver detalle
                    </button>
                    <button className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Administrar servicios
                    </button>
                  </div>
                </div>
              </div>
            );
              })}
            </div>

            {/* Empty State */}
            {filteredFarms.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron fincas</h3>
                <p className="text-gray-500 mb-4">
                  {farmsData.length === 0
                    ? 'Aún no has creado ninguna finca. Haz clic en "Agregar Finca" para comenzar.'
                    : 'Intenta ajustar los filtros de búsqueda'}
                </p>
                {farmsData.length === 0 && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    style={{ backgroundColor: '#3FA79F' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Primera Finca
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ProducerLayout>
  );
}
