import { useState, useEffect, useMemo } from 'react';
import { transactionsAPI } from '../../api/transactions';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { animalsAPI } from '../../api/animals';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const INCOME_CATEGORIES = [
  { value: 'VentaAnimales', label: 'Venta de animales', requiresAnimalSelection: true },
  { value: 'VentaLeche', label: 'Venta de leche', requiresAnimalSelection: false },
  { value: 'VentaProductos', label: 'Venta de productos', requiresAnimalSelection: false },
  { value: 'Otros', label: 'Otros ingresos', requiresAnimalSelection: false },
];

// ══════════════════════════════════════════════════════════════════════════════
// ANIMAL SELECTOR PANEL
// Renders farm → division → animal browser for VentaAnimales flow
// ══════════════════════════════════════════════════════════════════════════════

function AnimalSelectorPanel({ farms, selectedFarmId, onFarmChange, selectedAnimals, onToggleAnimal }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [animals, setAnimals] = useState([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [animalSearch, setAnimalSearch] = useState('');

  // Load divisions when farm changes
  useEffect(() => {
    if (!selectedFarmId) {
      setDivisions([]);
      setSelectedDivisionId('');
      setAnimals([]);
      return;
    }
    setLoadingDivisions(true);
    setSelectedDivisionId('');
    setAnimals([]);
    divisionsAPI.getDivisionsByFarm(selectedFarmId)
      .then(d => setDivisions(Array.isArray(d) ? d : []))
      .catch(() => setDivisions([]))
      .finally(() => setLoadingDivisions(false));
  }, [selectedFarmId]);

  // Load animals when farm or division changes
  useEffect(() => {
    if (!selectedFarmId) return;
    setLoadingAnimals(true);
    const params = { farmId: selectedFarmId, pageSize: 200, status: 'Activo' };
    if (selectedDivisionId) params.divisionId = selectedDivisionId;
    animalsAPI.getAnimals(params)
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.items ?? []);
        setAnimals(list);
      })
      .catch(() => setAnimals([]))
      .finally(() => setLoadingAnimals(false));
  }, [selectedFarmId, selectedDivisionId]);

  const filteredAnimals = useMemo(() => {
    if (!animalSearch.trim()) return animals;
    const q = animalSearch.toLowerCase();
    return animals.filter(a =>
      a.tagNumber?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q)
    );
  }, [animals, animalSearch]);

  const allVisibleSelected = filteredAnimals.length > 0 &&
    filteredAnimals.every(a => selectedAnimals.some(s => s.id === a.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      const ids = new Set(filteredAnimals.map(a => a.id));
      onToggleAnimal(selectedAnimals.filter(s => !ids.has(s.id)), 'replace');
    } else {
      // Add all visible that are not selected
      const existing = new Set(selectedAnimals.map(s => s.id));
      const toAdd = filteredAnimals.filter(a => !existing.has(a.id));
      onToggleAnimal([...selectedAnimals, ...toAdd], 'replace');
    }
  };

  return (
    <div className="space-y-3">
      {/* Farm selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Finca <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedFarmId}
          onChange={e => onFarmChange(e.target.value)}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
        >
          <option value="">Selecciona una finca</option>
          {farms.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Division selector */}
      {selectedFarmId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            División <span className="text-gray-400 font-normal">(opcional — filtra los animales)</span>
          </label>
          <select
            value={selectedDivisionId}
            onChange={e => setSelectedDivisionId(e.target.value)}
            disabled={loadingDivisions}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors disabled:opacity-50"
          >
            <option value="">Todas las divisiones</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Animal browser */}
      {selectedFarmId && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Animales a vender
              {selectedAnimals.length > 0 && (
                <span
                  className="ml-2 px-2 py-0.5 text-xs font-semibold text-white rounded-full"
                  style={{ backgroundColor: '#3FA79F' }}
                >
                  {selectedAnimals.length} seleccionado{selectedAnimals.length !== 1 ? 's' : ''}
                </span>
              )}
            </label>
            {filteredAnimals.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium transition-colors"
                style={{ color: '#3FA79F' }}
              >
                {allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={animalSearch}
              onChange={e => setAnimalSearch(e.target.value)}
              placeholder="Buscar por arete o nombre…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F]"
            />
          </div>

          {/* Animal list */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {loadingAnimals ? (
              <div className="py-6 text-center text-sm text-gray-400">Cargando animales…</div>
            ) : filteredAnimals.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500">
                  {animals.length === 0
                    ? 'No hay animales activos en esta finca'
                    : 'Sin coincidencias para la búsqueda'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-44 overflow-y-auto">
                {filteredAnimals.map(animal => {
                  const isSelected = selectedAnimals.some(s => s.id === animal.id);
                  return (
                    <label
                      key={animal.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            onToggleAnimal(selectedAnimals.filter(s => s.id !== animal.id), 'replace');
                          } else {
                            onToggleAnimal([...selectedAnimals, animal], 'replace');
                          }
                        }}
                        className="w-4 h-4 rounded accent-teal-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-mono font-semibold text-gray-900">
                          #{animal.tagNumber}
                        </span>
                        {animal.name && (
                          <span className="text-sm text-gray-500 ml-2">{animal.name}</span>
                        )}
                      </div>
                      {animal.breed && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{animal.breed}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SALE CONFIRMATION STEP
// Shown before submitting a VentaAnimales transaction
// ══════════════════════════════════════════════════════════════════════════════

function SaleConfirmation({ selectedAnimals, amount, onBack, onConfirm, loading }) {
  return (
    <div className="space-y-5">
      {/* Alert banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">Confirma la venta de animales</p>
            <p className="text-sm text-red-700 leading-relaxed">
              Al confirmar, los animales seleccionados serán marcados como <strong>vendidos</strong> y
              dejarán de aparecer en tu listado activo del hato. Sus datos históricos
              — eventos, movimientos y registros — seguirán disponibles si filtras
              por animales inactivos en la sección de Animales.
            </p>
            <p className="text-sm font-semibold text-red-800 mt-2">
              Esta acción es irreversible.
            </p>
          </div>
        </div>
      </div>

      {/* Animal list */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Animales incluidos en esta venta ({selectedAnimals.length}):
        </p>
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto">
          {selectedAnimals.map(animal => (
            <div key={animal.id} className="flex items-center gap-3 px-3 py-2.5">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-mono font-semibold text-gray-900">#{animal.tagNumber}</span>
              {animal.name && <span className="text-sm text-gray-500">{animal.name}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Amount summary */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Valor total de la venta:</span>
        <span className="text-base font-bold text-gray-900">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#3FA79F' }}
          onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#368D86')}
          onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#3FA79F')}
        >
          {loading ? 'Procesando…' : 'Confirmar venta'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════

// Build DD/MM/YYYY display from a Date object
function todayDisplay() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
}

// Description placeholder by category
const DESC_PLACEHOLDERS = {
  VentaAnimales:  'Ej: Venta de 3 novillos a comprador local, precio acordado…',
  VentaLeche:     'Ej: Venta de leche del mes a cooperativa El Campo, 500 litros…',
  VentaProductos: 'Ej: Venta de queso artesanal, 20 kg a $5 c/u…',
  Otros:          'Ej: Subsidio agropecuario, alquiler de potreros a tercero…',
};

export default function IncomeModal({ onClose, onIncomeCreated }) {
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [dateDisplay, setDateDisplay] = useState(todayDisplay);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    farmId: '',
  });
  const [selectedAnimals, setSelectedAnimals] = useState([]);

  const isVentaAnimales = formData.category === 'VentaAnimales';

  useEffect(() => {
    farmsAPI.getAllFarms()
      .then(d => setFarms(Array.isArray(d) ? d : []))
      .catch(() => setFarms([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Reset farm-dependent state when category changes
    if (name === 'category') {
      setSelectedAnimals([]);
      setFormData(prev => ({ ...prev, [name]: value, farmId: '' }));
    }
  };

  const handleFarmChange = (farmId) => {
    setFormData(prev => ({ ...prev, farmId }));
    setSelectedAnimals([]);
  };

  // Numeric date input: only digits, auto-insert slashes → DD/MM/YYYY
  const handleDateInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    } else if (digits.length > 2) {
      formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    }
    setDateDisplay(formatted);
    if (digits.length === 8) {
      const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
      setFormData(prev => ({ ...prev, date: iso }));
    } else {
      setFormData(prev => ({ ...prev, date: '' }));
    }
  };

  const handleToggleAnimal = (newList) => {
    setSelectedAnimals(newList);
  };

  // Validate before showing confirmation or submitting
  const validate = () => {
    if (!formData.category) { toast.error('Selecciona una categoría de ingreso'); return false; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { toast.error('Ingresa un monto válido'); return false; }
    if (!formData.date) { toast.error('Ingresa una fecha válida (DD/MM/AAAA)'); return false; }
    return true;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (isVentaAnimales) {
      // Show confirmation step (even without animals selected — producer may just record the income)
      setStep('confirm');
    } else {
      submitTransaction();
    }
  };

  const submitTransaction = async () => {
    setLoading(true);
    try {
      await transactionsAPI.createTransaction({
        type: 'Ingreso',
        categoryName: formData.category,
        amount: parseFloat(formData.amount),
        txnDate: new Date(formData.date + 'T12:00:00').toISOString(),
        farmId: formData.farmId,
        description: formData.description || null,
      });

      // For animal sale: mark each selected animal as sold
      if (isVentaAnimales && selectedAnimals.length > 0) {
        const closeResults = await Promise.allSettled(
          selectedAnimals.map(animal =>
            animalsAPI.closeAnimal(animal.id, { outcome: 'Vendido' })
          )
        );
        const failed = closeResults.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          toast.error(`Ingreso registrado, pero ${failed} animal(es) no pudieron ser marcados como vendidos. Actualiza su estado manualmente.`);
        } else {
          toast.success(`Venta registrada — ${selectedAnimals.length} animal(es) marcado(s) como vendidos`);
        }
      } else {
        toast.success('Ingreso registrado exitosamente');
      }

      onIncomeCreated();
    } catch (err) {
      console.error('Error creating income:', err);
      toast.error(err.response?.data?.message || 'Error al registrar el ingreso');
    } finally {
      setLoading(false);
    }
  };

  const isConfirmStep = step === 'confirm';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isConfirmStep ? 'Confirmar Venta de Animales' : 'Registrar Ingreso'}
      maxWidth="max-w-2xl"
      footer={
        isConfirmStep ? null : (
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" form="income-form" disabled={loading}
              className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#3FA79F' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#368D86')}
              onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#3FA79F')}
            >
              {loading ? 'Guardando…' : isVentaAnimales ? 'Revisar venta →' : 'Guardar ingreso'}
            </button>
          </div>
        )
      }
    >
      {isConfirmStep ? (
        <SaleConfirmation
          selectedAnimals={selectedAnimals}
          amount={parseFloat(formData.amount) || 0}
          onBack={() => setStep('form')}
          onConfirm={submitTransaction}
          loading={loading}
        />
      ) : (
        <form id="income-form" onSubmit={handleFormSubmit} className="space-y-4">

          {/* Categoría — dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm bg-white"
            >
              <option value="">Selecciona una categoría…</option>
              {INCOME_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              placeholder={DESC_PLACEHOLDERS[formData.category] || 'Ej: Detalle del ingreso…'}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors resize-none text-sm"
            />
          </div>

          {/* Animal selector para VentaAnimales */}
          {isVentaAnimales && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4">
              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
                Selección de animales a vender
              </p>
              <AnimalSelectorPanel
                farms={farms}
                selectedFarmId={formData.farmId}
                onFarmChange={handleFarmChange}
                selectedAnimals={selectedAnimals}
                onToggleAnimal={handleToggleAnimal}
              />
            </div>
          )}

          {/* Finca — para categorías que no son VentaAnimales */}
          {!isVentaAnimales && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Finca
              </label>
              <select
                name="farmId"
                value={formData.farmId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm bg-white"
              >
                <option value="">Ingreso general de la ganadería</option>
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {/* Monto + Fecha en la misma fila */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Monto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">$</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dateDisplay}
                onChange={handleDateInput}
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm"
              />
            </div>
          </div>

        </form>
      )}
    </Modal>
  );
}
