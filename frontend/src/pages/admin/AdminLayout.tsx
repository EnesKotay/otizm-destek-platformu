import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { adminService } from '@/services/adminService';
import type { AdminStats } from '@/types';
import { 
  LayoutDashboard, 
  TrendingUp, 
  GraduationCap, 
  Users, 
  BookOpen, 
  ShieldAlert, 
  ListChecks, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { cn } from '@/utils/cn';

export function AdminLayout() {
  const location = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    // Sayfa yüklendiğinde ve her rota değişiminde rozet sayılarını güncellemek için stats çekelim
    adminService.getStats()
      .then(setStats)
      .catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { to: '/admin', end: true, label: 'Genel Bakış', icon: LayoutDashboard },
    { to: '/admin/analytics', label: 'Analitik', icon: TrendingUp },
    { 
      to: '/admin/experts', 
      label: 'Uzmanlar', 
      icon: GraduationCap,
      badge: stats?.pendingExperts && stats.pendingExperts > 0 ? stats.pendingExperts : undefined,
      badgeColor: 'bg-amber-500 text-white'
    },
    { to: '/admin/users', label: 'Kullanıcı CRM', icon: Users },
    { to: '/admin/content', label: 'İçerik (CMS)', icon: BookOpen },
    { 
      to: '/admin/reports', 
      label: 'Moderasyon', 
      icon: ShieldAlert,
      badge: stats?.pendingReports && stats.pendingReports > 0 ? stats.pendingReports : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    { to: '/admin/auditlog', label: 'Aktivite Kaydı', icon: ListChecks },
    { to: '/admin/settings', label: 'Sistem Ayarları', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Dynamic Sub-Header with Glassmorphism */}
      <div className="sticky top-0 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-slate-200/50 dark:border-gray-800/50 p-2 rounded-2xl shadow-sm overflow-hidden">
        <nav className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth pb-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0',
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
                  )
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn('min-w-[1.25rem] h-5 rounded-full px-1.5 flex items-center justify-center text-[10px] font-extrabold shadow-sm', item.badgeColor)}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="animate-in fade-in duration-300">
        <Outlet />
      </div>
    </div>
  );
}
