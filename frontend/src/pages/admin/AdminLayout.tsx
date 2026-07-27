import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
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
  Settings as SettingsIcon,
  ChevronRight,
  ShieldCheck,
  Activity,
  Scale
} from 'lucide-react';
import { cn } from '@/utils/cn';

export function AdminLayout() {
  const location = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
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
    { to: '/admin/kvkk', label: 'KVKK Başvuruları', icon: Scale },
    { to: '/admin/auditlog', label: 'Aktivite Kaydı', icon: ListChecks },
    { to: '/admin/settings', label: 'Sistem Ayarları', icon: SettingsIcon },
  ];

  // Current active page label for breadcrumbs
  const currentNav = navItems.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Admin Status & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link to="/admin" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
            <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
            Yönetim Paneli
          </Link>
          {currentNav && currentNav.to !== '/admin' && (
            <>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="text-slate-900 dark:text-slate-100 font-bold">{currentNav.label}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sistem Çevrimiçi
          </div>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <Activity size={12} className="text-indigo-500" />
            v2.4 Enterprise
          </div>
        </div>
      </div>

      {/* Dynamic Sub-Header Navigation with Modern SaaS Styling */}
      <div className="sticky top-2 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-1.5 rounded-2xl shadow-sm overflow-hidden">
        <nav className="flex flex-nowrap gap-1 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50'
                  )
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn('min-w-[1.25rem] h-4 rounded-full px-1.5 flex items-center justify-center text-[10px] font-extrabold shadow-sm', item.badgeColor)}>
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

