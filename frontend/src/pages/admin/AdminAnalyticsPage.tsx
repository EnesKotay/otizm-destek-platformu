import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart3, Activity, Users, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { adminService } from '@/services/adminService';
import type { GrowthPeriod } from '@/services/adminService';
import type { AdminStats } from '@/types';

interface AnalyticsData {
  name: string;
  users: number;
  sessions: number;
}

const PERIOD_LABELS: Record<GrowthPeriod, string> = {
  '7d': '7 Gün',
  '30d': '30 Gün',
  '90d': '90 Gün',
  '1y': '1 Yıl',
};

export function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<GrowthPeriod>('30d');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      adminService.getGrowthAnalytics(period).catch(() => []),
      adminService.getStats().catch(() => null)
    ])
      .then(([growthRes, statsRes]) => {
        setData(growthRes || []);
        if (statsRes) setStats(statsRes);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
  
  const roleData = stats ? [
    { name: 'Ebeveynler', value: stats.totalUsers - stats.totalExperts },
    { name: 'Uzmanlar', value: stats.totalExperts },
  ] : [];

  const activityData = stats ? [
    { name: 'Forum Gönderileri', count: stats.totalPosts },
    { name: 'Özel Mesajlar', count: stats.totalMessages },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-[24px] bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-indigo-100 font-medium">Toplam Kullanıcı</h3>
              <p className="text-4xl font-bold mt-2">{stats?.totalUsers || '...'}</p>
            </div>
            <Users className="text-indigo-200 opacity-50" size={32} />
          </div>
          <p className="text-sm text-indigo-100 mt-4">Platformun aktif büyüklüğü</p>
        </Card>
        <Card className="rounded-[24px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 shadow-lg shadow-emerald-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-emerald-100 font-medium">Uzman Oranı</h3>
              <p className="text-4xl font-bold mt-2">{stats?.totalExperts || '...'}</p>
            </div>
            <Activity className="text-emerald-200 opacity-50" size={32} />
          </div>
          <p className="text-sm text-emerald-100 mt-4">Sistemdeki profesyoneller</p>
        </Card>
        <Card className="rounded-[24px] bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 shadow-lg shadow-amber-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-amber-100 font-medium">İletişim Hacmi</h3>
              <p className="text-4xl font-bold mt-2">{stats?.totalMessages || '...'}</p>
            </div>
            <MessageCircle className="text-amber-200 opacity-50" size={32} />
          </div>
          <p className="text-sm text-amber-100 mt-4">Gönderilen özel mesajlar</p>
        </Card>
      </div>

      {/* Main Growth Chart */}
      <Card className="rounded-[28px] border-slate-200 overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={24} />
              <CardTitle>Büyüme Analitiği</CardTitle>
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              {(Object.keys(PERIOD_LABELS) as GrowthPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${period === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <div className="p-6">
          {loading ? (
            <div className="flex h-[350px] items-center justify-center">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-indigo-500"></span>
              </span>
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line type="monotone" dataKey="users" name="Yeni Kullanıcı" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      {/* Secondary Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[28px] border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Kullanıcı Dağılımı</CardTitle>
          </CardHeader>
          <div className="p-6 pt-0 h-[300px]">
            {stats && roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Veri bulunamadı</div>
            )}
          </div>
        </Card>

        <Card className="rounded-[28px] border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Platform Etkileşimi</CardTitle>
          </CardHeader>
          <div className="p-6 pt-0 h-[300px]">
            {stats && activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 13 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" name="İşlem Sayısı" fill="#10b981" radius={[0, 8, 8, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Veri bulunamadı</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
