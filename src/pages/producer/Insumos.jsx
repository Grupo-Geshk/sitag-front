import { useState, useEffect } from 'react';
import ProducerLayout from '../../components/layout/ProducerLayout';
import SupplyModal from '../../components/producer/SupplyModal';
import SupplyEntryModal from '../../components/producer/SupplyEntryModal';
import SupplyConsumptionModal from '../../components/producer/SupplyConsumptionModal';
import SupplyAdjustmentModal from '../../components/producer/SupplyAdjustmentModal';
import { suppliesAPI } from '../../api/supplies';
import { farmsAPI } from '../../api/farms';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function Insumos() {
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiringSupplies, setExpiringSupplies] = useState([]);
  const [usageData, setUsageData] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmsWithUsage, setFarmsWithUsage] = useState([]);
  const [selectedFarmFilter, setSelectedFarmFilter] = useState('');

  // Modals
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply farm filter
    if (selectedFarmFilter) {
      setFilteredSupplies(supplies.filter(s => s.farmId === parseInt(selectedFarmFilter)));
    } else {
      setFilteredSupplies(supplies);
    }
  }, [selectedFarmFilter, supplies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const producerId = getProducerId();

      // Fetch all farms
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData || []);

      // Fetch all supplies at producer level (no farm loop)
      const suppliesData = await suppliesAPI.getSupplies();
      setSupplies(suppliesData || []);

      // Identify farms with usage based on supply locations
      const usedFarmIds = new Set(
        (suppliesData || [])
          .filter(s => s.farmId)
          .map(s => s.farmId)
      );
      const farmsWithUsageData = (farmsData || []).filter(f => usedFarmIds.has(f.id));
      setFarmsWithUsage(farmsWithUsageData);

      // Fetch alerts, expiring supplies, and usage data
      const [lowStockData, expiringData, usageDataResponse] = await Promise.all([
        suppliesAPI.getLowStockAlerts(),
        suppliesAPI.getExpiring(30),
        suppliesAPI.getUsageData(),
      ]);

      setLowStockAlerts(lowStockData || []);
      setExpiringSupplies(expiringData || []);
      setUsageData(usageDataResponse || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar insumos');
    } finally {
      setLoading(false);
    }
  };

  const handleModalSaved = () => {
    setShowEntryModal(false);
    setShowConsumptionModal(false);
    setShowAdjustmentModal(false);
    setShowSupplyModal(false);
    setEditingSupply(null);
    fetchData();
  };

  const handleEditSupply = (supply) => {
    setEditingSupply(supply);
    setShowSupplyModal(true);
  };

  const handleCloseSupplyModal = () => {
    setShowSupplyModal(false);
    setEditingSupply(null);
  };

  const getStockStatus = (supply) => {
    const currentQty = supply.currentQuantity || 0;
    const minStock = supply.minStockLevel || 1;

    if (currentQty === 0) {
      return { label: 'Agotado', color: 'bg-red-100 text-red-800 border-red-300', icon: '⚠️' };
    } else if (currentQty <= minStock * 0.5) {
      return { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-300', icon: '⚠️' };
    } else if (currentQty <= minStock) {
      return { label: 'Stock bajo', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '⚡' };
    } else {
      return { label: 'OK', color: 'bg-green-100 text-green-800 border-green-300', icon: '✓' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiration = (expirationDate) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTopUsedSupplies = () => {
    return usageData
      .sort((a, b) => b.totalConsumed - a.totalConsumed)
      .slice(0, 5);
  };

  return (
    <ProducerLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: '#3FA79F' }}>
              Insumos
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Inventario a nivel de productor
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingSupply(null);
                setShowSupplyModal(true);
              }}
              className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-1.5"
            >
              <span className="text-base">➕</span>
              <span>Crear Insumo</span>
            </button>
            <button
              onClick={() => setShowConsumptionModal(true)}
              className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-1.5"
            >
              <span className="text-base">📤</span>
              <span>Consumo</span>
            </button>
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-1.5"
            >
              <span className="text-base">⚙️</span>
              <span>Ajustar</span>
            </button>
            <button
              onClick={() => setShowEntryModal(true)}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              style={{ backgroundColor: '#3FA79F' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#368D86'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3FA79F'}
            >
              <span className="text-base">📦</span>
              <span>Registrar Entrada</span>
            </button>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock Alert */}
          <div className={`bg-white rounded-lg shadow-sm border transition-all ${
            lowStockAlerts.length > 0
              ? 'border-l-4 border-l-orange-400 border-r border-r-gray-200 border-t border-t-gray-200 border-b border-b-gray-200'
              : 'border-gray-200'
          }`}>
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-sm font-semibold text-gray-900">Stock Bajo</h3>
                </div>
                {lowStockAlerts.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                    {lowStockAlerts.length}
                  </span>
                )}
              </div>

              {lowStockAlerts.length === 0 ? (
                <p className="text-xs text-gray-500 pl-7">Todos los insumos en niveles óptimos</p>
              ) : (
                <div className="space-y-1.5 pl-7 max-h-32 overflow-y-auto">
                  {lowStockAlerts.slice(0, 3).map((supply) => (
                    <div key={supply.id} className="flex items-center justify-between py-1.5 px-2 bg-orange-50 rounded border border-orange-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{supply.name}</p>
                        <p className="text-xs text-gray-600">
                          {supply.currentQuantity} / {supply.minStockLevel} {supply.unit}
                        </p>
                      </div>
                      <span className="ml-2 px-2 py-0.5 bg-orange-200 text-orange-900 rounded text-xs font-medium whitespace-nowrap">
                        {supply.currentQuantity === 0 ? 'Agotado' : 'Bajo'}
                      </span>
                    </div>
                  ))}
                  {lowStockAlerts.length > 3 && (
                    <p className="text-xs text-gray-500 pt-1">+{lowStockAlerts.length - 3} más</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expiration Alert */}
          <div className={`bg-white rounded-lg shadow-sm border transition-all ${
            expiringSupplies.length > 0
              ? 'border-l-4 border-l-red-400 border-r border-r-gray-200 border-t border-t-gray-200 border-b border-b-gray-200'
              : 'border-gray-200'
          }`}>
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏰</span>
                  <h3 className="text-sm font-semibold text-gray-900">Próximos a Vencer</h3>
                </div>
                {expiringSupplies.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                    {expiringSupplies.length}
                  </span>
                )}
              </div>

              {expiringSupplies.length === 0 ? (
                <p className="text-xs text-gray-500 pl-7">Sin vencimientos próximos</p>
              ) : (
                <div className="space-y-1.5 pl-7 max-h-32 overflow-y-auto">
                  {expiringSupplies.slice(0, 3).map((supply) => {
                    const daysLeft = getDaysUntilExpiration(supply.expirationDate);
                    return (
                      <div key={supply.id} className="flex items-center justify-between py-1.5 px-2 bg-red-50 rounded border border-red-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{supply.name}</p>
                          <p className="text-xs text-gray-600">{formatDate(supply.expirationDate)}</p>
                        </div>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          daysLeft <= 7 ? 'bg-red-200 text-red-900' : 'bg-yellow-200 text-yellow-900'
                        }`}>
                          {daysLeft <= 0 ? 'Vencido' : `${daysLeft}d`}
                        </span>
                      </div>
                    );
                  })}
                  {expiringSupplies.length > 3 && (
                    <p className="text-xs text-gray-500 pt-1">+{expiringSupplies.length - 3} más</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Inventario
                {supplies.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredSupplies.length} {filteredSupplies.length === 1 ? 'insumo' : 'insumos'})
                  </span>
                )}
              </h2>

              {/* Farm Filter */}
              {farmsWithUsage.length > 0 && (
                <select
                  value={selectedFarmFilter}
                  onChange={(e) => setSelectedFarmFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">Todas las ubicaciones</option>
                  {farmsWithUsage.map(farm => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-teal-500"></div>
              <p className="mt-3 text-sm text-gray-500">Cargando inventario...</p>
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {selectedFarmFilter ? 'Sin insumos en esta ubicación' : 'Sin insumos registrados'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {selectedFarmFilter ? 'Intenta con otra ubicación o crea un nuevo insumo' : 'Crea tu primer insumo para comenzar'}
              </p>
              <button
                onClick={() => setShowSupplyModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#3FA79F' }}
              >
                <span>➕</span>
                Crear Insumo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Insumo
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Categoría
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ubicación
                    </th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Stock Actual
                    </th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Stock Mín.
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Vencimiento
                    </th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSupplies.map((supply) => {
                    const status = getStockStatus(supply);
                    const daysLeft = getDaysUntilExpiration(supply.expirationDate);

                    return (
                      <tr key={supply.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="font-medium text-sm text-gray-900">{supply.name}</div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{supply.category}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-500">{supply.farmName || '—'}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`text-sm font-semibold tabular-nums ${
                              supply.currentQuantity === 0 ? 'text-red-600' :
                              supply.currentQuantity <= supply.minStockLevel ? 'text-orange-600' :
                              'text-gray-900'
                            }`}>
                              {supply.currentQuantity}
                            </span>
                            <span className="text-xs text-gray-500">{supply.unit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm text-gray-600 tabular-nums">{supply.minStockLevel}</span>
                            <span className="text-xs text-gray-500">{supply.unit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${status.color}`}>
                            <span className="text-xs">{status.icon}</span>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {supply.expirationDate ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${daysLeft <= 7 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                {formatDate(supply.expirationDate)}
                              </span>
                              {daysLeft !== null && daysLeft <= 30 && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {daysLeft <= 0 ? 'Vencido' : `${daysLeft}d`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEditSupply(supply)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors"
                            title="Editar insumo"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Usage Visualization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Insumos Más Utilizados</h2>
            <p className="text-xs text-gray-500 mt-0.5">Consumo total por insumo</p>
          </div>

          {usageData.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500">Aún no hay datos de uso registrados</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="space-y-4">
                {getTopUsedSupplies().map((item, index) => {
                  const maxConsumed = Math.max(...usageData.map(d => d.totalConsumed));
                  const percentage = maxConsumed > 0 ? (item.totalConsumed / maxConsumed) * 100 : 0;

                  return (
                    <div key={item.supplyId} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 w-4">#{index + 1}</span>
                          <span className="text-sm font-medium text-gray-900">{item.supplyName}</span>
                          <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            {item.totalConsumed.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500 w-16">
                            {item.movementCount} {item.movementCount === 1 ? 'uso' : 'usos'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: '#3FA79F',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {usageData.length > 5 && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Mostrando los 5 insumos más consumidos de {usageData.length} total
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SupplyModal
        isOpen={showSupplyModal}
        onClose={handleCloseSupplyModal}
        onSupplyCreated={handleModalSaved}
        supply={editingSupply}
      />

      {showEntryModal && (
        <SupplyEntryModal
          onClose={() => setShowEntryModal(false)}
          onEntrySaved={handleModalSaved}
        />
      )}

      {showConsumptionModal && (
        <SupplyConsumptionModal
          onClose={() => setShowConsumptionModal(false)}
          onConsumptionSaved={handleModalSaved}
        />
      )}

      {showAdjustmentModal && (
        <SupplyAdjustmentModal
          onClose={() => setShowAdjustmentModal(false)}
          onAdjustmentSaved={handleModalSaved}
        />
      )}
    </ProducerLayout>
  );
}
