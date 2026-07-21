import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  GraduationCap, MapPin, Building2, BookOpen, CheckCircle2, XCircle,
  FileText, ShieldCheck, ShieldX, Users, BadgeCheck, Tag,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { expertService } from '@/services/expertService';
import { toast } from '@/store/toastStore';
import type { User } from '@/types';
import { formatDate } from '@/utils/date';

export function AdminExpertsPage() {
  const [pendingExperts, setPendingExperts] = useState<User[]>([]);
  const [verifiedExperts, setVerifiedExperts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');

  useEffect(() => {
    Promise.all([
      adminService.getPendingExperts(),
      expertService.getAll(),
    ])
      .then(([pending, all]) => {
        setPendingExperts(pending);
        setVerifiedExperts(all.filter(e => e.verified));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApproveExpert = async (expertId: string) => {
    setActionLoading(`${expertId}-approve`);
    try {
      await adminService.approveExpert(expertId);
      const approved = pendingExperts.find(e => e.id === expertId);
      setPendingExperts(prev => prev.filter(e => e.id !== expertId));
      if (approved) setVerifiedExperts(prev => [...prev, { ...approved, verified: true }]);
      toast.success('Uzman başarıyla onaylandı.');
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectExpert = async (expertId: string) => {
    setRejectConfirmId(null);
    setActionLoading(`${expertId}-reject`);
    try {
      await adminService.rejectExpert(expertId);
      setPendingExperts(prev => prev.filter(e => e.id !== expertId));
      toast.success('Başvuru reddedildi.');
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyLicense = async (expertId: string, revoke = false) => {
    setActionLoading(`${expertId}-license`);
    try {
      if (revoke) {
        await adminService.revokeExpertLicense(expertId);
        setVerifiedExperts(prev => prev.map(e => e.id === expertId ? { ...e, licenseVerified: false } : e));
        toast.success('Lisans doğrulaması kaldırıldı.');
      } else {
        await adminService.verifyExpertLicense(expertId);
        setVerifiedExperts(prev => prev.map(e => e.id === expertId ? { ...e, licenseVerified: true } : e));
        toast.success('Lisans başarıyla doğrulandı.');
      }
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card className="rounded-[28px] border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-slate-600" size={24} />
            <CardTitle>Uzman Yönetimi</CardTitle>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <XCircle size={14} className="text-amber-500" />
              Bekleyen
              {pendingExperts.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">{pendingExperts.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${activeTab === 'verified' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <BadgeCheck size={14} className="text-emerald-500" />
              Onaylı ({verifiedExperts.length})
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {activeTab === 'pending'
            ? 'Platforma katılmak isteyen uzmanların detaylı profillerini inceleyin ve onaylayın.'
            : 'Onaylı uzmanların lisans durumlarını doğrulayın ve yönetin.'}
        </p>
      </CardHeader>

      <div className="p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
        ) : activeTab === 'pending' ? (
          /* --- BEKLEYEN BAŞVURULAR --- */
          pendingExperts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400 opacity-60" />
              <p className="text-lg font-medium">Bekleyen başvuru yok</p>
              <p className="text-sm text-slate-400 mt-1">Tüm başvurular değerlendirildi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingExperts.map(expert => (
                <div key={expert.id} className="p-6 transition-colors hover:bg-slate-50">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <GraduationCap size={28} />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{expert.fullName}</h3>
                          <p className="text-sm font-medium text-slate-500">{expert.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          {expert.expertTitle && (
                            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium">
                              <BookOpen size={14} className="text-slate-400" />{expert.expertTitle}
                            </span>
                          )}
                          {expert.city && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-slate-400" />{expert.city}
                            </span>
                          )}
                          {expert.institution && (
                            <span className="flex items-center gap-1.5">
                              <Building2 size={14} className="text-slate-400" />{expert.institution}
                            </span>
                          )}
                          {expert.licenseNumber && (
                            <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700 text-xs border border-indigo-100">
                              <FileText size={13} className="text-indigo-500" />
                              Lisans: {expert.licenseNumber}
                            </span>
                          )}
                          {expert.licenseDocumentUrl && (
                            <a
                              href={expert.licenseDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <FileText size={13} className="text-emerald-600" />
                              Yüklü Belgeyi Görüntüle ↗
                            </a>
                          )}
                        </div>
                        {expert.bio && (
                          <div className="mt-2 max-w-2xl rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                            <p className="font-medium text-slate-900 mb-1">Hakkında</p>
                            {expert.bio}
                          </div>
                        )}
                        <p className="text-xs text-slate-400">Başvuru: {formatDate(expert.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <Button
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setRejectConfirmId(expert.id)}
                        disabled={actionLoading !== null}
                      >
                        <XCircle size={18} className="mr-2" />Reddet
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApproveExpert(expert.id)}
                        disabled={actionLoading !== null}
                        loading={actionLoading === `${expert.id}-approve`}
                      >
                        <CheckCircle2 size={18} className="mr-2" />Onayla
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* --- ONAYLI UZMANLAR + LİSANS DOĞRULAMA --- */
          verifiedExperts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Onaylı uzman bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {verifiedExperts.map(expert => (
                <div key={expert.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 items-start">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                        {expert.profileImageUrl
                          ? <img src={expert.profileImageUrl} alt={expert.fullName} className="w-full h-full rounded-2xl object-cover" />
                          : <GraduationCap size={22} className="text-emerald-600" />
                        }
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-sm">{expert.fullName}</h3>
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                            <BadgeCheck size={10} /> Onaylı
                          </span>
                          {expert.licenseVerified && (
                            <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                              <ShieldCheck size={10} /> Lisans ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{expert.email}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {expert.expertTitle && (
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                              <BookOpen size={11} />{expert.expertTitle}
                            </span>
                          )}
                          {expert.institution && (
                            <span className="flex items-center gap-1">
                              <Building2 size={11} />{expert.institution}
                            </span>
                          )}
                          {expert.licenseNumber && (
                            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                              <FileText size={11} />Lisans: {expert.licenseNumber}
                            </span>
                          )}
                        </div>
                        {/* Uzmanlık Alanları */}
                        {expert.specializations && expert.specializations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {expert.specializations.map(s => (
                              <span key={s} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full font-semibold">
                                <Tag size={8} className="inline mr-0.5" />{s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lisans Doğrulama Aksiyonu */}
                    <div className="shrink-0">
                      {expert.licenseNumber ? (
                        expert.licenseVerified ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 border-red-200 text-xs"
                            onClick={() => handleVerifyLicense(expert.id, true)}
                            loading={actionLoading === `${expert.id}-license`}
                            disabled={actionLoading !== null}
                          >
                            <ShieldX size={14} className="mr-1.5" />Doğrulamayı Kaldır
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                            onClick={() => handleVerifyLicense(expert.id)}
                            loading={actionLoading === `${expert.id}-license`}
                            disabled={actionLoading !== null}
                          >
                            <ShieldCheck size={14} className="mr-1.5" />Lisansı Doğrula
                          </Button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 italic">Lisans numarası yok</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <ConfirmModal
        isOpen={!!rejectConfirmId}
        title="Başvuruyu reddet?"
        message="Bu uzmanlık başvurusunu reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Evet, Reddet"
        cancelLabel="İptal"
        onConfirm={() => rejectConfirmId && handleRejectExpert(rejectConfirmId)}
        onCancel={() => setRejectConfirmId(null)}
      />
    </Card>
  );
}
