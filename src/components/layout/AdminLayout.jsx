import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminSidebar from '../admin/AdminSidebar';
import { getUserRole } from '../../lib/auth';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';

function AdminLayoutContent({ children }) {
  const { isCollapsed } = useSidebar();

  return (
    <>
      <AdminSidebar />
      <div
        className="transition-all duration-300"
        style={{ paddingLeft: isCollapsed ? '4rem' : '14rem' }}
      >
        <main className="p-6">
          {children}
        </main>
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const role = getUserRole();
    if (role && role !== 'AdminSistema') {
      toast.error('Unauthorized access');
      navigate('/login');
      return;
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </div>
    </SidebarProvider>
  );
}
