import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { animalEventsAPI } from '../../api/animalEvents';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import { workersAPI } from '../../api/workers';
import { buildEncodedDescription, hasWeaningEvent } from '../../lib/eventRegistry';
import EventIcon from '../../lib/eventIcons';
import Modal from '../common/Modal';

// ══════════════════════════════════════════════════════════════════════════════
// DOMAIN REGISTRY
//
// Events   = lifecycle occurrences that affect the animal without requiring
//            direct human intervention as the primary actor.
// Services = human-performed procedures applied to the animal by a worker.
//
// Nacimiento and Compra are excluded: auto-generated when a new animal is
//   registered in the system.
// Venta is excluded: handled via the financial module.
// Movimiento is excluded: handled via the Movimientos module.
// Parto is a GUIDED SHORTCUT — selecting it opens the animal creation flow
//   for the cría (offspring). No event is stored by this modal for Parto.
//   The event is created on the mother only after the calf is successfully
//   registered (handled by AnimalDetail).
// ══════════════════════════════════════════════════════════════════════════════

const ANIMAL_EVENTS = [
  {
    key:         'MontaInseminacion',
    label:       'Monta / Inseminación',
    backendType: 'Otro',
    iconType:    'mating',
    description: 'Monta natural o inseminación artificial',
    femaleOnly:  true,
  },
  {
    key:         'ConfirmacionPrenez',
    label:       'Preñez confirmada',
    backendType: 'Otro',
    iconType:    'pregnant',
    description: 'Confirmación de estado de gestación',
    femaleOnly:  true,
  },
  {
    key:         'Parto',
    label:       'Parto',
    backendType: null,           // no event stored here — opens AnimalModal for cría
    iconType:    'parto',
    description: 'Nacimiento de cría — abre el registro de la cría',
    femaleOnly:  true,
    guided:      true,
  },
  {
    key:         'Aborto',
    label:       'Aborto',
    backendType: 'Otro',
    iconType:    'abortion',
    description: 'Pérdida de gestación',
    femaleOnly:  true,
  },
  {
    key:         'Destete',
    label:       'Destete',
    backendType: 'Otro',
    iconType:    'wean',
    description: 'Separación de la cría de la madre',
  },
  {
    key:         'Perdida',
    label:       'Pérdida',
    backendType: 'Otro',
    iconType:    'lost',
    description: 'Animal reportado como perdido en la finca',
  },
  {
    key:         'Encuentro',
    label:       'Encontrado',
    backendType: 'Otro',
    iconType:    'found',
    description: 'Animal hallado tras un período de pérdida',
  },
  {
    key:         'Muerte',
    label:       'Muerte',
    backendType: 'Muerte',
    iconType:    'death',
    description: 'Fallecimiento del animal',
    critical:    true,
  },
];

const ANIMAL_SERVICES = [
  {
    key:            'Pesaje',
    label:          'Pesaje',
    backendType:    'RegistroPeso',
    iconType:       'scale',
    description:    'Registro de peso corporal',
    requiresWeight: true,
  },
  {
    key:             'Vacunacion',
    label:           'Vacunación',
    backendType:     'Vacunacion',
    iconType:        'vaccine',
    description:     'Aplicación de vacuna',
    requiresProduct: true,
  },
  {
    key:             'Medicacion',
    label:           'Medicación',
    backendType:     'Tratamiento',
    iconType:        'medicine',
    description:     'Administración de medicamento',
    requiresProduct: true,
  },
  {
    key:             'BañoAntiparasitario',
    label:           'Baño antiparasitario',
    backendType:     'Tratamiento',
    iconType:        'shower',
    description:     'Baño con producto antiparasitario',
    requiresProduct: true,
  },
  {
    key:          'RevisionVeterinaria',
    label:        'Revisión veterinaria',
    backendType:  'Tratamiento',
    iconType:     'vet',
    description:  'Examen médico veterinario',
  },
  {
    key:          'RecortePezuñas',
    label:        'Recorte de pezuñas',
    backendType:  'Otro',
    iconType:     'hoof',
    description:  'Podología y mantenimiento del casco',
  },
  {
    key:          'OtroServicio',
    label:        'Otro servicio',
    backendType:  'Otro',
    iconType:     'tool',
    description:  'Otro procedimiento operacional',
  },
];

// Flat lookup map: key → full type descriptor
const ALL_TYPES = Object.fromEntries(
  [...ANIMAL_EVENTS, ...ANIMAL_SERVICES].map(t => [t.key, t])
);

// Accept presets from parent components using backend type names or domain keys
const PRESET_MAP = {
  RegistroPeso:        'Pesaje',
  Vacunacion:          'Vacunacion',
  Tratamiento:         'Medicacion',
  Muerte:              'Muerte',
  Pesaje:              'Pesaje',
  Destete:             'Destete',
  Perdida:             'Perdida',
  Parto:               'Parto',
  ConfirmacionPrenez:  'ConfirmacionPrenez',
  MontaInseminacion:   'MontaInseminacion',
  Aborto:              'Aborto',
};

// ── Domain-aware visibility helpers ──────────────────────────────────────────

function isWeaningEligible(animal, existingEvents) {
  if (!animal) return true;
  // If we have event history, check for an existing Destete event
  if (existingEvents?.length > 0 && hasWeaningEvent(existingEvents)) return false;
  // Fallback: infer from age — animals over 365 days are considered weaned
  if (animal.birthDate) {
    const ageDays = (Date.now() - new Date(animal.birthDate).getTime()) / 86400000;
    if (ageDays > 365) return false;
  }
  return true;
}

function isEncuentroEligible(animal) {
  if (!animal) return true;
  return animal.status === 'Perdido';
}

function isPerdidaEligible(animal) {
  if (!animal) return true;
  return animal.status !== 'Perdido';
}

// ── Type Card ─────────────────────────────────────────────────────────────────

function TypeCard({ typeInfo, selected, onClick, disabled }) {
  const colorClass = selected
    ? typeInfo.critical ? 'border-red-500 bg-red-50 shadow-sm'
      : typeInfo.guided ? 'border-blue-400 bg-blue-50 shadow-sm'
      : 'border-[#3FA79F] bg-teal-50 shadow-sm'
    : typeInfo.critical ? 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/40'
    : typeInfo.guided   ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
    : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/40';

  const iconColor = selected
    ? typeInfo.critical ? '#991b1b' : typeInfo.guided ? '#1e40af' : '#1A6B64'
    : '#6b7280';

  return (
    <button
      type="button"
      onClick={() => onClick(typeInfo.key)}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center disabled:opacity-40 ${colorClass}`}
    >
      <EventIcon
        iconType={typeInfo.iconType || 'other'}
        className="w-5 h-5 mb-1.5 flex-shrink-0"
        style={{ color: iconColor }}
      />
      <span className={`text-xs font-semibold leading-tight ${
        selected
          ? typeInfo.critical ? 'text-red-800' : typeInfo.guided ? 'text-blue-900' : 'text-teal-900'
          : 'text-gray-700'
      }`}>
        {typeInfo.label}
      </span>
    </button>
  );
}

// ── Death Confirmation Screen ─────────────────────────────────────────────────

function DeathConfirmation({ animal, date, onBack, onConfirm, loading }) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sin fecha';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">Confirmar registro de muerte</p>
            <p className="text-sm text-red-700 leading-relaxed">
              Al registrar la muerte de este animal, su estado cambiará a <strong>Fallecido</strong> y
              ya no aparecerá en el listado activo del hato. Sus registros históricos —
              eventos, movimientos y servicios — seguirán disponibles cuando filtres
              animales por estado inactivo.
            </p>
            <p className="text-sm font-semibold text-red-800 mt-2">
              Esta acción es irreversible.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Animal</p>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-900 text-sm">#{animal?.tagNumber}</span>
          {animal?.name && <span className="text-sm text-gray-600">{animal.name}</span>}
          {animal?.breed && <span className="text-xs text-gray-400">· {animal.breed}</span>}
        </div>
        <p className="text-xs text-gray-500">Fecha registrada: {formattedDate}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#dc2626' }}
          onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#b91c1c')}
          onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#dc2626')}
        >
          {loading ? 'Registrando…' : 'Confirmar muerte'}
        </button>
      </div>
    </div>
  );
}

// ── Animal Selector (global mode, no context animal) ─────────────────────────

function AnimalSelector({ farms, formData, onChange, searchTerm, onSearchChange, animals }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Finca <span className="text-red-500">*</span>
          </label>
          <select name="farmId" value={formData.farmId} onChange={onChange} required
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors">
            <option value="">Selecciona una finca</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        {formData.farmId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              División <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select name="divisionId" value={formData.divisionId} onChange={onChange}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors">
              <option value="">Todas las divisiones</option>
              {(formData._divisions || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {formData.farmId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Animal <span className="text-red-500">*</span>
          </label>
          <input type="text" value={searchTerm} onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar por arete o nombre…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm mb-2" />
          <div className="border-2 border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            {animals.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">
                {searchTerm ? 'Sin coincidencias' : 'No hay animales activos en esta ubicación'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {animals.map(a => (
                  <label key={a.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      formData.animalId === a.id ? 'bg-teal-50' : ''
                    }`}>
                    <input type="radio" name="animalId" value={a.id}
                      checked={formData.animalId === a.id} onChange={onChange}
                      required className="w-4 h-4 accent-teal-600" />
                    <div className="flex-1">
                      <span className="font-mono font-semibold text-sm text-gray-900">#{a.tagNumber}</span>
                      {a.name && <span className="text-sm text-gray-500 ml-2">{a.name}</span>}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        a.sex === 'Macho' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>{a.sex}</span>
                    </div>
                    <span className="text-xs text-gray-400">{a.breed}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════

export default function EventModal({
  isOpen,
  onClose,
  onEventCreated,
  onPartoRegistered,          // called with (motherAnimal) to open AnimalModal for cría
  farmId: contextFarmId = null,
  divisionId: contextDivisionId = null,
  animalId: contextAnimalId = null,
  animal: contextAnimal = null,
  eventTypePreset = null,
  existingEvents = [],        // raw event list for Destete eligibility check
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'confirm-death'
  const [loading, setLoading] = useState(false);

  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);

  const resolvedPreset = eventTypePreset ? (PRESET_MAP[eventTypePreset] ?? null) : null;

  const [formData, setFormData] = useState({
    animalId:     contextAnimalId || '',
    farmId:       contextFarmId   || '',
    divisionId:   contextDivisionId || '',
    eventTypeKey: resolvedPreset  || '',
    eventDate:    new Date().toISOString().split('T')[0],
    description:  '',
    weightKg:     '',
    productName:  '',
    workerId:     '',
    workerName:   '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const preset = eventTypePreset ? (PRESET_MAP[eventTypePreset] ?? null) : null;
    if (preset) setFormData(prev => ({ ...prev, eventTypeKey: preset }));
  }, [isOpen, eventTypePreset]);

  useEffect(() => {
    if (isOpen && !contextAnimalId) {
      farmsAPI.getAllFarms()
        .then(d => setFarms(Array.isArray(d) ? d : []))
        .catch(() => setFarms([]));
    }
  }, [isOpen, contextAnimalId]);

  useEffect(() => {
    if (!formData.farmId || contextDivisionId) return;
    divisionsAPI.getDivisionsByFarm(formData.farmId)
      .then(d => setDivisions(Array.isArray(d) ? d : []))
      .catch(() => setDivisions([]));
  }, [formData.farmId, contextDivisionId]);

  useEffect(() => {
    if (!formData.farmId) return;
    const params = { farmId: formData.farmId, status: 'Activo', pageSize: 200 };
    if (formData.divisionId) params.divisionId = formData.divisionId;
    animalsAPI.getAnimals(params)
      .then(data => setAnimals(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => setAnimals([]));
  }, [formData.farmId, formData.divisionId]);

  const effectiveFarmId = contextAnimal?.farmId || formData.farmId;
  useEffect(() => {
    if (!isOpen || !effectiveFarmId) return;
    setWorkersLoading(true);
    workersAPI.getWorkers({ farmId: effectiveFarmId, pageSize: 100 })
      .then(data => setWorkers(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => setWorkers([]))
      .finally(() => setWorkersLoading(false));
  }, [isOpen, effectiveFarmId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeSelect = (key) => {
    setFormData(prev => ({
      ...prev,
      eventTypeKey: key,
      weightKg:    '',
      productName: '',
      workerId:    '',
      workerName:  '',
    }));
  };

  const effectiveAnimalId = contextAnimalId || formData.animalId;
  const effectiveAnimal   = contextAnimal  || animals.find(a => a.id === formData.animalId) || null;
  const selectedType      = ALL_TYPES[formData.eventTypeKey] || null;

  // Domain-aware event filtering
  const visibleEvents = useMemo(() => {
    const a = effectiveAnimal;
    let events = ANIMAL_EVENTS;

    if (a?.sex === 'Macho') {
      events = events.filter(e => !e.femaleOnly);
    }

    events = events.filter(e => {
      switch (e.key) {
        case 'Destete':   return isWeaningEligible(a, existingEvents);
        case 'Encuentro': return isEncuentroEligible(a);
        case 'Perdida':   return isPerdidaEligible(a);
        default:          return true;
      }
    });

    return events;
  }, [effectiveAnimal, existingEvents]);

  const filteredAnimals = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return animals.filter(a =>
      a.tagNumber.toLowerCase().includes(q) ||
      (a.name && a.name.toLowerCase().includes(q))
    );
  }, [animals, searchTerm]);

  const resolvedWorkerName = useMemo(() => {
    if (formData.workerId) {
      return workers.find(w => w.id === formData.workerId)?.name ?? '';
    }
    return formData.workerName;
  }, [formData.workerId, formData.workerName, workers]);

  // ── Payload builder ──────────────────────────────────────────────────────────
  const buildPayload = () => {
    const typeInfo = ALL_TYPES[formData.eventTypeKey];
    const descParts = [];

    if (selectedType?.requiresWeight && formData.weightKg)
      descParts.push(`Peso: ${formData.weightKg} kg`);
    if (formData.productName)
      descParts.push(`Producto: ${formData.productName}`);
    if (resolvedWorkerName)
      descParts.push(`Responsable: ${resolvedWorkerName}`);
    if (formData.description)
      descParts.push(formData.description);

    // For "Otro" backend events with a specific domain key, prefix the key so
    // the timeline and history can decode the real event identity.
    // OtroServicio is intentionally generic — no prefix.
    const usesOtroEncoding =
      typeInfo.backendType === 'Otro' && typeInfo.key !== 'OtroServicio';

    const description = usesOtroEncoding
      ? buildEncodedDescription(typeInfo.key, descParts)
      : (descParts.join(' | ') || null);

    const isEvent = ANIMAL_EVENTS.some(e => e.key === typeInfo.key);

    const payload = {
      animalId:    effectiveAnimalId,
      eventType:   typeInfo.backendType,
      recordType:  isEvent ? 'event' : 'service',
      eventDate:   new Date(formData.eventDate + 'T12:00:00').toISOString(),
      description,
    };

    if (typeInfo.requiresWeight && formData.weightKg) {
      payload.amount = parseFloat(formData.weightKg);
    }
    if (formData.workerId) {
      payload.workerId = formData.workerId;
    }

    return payload;
  };

  // ── Form submission ──────────────────────────────────────────────────────────
  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!effectiveAnimalId) {
      toast.error('Selecciona un animal');
      return;
    }
    if (!formData.eventTypeKey) {
      toast.error('Selecciona un tipo de evento');
      return;
    }
    if (selectedType?.requiresWeight && !formData.weightKg) {
      toast.error('Ingresa el peso del animal');
      return;
    }

    if (formData.eventTypeKey === 'Muerte') {
      setStep('confirm-death');
      return;
    }

    executeSubmit();
  };

  const executeSubmit = async () => {
    // Parto is a guided shortcut: instead of creating an event here,
    // we delegate to the parent to open the AnimalModal for the cría.
    // The Parto event on the mother will be created after the calf is saved.
    if (formData.eventTypeKey === 'Parto') {
      if (onPartoRegistered && effectiveAnimal) {
        onPartoRegistered(effectiveAnimal);
      }
      onClose();
      resetForm();
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();
      await animalEventsAPI.createEvent(payload);
      toast.success('Registrado exitosamente');
      onEventCreated();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Create event error:', err);
      toast.error(err.response?.data?.message || 'Error al registrar el evento');
    } finally {
      setLoading(false);
    }
  };

  const executeDeathWorkflow = async () => {
    setLoading(true);
    try {
      await animalEventsAPI.createEvent(buildPayload());

      await animalsAPI.closeAnimal(effectiveAnimalId, { outcome: 'Muerto' }).catch(err => {
        console.warn('closeAnimal failed (non-fatal):', err);
      });

      toast.success('Muerte registrada. El animal fue marcado como fallecido.');
      onEventCreated();
      onClose();
      resetForm();
      navigate('/producer/animales');
    } catch (err) {
      console.error('Death workflow error:', err);
      toast.error(err.response?.data?.message || 'Error al registrar la muerte');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setFormData({
      animalId:     contextAnimalId || '',
      farmId:       contextFarmId   || '',
      divisionId:   contextDivisionId || '',
      eventTypeKey: '',
      eventDate:    new Date().toISOString().split('T')[0],
      description:  '',
      weightKg:     '',
      productName:  '',
      workerId:     '',
      workerName:   '',
    });
    setSearchTerm('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isService = selectedType && ANIMAL_SERVICES.some(s => s.key === selectedType.key);
  const isDeath   = formData.eventTypeKey === 'Muerte';
  const isParto   = formData.eventTypeKey === 'Parto';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'confirm-death' ? 'Confirmar Registro de Muerte' : 'Registrar Evento'}
      maxWidth="max-w-3xl"
      footer={
        step === 'confirm-death' ? null : (
          <div className="flex gap-3">
            <button type="button" onClick={handleClose} disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" form="event-form" disabled={loading}
              className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: isDeath ? '#dc2626' : isParto ? '#2563eb' : '#3FA79F' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = isDeath ? '#b91c1c' : isParto ? '#1d4ed8' : '#368D86')}
              onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = isDeath ? '#dc2626' : isParto ? '#2563eb' : '#3FA79F')}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando…
                </>
              ) : isDeath ? 'Revisar →' : isParto ? 'Continuar al registro →' : 'Registrar'}
            </button>
          </div>
        )
      }
    >
      {step === 'confirm-death' ? (
        <DeathConfirmation
          animal={effectiveAnimal}
          date={formData.eventDate}
          onBack={() => setStep('form')}
          onConfirm={executeDeathWorkflow}
          loading={loading}
        />
      ) : (
        <form id="event-form" onSubmit={handleFormSubmit} className="space-y-6">

          {/* Animal display / selector */}
          {contextAnimal ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 border-2 border-teal-200 rounded-xl">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3FA79F' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-gray-900 text-sm">#{contextAnimal.tagNumber}</span>
                  {contextAnimal.name && <span className="text-sm text-gray-700">{contextAnimal.name}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    contextAnimal.sex === 'Macho' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}>{contextAnimal.sex}</span>
                  {contextAnimal.breed && <span className="text-xs text-gray-500">{contextAnimal.breed}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-3">Seleccionar Animal</p>
              <AnimalSelector
                farms={farms}
                formData={{ ...formData, _divisions: divisions }}
                onChange={handleChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                animals={filteredAnimals}
              />
            </div>
          )}

          {/* Events section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-gray-800">Eventos del Animal</p>
              <span className="text-xs text-gray-400">— ocurrencias del ciclo de vida</span>
            </div>

            {visibleEvents.length === 0 ? (
              <p className="text-xs text-gray-400 italic px-1 py-3">
                No hay eventos disponibles para el estado actual de este animal.
              </p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {visibleEvents.map(type => (
                  <TypeCard
                    key={type.key}
                    typeInfo={type}
                    selected={formData.eventTypeKey === type.key}
                    onClick={handleTypeSelect}
                    disabled={loading}
                  />
                ))}
              </div>
            )}

            {selectedType && ANIMAL_EVENTS.some(e => e.key === selectedType.key) && (
              <p className="text-xs text-gray-400 mt-2 pl-1">{selectedType.description}</p>
            )}
          </div>

          {/* Date */}
          {!isParto && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input type="date" name="eventDate" value={formData.eventDate}
                onChange={handleChange} required max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors" />
            </div>
          )}

          {/* Weight (Pesaje only) */}
          {selectedType?.requiresWeight && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Peso (kg) <span className="text-red-500">*</span>
              </label>
              <input type="number" name="weightKg" value={formData.weightKg}
                onChange={handleChange} required min="0" step="0.1" placeholder="Ej: 285.5"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors" />
            </div>
          )}

          {/* Product / medicine name */}
          {selectedType?.requiresProduct && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Producto / Medicamento <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="text" name="productName" value={formData.productName}
                onChange={handleChange}
                placeholder={
                  selectedType.key === 'Vacunacion' ? 'Ej: Vacuna Triple Bovina, Fiebre Aftosa…'
                  : selectedType.key === 'BañoAntiparasitario' ? 'Ej: Amitraz 12.5%, Ivermectina…'
                  : 'Ej: Oxitetraciclina, Meloxicam, Albendazol…'
                }
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors" />
            </div>
          )}

          {/* Responsible worker (all services) */}
          {isService && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Responsable{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>

              {workersLoading ? (
                <div className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-lg bg-gray-50 text-sm text-gray-400">
                  Cargando trabajadores…
                </div>
              ) : workers.length > 0 ? (
                <select name="workerId" value={formData.workerId} onChange={handleChange}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors">
                  <option value="">Selecciona un responsable</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}{w.role ? ` — ${w.role}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" name="workerName" value={formData.workerName}
                  onChange={handleChange}
                  placeholder="Nombre del trabajador o veterinario que realizó el servicio"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors" />
              )}

              {workers.length === 0 && !workersLoading && effectiveFarmId && (
                <p className="text-xs text-gray-400 mt-1">
                  No hay trabajadores registrados en esta finca.
                </p>
              )}
            </div>
          )}

          {/* Parto guided-shortcut banner */}
          {isParto && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-1">Registro guiado de cría</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Al continuar se abrirá el formulario de registro de la cría con esta
                  madre preseleccionada. El evento de Parto quedará registrado
                  automáticamente en el historial de la madre una vez que la cría
                  sea guardada con éxito.
                </p>
              </div>
            </div>
          )}

          {/* Death warning preview */}
          {isDeath && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-700">
                Registrar una muerte requiere confirmación. Al continuar, el animal será
                marcado como <strong>Fallecido</strong> y saldrá del hato activo.
              </p>
            </div>
          )}

          {/* Notes (hidden for Parto — no event stored here) */}
          {!isParto && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notas <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                rows="3" placeholder="Detalles adicionales sobre el evento…"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors resize-none" />
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
