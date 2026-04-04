import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { servicesAPI } from '../../api/services';
import { animalEventsAPI } from '../../api/animalEvents';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import { workersAPI } from '../../api/workers';
import { suppliesAPI } from '../../api/supplies';
import { brandsAPI } from '../../api/brands';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

// Medication sub-types shown when "Aplicar medicación" is selected
const MED_SUBTYPES = [
  {
    value: 'Vacunacion',
    label: 'Vacunación',
    serviceType: 'Vacunacion',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    value: 'Desparasitacion',
    label: 'Desparasitación',
    serviceType: 'Desparasitacion',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    value: 'Vitaminacion',
    label: 'Vitaminación',
    serviceType: 'Medicacion',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    value: 'Antibiotico',
    label: 'Antibiótico',
    serviceType: 'Medicacion',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// Secondary procedure types
const PROCEDURE_TYPES = [
  {
    value: 'Banio',
    label: 'Baño',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm7 4c-1.5 0-2.5 1-2.5 2.5 0 2 2.5 5 2.5 5s2.5-3 2.5-5C14.5 8 13.5 7 12 7z" />
      </svg>
    ),
  },
  {
    value: 'Alimentacion',
    label: 'Alimentación',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'Inseminacion',
    label: 'Inseminación',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    value: 'Pesaje',
    label: 'Pesaje',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    value: 'Herrado',
    label: 'Herrado',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    value: 'Otros',
    label: 'Otro',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function ServiceModal({
  service,
  onClose,
  onSuccess,
  presetTipo        = null,
  presetFarmId      = null,
  presetDivisionId  = null,
  presetAnimalId    = null,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Service Details
  const [tipo, setTipo] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [serviceStatus, setServiceStatus] = useState('Completado');
  const [tipoCustom, setTipoCustom] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());

  // Medication sub-type selection (used when tipo === 'AplicarMedicacion')
  const [selectedMedTypes, setSelectedMedTypes] = useState(new Set());
  // Per-med-type supply slots: { 'Vacunacion': [{supplyId:'', quantity:''}], ... }
  const [supplyByMedType, setSupplyByMedType] = useState({});

  // Step 2: Animal Selection
  const [farms, setFarms] = useState([]);
  const [workerFarmFilter, setWorkerFarmFilter] = useState('');
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);
  const [animalsInLocation, setAnimalsInLocation] = useState([]);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 3: Supply Consumption (for non-medication service types)
  const [supplies, setSupplies] = useState([]);
  const [selectedSupplies, setSelectedSupplies] = useState([]);

  // Lot cache: supplyId → lots array (shared across all slots)
  const [lotCache, setLotCache] = useState({});

  // Herrado — brand selection
  const [farmBrands, setFarmBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [brandedAt, setBrandedAt] = useState(new Date().toISOString().split('T')[0]);

  // Workers
  const [workers, setWorkers] = useState([]);

  // Service types that require supply step
  const supplyConsumingTypes = ['AplicarMedicacion', 'Vacunacion', 'Medicacion', 'Desparasitacion', 'Banio', 'Sangria', 'Alimentacion'];

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
    } else {
      if (presetTipo) {
        // Map old medication types to new AplicarMedicacion mode
        if (['Vacunacion', 'Desparasitacion'].includes(presetTipo)) {
          setTipo('AplicarMedicacion');
          setSelectedMedTypes(new Set([presetTipo]));
          setSupplyByMedType({ [presetTipo]: [{ supplyId: '', quantity: '' }] });
        } else if (presetTipo === 'Medicacion') {
          setTipo('AplicarMedicacion');
        } else {
          setTipo(presetTipo);
        }
      }
      if (presetFarmId)     setSelectedFarmId(presetFarmId);
      if (presetDivisionId) setSelectedDivisionId(presetDivisionId);
    }
  }, [service]);

  useEffect(() => {
    if (selectedFarmId) {
      fetchDivisions(selectedFarmId);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    if (supplyConsumingTypes.includes(tipo)) {
      fetchSupplies();
    }
  }, [tipo]);

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

  const fetchSupplies = async () => {
    try {
      const suppliesData = await suppliesAPI.getSupplies();
      const list = Array.isArray(suppliesData) ? suppliesData : (suppliesData?.items ?? []);
      setSupplies(list.filter(s => s.currentQuantity > 0));
    } catch (error) {
      console.error('Error fetching supplies:', error);
      toast.error('Error al cargar los insumos');
    }
  };

  const handleContinueToAnimals = async () => {
    if (!tipo) {
      toast.error('Debes seleccionar un tipo de servicio');
      return;
    }
    if (tipo === 'AplicarMedicacion' && selectedMedTypes.size === 0) {
      toast.error('Debes seleccionar al menos un tipo de medicación');
      return;
    }
    if (tipo === 'Otros' && !tipoCustom) {
      toast.error('Debes especificar el tipo de servicio');
      return;
    }
    if (!selectedFarmId) {
      toast.error('Debes seleccionar una finca');
      return;
    }
    if (tipo === 'Pesaje' && (!weightKg || parseFloat(weightKg) <= 0)) {
      toast.error('Debes ingresar el peso registrado');
      return;
    }

    setLoading(true);
    try {
      const filters = { farmId: selectedFarmId, status: 'Activo', pageSize: 100 };
      if (selectedDivisionId) filters.divisionId = selectedDivisionId;

      const response = await animalsAPI.getAnimals(filters);
      const animalsList = response.items || [];
      setAnimalsInLocation(animalsList);

      if (presetAnimalId) {
        setSelectedAnimalIds(new Set([presetAnimalId]));
        setSelectAll(false);
      } else {
        setSelectedAnimalIds(new Set(animalsList.map(a => a.id)));
        setSelectAll(true);
      }

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
    if (supplyConsumingTypes.includes(tipo) || tipo === 'Herrado') {
      if (tipo === 'Herrado' && selectedFarmId) {
        brandsAPI.getByFarm(selectedFarmId).then(data => setFarmBrands(Array.isArray(data) ? data : [])).catch(() => {});
      }
      setStep(3);
    } else {
      handleSubmit();
    }
  };

  const toggleWorker = (workerId) => {
    const next = new Set(selectedWorkers);
    if (next.has(workerId)) next.delete(workerId); else next.add(workerId);
    setSelectedWorkers(next);
  };

  const toggleAnimal = (animalId) => {
    const next = new Set(selectedAnimalIds);
    if (next.has(animalId)) next.delete(animalId); else next.add(animalId);
    setSelectedAnimalIds(next);
    setSelectAll(next.size === animalsInLocation.length && animalsInLocation.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedAnimalIds(new Set());
    } else {
      setSelectedAnimalIds(new Set(animalsInLocation.map(a => a.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleMedType = (medType) => {
    const next = new Set(selectedMedTypes);
    if (next.has(medType)) {
      next.delete(medType);
    } else {
      next.add(medType);
      setSupplyByMedType(prev => prev[medType] ? prev : { ...prev, [medType]: [{ supplyId: '', quantity: '' }] });
    }
    setSelectedMedTypes(next);
  };

  const addSupplyForMedType = (medType) => {
    setSupplyByMedType(prev => ({
      ...prev,
      [medType]: [...(prev[medType] || []), { supplyId: '', lotId: '', quantity: '', useAll: false }],
    }));
  };

  const removeSupplyForMedType = (medType, index) => {
    setSupplyByMedType(prev => ({
      ...prev,
      [medType]: prev[medType].filter((_, i) => i !== index),
    }));
  };

  const _unused = (medType, index, field, value) => {
    // replaced by updateSupplyForMedType defined below
    void medType; void index; void field; void value;
  };

  // Load lots for a supply (cached)
  const loadLots = async (supplyId) => {
    if (!supplyId || lotCache[supplyId] !== undefined) return;
    setLotCache(prev => ({ ...prev, [supplyId]: null })); // null = loading
    try {
      const data = await suppliesAPI.getLots(supplyId);
      setLotCache(prev => ({ ...prev, [supplyId]: (data || []).filter(l => l.status !== 'Agotado') }));
    } catch {
      setLotCache(prev => ({ ...prev, [supplyId]: [] }));
    }
  };

  const addSupply = () => setSelectedSupplies([...selectedSupplies, { supplyId: '', lotId: '', quantity: '', useAll: false, notes: '' }]);
  const removeSupply = (index) => setSelectedSupplies(selectedSupplies.filter((_, i) => i !== index));
  const updateSupply = (index, field, value) => {
    setSelectedSupplies(prev => {
      const updated = prev.map((s, i) => i === index ? { ...s, [field]: value } : s);
      // When supply changes, reset lot selection and pre-load lots
      if (field === 'supplyId') {
        updated[index] = { ...updated[index], lotId: '', useAll: false, quantity: '' };
        if (value) loadLots(value);
      }
      // When "use all" toggled on, set quantity to lot's remaining
      if (field === 'useAll' && value) {
        const lotId = prev[index].lotId;
        const lots  = lotCache[prev[index].supplyId] || [];
        const lot   = lots.find(l => l.id === lotId);
        if (lot) updated[index].quantity = String(lot.currentQuantity);
      }
      return updated;
    });
  };

  const updateSupplyForMedType = (medType, index, field, value) => {
    setSupplyByMedType(prev => {
      const arr = [...(prev[medType] || [])];
      arr[index] = { ...arr[index], [field]: value };
      if (field === 'supplyId') {
        arr[index] = { ...arr[index], lotId: '', useAll: false, quantity: '' };
        if (value) loadLots(value);
      }
      if (field === 'useAll' && value) {
        const lotId = (prev[medType] || [])[index]?.lotId;
        const lots  = lotCache[(prev[medType] || [])[index]?.supplyId] || [];
        const lot   = lots.find(l => l.id === lotId);
        if (lot) arr[index].quantity = String(lot.currentQuantity);
      }
      return { ...prev, [medType]: arr };
    });
  };

  const calculateAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  };

  const handleSubmit = async () => {
    if (selectedAnimalIds.size === 0) {
      toast.error('Debes seleccionar al menos un animal');
      return;
    }

    // Validate stock for per-med-type supplies
    if (tipo === 'AplicarMedicacion' && step === 3) {
      for (const medType of selectedMedTypes) {
        for (const sel of (supplyByMedType[medType] || [])) {
          if (!sel.supplyId || !sel.quantity) continue;
          const supply = supplies.find(s => s.id === sel.supplyId);
          if (supply && parseFloat(sel.quantity) > supply.currentQuantity) {
            const sub = MED_SUBTYPES.find(s => s.value === medType);
            toast.error(`${sub?.label}: La cantidad de ${supply.name} excede el stock disponible (${supply.currentQuantity})`);
            return;
          }
        }
      }
    }

    // Validate stock for legacy supplies
    if (supplyConsumingTypes.includes(tipo) && tipo !== 'AplicarMedicacion' && step === 3) {
      for (const sel of selectedSupplies) {
        const supply = supplies.find(s => s.id === sel.supplyId);
        if (supply && parseFloat(sel.quantity) > supply.currentQuantity) {
          toast.error(`La cantidad de ${supply.name} excede el stock disponible (${supply.currentQuantity})`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // === Multi-service path (AplicarMedicacion) ===
      if (tipo === 'AplicarMedicacion' && !service) {
        let totalServices = 0;
        for (const medType of selectedMedTypes) {
          const sub = MED_SUBTYPES.find(s => s.value === medType);
          const serviceData = {
            serviceType: sub.serviceType,
            scheduledDate: new Date(serviceDate).toISOString(),
            notes: descripcion ? `${sub.label}: ${descripcion}` : sub.label,
            farmId: selectedFarmId,
            divisionId: selectedDivisionId || null,
            workerId: [...selectedWorkers][0] ?? null,
            animalIds: Array.from(selectedAnimalIds),
          };
          const created = await servicesAPI.createService(serviceData);
          if (serviceStatus === 'Completado') {
            await servicesAPI.completeService(created.id).catch(e => console.warn('completeService:', e));
          }
          const typeSupplies = (supplyByMedType[medType] || []).filter(s => s.supplyId && parseFloat(s.quantity) > 0);
          for (const s of typeSupplies) {
            await servicesAPI.addConsumption(created.id, {
              supplyId: s.supplyId,
              quantity: parseFloat(s.quantity),
              lotId: s.lotId || null,
            });
          }
          totalServices++;
        }
        const statusMsg = serviceStatus === 'Pendiente' ? ' (Pendiente)' : '';
        toast.success(`${totalServices} servicio(s) registrado(s) para ${selectedAnimalIds.size} ${selectedAnimalIds.size === 1 ? 'animal' : 'animales'}.${statusMsg}`);
        onSuccess();
        onClose();
        return;
      }

      // === Single-service path ===
      const serviceData = {
        serviceType: tipo === 'Otros' ? tipoCustom : tipo,
        scheduledDate: new Date(serviceDate).toISOString(),
        notes: descripcion || null,
        farmId: selectedFarmId,
        divisionId: selectedDivisionId || null,
        workerId: [...selectedWorkers][0] ?? null,
        animalIds: Array.from(selectedAnimalIds),
      };

      let savedServiceId;
      if (service) {
        await servicesAPI.updateService(service.id, serviceData);
        savedServiceId = service.id;
        toast.success('Servicio actualizado exitosamente');
      } else {
        const created = await servicesAPI.createService(serviceData);
        savedServiceId = created.id;
        if (serviceStatus === 'Completado') {
          await servicesAPI.completeService(savedServiceId).catch(err =>
            console.warn('completeService failed (non-fatal):', err)
          );
        }
      }

      // Herrado → assign brand to each selected animal
      if (!service && tipo === 'Herrado' && selectedBrandId) {
        const brandedAtIso = brandedAt ? new Date(brandedAt).toISOString() : new Date(serviceDate).toISOString();
        for (const animalId of selectedAnimalIds) {
          await animalsAPI.assignBrand(animalId, { brandId: selectedBrandId, brandedAt: brandedAtIso });
        }
      }

      // Pesaje → create RegistroPeso events
      if (!service && tipo === 'Pesaje' && weightKg && parseFloat(weightKg) > 0) {
        const eventDate = new Date(serviceDate).toISOString();
        const weight = parseFloat(weightKg);
        for (const animalId of selectedAnimalIds) {
          await animalEventsAPI.createEvent({
            animalId, eventType: 'RegistroPeso', eventDate, amount: weight,
            description: descripcion || null,
          });
        }
      }

      // Supply consumptions (legacy single-service types)
      if (!service && supplyConsumingTypes.includes(tipo) && tipo !== 'AplicarMedicacion') {
        const validSupplies = selectedSupplies.filter(s => s.supplyId && parseFloat(s.quantity) > 0);
        for (const s of validSupplies) {
          await servicesAPI.addConsumption(savedServiceId, {
            supplyId: s.supplyId,
            quantity: parseFloat(s.quantity),
            lotId: s.lotId || null,
          });
        }
        const supplyMsg = validSupplies.length > 0 ? ` ${validSupplies.length} insumo(s) consumido(s).` : '';
        const statusMsg = serviceStatus === 'Pendiente' ? ' (Pendiente)' : '';
        toast.success(`Servicio registrado para ${selectedAnimalIds.size} ${selectedAnimalIds.size === 1 ? 'animal' : 'animales'}.${supplyMsg}${statusMsg}`);
      } else if (!service) {
        const statusMsg = serviceStatus === 'Pendiente' ? ' (Pendiente)' : '';
        toast.success(`Servicio registrado para ${selectedAnimalIds.size} ${selectedAnimalIds.size === 1 ? 'animal' : 'animales'}.${statusMsg}`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error(error.response?.data?.message || 'Error al guardar el servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceLabel = () => {
    if (tipo === 'AplicarMedicacion') {
      const labels = [...selectedMedTypes].map(t => MED_SUBTYPES.find(s => s.value === t)?.label).filter(Boolean);
      return labels.length > 0 ? `Medicación: ${labels.join(', ')}` : 'Aplicar medicación';
    }
    if (tipo === 'Otros') return tipoCustom;
    return PROCEDURE_TYPES.find(t => t.value === tipo)?.label || tipo;
  };

  const getStepTitle = () => {
    if (step === 1) return 'Paso 1: Detalles del servicio';
    if (step === 2) return 'Paso 2: Selecciona los animales';
    if (step === 3) {
      if (tipo === 'AplicarMedicacion') return 'Paso 3: Insumos por tipo de medicación (opcional)';
      if (tipo === 'Herrado') return 'Paso 3: Selecciona el hierro (opcional)';
      return 'Paso 3: Insumos consumidos (opcional)';
    }
    return '';
  };

  const filteredAnimals = animalsInLocation.filter(animal => {
    const q = searchQuery.toLowerCase();
    return animal.tagNumber.toLowerCase().includes(q) || (animal.name && animal.name.toLowerCase().includes(q));
  });

  const step1Valid = tipo &&
    (tipo !== 'AplicarMedicacion' || selectedMedTypes.size > 0) &&
    (tipo !== 'Otros' || tipoCustom) &&
    serviceDate &&
    selectedWorkers.size > 0 &&
    selectedFarmId &&
    (tipo !== 'Pesaje' || (weightKg && parseFloat(weightKg) > 0));

  const renderLots = (lots, selectedLotId, onSelectLot, unit) => {
    if (lots === null) return <p className="text-xs text-gray-500 mt-2">Cargando lotes...</p>;
    if (!lots || lots.length === 0) return (
      <p className="text-xs text-gray-400 italic mt-2">Sin lotes registrados — se descuenta del stock general</p>
    );
    const now = new Date();
    return (
      <div className="mt-2 space-y-1.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Elegir lote (opcional)</p>
        <button type="button" onClick={() => onSelectLot('')}
          className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
            !selectedLotId ? 'border-teal-500 bg-teal-50 text-teal-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Sin lote específico (stock general)
        </button>
        {lots.map(lot => {
          const pct = lot.initialQuantity > 0 ? (lot.currentQuantity / lot.initialQuantity) * 100 : 0;
          const selected = selectedLotId === lot.id;
          const expDate = lot.expirationDate ? new Date(lot.expirationDate) : null;
          const daysToExp = expDate ? Math.ceil((expDate - now) / 86400000) : null;
          const barColor = pct > 50 ? 'bg-teal-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-400';
          return (
            <button type="button" key={lot.id} onClick={() => onSelectLot(lot.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                selected ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    lot.status === 'EnUso' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                  }`}>{lot.status === 'EnUso' ? 'En stock (abierto)' : 'En stock'}</span>
                  {lot.supplier && <span className="text-xs text-gray-400">{lot.supplier}</span>}
                  {daysToExp !== null && daysToExp <= 30 && daysToExp > 0 && (
                    <span className="text-xs text-orange-600 font-medium">⚠ Vence en {daysToExp}d</span>
                  )}
                  {daysToExp !== null && daysToExp <= 0 && (
                    <span className="text-xs text-red-600 font-medium">⚠ Vencido</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap ml-2">
                  {lot.currentQuantity} {unit}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    );
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
              disabled={!step1Valid || loading}
              className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
            >
              {loading ? 'Cargando...' : 'Continuar →'}
            </button>
          ) : step === 2 ? (
            <button
              onClick={handleContinueToSupplies}
              disabled={selectedAnimalIds.size === 0 || submitting}
              className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#3FA79F', color: 'white' }}
            >
              {(supplyConsumingTypes.includes(tipo) || tipo === 'Herrado') ? 'Continuar →' : 'Registrar Servicio'}
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </>
              ) : 'Registrar Servicio'}
            </button>
          )}
        </div>
      }
    >
      {step === 1 ? (
        /* ── STEP 1 ── */
        <div className="space-y-6">

          {/* Primary action: Aplicar medicación */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Tipo de Servicio *</label>

            {/* Main medication card */}
            <button
              type="button"
              onClick={() => { setTipo('AplicarMedicacion'); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 transition-all text-left ${
                tipo === 'AplicarMedicacion'
                  ? 'border-teal-500 bg-teal-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                tipo === 'AplicarMedicacion' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${tipo === 'AplicarMedicacion' ? 'text-teal-900' : 'text-gray-900'}`}>
                  Aplicar medicación
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Vacunación, desparasitación, vitaminas, antibióticos
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                tipo === 'AplicarMedicacion' ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
              }`}>
                {tipo === 'AplicarMedicacion' && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* Medication sub-type checkboxes */}
            {tipo === 'AplicarMedicacion' && (
              <div className="ml-4 pl-4 border-l-2 border-teal-200 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Selecciona los tipos de aplicación
                </p>
                {MED_SUBTYPES.map(sub => {
                  const checked = selectedMedTypes.has(sub.value);
                  return (
                    <label
                      key={sub.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        checked
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-teal-50/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          checked ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                        }`}
                        onClick={() => toggleMedType(sub.value)}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div onClick={() => toggleMedType(sub.value)} className={`flex items-center gap-2 flex-1 ${checked ? 'text-teal-800' : 'text-gray-700'}`}>
                        {sub.icon}
                        <span className="font-medium text-sm">{sub.label}</span>
                      </div>
                    </label>
                  );
                })}
                {selectedMedTypes.size === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Selecciona al menos un tipo de aplicación para continuar
                  </p>
                )}
              </div>
            )}

            {/* Secondary procedures */}
            <div>
              <div className="flex items-center gap-2 mb-2 mt-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Otros procedimientos</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PROCEDURE_TYPES.map(proc => (
                  <button
                    key={proc.value}
                    type="button"
                    onClick={() => { setTipo(proc.value); setSelectedMedTypes(new Set()); }}
                    className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all ${
                      tipo === proc.value
                        ? 'border-teal-500 bg-teal-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                    }`}
                  >
                    <span className={tipo === proc.value ? 'text-teal-600' : 'text-gray-500'}>
                      {proc.icon}
                    </span>
                    <span className={`text-xs font-semibold text-center leading-tight ${tipo === proc.value ? 'text-teal-900' : 'text-gray-700'}`}>
                      {proc.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Type for Otros */}
          {tipo === 'Otros' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Especifica el tipo *</label>
              <input
                type="text"
                value={tipoCustom}
                onChange={(e) => setTipoCustom(e.target.value)}
                placeholder="Ej: Limpieza de instalaciones"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Weight — Pesaje only */}
          {tipo === 'Pesaje' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Peso registrado (kg) *</label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Ej: 320.5"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">kg</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Este valor actualizará el peso actual de cada animal seleccionado.</p>
            </div>
          )}

          {/* Service Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha del Servicio *</label>
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
            <label className="block text-sm font-semibold text-gray-900 mb-2">Descripción / Notas (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Agrega detalles adicionales sobre el servicio..."
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Workers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900">Responsable(s) <span className="text-gray-400 font-normal">(opcional)</span></label>
              <select
                value={workerFarmFilter}
                onChange={e => setWorkerFarmFilter(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-200 rounded-md text-gray-600 focus:outline-none focus:border-[#3FA79F] transition-colors"
              >
                <option value="">Todos los trabajadores</option>
                {farms.map(farm => (
                  <option key={farm.id || farm.farmId} value={farm.id || farm.farmId}>{farm.name}</option>
                ))}
              </select>
            </div>
            <div className="border-2 border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {workers.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No hay trabajadores activos disponibles</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {workers.filter(w =>
                    !workerFarmFilter ||
                    (Array.isArray(w.assignedFarmIds) && w.assignedFarmIds.includes(workerFarmFilter))
                  ).map(worker => {
                    const isSelected = selectedWorkers.has(worker.id);
                    return (
                      <div
                        key={worker.id}
                        onClick={() => toggleWorker(worker.id)}
                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-teal-50' : 'bg-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{worker.name}</div>
                            <div className="text-sm text-gray-600">{worker.roleLabel}</div>
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

          {/* Location */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ubicación del servicio</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Indica dónde se realizó el servicio. Esto determina qué animales están disponibles para seleccionar.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Finca *</label>
                <select
                  value={selectedFarmId || ''}
                  onChange={(e) => { setSelectedFarmId(e.target.value || null); setSelectedDivisionId(null); }}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecciona una finca...</option>
                  {farms.map(farm => (
                    <option key={farm.id || farm.farmId} value={farm.id || farm.farmId}>{farm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">División (opcional)</label>
                <select
                  value={selectedDivisionId || ''}
                  onChange={(e) => setSelectedDivisionId(e.target.value || null)}
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

          {/* Service status */}
          {!service && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Estado al registrar</label>
              <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setServiceStatus('Completado')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    serviceStatus === 'Completado' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={serviceStatus === 'Completado' ? { backgroundColor: '#3FA79F' } : {}}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Completado
                </button>
                <button
                  type="button"
                  onClick={() => setServiceStatus('Pendiente')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all border-l-2 border-gray-200 flex items-center justify-center gap-2 ${
                    serviceStatus === 'Pendiente' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pendiente
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {serviceStatus === 'Completado'
                  ? 'El servicio ya fue ejecutado y quedará cerrado.'
                  : 'El servicio está programado pero aún no se ha ejecutado.'}
              </p>
            </div>
          )}

          {/* Requirements hint */}
          {!step1Valid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium mb-1">Para continuar, completa:</p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                {!tipo && <li>Selecciona un tipo de servicio</li>}
                {tipo === 'AplicarMedicacion' && selectedMedTypes.size === 0 && <li>Selecciona al menos un tipo de medicación</li>}
                {tipo === 'Otros' && !tipoCustom && <li>Especifica el tipo de servicio personalizado</li>}
                {tipo === 'Pesaje' && (!weightKg || parseFloat(weightKg) <= 0) && <li>Ingresa el peso registrado</li>}
                {!serviceDate && <li>Selecciona la fecha del servicio</li>}
                {!selectedFarmId && <li>Selecciona una finca</li>}
              </ul>
            </div>
          )}
        </div>

      ) : step === 2 ? (
        /* ── STEP 2 ── */
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-teal-900">Resumen del Servicio</p>
            </div>
            <div className="space-y-1 text-sm text-gray-900">
              <div><span className="font-semibold">Tipo:</span> {getServiceLabel()}</div>
              <div><span className="font-semibold">Ubicación:</span> {farms.find(f => (f.id || f.farmId) === selectedFarmId)?.name}{selectedDivisionId && ` / ${divisions.find(d => d.id === selectedDivisionId)?.name}`}</div>
              <div><span className="font-semibold">Responsables:</span> {workers.filter(w => selectedWorkers.has(w.id)).map(w => w.name).join(', ')}</div>
            </div>
          </div>

          {/* Animals list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Animales en la Ubicación ({animalsInLocation.length})
              </h3>
            </div>

            {animalsInLocation.length > 0 && (
              <>
                <div onClick={toggleSelectAll} className="border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectAll ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}`}>
                      {selectAll && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">Seleccionar todos ({animalsInLocation.length})</span>
                  </div>
                </div>

                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredAnimals.map(animal => {
                    const isSelected = selectedAnimalIds.has(animal.id);
                    return (
                      <div
                        key={animal.id}
                        onClick={() => toggleAnimal(animal.id)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 flex-shrink-0 ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}`}>
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
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={animal.sex === 'Hembra' ? 'M12 2a7 7 0 100 14A7 7 0 0012 2zM12 16v6M9 19h6' : 'M12 2a7 7 0 100 14A7 7 0 0012 2zM16 6l4-4M16 2h4v4'} />
                                </svg>
                                {animal.sex}
                              </span>
                              <span>{animal.breed}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                                animal.healthStatus === 'Sano' ? 'bg-green-50 border-green-200 text-green-800' :
                                animal.healthStatus === 'Enfermo' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                animal.healthStatus === 'Critico' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                              }`}>
                                {animal.healthStatus || 'Sano'}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay animales en esta ubicación</h3>
                <p className="text-gray-600">La ubicación seleccionada no tiene animales activos registrados.</p>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ── STEP 3 ── */
        <div className="space-y-6">
          {tipo === 'Herrado' ? (
            /* Brand picker for herrado service */
            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">Asignar hierro a los animales</p>
                <p className="text-xs text-gray-700">
                  Selecciona el hierro que se aplicó. Esto quedará registrado en el perfil de cada animal seleccionado. Es opcional — puedes omitir si solo quieres registrar la faena.
                </p>
              </div>

              {farmBrands.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">Esta finca no tiene hierros registrados.</p>
                  <p className="text-xs text-gray-400 mt-1">Puedes registrarlos en el detalle de la finca.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">Hierro aplicado</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {farmBrands.map(b => {
                      const isSelected = selectedBrandId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBrandId(isSelected ? '' : b.id)}
                          className={`relative border-2 rounded-lg overflow-hidden text-left transition-all ${isSelected ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          {b.photoUrl ? (
                            <div className="h-16 bg-gray-50 flex items-center justify-center">
                              <img src={b.photoUrl} alt={b.name} className="h-full w-full object-contain p-1" onError={e => { e.target.style.display = 'none'; }} />
                            </div>
                          ) : (
                            <div className="h-16 bg-amber-50 flex items-center justify-center">
                              <svg className="w-7 h-7 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                              </svg>
                            </div>
                          )}
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-medium text-gray-800 truncate">{b.name}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBrandId && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-900">Fecha de la hierra</label>
                  <input
                    type="date"
                    value={brandedAt}
                    onChange={e => setBrandedAt(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}
            </div>
          ) : tipo === 'AplicarMedicacion' ? (
            /* Per-medication-type supply sections */
            <>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">Insumos por tipo de medicación</p>
                <p className="text-xs text-gray-700">
                  Registra los insumos utilizados en cada tipo. Las cantidades se deducirán del inventario. Es opcional — puedes omitir si no deseas registrar el consumo.
                </p>
              </div>

              {[...selectedMedTypes].map(medType => {
                const sub = MED_SUBTYPES.find(s => s.value === medType);
                const typeSupplies = supplyByMedType[medType] || [];
                return (
                  <div key={medType} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    {/* Section header */}
                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                      <span className="text-teal-600">{sub?.icon}</span>
                      <h4 className="font-semibold text-gray-900">{sub?.label}</h4>
                      <span className="text-xs text-gray-500 ml-auto">{sub?.serviceType}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {typeSupplies.map((sel, index) => (
                        <div key={index} className="space-y-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Insumo</label>
                              <select
                                value={sel.supplyId}
                                onChange={(e) => updateSupplyForMedType(medType, index, 'supplyId', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              >
                                <option value="">Selecciona un insumo...</option>
                                {supplies.map(supply => (
                                  <option key={supply.id} value={supply.id}>
                                    {supply.name} (Stock: {supply.currentQuantity} {supply.unit})
                                  </option>
                                ))}
                              </select>
                              {sel.supplyId && renderLots(
                                lotCache[sel.supplyId],
                                sel.lotId,
                                (lotId) => updateSupplyForMedType(medType, index, 'lotId', lotId),
                                supplies.find(s => s.id === sel.supplyId)?.unit ?? ''
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSupplyForMedType(medType, index)}
                              className="mt-6 text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-end gap-3">
                            <div className="w-32 flex-shrink-0">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                              <input
                                type="number"
                                value={sel.quantity}
                                onChange={(e) => updateSupplyForMedType(medType, index, 'quantity', e.target.value)}
                                min="0.01" step="0.01"
                                placeholder="0.00"
                                disabled={!!sel.useAll}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                              />
                            </div>
                            {sel.lotId && (
                              <label className="flex items-center gap-1.5 cursor-pointer pb-2">
                                <input
                                  type="checkbox"
                                  checked={!!sel.useAll}
                                  onChange={(e) => updateSupplyForMedType(medType, index, 'useAll', e.target.checked)}
                                  className="w-4 h-4 accent-teal-600"
                                />
                                <span className="text-xs text-gray-600">Usar todo lo que queda</span>
                              </label>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addSupplyForMedType(medType)}
                        className="w-full py-2 border border-dashed border-teal-300 rounded-lg text-teal-600 text-sm font-medium hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar insumo para {sub?.label}
                      </button>
                    </div>
                  </div>
                );
              })}

              {supplies.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No hay insumos con stock disponible. Registra una compra en el módulo de Insumos para agregar stock.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Legacy flat supply list for non-medication types */
            <>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Insumos consumidos en este servicio</p>
                <p className="text-xs text-gray-700">
                  Registra los insumos utilizados. Las cantidades se deducirán automáticamente del inventario al guardar.
                </p>
              </div>

              {selectedSupplies.map((sel, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">Insumo #{index + 1}</h4>
                    <button type="button" onClick={() => removeSupply(index)} className="text-red-600 hover:text-red-800 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Insumo *</label>
                    <select
                      value={sel.supplyId}
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
                    {sel.supplyId && renderLots(
                      lotCache[sel.supplyId],
                      sel.lotId,
                      (lotId) => updateSupply(index, 'lotId', lotId),
                      supplies.find(s => s.id === sel.supplyId)?.unit ?? ''
                    )}
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-800 mb-2">Cantidad *</label>
                      <input
                        type="number" value={sel.quantity}
                        onChange={(e) => updateSupply(index, 'quantity', e.target.value)}
                        min="0.01" step="0.01" placeholder="0.00"
                        disabled={!!sel.useAll}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>
                    {sel.lotId && (
                      <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                        <input
                          type="checkbox"
                          checked={!!sel.useAll}
                          onChange={(e) => updateSupply(index, 'useAll', e.target.checked)}
                          className="w-4 h-4 accent-teal-600"
                        />
                        <span className="text-sm text-gray-600">Usar todo lo que queda</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Notas (opcional)</label>
                    <input
                      type="text" value={sel.notes}
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
                    No hay insumos con stock disponible en el catálogo. Registra una compra en el módulo de Insumos para agregar stock.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
