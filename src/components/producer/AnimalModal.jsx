import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { animalsAPI } from '../../api/animals';
import { animalEventsAPI } from '../../api/animalEvents';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function AnimalModal({ isOpen, onClose, onAnimalCreated }) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [formData, setFormData] = useState({
    origin: '', // Parto, Compra, Otros
    tagNumber: '',
    name: '',
    sex: 'Hembra',
    breed: '',
    birthDate: '',
    birthWeight: '',
    farmId: '',
    divisionId: '',
    fatherId: '',
    motherId: '',
    // Economy fields for Compra
    transactionAmount: '',
    transactionCategory: 'Ganado',
    transactionDescription: '',
  });

  // Genealogy search state
  const [availableAnimals, setAvailableAnimals] = useState([]);
  const [motherSearch, setMotherSearch] = useState('');
  const [fatherSearch, setFatherSearch] = useState('');
  const [selectedMother, setSelectedMother] = useState(null);
  const [selectedFather, setSelectedFather] = useState(null);
  const [showMotherDropdown, setShowMotherDropdown] = useState(false);
  const [showFatherDropdown, setShowFatherDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFarms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.farmId) {
      fetchDivisions(formData.farmId);
    } else {
      setDivisions([]);
      setFormData(prev => ({ ...prev, divisionId: '' }));
    }
  }, [formData.farmId]);

  useEffect(() => {
    if (isOpen && formData.origin === 'Parto') {
      fetchAvailableAnimals();
    }
  }, [isOpen, formData.origin]);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Error al cargar las fincas');
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

  const fetchAvailableAnimals = async () => {
    try {
      const producerId = getProducerId();
      const response = await animalsAPI.getAnimals({
        producerId,
        status: 'Activo',
        pageSize: 1000
      });
      setAvailableAnimals(response.items || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
      toast.error('Error al cargar los animales disponibles');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMotherSelect = (animal) => {
    setSelectedMother(animal);
    setFormData(prev => ({ ...prev, motherId: animal.id.toString() }));
    setMotherSearch('');
    setShowMotherDropdown(false);
  };

  const handleFatherSelect = (animal) => {
    setSelectedFather(animal);
    setFormData(prev => ({ ...prev, fatherId: animal.id.toString() }));
    setFatherSearch('');
    setShowFatherDropdown(false);
  };

  const clearMother = () => {
    setSelectedMother(null);
    setFormData(prev => ({ ...prev, motherId: '' }));
    setMotherSearch('');
  };

  const clearFather = () => {
    setSelectedFather(null);
    setFormData(prev => ({ ...prev, fatherId: '' }));
    setFatherSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate origin is selected
      if (!formData.origin) {
        toast.error('Debe seleccionar el origen del animal');
        setLoading(false);
        return;
      }

      // Validate mother ID is provided for Parto
      if (formData.origin === 'Parto' && !formData.motherId) {
        toast.error('La madre es requerida para animales nacidos en la finca');
        setLoading(false);
        return;
      }

      // Validate transaction fields for Compra
      if (formData.origin === 'Compra') {
        if (!formData.transactionAmount || parseFloat(formData.transactionAmount) <= 0) {
          toast.error('El monto de compra es requerido y debe ser mayor a 0');
          setLoading(false);
          return;
        }
        if (!formData.transactionCategory) {
          toast.error('La categoría de la transacción es requerida');
          setLoading(false);
          return;
        }
      }

      // If origin is Compra, use atomic endpoint
      if (formData.origin === 'Compra') {
        const purchaseData = {
          tagNumber: formData.tagNumber,
          name: formData.name || null,
          sex: formData.sex,
          breed: formData.breed,
          birthDate: formData.birthDate,
          birthWeight: parseFloat(formData.birthWeight),
          farmId: parseInt(formData.farmId),
          divisionId: formData.divisionId ? parseInt(formData.divisionId) : null,
          amount: parseFloat(formData.transactionAmount),
          category: formData.transactionCategory,
          transactionDescription: formData.transactionDescription || null,
        };

        await animalsAPI.createAnimalWithPurchase(purchaseData);
        toast.success('¡Animal registrado exitosamente! Transacción económica creada.');
      } else {
        // For Parto or Otros, use regular endpoint
        const animalData = {
          tagNumber: formData.tagNumber,
          name: formData.name || null,
          sex: formData.sex,
          breed: formData.breed,
          birthDate: formData.birthDate,
          birthWeight: parseFloat(formData.birthWeight),
          farmId: parseInt(formData.farmId),
          divisionId: formData.divisionId ? parseInt(formData.divisionId) : null,
          fatherId: formData.fatherId ? parseInt(formData.fatherId) : null,
          motherId: formData.motherId ? parseInt(formData.motherId) : null,
        };

        await animalsAPI.createAnimal(animalData);
        toast.success('¡Animal registrado exitosamente!');
      }

      onAnimalCreated();
      onClose();

      // Reset form
      setFormData({
        origin: '',
        tagNumber: '',
        name: '',
        sex: 'Hembra',
        breed: '',
        birthDate: '',
        birthWeight: '',
        farmId: '',
        divisionId: '',
        fatherId: '',
        motherId: '',
        transactionAmount: '',
        transactionCategory: 'Ganado',
        transactionDescription: '',
      });

      // Reset genealogy search state
      setSelectedMother(null);
      setSelectedFather(null);
      setMotherSearch('');
      setFatherSearch('');
      setShowMotherDropdown(false);
      setShowFatherDropdown(false);
    } catch (error) {
      console.error('Create animal error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        'Error al registrar el animal';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nuevo Animal"
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
            form="animal-form"
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
                Registrar Animal
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="animal-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Origen del Animal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Origen del Animal *</h3>
            <div className="space-y-4">
              <select
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              >
                <option value="">Seleccione el origen del animal</option>
                <option value="Parto">Parto - Nacido en la finca</option>
                <option value="Compra">Compra - Adquirido externamente</option>
                <option value="Otros">Otros - Origen no especificado</option>
              </select>

              {/* Warning for Otros */}
              {formData.origin === 'Otros' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Advertencia</p>
                      <p>Al seleccionar "Otros" se reducirá la precisión del manejo genealógico y trazabilidad del animal. Se recomienda especificar si fue por Parto o Compra cuando sea posible.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info for Parto */}
              {formData.origin === 'Parto' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Nacido en la finca - Se requiere información de la madre</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info for Compra */}
              {formData.origin === 'Compra' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Compra - Se requiere información de la transacción económica</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tag Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Número de Arete / Chapeta *
                </label>
                <input
                  type="text"
                  name="tagNumber"
                  value={formData.tagNumber}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Ej: A001, BOV-123"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 font-mono"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Ej: Bessie, Blacky"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {/* Sex */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Sexo *
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                >
                  <option value="Hembra">Hembra</option>
                  <option value="Macho">Macho</option>
                </select>
              </div>

              {/* Breed */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Raza *
                </label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Ej: Holstein, Brahman, Simmental"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
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

              {/* Birth Weight */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Peso al Nacer (kg) *
                </label>
                <input
                  type="number"
                  name="birthWeight"
                  value={formData.birthWeight}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  min="0"
                  step="0.1"
                  placeholder="Ej: 35.5"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Farm */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Finca *
                </label>
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

              {/* Division */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  División (opcional)
                </label>
                <select
                  name="divisionId"
                  value={formData.divisionId}
                  onChange={handleChange}
                  disabled={loading || !formData.farmId || divisions.length === 0}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                >
                  <option value="">Sin división asignada</option>
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>{division.name}</option>
                  ))}
                </select>
                {formData.farmId && divisions.length === 0 && (
                  <p className="text-xs text-gray-500">Esta finca no tiene divisiones creadas</p>
                )}
              </div>
            </div>
          </div>

          {/* Genealogía - Only for Parto */}
          {formData.origin === 'Parto' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Genealogía</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mother Search - Required for Parto */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium text-gray-800">
                    Buscar Madre *
                  </label>
                  {selectedMother ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2.5 bg-teal-50 border border-teal-300 rounded-lg">
                        <div className="text-sm font-medium text-teal-900">
                          {selectedMother.tagNumber} - {selectedMother.name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-teal-700">
                          {farms.find(f => f.id === selectedMother.farmId)?.name || 'Sin finca'}
                          {selectedMother.divisionId && divisions.find(d => d.id === selectedMother.divisionId)
                            ? ` / ${divisions.find(d => d.id === selectedMother.divisionId).name}`
                            : ' / Sin división'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearMother}
                        disabled={loading}
                        className="px-3 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={motherSearch}
                        onChange={(e) => {
                          setMotherSearch(e.target.value);
                          setShowMotherDropdown(true);
                        }}
                        disabled={loading}
                        placeholder="Buscar por número o nombre..."
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3FA79F';
                          setShowMotherDropdown(true);
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E2E8F0';
                          setTimeout(() => setShowMotherDropdown(false), 200);
                        }}
                      />
                      {showMotherDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableAnimals
                            .filter(animal =>
                              animal.sex === 'Hembra' &&
                              (motherSearch === '' ||
                               animal.tagNumber.toLowerCase().includes(motherSearch.toLowerCase()) ||
                               animal.name?.toLowerCase().includes(motherSearch.toLowerCase()))
                            )
                            .map(animal => {
                              const farm = farms.find(f => f.id === animal.farmId);
                              const division = animal.divisionId ? divisions.find(d => d.id === animal.divisionId) : null;
                              return (
                                <button
                                  key={animal.id}
                                  type="button"
                                  onClick={() => handleMotherSelect(animal)}
                                  className="w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">
                                    {animal.tagNumber} - {animal.name || 'Sin nombre'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {farm?.name || 'Sin finca'}{division ? ` / ${division.name}` : ' / Sin división'}
                                  </div>
                                </button>
                              );
                            })}
                          {availableAnimals.filter(animal =>
                            animal.sex === 'Hembra' &&
                            (motherSearch === '' ||
                             animal.tagNumber.toLowerCase().includes(motherSearch.toLowerCase()) ||
                             animal.name?.toLowerCase().includes(motherSearch.toLowerCase()))
                          ).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No se encontraron hembras que coincidan
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Father Search - Optional for Parto */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium text-gray-800">
                    Buscar Padre (opcional)
                  </label>
                  {selectedFather ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2.5 bg-teal-50 border border-teal-300 rounded-lg">
                        <div className="text-sm font-medium text-teal-900">
                          {selectedFather.tagNumber} - {selectedFather.name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-teal-700">
                          {farms.find(f => f.id === selectedFather.farmId)?.name || 'Sin finca'}
                          {selectedFather.divisionId && divisions.find(d => d.id === selectedFather.divisionId)
                            ? ` / ${divisions.find(d => d.id === selectedFather.divisionId).name}`
                            : ' / Sin división'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearFather}
                        disabled={loading}
                        className="px-3 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={fatherSearch}
                        onChange={(e) => {
                          setFatherSearch(e.target.value);
                          setShowFatherDropdown(true);
                        }}
                        disabled={loading}
                        placeholder="Buscar por número o nombre..."
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3FA79F';
                          setShowFatherDropdown(true);
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E2E8F0';
                          setTimeout(() => setShowFatherDropdown(false), 200);
                        }}
                      />
                      {showFatherDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableAnimals
                            .filter(animal =>
                              animal.sex === 'Macho' &&
                              (fatherSearch === '' ||
                               animal.tagNumber.toLowerCase().includes(fatherSearch.toLowerCase()) ||
                               animal.name?.toLowerCase().includes(fatherSearch.toLowerCase()))
                            )
                            .map(animal => {
                              const farm = farms.find(f => f.id === animal.farmId);
                              const division = animal.divisionId ? divisions.find(d => d.id === animal.divisionId) : null;
                              return (
                                <button
                                  key={animal.id}
                                  type="button"
                                  onClick={() => handleFatherSelect(animal)}
                                  className="w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">
                                    {animal.tagNumber} - {animal.name || 'Sin nombre'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {farm?.name || 'Sin finca'}{division ? ` / ${division.name}` : ' / Sin división'}
                                  </div>
                                </button>
                              );
                            })}
                          {availableAnimals.filter(animal =>
                            animal.sex === 'Macho' &&
                            (fatherSearch === '' ||
                             animal.tagNumber.toLowerCase().includes(fatherSearch.toLowerCase()) ||
                             animal.name?.toLowerCase().includes(fatherSearch.toLowerCase()))
                          ).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No se encontraron machos que coincidan
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Economy Transaction - Only for Compra */}
          {formData.origin === 'Compra' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transacción Económica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Monto de Compra (Bs) *
                  </label>
                  <input
                    type="number"
                    name="transactionAmount"
                    value={formData.transactionAmount}
                    onChange={handleChange}
                    required={formData.origin === 'Compra'}
                    disabled={loading}
                    min="0"
                    step="0.01"
                    placeholder="Ej: 15000"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Categoría *
                  </label>
                  <select
                    name="transactionCategory"
                    value={formData.transactionCategory}
                    onChange={handleChange}
                    required={formData.origin === 'Compra'}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  >
                    <option value="Ganado">Ganado</option>
                    <option value="Compra de Animales">Compra de Animales</option>
                    <option value="Inversión">Inversión</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Descripción de la Transacción (opcional)
                  </label>
                  <textarea
                    name="transactionDescription"
                    value={formData.transactionDescription}
                    onChange={handleChange}
                    disabled={loading}
                    rows="3"
                    placeholder="Detalles adicionales sobre la compra..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 resize-none"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          {formData.origin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Información Importante</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El número de arete debe ser único para cada animal</li>
                    <li>Asegúrate de seleccionar la finca correcta antes de guardar</li>
                    {formData.origin === 'Parto' && (
                      <li>La madre es requerida para animales nacidos en la finca</li>
                    )}
                    {formData.origin === 'Compra' && (
                      <li>Se creará automáticamente un registro de egreso en economía</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </form>
    </Modal>
  );
}
