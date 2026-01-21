import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function FarmModal({ isOpen, onClose, onFarmCreated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: 'Leche',
    tenancy: 'Propia',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const producerId = getProducerId();
      if (!producerId) {
        toast.error('No se pudo obtener el ID del productor');
        return;
      }

      const farmData = {
        ...formData,
        producerId: parseInt(producerId),
      };

      await farmsAPI.createFarm(farmData);
      toast.success('¡Finca creada exitosamente!');
      onFarmCreated();
      onClose();

      // Reset form
      setFormData({
        name: '',
        location: '',
        type: 'Leche',
        tenancy: 'Propia',
      });
    } catch (error) {
      console.error('Create farm error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        'Error al crear la finca';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Nueva Finca"
      maxWidth="max-w-2xl"
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
            form="farm-form"
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
                Creando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Finca
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="farm-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Farm Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            Nombre de la Finca *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Ej: Finca El Paraíso"
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
            style={{ borderColor: '#E2E8F0' }}
            onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
            onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800">
            Ubicación *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Ej: Valle del Cauca, Colombia"
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
            style={{ borderColor: '#E2E8F0' }}
            onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
            onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
          />
        </div>

        {/* Farm Type & Tenancy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Farm Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              Tipo de Finca *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            >
              <option value="Leche">Leche</option>
              <option value="Carne">Carne</option>
              <option value="Mixto">Mixto</option>
            </select>
            <p className="text-xs text-gray-500">Propósito principal de la finca</p>
          </div>

          {/* Tenancy */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              Tipo de Propiedad *
            </label>
            <select
              name="tenancy"
              value={formData.tenancy}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            >
              <option value="Propia">Propia</option>
              <option value="NoPoseida">Arrendada</option>
            </select>
            <p className="text-xs text-gray-500">Propiedad u arrendamiento</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información</p>
              <p>Una vez creada la finca, podrás agregar divisiones, animales, trabajadores y más desde la vista de detalle.</p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
