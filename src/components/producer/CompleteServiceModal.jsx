import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { servicesAPI } from '../../api/services';
import { suppliesAPI } from '../../api/supplies';
import Modal from '../common/Modal';

export default function CompleteServiceModal({ service, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplies, setSupplies] = useState([]);

  const [formData, setFormData] = useState({
    fechaReal: new Date().toISOString().split('T')[0],
    notas: '',
    observaciones: ''
  });

  const [selectedSupplies, setSelectedSupplies] = useState([]);
  // Each item: { supplyId, supplyName, quantity, unit }

  useEffect(() => {
    fetchSupplies();
  }, []);

  const fetchSupplies = async () => {
    setLoading(true);
    try {
      // Get supplies for the service's farm
      const farmId = service.farmId;
      if (!farmId) {
        console.warn('No farmId available for fetching supplies');
        setSupplies([]);
        return;
      }

      const response = await suppliesAPI.getSupplies({ farmId });

      // Map backend response fields to frontend expectations
      const mappedSupplies = (response || []).map(supply => ({
        supplyId: supply.id,
        id: supply.id,
        name: supply.name,
        currentStock: supply.currentQuantity,
        currentQuantity: supply.currentQuantity,
        unit: supply.unit,
        category: supply.category
      }));

      setSupplies(mappedSupplies);
    } catch (error) {
      console.error('Error fetching supplies:', error);
      toast.error('Error al cargar los insumos');
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupply = (supply) => {
    if (selectedSupplies.find(s => s.supplyId === supply.supplyId)) {
      toast.error('Este insumo ya está agregado');
      return;
    }

    setSelectedSupplies([
      ...selectedSupplies,
      {
        supplyId: supply.supplyId,
        supplyName: supply.name,
        quantity: 1,
        unit: supply.unit || 'unidad'
      }
    ]);
  };

  const handleRemoveSupply = (supplyId) => {
    setSelectedSupplies(selectedSupplies.filter(s => s.supplyId !== supplyId));
  };

  const handleQuantityChange = (supplyId, newQuantity) => {
    setSelectedSupplies(selectedSupplies.map(s =>
      s.supplyId === supplyId
        ? { ...s, quantity: parseFloat(newQuantity) || 0 }
        : s
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fechaReal) {
      toast.error('Debes ingresar la fecha real de completación');
      return;
    }

    setSubmitting(true);
    try {
      const completionData = {
        fechaReal: formData.fechaReal,
        notas: formData.notas || null,
        observaciones: formData.observaciones || null,
        supplyConsumptions: selectedSupplies.map(s => ({
          supplyId: s.supplyId,
          quantity: s.quantity
        }))
      };

      await servicesAPI.completeService(service.id, completionData);

      toast.success('✅ Servicio completado exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error completing service:', error);
      if (error.response?.status === 400 || error.response?.status === 404) {
        toast.error('No se pudo completar la acción (endpoint pendiente)');
      } else {
        toast.error('Error al completar el servicio');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'Vacunación': '💉',
      'Medicación': '💊',
      'Desparasitación': '🐛',
      'Baño': '🚿',
      'Inseminación': '🧬',
      'Revisión veterinaria': '🩺',
      'Corte de pezuñas': '✂️',
      'Otro': '📋'
    };
    return icons[tipo] || '📋';
  };

  if (!service) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getTipoIcon(service.tipo)}</span>
          <div>
            <div className="text-2xl font-display font-bold" style={{ color: '#3FA79F' }}>
              Completar Servicio
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {service.tipo}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="complete-service-form"
            disabled={submitting || !formData.fechaReal}
            className="px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            style={{ backgroundColor: '#3FA79F', color: 'white' }}
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Completando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completar Servicio
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="complete-service-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Service Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Resumen del Servicio</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Ubicación:</span>
                <p className="font-medium text-gray-900">
                  {service.farmName}
                  {service.divisionName && ` / ${service.divisionName}`}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Animales:</span>
                <p className="font-medium text-gray-900">
                  {service.animalCount || 0} {service.animalCount === 1 ? 'animal' : 'animales'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Fecha programada:</span>
                <p className="font-medium text-gray-900">
                  {service.fechaProgramada
                    ? format(new Date(service.fechaProgramada), 'dd/MM/yyyy', { locale: es })
                    : 'Sin fecha'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Responsables:</span>
                <p className="font-medium text-gray-900">
                  {service.responsables && service.responsables.length > 0
                    ? service.responsables.map(r => r.name).join(', ')
                    : 'Sin asignar'}
                </p>
              </div>
            </div>
            {service.descripcion && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <span className="text-gray-600 text-sm">Descripción original:</span>
                <p className="text-gray-900 text-sm mt-1">{service.descripcion}</p>
              </div>
            )}
          </div>

          {/* Completion Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Detalles de Completación</h3>

            {/* Fecha Real */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Real de Completación *
              </label>
              <input
                type="date"
                value={formData.fechaReal}
                onChange={(e) => setFormData({ ...formData, fechaReal: e.target.value })}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas del Servicio (opcional)
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
                placeholder="Agrega notas sobre cómo se realizó el servicio..."
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones / Incidencias (opcional)
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                placeholder="Registra cualquier observación relevante o incidencia durante el servicio..."
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
          </div>

          {/* Supply Consumption */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Consumo de Insumos</h3>
              <span className="text-xs text-gray-500">Opcional</span>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-800">
                  Registra los insumos utilizados durante el servicio. Las cantidades se descontarán automáticamente del inventario.
                </p>
              </div>
            </div>

            {/* Selected Supplies */}
            {selectedSupplies.length > 0 && (
              <div className="space-y-2">
                {selectedSupplies.map(supply => (
                  <div key={supply.supplyId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{supply.supplyName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={supply.quantity}
                        onChange={(e) => handleQuantityChange(supply.supplyId, e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-600 w-16">{supply.unit}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSupply(supply.supplyId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Supply */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar Insumo
              </label>
              <select
                onChange={(e) => {
                  const supply = supplies.find(s => s.supplyId === parseInt(e.target.value));
                  if (supply) {
                    handleAddSupply(supply);
                    e.target.value = '';
                  }
                }}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              >
                <option value="">Selecciona un insumo...</option>
                {supplies
                  .filter(s => !selectedSupplies.find(ss => ss.supplyId === s.supplyId))
                  .map(supply => (
                    <option key={supply.supplyId} value={supply.supplyId}>
                      {supply.name} ({supply.currentStock} {supply.unit} disponibles)
                    </option>
                  ))}
              </select>
            </div>

            {selectedSupplies.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-green-800">
                    {selectedSupplies.length} {selectedSupplies.length === 1 ? 'insumo seleccionado' : 'insumos seleccionados'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
    </Modal>
  );
}
