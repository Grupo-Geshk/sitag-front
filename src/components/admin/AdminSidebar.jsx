import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSidebar } from '../../context/SidebarContext';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: '/admin/create-user',
      label: 'Crear Usuario',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    }
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
      style={{ borderRight: '1px solid #f1f5f9' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isCollapsed ? 'px-3 py-4' : 'px-5 py-4'}`}>
        <div className="flex-1 min-w-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: '#79cc94' }}
              >
                S
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: '#79cc94' }}>
                SITAG
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                Panel de Admin
              </p>
            </>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex-shrink-0 p-1.5 rounded-md transition-all duration-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Contraer sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 relative group ${
                  isCollapsed ? 'justify-center py-3' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#68b582' : 'transparent'
              })}
              onMouseEnter={(e) => {
                const isActive = e.currentTarget.classList.contains('active');
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.classList.contains('active');
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span
                className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
                style={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto',
                  marginLeft: isCollapsed ? 0 : '0.75rem'
                }}
              >
                {item.label}
              </span>
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className={`${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {/* Expand Button (only visible when collapsed) */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900 mb-2 py-2.5 group relative"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Expandir sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Expandir
            </div>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-lg transition-all duration-200 text-red-600 hover:text-red-700 ${
            isCollapsed ? 'justify-center py-2.5' : 'px-3 py-2.5'
          } group relative`}
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span
            className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
            style={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
              marginLeft: isCollapsed ? 0 : '0.75rem'
            }}
          >
            Cerrar sesión
          </span>
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Cerrar sesión
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
