import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { servicesAPI } from '../../api/services';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import { workersAPI } from '../../api/workers';
import { suppliesAPI } from '../../api/supplies';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function ServiceModal({ service, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Service Details
  const [tipo, setTipo] = useState('');
  const [tipoCustom, setTipoCustom] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());

  // Step 2: Animal Selection
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);
  const [animalsInLocation, setAnimalsInLocation] = useState([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 3: Supply Consumption (for specific service types)
  const [supplies, setSupplies] = useState([]);
  const [selectedSupplies, setSelectedSupplies] = useState([]); // Array of { supplyId, quantity, notes }

  // Workers
  const [workers, setWorkers] = useState([]);

  // Service types that require supply consumption
  const supplyConsumingTypes = ['Vacunacion', 'Medicacion', 'Desparasitacion', 'Banio'];

  useEffect(() => {
    fetchFarms();
    fetchWorkers();

    if (service) {
      setTipo(service.tipo || '');
      setServiceDate(service.serviceDate ? new Date(service.serviceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setDescripcion(service.descripcion || '');
      if (service.responsables) {
        setSelectedWorkers(new Set(service.responsables.map(r => r.id)));
      }
    }
  }, [service]);

  useEffect(() => {
    if (selectedFarmId) {
      fetchDivisions(selectedFarmId);
      // Load supplies when farm is selected and service type requires supplies
      if (supplyConsumingTypes.includes(tipo)) {
        fetchSupplies(selectedFarmId);
      }
    }
  }, [selectedFarmId, tipo]);

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

  const fetchDivisions = async (farmId) => {
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setDivisions(divisionsData || []);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchWorkers = async () => {
    try {
      const workersData = await workersAPI.getWorkers({ status: 'Activo', pageSize: 100 });
      setWorkers(workersData.items || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchSupplies = async (farmId) => {
    try {
      const suppliesData = await suppliesAPI.getSupplies({ farmId, status: 'Activo' });
      // Filter supplies by category based on service type and available stock
      const filtered = (suppliesData.items || suppliesData || []).filter(supply => {
        // Only show supplies with available stock
        if (supply.currentQuantity <= 0) return false;

        // Filter by category based on service type
        const category = supply.category?.toLowerCase();
        if (tipo === 'Vacunacion') return category === 'vacunas' || category === 'medicamentos';
        if (tipo === 'Medicacion') return category === 'medicamentos';
        if (tipo === 'Desparasitacion') return category === 'desparasitantes' || category === 'medicamentos';
        if (tipo === 'Banio') return category === 'productos de limpieza' || category === 'desinfectantes';
        return true;
      });
      setSupplies(filtered);
    } catch (error) {
      console.error('Error fetching supplies:', error);
      toast.error('Error al cargar los insumos');
    }
  };

  const handleContinueToAnimals = async () => {
    if (!tipo || (tipo === 'Otros' && !tipoCustom)) {
      toast.error('Debes seleccionar un tipo de servicio');
      return;
    }

    if (selectedWorkers.size === 0) {
      toast.error('Debes asignar al menos un responsable');
      return;
    }

    if (!selectedFarmId) {
      toast.error('Debes seleccionar una finca');
      return;
    }

    setLoading(true);
    try {
      const filters = {
        farmId: selectedFarmId,
        status: 'Activo',
        pageSize: 100
      };

      if (selectedDivisionId) {
        filters.divisionId = selectedDivisionId;
      }

      const response = await animalsAPI.getAnimals(filters);
      const animalsList = response.items || [];
      setAnimalsInLocation(animalsList);

      // Pre-select all animals when location is selected
      setSelectedAnimalIds(new Set(animalsList.map(a => a.id)));
      setSelectAll(true);

      setStep(2);
    } catch (error) {
      console.error('Error loading animals:', error);
      toast.error('Error al cargar los animales');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToSupplies = () => {
    if (selectedAnimalIds.size === 0) {
      toast.error('Debes seleccionar al menos un animal');
      return;
    }

    // If service type requires supplies, go to supplies step
    if (supplyConsumingTypes.includes(tipo)) {
      setStep(3);
    } else {
      // Otherwise, submit directly
      handleSubmit();
    }
  };

  const toggleWorker = (workerId) => {
    const newSelection = new Set(selectedWorkers);
    if (newSelection.has(workerId)) {
      newSelection.delete(workerId);
    } else {
      newSelection.add(workerId);
    }
    setSelectedWorkers(newSelection);
  };

  const toggleAnimal = (animalId) => {
    const newSelection = new Set(selectedAnimalIds);
    if (newSelection.has(animalId)) {
      newSelection.delete(animalId);
    } else {
      newSelection.add(animalId);
    }
    setSelectedAnimalIds(newSelection);
    setSelectAll(newSelection.size === animalsInLocation.length && animalsInLocation.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedAnimalIds(new Set());
    } else {
      setSelectedAnimalIds(new Set(animalsInLocation.map(a => a.id)));
    }
    setSelectAll(!selectAll);
  };

  const addSupply = () => {
    setSelectedSupplies([...selectedSupplies, { supplyId: '', quantity: '', notes: '' }]);
  };

  const removeSupply = (index) => {
    setSelectedSupplies(selectedSupplies.filter((_, i) => i !== index));
  };

  const updateSupply = (index, field, value) => {
    const updated = [...selectedSupplies];
    updated[index][field] = value;
    setSelectedSupplies(updated);
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

  const handleSubmit = async () => {
    if (selectedAnimalIds.size === 0) {
      toast.error('Debes seleccionar al menos un animal');
      return;
    }

    // Validate supplies if required
    if (supplyConsumingTypes.includes(tipo) && step === 3) {
      const validSupplies = selectedSupplies.filter(s => s.supplyId && s.quantity > 0);

      // Check if any supply exceeds available stock
      for (const selectedSupply of validSupplies) {
        const supply = supplies.find(s => s.id === parseInt(selectedSupply.supplyId));
        if (supply && parseFloat(selectedSupply.quantity) > supply.currentQuantity) {
          toast.error(`La cantidad de ${supply.name} excede el stock disponible (${supply.currentQuantity})`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const serviceData = {
        type: tipo === 'Otros' ? tipoCustom : tipo,
        serviceDate: serviceDate,
        description: descripcion || null,
        farmId: selectedFarmId,
        divisionId: selectedDivisionId || null,
        workerIds: Array.from(selectedWorkers),
        animalIds: Array.from(selectedAnimalIds),
      };

      // Add supply consumptions if applicable
      if (supplyConsumingTypes.includes(tipo)) {
        const validSupplies = selectedSupplies.filter(s => s.supplyId && s.quantity > 0);
        if (validSupplies.length > 0) {
          serviceData.supplyConsumptions = validSupplies.map(s => ({
            supplyId: parseInt(s.supplyId),
            quantity: parseFloat(s.quantity),
            notes: s.notes || null
          }));
        }
      }

      console.log('=== SERVICE CREATION DEBUG ===');
      console.log('Service Data:', JSON.stringify(serviceData, null, 2));

      if (service) {
        await servicesAPI.updateService(service.id, serviceData);
        toast.success('Servicio actualizado exitosamente');
      } else {
        await servicesAPI.createService(serviceData);
        const supplyMessage = serviceData.supplyConsumptions ? ' Insumos consumidos.' : '';
        toast.success(`✅ Servicio registrado para ${selectedAnimalIds.size} ${selectedAnimalIds.size === 1 ? 'animal' : 'animales'}.${supplyMessage}`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el servicio';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Service types matching backend enum exactly
  const serviceTypes = [
    { value: 'Vacunacion', label: 'Vacunación', icon: '💉', requiresSupplies: true },
    { value: 'Medicacion', label: 'Medicación', icon: '💊', requiresSupplies: true },
    { value: 'Desparasitacion', label: 'Desparasitación', icon: '🐛', requiresSupplies: true },
    { value: 'Banio', label: 'Baño', icon: '🚿', requiresSupplies: true },
    { value: 'Inseminacion', label: 'Inseminación', icon: '🧬' },
    { value: 'RevisionMedica', label: 'Revisión Médica', icon: '🩺' },
    { value: 'CorteDePezunias', label: 'Corte de Pezuñas', icon: '✂️' },
    { value: 'Pesaje', label: 'Pesaje', icon: '⚖️' },
    { value: 'Herrado', label: 'Herrado', icon: '🔨' },
    { value: 'Sangria', label: 'Sangría', icon: '💉' },
    { value: 'Otros', label: 'Otro (especificar)', icon: '📋' }
  ];

  const filteredAnimals = animalsInLocation.filter(animal => {
    const searchLower = searchQuery.toLowerCase();
    return (
      animal.tagNumber.toLowerCase().includes(searchLower) ||
      (animal.name && animal.name.toLowerCase().includes(searchLower))
    );
  });

  const getStepTitle = () => {
    if (step === 1) return 'Paso 1: Detalles del servicio';
    if (step === 2) return 'Paso 2: Selecciona los animales';
    if (step === 3) return 'Paso 3: Insumos consumidos (opcional)';
    return '';
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {service ? 'Editar Servicio' : 'Registrar Servicio Ejecutado'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{getStepTitle()}</p>
        </div>
      }
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>

          {step === 1 ? (
            <button
              onClick={handleContinueToAnimals}
              disabled={!tipo || (tipo === 'Otros' && !tipoCustom) || !serviceDate || selectedWorkers.size === 0 || !selectedFarmId || loading}
              className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
            >
              {loading ? 'Cargando...' : 'Continuar →'}
            </button>
          ) : step === 2 ? (
            <button
              onClick={handleContinueToSupplies}
              disabled={selectedAnimalIds.size === 0 || submitting}
              className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
            >
              {supplyConsumingTypes.includes(tipo) ? 'Continuar →' : 'Registrar Servicio'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                'Registrar Servicio'
              )}
            </button>
          )}
        </div>
      }
    >
      {step === 1 ? (
        /* STEP 1: Service Details */
        <div className="space-y-6">
          {/* Tipo de Servicio - Pill Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Tipo de Servicio *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {serviceTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTipo(type.value)}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                    ${tipo === type.value
                      ? 'border-teal-500 bg-teal-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                    }
                  `}
                >
                  <span className="text-3xl mb-2">{type.icon}</span>
                  <span className={`text-sm font-semibold text-center ${tipo === type.value ? 'text-teal-900' : 'text-gray-700'}`}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Type */}
          {tipo === 'Otros' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Especifica el tipo *
              </label>
              <input
                type="text"
                value={tipoCustom}
                onChange={(e) => setTipoCustom(e.target.value)}
                placeholder="Ej: Limpieza de instalaciones"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Service Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Fecha del Servicio *
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-500 mt-1">Los servicios se registran como ya ejecutados</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Descripción / Notas (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Agrega detalles adicionales sobre el servicio..."
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Workers Selection - Moved before Ubicación */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Responsable(s) *
            </label>
            <div className="border-2 border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {workers.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No hay trabajadores activos disponibles</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {workers.map(worker => {
                    const isSelected = selectedWorkers.has(worker.workerId);
                    return (
                      <div
                        key={worker.workerId}
                        onClick={() => toggleWorker(worker.workerId)}
                        className={`
                          p-3 cursor-pointer transition-colors hover:bg-gray-50
                          ${isSelected ? 'bg-teal-50' : 'bg-white'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}
                          `}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {worker.firstName} {worker.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{worker.role}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedWorkers.size > 0 && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-green-800">
                  {selectedWorkers.size} {selectedWorkers.size === 1 ? 'responsable seleccionado' : 'responsables seleccionados'}
                </span>
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Ubicación</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Finca *
                </label>
                <select
                  value={selectedFarmId || ''}
                  onChange={(e) => {
                    setSelectedFarmId(e.target.value ? parseInt(e.target.value) : null);
                    setSelectedDivisionId(null);
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecciona una finca...</option>
                  {farms.map(farm => (
                    <option key={farm.id || farm.farmId} value={farm.id || farm.farmId}>{farm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  División (opcional)
                </label>
                <select
                  value={selectedDivisionId || ''}
                  onChange={(e) => setSelectedDivisionId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!selectedFarmId}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  <option value="">Toda la finca</option>
                  {divisions.map(div => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Helper text for Continue button requirements */}
          {(!tipo || (tipo === 'Otros' && !tipoCustom) || !serviceDate || selectedWorkers.size === 0 || !selectedFarmId) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium mb-1">Para continuar, completa:</p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                {!tipo && <li>Selecciona un tipo de servicio</li>}
                {tipo === 'Otros' && !tipoCustom && <li>Especifica el tipo de servicio personalizado</li>}
                {!serviceDate && <li>Selecciona la fecha del servicio</li>}
                {selectedWorkers.size === 0 && <li>Asigna al menos un responsable</li>}
                {!selectedFarmId && <li>Selecciona una finca</li>}
              </ul>
            </div>
          )}
        </div>
      ) : step === 2 ? (
        /* STEP 2: Animal Selection */
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
            <p className="text-sm font-medium text-teal-900 mb-2">📋 Resumen del Servicio</p>
            <div className="space-y-1 text-sm text-gray-900">
              <div><span className="font-semibold">Tipo:</span> {tipo === 'Otros' ? tipoCustom : serviceTypes.find(t => t.value === tipo)?.label}</div>
              <div><span className="font-semibold">Ubicación:</span> {farms.find(f => (f.id || f.farmId) === selectedFarmId)?.name}{selectedDivisionId && ` / ${divisions.find(d => d.id === selectedDivisionId)?.name}`}</div>
              <div><span className="font-semibold">Responsables:</span> {workers.filter(w => selectedWorkers.has(w.workerId)).map(w => `${w.firstName} ${w.lastName}`).join(', ')}</div>
            </div>
          </div>

          {/* Animals List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                🐄 Animales en la Ubicación ({animalsInLocation.length})
              </h3>
            </div>

            {animalsInLocation.length > 0 && (
              <>
                {/* Select All */}
                <div
                  onClick={toggleSelectAll}
                  className="border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center
                      ${selectAll ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}
                    `}>
                      {selectAll && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">
                      Seleccionar todos ({animalsInLocation.length})
                    </span>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por número de arete o nombre..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Animals Grid */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredAnimals.map(animal => {
                    const isSelected = selectedAnimalIds.has(animal.id);
                    return (
                      <div
                        key={animal.id}
                        onClick={() => toggleAnimal(animal.id)}
                        className={`
                          border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                          ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center mt-1 flex-shrink-0
                            ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}
                          `}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">#{animal.tagNumber}</span>
                              {animal.name && <span className="text-gray-600">- {animal.name}</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>{animal.sex === 'Hembra' ? '🐄' : '🐂'} {animal.sex}</span>
                              <span>{animal.breed}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`
                                inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border
                                ${animal.healthStatus === 'Sano' ? 'bg-green-50 border-green-200 text-green-800' : ''}
                                ${animal.healthStatus === 'Enfermo' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''}
                                ${animal.healthStatus === 'Critico' ? 'bg-red-50 border-red-200 text-red-800' : ''}
                              `}>
                                {animal.healthStatus || animal.estadoSalud || 'Sano'}
                              </span>
                              <span className="text-xs text-gray-500">• {calculateAge(animal.birthDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredAnimals.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p>No se encontraron animales</p>
                    </div>
                  )}
                </div>

                {selectedAnimalIds.size > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-green-800">
                      {selectedAnimalIds.size} {selectedAnimalIds.size === 1 ? 'animal seleccionado' : 'animales seleccionados'}
                    </span>
                  </div>
                )}
              </>
            )}

            {animalsInLocation.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay animales en esta ubicación
                </h3>
                <p className="text-gray-600">
                  La ubicación seleccionada no tiene animales activos registrados.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STEP 3: Supply Consumption */
        <div className="space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">💊 Insumos Consumidos</p>
            <p className="text-xs text-gray-700">
              Registra los insumos utilizados en este servicio. Las cantidades se deducirán automáticamente del inventario.
            </p>
          </div>

          {selectedSupplies.map((selectedSupply, index) => (
            <div key={index} className="border-2 border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Insumo #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeSupply(index)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Insumo *</label>
                  <select
                    value={selectedSupply.supplyId}
                    onChange={(e) => updateSupply(index, 'supplyId', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Selecciona un insumo...</option>
                    {supplies.map(supply => (
                      <option key={supply.id} value={supply.id}>
                        {supply.name} (Stock: {supply.currentQuantity} {supply.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">Cantidad *</label>
                  <input
                    type="number"
                    value={selectedSupply.quantity}
                    onChange={(e) => updateSupply(index, 'quantity', e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Notas (opcional)</label>
                <input
                  type="text"
                  value={selectedSupply.notes}
                  onChange={(e) => updateSupply(index, 'notes', e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSupply}
            className="w-full py-3 border-2 border-dashed border-teal-300 rounded-lg text-teal-700 font-semibold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Insumo
          </button>

          {supplies.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                No hay insumos disponibles para este tipo de servicio en la finca seleccionada.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
