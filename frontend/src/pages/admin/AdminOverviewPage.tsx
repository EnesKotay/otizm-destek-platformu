import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Users,
  GraduationCap,
  ShieldAlert,
  CheckCircle,
  Activity,
  Database,
  Wifi,
  Cpu,
  Sparkles,
  ChevronRight,
  ListChecks,
  Power
} from 'lucide-react';
import { adminService, type AuditLogEntry } from '@/services/adminService';
import { communityService } from '@/services/communityService';
import type { AdminStats, User, Report } from '@/types';
import { formatDate } from '@/utils/date';
import { toast } from '@/store/toastStore';

export function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingExperts, setPendingExperts] = useState<User[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // System Health — gerçek API metrikleri
  const [cpuUsage, setCpuUsage] = useState<number | null>(null);
  const [heapUsedMb, setHeapUsedMb] = useState<number | null>(null);
  const [uptimeMs, setUptimeMs] = useState<number | null>(null);

  const fetchMetrics = () => {
    adminService.getSystemMetrics()
      .then(m => {
        setCpuUsage(Math.round(m.cpuUsage));
        setHeapUsedMb(Math.round(m.heapUsedMb));
        setUptimeMs(m.uptimeMs);
      })
      .catch(() => {});
  };

  const handleGenerateAiQuestion = async () => {
    setGeneratingAi(true);
    try {
      const newQuestion = await adminService.generateWeeklyQuestionWithAI();
      setCurrentQuestion(newQuestion);
      toast.success('Yapay zeka ile yeni haftalık soru başarıyla üretildi ve yayınlandı.');
    } catch {
      toast.error('Soru üretilirken hata oluştu.');
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.allSettled([
      adminService.getStats().then(setStats),
      adminService.getPendingExperts().then(res => setPendingExperts(res.slice(0, 3))),
      adminService.getReports('pending').then(res => setPendingReports(res.slice(0, 3))),
      adminService.getAuditLogs(0, 5).then(res => setRecentLogs(res.content || [])),
      communityService.getWeeklyQuestions().then(questions => {
        if (questions && questions.length > 0) {
          setCurrentQuestion(questions[0]);
        }
      })
    ])
      .finally(() => setLoading(false));

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveExpert = async (expertId: string) => {
    try {
      await adminService.approveExpert(expertId);
      setPendingExperts(prev => prev.filter(x => x.id !== expertId));
      toast.success('Uzman başvurusu onaylandı.');
      // Refresh stats
      adminService.getStats().then(setStats);
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    }
  };

  const handleRejectExpert = async (expertId: string) => {
    try {
      await adminService.rejectExpert(expertId);
      setPendingExperts(prev => prev.filter(x => x.id !== expertId));
      toast.success('Uzman başvurusu reddedildi.');
      adminService.getStats().then(setStats);
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolve' | 'reject') => {
    try {
      if (action === 'resolve') {
        await adminService.resolveReport(reportId, 'İhlal onaylandı.');
        toast.success('Rapor onaylandı.');
      } else {
        await adminService.rejectReport(reportId, 'İhlal bulunamadı.');
        toast.success('Rapor gözardı edildi.');
      }
      setPendingReports(prev => prev.filter(x => x.id !== reportId));
      // Refresh stats
      adminService.getStats().then(setStats);
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    }
  };

  const uptimeHours = uptimeMs !== null ? Math.floor(uptimeMs / 3_600_000) : null;

  const systemStatus = [
    {
      name: 'API Sunucusu',
      value: uptimeHours !== null ? `${uptimeHours} sa` : 'Çalışıyor',
      icon: Activity,
      color: 'text-emerald-500',
      detail: uptimeHours !== null ? `${uptimeHours}h uptime` : 'Uptime bilgisi yükleniyor',
    },
    {
      name: 'CPU Kullanımı',
      value: cpuUsage !== null ? `%${cpuUsage}` : '—',
      icon: Database,
      color: cpuUsage !== null && cpuUsage > 80 ? 'text-rose-500' : 'text-indigo-500',
      detail: cpuUsage !== null && cpuUsage > 80 ? 'Yüksek yük!' : 'Normal düzey',
    },
    {
      name: 'Bellek (Heap)',
      value: heapUsedMb !== null ? `${heapUsedMb} MB` : '—',
      icon: Wifi,
      color: 'text-cyan-500',
      detail: 'JVM heap kullanımı',
    },
    { name: 'Yapay Zeka (AI)', value: 'Aktif', icon: Cpu, color: 'text-purple-500', detail: 'AutiBot Hazır' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-[32px] text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 p-12 opacity-10 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="relative z-10 space-y-4">
          <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-semibold px-3 py-1">
            Merkezi Kontrol Paneli
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Otizm Destek Yönetim Paneli</h1>
          <p className="max-w-2xl text-sm sm:text-base text-slate-300">
            Kullanıcıları denetleyin, uzmanlık başvurularını inceleyin, moderasyon kuyruğunu yönetin ve sistem altyapısını anlık olarak gözlemleyin.
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-[24px] border-none shadow-sm hover:shadow-md transition-all p-5 bg-white relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">CRM</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900">{loading ? '...' : stats?.totalUsers || 0}</p>
            <p className="text-sm font-semibold text-slate-500">Toplam Kullanıcı</p>
          </div>
        </Card>

        <Card className="rounded-[24px] border-none shadow-sm hover:shadow-md transition-all p-5 bg-white relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <GraduationCap size={20} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">PROFESYONEL</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900">{loading ? '...' : stats?.totalExperts || 0}</p>
            <p className="text-sm font-semibold text-slate-500">Onaylı Uzman</p>
          </div>
        </Card>

        <Link to="/admin/experts" className="block">
          <Card className="rounded-[24px] border-none shadow-sm hover:shadow-md transition-all p-5 bg-white relative overflow-hidden group cursor-pointer hover:border-amber-200 ring-1 ring-slate-100 hover:ring-amber-300">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                <GraduationCap size={20} />
              </div>
              {stats?.pendingExperts && stats.pendingExperts > 0 ? (
                <Badge variant="warning" className="animate-pulse shadow-sm text-[10px] px-1.5">Yeni Başvuru</Badge>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">ONAY</span>
              )}
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{loading ? '...' : stats?.pendingExperts || 0}</p>
              <p className="text-sm font-semibold text-slate-500">Bekleyen Uzman</p>
            </div>
          </Card>
        </Link>

        <Link to="/admin/reports" className="block">
          <Card className="rounded-[24px] border-none shadow-sm hover:shadow-md transition-all p-5 bg-white relative overflow-hidden group cursor-pointer hover:border-rose-200 ring-1 ring-slate-100 hover:ring-rose-300">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 transition-colors">
                <ShieldAlert size={20} />
              </div>
              {stats?.pendingReports && stats.pendingReports > 0 ? (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">MODERASYON</span>
              )}
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{loading ? '...' : stats?.pendingReports || 0}</p>
              <p className="text-sm font-semibold text-slate-500">İncelenecek Rapor</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* System Health Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStatus.map((status) => {
          const Icon = status.icon;
          return (
            <Card key={status.name} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-slate-50 ${status.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-semibold uppercase">{status.name}</p>
                  <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{status.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{status.detail}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pending Queues & Action Centers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Experts Queue */}
        <Card className="rounded-[28px] border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="text-amber-500" size={20} />
                Yeni Uzman Başvuruları
              </h3>
              <Link to="/admin/experts" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                Tümü <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <div className="p-0 divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Yükleniyor...</div>
            ) : pendingExperts.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/20 text-emerald-700 rounded-b-[28px]">
                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={28} />
                <p className="text-xs font-semibold">Harika! Bekleyen yeni başvuru yok.</p>
              </div>
            ) : (
              pendingExperts.map(expert => (
                <div key={expert.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{expert.fullName}</h4>
                    <p className="text-xs text-slate-500 truncate">{expert.expertTitle} • {expert.institution || 'Bağımsız'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(expert.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleRejectExpert(expert.id)}
                      className="text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-[10px] px-2.5 h-8 font-bold"
                    >
                      Reddet
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleApproveExpert(expert.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] px-2.5 h-8 font-bold"
                    >
                      Onayla
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pending Reports Queue */}
        <Card className="rounded-[28px] border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-rose-500" size={20} />
                Aktif Şikayetler (Moderasyon)
              </h3>
              <Link to="/admin/reports" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                Tümü <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <div className="p-0 divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Yükleniyor...</div>
            ) : pendingReports.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/20 text-emerald-700 rounded-b-[28px]">
                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={28} />
                <p className="text-xs font-semibold">Güvenli bölge! Bekleyen rapor şikayeti bulunmuyor.</p>
              </div>
            ) : (
              pendingReports.map(report => (
                <div key={report.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="bg-rose-50 text-rose-700 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                        {report.targetType}
                      </span>
                      <span className="truncate">{report.reason}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Bildiren: {report.reporter?.fullName || 'Anonim'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{report.createdAt ? formatDate(report.createdAt) : '-'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleResolveReport(report.id, 'reject')}
                      className="text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] px-2.5 h-8 font-bold"
                    >
                      Gözardı Et
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleResolveReport(report.id, 'resolve')}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] px-2.5 h-8 font-bold animate-pulse"
                    >
                      İhlali Doğrula
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* AI Weekly Question Management */}
      <Card className="rounded-[28px] border-slate-200 p-6 relative overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/20">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                <Sparkles size={15} />
              </div>
              <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Yapay Zeka Soru Yönetimi</h3>
            </div>
            
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Aktif Haftanın Sorusu</p>
              {currentQuestion ? (
                <div className="bg-white/80 border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">
                    "{currentQuestion.question}"
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                      {currentQuestion.tag}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {currentQuestion.weekLabel || 'Aktif'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Yükleniyor veya aktif haftalık soru bulunamadı...</p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <Button 
              onClick={handleGenerateAiQuestion} 
              disabled={generatingAi}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/10 flex items-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Sparkles size={16} className={generatingAi ? 'animate-spin' : ''} />
              {generatingAi ? 'Yeni Soru Üretiliyor...' : 'Yapay Zeka ile Soru Üret ve Yayınla'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Logs & Action Buttons */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Audit Timeline */}
        <div className="lg:col-span-2">
          <Card className="rounded-[28px] border-slate-200 h-full">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ListChecks className="text-slate-500" size={20} />
                  Son İdari Aktivite Akışı (Logs)
                </h3>
                <Link to="/admin/auditlog" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                  Detaylı Loglar <ChevronRight size={14} />
                </Link>
              </div>
            </CardHeader>
            <div className="p-6">
              {loading ? (
                <div className="text-center text-sm text-slate-400 py-6">Yükleniyor...</div>
              ) : recentLogs.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6">Kayıt bulunamadı.</div>
              ) : (
                <div className="relative pl-6 border-l border-slate-100 space-y-5">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 border-2 border-white shadow-sm ring-1 ring-slate-200 text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800">
                            {log.userFullName || log.userEmail || 'Sistem'} • <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">{log.action}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {log.resourceType} {log.resourceId ? `(ID: ${log.resourceId.split('-')[0]}...)` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Access Control Dashboard */}
        <div>
          <Card className="rounded-[28px] border-slate-200 h-full">
            <CardHeader className="border-b border-slate-100 pb-5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Power className="text-indigo-500" size={20} />
                Hızlı Yönetim Aksiyonları
              </h3>
            </CardHeader>
            <div className="p-6 space-y-4">
              <Link to="/admin/settings" className="block w-full">
                <Button variant="outline" className="w-full text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center justify-between p-4 h-12 rounded-2xl">
                  <span className="font-semibold text-sm">Sistem Bakım Modu</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </Button>
              </Link>
              <Link to="/admin/content" className="block w-full">
                <Button variant="outline" className="w-full text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center justify-between p-4 h-12 rounded-2xl">
                  <span className="font-semibold text-sm">Yeni Bilgi Bankası Makalesi Yaz</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </Button>
              </Link>
              <Link to="/admin/users" className="block w-full">
                <Button variant="outline" className="w-full text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center justify-between p-4 h-12 rounded-2xl">
                  <span className="font-semibold text-sm">Toplu Kullanıcı İşlemleri</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </Button>
              </Link>
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-indigo-950">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Activity size={14} /> Altyapı Sağlığı
                </h4>
                <p className="text-[11px] text-indigo-900 mt-2 font-medium">
                  Canlı JVM metrikleri admin panelinden izleniyor. Veritabanı yedekleme entegrasyonu ayarlar ekranındaki durum bilgisinden takip edilir.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
