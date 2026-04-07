import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { divisionsAPI } from '../../api/divisions';
import Modal from '../common/Modal';

function calcAge(birthDate) {
  if (!birthDate) return '—';
  const birth = new Date(birthDate + 'T00:00:00');
  if (isNaN(birth)) return '—';
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 1) return '<1m';
  if (months < 24) return `${months}m`;
  return `${Math.floor(months / 12)}a`;
}

export default function DivisionDetailModal({
  isOpen,
  onClose,
  division,
  animals = [],
  farmId,
  onDivisionRenamed,
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [editName, setEditName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (division) {
      setEditName(division.name || '');
      setIsEditing(false);
    }
  }, [division, isOpen]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const divisionAnimals = animals.filter(
    (a) => a.divisionId === division?.id && a.status !== 'Muerto'
  );

  const handleRename = async () => {
    if (!editName.trim() || editName.trim() === division?.name?.trim()) {
      setIsEditing(false);
      setEditName(division?.name || '');
      return;
    }
    setSaving(true);
    try {
      await divisionsAPI.updateDivision(division.id, {
        name: editName.trim(),
        maxCapacity: division.maxCapacity ?? null,
      });
      toast.success('División renombrada');
      setIsEditing(false);
      onDivisionRenamed?.();
    } catch {
      toast.error('Error al renombrar la división');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(division?.name || '');
    }
  };

  const handleVerAnimales = () => {
    onClose();
    navigate(`/producer/animales?divisionId=${division.id}&farmId=${farmId}`);
  };

  if (!division) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de División"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleVerAnimales}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all hover:brightness-95"
            style={{ backgroundColor: '#3FA79F' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Ver animales de la división
          </button>
        </div>
      }
    >
      <div className="space-y-5">

        {/* Description */}
        <p className="text-xs text-gray-400 leading-relaxed">
          Puedes editar el nombre haciendo clic en el ícono de lápiz junto al título. Para ver los animales asignados, consulta la tabla de abajo o usa el botón <span className="font-medium text-gray-500">Ver animales de la división</span> para explorarlos con todos los filtros disponibles.
        </p>

        {/* Name — inline editor */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={saving}
                className="text-xl font-bold text-gray-900 px-2 py-1 border-b-2 bg-transparent focus:outline-none disabled:opacity-50 transition-colors flex-1 min-w-0"
                style={{ borderColor: '#3FA79F' }}
              />
              <button
                type="button"
                onClick={handleRename}
                disabled={saving || !editName.trim()}
                title="Confirmar nombre"
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95"
                style={{ backgroundColor: '#3FA79F' }}
              >
                {saving ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{editName}</h2>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Editar nombre"
                className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Animals table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Animales en esta división</p>
            <span className="text-xs text-gray-400 font-medium">
              {divisionAnimals.length} {divisionAnimals.length === 1 ? 'animal' : 'animales'}
            </span>
          </div>

          {divisionAnimals.length === 0 ? (
            <div className="bg-gray-50 rounded-lg border border-gray-100 py-8 text-center">
              <p className="text-sm text-gray-400">Sin animales asignados a esta división</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      N° / Nombre
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Sexo
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Edad
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {divisionAnimals.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => { onClose(); navigate(`/producer/animales/${a.id}`); }}
                    >
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">
                          {a.tagNumber ? `#${a.tagNumber}` : '—'}
                        </span>
                        {a.name && (
                          <span className="text-gray-400 ml-1.5 text-xs">{a.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.sex === 'Macho'
                              ? 'bg-blue-50 text-blue-700'
                              : a.sex === 'Hembra'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {a.sex || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {calcAge(a.birthDate)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: '#3FA79F' }}
                        >
                          Ver
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
