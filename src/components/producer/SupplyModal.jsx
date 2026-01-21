import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { suppliesAPI } from '../../api/supplies';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function SupplyModal({ isOpen, onClose, onSupplyCreated, supply = null }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [farms, setFarms] = useState([]);
  const isEditMode = !!supply;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    currentQuantity: '',
    minStockLevel: '',
    maxStockReference: '',
    unit: 'Unidad',
    farmId: '',
    supplier: '',
    unitCost: '',
    batchNumber: '',
    expirationDate: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchFarms();

      // If editing, populate form with existing data
      if (supply) {
        setFormData({
          name: supply.name || '',
          category: supply.category || '',
          currentQuantity: supply.currentQuantity?.toString() || '0',
          minStockLevel: supply.minStockLevel?.toString() || '',
          maxStockReference: supply.maxStockReference?.toString() || '',
          unit: supply.unit || 'Unidad',
          farmId: supply.farmId?.toString() || '',
          supplier: supply.supplier || '',
          unitCost: supply.unitCost?.toString() || '',
          batchNumber: supply.batchNumber || '',
          expirationDate: supply.expirationDate ? supply.expirationDate.split('T')[0] : '',
        });
      } else {
        // Reset form for create mode
        setFormData({
          name: '',
          category: '',
          currentQuantity: '',
          minStockLevel: '',
          maxStockReference: '',
          unit: 'Unidad',
          farmId: '',
          supplier: '',
          unitCost: '',
          batchNumber: '',
          expirationDate: '',
        });
      }
    }
  }, [isOpen, supply]);

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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es obligatoria';
    }

    if (!isEditMode) {
      if (!formData.currentQuantity || parseFloat(formData.currentQuantity) < 0) {
        newErrors.currentQuantity = 'La cantidad inicial debe ser mayor o igual a 0';
      }
    }

    if (!formData.minStockLevel || parseFloat(formData.minStockLevel) < 0) {
      newErrors.minStockLevel = 'El stock mínimo es obligatorio';
    }

    if (formData.maxStockReference && parseFloat(formData.maxStockReference) < 0) {
      newErrors.maxStockReference = 'El stock máximo no puede ser negativo';
    }

    if (!formData.unit) {
      newErrors.unit = 'Debes seleccionar una unidad de medida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        // Update existing supply
        const payload = {
          name: formData.name.trim(),
          category: formData.category,
          minStockLevel: parseFloat(formData.minStockLevel),
          maxStockReference: formData.maxStockReference ? parseFloat(formData.maxStockReference) : null,
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
          supplier: formData.supplier || null,
          batchNumber: formData.batchNumber || null,
          expirationDate: formData.expirationDate || null,
          farmId: formData.farmId ? parseInt(formData.farmId) : null,
        };

        await suppliesAPI.updateSupply(supply.id, payload);
        toast.success('Insumo actualizado exitosamente');
      } else {
        // Create new supply
        const payload = {
          name: formData.name.trim(),
          category: formData.category,
          currentQuantity: parseFloat(formData.currentQuantity),
          minStockLevel: parseFloat(formData.minStockLevel),
          maxStockReference: formData.maxStockReference ? parseFloat(formData.maxStockReference) : null,
          unit: formData.unit,
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
          supplier: formData.supplier || null,
          batchNumber: formData.batchNumber || null,
          expirationDate: formData.expirationDate || null,
          farmId: formData.farmId ? parseInt(formData.farmId) : null,
        };

        await suppliesAPI.createSupply(payload);
        toast.success('Insumo creado exitosamente');
      }

      onSupplyCreated();
      onClose();
    } catch (error) {
      console.error('Error saving supply:', error);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const unitTypes = [
    { value: 'Unidad', label: 'Unidad' },
    { value: 'Litro', label: 'Litro' },
    { value: 'Mililitro', label: 'Mililitro' },
    { value: 'Gramo', label: 'Gramo' },
    { value: 'Kilogramo', label: 'Kilogramo' },
  ];

  const categoryOptions = [
    { value: 'Alimento', label: 'Alimento' },
    { value: 'Medicamento', label: 'Medicamento' },
    { value: 'Vacuna', label: 'Vacuna' },
    { value: 'Fertilizante', label: 'Fertilizante' },
    { value: 'Otro', label: 'Otro' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar Insumo' : 'Crear Nuevo Insumo'}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: '#3FA79F', color: 'white' }}
            onMouseEnter={(e) => !submitting && (e.target.style.backgroundColor = '#368D86')}
            onMouseLeave={(e) => !submitting && (e.target.style.backgroundColor = '#3FA79F')}
          >
            {submitting ? (isEditMode ? 'Actualizando...' : 'Creando...') : (isEditMode ? 'Actualizar' : 'Crear Insumo')}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Información Básica</h3>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del Insumo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Ivermectina 1%"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Category and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar categoría...</option>
                {categoryOptions.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Ubicación / Finca
              </label>
              <select
                value={formData.farmId}
                onChange={(e) => handleChange('farmId', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Sin ubicación específica</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Opcional - para referencia de ubicación</p>
            </div>
          </div>
        </div>

        {/* Inventory Levels */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Niveles de Inventario</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cantidad Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.currentQuantity}
                  onChange={(e) => handleChange('currentQuantity', e.target.value)}
                  placeholder="0"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.currentQuantity ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.currentQuantity && <p className="text-xs text-red-600 mt-1">{errors.currentQuantity}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Stock Mínimo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minStockLevel}
                onChange={(e) => handleChange('minStockLevel', e.target.value)}
                placeholder="10"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.minStockLevel ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.minStockLevel && <p className="text-xs text-red-600 mt-1">{errors.minStockLevel}</p>}
              <p className="text-xs text-gray-500 mt-1">Umbral para alertas de stock bajo</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Stock Máximo (Ref.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.maxStockReference}
                onChange={(e) => handleChange('maxStockReference', e.target.value)}
                placeholder="100"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.maxStockReference ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.maxStockReference && <p className="text-xs text-red-600 mt-1">{errors.maxStockReference}</p>}
              <p className="text-xs text-gray-500 mt-1">Opcional - solo para referencia</p>
            </div>
          </div>

          {/* Unit */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Unidad de Medida <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.unit ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {unitTypes.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
              {errors.unit && <p className="text-xs text-red-600 mt-1">{errors.unit}</p>}
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Información Adicional</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Proveedor
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleChange('supplier', e.target.value)}
                placeholder="Nombre del proveedor"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Costo Unitario
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost}
                onChange={(e) => handleChange('unitCost', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Número de Lote
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => handleChange('batchNumber', e.target.value)}
                placeholder="Ej: LOT-2024-001"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={formData.expirationDate}
                onChange={(e) => handleChange('expirationDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Info Message */}
        {!isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-800">
              El insumo se crea a nivel de productor. La ubicación es opcional y solo sirve como referencia.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
