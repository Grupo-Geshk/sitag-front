import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { divisionsAPI } from '../../api/divisions';
import Modal from '../common/Modal';

export default function DivisionModal({ isOpen, onClose, farmId, division, onDivisionSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const isEditMode = !!division;

  useEffect(() => {
    if (division) {
      setFormData({
        name: division.name || '',
        description: division.description || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
      });
    }
  }, [division, isOpen]);

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
      if (isEditMode) {
        await divisionsAPI.updateDivision(division.id, formData);
        toast.success('¡División actualizada exitosamente!');
      } else {
        const divisionData = {
          ...formData,
          farmId: parseInt(farmId),
        };
        await divisionsAPI.createDivision(divisionData);
        toast.success('¡División creada exitosamente!');
      }

      onDivisionSaved();
      onClose();

      // Reset form if creating
      if (!isEditMode) {
        setFormData({
          name: '',
          description: '',
        });
      }
    } catch (error) {
      console.error('Division operation error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        (isEditMode ? 'Error al actualizar la división' : 'Error al crear la división');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar División' : 'Agregar Nueva División'}
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
            form="division-form"
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
                {isEditMode ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              <>
                {isEditMode ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Actualizar División
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear División
                  </>
                )}
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="division-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Division Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              Nombre de la División *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Ej: Potrero Norte, Lote 1, Zona A"
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              Descripción (opcional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows="4"
              placeholder="Ej: División para ganado lechero, pastos mejorados, acceso a agua"
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 resize-none"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Acerca de las Divisiones</p>
                <p>Las divisiones (potreros, lotes o separaciones) permiten organizar y rastrear animales dentro de la finca. Puedes asignar animales a cada división y realizar movimientos entre ellas.</p>
              </div>
            </div>
          </div>
        </form>
    </Modal>
  );
}
