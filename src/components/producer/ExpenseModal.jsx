import { useState, useEffect } from 'react';
import { transactionsAPI } from '../../api/transactions';
import { farmsAPI } from '../../api/farms';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORY REGISTRY
// Each category declares which extra panel (if any) it activates.
// ══════════════════════════════════════════════════════════════════════════════

const EXPENSE_CATEGORIES = [
  { value: 'Alimentacion',          label: 'Alimentación',           panel: null },
  { value: 'ServiciosVeterinarios', label: 'Servicios veterinarios', panel: 'service' },
  { value: 'ManoDeObra',            label: 'Mano de obra',           panel: 'payroll' },
  { value: 'Mantenimiento',         label: 'Mantenimiento',          panel: null },
  { value: 'Transporte',            label: 'Transporte',             panel: null },
  { value: 'Insumos',               label: 'Insumos',                panel: null },
  { value: 'Servicios',             label: 'Servicios generales',    panel: 'service' },
  { value: 'OtrosGastos',           label: 'Otros gastos',           panel: null },
];

function getCategoryPanel(categoryValue) {
  return EXPENSE_CATEGORIES.find(c => c.value === categoryValue)?.panel ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE PANEL
// Shown when category is ServiciosVeterinarios or Servicios
// ══════════════════════════════════════════════════════════════════════════════

function ServicePanel({ data, onChange }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
        Detalle del Servicio
      </p>
      <p className="text-xs text-blue-700 -mt-2">
        Registra el servicio asociado a este gasto para mantener un historial completo.
      </p>

      {/* Service name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nombre del servicio
        </label>
        <input
          type="text"
          value={data.serviceName}
          onChange={e => onChange('serviceName', e.target.value)}
          placeholder="Ej: Vacunación brucelosis, Desparasitación, Revisión reproductiva…"
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
        />
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Proveedor / Profesional
        </label>
        <input
          type="text"
          value={data.provider}
          onChange={e => onChange('provider', e.target.value)}
          placeholder="Ej: Dr. Martínez, Agroveterinaria del Norte…"
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
        />
      </div>

      {/* Animals / scope covered */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Alcance del servicio <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={data.scope}
          onChange={e => onChange('scope', e.target.value)}
          placeholder="Ej: 45 novillas, Todo el hato, Lote A…"
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYROLL PANEL
// Shown when category is ManoDeObra
// ══════════════════════════════════════════════════════════════════════════════

function PayrollPanel({ data, onChange }) {
  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-4">
      <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
        Detalle de Mano de Obra
      </p>
      <p className="text-xs text-purple-700 -mt-2">
        Registra el contexto del pago para un control de nómina más preciso.
      </p>

      {/* Worker count */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            N.º de trabajadores
          </label>
          <input
            type="number"
            min="1"
            value={data.workerCount}
            onChange={e => onChange('workerCount', e.target.value)}
            placeholder="1"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo de pago
          </label>
          <select
            value={data.payType}
            onChange={e => onChange('payType', e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
          >
            <option value="">Selecciona</option>
            <option value="Jornal">Jornal / día</option>
            <option value="Semanal">Semanal</option>
            <option value="Quincenal">Quincenal</option>
            <option value="Mensual">Mensual</option>
            <option value="Destajo">Destajo / tarea</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </div>

      {/* Task description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Labor realizada <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={data.task}
          onChange={e => onChange('task', e.target.value)}
          placeholder="Ej: Ordeño, Mantenimiento de cercas, Aplicación de vacunas…"
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════

export default function ExpenseModal({ onClose, onExpenseCreated }) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    farmId: '',
  });

  // Extra panel state — only populated fields are included in description
  const [serviceData, setServiceData] = useState({ serviceName: '', provider: '', scope: '' });
  const [payrollData, setPayrollData] = useState({ workerCount: '', payType: '', task: '' });

  const activePanel = getCategoryPanel(formData.category);

  useEffect(() => {
    farmsAPI.getAllFarms()
      .then(d => setFarms(Array.isArray(d) ? d : []))
      .catch(() => setFarms([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Reset panel state on category change
    if (name === 'category') {
      setServiceData({ serviceName: '', provider: '', scope: '' });
      setPayrollData({ workerCount: '', payType: '', task: '' });
    }
  };

  const handleServiceChange = (field, value) => {
    setServiceData(prev => ({ ...prev, [field]: value }));
  };

  const handlePayrollChange = (field, value) => {
    setPayrollData(prev => ({ ...prev, [field]: value }));
  };

  // Build enriched description combining the base description + panel data
  const buildDescription = () => {
    const parts = [];
    if (formData.description.trim()) parts.push(formData.description.trim());

    if (activePanel === 'service') {
      if (serviceData.serviceName) parts.push(`Servicio: ${serviceData.serviceName}`);
      if (serviceData.provider) parts.push(`Proveedor: ${serviceData.provider}`);
      if (serviceData.scope) parts.push(`Alcance: ${serviceData.scope}`);
    } else if (activePanel === 'payroll') {
      if (serviceData.workerCount || payrollData.workerCount)
        parts.push(`Trabajadores: ${payrollData.workerCount}`);
      if (payrollData.payType) parts.push(`Tipo de pago: ${payrollData.payType}`);
      if (payrollData.task) parts.push(`Labor: ${payrollData.task}`);
    }

    return parts.join(' | ') || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) { toast.error('Selecciona una categoría de gasto'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (!formData.date) { toast.error('Selecciona una fecha'); return; }
    if (!formData.farmId) { toast.error('Selecciona una finca'); return; }

    setLoading(true);
    try {
      await transactionsAPI.createTransaction({
        type: 'Egreso',
        categoryName: formData.category,
        amount: parseFloat(formData.amount),
        txnDate: new Date(formData.date + 'T12:00:00').toISOString(),
        farmId: formData.farmId,
        description: buildDescription(),
      });
      toast.success('Gasto registrado exitosamente');
      onExpenseCreated();
    } catch (err) {
      console.error('Error creating expense:', err);
      toast.error(err.response?.data?.message || 'Error al registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Registrar Gasto"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" form="expense-form" disabled={loading}
            className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3FA79F' }}
            onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#368D86')}
            onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#3FA79F')}
          >
            {loading ? 'Guardando…' : 'Guardar gasto'}
          </button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría de Gasto <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleChange({ target: { name: 'category', value: cat.value } })}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left border-2 transition-all ${
                  formData.category === cat.value
                    ? 'border-[#3FA79F] bg-teal-50 text-teal-800'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat.label}
                {cat.panel && (
                  <span className="block text-xs font-normal mt-0.5 opacity-60">
                    {cat.panel === 'service' ? '+ detalle de servicio' : '+ detalle de nómina'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Service panel */}
        {activePanel === 'service' && (
          <ServicePanel data={serviceData} onChange={handleServiceChange} />
        )}

        {/* Payroll panel */}
        {activePanel === 'payroll' && (
          <PayrollPanel data={payrollData} onChange={handlePayrollChange} />
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">$</span>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange}
              required min="0" step="1" placeholder="0"
              className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm" />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm" />
        </div>

        {/* Farm */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Finca <span className="text-red-500">*</span>
          </label>
          <select name="farmId" value={formData.farmId} onChange={handleChange} required
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors text-sm">
            <option value="">Selecciona una finca</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea name="description" value={formData.description} onChange={handleChange}
            rows="2" placeholder="Ej: Compra de 200 kg de concentrado para el lote A…"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-colors resize-none text-sm" />
        </div>
      </form>
    </Modal>
  );
}
