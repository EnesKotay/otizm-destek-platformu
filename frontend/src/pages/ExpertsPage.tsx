import { useEffect, useState } from 'react';
import {
  GraduationCap, ShieldCheck, BookOpen, Search, MessageCircle,
  Building2, BadgeCheck, Calendar, ChevronRight, Users, X,
  FileText, MapPin, Star, Trash2, Send,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { expertService, type ExpertReviewsResponse } from '@/services/expertService';
import { messagingService } from '@/services/messagingService';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import type { User } from '@/types';

// Fix 3: Türkçe normalize
function normalizeTR(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

const SPECIALTY_COLORS: Record<string, string> = {
  'ABA':          'bg-blue-100 text-blue-700',
  'Konuşma':      'bg-green-100 text-green-700',
  'Dil':          'bg-green-100 text-green-700',
  'Psikoloji':    'bg-purple-100 text-purple-700',
  'Psikolog':     'bg-purple-100 text-purple-700',
  'Özel Eğitim':  'bg-orange-100 text-orange-700',
  'Ergoterapi':   'bg-pink-100 text-pink-700',
  'Fizyoterapi':  'bg-cyan-100 text-cyan-700',
  'Nörolog':      'bg-red-100 text-red-700',
  'Psikiyatri':   'bg-rose-100 text-rose-700',
};

function getSpecialtyColor(title?: string) {
  if (!title) return 'bg-indigo-100 text-indigo-700';
  for (const [key, cls] of Object.entries(SPECIALTY_COLORS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'bg-indigo-100 text-indigo-700';
}

function extractSpecialtyLabel(title?: string): string | null {
  if (!title) return null;
  for (const key of Object.keys(SPECIALTY_COLORS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return key;
  }
  const first = title.split(/[ ,/]/)[0];
  return first || null;
}

function getSpecializationColor(spec: string): string {
  for (const [key, cls] of Object.entries(SPECIALTY_COLORS)) {
    if (spec.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'bg-indigo-100 text-indigo-700';
}

function Avatar({ expert, size = 'md' }: { expert: User; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'sm' ? 'w-10 h-10 text-base' : 'w-14 h-14 text-xl';
  return expert.profileImageUrl ? (
    <img src={expert.profileImageUrl} alt={expert.fullName} className={`${dims} rounded-2xl object-cover shrink-0`} />
  ) : (
    <div className={`${dims} rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0`}>
      <span className="text-white font-bold">{expert.fullName?.charAt(0)}</span>
    </div>
  );
}

function StarRating({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHovered(i)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
          style={{ background: 'none', border: 'none', padding: 1 }}
        >
          <Star
            size={size}
            fill={(hovered || value) >= i ? '#f59e0b' : 'none'}
            className={(hovered || value) >= i ? 'text-amber-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

interface ReviewPanelProps {
  expertId: string;
  currentUserId?: string;
}

function ReviewPanel({ expertId, currentUserId }: ReviewPanelProps) {
  const [data, setData] = useState<ExpertReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    expertService.getReviews(expertId)
      .then(res => {
        setData(res);
        const mine = res.reviews.find(r => r.reviewerId === currentUserId);
        if (mine) { setMyRating(mine.rating); setMyComment(mine.comment ?? ''); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expertId, currentUserId]);

  const handleSubmit = async () => {
    // Fix 6: puan seçilmezse uyarı
    if (!myRating) {
      toast.error('Lütfen önce bir puan seçin.');
      return;
    }
    setSubmitting(true);
    try {
      await expertService.submitReview(expertId, { rating: myRating, comment: myComment });
      const updated = await expertService.getReviews(expertId);
      setData(updated);
      setShowForm(false);
      toast.success('Değerlendirmeniz kaydedildi.');
    } catch { toast.error('Değerlendirme gönderilemedi.'); }
    setSubmitting(false);
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await expertService.deleteReview(expertId, reviewId);
      const updated = await expertService.getReviews(expertId);
      setData(updated);
      setMyRating(0); setMyComment('');
      toast.success('Değerlendirme silindi.');
    } catch { toast.error('Silinemedi.'); }
  };

  if (loading) return <div className="py-4 text-center text-sm text-gray-400">Değerlendirmeler yükleniyor...</div>;

  const myReview = data?.reviews.find(r => r.reviewerId === currentUserId);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3">
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-600">{data?.averageRating?.toFixed(1) ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{data?.totalCount ?? 0} değerlendirme</p>
        </div>
        <div className="flex-1">
          <StarRating value={Math.round(data?.averageRating ?? 0)} size={18} />
        </div>
      </div>

      {/* Add review button */}
      {currentUserId && !myReview && !showForm && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Star size={14} className="mr-1.5" />
          Değerlendirme Yaz
        </Button>
      )}

      {/* Review form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Puanınız *</p>
            <StarRating value={myRating} onChange={setMyRating} size={24} />
            {/* Fix 6: puan seçilmemişse ipucu */}
            {!myRating && (
              <p className="text-xs text-gray-400 mt-1">Göndermek için puan seçmeniz gerekiyor.</p>
            )}
          </div>
          <textarea
            value={myComment}
            onChange={e => setMyComment(e.target.value)}
            placeholder="Yorumunuz (isteğe bağlı)..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">İptal</Button>
            <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!myRating} className="flex-1">
              <Send size={13} className="mr-1" /> Gönder
            </Button>
          </div>
        </div>
      )}

      {/* My review */}
      {myReview && !showForm && (
        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-indigo-600">Sizin değerlendirmeniz</p>
            <div className="flex gap-1">
              <button onClick={() => { setMyRating(myReview.rating); setMyComment(myReview.comment ?? ''); setShowForm(true); }}
                className="text-xs text-indigo-500 hover:text-indigo-700 cursor-pointer">Düzenle</button>
              <button onClick={() => handleDelete(myReview.id)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer ml-2">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <StarRating value={myReview.rating} size={15} />
          {myReview.comment && <p className="text-xs text-gray-600 mt-1">{myReview.comment}</p>}
        </div>
      )}

      {/* Reviews list */}
      {(data?.reviews.length ?? 0) > 0 && (
        <div className="space-y-3">
          {data!.reviews.filter(r => r.reviewerId !== currentUserId).map(review => (
            <div key={review.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                {review.reviewerImageUrl
                  ? <img src={review.reviewerImageUrl} className="w-full h-full rounded-full object-cover" alt="" />
                  : <span className="text-indigo-700 text-sm font-bold">{review.reviewerName?.charAt(0)}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-800">{review.reviewerName}</p>
                  <StarRating value={review.rating} size={11} />
                </div>
                {review.comment && <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">{review.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(data?.reviews.length ?? 0) === 0 && (
        <p className="text-center text-sm text-gray-400 py-2">Henüz değerlendirme yok</p>
      )}
    </div>
  );
}

interface ExpertDetailModalProps {
  expert: User | null;
  articleCount?: number;
  onClose: () => void;
  onMessage: (id: string) => void;
  onAppointment: (id: string) => void;
  messagingId: string | null;
  currentUserId?: string;
  // Fix 7: uzmanın kendi ID'si
  isOwnProfile?: boolean;
}

function ExpertDetailModal({
  expert, articleCount, onClose, onMessage, onAppointment,
  messagingId, currentUserId, isOwnProfile,
}: ExpertDetailModalProps) {
  const [tab, setTab] = useState<'info' | 'reviews'>('info');
  if (!expert) return null;
  return (
    <Modal isOpen onClose={onClose} title="" className="max-w-3xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar expert={expert} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{expert.fullName}</h2>
              {expert.verified && <BadgeCheck size={20} className="text-blue-500 shrink-0" />}
              {/* Fix 7: kendi profiliyse badge */}
              {isOwnProfile && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Profiliniz</span>
              )}
            </div>
            {expert.expertTitle && (
              <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${getSpecialtyColor(expert.expertTitle)}`}>
                {expert.expertTitle}
              </span>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {expert.verified && (
                <div className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Onaylı Uzman</span>
                </div>
              )}
              {expert.licenseVerified && (
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                  <FileText size={11} className="text-blue-500" />
                  <span className="text-xs text-blue-600 font-semibold">Lisans Doğrulandı</span>
                </div>
              )}
            </div>
            {expert.specializations && expert.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {expert.specializations.map(s => (
                  <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSpecializationColor(s)}`}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['info', 'reviews'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'info' ? 'Profil Bilgileri' : 'Değerlendirmeler'}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <>
            {expert.bio && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{expert.bio}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {expert.institution && (
                <div className="flex items-start gap-2.5 bg-blue-50 rounded-xl p-3">
                  <Building2 size={15} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wide">Kurum</p>
                    <p className="text-sm text-blue-800 font-medium mt-0.5">{expert.institution}</p>
                  </div>
                </div>
              )}
              {expert.licenseNumber && (
                <div className="flex items-start gap-2.5 bg-emerald-50 rounded-xl p-3">
                  <FileText size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">Lisans No</p>
                    <p className="text-sm text-emerald-800 font-medium mt-0.5">{expert.licenseNumber}</p>
                  </div>
                </div>
              )}
              {expert.city && (
                // Fix 2: Phone → MapPin
                <div className="flex items-start gap-2.5 bg-purple-50 rounded-xl p-3">
                  <MapPin size={15} className="text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-purple-400 font-medium uppercase tracking-wide">Şehir</p>
                    <p className="text-sm text-purple-800 font-medium mt-0.5">{expert.city}</p>
                  </div>
                </div>
              )}
              {articleCount !== undefined && articleCount > 0 && (
                <div className="flex items-start gap-2.5 bg-orange-50 rounded-xl p-3">
                  <BookOpen size={15} className="text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wide">Makale</p>
                    <p className="text-sm text-orange-800 font-medium mt-0.5">{articleCount} yazı</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'reviews' && (
          <ReviewPanel expertId={expert.id} currentUserId={currentUserId} />
        )}

        {/* Fix 7: kendi profilinde aksiyon butonlarını gizle */}
        {!isOwnProfile && (
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={() => onAppointment(expert.id)}>
              <Calendar size={15} className="mr-1.5" />
              Randevu Al
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onMessage(expert.id)} loading={messagingId === expert.id}>
              <MessageCircle size={15} className="mr-1.5" />
              Mesaj Gönder
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ExpertsPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [experts, setExperts] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<User | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('Tümü');
  
  // Advanced filters state
  const [selectedCity, setSelectedCity] = useState<string>('Tümü');
  const [sortBy, setSortBy] = useState<string>('default');
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);

  useEffect(() => {
    expertService.getAll()
      .then(data => {
        setExperts(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Dynamically extract unique cities from loaded experts
  const cities = ['Tümü', ...Array.from(new Set(
    experts.map(e => e.city).filter(Boolean) as string[]
  ))];

  // Specializations: önce gerçek specializations tag'lerini kullan, yoksa expertTitle'dan çıkar
  const specialties = ['Tümü', ...Array.from(new Set(
    experts.flatMap(e => {
      if (e.specializations && e.specializations.length > 0) return e.specializations;
      const label = extractSpecialtyLabel(e.expertTitle);
      return label ? [label] : [];
    })
  ))];

  const filtered = experts.filter(e => {
    const q = normalizeTR(search);
    const matchesSearch = !search.trim() ||
      normalizeTR(e.fullName ?? '').includes(q) ||
      normalizeTR(e.expertTitle ?? '').includes(q) ||
      normalizeTR(e.institution ?? '').includes(q) ||
      (e.specializations ?? []).some(s => normalizeTR(s).includes(q));

    const matchesFilter = activeFilter === 'Tümü' || (() => {
      // Gerçek tag eşleşmesi
      if (e.specializations && e.specializations.some(s => normalizeTR(s) === normalizeTR(activeFilter))) return true;
      // Fallback: expertTitle'da arama
      return normalizeTR(e.expertTitle ?? '').includes(normalizeTR(activeFilter));
    })();

    const matchesCity = selectedCity === 'Tümü' || e.city === selectedCity;
    const matchesVerified = !onlyVerified || e.verified;
    const matchesRating = minRating === 0 || (e.avgRating ?? 0) >= minRating;

    return matchesSearch && matchesFilter && matchesCity && matchesVerified && matchesRating;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.avgRating ?? 0) - (a.avgRating ?? 0);
    }
    if (sortBy === 'articles') {
      return (b.articleCount ?? 0) - (a.articleCount ?? 0);
    }
    if (sortBy === 'name') {
      return (a.fullName ?? '').localeCompare(b.fullName ?? '', 'tr');
    }
    return 0; // Varsayılan (sıralama yok)
  });

  // Fix 4: konuşma ID'sini navigate'e taşı
  const handleMessage = async (expertId: string) => {
    setMessagingId(expertId);
    try {
      const conv = await messagingService.getOrCreateDirect(expertId);
      navigate('/mesajlar', { state: { openConversationId: conv.id } });
    } catch { toast.error('Mesaj başlatılamadı.'); }
    setMessagingId(null);
  };

  const handleAppointment = (expertId: string) => {
    navigate(`/randevular?expert=${expertId}`);
  };

  const verifiedCount = experts.filter(e => e.verified).length;

  const hasActiveFilter = search.trim() || 
    activeFilter !== 'Tümü' || 
    selectedCity !== 'Tümü' || 
    onlyVerified || 
    minRating > 0 || 
    sortBy !== 'default';

  // Fix 8: filtre + arama temizle
  const clearFilters = () => {
    setSearch('');
    setActiveFilter('Tümü');
    setSelectedCity('Tümü');
    setOnlyVerified(false);
    setMinRating(0);
    setSortBy('default');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageOnboarding
        pageId="experts"
        title="Uzmanlara Hoş Geldiniz"
        description="Alanında uzman kişilerle iletişime geçin, değerlendirmeleri okuyun ve kolayca randevu alın."
        steps={[
          { icon: <Search size={20} />, title: "Uzman Arayın", description: "Şehir, uzmanlık alanı veya kuruma göre uzmanları filtreleyin." },
          { icon: <Calendar size={20} />, title: "Randevu Alın", description: "Uzmanın profiline giderek takvimindeki uygun saatler için randevu oluşturun." },
          { icon: <MessageCircle size={20} />, title: "Mesajlaşın", description: "Uzmanlara sistem üzerinden güvenle mesaj gönderin." }
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Uzmanlar</h1>
          <p className="text-gray-500 mt-1 text-sm">Platformumuzun onaylı ve alanında uzman kadrosuyla tanışın</p>
        </div>
      </div>

      {/* İstatistik Kartları */}
      {!loading && experts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Toplam Uzman Kartı */}
          <div
            onClick={() => {
              setActiveFilter('Tümü');
              setSelectedCity('Tümü');
              setOnlyVerified(false);
              setMinRating(0);
              setSortBy('default');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              activeFilter === 'Tümü' && selectedCity === 'Tümü' && !onlyVerified && minRating === 0
                ? 'bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border-indigo-200 shadow-sm'
                : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kayıtlı Uzmanlar</p>
              <p className="text-2xl font-bold text-gray-900">{experts.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-100/80 flex items-center justify-center text-indigo-600 transition-colors">
              <Users size={20} />
            </div>
          </div>

          {/* Onaylı Uzmanlar Kartı */}
          <div
            onClick={() => setOnlyVerified(!onlyVerified)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              onlyVerified
                ? 'bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border-emerald-200 shadow-sm'
                : 'bg-white border-gray-100 hover:border-emerald-100 hover:shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Onaylı Profiller</p>
              <p className="text-2xl font-bold text-gray-900">{verifiedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-100/80 flex items-center justify-center text-emerald-600 transition-colors">
              <BadgeCheck size={20} />
            </div>
          </div>

          {/* Popüler Uzmanlar Kartı */}
          <div
            onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              minRating === 4.5
                ? 'bg-gradient-to-br from-amber-50/60 to-orange-50/60 border-amber-200 shadow-sm'
                : 'bg-white border-gray-100 hover:border-amber-100 hover:shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Yüksek Puanlılar (4.5+)</p>
              <p className="text-2xl font-bold text-gray-900">
                {experts.filter(e => (e.avgRating ?? 0) >= 4.5).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-100/80 flex items-center justify-center text-amber-600 transition-colors">
              <Star size={20} className="fill-amber-400 text-amber-400" />
            </div>
          </div>
        </div>
      )}

      {/* Uzman Ol CTA */}
      {user?.role !== 'EXPERT' && (
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Siz de uzman mısınız?</p>
              <p className="text-indigo-100 text-xs mt-0.5">Onaylı uzman rozeti alarak ailelere güvenle ulaşın, destek olun</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/kayit/uzman')}
            className="shrink-0 px-4 py-2 bg-white text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            Başvur
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: 'Belge ve lisans kontrolü',
            detail: 'Onaylı rozet, başvuru bilgilerinin ekip tarafından incelendiğini gösterir.',
          },
          {
            icon: Calendar,
            title: 'Randevu öncesi netlik',
            detail: 'Uzman, şehir, kurum ve çalışma alanı bilgileri seçimden önce görünür.',
          },
          {
            icon: MessageCircle,
            title: 'Platform içi güvenli iletişim',
            detail: 'İlk temas ve takip mesajları platform içinde kayıtlı şekilde ilerler.',
          },
        ].map(({ icon: Icon, title, detail }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Icon size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Arama ve Gelişmiş Filtre Kontrolleri */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Arama Alanı */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Uzman adı, uzmanlık alanı veya kurum ara..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Şehir Seçici */}
          <div className="w-full lg:w-48">
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
            >
              <option value="Tümü">Tüm Şehirler</option>
              {cities.filter(c => c !== 'Tümü').map(city => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Sıralama Seçici */}
          <div className="w-full lg:w-48">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
            >
              <option value="default">Varsayılan Sıralama</option>
              <option value="rating">En Yüksek Puan</option>
              <option value="articles">En Çok Makale</option>
              <option value="name">İsim (A - Z)</option>
            </select>
          </div>

          {/* Harita Görünümü Butonu */}
          <button
            onClick={() => navigate('/uzman-harita')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-indigo-100 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <MapPin size={16} />
            Harita & Kurumlar
          </button>
        </div>

        {/* Alt Filtre Barı (Onaylı Switch'i ve Temizleme Butonu) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={e => setOnlyVerified(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-2 text-xs font-semibold text-gray-700 flex items-center gap-1">
                <BadgeCheck size={14} className="text-blue-500" />
                Yalnızca Onaylı Uzmanlar
              </span>
            </label>

            {minRating > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-100">
                <Star size={11} className="fill-amber-400 text-amber-400" /> 4.5+ Puan
              </span>
            )}
          </div>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
            >
              <X size={12} />
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Specialty Filters */}
      {!loading && specialties.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {specialties.map(s => (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                activeFilter === s
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Expert Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={32} />}
          title="Uzman bulunamadı"
          description={
            hasActiveFilter
              ? `Arama kriterlerinize uyan uzman bulunamadı. Filtreleri temizlemeyi deneyin.`
              : 'Henüz uzman kaydı bulunmuyor.'
          }
          action={hasActiveFilter ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X size={13} className="mr-1" /> Filtreleri Temizle
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(expert => {
            // Fix 7: kendi kartını tespit et
            const isSelf = user?.id === expert.id;

            return (
              <Card
                key={expert.id}
                className="flex flex-col hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-300 cursor-pointer group p-5 bg-white border border-gray-100 rounded-2xl"
                onClick={() => setSelectedExpert(expert)}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar expert={expert} size="md" />
                    {expert.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-50">
                        <BadgeCheck size={14} className="text-blue-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                            {expert.fullName}
                          </h3>
                          {isSelf && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Sen</span>
                          )}
                        </div>
                        {expert.expertTitle && (
                          <span className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg ${getSpecialtyColor(expert.expertTitle)}`}>
                            {expert.expertTitle}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Specialization tags */}
                {expert.specializations && expert.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {expert.specializations.slice(0, 3).map(s => (
                      <span key={s} className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getSpecializationColor(s)}`}>
                        {s}
                      </span>
                    ))}
                    {expert.specializations.length > 3 && (
                      <span className="text-[9px] font-semibold text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded-md">
                        +{expert.specializations.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {expert.bio && (
                  <p className="mt-3 text-xs text-gray-500 line-clamp-2 leading-relaxed font-light">{expert.bio}</p>
                )}

                {/* Info block */}
                <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-2 flex-1 justify-end">
                  {expert.institution && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Building2 size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate font-medium">{expert.institution}</span>
                    </div>
                  )}

                  {expert.city && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin size={13} className="text-purple-400 shrink-0" />
                      <span className="truncate font-medium">{expert.city}</span>
                    </div>
                  )}

                  {(expert.avgRating ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />
                      <span className="font-bold text-gray-800">{(expert.avgRating ?? 0).toFixed(1)}</span>
                      <span className="text-gray-400 font-light">({expert.reviewCount ?? 0} değerlendirme)</span>
                    </div>
                  )}

                  {(expert.articleCount ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <BookOpen size={13} className="text-gray-400 shrink-0" />
                      <span className="font-medium">{expert.articleCount} bilgi bankası yazısı</span>
                    </div>
                  )}

                  {!expert.verified && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50/60 border border-amber-100/50 px-2 py-1 rounded-xl mt-1 w-max">
                      <Users size={10} />
                      <span>Doğrulama sürecinde</span>
                    </div>
                  )}
                </div>

                {/* Fix 7: kendi kartında aksiyon butonları gizle */}
                {!isSelf && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button size="sm" className="flex-1 rounded-xl shadow-sm hover:shadow-md transition-shadow" onClick={() => handleAppointment(expert.id)}>
                      <Calendar size={13} className="mr-1" />
                      Randevu Al
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl hover:bg-gray-50 transition-colors" onClick={() => handleMessage(expert.id)} loading={messagingId === expert.id}>
                      <MessageCircle size={13} className="mr-1" />
                      Mesaj
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Platform Trust Strip */}
      {!loading && experts.length > 0 && (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-4 justify-between shadow-sm">
          <div className="flex flex-wrap gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><BadgeCheck size={13} className="text-blue-500" /> Onaylı uzmanlar moderasyon ekibimizce doğrulanır</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-500" /> Lisans doğrulaması gerçek belgelerle yapılır</span>
            <span className="flex items-center gap-1.5"><Star size={13} className="text-amber-400" /> Yorumlar gerçek kullanıcılardan gelir</span>
          </div>
          <Link to="/yardim" className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2 shrink-0 font-medium">
            Sorun Bildir
          </Link>
        </div>
      )}

      {/* Expert Detail Modal */}
      {selectedExpert && (
        <ExpertDetailModal
          expert={selectedExpert}
          articleCount={selectedExpert.articleCount}
          onClose={() => setSelectedExpert(null)}
          onMessage={handleMessage}
          onAppointment={handleAppointment}
          messagingId={messagingId}
          currentUserId={user?.id}
          isOwnProfile={user?.id === selectedExpert.id}
        />
      )}
    </div>
  );
}
