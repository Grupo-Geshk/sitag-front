import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { animalsAPI } from '../../api/animals';
import { brandsAPI } from '../../api/brands';
import BreedCombobox from './BreedCombobox';
import PhotoUploadField from './PhotoUploadField';

// ── Helpers ────────────────────────────────────────────────────────────────────
function toDateInputValue(raw) {
  if (!raw) return '';
  // Backend returns DateOnly as "YYYY-MM-DD" or ISO string — take first 10 chars
  return String(raw).slice(0, 10);
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ReadonlyBadge({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
      <span className="ml-auto text-xs text-gray-400 italic">Solo lectura</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EditAnimalModal({ isOpen, onClose, animal, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [farmBrands, setFarmBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [brandedAt, setBrandedAt] = useState('');

  // Populate form whenever the modal opens or the animal changes
  useEffect(() => {
    if (!isOpen || !animal) return;
    setForm({
      name:      animal.name      || '',
      breed:     animal.breed     || '',
      color:     animal.color     || '',
      sex:       animal.sex       || 'Hembra',
      birthDate: toDateInputValue(animal.birthDate),
      motherRef: animal.motherRef || '',
      fatherRef: animal.fatherRef || '',
      photoUrl:  animal.photoUrl  || '',
    });
    setSelectedBrandId(animal.brandId || '');
    setBrandedAt(animal.brandedAt ? String(animal.brandedAt).slice(0, 10) : '');
    brandsAPI.getAll().then(data => setFarmBrands(Array.isArray(data) ? data : [])).catch(() => {});
  }, [isOpen, animal]);

  if (!isOpen || !animal) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await animalsAPI.updateAnimal(animal.id, {
        name:       form.name.trim()      || null,
        breed:      form.breed.trim()     || null,
        sex:        form.sex,
        birthDate:  form.birthDate        || null,
        weight:     animal.currentWeight  ?? null,
        farmId:     animal.farmId,
        divisionId: animal.divisionId     ?? null,
        color:      form.color?.trim()     || null,
        photoUrl:   form.photoUrl?.trim() || null,
        motherRef:  form.motherRef.trim() || null,
        fatherRef:  form.fatherRef.trim() || null,
      });

      // Assign brand if changed
      const brandChanged = selectedBrandId !== (animal.brandId || '');
      const brandedAtChanged = brandedAt !== (animal.brandedAt ? String(animal.brandedAt).slice(0, 10) : '');
      if (brandChanged || brandedAtChanged) {
        await animalsAPI.assignBrand(animal.id, {
          brandId: selectedBrandId || null,
          brandedAt: brandedAt ? new Date(brandedAt + 'T12:00:00').toISOString() : null,
        });
      }

      toast.success('Datos del animal actualizados');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] transition-colors bg-white';

  // Linked parent display (set at creation, immutable FKs)
  const linkedMotherLabel = animal.motherTagNumber
    ? `#${animal.motherTagNumber}${animal.motherName ? ` · ${animal.motherName}` : ''}`
    : null;
  const linkedFatherLabel = animal.fatherTagNumber
    ? `#${animal.fatherTagNumber}${animal.fatherName ? ` · ${animal.fatherName}` : ''}`
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar datos del animal</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">Arete #{animal.tagNumber}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Identificación ── */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Identificación</p>
            <div className="space-y-3">
              {/* Tag number — read-only */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-xs text-gray-500 flex-shrink-0">Número de arete:</span>
                <span className="font-mono font-semibold text-gray-900 text-sm">{animal.tagNumber}</span>
                <span className="ml-auto text-xs text-gray-400 italic">No editable</span>
              </div>

              <Field label="Nombre">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ej: Lucía, Toro Rey…"
                  className={inputClass}
                  maxLength={100}
                />
              </Field>

              <Field label="Raza">
                <BreedCombobox
                  value={form.breed}
                  onChange={(val) => setForm(prev => ({ ...prev, breed: val }))}
                />
              </Field>
            </div>
          </section>

          {/* ── Datos físicos ── */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Datos físicos</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sexo">
                  <select
                    name="sex"
                    value={form.sex}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="Hembra">Hembra</option>
                    <option value="Macho">Macho</option>
                  </select>
                </Field>

                <Field
                  label="Fecha de nacimiento"
                  hint={form.birthDate ? undefined : 'Deja vacío si se desconoce'}
                >
                  <input
                    type="date"
                    name="birthDate"
                    value={form.birthDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Color / Pelaje">
                <input
                  type="text"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="Ej: Negro, Pinto, Colorado, Blanco…"
                  className={inputClass}
                  maxLength={100}
                />
              </Field>
            </div>
          </section>

          {/* ── Genealogía ── */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Genealogía</p>
            <div className="space-y-3">

              {/* Mother */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Madre</p>
                {linkedMotherLabel ? (
                  <div className="space-y-2">
                    <ReadonlyBadge label="Vinculada" value={linkedMotherLabel} />
                    <Field label="Referencia externa de la madre"
                      hint="Para registros externos al sistema (ej. animal de otra finca)">
                      <input
                        type="text"
                        name="motherRef"
                        value={form.motherRef}
                        onChange={handleChange}
                        placeholder="Ref. externa o arete de finca de origen…"
                        className={inputClass}
                        maxLength={200}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field label="Referencia de la madre"
                    hint="Número de arete u otra referencia de la madre">
                    <input
                      type="text"
                      name="motherRef"
                      value={form.motherRef}
                      onChange={handleChange}
                      placeholder="Ej: Arete #1234 (Finca El Monte)…"
                      className={inputClass}
                      maxLength={200}
                    />
                  </Field>
                )}
              </div>

              {/* Father */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Padre</p>
                {linkedFatherLabel ? (
                  <div className="space-y-2">
                    <ReadonlyBadge label="Vinculado" value={linkedFatherLabel} />
                    <Field label="Referencia externa del padre"
                      hint="Para registros externos al sistema">
                      <input
                        type="text"
                        name="fatherRef"
                        value={form.fatherRef}
                        onChange={handleChange}
                        placeholder="Ref. externa o nombre del semental…"
                        className={inputClass}
                        maxLength={200}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field label="Referencia del padre"
                    hint="Nombre del semental u otra referencia del padre">
                    <input
                      type="text"
                      name="fatherRef"
                      value={form.fatherRef}
                      onChange={handleChange}
                      placeholder="Ej: Semental Éxito (Registro ANAGAN)…"
                      className={inputClass}
                      maxLength={200}
                    />
                  </Field>
                )}
              </div>
            </div>
          </section>

          {/* ── Foto ── */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Foto</p>
            <PhotoUploadField
              value={form.photoUrl}
              onChange={url => setForm(prev => ({ ...prev, photoUrl: url }))}
              disabled={saving}
            />
          </section>

          {/* ── Hierro ── */}
          {farmBrands.length > 0 && (
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hierro</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { setSelectedBrandId(''); setBrandedAt(''); }}
                  className={`border-2 rounded-lg p-2 text-center text-xs transition-all ${!selectedBrandId ? 'border-amber-500 bg-amber-50 font-semibold text-amber-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  Sin hierro
                </button>
                {farmBrands.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrandId(b.id)}
                    className={`relative border-2 rounded-lg overflow-hidden text-left transition-all ${selectedBrandId === b.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {b.photoUrl ? (
                      <div className="h-10 bg-gray-50 flex items-center justify-center">
                        <img src={b.photoUrl} alt={b.name} className="h-full w-full object-contain p-0.5" onError={e => { e.target.style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div className="h-10 bg-amber-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                        </svg>
                      </div>
                    )}
                    <p className="px-1.5 py-1 text-xs font-medium text-gray-800 truncate">{b.name}</p>
                  </button>
                ))}
              </div>
              {selectedBrandId && (
                <Field label="Fecha de la hierra">
                  <input
                    type="date"
                    value={brandedAt}
                    onChange={e => setBrandedAt(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={inputClass}
                  />
                </Field>
              )}
            </section>
          )}

          {/* ── Info note about immutable fields ── */}
          <div className="flex items-start gap-2.5 px-3 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Para cambiar la <strong>ubicación</strong> (finca / división) usa el módulo de Movimientos.
              El <strong>número de arete</strong> y los <strong>vínculos de genealogía</strong> (animales del sistema) no pueden modificarse una vez creado el animal.
            </p>
          </div>

        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-animal-form"
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1A6B64' }}
            onMouseEnter={e => !saving && (e.currentTarget.style.backgroundColor = '#155a54')}
            onMouseLeave={e => !saving && (e.currentTarget.style.backgroundColor = '#1A6B64')}
            onClick={handleSubmit}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando…
              </>
            ) : 'Guardar cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
