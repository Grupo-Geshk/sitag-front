import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, isValid, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import ProducerLayout from '../../components/layout/ProducerLayout';
import DivisionModal from '../../components/producer/DivisionModal';
import EventModal from '../../components/producer/EventModal';
import MovimientoModal from '../../components/producer/MovimientoModal';
import AnimalModal from '../../components/producer/AnimalModal';
import ExpenseModal from '../../components/producer/ExpenseModal';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import { movementsAPI } from '../../api/movements';
import { animalEventsAPI } from '../../api/animalEvents';
import { economyAPI } from '../../api/transactions';
import { resolveEventDisplay } from '../../lib/eventRegistry';
import toast from 'react-hot-toast';

function safeFormat(value, fmt) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return isValid(d) ? format(d, fmt, { locale: es }) : '—';
  } catch { return '—'; }
}

function formatMoney(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export default function FarmDetail() {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [farm, setFarm] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [timelinePage, setTimelinePage] = useState(1);
  const [farmEconomy, setFarmEconomy] = useState(null);

  const [isEditingFarmName, setIsEditingFarmName] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Modals
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  useEffect(() => {
    fetchFarmDetail();
    fetchAllData();
  }, [farmId]);

  const fetchFarmDetail = async () => {
    try {
      setLoading(true);
      const data = await farmsAPI.getFarmDetail(farmId);
      setFarm(data);
      setFarmName(data.name);
    } catch {
      toast.error('Error al cargar los detalles de la finca');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const now = new Date();
      const firstOfMonth = format(startOfMonth(now), 'yyyy-MM-dd');
      const today = format(now, 'yyyy-MM-dd');

      const [animalsData, eventsRaw, movementsRaw, divisionsData, economyData] = await Promise.all([
        animalsAPI.getAnimals({ farmId, pageSize: 500 }).catch(() => ({ items: [] })),
        animalEventsAPI.getAllEvents({ farmId, pageSize: 30 }).catch(() => []),
        movementsAPI.getAllMovements({ farmId, pageSize: 30 }).catch(() => []),
        divisionsAPI.getDivisionsByFarm(farmId).catch(() => []),
        economyAPI.getEconomySummary({ farmId, startDate: firstOfMonth, endDate: today }).catch(() => null),
      ]);

      const animalList = Array.isArray(animalsData) ? animalsData : (animalsData?.items ?? []);
      setAnimals(animalList);
      setDivisions(divisionsData);

      // Extract economy — handle both direct and byFarm formats
      let eco = null;
      if (economyData) {
        if (typeof economyData.income === 'number' || typeof economyData.expense === 'number') {
          eco = { income: economyData.income ?? 0, expense: economyData.expense ?? 0 };
        } else if (Array.isArray(economyData.byFarm)) {
          const match = economyData.byFarm.find(f => f.farmId === farmId);
          if (match) eco = { income: match.income ?? 0, expense: match.expense ?? 0 };
        }
      }
      setFarmEconomy(eco);

      // Build animal lookup for timeline enrichment
      const aMap = {};
      animalList.forEach(a => { if (a.id) aMap[a.id] = a; });

      const enrich = (item, dateKey) => {
        const a = aMap[item.animalId] ?? null;
        return { ...item, animalTag: a?.tagNumber ?? null, animalName: a?.name ?? null, _date: new Date(item[dateKey]) };
      };

      const events = (Array.isArray(eventsRaw) ? eventsRaw : []).map(e => ({ ...enrich(e, 'eventDate'), _type: 'event' }));
      const movements = (Array.isArray(movementsRaw) ? movementsRaw : []).map(m => ({ ...enrich(m, 'movementDate'), _type: 'movement' }));

      setTimeline([...events, ...movements].sort((a, b) => b._date - a._date));
      setTimelinePage(1);
    } finally {
      setDataLoading(false);
    }
  }, [farmId]);

  const handleSaveFarmName = async () => {
    try {
      await farmsAPI.updateFarm(farmId, {
        name: farmName,
        location: farm.location,
        hectares: farm.hectares,
        farmType: farm.farmType,
        isOwned: farm.isOwned,
      });
      toast.success('Nombre de finca actualizado');
      setIsEditingFarmName(false);
      fetchFarmDetail();
    } catch {
      toast.error('Error al actualizar el nombre');
    }
  };

  const handleDeleteDivision = async (divisionId) => {
    if (!window.confirm('¿Eliminar esta división? Los animales asignados quedarán sin división.')) return;
    try {
      await divisionsAPI.deleteDivision(divisionId);
      toast.success('División eliminada');
      fetchAllData();
    } catch {
      toast.error('Error al eliminar la división');
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 mx-auto mb-4" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-500 text-sm">Cargando finca...</p>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  if (!farm) {
    return (
      <ProducerLayout>
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">Finca no encontrada</p>
            <button onClick={() => navigate('/producer/fincas')} className="px-5 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: '#3FA79F' }}>
              Volver a Fincas
            </button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  // ── Derived KPIs ─────────────────────────────────────────────────────────────
  const activeAnimals = animals.filter(a => a.status === 'Activo');
  const maleCount = activeAnimals.filter(a => a.sex === 'Macho').length;
  const femaleCount = activeAnimals.filter(a => a.sex === 'Hembra').length;
  const deadCount = animals.filter(a => a.status === 'Muerto').length;
  const mortalityRate = animals.length > 0 ? ((deadCount / animals.length) * 100).toFixed(1) : '0.0';
  const weighedAnimals = activeAnimals.filter(a => a.weight > 0);
  const avgWeight = weighedAnimals.length > 0
    ? Math.round(weighedAnimals.reduce((s, a) => s + a.weight, 0) / weighedAnimals.length)
    : null;

  const healthBreakdown = {
    Sano: activeAnimals.filter(a => a.healthStatus === 'Sano').length,
    EnTratamiento: activeAnimals.filter(a => a.healthStatus === 'EnTratamiento').length,
    Enfermo: activeAnimals.filter(a => a.healthStatus === 'Enfermo').length,
    Critico: activeAnimals.filter(a => a.healthStatus === 'Critico').length,
  };

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alerts = [];
  if (healthBreakdown.Critico > 0)
    alerts.push({ level: 'critical', text: `${healthBreakdown.Critico} animal${healthBreakdown.Critico !== 1 ? 'es' : ''} en estado crítico` });
  if (healthBreakdown.Enfermo > 0)
    alerts.push({ level: 'warning', text: `${healthBreakdown.Enfermo} animal${healthBreakdown.Enfermo !== 1 ? 'es' : ''} enfermo${healthBreakdown.Enfermo !== 1 ? 's' : ''}` });
  if (healthBreakdown.EnTratamiento > 0)
    alerts.push({ level: 'info', text: `${healthBreakdown.EnTratamiento} animal${healthBreakdown.EnTratamiento !== 1 ? 'es' : ''} en tratamiento activo` });
  divisions.filter(d => d.maxCapacity && d.animalCount > d.maxCapacity).forEach(d =>
    alerts.push({ level: 'warning', text: `División "${d.name}" sobrecargada (${d.animalCount}/${d.maxCapacity})` })
  );

  // ── Division distribution ───────────────────────────────────────────────────
  const divisionDist = [...divisions]
    .map(d => ({ ...d, activeCount: activeAnimals.filter(a => a.divisionId === d.id).length }))
    .sort((a, b) => b.activeCount - a.activeCount);
  const maxDivCount = Math.max(...divisionDist.map(d => d.activeCount), 1);
  const unassignedCount = activeAnimals.filter(a => !a.divisionId).length;

  // ── Financial ───────────────────────────────────────────────────────────────
  const economy = {
    income: farmEconomy?.income ?? 0,
    expense: farmEconomy?.expense ?? 0,
    net: (farmEconomy?.income ?? 0) - (farmEconomy?.expense ?? 0),
  };

  // ── Timeline icon ────────────────────────────────────────────────────────────
  const getTimelineStyle = (item) => {
    if (item._type === 'movement') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' };
    const et = item.eventType;
    if (et === 'Muerte')    return { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100' };
    if (et === 'Vacunacion') return { bg: 'bg-green-50', text: 'text-green-600',  border: 'border-green-100' };
    if (et === 'Tratamiento') return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' };
    if (et === 'Nacimiento') return { bg: 'bg-teal-50',  text: 'text-teal-600',  border: 'border-teal-100' };
    if (et === 'Compra' || et === 'Venta') return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' };
    return { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100' };
  };

  return (
    <ProducerLayout>
      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <DivisionModal
        isOpen={showDivisionModal}
        onClose={() => { setShowDivisionModal(false); setEditingDivision(null); }}
        farmId={farmId}
        division={editingDivision}
        onDivisionSaved={fetchAllData}
      />
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onEventCreated={() => { setShowEventModal(false); fetchAllData(); }}
        onPartoRegistered={() => setShowEventModal(false)}
        farmId={farmId}
      />
      <MovimientoModal
        isOpen={showMovimientoModal}
        onClose={() => setShowMovimientoModal(false)}
        onSuccess={() => { setShowMovimientoModal(false); fetchAllData(); }}
        preselectedFarmId={farmId}
      />
      <AnimalModal
        isOpen={showAnimalModal}
        onClose={() => setShowAnimalModal(false)}
        onAnimalCreated={() => { setShowAnimalModal(false); fetchAllData(); }}
      />
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onExpenseCreated={() => { setShowExpenseModal(false); fetchAllData(); }}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-4">

        {/* ── 1. Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <button
            onClick={() => navigate('/producer/fincas')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Fincas
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditingFarmName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={farmName}
                    onChange={e => setFarmName(e.target.value)}
                    className="text-xl font-bold px-2 py-1 border-2 rounded focus:outline-none"
                    style={{ borderColor: '#3FA79F', color: '#3FA79F' }}
                    autoFocus
                  />
                  <button onClick={handleSaveFarmName} className="px-3 py-1 text-xs font-medium text-white rounded" style={{ backgroundColor: '#3FA79F' }}>
                    Guardar
                  </button>
                  <button onClick={() => { setFarmName(farm.name); setIsEditingFarmName(false); }} className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-xl font-bold" style={{ color: '#3FA79F' }}>{farm.name}</h1>
                  <button onClick={() => setIsEditingFarmName(true)} className="p-1 text-gray-300 hover:text-gray-600 transition-colors" title="Editar nombre">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded border text-xs font-medium ${farm.isOwned ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  {farm.isOwned ? 'Propia' : 'Arrendada'}
                </span>
                {farm.farmType && (
                  <span className="px-2 py-0.5 rounded border text-xs font-medium bg-gray-50 text-gray-700 border-gray-200">
                    {farm.farmType}
                  </span>
                )}
                {farm.location && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {farm.location}
                  </span>
                )}
                {farm.hectares && (
                  <span className="text-xs text-gray-400">{farm.hectares} ha</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowEventModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm font-medium hover:brightness-95 transition-all"
                style={{ backgroundColor: '#3FA79F' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Registrar Evento
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showActionMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)} />
                    <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      <button onClick={() => { setShowActionMenu(false); setShowEventModal(true); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 sm:hidden">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Registrar Evento
                      </button>
                      <button onClick={() => { setShowActionMenu(false); setShowMovimientoModal(true); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Mover Animales
                      </button>
                      <button onClick={() => { setShowActionMenu(false); setShowAnimalModal(true); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar Animal
                      </button>
                      <button onClick={() => { setShowActionMenu(false); setShowExpenseModal(true); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        Registrar Gasto
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button onClick={() => { setShowActionMenu(false); setShowDivisionModal(true); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                        </svg>
                        Nueva División
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Alerts ──────────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                alert.level === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                alert.level === 'warning'  ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {alert.text}
              </div>
            ))}
          </div>
        )}

        {/* ── 3. KPIs ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total en finca', value: activeAnimals.length,                       sub: 'activos',      accent: true },
            { label: 'Machos',        value: maleCount,                                  sub: 'activos' },
            { label: 'Hembras',       value: femaleCount,                                sub: 'activas' },
            { label: 'Peso prom.',   value: avgWeight != null ? `${avgWeight} kg` : '—', sub: 'activos' },
            { label: 'Mortalidad',   value: `${mortalityRate}%`,                         sub: `${deadCount} bajas`, warn: deadCount > 0 },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
              <p
                className={`text-2xl font-bold leading-tight ${kpi.warn ? 'text-amber-600' : kpi.accent ? '' : 'text-gray-900'}`}
                style={kpi.accent ? { color: '#3FA79F' } : {}}
              >
                {kpi.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── 4. Health + Herd Distribution ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Health breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Estado sanitario</h3>
            {activeAnimals.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sin animales activos</p>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'Sano',          label: 'Sanos',           barColor: '#22c55e', badge: 'bg-green-100 text-green-800 border-green-200' },
                  { key: 'EnTratamiento', label: 'En tratamiento',  barColor: '#3b82f6', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
                  { key: 'Enfermo',       label: 'Enfermos',        barColor: '#f59e0b', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
                  { key: 'Critico',       label: 'Crítico',         barColor: '#ef4444', badge: 'bg-red-100 text-red-800 border-red-200' },
                ].map(({ key, label, barColor, badge }) => {
                  const count = healthBreakdown[key];
                  const pct = activeAnimals.length > 0 ? (count / activeAnimals.length) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-28 flex-shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${badge}`}>{label}</span>
                      </div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-6 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Herd distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Distribución del hato</h3>
            {activeAnimals.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sin animales activos</p>
            ) : (
              <>
                {/* By sex */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Por sexo</p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                    {maleCount > 0 && (
                      <div className="bg-blue-400 h-full transition-all" style={{ width: `${(maleCount / activeAnimals.length) * 100}%` }} />
                    )}
                    {femaleCount > 0 && (
                      <div className="bg-rose-400 h-full transition-all" style={{ width: `${(femaleCount / activeAnimals.length) * 100}%` }} />
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block flex-shrink-0" />
                      {maleCount} machos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block flex-shrink-0" />
                      {femaleCount} hembras
                    </span>
                  </div>
                </div>

                {/* By division */}
                {divisions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Por división</p>
                    <div className="space-y-2">
                      {divisionDist.slice(0, 5).map(d => (
                        <div key={d.id} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 truncate flex-shrink-0">{d.name}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(d.activeCount / maxDivCount) * 100}%`, backgroundColor: '#3FA79F' }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-5 text-right tabular-nums">{d.activeCount}</span>
                        </div>
                      ))}
                      {unassignedCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-24 flex-shrink-0 italic">Sin división</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gray-300 transition-all" style={{ width: `${(unassignedCount / maxDivCount) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-400 w-5 text-right tabular-nums">{unassignedCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── 5. Financial + Divisions ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Financial summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Finanzas · mes actual</h3>
            {farmEconomy === null ? (
              <p className="text-sm text-gray-400 py-6 text-center">Sin movimientos este mes</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Ingresos</span>
                  <span className="text-sm font-semibold text-green-700">{formatMoney(economy.income)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Gastos</span>
                  <span className="text-sm font-semibold text-red-600">{formatMoney(economy.expense)}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Neto</span>
                  <span className={`text-xl font-bold ${economy.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {economy.net >= 0 ? '+' : ''}{formatMoney(economy.net)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Divisions */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Divisiones ({divisions.length})</h3>
              <button onClick={() => setShowDivisionModal(true)} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: '#3FA79F' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            </div>

            {divisions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Sin divisiones configuradas</p>
                <button onClick={() => setShowDivisionModal(true)} className="text-xs font-medium hover:underline" style={{ color: '#3FA79F' }}>
                  Crear primera división
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {divisions.map(d => {
                  const overloaded = d.maxCapacity && d.animalCount > d.maxCapacity;
                  const pct = d.maxCapacity ? Math.min((d.animalCount / d.maxCapacity) * 100, 100) : null;
                  return (
                    <div
                      key={d.id}
                      className={`group relative border rounded-lg p-3 cursor-pointer transition-colors hover:border-gray-300 ${overloaded ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
                      onClick={() => navigate(`/producer/animales?divisionId=${d.id}&farmId=${farmId}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{d.name}</h4>
                          {d.maxCapacity != null ? (
                            <p className={`text-xs mt-0.5 ${overloaded ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>
                              {d.animalCount} / {d.maxCapacity}{overloaded ? ' · Sobrecargada' : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">{d.animalCount ?? 0} animales</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingDivision(d); setShowDivisionModal(true); }}
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteDivision(d.id); }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {pct !== null && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${overloaded ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 6. Unified Timeline ────────────────────────────────────────────── */}
        {(() => {
          const PAGE_SIZE = 6;
          const totalPages = Math.max(1, Math.ceil(timeline.length / PAGE_SIZE));
          const pageItems = timeline.slice((timelinePage - 1) * PAGE_SIZE, timelinePage * PAGE_SIZE);

          return (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actividad reciente</h3>
                {timeline.length > 0 && (
                  <span className="text-xs text-gray-400">{timeline.length} registros</span>
                )}
              </div>

              {dataLoading ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin w-6 h-6" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">Sin actividad registrada en esta finca</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {pageItems.map((item, i) => {
                      const ic = getTimelineStyle(item);
                      const isEvent = item._type === 'event';
                      const { label, cleanDescription } = isEvent
                        ? resolveEventDisplay(item.eventType, item.description)
                        : { label: 'Movimiento', cleanDescription: item.reason ?? null };
                      const date = isEvent ? item.eventDate : item.movementDate;

                      return (
                        <div key={item.id ?? i} className="flex items-start gap-3 py-3">
                          <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${ic.bg} ${ic.border}`}>
                            {isEvent ? (
                              <svg className={`w-3.5 h-3.5 ${ic.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            ) : (
                              <svg className={`w-3.5 h-3.5 ${ic.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-800">{label}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{safeFormat(date, 'dd/MM/yy')}</span>
                            </div>
                            {(item.animalTag || item.animalName) && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {item.animalTag ? `#${item.animalTag}` : 'Sin arete'}{item.animalName ? ` · ${item.animalName}` : ''}
                              </p>
                            )}
                            {cleanDescription && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate italic">{cleanDescription}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                      <button
                        onClick={() => setTimelinePage(p => Math.max(1, p - 1))}
                        disabled={timelinePage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Anterior
                      </button>
                      <span className="text-xs text-gray-400 tabular-nums">
                        {timelinePage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setTimelinePage(p => Math.min(totalPages, p + 1))}
                        disabled={timelinePage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

      </div>
    </ProducerLayout>
  );
}
