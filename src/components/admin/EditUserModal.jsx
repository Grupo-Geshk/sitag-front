import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/admin';

export default function EditUserModal({ isOpen, onClose, user, onUserUpdated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    address: '',
    role: 'Productor',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        password: '', // Don't populate password
        phone: user.phone || '',
        address: user.address || '',
        role: user.role || 'Productor',
      });
    }
  }, [user]);

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
      await adminAPI.updateUser(user.id, formData);
      toast.success('User updated successfully!');
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Update user error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        'Failed to update user';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold" style={{ color: '#3FA79F' }}>
              Edit User
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Role (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              User Role
            </label>
            <input
              type="text"
              value={formData.role}
              disabled
              className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">Role cannot be changed</p>
          </div>

          {/* First Name & Last Name */}
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
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
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
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>

          {/* Email & Username */}
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
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

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
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              placeholder="Leave empty to keep current password"
            />
            <p className="text-xs text-gray-500">Leave empty to keep current password</p>
          </div>

          {/* Phone */}
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
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          {/* Address */}
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
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
              style={{ borderColor: '#E2E8F0' }}
              onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              style={{ backgroundColor: '#3FA79F' }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#368D86')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3FA79F')}
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
