import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { 
  FileWarning,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Activity,
  MessageSquare,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { adminService, type ReportTargetPreview } from '@/services/adminService';
import { toast } from '@/store/toastStore';
import { formatDate } from '@/utils/date';
import type { Report } from '@/types';

type StatusFilter = 'all' | 'pending' | 'resolved';

function getReportBadgeVariant(status?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'RESOLVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

const TARGET_TYPES = ['TÜMÜ', 'POST', 'COMMENT', 'USER', 'EXPERT', 'MESSAGE'];

export function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState('TÜMÜ');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail Drawer State
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [targetPreview, setTargetPreview] = useState<ReportTargetPreview | null>(null);
  const [targetPreviewLoading, setTargetPreviewLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getReports(statusFilter);
      setReports(data || []);
    } catch {
      toast.error('Raporlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (!selectedReport) {
      setTargetPreview(null);
      return;
    }
    setTargetPreviewLoading(true);
    setTargetPreview(null);
    adminService.getReportTargetPreview(selectedReport.id)
      .then(setTargetPreview)
      .catch(() => {
        setTargetPreview({
          targetType: selectedReport.targetType,
          targetId: selectedReport.targetId,
          available: false,
          title: 'Hedef içerik yüklenemedi',
          content: 'Bu rapora bağlı hedef içerik şu anda alınamıyor.',
        });
      })
      .finally(() => setTargetPreviewLoading(false));
  }, [selectedReport]);

  const handleResolveReport = async (reportId: string, action: 'resolve' | 'reject') => {
    setActionLoading(`${reportId}-${action}`);
    try {
      if (action === 'resolve') {
        const updated = await adminService.resolveReport(reportId, 'İhlal onaylandı.');
        setReports(prev => prev.map(r => r.id === reportId ? updated : r));
        if (selectedReport?.id === reportId) {
          setSelectedReport(updated);
        }
        toast.success('Rapor ihlal olarak işaretlendi.');
      } else {
        const updated = await adminService.rejectReport(reportId, 'Gözardı edildi.');
        setReports(prev => prev.map(r => r.id === reportId ? updated : r));
        if (selectedReport?.id === reportId) {
          setSelectedReport(updated);
        }
        toast.success('Rapor reddedildi / gözardı edildi.');
      }
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveTarget = async (reportId: string) => {
    setActionLoading(`${reportId}-remove`);
    try {
      const updated = await adminService.removeReportTarget(reportId);
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      setSelectedReport(updated);
      toast.success('Hedef içerik moderasyon kararıyla kaldırıldı.');
    } catch {
      toast.error('Hedef içerik kaldırılamadı.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWarnTarget = async (reportId: string) => {
    setActionLoading(`${reportId}-warn`);
    try {
      const updated = await adminService.warnReportTarget(reportId);
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      setSelectedReport(updated);
      toast.success('Kullanıcıya moderasyon uyarısı gönderildi.');
    } catch {
      toast.error('Kullanıcı uyarılamadı.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = reports.filter((report) => {
    if (typeFilter !== 'TÜMÜ' && report.targetType !== typeFilter) return false;
    return true;
  });

  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" /> Moderasyon ve İçerik Denetimi
          </h1>
          <p className="text-slate-500 text-sm mt-1">Platformdaki şikayetleri ve kullanıcı bildirimlerini detaylı inceleyin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="rounded-[24px] border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity size={24} className="text-amber-500" />
            </div>
            <p className="text-slate-500 text-sm font-semibold">Bekleyen İncelemeler</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">
              {reports.filter(r => r.status === 'PENDING').length}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Operasyonel müdahale bekleyen şikayetler</p>
          </div>
        </Card>
        <Card className="rounded-[24px] border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <p className="text-slate-500 text-sm font-semibold">Çözülen Raporlar</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">
              {reports.filter(r => r.status === 'RESOLVED').length}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Kapatılmış ve denetlenmiş dosyalar</p>
          </div>
        </Card>
      </div>

      <Card className="rounded-[28px] border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className="text-slate-600" size={24} />
              <CardTitle>Rapor Kuyruğu</CardTitle>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${statusFilter === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Bekleyen
                </button>
                <button
                  onClick={() => setStatusFilter('resolved')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${statusFilter === 'resolved' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  İncelenmiş
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Tümü
                </button>
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none transition-colors focus:border-indigo-500 focus:bg-white"
              >
                {TARGET_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        
        <div className="p-0">
          {loading ? (
             <div className="p-12 text-center text-slate-500">Yükleniyor...</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileWarning size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Bu kategoride aktif rapor bulunamadı.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div 
                  key={report.id} 
                  onClick={() => setSelectedReport(report)}
                  className="p-5 transition-colors hover:bg-slate-50 cursor-pointer flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={getReportBadgeVariant(report.status)}>
                        {report.status === 'PENDING' ? 'Bekliyor' : report.status === 'RESOLVED' ? 'Çözüldü' : 'Reddedildi'}
                      </Badge>
                      <span className="text-sm font-bold text-slate-900 truncate">{report.reason}</span>
                      <span className="text-xs text-slate-400 md:ml-auto">{formatDate(report.createdAt || '')}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                      <p>Bildiren: <span className="text-slate-700 font-bold">{report.reporter?.fullName || 'Sistem Tanısı'}</span></p>
                      <p>Tip: <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase">{report.targetType}</span></p>
                      <p className="truncate text-slate-400">Hedef ID: {report.targetId}</p>
                    </div>
                    
                    {report.adminNote && (
                      <div className="mt-1.5 text-xs italic text-slate-500 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 inline-block font-semibold">
                        <span className="font-extrabold text-emerald-700">İdari Karar:</span> {report.adminNote}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 items-center justify-end">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs h-8 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report);
                      }}
                    >
                      Detayı İncele
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Moderation Details & Actions Drawer */}
      <Drawer
        isOpen={selectedReport !== null}
        onClose={() => setSelectedReport(null)}
        title={
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" size={20} />
            <span>Şikayet & İçerik Denetim Dosyası</span>
          </div>
        }
        size="md"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Quick Status Info */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2">
                <Badge variant={getReportBadgeVariant(selectedReport.status)}>
                  {selectedReport.status === 'PENDING' ? 'Bekliyor' : selectedReport.status === 'RESOLVED' ? 'Çözüldü' : 'Reddedildi'}
                </Badge>
                <span className="text-xs text-slate-400">{formatDate(selectedReport.createdAt || '')}</span>
              </div>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                {selectedReport.targetType}
              </span>
            </div>

            {/* Reported Content Preview Card */}
            <Card className="border-rose-100 shadow-sm bg-rose-50/10 rounded-2xl">
              <CardHeader className="border-b border-rose-100 pb-3 flex flex-row items-center gap-2">
                <AlertTriangle className="text-rose-500 shrink-0" size={16} />
                <h4 className="text-xs font-extrabold uppercase text-rose-700 tracking-wider">Şikayet Edilen Hedef Önizlemesi</h4>
              </CardHeader>
              <CardContent className="p-4">
                {targetPreviewLoading ? (
                  <div className="bg-white border border-rose-100 rounded-xl p-3.5 text-xs text-slate-400 font-semibold">
                    Hedef içerik yükleniyor...
                  </div>
                ) : (
                  <div className="bg-white border border-rose-100 rounded-xl p-3.5 text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      {targetPreview?.available ? 'Canlı kayıt' : 'Kayıt bulunamadı'}
                    </p>
                    {targetPreview?.title && (
                      <p className="text-sm font-bold text-slate-900 mb-2">{targetPreview.title}</p>
                    )}
                    <p>{targetPreview?.content || 'Önizleme alınamadı.'}</p>
                    {targetPreview?.authorName && (
                      <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        Sahip: <span className="font-bold text-slate-700">{targetPreview.authorName}</span>
                        {targetPreview.authorEmail ? ` • ${targetPreview.authorEmail}` : ''}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Metadata */}
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5 space-y-4 text-xs font-medium">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Bildirilen Sebep</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{selectedReport.reason}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Bildiren Kullanıcı</p>
                    <p className="text-slate-800 font-semibold mt-0.5">{selectedReport.reporter?.fullName || 'Bilinmiyor/Anonim'}</p>
                    <p className="text-[10px] text-slate-400">{selectedReport.reporter?.email || 'email yok'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">İlişkili Nesne ID</p>
                    <p className="text-slate-800 font-mono text-[10px] truncate mt-0.5" title={selectedReport.targetId}>
                      {selectedReport.targetId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Admin Decision Queue */}
            {selectedReport.status === 'PENDING' && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">İdari Karar & Moderatör Aksiyonları</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => handleResolveReport(selectedReport.id, 'reject')}
                    disabled={actionLoading !== null}
                  >
                    <XCircle size={14} />
                    Gözardı Et (İhlal Yok)
                  </Button>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => handleWarnTarget(selectedReport.id)}
                    disabled={actionLoading !== null}
                    loading={actionLoading === `${selectedReport.id}-warn`}
                  >
                    <MessageSquare size={14} />
                    Kullanıcıyı Uyar
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => handleRemoveTarget(selectedReport.id)}
                    disabled={actionLoading !== null}
                    loading={actionLoading === `${selectedReport.id}-remove`}
                  >
                    <Trash2 size={14} />
                    {selectedReport.targetType === 'USER' || selectedReport.targetType === 'EXPERT'
                      ? 'Hesabı Pasifleştir & Çöz'
                      : 'İçeriği Kaldır & Çöz'}
                  </Button>
                  <Button 
                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => handleResolveReport(selectedReport.id, 'resolve')}
                    disabled={actionLoading !== null}
                    loading={actionLoading === `${selectedReport.id}-resolve`}
                  >
                    <ShieldAlert size={14} />
                    İhlali Onayla
                  </Button>
                </div>
              </div>
            )}

            {selectedReport.status !== 'PENDING' && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-emerald-950 text-xs font-semibold">
                <CheckCircle2 className="text-emerald-500 inline mr-1.5" size={16} />
                Bu moderasyon dosyası çözümlenmiştir. Karar notu: <span className="italic">"{selectedReport.adminNote}"</span>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
