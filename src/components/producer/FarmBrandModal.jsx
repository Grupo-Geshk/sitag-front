import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { brandsAPI } from '../../api/brands';
import Modal from '../common/Modal';
import PhotoUploadField from './PhotoUploadField';

export default function FarmBrandModal({ isOpen, onClose, brand, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const isEditMode = !!brand;

  useEffect(() => {
    if (brand) {
      setName(brand.name || '');
      setPhotoUrl(brand.photoUrl || '');
    } else {
      setName('');
      setPhotoUrl('');
    }
  }, [brand, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('El nombre es requerido'); return; }
    setLoading(true);
    try {
      const payload = { name: name.trim(), photoUrl: photoUrl || null };
      if (isEditMode) {
        await brandsAPI.update(brand.id, payload);
        toast.success('Hierro actualizado');
      } else {
        await brandsAPI.create(payload);
        toast.success('Hierro registrado');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || (isEditMode ? 'Error al actualizar' : 'Error al crear'));
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
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={loading}
            placeholder="Ej: Hierro Principal, Marca Norte"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none text-sm disabled:opacity-50"
            onFocus={e => e.target.style.borderColor = '#3FA79F'}
            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-800">Foto del hierro</label>
          <PhotoUploadField
            value={photoUrl}
            onChange={setPhotoUrl}
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}
