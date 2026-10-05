import { useAuthStore } from '@/store/authStore';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { ExpertDashboard } from './dashboard/ExpertDashboard';
import { ParentDashboard } from './dashboard/ParentDashboard';
import { Navigate } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/giris" replace />;
  
  if (user.role === 'ADMIN') return <AdminDashboard />;
  if (user.role === 'EXPERT') return <ExpertDashboard />;
  return <ParentDashboard />;
}
