export default function QuickActionTile({ label, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-5 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: '#f0fdf4' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
      >
        <Icon className="w-6 h-6" style={{ color: '#68b582' }} />
      </div>
      <span className="text-sm font-medium text-gray-700 text-center group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </button>
  );
}
