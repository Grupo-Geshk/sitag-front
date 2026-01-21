import { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import UsersTable from '../components/admin/UsersTable';

export default function AdminDashboard() {
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const username = localStorage.getItem('user');
    if (username) {
      setUsername(username);
    }
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users Management', icon: '👥' },
    { id: 'producers', label: 'Producers', icon: '🏭' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-display font-bold mb-2" style={{ color: '#3FA79F' }}>
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, <span className="font-semibold">{username}</span>!
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 text-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { borderBottomColor: '#3FA79F', backgroundColor: '#3FA79F' }
                      : {}
                  }
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-gray-800">
                  System Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium mb-1">Total Users</p>
                        <p className="text-3xl font-bold text-blue-900">--</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium mb-1">Producers</p>
                        <p className="text-3xl font-bold text-green-900">--</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium mb-1">Farms</p>
                        <p className="text-3xl font-bold text-purple-900">--</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Actions</h3>
                  <p className="text-gray-600">
                    Use the tabs above to manage users, view producers, or explore system statistics.
                  </p>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-display font-bold text-gray-800">
                    Users Management
                  </h2>
                </div>
                <UsersTable />
              </div>
            )}

            {/* Producers Tab */}
            {activeTab === 'producers' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-gray-800">
                  Producers Overview
                </h2>
                <div className="bg-gray-50 rounded-xl p-12 border border-gray-200 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Producers List Coming Soon</h3>
                  <p className="mt-1 text-sm text-gray-500">This feature will display all registered producers.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
