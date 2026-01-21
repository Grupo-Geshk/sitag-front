import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ProducerLayout from '../components/layout/ProducerLayout';
import KpiCard from '../components/dashboard/KpiCard';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import QuickActionTile from '../components/dashboard/QuickActionTile';
import AnimalModal from '../components/producer/AnimalModal';
import EventModal from '../components/producer/EventModal';
import MovimientoModal from '../components/producer/MovimientoModal';
import { getProducerId } from '../lib/auth';
import { dashboardAPI } from '../api/dashboard';

// Icon components
const Icons = {
  Cattle: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Heart: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  TrendUp: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  CurrencyDollar: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Plus: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Calendar: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Truck: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Receipt: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
    </svg>
  ),
  Settings: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ChartBar: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  ExclamationCircle: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  InboxEmpty: (props) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )
};

export default function ProducersDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Modals
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);

  // KPI Selection
  const [selectedKPIs, setSelectedKPIs] = useState([
    'totalAnimales',
    'animalesEnfermos',
    'ingresosMes',
    'natalidad30Dias'
  ]);
  const [showKPISelector, setShowKPISelector] = useState(false);

  // Available KPIs catalog
  const availableKPIs = {
    totalAnimales: {
      label: 'Total de Animales',
      icon: Icons.Cattle,
      getValue: (data) => data?.kpis?.totalAnimales || 0,
      getSubtitle: () => 'Todos los registros'
    },
    animalesActivos: {
      label: 'Animales Activos',
      icon: Icons.Heart,
      getValue: (data) => data?.kpis?.animalesActivos || 0,
      getSubtitle: () => 'En inventario'
    },
    animalesEnfermos: {
      label: 'Animales Enfermos',
      icon: Icons.ExclamationCircle,
      getValue: (data) => data?.kpis?.animalesEnfermos || 0,
      getSubtitle: () => 'Requieren atención'
    },
    natalidad30Dias: {
      label: 'Nacimientos',
      icon: Icons.TrendUp,
      getValue: (data) => data?.kpis?.natalidad30Dias || 0,
      getSubtitle: () => 'Últimos 30 días'
    },
    mortalidad30Dias: {
      label: 'Mortalidad',
      icon: Icons.TrendDown,
      getValue: (data) => data?.kpis?.mortalidad30Dias || 0,
      getSubtitle: () => 'Últimos 30 días'
    },
    ingresosMes: {
      label: 'Ingresos del Mes',
      icon: Icons.CurrencyDollar,
      getValue: (data) => `$${(data?.kpis?.ingresosMes || 0).toLocaleString()}`,
      getSubtitle: () => 'Mes actual'
    },
    egresosMes: {
      label: 'Egresos del Mes',
      icon: Icons.Receipt,
      getValue: (data) => `$${(data?.kpis?.egresosMes || 0).toLocaleString()}`,
      getSubtitle: () => 'Mes actual'
    },
    margen: {
      label: 'Margen del Mes',
      icon: Icons.ChartBar,
      getValue: (data) => `$${(data?.kpis?.margen || 0).toLocaleString()}`,
      getSubtitle: () => 'Ingresos - Egresos'
    }
  };

  useEffect(() => {
    fetchDashboard();
    const savedKPIs = localStorage.getItem('selectedKPIs');
    if (savedKPIs) {
      setSelectedKPIs(JSON.parse(savedKPIs));
    }
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const producerId = getProducerId();
      const data = await dashboardAPI.getDashboard(producerId);

      const mappedData = {
        kpis: {
          totalAnimales: data.kpis?.totalAnimales || 0,
          animalesActivos: data.kpis?.animalesActivos || 0,
          animalesEnfermos: data.kpis?.animalesEnfermos || 0,
          natalidad30Dias: data.kpis?.natalidad30Dias || 0,
          mortalidad30Dias: data.kpis?.mortalidad30Dias || 0,
          ingresosMes: data.kpis?.ingresosMes || 0,
          egresosMes: data.kpis?.egresosMes || 0,
          margen: data.kpis?.margen || 0
        },
        distribucionPorFinca: data.distribucionPorFinca || [],
        eventosPorTipo: data.eventosPorTipo || [],
        eventosRecientes: data.eventosRecientes || [],
        alertas: data.alertas || []
      };

      setDashboardData(mappedData);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      if (error.response?.status === 401) {
        toast.error('Sesión expirada');
        navigate('/login');
      } else {
        toast.error('Error al cargar el dashboard');
      }
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKPI = (kpiKey) => {
    if (selectedKPIs.includes(kpiKey)) {
      setSelectedKPIs(selectedKPIs.filter(k => k !== kpiKey));
    } else {
      if (selectedKPIs.length < 4) {
        setSelectedKPIs([...selectedKPIs, kpiKey]);
      } else {
        toast.error('Máximo 4 KPIs permitidos');
      }
    }
  };

  const handleSaveKPIs = () => {
    localStorage.setItem('selectedKPIs', JSON.stringify(selectedKPIs));
    setShowKPISelector(false);
    toast.success('Configuración guardada');
  };

  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-10 w-10" style={{ color: '#68b582' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Panel de Control
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Resumen ejecutivo de tu operación ganadera
            </p>
          </div>
          <button
            onClick={() => setShowKPISelector(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            style={{ borderColor: '#68b582', color: '#68b582' }}
          >
            <Icons.Settings className="w-4 h-4" />
            Configurar KPIs
          </button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedKPIs.map(kpiKey => {
            const kpi = availableKPIs[kpiKey];
            if (!kpi) return null;

            return (
              <KpiCard
                key={kpiKey}
                label={kpi.label}
                value={kpi.getValue(dashboardData)}
                subtitle={kpi.getSubtitle()}
                icon={kpi.icon}
              />
            );
          })}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribución por Finca */}
          <DashboardPanel
            title="Distribución por Finca"
            isEmpty={!dashboardData?.distribucionPorFinca?.length}
            emptyMessage="No hay fincas registradas"
            emptyIcon={Icons.InboxEmpty}
          >
            <div className="space-y-3">
              {dashboardData?.distribucionPorFinca?.map(finca => (
                <div key={finca.fincaId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#68b582' }} />
                    <span className="text-sm font-medium text-gray-900">{finca.nombre}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{finca.totalAnimales}</span>
                </div>
              ))}
            </div>
          </DashboardPanel>

          {/* Ingresos vs Egresos */}
          <DashboardPanel title="Ingresos vs Egresos">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Ingresos</span>
                  <span className="text-sm font-semibold" style={{ color: '#68b582' }}>
                    ${dashboardData?.kpis?.ingresosMes?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      backgroundColor: '#68b582',
                      width: `${(dashboardData?.kpis?.ingresosMes || 0) / ((dashboardData?.kpis?.ingresosMes || 0) + (dashboardData?.kpis?.egresosMes || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Egresos</span>
                  <span className="text-sm font-semibold text-red-600">
                    ${dashboardData?.kpis?.egresosMes?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(dashboardData?.kpis?.egresosMes || 0) / ((dashboardData?.kpis?.ingresosMes || 1) + (dashboardData?.kpis?.egresosMes || 0)) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Margen Neto</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ${dashboardData?.kpis?.margen?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>
          </DashboardPanel>
        </div>

        {/* Events and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Eventos Recientes */}
          <DashboardPanel
            title="Eventos Recientes"
            action={
              <button
                onClick={() => navigate('/producer/eventos-animales')}
                className="text-sm font-medium hover:underline"
                style={{ color: '#68b582' }}
              >
                Ver todos →
              </button>
            }
            isEmpty={!dashboardData?.eventosRecientes?.length}
            emptyMessage="No hay eventos registrados"
            emptyIcon={Icons.Calendar}
          >
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dashboardData?.eventosRecientes?.map(evento => (
                <div key={evento.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">#{evento.animalTagNumber}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        {evento.tipo}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{evento.descripcion}</p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(evento.fecha), { addSuffix: true, locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>

          {/* Alertas */}
          <DashboardPanel
            title="Alertas Operativas"
            action={
              dashboardData?.alertas?.filter(a => !a.leida).length > 0 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {dashboardData.alertas.filter(a => !a.leida).length} nuevas
                </span>
              )
            }
            isEmpty={!dashboardData?.alertas?.length}
            emptyMessage="No hay alertas activas"
            emptyIcon={Icons.ExclamationCircle}
          >
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dashboardData?.alertas?.map(alerta => (
                <div key={alerta.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative">
                  {!alerta.leida && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500"></div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      alerta.severidad === 'Alta' ? 'bg-red-100 text-red-700' :
                      alerta.severidad === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {alerta.severidad}
                    </span>
                    <span className="text-xs text-gray-600">{alerta.tipo}</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium mb-1">{alerta.mensaje}</p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(alerta.fecha), { addSuffix: true, locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <QuickActionTile
              label="Registrar Animal"
              icon={Icons.Plus}
              onClick={() => setShowAnimalModal(true)}
            />
            <QuickActionTile
              label="Registrar Evento"
              icon={Icons.Calendar}
              onClick={() => setShowEventModal(true)}
            />
            <QuickActionTile
              label="Registrar Movimiento"
              icon={Icons.Truck}
              onClick={() => setShowMovimientoModal(true)}
            />
            <QuickActionTile
              label="Registrar Ingreso"
              icon={Icons.CurrencyDollar}
              onClick={() => navigate('/producer/economia')}
            />
            <QuickActionTile
              label="Registrar Gasto"
              icon={Icons.Receipt}
              onClick={() => navigate('/producer/economia')}
            />
          </div>
        </div>

        {/* KPI Selector Modal */}
        {showKPISelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Configurar KPIs</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Selecciona hasta 4 indicadores
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKPISelector(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(availableKPIs).map(([key, kpi]) => {
                    const isSelected = selectedKPIs.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => handleSelectKPI(key)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        style={isSelected ? { borderColor: '#68b582', backgroundColor: '#f0fdf4' } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'
                          }`}
                          style={isSelected ? { borderColor: '#68b582', backgroundColor: '#68b582' } : {}}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{kpi.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedKPIs.length} / 4 seleccionados
                  </span>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowKPISelector(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveKPIs}
                    className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm"
                    style={{ backgroundColor: '#68b582' }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showAnimalModal && (
          <AnimalModal
            onClose={() => setShowAnimalModal(false)}
            onAnimalSaved={() => {
              setShowAnimalModal(false);
              fetchDashboard();
              toast.success('Animal registrado');
            }}
          />
        )}

        {showEventModal && (
          <EventModal
            isOpen={showEventModal}
            onClose={() => setShowEventModal(false)}
            onEventCreated={() => {
              setShowEventModal(false);
              fetchDashboard();
            }}
          />
        )}

        {showMovimientoModal && (
          <MovimientoModal
            isOpen={showMovimientoModal}
            onClose={() => setShowMovimientoModal(false)}
            onSuccess={() => {
              setShowMovimientoModal(false);
              fetchDashboard();
            }}
          />
        )}
      </div>
    </ProducerLayout>
  );
}
