import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(formData);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', response.username);

      toast.success(`Bienvenido, ${response.username}`);

      if (response.role === 'Productor') {
        navigate('/producer/dashboard');
      } else if (response.role === 'AdminSistema') {
        navigate('/admin/dashboard');
      } else {
        toast.error('Rol de usuario inválido');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Usuario o contraseña incorrectos';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2074&auto=format&fit=crop)',
          filter: 'brightness(0.7)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
      />

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div
          className="bg-white rounded-2xl p-8 sm:p-10"
          style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
        >
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-semibold mb-2 tracking-tight"
              style={{ color: '#79cc94' }}
            >
              SITAG
            </h1>
            <p className="text-sm" style={{ color: '#718096' }}>
              Accede a tu cuenta
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: '#2d3748' }}
              >
                Usuario
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: '#e2e8f0'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#79cc94';
                  e.target.style.boxShadow = '0 0 0 3px rgba(121, 204, 148, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: '#2d3748' }}
              >
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: '#e2e8f0'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#79cc94';
                  e.target.style.boxShadow = '0 0 0 3px rgba(121, 204, 148, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Ingresa tu contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading ? '#79cc94' : '#68b582'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#79cc94')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#68b582')}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm" style={{ color: '#718096' }}>
            ¿No tienes una cuenta aún?{' '}
            <a
              href="https://grupogeshk.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline transition-all"
              style={{ color: '#79cc94' }}
            >
              Contacta con GESHK
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
