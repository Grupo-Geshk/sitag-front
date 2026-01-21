import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSidebar } from '../../context/SidebarContext';

export default function ProducerSidebar() {
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
      to: '/producer/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: '/producer/animales',
      label: 'Animales',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      to: '/producer/eventos-animales',
      label: 'Eventos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      to: '/producer/fincas',
      label: 'Fincas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      to: '/producer/economia',
      label: 'Economía',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      to: '/producer/movimientos',
      label: 'Movimientos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      to: '/producer/servicios',
      label: 'Servicios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      to: '/producer/insumos',
      label: 'Insumos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      to: '/producer/trabajadores',
      label: 'Trabajadores',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                Panel de Productor
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
                    ? 'text-emerald-600'
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
