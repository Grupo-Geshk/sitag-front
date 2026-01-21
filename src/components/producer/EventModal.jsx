import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { animalEventsAPI } from '../../api/animalEvents';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import { economyAPI } from '../../api/transactions';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function EventModal({
  isOpen,
  onClose,
  onEventCreated,
  farmId: contextFarmId = null,
  divisionId: contextDivisionId = null,
  animalId: contextAnimalId = null,
  animal: contextAnimal = null,
  eventTypePreset = null
}) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    animalId: contextAnimalId || '',
    farmId: contextFarmId || '',
    divisionId: contextDivisionId || '',
    eventType: eventTypePreset || '',
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
    diseaseType: '',
    diseaseCategory: '',
    weightKg: '',
    // Economy transaction fields
    transactionCategory: '',
    transactionAmount: '',
    transactionDescription: '',
  });

  useEffect(() => {
    if (isOpen && !contextAnimalId) {
      fetchFarms();
    }
    if (isOpen && eventTypePreset) {
      setFormData(prev => ({ ...prev, eventType: eventTypePreset }));
    }
  }, [isOpen, eventTypePreset]);

  useEffect(() => {
    if (formData.farmId && !contextDivisionId) {
      fetchDivisions(formData.farmId);
    }
  }, [formData.farmId]);

  useEffect(() => {
    if (formData.divisionId || (formData.farmId && !formData.divisionId)) {
      fetchAnimals();
    }
  }, [formData.farmId, formData.divisionId]);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
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
      const filters = {
        farmId: formData.farmId,
        status: 'Activo',
        pageSize: 100,
      };
      if (formData.divisionId) {
        filters.divisionId = formData.divisionId;
      }
      const data = await animalsAPI.getAnimals(filters);
      setAnimals(data.items || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate event type is appropriate for animal sex
      if (selectedAnimal?.sex === 'Macho' &&
          (formData.eventType === 'Parto' || formData.eventType === 'ConfirmacionPrenez')) {
        toast.error('No se puede registrar eventos de parto o preñez para animales machos');
        setLoading(false);
        return;
      }

      const eventData = {
        animalId: parseInt(formData.animalId),
        eventType: formData.eventType,
        eventDate: formData.eventDate,
        description: formData.description,
      };

      // Add disease fields if event type is Enfermedad or Evento médico
      if (formData.eventType === 'Enfermedad' || formData.eventType === 'Evento médico') {
        eventData.diseaseType = formData.diseaseType;
        eventData.diseaseCategory = formData.diseaseCategory;
      }

      // Add weight field if event type is Pesaje
      if (formData.eventType === 'Pesaje') {
        eventData.weightKg = parseFloat(formData.weightKg);
      }

      // Handle Compra/Venta with atomic transaction creation
      if (formData.eventType === 'Compra' || formData.eventType === 'Venta') {
        // Validate transaction fields are required for Compra/Venta
        if (!formData.transactionAmount || !formData.transactionCategory) {
          toast.error('Debe completar los campos de transacción económica para ' + formData.eventType);
          setLoading(false);
          return;
        }

        // Use atomic endpoint for purchase/sale
        await animalEventsAPI.createPurchaseSaleEvent({
          animalId: parseInt(formData.animalId),
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          description: formData.description,
          amount: parseFloat(formData.transactionAmount),
          category: formData.transactionCategory,
          transactionDescription: formData.transactionDescription,
          farmId: formData.farmId || contextFarmId,
        });

        toast.success(`¡${formData.eventType} registrada exitosamente! Transacción económica creada.`);
      } else {
        // Create regular event for other types
        await animalEventsAPI.createEvent(eventData);
        toast.success('¡Evento registrado exitosamente!');
      }

      onEventCreated();
      onClose();

      // Reset form
      setFormData({
        animalId: contextAnimalId || '',
        farmId: contextFarmId || '',
        divisionId: contextDivisionId || '',
        eventType: '',
        eventDate: new Date().toISOString().split('T')[0],
        description: '',
        diseaseType: '',
        diseaseCategory: '',
        weightKg: '',
        transactionCategory: '',
        transactionAmount: '',
        transactionDescription: '',
      });
      setSearchTerm('');
    } catch (error) {
      console.error('Create event error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        'Error al registrar el evento';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reactive filtering: Filter animals based on search term AND event type requirements
  const filteredAnimals = animals.filter(animal => {
    // Text search filter
    const matchesSearch = animal.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (animal.name && animal.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Event type-specific filters
    if (formData.eventType === 'Curado') {
      // Curado: only show sick or critical animals
      return animal.healthStatus === 'Enfermo' || animal.healthStatus === 'Critico';
    }

    if (formData.eventType === 'Parto') {
      // Parto: only show pregnant animals
      return animal.estadoReproductivo?.diasGestacion > 0;
    }

    if (formData.eventType === 'Destete') {
      // Destete: only show lactating animals (young animals with mother)
      return animal.motherId != null;
    }

    return true;
  });

  const selectedAnimal = contextAnimal || animals.find(a => a.id === parseInt(formData.animalId));

  // All event types supported by backend
  const allEventTypes = [
    { value: 'Nacimiento', label: 'Nacimiento', icon: '🐄' },
    { value: 'Parto', label: 'Parto', icon: '👶', femaleOnly: true },
    { value: 'Enfermedad', label: 'Enfermedad', icon: '🤒', requiresDisease: true },
    { value: 'Medicacion', label: 'Medicación', icon: '💊' },
    { value: 'Curado', label: 'Curado', icon: '✨' },
    { value: 'Vacunacion', label: 'Vacunación', icon: '💉' },
    { value: 'Pesaje', label: 'Pesaje', icon: '⚖️', requiresWeight: true },
    { value: 'Destete', label: 'Destete', icon: '🍼' },
    { value: 'Compra', label: 'Compra', icon: '💰', requiresTransaction: true },
    { value: 'Venta', label: 'Venta', icon: '🏷️', requiresTransaction: true },
    { value: 'Muerte', label: 'Muerte', icon: '💀' },
    { value: 'Perdida', label: 'Pérdida', icon: '❓' },
    { value: 'Encuentro', label: 'Encuentro', icon: '✅' },
    { value: 'ConfirmacionPrenez', label: 'Confirmación Preñez', icon: '🤰', femaleOnly: true },
    { value: 'Movimiento', label: 'Movimiento', icon: '🚚' },
  ];

  // Filter event types based on selected animal's sex
  const eventTypes = selectedAnimal?.sex === 'Macho'
    ? allEventTypes.filter(et => !et.femaleOnly)
    : allEventTypes;

  const selectedEventType = eventTypes.find(et => et.value === formData.eventType);
  const requiresDisease = selectedEventType?.requiresDisease;
  const requiresWeight = selectedEventType?.requiresWeight;
  const requiresTransaction = selectedEventType?.requiresTransaction;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Evento"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="event-form"
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#3FA79F' }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#368D86')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3FA79F')}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Evento
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Animal Selection - Only show if no animal context provided */}
          {!contextAnimalId && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Animal</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Farm Selection */}
                {!contextFarmId && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">Finca *</label>
                    <select
                      name="farmId"
                      value={formData.farmId}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    >
                      <option value="">Seleccione una finca</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>{farm.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Division Selection */}
                {!contextDivisionId && formData.farmId && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">División (opcional)</label>
                    <select
                      name="divisionId"
                      value={formData.divisionId}
                      onChange={handleChange}
                      disabled={loading || divisions.length === 0}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
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
                )}
              </div>

              {/* Animal Search and Selection */}
              {formData.farmId && (
                <>
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-medium text-gray-800">Buscar Animal</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por número de arete o nombre..."
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">Animal *</label>
                    <div className="border-2 border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                      {filteredAnimals.length === 0 ? (
                        <p className="p-4 text-center text-gray-500">
                          {searchTerm ? 'No se encontraron animales' : 'No hay animales en esta ubicación'}
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredAnimals.map(animal => (
                            <label
                              key={animal.id}
                              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                                formData.animalId === animal.id.toString() ? 'bg-blue-50' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="animalId"
                                value={animal.id}
                                checked={formData.animalId === animal.id.toString()}
                                onChange={handleChange}
                                required
                                className="w-4 h-4"
                                style={{ accentColor: '#3FA79F' }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-semibold">{animal.tagNumber}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${animal.sex === 'Macho' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                    {animal.sex}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">{animal.name || 'Sin nombre'} - {animal.breed}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Show selected animal info if context provided */}
          {contextAnimal && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Animal seleccionado:</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{contextAnimal.tagNumber}</span>
                <span className="text-gray-600">-</span>
                <span>{contextAnimal.name || 'Sin nombre'}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${contextAnimal.sex === 'Macho' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {contextAnimal.sex}
                </span>
              </div>
            </div>
          )}

          {/* Event Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Evento</h3>

            {/* Event Type - Pill Selector */}
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-gray-800">Tipo de Evento *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {eventTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, eventType: type.value }))}
                    disabled={loading}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-50
                      ${formData.eventType === type.value
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                      }
                    `}
                  >
                    <span className="text-2xl mb-1">{type.icon}</span>
                    <span className={`text-xs font-semibold text-center ${formData.eventType === type.value ? 'text-teal-900' : 'text-gray-700'}`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">Fecha del Evento *</label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {/* Disease fields - only if event type requires it */}
              {requiresDisease && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">Tipo de Enfermedad *</label>
                    <input
                      type="text"
                      name="diseaseType"
                      value={formData.diseaseType}
                      onChange={handleChange}
                      required={requiresDisease}
                      disabled={loading}
                      placeholder="Ej: Respiratoria, Digestiva"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">Categoría *</label>
                    <select
                      name="diseaseCategory"
                      value={formData.diseaseCategory}
                      onChange={handleChange}
                      required={requiresDisease}
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    >
                      <option value="">Seleccione categoría</option>
                      <option value="Bacterial">Bacterial</option>
                      <option value="Viral">Viral</option>
                      <option value="Parasitaria">Parasitaria</option>
                      <option value="Metabólica">Metabólica</option>
                      <option value="Critica">Crítica</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                </>
              )}

              {/* Weight field - only if event type requires it */}
              {requiresWeight && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">Peso (kg) *</label>
                  <input
                    type="number"
                    name="weightKg"
                    value={formData.weightKg}
                    onChange={handleChange}
                    required={requiresWeight}
                    disabled={loading}
                    min="0"
                    step="0.1"
                    placeholder="Ej: 250.5"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              )}
            </div>

            {/* Economy Transaction fields - only for Compra/Venta events */}
            {requiresTransaction && (
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-4">
                <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  💰 Transacción Económica
                  <span className="text-xs font-normal text-gray-600">(Opcional)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Transaction Category */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">Categoría</label>
                    <select
                      name="transactionCategory"
                      value={formData.transactionCategory}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    >
                      <option value="">Seleccione categoría</option>
                      {formData.eventType === 'Compra' ? (
                        <>
                          <option value="Animales">Compra de Animales</option>
                          <option value="Ganado">Ganado</option>
                          <option value="Reproductores">Reproductores</option>
                        </>
                      ) : (
                        <>
                          <option value="Animales">Venta de Animales</option>
                          <option value="Ganado">Ganado</option>
                          <option value="Carne">Carne</option>
                          <option value="Reproductores">Reproductores</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Transaction Amount */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-800">Monto ($)</label>
                    <input
                      type="number"
                      name="transactionAmount"
                      value={formData.transactionAmount}
                      onChange={handleChange}
                      disabled={loading}
                      min="0"
                      step="0.01"
                      placeholder="Ej: 1500.00"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                      style={{ borderColor: '#E2E8F0' }}
                      onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                      onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    />
                  </div>
                </div>

                {/* Transaction Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">Descripción de la Transacción</label>
                  <input
                    type="text"
                    name="transactionDescription"
                    value={formData.transactionDescription}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Detalles adicionales de la transacción..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-gray-800">Descripción / Notas</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows="4"
                placeholder="Agregue notas o detalles adicionales sobre el evento..."
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 resize-none"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>
        </form>
    </Modal>
  );
}
