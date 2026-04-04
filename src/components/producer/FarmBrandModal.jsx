import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { brandsAPI } from '../../api/brands';
import Modal from '../common/Modal';

export default function FarmBrandModal({ isOpen, onClose, farmId, brand, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', photoUrl: '' });

  const isEditMode = !!brand;

  useEffect(() => {
    if (brand) {
      setFormData({ name: brand.name || '', photoUrl: brand.photoUrl || '' });
    } else {
      setFormData({ name: '', photoUrl: '' });
    }
  }, [brand, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        photoUrl: formData.photoUrl || null,
      };
      if (isEditMode) {
        await brandsAPI.update(farmId, brand.id, payload);
        toast.success('Hierro actualizado');
      } else {
        await brandsAPI.create(farmId, payload);
        toast.success('Hierro registrado');
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || (isEditMode ? 'Error al actualizar' : 'Error al crear');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar Hierro' : 'Registrar Hierro'}
      maxWidth="max-w-md"
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
            form="brand-form"
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#3FA79F' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isEditMode ? 'Guardando...' : 'Registrando...'}
              </>
            ) : isEditMode ? 'Guardar cambios' : 'Registrar hierro'}
          </button>
        </div>
      }
    >
      <form id="brand-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-800">Nombre de referencia *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
            required
            disabled={loading}
            placeholder="Ej: Hierro Principal, Marca Norte"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none text-sm disabled:opacity-50"
            onFocus={e => e.target.style.borderColor = '#3FA79F'}
            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-800">Foto del hierro (URL)</label>
          <input
            type="url"
            value={formData.photoUrl}
            onChange={e => setFormData(f => ({ ...f, photoUrl: e.target.value }))}
            disabled={loading}
            placeholder="https://i.ibb.co/..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none text-sm disabled:opacity-50"
            onFocus={e => e.target.style.borderColor = '#3FA79F'}
            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
          />
          <p className="text-xs text-gray-400">Sube la foto a imgbb.com y pega el enlace directo aquí</p>
        </div>

        {formData.photoUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center h-32">
            <img
              src={formData.photoUrl}
              alt="Vista previa"
              className="h-full object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          Los hierros son marcas de identificación que se aplican en la piel del animal durante la faena de hierra. Cada finca puede tener varios hierros registrados.
        </div>
      </form>
    </Modal>
  );
}
