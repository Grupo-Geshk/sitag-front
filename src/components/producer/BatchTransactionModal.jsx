import { useState, useEffect } from 'react';
import { farmsAPI } from '../../api/farms';
import { transactionsAPI } from '../../api/transactions';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────────

const REASONS = [
  { value: 'VentaLote',       label: 'Venta de lote de animales' },
  { value: 'Subasta',         label: 'Feria / Subasta ganadera' },
  { value: 'CompraAnimales',  label: 'Compra de animales' },
  { value: 'Transporte',      label: 'Operación de transporte' },
  { value: 'Otro',            label: 'Otro evento' },
];

const LINE_SUGGESTIONS = {
  VentaLote:      ['Venta de animales', 'Comisión del vendedor', 'Guía MIDA', 'Transportista'],
  Subasta:        ['Ingreso por subasta', 'Comisión subasta (%)', 'Guía MIDA', 'Transportista', 'Inscripción'],
  CompraAnimales: ['Compra de animales', 'Transportista', 'Guía MIDA', 'Inspección veterinaria'],
  Transporte:     ['Cobro por transporte', 'Combustible', 'Peajes', 'Guía MIDA'],
  Otro:           [],
};

function todayDisplay() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_LINE = () => ({
  id:          crypto.randomUUID(),
  name:        '',
  type:        'Ingreso',
  amount:      '',
  description: '',
});

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDot({ n, current, label }) {
  const done    = n < current;
  const active  = n === current;
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
        done   ? 'bg-[#1A6B64] text-white' :
        active ? 'bg-[#1A6B64] text-white ring-4 ring-[#D1EEE9]' :
                 'bg-gray-100 text-gray-400'
      }`}>
        {done ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : n}
      </div>
      <span className={`text-xs font-medium hidden sm:block ${active ? 'text-gray-800' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
      <StepDot n={1} current={step} label="Evento" />
      <div className={`flex-1 h-px mx-1 transition-colors ${step > 1 ? 'bg-[#1A6B64]' : 'bg-gray-200'}`} />
      <StepDot n={2} current={step} label="Líneas" />
      <div className={`flex-1 h-px mx-1 transition-colors ${step > 2 ? 'bg-[#1A6B64]' : 'bg-gray-200'}`} />
      <StepDot n={3} current={step} label="Confirmar" />
    </div>
  );
}

// ── Step 1 — Event header ──────────────────────────────────────────────────────

function Step1({ header, onChange, onDateInput, dateDisplay, farms }) {
  return (
    <div className="space-y-4">
      {/* Razón */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Razón del evento <span className="text-red-500">*</span>
        </label>
        <select
          value={header.reason}
          onChange={e => onChange('reason', e.target.value)}
          required
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm bg-white transition-colors"
        >
          <option value="">Selecciona una razón…</option>
          {REASONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Finca */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Finca</label>
        <select
          value={header.farmId}
          onChange={e => onChange('farmId', e.target.value)}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm bg-white transition-colors"
        >
          <option value="">Ganadería general (sin finca específica)</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Fecha <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={dateDisplay}
          onChange={onDateInput}
          placeholder="DD/MM/AAAA"
          maxLength={10}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
        />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notas generales <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={header.notes}
          onChange={e => onChange('notes', e.target.value)}
          rows={2}
          placeholder="Ej: Venta de lote de novillos a comprador de Chiriquí…"
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm resize-none transition-colors"
        />
      </div>
    </div>
  );
}

// ── Step 2 — Lines table ───────────────────────────────────────────────────────

function LineRow({ line, onChange, onRemove, canRemove, suggestions }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(line.name.toLowerCase()) && s !== line.name
  );

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-200">
      {/* Row 1: Name + Type toggle */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <input
            type="text"
            value={line.name}
            onChange={e => { onChange('name', e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Nombre de la línea…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] bg-white"
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {filtered.map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => { onChange('name', s); setShowSuggestions(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ingreso / Egreso toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={() => onChange('type', 'Ingreso')}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${
              line.type === 'Ingreso'
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            + Ingreso
          </button>
          <button
            type="button"
            onClick={() => onChange('type', 'Egreso')}
            className={`px-3 py-2 text-xs font-semibold transition-colors border-l border-gray-200 ${
              line.type === 'Egreso'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            − Egreso
          </button>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Amount + Description */}
      <div className="flex gap-2">
        <div className="relative w-36 flex-shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
          <input
            type="number"
            value={line.amount}
            onChange={e => onChange('amount', e.target.value)}
            min="0"
            step="1"
            placeholder="0"
            className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] bg-white"
          />
        </div>
        <input
          type="text"
          value={line.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Descripción corta (opcional)…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] bg-white"
        />
      </div>
    </div>
  );
}

function Step2({ lines, onAddLine, onChangeLine, onRemoveLine, reason }) {
  const suggestions = LINE_SUGGESTIONS[reason] || [];
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Agrega una línea por cada concepto del evento. Indica si es un ingreso o un egreso.
      </p>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <LineRow
            key={line.id}
            line={line}
            onChange={(field, val) => onChangeLine(line.id, field, val)}
            onRemove={() => onRemoveLine(line.id)}
            canRemove={lines.length > 1}
            suggestions={suggestions}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddLine}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-[#3FA79F] hover:text-[#3FA79F] transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Agregar línea
      </button>
    </div>
  );
}

// ── Step 3 — Summary ───────────────────────────────────────────────────────────

function Step3({ header, lines, dateDisplay, farms }) {
  const farmName = farms.find(f => f.id === header.farmId)?.name || 'Ganadería general';
  const reasonLabel = REASONS.find(r => r.value === header.reason)?.label || header.reason;

  const totalIngresos = lines
    .filter(l => l.type === 'Ingreso')
    .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalEgresos = lines
    .filter(l => l.type === 'Egreso')
    .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const neto = totalIngresos - totalEgresos;

  const fmt = v => new Intl.NumberFormat('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  return (
    <div className="space-y-4">
      {/* Event info */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Razón</span>
          <span className="text-sm font-semibold text-gray-800">{reasonLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Finca</span>
          <span className="text-sm font-medium text-gray-700">{farmName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Fecha</span>
          <span className="text-sm font-medium text-gray-700">{dateDisplay}</span>
        </div>
        {header.notes && (
          <div className="flex items-start justify-between gap-4 pt-1">
            <span className="text-xs text-gray-500 flex-shrink-0">Notas</span>
            <span className="text-xs text-gray-600 text-right">{header.notes}</span>
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="space-y-1.5">
        {lines.map(line => (
          <div key={line.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-100">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
              line.type === 'Ingreso' ? 'bg-emerald-500' : 'bg-red-500'
            }`}>
              {line.type === 'Ingreso' ? '+' : '−'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{line.name || '(sin nombre)'}</p>
              {line.description && (
                <p className="text-xs text-gray-400 truncate">{line.description}</p>
              )}
            </div>
            <span className={`text-sm font-bold flex-shrink-0 ${
              line.type === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {line.type === 'Ingreso' ? '+' : '−'}${fmt(parseFloat(line.amount) || 0)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs text-gray-500">Total ingresos</span>
          <span className="text-sm font-semibold text-emerald-600">+${fmt(totalIngresos)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs text-gray-500">Total egresos</span>
          <span className="text-sm font-semibold text-red-500">−${fmt(totalEgresos)}</span>
        </div>
        <div className={`flex items-center justify-between px-4 py-3 ${neto >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <span className="text-sm font-bold text-gray-800">Neto del evento</span>
          <span className={`text-base font-bold ${neto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {neto >= 0 ? '+' : '−'}${fmt(Math.abs(neto))}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Se crearán {lines.length} transacciones en el módulo de Economía.
      </p>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function BatchTransactionModal({ onClose, onComplete }) {
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [farms, setFarms] = useState([]);
  const [dateDisplay, setDateDisplay] = useState(todayDisplay);

  const [header, setHeader] = useState({
    reason: '',
    farmId: '',
    date:   todayISO(),
    notes:  '',
  });

  const [lines, setLines] = useState([EMPTY_LINE()]);

  useEffect(() => {
    farmsAPI.getAllFarms()
      .then(d => setFarms(Array.isArray(d) ? d : []))
      .catch(() => setFarms([]));
  }, []);

  const handleHeaderChange = (field, value) => {
    setHeader(prev => ({ ...prev, [field]: value }));
  };

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
      setHeader(prev => ({ ...prev, date: iso }));
    } else {
      setHeader(prev => ({ ...prev, date: '' }));
    }
  };

  const handleAddLine = () => setLines(prev => [...prev, EMPTY_LINE()]);

  const handleChangeLine = (id, field, value) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleRemoveLine = (id) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // Validation per step
  const validateStep1 = () => {
    if (!header.reason) { toast.error('Selecciona una razón para el evento'); return false; }
    if (!header.date)   { toast.error('Ingresa una fecha válida (DD/MM/AAAA)'); return false; }
    return true;
  };

  const validateStep2 = () => {
    for (const line of lines) {
      if (!line.name.trim())             { toast.error('Todas las líneas deben tener un nombre'); return false; }
      if (!line.amount || parseFloat(line.amount) <= 0) {
        toast.error(`La línea "${line.name}" debe tener un monto mayor a 0`); return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const reasonLabel = REASONS.find(r => r.value === header.reason)?.label || header.reason;
      const results = await Promise.allSettled(
        lines.map(line =>
          transactionsAPI.createTransaction({
            type:         line.type,
            categoryName: line.name.trim(),
            amount:       parseFloat(line.amount),
            txnDate:      new Date(header.date + 'T12:00:00').toISOString(),
            farmId:       header.farmId || null,
            description:  [line.description, header.notes, reasonLabel]
                            .filter(Boolean).join(' · ') || null,
          })
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) {
        toast.success(`${lines.length} transacción${lines.length > 1 ? 'es' : ''} registrada${lines.length > 1 ? 's' : ''} exitosamente`);
        onComplete();
        onClose();
      } else {
        toast.error(`${lines.length - failed} registradas, ${failed} fallaron. Verifica en Economía.`);
        onComplete();
      }
    } catch (err) {
      toast.error('Error al registrar las transacciones');
    } finally {
      setSaving(false);
    }
  };

  const STEP_TITLES = {
    1: 'Nuevo evento financiero',
    2: 'Líneas del evento',
    3: 'Resumen y confirmación',
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-xl flex flex-col max-h-[95dvh] sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{STEP_TITLES[step]}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paso {step} de 3</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step bar */}
        <StepBar step={step} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 1 && (
            <Step1
              header={header}
              onChange={handleHeaderChange}
              onDateInput={handleDateInput}
              dateDisplay={dateDisplay}
              farms={farms}
            />
          )}
          {step === 2 && (
            <Step2
              lines={lines}
              onAddLine={handleAddLine}
              onChangeLine={handleChangeLine}
              onRemoveLine={handleRemoveLine}
              reason={header.reason}
            />
          )}
          {step === 3 && (
            <Step3
              header={header}
              lines={lines}
              dateDisplay={dateDisplay}
              farms={farms}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
          >
            {step === 1 ? 'Cancelar' : '← Anterior'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-all disabled:opacity-50 text-sm"
              style={{ backgroundColor: '#1A6B64' }}
              onMouseEnter={e => !saving && (e.currentTarget.style.backgroundColor = '#155a54')}
              onMouseLeave={e => !saving && (e.currentTarget.style.backgroundColor = '#1A6B64')}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1A6B64' }}
              onMouseEnter={e => !saving && (e.currentTarget.style.backgroundColor = '#155a54')}
              onMouseLeave={e => !saving && (e.currentTarget.style.backgroundColor = '#1A6B64')}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registrando…
                </>
              ) : 'Confirmar'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
