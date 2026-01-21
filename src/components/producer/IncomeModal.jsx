import { useState, useEffect } from 'react';
import { transactionsAPI } from '../../api/transactions';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

export default function IncomeModal({ onClose, onIncomeCreated }) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    farmId: '',
  });

  // Categories mapped to backend TransactionCategory enum
  const incomeCategories = [
    { value: 'VentaAnimales', label: 'Venta de animales', icon: '🐄' },
    { value: 'VentaLeche', label: 'Venta de leche', icon: '🥛' },
    { value: 'VentaProductos', label: 'Venta de productos', icon: '🧀' },
    { value: 'Otros', label: 'Otros ingresos', icon: '📈' },
  ];

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category || !formData.amount || !formData.date) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      const producerId = getProducerId();

      if (!formData.farmId) {
        toast.error('Por favor selecciona una finca');
        setLoading(false);
        return;
      }

      // Create ISO date string from date input
      const dateObj = new Date(formData.date);
      const isoDate = dateObj.toISOString();

      const data = {
        farmId: parseInt(formData.farmId, 10),
        type: 'Ingreso',
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: isoDate,
        description: formData.description || '',
        reference: ''
      };

      console.log('=== INCOME TRANSACTION DEBUG ===');
      console.log('ProducerId:', producerId);
      console.log('Form Data:', formData);
      console.log('Category (enum code):', formData.category);
      console.log('Parsed farmId:', parseInt(formData.farmId, 10));
      console.log('Parsed amount:', parseFloat(formData.amount));
      console.log('ISO Date:', isoDate);
      console.log('Final payload being sent:', JSON.stringify(data, null, 2));
      console.log('API URL:', `/productor/${producerId}/economia/transaccion`);

      await transactionsAPI.createTransaction(producerId, data);
      toast.success('Ingreso registrado exitosamente');
      onIncomeCreated();
    } catch (error) {
      console.error('=== ERROR CREATING INCOME ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error message:', error.message);

      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
                          'Error al registrar el ingreso';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="💰 Registrar Ingreso"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="income-form"
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3FA79F' }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar ingreso'}
          </button>
        </div>
      }
    >
      <form id="income-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría de Ingreso *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
            >
              <option value="">Selecciona una categoría</option>
              {incomeCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                $
              </span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
            />
          </div>

          {/* Farm (required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Finca *
            </label>
            <select
              name="farmId"
              value={formData.farmId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
            >
              <option value="">Selecciona una finca</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Ej: Venta de 5 novillos a comprador local..."
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors resize-none"
            />
          </div>
        </form>
    </Modal>
  );
}
