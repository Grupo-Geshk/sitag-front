export default function DashboardPanel({ title, action, children, isEmpty, emptyMessage, emptyIcon: EmptyIcon }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {action && action}
      </div>

      {/* Content */}
      <div className="p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {EmptyIcon && (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <EmptyIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <p className="text-sm text-gray-500">{emptyMessage || 'No hay datos disponibles'}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
