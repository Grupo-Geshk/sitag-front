import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProducerSidebar from '../producer/ProducerSidebar';
import { getUserRole } from '../../lib/auth';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';

function ProducerLayoutContent({ children }) {
  const { isCollapsed } = useSidebar();

  return (
    <>
      <ProducerSidebar />
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

export default function ProducerLayout({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const role = getUserRole();
    if (role && role !== 'Productor') {
      toast.error('Unauthorized access');
      navigate('/login');
      return;
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <ProducerLayoutContent>
          {children}
        </ProducerLayoutContent>
      </div>
    </SidebarProvider>
  );
}
