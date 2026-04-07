import { useState, useEffect, useRef, useCallback } from 'react';
import { suppliesAPI } from '../../api/supplies';
import { farmsAPI } from '../../api/farms';
import { transactionsAPI } from '../../api/transactions';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import SupplyModal from './SupplyModal';
import DateInput from '../ui/DateInput';

const TODAY = new Date().toISOString().split('T')[0];

// ─── Inline searchable supply selector ───────────────────────────────────────
function SupplySearchSelect({ supplies, value, onChange, onCreateNew }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  const selected = supplies.find(s => s.id === value);
  const filtered = query.trim()
    ? supplies.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : supplies;

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open && selected) setQuery('');
  }, [value, selected, open]);

  const select = s => { onChange(s.id); setQuery(''); setOpen(false); };
  const handleInputChange = e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(''); };
  const displayValue = open ? query : (selected?.name ?? '');

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => { setQuery(''); setOpen(true); }}
        placeholder="Buscar insumo por nombre…"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-center space-y-2">
              <p className="text-sm text-gray-500">
                {query ? `Sin resultados para "${query}"` : 'No hay insumos en el catálogo'}
              </p>
              <button type="button" onClick={() => { setOpen(false); onCreateNew(query); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear nuevo insumo
              </button>
            </div>
          ) : (
            <>
              {filtered.map(s => (
                <button key={s.id} type="button" onClick={() => select(s)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-teal-50 flex items-center justify-between border-b border-gray-50 last:border-0 ${s.id === value ? 'bg-teal-50' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.category ?? '—'} · Stock: {s.currentQuantity} {s.unit}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">{s.unit}</span>
                </button>
              ))}
              <button type="button" onClick={() => { setOpen(false); onCreateNew(query); }}
                className="w-full text-left px-3 py-2.5 border-t border-gray-100 flex items-center gap-2 text-teal-700 hover:bg-teal-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">Crear nuevo insumo</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ step }) {
  const labels = ['Lote', 'Costo'];
  return (
    <div className="flex items-center gap-2 mb-5">
      {labels.map((label, i) => {
        const s = i + 1;
        const done    = step > s;
        const current = step === s;
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done || current ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
              style={(done || current) ? { backgroundColor: '#3FA79F' } : {}}
            >
              {done
                ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                : s}
            </div>
            <span className={`text-xs ${current ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {s < labels.length && <div className="w-8 h-px bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
/**
 * Two-step purchase flow — registrar compra = registrar lote + gasto.
 *
 * Props:
 *   onClose         — called when modal is dismissed
 *   onEntrySaved    — called after successful save
 *   preSelectedSupply — { id, name, unit, currentQuantity, ... } pre-fills step 1
 */
export default function SupplyEntryModal({ onClose, onEntrySaved, preSelectedSupply = null }) {
  const [step,             setStep]             = useState(1);
  const [saving,           setSaving]           = useState(false);
  const [loadingSupplies,  setLoadingSupplies]  = useState(!preSelectedSupply);
  const [farms,            setFarms]            = useState([]);
  const [supplies,         setSupplies]         = useState(preSelectedSupply ? [preSelectedSupply] : []);
  const [showCreateSupply, setShowCreateSupply] = useState(false);
  const [pendingSupplyName, setPendingSupplyName] = useState('');

  // Step 1 — lot data
  const [lot, setLot] = useState({
    supplyId:       preSelectedSupply?.id ?? '',
    quantity:       '',
    supplier:       '',
    purchaseDate:   TODAY,
    expirationDate: '',
    notes:          '',
  });

  // Step 2 — expense data
  const [expense, setExpense] = useState({
    amount:      '',
    farmId:      '',
    description: '',
  });

  useEffect(() => {
    farmsAPI.getAllFarms()
      .then(d => setFarms(Array.isArray(d) ? d : []))
      .catch(() => {});

    if (!preSelectedSupply) fetchSupplies();
  }, []);

  const fetchSupplies = useCallback(() => {
    setLoadingSupplies(true);
    return suppliesAPI.getSupplies()
      .then(d => { setSupplies(Array.isArray(d) ? d : []); return d; })
      .catch(() => [])
      .finally(() => setLoadingSupplies(false));
  }, []);

  const selectedSupply = supplies.find(s => s.id === lot.supplyId);

  const setLotField    = (f, v) => setLot(p => ({ ...p, [f]: v }));
  const setExpenseField = (f, v) => setExpense(p => ({ ...p, [f]: v }));

  // ── Validate step 1 ────────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!lot.supplyId)                               return toast.error('Selecciona un insumo del catálogo');
    if (!lot.quantity || parseFloat(lot.quantity) <= 0) return toast.error('Ingresa una cantidad mayor a 0');
    if (!lot.purchaseDate)                           return toast.error('Ingresa la fecha de compra');
    setStep(2);
  };

  // ── Final submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!expense.amount || parseFloat(expense.amount) <= 0)
      return toast.error('Ingresa un monto válido');

    const qty    = parseFloat(lot.quantity);
    const amount = parseFloat(expense.amount);

    setSaving(true);
    try {
      // 1. Create lot — derives unitCost from total amount
      await suppliesAPI.createLot(lot.supplyId, {
        quantity:       qty,
        unitCost:       amount / qty,           // cost per unit → lot view
        supplier:       lot.supplier || null,
        expirationDate: lot.expirationDate || null,
        purchaseDate:   lot.purchaseDate,
        notes:          lot.notes.trim() || null,
      });

      // 2. Register financial expense
      await transactionsAPI.createTransaction({
        type:         'Egreso',
        categoryName: 'Insumos',
        amount,
        txnDate:      new Date(lot.purchaseDate + 'T12:00:00').toISOString(),
        farmId:       expense.farmId || null,
        description:  [
          expense.description.trim() || null,
          selectedSupply ? `Insumo: ${selectedSupply.name}` : null,
          `Cantidad: ${qty} ${selectedSupply?.unit ?? ''}`.trim(),
        ].filter(Boolean).join(' | ') || 'Compra de insumos',
      });

      toast.success('Compra registrada: lote e inventario actualizados');
      onEntrySaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Error al registrar la compra');
    } finally {
      setSaving(false);
    }
  };

  // ── Inline supply creation ─────────────────────────────────────────────────
  const handleSupplyCreated = async (newSupply) => {
    setShowCreateSupply(false);
    if (newSupply?.id) {
      setSupplies(prev => prev.some(s => s.id === newSupply.id) ? prev : [...prev, newSupply]);
      setLotField('supplyId', newSupply.id);
      toast.success(`"${newSupply.name}" seleccionado.`);
    } else {
      await fetchSupplies();
    }
  };

  const stepTitle = step === 1 ? 'Paso 1 de 2 — Datos del lote' : 'Paso 2 de 2 — Costo de la compra';

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Registrar Compra de Insumo</h2>
            <p className="text-sm text-gray-500 mt-0.5">{stepTitle}</p>
          </div>
        }
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-between">
            <button type="button" onClick={step === 1 ? onClose : () => setStep(1)} disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>

            {step === 1 ? (
              <button type="button" onClick={handleContinue}
                className="px-5 py-2 text-white rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: '#3FA79F' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#368D86')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3FA79F')}>
                Continuar →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="px-5 py-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                style={{ backgroundColor: '#3FA79F' }}
                onMouseEnter={e => !saving && (e.currentTarget.style.backgroundColor = '#368D86')}
                onMouseLeave={e => !saving && (e.currentTarget.style.backgroundColor = '#3FA79F')}>
                {saving ? 'Guardando…' : 'Confirmar compra'}
              </button>
            )}
          </div>
        }
      >
        <StepDots step={step} />

        {step === 1 ? (
          /* ── STEP 1: Lot data ───────────────────────────────────────────── */
          <div className="space-y-4">

            {/* Supply selector — hidden if pre-selected */}
            {preSelectedSupply ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <p className="text-xs text-gray-500 mb-0.5">Insumo</p>
                <p className="text-sm font-medium text-gray-900">{preSelectedSupply.name}
                  <span className="ml-2 text-xs text-gray-500 font-normal">{preSelectedSupply.unit}</span>
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Insumo <span className="text-red-500">*</span>
                </label>
                {loadingSupplies ? (
                  <div className="h-9 bg-gray-100 animate-pulse rounded-lg" />
                ) : (
                  <SupplySearchSelect
                    supplies={supplies}
                    value={lot.supplyId}
                    onChange={id => setLotField('supplyId', id)}
                    onCreateNew={name => { setPendingSupplyName(name); setShowCreateSupply(true); }}
                  />
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cantidad recibida <span className="text-red-500">*</span>
                {selectedSupply && <span className="ml-1 text-gray-400 font-normal">({selectedSupply.unit})</span>}
              </label>
              <input
                type="number" min="0.001" step="any"
                value={lot.quantity}
                onChange={e => setLotField('quantity', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {selectedSupply && (
                <p className="text-xs text-gray-400 mt-1">Stock actual: {selectedSupply.currentQuantity} {selectedSupply.unit}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Purchase date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha de compra <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={lot.purchaseDate}
                  onChange={v => setLotField('purchaseDate', v)}
                  required
                />
              </div>

              {/* Expiration date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha de vencimiento
                </label>
                <DateInput
                  value={lot.expirationDate}
                  onChange={v => setLotField('expirationDate', v)}
                />
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Proveedor</label>
              <input
                type="text"
                value={lot.supplier}
                onChange={e => setLotField('supplier', e.target.value)}
                placeholder="Ej: Agropecuaria El Campo"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
              <textarea
                value={lot.notes}
                onChange={e => setLotField('notes', e.target.value)}
                rows={2}
                placeholder="Ej: Factura #12345, Lote B-2025…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
          </div>

        ) : (
          /* ── STEP 2: Cost / expense ─────────────────────────────────────── */
          <div className="space-y-4">

            {/* Lot summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 space-y-0.5">
              <p className="text-xs text-gray-500">Lote a registrar</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedSupply?.name}
                <span className="text-gray-500 font-normal ml-2">{lot.quantity} {selectedSupply?.unit}</span>
              </p>
              {lot.supplier && <p className="text-xs text-gray-500">Proveedor: {lot.supplier}</p>}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Monto total pagado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                <input
                  type="number" min="0" step="any"
                  value={expense.amount}
                  onChange={e => setExpenseField('amount', e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {/* Live unit cost preview */}
              {expense.amount && lot.quantity && parseFloat(lot.quantity) > 0 && (
                <p className="text-xs text-teal-700 mt-1 font-medium">
                  Costo unitario: ${(parseFloat(expense.amount) / parseFloat(lot.quantity)).toFixed(2)} / {selectedSupply?.unit}
                </p>
              )}
            </div>

            {/* Date presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha del gasto
                <span className="ml-1 text-xs text-gray-400 font-normal">(se usa la fecha de compra del lote)</span>
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {lot.purchaseDate
                  ? new Date(lot.purchaseDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              </div>
            </div>

            {/* Farm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Asociar gasto a una finca <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={expense.farmId}
                onChange={e => setExpenseField('farmId', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Gasto general de la ganadería</option>
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descripción <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={expense.description}
                onChange={e => setExpenseField('description', e.target.value)}
                placeholder="Ej: Factura #12345, pago de contado…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

          </div>
        )}
      </Modal>

      <SupplyModal
        isOpen={showCreateSupply}
        onClose={() => setShowCreateSupply(false)}
        onSupplyCreated={handleSupplyCreated}
        supply={null}
        initialName={pendingSupplyName}
      />
    </>
  );
}
