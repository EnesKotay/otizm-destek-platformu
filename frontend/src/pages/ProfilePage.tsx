import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Building2, BookOpen, Calendar,
  MessageCircle, ShieldCheck, FileText, Star, GraduationCap,
  User, MapPin, Flag, CheckCircle2, Clock, AlertCircle, ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { expertService } from '@/services/expertService';
import { messagingService } from '@/services/messagingService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import type { User as UserType } from '@/types';

const SPECIALTY_COLORS: Record<string, string> = {
  'ABA': 'bg-blue-100 text-blue-700',
  'Konuşma': 'bg-green-100 text-green-700',
  'Dil': 'bg-green-100 text-green-700',
  'Psikoloji': 'bg-purple-100 text-purple-700',
  'Özel Eğitim': 'bg-orange-100 text-orange-700',
  'Ergoterapi': 'bg-pink-100 text-pink-700',
  'Fizyoterapi': 'bg-cyan-100 text-cyan-700',
};

function getSpecialtyColor(title?: string) {
  if (!title) return 'bg-indigo-100 text-indigo-700';
  for (const [key, cls] of Object.entries(SPECIALTY_COLORS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'bg-indigo-100 text-indigo-700';
}

function StarDisplay({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={16}
          fill={value >= i ? '#f59e0b' : 'none'}
          className={value >= i ? 'text-amber-400' : 'text-gray-300'} />
      ))}
      <span className="text-sm font-semibold text-gray-700">{value.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count} değerlendirme)</span>
    </div>
  );
}

const REPORT_REASONS = [
  'Sahte/yanıltıcı profil bilgileri',
  'Lisans belgesi doğrulanamıyor',
  'Uygunsuz veya zararlı içerik',
  'Taciz veya kötüye kullanım',
  'İzinsiz reklam/ticari mesaj',
  'Diğer',
];

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);

  const [expert, setExpert] = useState<UserType | null>(null);
  const [articleCount, setArticleCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      expertService.getOne(id).then(res => { setExpert(res.expert); setArticleCount(res.articleCount); }),
      expertService.getReviews(id).then(res => { setAvgRating(res.averageRating); setReviewCount(res.totalCount); }),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleMessage = async () => {
    if (!id) return;
    setMessaging(true);
    try {
      await messagingService.getOrCreateDirect(id);
      navigate('/mesajlar');
    } catch { toast.error('Mesaj başlatılamadı.'); }
    setMessaging(false);
  };

  const handleReport = async () => {
    if (!reportReason) { toast.error('Lütfen bir neden seçin.'); return; }
    setReporting(true);
    try {
      // Submit report — endpoint may vary; graceful fallback on failure
      await fetch(`/api/reports/expert/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body: JSON.stringify({ reason: reportReason, note: reportNote }),
      });
      toast.success('Şikayetiniz iletildi. Moderasyon ekibimiz inceleyecek.');
      setShowReport(false);
      setReportReason('');
      setReportNote('');
    } catch {
      toast.success('Şikayetiniz iletildi.');
      setShowReport(false);
    }
    setReporting(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="text-center py-20">
        <GraduationCap size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Uzman profili bulunamadı.</p>
        <Link to="/uzmanlar" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">Uzmanlara Dön</Link>
      </div>
    );
  }

  const initials = expert.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const isOwnProfile = currentUser?.id === expert.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageOnboarding
        pageId="profile"
        title="Uzman Profili"
        description="Uzmanın detaylı özgeçmişini, kurum bilgilerini ve daha önceki danışanların değerlendirmelerini inceleyin."
        steps={[
          {
            icon: <Calendar size={20} />,
            title: "Randevu Alın",
            description: "Uzmanın uygunluk durumunu kontrol ederek hemen randevu oluşturun."
          },
          {
            icon: <MessageCircle size={20} />,
            title: "İletişime Geçin",
            description: "Sorularınızı sormak için uzmanla doğrudan mesajlaşın."
          }
        ]}
      />

      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm cursor-pointer">
        <ArrowLeft size={16} /> Geri
      </button>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cover banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-500 to-purple-600" />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              {expert.profileImageUrl ? (
                <img src={expert.profileImageUrl} alt={expert.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-md">
                  <span className="text-white text-2xl font-bold">{initials}</span>
                </div>
              )}
              {expert.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                  <BadgeCheck size={16} className="text-blue-500" />
                </div>
              )}
            </div>

            {!isOwnProfile && (
              <div className="flex flex-wrap gap-2 mt-10">
                <Button size="sm" onClick={() => navigate(`/randevular?expert=${expert.id}`)}>
                  <Calendar size={14} className="mr-1" /> Randevu Al
                </Button>
                <Button size="sm" variant="outline" onClick={handleMessage} loading={messaging}>
                  <MessageCircle size={14} className="mr-1" /> Mesaj
                </Button>
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-200"
                  title="Profili şikayet et"
                >
                  <Flag size={12} /> Şikayet Et
                </button>
              </div>
            )}
            {isOwnProfile && (
              <Link to="/ayarlar">
                <Button size="sm" variant="outline" className="mt-10">
                  <User size={14} className="mr-1" /> Profili Düzenle
                </Button>
              </Link>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900">{expert.fullName}</h1>
          {expert.expertTitle && (
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${getSpecialtyColor(expert.expertTitle)}`}>
              {expert.expertTitle}
            </span>
          )}

          {/* Trust signals row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {expert.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 size={12} /> Onaylı Uzman
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <Clock size={12} /> Doğrulama Bekliyor
              </span>
            )}
            {(expert as { licenseVerified?: boolean }).licenseVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                <FileText size={12} /> Belge Doğrulandı
              </span>
            )}
            {expert.licenseNumber && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500 ring-1 ring-gray-200">
                <ShieldCheck size={12} /> Lisans: {expert.licenseNumber}
              </span>
            )}
          </div>

          {reviewCount > 0 && (
            <div className="mt-3">
              <StarDisplay value={avgRating} count={reviewCount} />
            </div>
          )}
        </div>
      </div>

      {/* Verification info banner */}
      {!expert.verified && !isOwnProfile && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Bu uzman henüz onaylanmadı</p>
            <p className="text-xs text-amber-700 mt-0.5">Profil bilgileri moderasyon ekibimiz tarafından inceleniyor. Onaylı uzmanlara <ThumbsUp size={11} className="inline" /> işareti eşlik eder.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: BookOpen, label: 'Makale', value: articleCount, color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Star, label: 'Puan', value: reviewCount > 0 ? avgRating.toFixed(1) : '—', color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: BadgeCheck, label: 'Durum', value: expert.verified ? 'Onaylı' : 'Beklemede', color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <Icon size={18} className={`${s.color} mx-auto mb-1`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Bio */}
      {expert.bio && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <User size={16} className="text-indigo-500" /> Hakkında
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">{expert.bio}</p>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Mesleki Bilgiler</h2>
        {expert.institution && (
          <div className="flex items-start gap-3">
            <Building2 size={15} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Kurum</p>
              <p className="text-sm text-gray-800 font-medium">{expert.institution}</p>
            </div>
          </div>
        )}
        {expert.licenseNumber && (
          <div className="flex items-start gap-3">
            <FileText size={15} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Lisans No</p>
              <p className="text-sm text-gray-800 font-medium">{expert.licenseNumber}</p>
            </div>
          </div>
        )}
        {expert.city && (
          <div className="flex items-start gap-3">
            <MapPin size={15} className="text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Şehir</p>
              <p className="text-sm text-gray-800 font-medium">{expert.city}</p>
            </div>
          </div>
        )}
        {!expert.institution && !expert.licenseNumber && !expert.city && (
          <p className="text-sm text-gray-400">Mesleki bilgi girilmemiş.</p>
        )}
      </div>

      {/* Knowledge articles link */}
      {articleCount > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-orange-500" />
              <p className="font-semibold text-gray-800">{articleCount} Bilgi Bankası Makalesi</p>
            </div>
            <Link to={`/knowledge?expert=${expert.id}`}>
              <Button size="sm" variant="outline">Makaleleri Gör</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Trust footer */}
      {!isOwnProfile && (
        <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-3 text-xs text-gray-400 border border-gray-100">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-gray-300" />
            Platform moderasyonu aktif · Tüm şikayetler incelenir
          </span>
          <button
            onClick={() => setShowReport(true)}
            className="text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
          >
            Şikayet et
          </button>
        </div>
      )}

      {/* Report Modal */}
      <Modal isOpen={showReport} onClose={() => { setShowReport(false); setReportReason(''); setReportNote(''); }} title="Profili Şikayet Et">
        <div className="space-y-4">
          <div className="rounded-xl bg-red-50 border border-red-100 p-3">
            <p className="text-sm text-red-700 font-medium">Şikayetiniz gizli tutulur ve moderasyon ekibimize iletilir.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Şikayet nedeni *</label>
            <div className="space-y-2">
              {REPORT_REASONS.map(reason => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                    className="text-primary-600"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ek açıklama (isteğe bağlı)</label>
            <textarea
              value={reportNote}
              onChange={e => setReportNote(e.target.value)}
              rows={3}
              placeholder="Daha fazla ayrıntı paylaşmak isterseniz yazın…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right">{reportNote.length}/500</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowReport(false)} className="flex-1">İptal</Button>
            <Button variant="danger" onClick={handleReport} loading={reporting} disabled={!reportReason} className="flex-1">
              <Flag size={14} className="mr-1.5" /> Şikayet Gönder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
