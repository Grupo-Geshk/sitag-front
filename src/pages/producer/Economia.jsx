import { useState, useEffect } from 'react';
import ProducerLayout from '../../components/layout/ProducerLayout';
import IncomeModal from '../../components/producer/IncomeModal';
import ExpenseModal from '../../components/producer/ExpenseModal';
import { economyAPI } from '../../api/transactions';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function Economia() {
  const [loading, setLoading] = useState(true);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Financial data
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    margin: 0,
    averageExpensePerFarm: 0,
  });

  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [expensesByFarm, setExpensesByFarm] = useState([]);
  const [trend, setTrend] = useState([]);

  // Period selector
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const periodOptions = [
    { value: 'today', label: 'Hoy' },
    { value: 'this-week', label: 'Esta semana' },
    { value: 'this-month', label: 'Este mes' },
    { value: 'last-month', label: 'Mes pasado' },
    { value: 'this-year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' },
  ];

  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'this-week':
        const firstDayOfWeek = today.getDate() - today.getDay();
        startDate = new Date(today.setDate(firstDayOfWeek));
        endDate = new Date();
        break;
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this-year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      if (!dateRange) return;

      const producerId = getProducerId();

      // Fetch economy summary
      const summaryData = await economyAPI.getEconomySummary(
        producerId,
        dateRange.startDate,
        dateRange.endDate
      );

      // Map backend response to frontend format
      setSummary({
        totalIncome: summaryData.kpis?.ingresosTotales || 0,
        totalExpenses: summaryData.kpis?.egresosTotales || 0,
        margin: summaryData.kpis?.margen || 0,
        averageExpensePerFarm: summaryData.kpis?.gastoPromedioFinca || 0,
      });

      // Expenses by category from summary - map backend field names
      const mappedExpensesByCategory = (summaryData.egresosPorCategoria || []).map(cat => ({
        category: cat.category,
        total: cat.amount,
        count: cat.transactionCount,
        percentage: cat.percentage,
      }));
      setExpensesByCategory(mappedExpensesByCategory);

      // Expenses by farm from summary - map backend field names
      const mappedExpensesByFarm = (summaryData.gastosPorFinca || []).map(farm => ({
        farmId: farm.fincaId,
        name: farm.nombre,
        total: farm.gastoTotal,
      }));
      setExpensesByFarm(mappedExpensesByFarm);

      // Fetch trend data
      const trendData = await economyAPI.getEconomyTrends(producerId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: selectedPeriod === 'this-year' ? 'monthly' : 'weekly',
      });

      // Map backend trend data - backend returns ingresosVsEgresos array
      const mappedTrend = (trendData.ingresosVsEgresos || []).map(point => ({
        period: point.period,
        income: point.ingresos,
        expense: point.egresos,
        margin: point.margen,
      }));
      setTrend(mappedTrend);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      if (error.response?.status === 401) {
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente');
      } else {
        toast.error('Error al cargar datos financieros');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionCreated = () => {
    setShowIncomeModal(false);
    setShowExpenseModal(false);
    fetchFinancialData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMarginColor = () => {
    if (summary.margin > 0) return 'text-green-600';
    if (summary.margin < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMarginBgColor = () => {
    if (summary.margin > 0) return 'bg-green-50';
    if (summary.margin < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  // Calculate top 3 expense categories
  const topExpenseCategories = [...expensesByCategory]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Calculate top 3 farms by expenses
  const topExpenseFarms = [...expensesByFarm]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Calculate max values for bar charts
  const maxTrendValue = Math.max(
    ...trend.map(t => Math.max(t.income || 0, t.expense || 0)),
    1
  );

  // Calculate total for donut chart percentages
  const totalExpensesByCategory = expensesByCategory.reduce((sum, cat) => sum + cat.total, 0);

  // Colors for donut chart
  const donutColors = [
    '#3FA79F', '#60D5C8', '#2D8B83', '#8BE3D9', '#1F6B65',
    '#A8EBE5', '#166056', '#C5F2EE', '#0D4942', '#E0F9F7',
  ];

  return (
    <ProducerLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Financial Command Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#3FA79F' }}>
              Control Financiero
            </h1>
            <p className="text-sm text-gray-600">
              Monitorea la salud financiera de tu operación ganadera
            </p>
          </div>

          {/* Actions Area */}
          <div className="flex items-center gap-2">
            {/* Primary Actions - Grouped */}
            <button
              onClick={() => setShowIncomeModal(true)}
              className="px-4 py-2.5 text-white rounded-lg font-medium hover:brightness-95 transition-all flex items-center gap-2"
              style={{ backgroundColor: '#3FA79F' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Ingreso
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Registrar Gasto
            </button>

            {/* Secondary Action */}
            <button
              onClick={() => toast.info('Función de exportar próximamente')}
              className="px-3 py-2.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Exportar Reportes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Segmented Period Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide mr-2">Período:</span>
            {periodOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                  selectedPeriod === option.value
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={selectedPeriod === option.value ? { backgroundColor: '#3FA79F' } : {}}
              >
                {option.label}
              </button>
            ))}
          </div>

          {selectedPeriod === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha inicial
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 transition-all"
                  style={{ focusRing: '#3FA79F' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 transition-all"
                  style={{ focusRing: '#3FA79F' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Financial Summary Cards - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Income */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ingresos</p>
              <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Período actual</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Egresos</p>
              <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Período actual</p>
          </div>

          {/* Margin - Key Insight */}
          <div className={`rounded-lg shadow-sm border p-4 ${
            summary.margin > 0
              ? 'bg-green-50 border-green-200'
              : summary.margin < 0
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Margen</p>
              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                summary.margin > 0
                  ? 'bg-green-100'
                  : summary.margin < 0
                  ? 'bg-red-100'
                  : 'bg-gray-100'
              }`}>
                <svg className={`w-4 h-4 ${getMarginColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                    summary.margin > 0
                      ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  } />
                </svg>
              </div>
            </div>
            <p className={`text-2xl font-bold ${getMarginColor()}`}>
              {formatCurrency(summary.margin)}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: summary.margin > 0 ? '#059669' : summary.margin < 0 ? '#DC2626' : '#6B7280' }}>
              {summary.margin > 0 ? 'Operación rentable' : summary.margin < 0 ? 'Operación en pérdida' : 'Punto de equilibrio'}
            </p>
          </div>

          {/* Average Expense per Farm */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Gasto Promedio</p>
              <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isNaN(summary.averageExpensePerFarm) || !isFinite(summary.averageExpensePerFarm)
                ? '$0'
                : formatCurrency(summary.averageExpensePerFarm)
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">Por finca</p>
          </div>
        </div>

        {/* Primary Visualization: Income vs Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Ingresos vs Egresos
            </h3>
            <p className="text-xs text-gray-500">Evolución financiera en el período seleccionado</p>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-gray-500">Cargando datos...</p>
              </div>
            </div>
          ) : trend.length === 0 ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
              <div className="text-center px-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Sin datos financieros</p>
                <p className="text-xs text-gray-500">No hay transacciones registradas en este período</p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {trend.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1" style={{ height: '200px' }}>
                    {/* Income bar */}
                    <div className="relative flex-1 flex flex-col justify-end">
                      <div
                        className="w-full bg-green-500 rounded-t transition-all hover:opacity-80 cursor-pointer"
                        style={{
                          height: `${(item.income / maxTrendValue) * 100}%`,
                          minHeight: item.income > 0 ? '4px' : '0px',
                        }}
                        title={`Ingresos: ${formatCurrency(item.income)}`}
                      />
                    </div>
                    {/* Expense bar */}
                    <div className="relative flex-1 flex flex-col justify-end">
                      <div
                        className="w-full bg-red-500 rounded-t transition-all hover:opacity-80 cursor-pointer"
                        style={{
                          height: `${(item.expense / maxTrendValue) * 100}%`,
                          minHeight: item.expense > 0 ? '4px' : '0px',
                        }}
                        title={`Egresos: ${formatCurrency(item.expense)}`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 text-center font-medium">
                    {new Date(item.date).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Egresos</span>
            </div>
          </div>
        </div>

        {/* Secondary Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Expenses by Category - Donut Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Egresos por Categoría
              </h3>
              <p className="text-xs text-gray-500">Distribución del gasto por tipo</p>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-gray-500">Cargando datos...</p>
                </div>
              </div>
            ) : expensesByCategory.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Sin gastos registrados</p>
                  <p className="text-xs text-gray-500">No hay egresos en este período</p>
                </div>
              </div>
            ) : (
              <div>
                {/* Simple donut visualization */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {expensesByCategory.map((category, index) => {
                        const percentage = (category.total / totalExpensesByCategory) * 100;
                        const circumference = 2 * Math.PI * 35;
                        const offset = expensesByCategory
                          .slice(0, index)
                          .reduce((sum, cat) => sum + (cat.total / totalExpensesByCategory) * 100, 0);
                        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((offset / 100) * circumference);

                        return (
                          <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke={donutColors[index % donutColors.length]}
                            strokeWidth="20"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all"
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="text-sm font-bold" style={{ color: '#3FA79F' }}>
                          {formatCurrency(totalExpensesByCategory)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {expensesByCategory.slice(0, 5).map((category, index) => {
                    const percentage = ((category.total / totalExpensesByCategory) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: donutColors[index % donutColors.length] }}
                          />
                          <span className="text-sm text-gray-700">{category.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(category.total)}
                          </p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Margin Trend - Line Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Tendencia de Margen
              </h3>
              <p className="text-xs text-gray-500">Evolución de rentabilidad en el tiempo</p>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-gray-500">Cargando datos...</p>
                </div>
              </div>
            ) : trend.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
                <div className="text-center px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Sin datos suficientes</p>
                  <p className="text-xs text-gray-500">No hay información para calcular la tendencia</p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <div className="h-full flex flex-col">
                  {/* Y-axis labels */}
                  <div className="flex-1 flex items-end justify-between gap-2 relative">
                    {/* Zero line */}
                    <div className="absolute left-0 right-0 border-t-2 border-gray-300" style={{ bottom: '50%' }} />

                    {trend.map((item, index) => {
                      const margin = item.income - item.expense;
                      const maxMargin = Math.max(...trend.map(t => Math.abs(t.income - t.expense)), 1);
                      const heightPercent = (Math.abs(margin) / maxMargin) * 50; // 50% max (half chart)
                      const isPositive = margin >= 0;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center" style={{ height: '200px' }}>
                          <div className="flex-1 flex flex-col justify-center items-center relative">
                            {/* Point */}
                            <div
                              className="absolute w-3 h-3 rounded-full bg-white border-2 z-10"
                              style={{
                                borderColor: isPositive ? '#10B981' : '#EF4444',
                                [isPositive ? 'bottom' : 'top']: `calc(50% + ${heightPercent}%)`,
                              }}
                              title={`${formatCurrency(margin)}`}
                            />
                            {/* Line to zero */}
                            {index < trend.length - 1 && (
                              <svg
                                className="absolute left-1/2"
                                style={{
                                  width: `calc(100% + ${100 / trend.length}%)`,
                                  height: '200px',
                                  top: 0,
                                }}
                              >
                                <line
                                  x1="0"
                                  y1={isPositive ? `${100 - heightPercent}%` : `${100 + heightPercent}%`}
                                  x2="100%"
                                  y2={
                                    trend[index + 1].income - trend[index + 1].expense >= 0
                                      ? `${100 - ((Math.abs(trend[index + 1].income - trend[index + 1].expense) / maxMargin) * 50)}%`
                                      : `${100 + ((Math.abs(trend[index + 1].income - trend[index + 1].expense) / maxMargin) * 50)}%`
                                  }
                                  stroke={isPositive ? '#10B981' : '#EF4444'}
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 text-center mt-2">
                            {new Date(item.date).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 font-medium">Ganancia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 font-medium">Pérdida</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Operational Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Spending Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Categorías con Mayor Gasto
              </h3>
              <p className="text-xs text-gray-500">Top 3 áreas de mayor inversión</p>
            </div>
            {topExpenseCategories.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded border border-gray-100">
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topExpenseCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#3FA79F' }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{category.category}</p>
                        <p className="text-xs text-gray-600">
                          {((category.total / totalExpensesByCategory) * 100).toFixed(1)}% del total
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-gray-900 ml-2">
                      {formatCurrency(category.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Farms with Highest Costs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Fincas con Mayor Costo
              </h3>
              <p className="text-xs text-gray-500">Top 3 fincas por inversión</p>
            </div>
            {topExpenseFarms.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded border border-gray-100">
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topExpenseFarms.map((farm, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#3FA79F' }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{farm.farmName}</p>
                        <p className="text-xs text-gray-600">{farm.transactionCount} transacciones</p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-gray-900 ml-2">
                      {formatCurrency(farm.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showIncomeModal && (
        <IncomeModal
          onClose={() => setShowIncomeModal(false)}
          onIncomeCreated={handleTransactionCreated}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onExpenseCreated={handleTransactionCreated}
        />
      )}
    </ProducerLayout>
  );
}
