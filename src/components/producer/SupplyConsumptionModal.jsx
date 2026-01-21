import { useState, useEffect } from 'react';
import { suppliesAPI } from '../../api/supplies';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

export default function SupplyConsumptionModal({ onClose, onConsumptionSaved }) {
  const [loading, setLoading] = useState(false);
  const [supplies, setSupplies] = useState([]);
  const [farms, setFarms] = useState([]);

  const [formData, setFormData] = useState({
    supplyId: '',
    quantity: '',
    unit: '',
    farmId: '',
    movementDate: new Date().toISOString().split('T')[0],
    reason: '',
    reference: '',
  });

  const usageReasons = [
    { value: 'Alimentación animal', label: 'Alimentación animal', icon: '🌾' },
    { value: 'Tratamiento veterinario', label: 'Tratamiento veterinario', icon: '💉' },
    { value: 'Limpieza y desinfección', label: 'Limpieza y desinfección', icon: '🧹' },
    { value: 'Mantenimiento de instalaciones', label: 'Mantenimiento de instalaciones', icon: '🔧' },
    { value: 'Otro', label: 'Otro', icon: '📦' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchSuppliesForFarm = async (farmId) => {
    if (!farmId) {
      setSupplies([]);
      return;
    }
    try {
      const suppliesData = await suppliesAPI.getSupplies({ farmId: parseInt(farmId) });
      setSupplies(suppliesData || []);
    } catch (error) {
      console.error('Error fetching supplies:', error);
      setSupplies([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Fetch supplies when farm is selected
    if (name === 'farmId') {
      fetchSuppliesForFarm(value);
    }

    if (name === 'supplyId' && value) {
      const selectedSupply = supplies.find(s => s.id === parseInt(value));
      if (selectedSupply) {
        setFormData(prev => ({ ...prev, unit: selectedSupply.unit }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.farmId) {
      toast.error('Por favor selecciona una finca');
      return;
    }

    if (!formData.supplyId || !formData.quantity || !formData.movementDate) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      const data = {
        supplyId: parseInt(formData.supplyId),
        farmId: parseInt(formData.farmId),
        quantity: parseFloat(formData.quantity),
        movementDate: formData.movementDate,
        reason: formData.reason || null,
        reference: formData.reference || null,
      };

      await suppliesAPI.registerConsumption(data);
      toast.success('Consumo registrado exitosamente');
      onConsumptionSaved();
    } catch (error) {
      console.error('Error registering consumption:', error);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(`Error al registrar consumo: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="📤 Registrar Consumo"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="supply-consumption-form"
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50"
            style={{ backgroundColor: '#3FA79F' }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Registrar consumo'}
          </button>
        </div>
      }
    >
      <form id="supply-consumption-form" onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Finca *</label>
            <select
              name="farmId"
              value={formData.farmId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F]"
            >
              <option value="">Selecciona una finca</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insumo *</label>
            <select
              name="supplyId"
              value={formData.supplyId}
              onChange={handleChange}
              required
              disabled={!formData.farmId}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {formData.farmId ? 'Selecciona un insumo' : 'Primero selecciona una finca'}
              </option>
              {supplies.map(supply => (
                <option key={supply.id} value={supply.id}>
                  {supply.name} ({supply.unit}) - Stock: {supply.currentQuantity}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad consumida *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unidad</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                readOnly
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de consumo *</label>
            <input
              type="date"
              name="movementDate"
              value={formData.movementDate}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Utilizado para (opcional)</label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F]"
            >
              <option value="">Selecciona un uso</option>
              {usageReasons.map(reason => (
                <option key={reason.value} value={reason.value}>
                  {reason.icon} {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Referencia / Notas (opcional)</label>
            <textarea
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              rows="3"
              placeholder="Ej: Usado para alimentación de becerros, Servicio #123..."
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] resize-none"
            />
          </div>
        </form>
    </Modal>
  );
}
