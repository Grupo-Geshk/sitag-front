import { useState, useEffect } from 'react';
import { workersAPI } from '../../api/workers';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

export default function WorkerModal({ worker, onClose, onWorkerSaved }) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    assignedFarms: [],
  });

  const workerRoles = [
    { value: 'Administrador de finca', label: 'Administrador de finca', icon: '👔' },
    { value: 'Veterinario', label: 'Veterinario', icon: '🩺' },
    { value: 'Cuidador de animales', label: 'Cuidador de animales', icon: '🐄' },
    { value: 'Ordeñador', label: 'Ordeñador', icon: '🥛' },
    { value: 'Alimentador', label: 'Alimentador', icon: '🌾' },
    { value: 'Mantenimiento', label: 'Mantenimiento', icon: '🔧' },
    { value: 'Conductor', label: 'Conductor', icon: '🚚' },
    { value: 'Auxiliar general', label: 'Auxiliar general', icon: '👷' },
  ];

  useEffect(() => {
    fetchFarms();
    if (worker) {
      setFormData({
        name: worker.name || '',
        position: worker.position || '',
        email: worker.email || '',
        phone: worker.phone || '',
        assignedFarms: worker.assignedFarms?.map(f => f.id) || [],
      });
    }
  }, [worker]);

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

  const handleFarmToggle = (farmId) => {
    setFormData(prev => ({
      ...prev,
      assignedFarms: prev.assignedFarms.includes(farmId)
        ? prev.assignedFarms.filter(id => id !== farmId)
        : [...prev.assignedFarms, farmId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error('Por favor completa los campos obligatorios (Nombre y Teléfono)');
      return;
    }

    if (!worker && formData.assignedFarms.length === 0) {
      toast.error('Por favor asigna al menos una finca');
      return;
    }

    try {
      setLoading(true);

      if (worker) {
        // Update worker
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          position: formData.position || null,
        };

        await workersAPI.updateWorker(worker.id, updateData);

        // Update farm assignments if changed
        if (formData.assignedFarms.length > 0) {
          await workersAPI.assignFarms(worker.id, formData.assignedFarms, false);
        }

        toast.success('Trabajador actualizado exitosamente');
      } else {
        // Create worker - backend requires a single FarmId
        const createData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          position: formData.position || null,
          farmId: formData.assignedFarms[0], // Use first assigned farm
        };

        const newWorker = await workersAPI.createWorker(createData);

        // If multiple farms selected, assign the rest
        if (formData.assignedFarms.length > 1) {
          await workersAPI.assignFarms(
            newWorker.id,
            formData.assignedFarms,
            false
          );
        }

        toast.success('Trabajador creado exitosamente');
      }

      onWorkerSaved();
    } catch (error) {
      console.error('Error saving worker:', error);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(worker ? `Error al actualizar: ${errorMsg}` : `Error al crear: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={worker ? '✏️ Editar Trabajador' : '👷 Crear Trabajador'}
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
            form="worker-form"
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3FA79F' }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : worker ? 'Actualizar trabajador' : 'Crear trabajador'}
          </button>
        </div>
      }
    >
      <form id="worker-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ej: Juan Pérez García"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
            />
          </div>

          {/* Position and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cargo / Posición
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              >
                <option value="">Selecciona un cargo</option>
                {workerRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.icon} {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="300 123 4567"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (opcional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors"
            />
          </div>

          {/* Farm Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar Fincas *
            </label>
            <div className="border-2 border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
              {farms.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No hay fincas disponibles</p>
              ) : (
                <div className="space-y-2">
                  {farms.map(farm => (
                    <label
                      key={farm.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assignedFarms.includes(farm.id)}
                        onChange={() => handleFarmToggle(farm.id)}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded"
                      />
                      <span className="text-sm text-gray-700">{farm.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Selecciona las fincas donde trabajará esta persona
            </p>
          </div>
        </form>
    </Modal>
  );
}
