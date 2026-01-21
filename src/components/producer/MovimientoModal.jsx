import { useState, useEffect } from 'react';
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

  // Step 1: Division Selection
  const [farms, setFarms] = useState([]);

  // Origin farm and division
  const [originFarmId, setOriginFarmId] = useState(preselectedFarmId || null);
  const [originDivisions, setOriginDivisions] = useState([]);
  const [divisionOrigen, setDivisionOrigen] = useState(preselectedDivisionId || null);

  // Destination farm and division
  const [destinationFarmId, setDestinationFarmId] = useState(null);
  const [destinationDivisions, setDestinationDivisions] = useState([]);
  const [divisionDestino, setDivisionDestino] = useState(null);

  const [errors, setErrors] = useState({});

  // Step 2: Animal Selection
  const [animalsInOrigen, setAnimalsInOrigen] = useState([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      fetchFarms();
    }
  }, [isOpen]);

  // Load divisions for origin farm
  useEffect(() => {
    if (originFarmId) {
      fetchOriginDivisions(originFarmId);
    }
  }, [originFarmId]);

  // Load divisions for destination farm
  useEffect(() => {
    if (destinationFarmId) {
      fetchDestinationDivisions(destinationFarmId);
    }
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

    if (!originFarmId) {
      newErrors.originFarm = 'Debes seleccionar una finca de origen';
    }

    if (!divisionOrigen) {
      newErrors.divisionOrigen = 'Debes seleccionar una división de origen';
    }

    if (!destinationFarmId) {
      newErrors.destinationFarm = 'Debes seleccionar una finca de destino';
    }

    if (!divisionDestino) {
      newErrors.divisionDestino = 'Debes seleccionar una división de destino';
    }

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
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();

    if (months < 12) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else {
      const years = Math.floor(months / 12);
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
  };

  const handleRealizarMovimiento = async () => {
    if (selectedAnimalIds.size === 0) {
      toast.error('Debes seleccionar al menos un animal');
      return;
    }

    setSubmitting(true);

    try {
      const origenDiv = originDivisions.find(d => d.id === divisionOrigen);
      const destinoDiv = destinationDivisions.find(d => d.id === divisionDestino);

      const originFarm = farms.find(f => f.id === originFarmId);
      const destinationFarm = farms.find(f => f.id === destinationFarmId);

      // Prepare payload matching BulkMovementRequest DTO
      const movementData = {
        animalIds: Array.from(selectedAnimalIds),
        fromDivisionId: divisionOrigen,
        toFarmId: destinationFarmId,
        toDivisionId: divisionDestino,
        movementDate: new Date().toISOString(),
        reason: `Movimiento: ${originFarm?.name} (${origenDiv?.name}) → ${destinationFarm?.name} (${destinoDiv?.name})`
      };

      console.log('=== MOVEMENT DEBUG ===');
      console.log('Payload:', JSON.stringify(movementData, null, 2));

      const response = await movementsAPI.processBulkMovement(movementData);

      console.log('Movement response:', response);

      toast.success(
        `✅ ${selectedAnimalIds.size} ${selectedAnimalIds.size === 1 ? 'animal movido' : 'animales movidos'} exitosamente`
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

  const filteredAnimals = animalsInOrigen.filter(animal => {
    const searchLower = searchQuery.toLowerCase();
    return (
      animal.tagNumber.toLowerCase().includes(searchLower) ||
      (animal.name && animal.name.toLowerCase().includes(searchLower))
    );
  });

  const originFarmName = farms.find(f => f.id === originFarmId)?.name || '';
  const originDivisionName = originDivisions.find(d => d.id === divisionOrigen)?.name || '';
  const destFarmName = farms.find(f => f.id === destinationFarmId)?.name || '';
  const destDivisionName = destinationDivisions.find(d => d.id === divisionDestino)?.name || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Movimiento de Animales
          </h2>

          {/* Progress Stepper */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                step === 1 ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-700'
              }`}>
                {step > 1 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : '1'}
              </div>
              <span className={`text-sm font-medium ${step === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                Ubicaciones
              </span>
            </div>

            <div className={`h-px w-8 ${step === 2 ? 'bg-teal-500' : 'bg-gray-300'}`}></div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                step === 2 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${step === 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                Seleccionar Animales
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
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
              onMouseEnter={(e) => !loading && e.currentTarget.disabled === false && (e.target.style.backgroundColor = '#368D86')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3FA79F')}
            >
              {loading ? 'Cargando...' : 'Continuar'}
            </button>
          ) : (
            <button
              onClick={handleRealizarMovimiento}
              disabled={selectedAnimalIds.size === 0 || submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
              onMouseEnter={(e) => !submitting && e.currentTarget.disabled === false && (e.target.style.backgroundColor = '#368D86')}
              onMouseLeave={(e) => !submitting && (e.target.style.backgroundColor = '#3FA79F')}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  Realizar Movimiento
                  {selectedAnimalIds.size > 0 && ` (${selectedAnimalIds.size})`}
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {step === 1 ? (
        /* STEP 1: Division Selection - Horizontal Layout */
        <div className="space-y-5">
          {/* Origin and Destination Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Origin Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Origen
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Finca
                  </label>
                  <select
                    value={originFarmId || ''}
                    onChange={(e) => handleOriginFarmChange(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value="">Seleccionar finca...</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                  {errors.originFarm && (
                    <p className="text-xs text-red-600 mt-1">{errors.originFarm}</p>
                  )}
                </div>

                {originFarmId && originDivisions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      División
                    </label>
                    <select
                      value={divisionOrigen || ''}
                      onChange={(e) => {
                        setDivisionOrigen(e.target.value ? parseInt(e.target.value) : null);
                        setErrors({});
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar división...</option>
                      {originDivisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                    {errors.divisionOrigen && (
                      <p className="text-xs text-red-600 mt-1">{errors.divisionOrigen}</p>
                    )}
                  </div>
                )}

                {originFarmId && originDivisions.length === 0 && !loading && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    Esta finca no tiene divisiones registradas
                  </div>
                )}
              </div>
            </div>

            {/* Arrow Connector - Hidden on mobile */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center w-8 h-8 bg-white border-2 border-gray-200 rounded-full z-10">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>

            {/* Destination Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Destino
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Finca
                  </label>
                  <select
                    value={destinationFarmId || ''}
                    onChange={(e) => handleDestinationFarmChange(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value="">Seleccionar finca...</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                  {errors.destinationFarm && (
                    <p className="text-xs text-red-600 mt-1">{errors.destinationFarm}</p>
                  )}
                </div>

                {destinationFarmId && destinationDivisions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      División
                    </label>
                    <select
                      value={divisionDestino || ''}
                      onChange={(e) => {
                        setDivisionDestino(e.target.value ? parseInt(e.target.value) : null);
                        setErrors({});
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar división...</option>
                      {destinationDivisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                    {errors.divisionDestino && (
                      <p className="text-xs text-red-600 mt-1">{errors.divisionDestino}</p>
                    )}
                  </div>
                )}

                {destinationFarmId && destinationDivisions.length === 0 && !loading && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    Esta finca no tiene divisiones registradas
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {errors.sameDivision && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-red-800">
                <p className="font-medium">El origen y destino no pueden ser iguales</p>
                <p className="mt-0.5">Selecciona una división de destino diferente</p>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-800">
              Puedes mover animales entre divisiones de la misma finca o entre fincas diferentes
            </p>
          </div>
        </div>
      ) : (
        /* STEP 2: Animal Selection */
        <div className="space-y-4">
          {/* Fixed Movement Summary Strip */}
          <div className="sticky top-0 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 -mx-6 mx-0 z-10">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">De:</span>
              <span className="font-medium text-gray-900">{originFarmName} · {originDivisionName}</span>
              <svg className="w-4 h-4 text-teal-600 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-gray-600">Hacia:</span>
              <span className="font-medium text-gray-900">{destFarmName} · {destDivisionName}</span>
            </div>
          </div>

          {animalsInOrigen.length > 0 ? (
            <>
              {/* Search and Select All Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por arete o nombre..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selectAll ? 'bg-teal-500 border-teal-500' : 'border-gray-400 bg-white'
                  }`}>
                    {selectAll && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span>Seleccionar todos ({animalsInOrigen.length})</span>
                </button>
              </div>

              {/* Animal Selection List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                {filteredAnimals.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredAnimals.map(animal => {
                      const isSelected = selectedAnimalIds.has(animal.id);
                      return (
                        <div
                          key={animal.id}
                          onClick={() => toggleAnimal(animal.id)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50 hover:bg-teal-100' : 'bg-white hover:bg-gray-50'
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

                          {/* Avatar with Sex Icon */}
                          <div className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${
                            animal.sex === 'Hembra' ? 'bg-pink-100' : 'bg-blue-100'
                          }`}>
                            <span className="text-base">
                              {animal.sex === 'Hembra' ? '♀' : '♂'}
                            </span>
                          </div>

                          {/* Animal Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-sm text-gray-900">#{animal.tagNumber}</span>
                              {animal.name && (
                                <span className="text-sm text-gray-600 truncate">{animal.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                              <span>{animal.sex}</span>
                              <span>·</span>
                              <span>{animal.breed}</span>
                              <span>·</span>
                              <span>{calculateAge(animal.birthDate)}</span>
                              {animal.currentWeight && (
                                <>
                                  <span>·</span>
                                  <span>{animal.currentWeight} kg</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Health Badge */}
                          {animal.estadoSalud && (
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                animal.estadoSalud === 'Sano' ? 'bg-green-100 text-green-700' :
                                animal.estadoSalud === 'Enfermo' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {animal.estadoSalud}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">No se encontraron animales con ese criterio</p>
                  </div>
                )}
              </div>

              {/* Selection Counter */}
              {selectedAnimalIds.size > 0 && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-teal-900">
                    {selectedAnimalIds.size} {selectedAnimalIds.size === 1 ? 'animal seleccionado' : 'animales seleccionados'}
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                No hay animales en esta división
              </h3>
              <p className="text-sm text-gray-600">
                La división de origen no tiene animales activos
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
