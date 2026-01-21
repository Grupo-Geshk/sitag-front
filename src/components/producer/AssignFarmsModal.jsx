import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { farmsAPI } from '../../api/farms';
import { workersAPI } from '../../api/workers';
import { getProducerId } from '../../lib/auth';
import Modal from '../common/Modal';

export default function AssignFarmsModal({ worker, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarms, setSelectedFarms] = useState(new Set());
  const [assignToAll, setAssignToAll] = useState(false);

  useEffect(() => {
    fetchFarms();
    if (worker && worker.assignedFarms) {
      setSelectedFarms(new Set(worker.assignedFarms.map(f => f.farmId)));
      setAssignToAll(worker.assignedToAll || false);
    }
  }, [worker]);

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

  const toggleFarm = (farmId) => {
    const newSelection = new Set(selectedFarms);
    if (newSelection.has(farmId)) {
      newSelection.delete(farmId);
    } else {
      newSelection.add(farmId);
    }
    setSelectedFarms(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFarms.size === farms.length) {
      setSelectedFarms(new Set());
    } else {
      setSelectedFarms(new Set(farms.map(f => f.farmId || f.id)));
    }
  };

  const handleAssignToAllChange = (value) => {
    setAssignToAll(value);
    if (value) {
      // If assigning to all, select all farms visually
      setSelectedFarms(new Set(farms.map(f => f.farmId || f.id)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!assignToAll && selectedFarms.size === 0) {
      toast.error('Debes seleccionar al menos una finca o marcar "Asignado a todas las fincas"');
      return;
    }

    setLoading(true);
    try {
      await workersAPI.assignFarms(
        worker.workerId,
        Array.from(selectedFarms),
        assignToAll
      );

      toast.success('Fincas asignadas exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning farms:', error);
      if (error.response?.status === 400 || error.response?.status === 404) {
        toast.error('No se pudo completar la acción (endpoint pendiente)');
      } else {
        toast.error('Error al asignar las fincas');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <div className="text-2xl font-display font-bold" style={{ color: '#3FA79F' }}>
            Asignar Fincas
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {worker?.firstName} {worker?.lastName}
          </p>
        </div>
      }
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="assign-farms-form"
            disabled={loading || (!assignToAll && selectedFarms.size === 0)}
            className="flex-1 px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: '#3FA79F', color: 'white' }}
          >
            {loading ? 'Asignando...' : 'Asignar Fincas'}
          </button>
        </div>
      }
    >
      <form id="assign-farms-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Assign to All Toggle */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={assignToAll}
                onChange={(e) => handleAssignToAllChange(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <div className="flex-1">
                <div className="font-semibold text-blue-900">
                  Asignado a todas las fincas
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Este trabajador tendrá acceso a todas las fincas del productor, incluyendo las que se creen en el futuro.
                </p>
              </div>
            </label>
          </div>

          {/* Farm Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-900">
                Seleccionar Fincas
              </label>
              {!assignToAll && farms.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                  disabled={loading}
                >
                  {selectedFarms.size === farms.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>

            <div className="border-2 border-gray-200 rounded-lg max-h-80 overflow-y-auto">
              {farms.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500">No hay fincas disponibles</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {farms.map(farm => {
                    const farmId = farm.farmId || farm.id;
                    const isSelected = selectedFarms.has(farmId);
                    return (
                      <div
                        key={farmId}
                        onClick={() => !assignToAll && toggleFarm(farmId)}
                        className={`
                          p-4 cursor-pointer transition-colors
                          ${assignToAll ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                          ${isSelected ? 'bg-teal-50' : 'bg-white'}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0
                            ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'}
                          `}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{farm.name}</div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              <span>📍 {farm.location || 'Sin ubicación'}</span>
                              <span>•</span>
                              <span>{farm.type || 'Sin tipo'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedFarms.size > 0 && !assignToAll && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-green-800">
                  {selectedFarms.size} {selectedFarms.size === 1 ? 'finca seleccionada' : 'fincas seleccionadas'}
                </span>
              </div>
            )}
          </div>
        </form>
    </Modal>
  );
}
