import { useState } from 'react';
import { animalsAPI } from '../../api/animals';
import { animalEventsAPI } from '../../api/animalEvents';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

export default function HealthStatusModal({ animal, onClose, onStatusChanged }) {
  const [newStatus, setNewStatus] = useState(animal.healthStatus || 'Sano');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const healthStatusOptions = [
    { value: 'Sano', label: 'Sano', color: 'bg-green-100 text-green-800 border-green-300', icon: '✓' },
    { value: 'Enfermo', label: 'Enfermo', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⚠' },
    { value: 'EnTratamiento', label: 'En Tratamiento', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '💊' },
    { value: 'Critico', label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-300', icon: '!' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newStatus === animal.healthStatus) {
      toast.error('El nuevo estado debe ser diferente al actual');
      return;
    }

    try {
      setLoading(true);

      // Update animal health status
      await animalsAPI.updateAnimal(animal.id, {
        healthStatus: newStatus,
      });

      toast.success('Estado sanitario actualizado exitosamente');
      onStatusChanged();
      onClose();
    } catch (error) {
      console.error('Error updating health status:', error);
      toast.error('Error al actualizar el estado sanitario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Cambiar Estado Sanitario"
      maxWidth="max-w-md"
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
            form="health-status-form"
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3FA79F' }}
            disabled={loading || newStatus === animal.healthStatus}
          >
            {loading ? 'Guardando...' : 'Guardar cambio'}
          </button>
        </div>
      }
    >
      {/* Animal Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-gray-200 rounded text-sm font-mono">
              {animal.tagNumber}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{animal.name || 'Sin nombre'}</p>
              <p className="text-sm text-gray-600">{animal.breed}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-600">Estado actual:</p>
            <div className="mt-1">
              {healthStatusOptions.find(option => option.value === (animal.healthStatus || 'Sano')) && (
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${
                    healthStatusOptions.find(option => option.value === (animal.healthStatus || 'Sano'))?.color
                  }`}
                >
                  <span>{healthStatusOptions.find(option => option.value === (animal.healthStatus || 'Sano'))?.icon}</span>
                  {healthStatusOptions.find(option => option.value === (animal.healthStatus || 'Sano'))?.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form id="health-status-form" onSubmit={handleSubmit} className="space-y-4">
          {/* New Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nuevo Estado Sanitario *
            </label>
            <div className="space-y-2">
              {healthStatusOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    newStatus === option.value
                      ? 'border-[#3FA79F] bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="healthStatus"
                    value={option.value}
                    checked={newStatus === option.value}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                  />
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${option.color}`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción / Notas (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              placeholder="Ej: Se observó decaimiento y pérdida de apetito..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Esta información se registrará en el historial de eventos del animal
            </p>
          </div>
        </form>
    </Modal>
  );
}
