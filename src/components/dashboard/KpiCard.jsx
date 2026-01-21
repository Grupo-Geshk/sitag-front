export default function KpiCard({ label, value, subtitle, trend, icon: Icon }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Green accent - thin top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: '#68b582' }} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {trend > 0 ? (
                <>
                  <svg className="w-3 h-3" style={{ color: '#68b582' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span style={{ color: '#68b582' }}>+{trend}%</span>
                </>
              ) : trend < 0 ? (
                <>
                  <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-red-600">{trend}%</span>
                </>
              ) : null}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
            <Icon className="w-5 h-5" style={{ color: '#68b582' }} />
          </div>
        )}
      </div>
    </div>
  );
}
