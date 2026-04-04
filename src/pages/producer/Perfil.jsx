import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import ProducerLayout from '../../components/layout/ProducerLayout';
import FarmBrandModal from '../../components/producer/FarmBrandModal';
import { getUserData, getTenantPlan, getProducerId } from '../../lib/auth';
import { authAPI } from '../../api/auth';
import { animalsAPI } from '../../api/animals';
import { farmsAPI } from '../../api/farms';
import { brandsAPI } from '../../api/brands';
import toast from 'react-hot-toast';
import {
  PLAN_ORDER, PLAN_LABELS, PLAN_COLORS, PLAN_LIMITS, PLAN_FEATURES,
} from '../../lib/plan';

// ── Plan feature descriptors ─────────────────────────────────────────────────
const PLAN_ALL_FEATURES = {
  Semilla: [
    { label: 'Hasta 15 animales activos' },
    { label: '1 finca' },
    { label: '1 usuario' },
    { label: 'Gestión básica de animales' },
    { label: 'Eventos y seguimiento sanitario' },
    { label: 'Servicios veterinarios' },
  ],
  Crecimiento: [
    { label: 'Hasta 100 animales activos' },
    { label: '2 fincas' },
    { label: '1 usuario' },
    { label: 'Todo lo del plan Semilla' },
    { label: 'Árbol genealógico' },
    { label: 'Movimientos entre fincas' },
    { label: 'Divisiones y lotes' },
  ],
  Profesional: [
    { label: 'Hasta 300 animales activos' },
    { label: '5 fincas' },
    { label: 'Usuarios ilimitados' },
    { label: 'Todo lo del plan Crecimiento' },
    { label: 'Control financiero' },
    { label: 'Gestión de insumos' },
    { label: 'Gestión de trabajadores' },
  ],
  Corporativo: [
    { label: 'Animales ilimitados' },
    { label: 'Fincas ilimitadas' },
    { label: 'Usuarios ilimitados' },
    { label: 'Todo lo del plan Profesional' },
    { label: 'Soporte prioritario' },
    { label: 'Acceso anticipado a nuevas funciones' },
  ],
};

const PLAN_PRICES = {
  Semilla:     'Gratis',
  Crecimiento: '$15 / mes',
  Profesional: '$35 / mes',
  Corporativo: 'Personalizado',
};

function PlanBadge({ plan }) {
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS.Semilla;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {PLAN_LABELS[plan]}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-700 font-medium">{value || '—'}</span>
    </div>
  );
}

export default function Perfil() {
  const navigate            = useNavigate();
  const [user, setUser]     = useState(null);
  const currentPlan         = getTenantPlan();
  const currentPlanIdx      = PLAN_ORDER.indexOf(currentPlan);
  const lockedPlans         = PLAN_ORDER.slice(currentPlanIdx + 1);

  // ── Hierros ──────────────────────────────────────────────────────────────
  const [farms, setFarms]               = useState([]);
  const [brandsByFarm, setBrandsByFarm] = useState({});   // { farmId: FarmBrandDto[] }
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandFarmId, setBrandFarmId]   = useState(null); // farm context for modal

  // ── Deceased animals ─────────────────────────────────────────────────────
  const [deceased, setDeceased]         = useState([]);
  const [deceasedLoading, setDeceasedLoading] = useState(true);

  // ── Password form ────────────────────────────────────────────────────────
  const [pwForm, setPwForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // ── Email form ───────────────────────────────────────────────────────────
  const [emForm, setEmForm]   = useState({ newEmail: '', currentPassword: '' });
  const [emLoading, setEmLoading] = useState(false);

  useEffect(() => {
    setUser(getUserData());
    animalsAPI.getAnimals({ status: 'Muerto', pageSize: 200 })
      .then(data => setDeceased(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => setDeceased([]))
      .finally(() => setDeceasedLoading(false));
    fetchHierros();
  }, []);

  const fetchHierros = async () => {
    setBrandsLoading(true);
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      const list = Array.isArray(farmsData) ? farmsData : [];
      setFarms(list);
      const results = await Promise.all(list.map(f => brandsAPI.getByFarm(f.id).catch(() => [])));
      const map = {};
      list.forEach((f, i) => { map[f.id] = Array.isArray(results[i]) ? results[i] : []; });
      setBrandsByFarm(map);
    } catch {
      // silent
    } finally {
      setBrandsLoading(false);
    }
  };

  const handleDeleteBrand = async (farmId, brandId) => {
    if (!window.confirm('¿Eliminar este hierro?')) return;
    try {
      await brandsAPI.delete(farmId, brandId);
      toast.success('Hierro eliminado');
      fetchHierros();
    } catch {
      toast.error('Error al eliminar el hierro');
    }
  };

  const roleLabel = user?.role === 'AdminSistema' ? 'Administrador' : 'Productor';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setPwLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      toast.success('Contraseña actualizada exitosamente');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmLoading(true);
    try {
      await authAPI.changeEmail({
        newEmail:        emForm.newEmail.trim(),
        currentPassword: emForm.currentPassword,
      });
      // Update cached user_data so the UI reflects the new email
      const updated = { ...getUserData(), email: emForm.newEmail.trim().toLowerCase() };
      localStorage.setItem('user_data', JSON.stringify(updated));
      setUser(updated);
      toast.success('Correo actualizado. Vuelve a iniciar sesión para aplicar el cambio en el token.');
      setEmForm({ newEmail: '', currentPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar el correo');
    } finally {
      setEmLoading(false);
    }
  };

  return (
    <ProducerLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Page title ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-sm text-gray-500 mt-0.5">Información de tu cuenta y plan activo</p>
        </div>

        {/* ── User card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Avatar strip */}
          <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: '#68b582' }}
            >
              {user ? (user.firstName?.[0] ?? user.email?.[0] ?? '?').toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : '—'}
              </p>
              <p className="text-xs text-gray-400">{roleLabel}</p>
            </div>
          </div>

          {/* User fields */}
          <div className="px-6 py-3">
            <InfoRow label="Correo electrónico" value={user?.email} />
            <InfoRow label="Teléfono"            value={user?.phone} />
            <InfoRow label="Organización"        value={user?.tenantName} />
          </div>
        </div>

        {/* ── Security settings ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-sm font-semibold text-gray-900">Seguridad</p>
            <p className="text-xs text-gray-400 mt-0.5">Actualiza tu correo o contraseña</p>
          </div>

          {/* Change password */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Cambiar contraseña</p>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                placeholder="Contraseña actual"
                value={pwForm.currentPassword}
                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                required
                disabled={pwLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] transition-colors disabled:opacity-50"
              />
              <input
                type="password"
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                value={pwForm.newPassword}
                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                required
                disabled={pwLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] transition-colors disabled:opacity-50"
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
                disabled={pwLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={pwLoading}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#3FA79F' }}
              >
                {pwLoading ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>

          {/* Change email */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cambiar correo electrónico</p>
            <p className="text-xs text-gray-400 mb-4">
              Correo actual: <span className="font-medium text-gray-600">{user?.email}</span>
            </p>
            <form onSubmit={handleChangeEmail} className="space-y-3">
              <input
                type="email"
                placeholder="Nuevo correo electrónico"
                value={emForm.newEmail}
                onChange={e => setEmForm(p => ({ ...p, newEmail: e.target.value }))}
                required
                disabled={emLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] transition-colors disabled:opacity-50"
              />
              <input
                type="password"
                placeholder="Confirma con tu contraseña actual"
                value={emForm.currentPassword}
                onChange={e => setEmForm(p => ({ ...p, currentPassword: e.target.value }))}
                required
                disabled={emLoading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#3FA79F] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={emLoading}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#3FA79F' }}
              >
                {emLoading ? 'Guardando…' : 'Actualizar correo'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Current plan card ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Plan activo</p>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900">Plan {PLAN_LABELS[currentPlan]}</span>
                <PlanBadge plan={currentPlan} />
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-500">{PLAN_PRICES[currentPlan]}</span>
          </div>

          <div className="px-6 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Incluye</p>
            <ul className="space-y-2">
              {(PLAN_ALL_FEATURES[currentPlan] ?? []).map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Hierros ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-sm font-semibold text-gray-900">Hierros</p>
            <p className="text-xs text-gray-400 mt-0.5">Marcas registradas por finca</p>
          </div>

          {brandsLoading ? (
            <div className="px-6 py-6 space-y-2">
              {[1, 2].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : farms.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-400">No tienes fincas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {farms.map(farm => {
                const brands = brandsByFarm[farm.id] ?? [];
                return (
                  <div key={farm.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{farm.name}</p>
                      <button
                        onClick={() => { setBrandFarmId(farm.id); setEditingBrand(null); setShowBrandModal(true); }}
                        className="text-xs font-medium flex items-center gap-1 hover:underline"
                        style={{ color: '#3FA79F' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar
                      </button>
                    </div>

                    {brands.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Sin hierros en esta finca</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {brands.map(b => (
                          <div key={b.id} className="group relative border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                            {b.photoUrl ? (
                              <div className="h-16 bg-gray-50 flex items-center justify-center">
                                <img src={b.photoUrl} alt={b.name} className="h-full w-full object-contain p-1" onError={e => { e.target.style.display = 'none'; }} />
                              </div>
                            ) : (
                              <div className="h-16 bg-amber-50 flex items-center justify-center">
                                <svg className="w-7 h-7 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                                </svg>
                              </div>
                            )}
                            <div className="px-2 py-1.5">
                              <p className="text-xs font-medium text-gray-800 truncate">{b.name}</p>
                            </div>
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setBrandFarmId(farm.id); setEditingBrand(b); setShowBrandModal(true); }}
                                className="p-1 bg-white rounded shadow-sm text-gray-400 hover:text-gray-700"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteBrand(farm.id, b.id)}
                                className="p-1 bg-white rounded shadow-sm text-gray-400 hover:text-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Bajas del hato ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p className="text-sm font-semibold text-gray-900">Bajas del hato</p>
              <p className="text-xs text-gray-400 mt-0.5">Animales fallecidos registrados en el sistema</p>
            </div>
            {!deceasedLoading && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                {deceased.length}
              </span>
            )}
          </div>

          {deceasedLoading ? (
            <div className="px-6 py-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : deceased.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-400">Sin bajas registradas</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {deceased.map(animal => {
                const closedDate = animal.closedAt
                  ? (() => { const d = new Date(animal.closedAt); return isValid(d) ? format(d, "d 'de' MMM yyyy", { locale: es }) : null; })()
                  : null;
                const sexLabel = animal.sex === 'Macho' ? 'Macho' : 'Hembra';
                return (
                  <li
                    key={animal.id}
                    onClick={() => navigate(`/producer/animales/${animal.id}`)}
                    className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        #{animal.tagNumber}{animal.name ? ` · ${animal.name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {[animal.breed, sexLabel].filter(Boolean).join(' · ')}
                        {animal.closeReason ? ` — ${animal.closeReason}` : ''}
                      </p>
                    </div>

                    {/* Date */}
                    {closedDate && (
                      <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">{closedDate}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Locked plans ────────────────────────────────────────────────── */}
        {lockedPlans.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Planes disponibles para actualizar</p>
            <div className="space-y-3">
              {lockedPlans.map((plan) => {
                const colors = PLAN_COLORS[plan];
                return (
                  <div
                    key={plan}
                    className="bg-white rounded-xl border shadow-sm overflow-hidden opacity-75"
                    style={{ borderColor: colors.border }}
                  >
                    <div
                      className="px-6 py-4 flex items-center justify-between"
                      style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          style={{ color: colors.text }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span className="text-sm font-bold" style={{ color: colors.text }}>
                          Plan {PLAN_LABELS[plan]}
                        </span>
                        <PlanBadge plan={plan} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: colors.text }}>
                        {PLAN_PRICES[plan]}
                      </span>
                    </div>

                    <div className="px-6 py-4">
                      <ul className="space-y-2">
                        {(PLAN_ALL_FEATURES[plan] ?? []).map((f) => (
                          <li key={f.label} className="flex items-center gap-2.5 text-sm text-gray-400">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              style={{ color: colors.text, opacity: 0.5 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {f.label}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-400 mt-4">
                        Contacta al administrador de SITAG para actualizar al plan{' '}
                        <strong style={{ color: colors.text }}>{PLAN_LABELS[plan]}</strong>.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
      <FarmBrandModal
        isOpen={showBrandModal}
        onClose={() => { setShowBrandModal(false); setEditingBrand(null); setBrandFarmId(null); }}
        farmId={brandFarmId}
        brand={editingBrand}
        onSaved={() => { setShowBrandModal(false); setEditingBrand(null); setBrandFarmId(null); fetchHierros(); }}
      />
    </ProducerLayout>
  );
}
