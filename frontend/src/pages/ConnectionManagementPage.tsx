import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, UserCheck, UserX, Clock, Link2,
  AlertTriangle, RefreshCw, CheckCircle, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { patientService } from '@/services/patientService';
import { toast } from '@/store/toastStore';
import type { ExpertConnectionRequest } from '@/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('tr-TR');
}

export function ConnectionManagementPage() {
  const [pending, setPending] = useState<ExpertConnectionRequest[]>([]);
  const [active, setActive] = useState<ExpertConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ExpertConnectionRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        patientService.getConnectionRequests(),
        patientService.getActiveConnections(),
      ]);
      setPending(p);
      setActive(a);
    } catch {
      toast.error('Bağlantılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await patientService.approveConnection(id);
      const approved = pending.find(r => r.id === id);
      setPending(prev => prev.filter(r => r.id !== id));
      if (approved) setActive(prev => [...prev, { ...approved }]);
      toast.success('Uzman erişimi onaylandı.');
    } catch {
      toast.error('Onaylama başarısız.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      await patientService.rejectConnection(id);
      setPending(prev => prev.filter(r => r.id !== id));
      toast.success('İstek reddedildi.');
    } catch {
      toast.error('Reddetme başarısız.');
    } finally {
      setActionId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setActionId(revokeTarget.id);
    try {
      await patientService.revokeConnection(revokeTarget.id);
      setActive(prev => prev.filter(r => r.id !== revokeTarget.id));
      toast.success('Uzman erişimi kaldırıldı.');
    } catch {
      toast.error('Erişim kaldırılamadı.');
    } finally {
      setActionId(null);
      setRevokeTarget(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="text-indigo-600" size={24} />
            Uzman Erişim Yönetimi
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Çocuğunuzun profiline erişim isteyen uzmanları buradan onaylayın veya kaldırın.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} className="mr-1.5" /> Yenile
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : (
        <>
          {/* Bekleyen istekler */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={15} className="text-amber-500" />
              Bekleyen İstekler
              {pending.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending.length}
                </span>
              )}
            </h2>

            {pending.length === 0 ? (
              <EmptyState
                icon={<Clock size={28} />}
                title="Bekleyen istek yok"
                description="Yeni bir uzman erişim isteği geldiğinde burada görünür."
              />
            ) : (
              <div className="space-y-3">
                {pending.map(req => (
                  <Card key={req.id} className="p-4 border-amber-100 bg-amber-50/30">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {req.expertName?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{req.expertName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold text-gray-700">{req.childName}</span> için erişim istiyor
                          </p>
                          {req.createdAt && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(req.createdAt)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          loading={actionId === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                        >
                          <CheckCircle size={13} className="mr-1" /> Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(req.id)}
                          loading={actionId === req.id}
                          className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold"
                        >
                          <XCircle size={13} className="mr-1" /> Reddet
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Aktif bağlantılar */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-500" />
              Aktif Uzman Erişimleri
              {active.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {active.length}
                </span>
              )}
            </h2>

            {active.length === 0 ? (
              <EmptyState
                icon={<UserCheck size={28} />}
                title="Aktif erişim yok"
                description="Onayladığınız uzmanlar burada listelenir."
              />
            ) : (
              <div className="space-y-3">
                {active.map(conn => (
                  <Card key={conn.id} className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {conn.expertName?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-sm">{conn.expertName}</p>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <UserCheck size={10} /> Aktif
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold text-gray-700">{conn.childName}</span> profiline erişiyor
                          </p>
                          {conn.createdAt && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Bağlandı: {formatDate(conn.createdAt)}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevokeTarget(conn)}
                        className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold shrink-0"
                      >
                        <UserX size={13} className="mr-1" /> Erişimi Kaldır
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-sm text-amber-800">
            <AlertTriangle className="shrink-0 text-amber-500 mt-0.5" size={18} />
            <p>
              Bir uzmanın erişimini kaldırdığınızda bekleyen görevleri ve randevuları iptal edilir.
              Bu işlem geri alınamaz; tekrar erişim vermek için uzmanın yeniden istek göndermesi gerekir.
            </p>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Erişimi Kaldır"
        message={`${revokeTarget?.expertName} adlı uzmanın ${revokeTarget?.childName} için erişimini kaldırmak istediğinize emin misiniz? Bekleyen görev ve randevular iptal edilecektir.`}
        confirmLabel="Erişimi Kaldır"
        cancelLabel="İptal"
        variant="danger"
      />
    </div>
  );
}
