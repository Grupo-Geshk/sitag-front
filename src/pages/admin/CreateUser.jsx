import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../api/admin';
import { producersAPI } from '../../api/producers';

export default function CreateUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Producer Information (for Productor role)
    name: '',
    phone: '',
    email: '',
    // User Credentials
    username: '',
    password: '',
    // Admin User fields (for AdminSistema role)
    firstName: '',
    lastName: '',
    address: '',
    // Role
    role: 'Productor',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.role === 'Productor') {
        // Step 1: Create Producer with User using /api/producers endpoint
        const producerData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          username: formData.username,
          password: formData.password,
        };

        const response = await producersAPI.registerProducer(producerData);
        toast.success(`Producer "${response.producerName}" created successfully with user account!`);
      } else {
        // Create Admin user using /api/admin/users endpoint
        const adminData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          role: 'AdminSistema',
        };

        await adminAPI.createUser(adminData);
        toast.success('Admin user created successfully!');
      }

      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        address: '',
        role: 'Productor',
      });

      // Optionally navigate back to dashboard
      // navigate('/admin/dashboard');
    } catch (error) {
      console.error('Create user error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold mb-2" style={{ color: '#3FA79F' }}>
              Create New User
            </h1>
            <p className="text-gray-600">
              {formData.role === 'Productor'
                ? 'Register a new producer with their user account'
                : 'Create a new system administrator'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-800">
                User Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              >
                <option value="Productor">Producer</option>
                <option value="AdminSistema">System Administrator</option>
              </select>
            </div>

            {/* Producer Information Section */}
            {formData.role === 'Productor' && (
              <>
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Producer Information
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Producer Name (Farm/Business Name) *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                        onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                        placeholder="John Doe Farm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#E2E8F0' }}
                          onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                          placeholder="1234567890"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#E2E8F0' }}
                          onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                          placeholder="farm@example.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    User Credentials
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                        onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                        placeholder="johndoe"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                        onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Admin Information Section */}
            {formData.role === 'AdminSistema' && (
              <>
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Administrator Information
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#E2E8F0' }}
                          onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                          placeholder="John"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#E2E8F0' }}
                          onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#E2E8F0' }}
                          onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                          placeholder="admin@example.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-800">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#E2E8F0' }}
                          onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                          placeholder="1234567890"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        disabled={loading}
                        rows="3"
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                        onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                        placeholder="123 Main Street, City, State"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    User Credentials
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                        onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                        placeholder="admin_user"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                        onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3FA79F' }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#368D86')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3FA79F')}
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
