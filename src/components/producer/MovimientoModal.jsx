import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import { movementsAPI } from '../../api/movements';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function MovimientoModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedFarmId = null,
  preselectedDivisionId = null
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Location selection
  const [farms, setFarms] = useState([]);

  // Origin
  const [originFarmId,    setOriginFarmId]    = useState(preselectedFarmId || null);
  const [originDivisions, setOriginDivisions] = useState([]);
  const [divisionOrigen,  setDivisionOrigen]  = useState(preselectedDivisionId || null);

  // Destination
  const [destinationFarmId,     setDestinationFarmId]     = useState(null);
  const [destinationDivisions,  setDestinationDivisions]  = useState([]);
  const [divisionDestino,       setDivisionDestino]       = useState(null);

  const [errors, setErrors] = useState({});

  // Step 2: Animal selection
  const [animalsInOrigen,   setAnimalsInOrigen]   = useState([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState(new Set());
  const [selectAll,         setSelectAll]         = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) fetchFarms();
  }, [isOpen]);

  useEffect(() => {
    if (originFarmId) fetchOriginDivisions(originFarmId);
  }, [originFarmId]);

  useEffect(() => {
    if (destinationFarmId) fetchDestinationDivisions(destinationFarmId);
  }, [destinationFarmId]);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Error al cargar las fincas');
    } finally {
      setLoading(false);
    }
  };

  const fetchOriginDivisions = async (farmId) => {
    setLoading(true);
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setOriginDivisions(divisionsData || []);
    } catch (error) {
      console.error('Error fetching origin divisions:', error);
      toast.error('Error al cargar las divisiones de origen');
    } finally {
      setLoading(false);
    }
  };

  const fetchDestinationDivisions = async (farmId) => {
    setLoading(true);
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setDestinationDivisions(divisionsData || []);
    } catch (error) {
      console.error('Error fetching destination divisions:', error);
      toast.error('Error al cargar las divisiones de destino');
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOriginFarmChange = (farmId) => {
    setOriginFarmId(farmId);
    setDivisionOrigen(null);
    setErrors({});
  };

  const handleDestinationFarmChange = (farmId) => {
    setDestinationFarmId(farmId);
    setDivisionDestino(null);
    setErrors({});
  };

  const validateDivisions = () => {
    const newErrors = {};
    if (!originFarmId)      newErrors.originFarm      = 'Debes seleccionar una finca de origen';
    if (!divisionOrigen)    newErrors.divisionOrigen  = 'Debes seleccionar una división de origen';
    if (!destinationFarmId) newErrors.destinationFarm = 'Debes seleccionar una finca de destino';
    if (!divisionDestino)   newErrors.divisionDestino = 'Debes seleccionar una división de destino';

    if (originFarmId && destinationFarmId && divisionOrigen && divisionDestino) {
      if (originFarmId === destinationFarmId && divisionOrigen === divisionDestino) {
        newErrors.sameDivision = 'La división de origen y destino no pueden ser la misma';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToAnimals = async () => {
    if (!validateDivisions()) return;
    setLoading(true);
    try {
      const response = await animalsAPI.getAnimals({
        divisionId: divisionOrigen,
        status: 'Activo',
        pageSize: 100
      });
      setAnimalsInOrigen(response.items || []);
      setStep(2);
    } catch (error) {
      console.error('Error loading animals:', error);
      toast.error('Error al cargar los animales');
    } finally {
      setLoading(false);
    }
  };

  const toggleAnimal = (animalId) => {
    const newSelection = new Set(selectedAnimalIds);
    if (newSelection.has(animalId)) {
      newSelection.delete(animalId);
    } else {
      newSelection.add(animalId);
    }
    setSelectedAnimalIds(newSelection);
    setSelectAll(newSelection.size === animalsInOrigen.length && animalsInOrigen.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedAnimalIds(new Set());
    } else {
      setSelectedAnimalIds(new Set(animalsInOrigen.map(a => a.id)));
    }
    setSelectAll(!selectAll);
  };

  const calculateAge = (birthDate) => {
    const birth = new Date(birthDate + 'T00:00:00');
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  };

  const handleRealizarMovimiento = async () => {
    if (selectedAnimalIds.size === 0) {
      toast.error('Debes seleccionar al menos un animal');
      return;
    }
    setSubmitting(true);
    try {
      const origenDiv     = originDivisions.find(d => d.id === divisionOrigen);
      const destinoDiv    = destinationDivisions.find(d => d.id === divisionDestino);
      const originFarm    = farms.find(f => f.id === originFarmId);
      const destinationFarm = farms.find(f => f.id === destinationFarmId);

      const movementData = {
        animalIds:      Array.from(selectedAnimalIds),
        fromDivisionId: divisionOrigen,
        toFarmId:       destinationFarmId,
        toDivisionId:   divisionDestino,
        movementDate:   new Date().toISOString(),
        reason: `Movimiento: ${originFarm?.name} (${origenDiv?.name}) → ${destinationFarm?.name} (${destinoDiv?.name})`
      };

      console.log('=== MOVEMENT DEBUG ===');
      console.log('Payload:', JSON.stringify(movementData, null, 2));

      const response = await movementsAPI.processBulkMovement(movementData);
      console.log('Movement response:', response);

      toast.success(
        `${selectedAnimalIds.size} ${selectedAnimalIds.size === 1 ? 'animal trasladado' : 'animales trasladados'} exitosamente`
      );

      // Reset state
      setStep(1);
      setSelectedAnimalIds(new Set());
      setSelectAll(false);
      setSearchQuery('');
      setOriginFarmId(null);
      setDestinationFarmId(null);
      setDivisionOrigen(null);
      setDivisionDestino(null);
      setOriginDivisions([]);
      setDestinationDivisions([]);
      setErrors({});

      onSuccess();
      onClose();
    } catch (error) {
      console.error('=== ERROR PROCESSING MOVEMENT ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(`Error al procesar el movimiento: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const filteredAnimals = animalsInOrigen.filter(animal => {
    const q = searchQuery.toLowerCase();
    return (
      animal.tagNumber.toLowerCase().includes(q) ||
      (animal.name && animal.name.toLowerCase().includes(q))
    );
  });

  const originFarmName     = farms.find(f => f.id === originFarmId)?.name || '';
  const originDivisionName = originDivisions.find(d => d.id === divisionOrigen)?.name || '';
  const destFarmName       = farms.find(f => f.id === destinationFarmId)?.name || '';
  const destDivisionName   = destinationDivisions.find(d => d.id === divisionDestino)?.name || '';

  const todayFormatted = format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Traslado de Animales
          </h2>

          {/* Progress stepper */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 1
                  ? 'text-white shadow-sm'
                  : 'text-white'
              }`}
                style={{ backgroundColor: '#3FA79F' }}>
                {step > 1 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : '1'}
              </div>
              <span className={`text-sm font-semibold ${step === 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                Ruta del traslado
              </span>
            </div>

            <div className={`flex-1 h-px max-w-8 ${step === 2 ? 'bg-teal-400' : 'bg-gray-200'}`} />

            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === 2 ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-400'
              }`}
                style={step === 2 ? { backgroundColor: '#3FA79F' } : {}}>
                2
              </div>
              <span className={`text-sm font-semibold ${step === 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                Selección de animales
              </span>
            </div>
          </div>
        </div>
      }
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 1 ? 'Cancelar' : '← Atrás'}
          </button>

          {step === 1 ? (
            <button
              onClick={handleContinueToAnimals}
              disabled={
                !originFarmId ||
                !destinationFarmId ||
                !divisionOrigen ||
                !divisionDestino ||
                (originFarmId === destinationFarmId && divisionOrigen === divisionDestino) ||
                loading
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              style={{ backgroundColor: '#3FA79F' }}
              onMouseEnter={e => !loading && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#368D86')}
              onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#3FA79F')}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Cargando…
                </>
              ) : (
                <>
                  Continuar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleRealizarMovimiento}
              disabled={selectedAnimalIds.size === 0 || submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              style={{ backgroundColor: '#3FA79F' }}
              onMouseEnter={e => !submitting && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#368D86')}
              onMouseLeave={e => !submitting && (e.currentTarget.style.backgroundColor = '#3FA79F')}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando…
                </>
              ) : (
                <>
                  Confirmar Traslado
                  {selectedAnimalIds.size > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20">
                      {selectedAnimalIds.size}
                    </span>
                  )}
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {step === 1 ? (
        /* ══════════════════════════════════════════════════════════════════
           STEP 1 — Route configuration
           Two location cards (Origin / Destination) + directional connector
           + date display card
        ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-5">

          {/* Route builder */}
          <div className="relative flex flex-col md:grid md:grid-cols-2 md:gap-6 gap-0">

            {/* ── ORIGIN CARD ── */}
            <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
              divisionOrigen ? 'border-gray-300' : 'border-gray-200'
            }`}>
              {/* Card header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  divisionOrigen
                    ? 'border-gray-500 bg-gray-500'
                    : 'border-gray-300 bg-white'
                }`}>
                  {divisionOrigen ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-400 block" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 leading-none">
                    Punto de Origen
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {divisionOrigen
                      ? `${originFarmName} · ${originDivisionName}`
                      : '¿Desde dónde sale el animal?'}
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-4 bg-white">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                    Finca de origen
                  </label>
                  <select
                    value={originFarmId || ''}
                    onChange={e => handleOriginFarmChange(e.target.value || null)}
                    disabled={loading}
                    className="w-full px-4 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition-colors disabled:opacity-50 disabled:bg-gray-50 appearance-auto"
                  >
                    <option value="">Selecciona una finca…</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                  {errors.originFarm && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.originFarm}
                    </p>
                  )}
                </div>

                {originFarmId && originDivisions.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                      División de origen
                    </label>
                    <select
                      value={divisionOrigen || ''}
                      onChange={e => { setDivisionOrigen(e.target.value || null); setErrors({}); }}
                      className="w-full px-4 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition-colors appearance-auto"
                    >
                      <option value="">Selecciona una división…</option>
                      {originDivisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                    {errors.divisionOrigen && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.divisionOrigen}
                      </p>
                    )}
                  </div>
                )}

                {originFarmId && originDivisions.length === 0 && !loading && (
                  <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800 font-medium">
                      Esta finca no tiene divisiones registradas
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── MOBILE CONNECTOR (vertical) ── */}
            <div className="flex md:hidden items-center justify-center py-2 z-10">
              <div className="w-9 h-9 rounded-full border-2 border-teal-300 bg-white shadow-md flex items-center justify-center">
                <svg className="w-4 h-4" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* ── DESKTOP CONNECTOR (horizontal, absolute) ── */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center">
              <div className="w-11 h-11 rounded-full border-2 border-teal-300 bg-white shadow-md flex items-center justify-center">
                <svg className="w-5 h-5" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>

            {/* ── DESTINATION CARD ── */}
            <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
              divisionDestino ? 'border-teal-400' : 'border-teal-200'
            }`}>
              {/* Card header */}
              <div className="px-4 py-3 border-b border-teal-100 flex items-center gap-3"
                style={{ backgroundColor: '#F0F9F8' }}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  divisionDestino
                    ? 'border-teal-500 bg-teal-500'
                    : 'border-teal-300 bg-white'
                }`}>
                  {divisionDestino ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-teal-400 block" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest leading-none" style={{ color: '#2E7D78' }}>
                    Punto de Destino
                  </p>
                  <p className="text-xs mt-1 truncate" style={{ color: '#4FA8A2' }}>
                    {divisionDestino
                      ? `${destFarmName} · ${destDivisionName}`
                      : '¿Hacia dónde va el animal?'}
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-4 bg-white">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                    Finca de destino
                  </label>
                  <select
                    value={destinationFarmId || ''}
                    onChange={e => handleDestinationFarmChange(e.target.value || null)}
                    disabled={loading}
                    className="w-full px-4 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition-colors disabled:opacity-50 disabled:bg-gray-50 appearance-auto"
                  >
                    <option value="">Selecciona una finca…</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                  {errors.destinationFarm && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.destinationFarm}
                    </p>
                  )}
                </div>

                {destinationFarmId && destinationDivisions.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                      División de destino
                    </label>
                    <select
                      value={divisionDestino || ''}
                      onChange={e => { setDivisionDestino(e.target.value || null); setErrors({}); }}
                      className="w-full px-4 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition-colors appearance-auto"
                    >
                      <option value="">Selecciona una división…</option>
                      {destinationDivisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                    {errors.divisionDestino && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.divisionDestino}
                      </p>
                    )}
                  </div>
                )}

                {destinationFarmId && destinationDivisions.length === 0 && !loading && (
                  <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800 font-medium">
                      Esta finca no tiene divisiones registradas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── DATE DISPLAY CARD ── */}
          <div className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#F0F9F8' }}>
              <svg className="w-5 h-5" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                Fecha del traslado
              </p>
              <p className="text-base font-bold text-gray-900 capitalize leading-tight">
                {todayFormatted}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Se registrará con la fecha y hora actuales
              </p>
            </div>
          </div>

          {/* ── SAME DIVISION ERROR ── */}
          {errors.sameDivision && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">El origen y destino no pueden ser iguales</p>
                <p className="text-xs text-red-600 mt-0.5">Selecciona una división de destino diferente</p>
              </div>
            </div>
          )}

          {/* ── INFO BANNER ── */}
          <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-800">
              Puedes mover animales entre divisiones de la misma finca o entre fincas diferentes.
            </p>
          </div>
        </div>

      ) : (
        /* ══════════════════════════════════════════════════════════════════
           STEP 2 — Animal selection
        ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">

          {/* ── ROUTE SUMMARY STRIP ── */}
          <div className="sticky top-0 bg-white border border-gray-200 rounded-xl px-4 py-3 z-10 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Origin chip */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex-shrink-0 max-w-[160px]">
                <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate leading-none">{originFarmName}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5 leading-none">{originDivisionName}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#F0F9F8' }}>
                <svg className="w-3.5 h-3.5" style={{ color: '#3FA79F' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Destination chip */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border flex-shrink-0 max-w-[160px]"
                style={{ backgroundColor: '#F0F9F8', borderColor: '#A7D7D3' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#3FA79F' }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate leading-none">{destFarmName}</p>
                  <p className="text-xs truncate mt-0.5 leading-none" style={{ color: '#4FA8A2' }}>{destDivisionName}</p>
                </div>
              </div>

              {/* Selection count */}
              {selectedAnimalIds.size > 0 && (
                <div className="ml-auto flex-shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                    style={{ color: '#2E7D78', backgroundColor: '#F0F9F8', borderColor: '#A7D7D3' }}>
                    {selectedAnimalIds.size} seleccionado{selectedAnimalIds.size !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {animalsInOrigen.length > 0 ? (
            <>
              {/* Search + select all */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por arete o nombre…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selectAll ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'
                  }`}>
                    {selectAll && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  Seleccionar todos ({animalsInOrigen.length})
                </button>
              </div>

              {/* Animal list */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                {filteredAnimals.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredAnimals.map(animal => {
                      const isSelected = selectedAnimalIds.has(animal.id);
                      return (
                        <div
                          key={animal.id}
                          onClick={() => toggleAnimal(animal.id)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50 hover:bg-teal-100/80' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>

                          {/* Sex avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            animal.sex === 'Hembra' ? 'bg-pink-100' : 'bg-blue-100'
                          }`}>
                            <span className="text-base">{animal.sex === 'Hembra' ? '♀' : '♂'}</span>
                          </div>

                          {/* Animal info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-sm text-gray-900">#{animal.tagNumber}</span>
                              {animal.name && (
                                <span className="text-sm text-gray-500 truncate">{animal.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                              <span>{animal.sex}</span>
                              <span className="text-gray-300">·</span>
                              <span>{animal.breed}</span>
                              <span className="text-gray-300">·</span>
                              <span>{calculateAge(animal.birthDate)}</span>
                              {animal.currentWeight && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span>{animal.currentWeight} kg</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Health badge */}
                          {animal.estadoSalud && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                              animal.estadoSalud === 'Sano'    ? 'bg-green-100 text-green-700' :
                              animal.estadoSalud === 'Enfermo' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {animal.estadoSalud}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">No se encontraron animales con ese criterio</p>
                  </div>
                )}
              </div>

              {/* Selection counter */}
              {selectedAnimalIds.size > 0 && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: '#F0F9F8', borderColor: '#A7D7D3' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#3FA79F' }}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#2E7D78' }}>
                    {selectedAnimalIds.size} {selectedAnimalIds.size === 1 ? 'animal seleccionado' : 'animales seleccionados'} para trasladar
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#F0F9F8' }}>
                <svg className="w-8 h-8" style={{ color: '#3FA79F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                Sin animales en esta división
              </h3>
              <p className="text-sm text-gray-500">
                La división de origen no tiene animales activos disponibles para trasladar
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
