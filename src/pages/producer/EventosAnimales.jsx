import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ProducerLayout from '../../components/layout/ProducerLayout';
import { animalEventsAPI } from '../../api/animalEvents';
import { animalsAPI } from '../../api/animals';
import { farmsAPI } from '../../api/farms';
import { resolveEventDisplay, NATIVE_REGISTRY, OTRO_DOMAIN_REGISTRY } from '../../lib/eventRegistry';
import EventIcon from '../../lib/eventIcons';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPE REGISTRY
// Maps every backend AnimalEventType key → display metadata.
// NOTE: resolveEventDisplay() from eventRegistry.js is now the authoritative
// resolver, decoding "Otro" events with domain key prefixes. The local registry
// below is retained for UI helpers (icon lookup, type filter chips) that need
// a flat map of backend-native keys.
// ══════════════════════════════════════════════════════════════════════════════
const EVENT_REGISTRY = {
  Vacunacion: {
    label: 'Vacunación',
    category: 'Salud',
    critical: false,
    iconType: 'vaccine',
    badgeBg: '#dbeafe', badgeFg: '#1e40af',
    dotColor: '#3b82f6',
  },
  RegistroPeso: {
    label: 'Registro de peso',
    category: 'Producción',
    critical: false,
    iconType: 'scale',
    badgeBg: '#dcfce7', badgeFg: '#166534',
    dotColor: '#22c55e',
  },
  Tratamiento: {
    label: 'Tratamiento',
    category: 'Salud',
    critical: false,
    iconType: 'medicine',
    badgeBg: '#fef9c3', badgeFg: '#854d0e',
    dotColor: '#eab308',
  },
  Nacimiento: {
    label: 'Nacimiento',
    category: 'Reproductivo',
    critical: false,
    iconType: 'birth',
    badgeBg: '#d1fae5', badgeFg: '#065f46',
    dotColor: '#10b981',
  },
  Compra: {
    label: 'Compra',
    category: 'Económico',
    critical: false,
    iconType: 'purchase',
    badgeBg: '#ede9fe', badgeFg: '#5b21b6',
    dotColor: '#8b5cf6',
  },
  Venta: {
    label: 'Venta',
    category: 'Económico',
    critical: false,
    iconType: 'sale',
    badgeBg: '#e0f2fe', badgeFg: '#0369a1',
    dotColor: '#0ea5e9',
  },
  Muerte: {
    label: 'Muerte',
    category: 'Incidente',
    critical: true,
    iconType: 'death',
    badgeBg: '#fee2e2', badgeFg: '#991b1b',
    dotColor: '#ef4444',
  },
  Otro: {
    label: 'Otro',
    category: 'General',
    critical: false,
    iconType: 'other',
    badgeBg: '#f3f4f6', badgeFg: '#374151',
    dotColor: '#94a3b8',
  },
};

const FALLBACK_META = {
  label: 'Evento',
  category: 'General',
  critical: false,
  iconType: 'other',
  badgeBg: '#f3f4f6', badgeFg: '#374151',
  dotColor: '#94a3b8',
};

/**
 * Resolve metadata for a key that may be a native backend type OR a domain key
 * (Parto, Destete, etc.) — used for the distribution chart where we group by domainKey.
 */
function resolveDomainKeyMeta(key) {
  if (OTRO_DOMAIN_REGISTRY[key]) return { ...OTRO_DOMAIN_REGISTRY[key], domainKey: key, cleanDescription: '' };
  if (NATIVE_REGISTRY[key])      return { ...NATIVE_REGISTRY[key],      domainKey: key, cleanDescription: '' };
  return { label: key, category: 'General', iconType: 'other', badgeBg: '#f3f4f6', badgeFg: '#374151', dotColor: '#94a3b8', critical: false, domainKey: key, cleanDescription: '' };
}

/** Convert a backend event type key + description to its display label. */
function resolveEventLabel(key, description) {
  return resolveEventDisplay(key, description).label;
}

/**
 * Return the full metadata for an event, considering domain-encoded "Otro" events.
 * Falls back to the local EVENT_REGISTRY for native types.
 */
function getEventMeta(key, description) {
  const resolved = resolveEventDisplay(key, description);
  // Return in the shape expected by the rest of this component
  return {
    label:    resolved.label,
    category: resolved.category,
    critical: resolved.critical,
    iconType: resolved.iconType,
    badgeBg:  resolved.badgeBg,
    badgeFg:  resolved.badgeFg,
    dotColor: resolved.dotColor,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE UTILITIES
// All date rendering must go through these functions.
// If a value cannot be parsed, controlled fallbacks are returned.
// ══════════════════════════════════════════════════════════════════════════════

/** Safely parse any date value. Returns a valid Date or null. */
function safeParse(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** Format a date for table display (e.g. "12 de enero de 2025"). */
function formatDisplayDate(date) {
  if (!date) return 'Fecha no disponible';
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Format a date including time (e.g. "12 de enero de 2025, 14:35"). */
function formatDisplayDateTime(date) {
  if (!date) return 'Fecha no disponible';
  return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

/** Format a date to yyyy-MM key for grouping. */
function toMonthKey(date) {
  return format(date, 'yyyy-MM');
}

// ══════════════════════════════════════════════════════════════════════════════
// RECORD NORMALIZER
// Transforms a raw AnimalEventDto into a UI-ready record.
// The UI layer only consumes normalized records — never raw API payloads.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} raw - AnimalEventDto from the API
 * @param {object} animalMap - { [animalId]: { tagNumber, name } }
 * @param {object} farmMap - { [farmId]: { name } }
 * @returns Normalized event record safe for rendering
 */
function normalizeEvent(raw, animalMap, farmMap) {
  // resolveEventDisplay decodes domain-encoded "Otro" events from the description.
  const resolved   = resolveEventDisplay(raw.eventType, raw.description);
  const meta       = getEventMeta(raw.eventType, raw.description);
  // Keep raw description so the edit modal can re-encode domain-prefixed events
  const rawDescription = raw.description ?? null;
  const dateRaw    = safeParse(raw.eventDate);
  const createdAt  = safeParse(raw.createdAt);
  const animal     = animalMap[raw.animalId];
  const farm       = farmMap[raw.farmId];

  return {
    // Identity
    id: raw.id,
    animalId: raw.animalId,
    farmId: raw.farmId,

    // Event type (normalized — domain key takes priority over raw backend type)
    eventType:     raw.eventType,
    domainKey:     resolved.domainKey,
    eventLabel:    meta.label,
    eventCategory: meta.category,
    critical:      meta.critical,
    iconType:      meta.iconType,
    badgeBg:       meta.badgeBg,
    badgeFg:       meta.badgeFg,
    dotColor:      meta.dotColor,

    // Animal (resolved from map, or graceful fallback)
    animalTag:     animal?.tagNumber ?? null,
    animalName:    animal?.name      ?? null,
    animalDisplay: animal
      ? `#${animal.tagNumber}${animal.name ? ` · ${animal.name}` : ''}`
      : 'Sin animal asociado',

    // Date (always from eventDate, never from createdAt for display)
    dateRaw,
    dateDisplay:  formatDisplayDate(dateRaw),
    dateTime:     formatDisplayDateTime(dateRaw),
    dateRelative: dateRaw
      ? formatDistanceToNow(dateRaw, { addSuffix: true, locale: es })
      : null,

    // Location (resolved from farm map)
    farmName:        farm?.name ?? null,
    locationDisplay: farm?.name ?? 'Ubicación no registrada',

    // Content — use cleanDescription (domain prefix stripped) for display
    description: resolved.cleanDescription || meta.label,
    cost:        raw.cost ?? null,

    // State dependency metadata (for edit/delete warnings)
    stateLinked: resolved.stateLinked ?? false,

    // Status derived from criticality
    statusLabel:   meta.critical ? 'Crítico' : 'Normal',
    statusVariant: meta.critical ? 'critical' : 'normal',

    // Raw description (before domain prefix stripping) for re-encoding on edit
    rawDescription,

    // Audit
    createdAt,
    createdAtDisplay: formatDisplayDateTime(createdAt),
  };
}

// EventIcon is imported from ../../lib/eventIcons — no local definition needed.

// ══════════════════════════════════════════════════════════════════════════════
// EVENT DETAIL MODAL — view / edit / delete
// ══════════════════════════════════════════════════════════════════════════════
function EventDetailModal({ event, onClose, onRefresh }) {
  const [mode, setMode]       = useState('view'); // 'view' | 'edit' | 'confirm-delete'
  const [saving, setSaving]   = useState(false);
  const [formData, setFormData] = useState({
    eventDate:   event.dateRaw
      ? new Date(event.dateRaw).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    description: event.description || '',
    cost:        event.cost != null ? String(event.cost) : '',
  });

  if (!event) return null;

  // Re-encode description with domain prefix if this is an Otro-encoded event
  const buildEncodedDescription = (cleanDesc) => {
    if (event.eventType === 'Otro' && event.domainKey !== 'Otro') {
      return cleanDesc.trim()
        ? `${event.domainKey} | ${cleanDesc.trim()}`
        : event.domainKey;
    }
    return cleanDesc.trim() || null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await animalEventsAPI.updateEvent(event.animalId, event.id, {
        eventDate:   new Date(formData.eventDate + 'T12:00:00').toISOString(),
        description: buildEncodedDescription(formData.description),
        cost:        formData.cost ? parseFloat(formData.cost) : null,
        workerId:    null,
      });
      toast.success('Evento actualizado');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al actualizar el evento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await animalEventsAPI.deleteEvent(event.animalId, event.id);
      const msg = event.critical
        ? 'Evento eliminado. El animal fue reactivado.'
        : event.eventType === 'RegistroPeso'
        ? 'Peso eliminado. El peso fue recalculado.'
        : 'Evento eliminado';
      toast.success(msg);
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al eliminar el evento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: event.badgeBg }}
            >
              <EventIcon iconType={event.iconType} className="w-5 h-5" style={{ color: event.badgeFg }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{event.eventLabel}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{event.eventCategory}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {event.critical && (
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                Crítico
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* ── View mode ── */}
          {mode === 'view' && (
            <>
              {(event.stateLinked || event.critical) && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  {event.critical
                    ? 'Evento crítico — eliminar reactivará el animal y lo devolverá al hato activo.'
                    : 'Este evento afecta el estado del animal. Al editarlo o eliminarlo, los datos se recalcularán automáticamente.'}
                </div>
              )}
              <DetailRow label="Animal"         value={event.animalDisplay} mono={!!event.animalTag} />
              <DetailRow label="Fecha"          value={event.dateTime} />
              {event.dateRelative && <DetailRow label="Hace" value={event.dateRelative} muted />}
              <DetailRow label="Finca"          value={event.locationDisplay} />
              <DetailRow label="Descripción"    value={event.description || '—'} />
              {event.cost != null && event.cost > 0 && (
                <DetailRow label="Costo / Monto" value={`$${Number(event.cost).toLocaleString()}`} />
              )}
              <div className="pt-3 border-t border-gray-100">
                <DetailRow label="Registrado el" value={event.createdAtDisplay} muted />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 border-gray-200 text-gray-700 hover:border-[#3FA79F] hover:text-[#3FA79F] transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setMode('confirm-delete')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </>
          )}

          {/* ── Edit mode ── */}
          {mode === 'edit' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha del evento</label>
                <input
                  type="date"
                  value={formData.eventDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData(p => ({ ...p, eventDate: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas / Descripción</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalles adicionales..."
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors resize-none"
                />
              </div>
              {event.eventType === 'RegistroPeso' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Peso registrado (kg)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    min="0"
                    step="0.1"
                    onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
                  />
                </div>
              )}
              {event.eventType !== 'RegistroPeso' && event.cost != null && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Costo / Monto</label>
                  <input
                    type="number"
                    value={formData.cost}
                    min="0"
                    step="0.01"
                    onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('view')}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#3FA79F' }}
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </>
          )}

          {/* ── Delete confirmation ── */}
          {mode === 'confirm-delete' && (
            <>
              <div className="px-3 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-1">¿Eliminar este evento?</p>
                <p className="text-xs text-red-700 leading-relaxed">
                  {event.critical
                    ? 'Al eliminar este registro de muerte, el animal será reactivado y volverá al hato activo.'
                    : event.stateLinked
                    ? 'Al eliminar este registro, el estado del animal será recalculado automáticamente.'
                    : 'Esta acción eliminará el evento del historial. No puede deshacerse desde la interfaz.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('view')}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Eliminando…' : 'Eliminar evento'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, muted }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0 pt-0.5 w-36">
        {label}
      </span>
      <span className={`text-sm text-right break-words ${mono ? 'font-mono font-medium text-gray-800' : muted ? 'text-gray-400' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE PRESET HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const DATE_PRESETS = [
  { value: 'general',            label: 'General (todo)' },
  { value: 'este-mes',           label: 'Este mes' },
  { value: 'mes-anterior',       label: 'Mes anterior' },
  { value: 'este-trimestre',     label: 'Este trimestre' },
  { value: 'trimestre-anterior', label: 'Trimestre anterior' },
  { value: 'este-año',           label: 'Este año' },
];

function getDateRangeFromPreset(preset) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const pad   = d => d.toISOString().split('T')[0];

  switch (preset) {
    case 'este-mes':
      return { startDate: pad(new Date(year, month, 1)), endDate: pad(now) };
    case 'mes-anterior': {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0);
      return { startDate: pad(start), endDate: pad(end) };
    }
    case 'este-trimestre': {
      const q = Math.floor(month / 3);
      return { startDate: pad(new Date(year, q * 3, 1)), endDate: pad(now) };
    }
    case 'trimestre-anterior': {
      const q      = Math.floor(month / 3);
      const prevQ  = q === 0 ? 3 : q - 1;
      const prevYr = q === 0 ? year - 1 : year;
      return {
        startDate: pad(new Date(prevYr, prevQ * 3, 1)),
        endDate:   pad(new Date(prevYr, prevQ * 3 + 3, 0)),
      };
    }
    case 'este-año':
      return { startDate: pad(new Date(year, 0, 1)), endDate: pad(now) };
    default:
      return { startDate: '', endDate: '' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE SIZE
// ══════════════════════════════════════════════════════════════════════════════
const PAGE_SIZE = 20;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function EventosAnimales() {
  const navigate = useNavigate();

  // ── Raw data ──
  const [rawEvents,  setRawEvents]  = useState([]);
  const [farmMap,    setFarmMap]    = useState({});
  const [animalMap,  setAnimalMap]  = useState({});

  // ── Loading states ──
  const [loadingEvents,  setLoadingEvents]  = useState(true);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // ── Server-side filters (trigger re-fetch) ──
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedFarm,      setSelectedFarm]      = useState('');
  const [datePreset,        setDatePreset]         = useState('general');

  // ── Client-side filters ──
  const [searchQuery,      setSearchQuery]      = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('');   // set by clicking distribution rows

  // ── UI state ──
  const [filterDrawerOpen,    setFilterDrawerOpen]    = useState(false);
  const [detailEvent,         setDetailEvent]         = useState(null);
  const [showDistribModal,    setShowDistribModal]     = useState(false);
  const [currentPage,      setCurrentPage]      = useState(1);

  // ── Bootstrap: load lookup maps once ──
  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [farmsData, animalsData] = await Promise.all([
          farmsAPI.getAllFarms().catch(() => []),
          animalsAPI.getAnimals({ pageSize: 500 }).catch(() => ({ items: [] })),
        ]);

        // Build farm map — handle both { id } and { farmId } shapes
        const farms = Array.isArray(farmsData) ? farmsData : [];
        const fMap = {};
        farms.forEach(f => {
          const key = f.id || f.farmId;
          if (key) fMap[key] = { name: f.name || 'Finca sin nombre' };
        });
        setFarmMap(fMap);

        // Build animal map
        const animalList = Array.isArray(animalsData)
          ? animalsData
          : (animalsData?.items ?? []);
        const aMap = {};
        animalList.forEach(a => {
          if (a.id) aMap[a.id] = { tagNumber: a.tagNumber, name: a.name ?? null };
        });
        setAnimalMap(aMap);
      } catch (err) {
        console.error('Error loading lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    loadLookups();
  }, []);

  // ── Fetch events (extracted so modals can trigger a refresh) ──
  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setCurrentPage(1);
    try {
      const { startDate, endDate } = getDateRangeFromPreset(datePreset);
      const filters = { pageSize: 200 };
      if (selectedFarm)      filters.farmId    = selectedFarm;
      if (selectedEventType) filters.eventType = selectedEventType;
      if (startDate)         filters.startDate = new Date(startDate).toISOString();
      if (endDate)           filters.endDate   = new Date(endDate + 'T23:59:59').toISOString();
      const data = await animalEventsAPI.getAllEvents(filters);
      setRawEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading events:', err);
      toast.error('Error al cargar los eventos');
      setRawEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventType, selectedFarm, datePreset]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ── Normalize events whenever raw data or lookup maps change ──
  const normalizedEvents = useMemo(() => {
    if (loadingLookups) return [];
    return rawEvents.map(ev => normalizeEvent(ev, animalMap, farmMap));
  }, [rawEvents, animalMap, farmMap, loadingLookups]);

  // ── Client-side filtered events (search + type distribution filter) ──
  const filteredEvents = useMemo(() => {
    let result = normalizedEvents;

    // Distribution row click filter (by domainKey to correctly match Parto, Destete, etc.)
    if (activeTypeFilter) {
      result = result.filter(ev => ev.domainKey === activeTypeFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(ev =>
        ev.animalTag?.toLowerCase().includes(q) ||
        ev.animalDisplay.toLowerCase().includes(q) ||
        ev.eventLabel.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q) ||
        ev.locationDisplay.toLowerCase().includes(q)
      );
    }

    return result;
  }, [normalizedEvents, searchQuery, activeTypeFilter]);

  // ── Paginated rows ──
  const totalPages   = Math.ceil(filteredEvents.length / PAGE_SIZE) || 1;
  const pagedEvents  = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── KPI computations ──
  const totalCount      = filteredEvents.length;
  const criticalCount   = filteredEvents.filter(ev => ev.critical).length;
  const treatmentCount  = filteredEvents.filter(ev => ev.eventType === 'Tratamiento').length;
  const lastEvent       = normalizedEvents[0] ?? null;

  const typeDistribution = useMemo(() => {
    const counts = {};
    normalizedEvents.forEach(ev => {
      const key = ev.domainKey; // use domainKey so Parto, Destete, etc. count separately
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ key, label: resolveDomainKeyMeta(key).label, meta: resolveDomainKeyMeta(key), count }))
      .sort((a, b) => b.count - a.count);
  }, [normalizedEvents]);

  const topType = typeDistribution[0] || null;

  // ── Monthly trends (computed from normalized events) ──
  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key:   toMonthKey(d),
        label: format(d, 'MMM yy', { locale: es }),
        count: 0,
      });
    }
    const monthMap = Object.fromEntries(months.map(m => [m.key, m]));
    normalizedEvents.forEach(ev => {
      if (!ev.dateRaw) return;
      const key = toMonthKey(ev.dateRaw);
      if (monthMap[key]) monthMap[key].count++;
    });
    return months;
  }, [normalizedEvents]);

  const maxMonthCount   = Math.max(...monthlyTrends.map(m => m.count), 1);
  const hasMonthlyData  = monthlyTrends.some(m => m.count > 0);

  // ── Filter helpers ──
  const activeFilterCount = [selectedEventType, selectedFarm, datePreset !== 'general' ? datePreset : ''].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedEventType('');
    setSelectedFarm('');
    setDatePreset('general');
    setSearchQuery('');
    setActiveTypeFilter('');
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setFilterDrawerOpen(false);
  };

  // ── Period label ──
  const periodLabel = DATE_PRESETS.find(p => p.value === datePreset)?.label ?? 'General';

  // ── Lookup farms for drawer select ──
  const farmsForSelect = useMemo(() =>
    Object.entries(farmMap).map(([id, f]) => ({ id, name: f.name })),
    [farmMap]);

  const loading = loadingEvents || loadingLookups;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <ProducerLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-8">

        {/* ── HEADER ── */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Eventos Animales</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Actividad operativa registrada · Vacunas, pesajes, tratamientos y más
          </p>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Last event */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Último evento registrado</p>
            {loading ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : !lastEvent ? (
              <p className="text-sm text-gray-400">Sin eventos registrados</p>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: lastEvent.badgeBg }}>
                  <EventIcon iconType={lastEvent.iconType} className="w-4 h-4" style={{ color: lastEvent.badgeFg }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{lastEvent.eventLabel}</p>
                  {lastEvent.animalTag && (
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      #{lastEvent.animalTag}{lastEvent.animalName ? ` · ${lastEvent.animalName}` : ''}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{lastEvent.dateDisplay}</p>
                  {lastEvent.farmName && (
                    <p className="text-xs text-gray-400">{lastEvent.farmName}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Most frequent */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Evento más popular · {periodLabel}</p>
            {loading || !topType ? (
              <p className="text-sm text-gray-400">Sin datos suficientes</p>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: topType.meta.badgeBg }}>
                  <EventIcon iconType={topType.meta.iconType} className="w-4 h-4" style={{ color: topType.meta.badgeFg }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{topType.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {topType.count} {topType.count === 1 ? 'vez registrado' : 'veces registrado'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{topType.meta.category}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SEARCH + FILTER BAR ── */}
        <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search input */}
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por animal, tipo de evento o descripción…"
              className="w-full pl-12 pr-4 py-3 bg-transparent focus:outline-none text-sm text-gray-800 placeholder-gray-400"
            />
          </div>

          {/* Clear search */}
          {searchQuery && (
            <>
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="h-8 w-px bg-gray-200" />
            </>
          )}

          <div className="h-8 w-px bg-gray-200" />

          {/* Filter button */}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Filtros</span>
            {activeFilterCount > 0 && (
              <span
                className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: '#3FA79F' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="h-8 w-px bg-gray-200" />

          {/* Navigate to animals */}
          <button
            onClick={() => navigate('/producer/animales')}
            className="flex items-center gap-2 px-4 py-3 text-white hover:brightness-95 transition-all"
            style={{ backgroundColor: '#3FA79F' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Ver animales</span>
          </button>
        </div>

        {/* Active filter chips */}
        {(activeFilterCount > 0 || activeTypeFilter) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 font-medium">Filtros activos:</span>
            {selectedEventType && (
              <FilterChip
                label={`Tipo: ${resolveEventLabel(selectedEventType)}`}
                onRemove={() => setSelectedEventType('')}
              />
            )}
            {selectedFarm && farmMap[selectedFarm] && (
              <FilterChip
                label={`Finca: ${farmMap[selectedFarm].name}`}
                onRemove={() => setSelectedFarm('')}
              />
            )}
            {datePreset !== 'general' && (
              <FilterChip
                label={`Período: ${DATE_PRESETS.find(p => p.value === datePreset)?.label}`}
                onRemove={() => setDatePreset('general')}
              />
            )}
            {activeTypeFilter && (
              <FilterChip
                label={`Distribución: ${resolveEventLabel(activeTypeFilter)}`}
                onRemove={() => setActiveTypeFilter('')}
              />
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* ── DISTRIBUTION + TRENDS ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Event type distribution — 2/5 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Distribución por tipo</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Haz clic en un tipo para filtrar la tabla
              </p>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                </div>
              ) : typeDistribution.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-gray-400">Sin eventos en el período</p>
                </div>
              ) : (
                <div>
                  <div className="space-y-1">
                    {typeDistribution.slice(0, 4).map(({ key, label, meta, count }) => {
                      const maxCount = typeDistribution[0].count;
                      const barPct   = Math.round((count / maxCount) * 100);
                      const isActive = activeTypeFilter === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setActiveTypeFilter(isActive ? '' : key);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                            isActive ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: meta.badgeBg }}
                            >
                              <EventIcon iconType={meta.iconType} className="w-3.5 h-3.5" style={{ color: meta.badgeFg }} />
                            </div>
                            <span className="text-sm font-medium text-gray-800 flex-1 truncate">{label}</span>
                            <span className="text-sm font-bold text-gray-700 flex-shrink-0">{count}</span>
                          </div>
                          <div className="ml-9 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%`, backgroundColor: meta.dotColor }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {typeDistribution.length > 4 && (
                    <button
                      onClick={() => setShowDistribModal(true)}
                      className="w-full mt-2 py-2 text-xs font-medium text-center rounded-lg transition-colors"
                      style={{ color: '#3FA79F' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0FAF9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Ver todos ({typeDistribution.length} tipos) →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Temporal trends — 3/5 */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Tendencias temporales</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Evolución de eventos · últimos 6 meses
              </p>
            </div>
            <div className="px-5 py-5">
              {loading ? (
                <div className="flex items-center justify-center h-36">
                  <Spinner />
                </div>
              ) : !hasMonthlyData ? (
                <div className="flex flex-col items-center justify-center h-36 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Sin datos históricos</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    El sistema aún no tiene suficientes eventos en este período para mostrar tendencias.
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-2 h-36">
                  {monthlyTrends.map(({ key, label, count }) => {
                    const barH = count > 0 ? Math.max(Math.round((count / maxMonthCount) * 112), 8) : 0;
                    return (
                      <div key={key} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end items-center" style={{ height: '120px' }}>
                          {count > 0 && (
                            <span className="text-xs font-bold mb-1" style={{ color: '#3FA79F' }}>
                              {count}
                            </span>
                          )}
                          <div
                            className="w-full rounded-t-md transition-all"
                            style={{
                              height: `${barH}px`,
                              backgroundColor: count > 0 ? '#3FA79F' : '#f3f4f6',
                              minHeight: count > 0 ? '8px' : '2px',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium capitalize">{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── EVENTS TABLE ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Historial de Eventos</h2>
              {!loading && (
                <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                  <span className="font-medium text-gray-600">{totalCount} en total</span>
                  {treatmentCount > 0 && (
                    <><span className="text-gray-300">·</span><span>{treatmentCount} tratamiento{treatmentCount !== 1 ? 's' : ''}</span></>
                  )}
                  {criticalCount > 0 && (
                    <><span className="text-gray-300">·</span><span className="text-red-500 font-medium">{criticalCount} crítico{criticalCount !== 1 ? 's' : ''}</span></>
                  )}
                  {(activeTypeFilter || searchQuery) && (
                    <><span className="text-gray-300">·</span><span className="italic">filtrados</span></>
                  )}
                </p>
              )}
            </div>
            {(activeTypeFilter || searchQuery) && (
              <button
                onClick={() => { setActiveTypeFilter(''); setSearchQuery(''); setCurrentPage(1); }}
                className="text-xs font-medium hover:underline flex-shrink-0"
                style={{ color: '#3FA79F' }}
              >
                Quitar filtros
              </button>
            )}
          </div>

          {/* Table body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner className="w-8 h-8" />
              <p className="text-sm text-gray-400 mt-3">Cargando eventos…</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Sin eventos encontrados</p>
              <p className="text-xs text-gray-500">
                {activeFilterCount > 0 || searchQuery
                  ? 'Intenta ajustar los filtros o el texto de búsqueda.'
                  : 'Registra el primer evento desde el explorador de animales.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Tipo
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Animal
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Fecha
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                        Ubicación
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                        Descripción
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Estado
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedEvents.map((ev, i) => (
                      <tr
                        key={ev.id}
                        className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-gray-50 transition-colors`}
                      >
                        {/* Type */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: ev.badgeBg }}
                            >
                              <EventIcon iconType={ev.iconType} className="w-3.5 h-3.5" style={{ color: ev.badgeFg }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{ev.eventLabel}</p>
                              <p className="text-xs text-gray-400">{ev.eventCategory}</p>
                            </div>
                          </div>
                        </td>

                        {/* Animal */}
                        <td className="px-5 py-3.5">
                          {ev.animalTag ? (
                            <div>
                              <p className="text-sm font-mono font-medium text-gray-900">#{ev.animalTag}</p>
                              {ev.animalName && (
                                <p className="text-xs text-gray-400">{ev.animalName}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Sin animal asociado</p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-gray-800 whitespace-nowrap">{ev.dateDisplay}</p>
                          {ev.dateRelative && (
                            <p className="text-xs text-gray-400 mt-0.5">{ev.dateRelative}</p>
                          )}
                        </td>

                        {/* Location — hidden on mobile */}
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <p className="text-sm text-gray-800">{ev.locationDisplay}</p>
                        </td>

                        {/* Description — hidden on tablet */}
                        <td className="px-5 py-3.5 hidden lg:table-cell max-w-xs">
                          <p className="text-sm text-gray-700 truncate" title={ev.description}>
                            {ev.description}
                          </p>
                          {ev.cost != null && ev.cost > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">${ev.cost.toLocaleString()}</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {ev.critical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Crítico
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setDetailEvent(ev)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEvents.length)} de {filteredEvents.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Anterior
                    </button>
                    <span className="px-3 py-1.5 text-xs text-gray-500">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── FILTER DRAWER ── */}
      {filterDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            style={{ backdropFilter: 'blur(2px)', animation: 'fadeIn 0.2s ease-out' }}
            onClick={() => setFilterDrawerOpen(false)}
          />
          <div
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
            style={{ animation: 'slideInRight 0.25s ease-out' }}
          >
            {/* Drawer header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Filtros Avanzados</h3>
                <p className="text-xs text-gray-500 mt-0.5">Afina los resultados del historial</p>
              </div>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Event type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tipo de evento
                </label>
                <select
                  value={selectedEventType}
                  onChange={e => setSelectedEventType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#3FA79F] transition-colors"
                >
                  <option value="">Todos los tipos</option>
                  {Object.entries(EVENT_REGISTRY).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </div>

              {/* Farm */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Finca
                </label>
                <select
                  value={selectedFarm}
                  onChange={e => setSelectedFarm(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#3FA79F] transition-colors"
                >
                  <option value="">Todas las fincas</option>
                  {farmsForSelect.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Período
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DATE_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDatePreset(preset.value)}
                      className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-colors ${
                        datePreset === preset.value
                          ? 'border-[#3FA79F] bg-[#e6f7f6] text-[#2d8a83] font-semibold'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#3FA79F' }}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── DISTRIBUTION FULL MODAL ── */}
      {showDistribModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDistribModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Distribución completa por tipo</h2>
                <p className="text-xs text-gray-400 mt-0.5">{typeDistribution.length} tipos · {normalizedEvents.length} eventos</p>
              </div>
              <button
                onClick={() => setShowDistribModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-1">
                {typeDistribution.map(({ key, label, meta, count }) => {
                  const maxCount = typeDistribution[0].count;
                  const barPct   = Math.round((count / maxCount) * 100);
                  const pct      = Math.round((count / normalizedEvents.length) * 100);
                  const isActive = activeTypeFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveTypeFilter(isActive ? '' : key);
                        setCurrentPage(1);
                        setShowDistribModal(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                        isActive ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: meta.badgeBg }}
                        >
                          <EventIcon iconType={meta.iconType} className="w-3.5 h-3.5" style={{ color: meta.badgeFg }} />
                        </div>
                        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{label}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                        <span className="text-sm font-bold text-gray-700 flex-shrink-0 w-8 text-right">{count}</span>
                      </div>
                      <div className="ml-9 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, backgroundColor: meta.dotColor }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onRefresh={() => { setDetailEvent(null); loadEvents(); }}
        />
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </ProducerLayout>
  );
}

// ── Shared micro-components ────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function Spinner({ className = 'w-6 h-6' }) {
  return (
    <svg className={`animate-spin text-gray-400 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
