import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby, Tag as TagIcon, Users, ChevronRight, ChevronDown,
  ChevronLeft, Check, Sparkles, ArrowRight, Activity, GraduationCap,
  MessageCircle, TrendingUp, BookOpen, HeartHandshake,
  FileText, ShieldAlert, ShieldCheck, Search
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { childService } from '@/services/childService';
import { tagService } from '@/services/tagService';
import { groupService } from '@/services/groupService';
import { expertService } from '@/services/expertService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { Tag, Group, User } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  ILETISIM: 'İletişim',
  SOSYAL: 'Sosyal',
  DUYUSAL: 'Duyusal',
  DAVRANIS: 'Davranış',
  MOTOR: 'Motor',
  EGITIM: 'Eğitim',
};

const CATEGORY_SELECTED_COLORS: Record<string, string> = {
  ILETISIM: 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-600 text-white shadow-md shadow-blue-100',
  SOSYAL: 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-100',
  DUYUSAL: 'bg-gradient-to-r from-purple-600 to-purple-500 border-purple-600 text-white shadow-md shadow-purple-100',
  DAVRANIS: 'bg-gradient-to-r from-orange-500 to-orange-400 border-orange-500 text-white shadow-md shadow-orange-100',
  MOTOR: 'bg-gradient-to-r from-rose-500 to-rose-400 border-rose-500 text-white shadow-md shadow-rose-100',
  EGITIM: 'bg-gradient-to-r from-teal-600 to-teal-500 border-teal-600 text-white shadow-md shadow-teal-100',
};

const CATEGORY_IDLE_COLORS: Record<string, string> = {
  ILETISIM: 'border-blue-100/80 bg-blue-50/30 text-blue-700 hover:bg-blue-50',
  SOSYAL: 'border-emerald-100/80 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50',
  DUYUSAL: 'border-purple-100/80 bg-purple-50/30 text-purple-700 hover:bg-purple-50',
  DAVRANIS: 'border-orange-100/80 bg-orange-50/30 text-orange-700 hover:bg-orange-50',
  MOTOR: 'border-rose-100/80 bg-rose-50/30 text-rose-700 hover:bg-rose-50',
  EGITIM: 'border-teal-100/80 bg-teal-50/30 text-teal-700 hover:bg-teal-50',
};

const STEPS = [
  { label: 'Çocuk Profili',   icon: Baby,           color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { label: 'Semptomlar',      icon: TagIcon,         color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Topluluk',        icon: Users,           color: 'text-green-600',  bg: 'bg-green-100'  },
  { label: 'Terapi Programı', icon: Activity,        color: 'text-orange-600', bg: 'bg-orange-100' },
  { label: 'Uzman Eşleştir',  icon: GraduationCap,  color: 'text-teal-600',   bg: 'bg-teal-100'   },
];

const THERAPY_OPTIONS = [
  'ABA Terapisi',
  'Dil ve Konuşma Terapisi',
  'Mesleki Terapi (OT)',
  'Özel Eğitim',
  'Duyu Bütünleme',
  'Sosyal Beceri Eğitimi',
  'Davranış Desteği',
  'Müzik Terapisi',
  'Spor ve Fizik Egzersiz',
];

const FOCUS_OPTIONS = ['İletişim', 'Sosyal oyun', 'Duyusal düzenleme', 'Davranış takibi'];
const COMMUNICATION_OPTIONS = ['Tek sözcük', 'Kısa cümle', 'Jest/mimik', 'Henüz sınırlı'];
const SUPPORT_OPTIONS = ['Görsel destek', 'Kısa yönerge', 'Rutin planı', 'Duyusal mola'];


const SITE_AREAS = [
  {
    icon: Sparkles,
    title: 'Ana Sayfa',
    desc: 'Sıradaki 3 adımı önem sırasına göre gösterir.',
  },
  {
    icon: TrendingUp,
    title: 'İlerleme Özeti',
    desc: 'Kayıtları eğilim ve takip özetine dönüştürür.',
  },
  {
    icon: MessageCircle,
    title: 'Mesaj ve Randevu',
    desc: 'Uzman iletişimi ve seans akışını toparlar.',
  },
  {
    icon: BookOpen,
    title: 'Rehberler',
    desc: 'Zor anlar ve günlük yaşam için kısa yollar sunar.',
  },
];

const ROLE_STARTS = {
  EXPERT: {
    title: 'Klinik çalışma alanınızı hazırlayalım',
    subtitle: 'Danışan takibi, rapor, risk önceliği, terapi planı ve güvenli paylaşım akışlarını ilk girişte netleştirelim.',
    badge: 'Doktor başlangıcı',
    cards: [
      {
        icon: ShieldAlert,
        title: 'Klinik takip ve risk',
        desc: 'Danışan özetleri, seans notları ve öncelik isteyen durumlar aynı akışta görünür.',
        to: '/danisanlarim',
        cta: 'Danışanlara git',
      },
      {
        icon: FileText,
        title: 'Rapor ve terapi planı',
        desc: 'BEP raporu, seans hedefleri ve aileye verilecek ev çalışmaları düzenli ilerler.',
        to: '/bep-raporu',
        cta: 'Raporu aç',
      },
      {
        icon: ShieldCheck,
        title: 'Mahremiyet ve hızlı akış',
        desc: 'Paylaşılan ilerleme bilgilerini kontrol edip günlük işleri tek bakışta toparlayın.',
        to: '/paylasimli-ilerleme',
        cta: 'Paylaşımı gör',
      },
    ],
  },
  ADMIN: {
    title: 'Yönetim paneline hızlı başlangıç',
    subtitle: 'Platform durumunu izlemek, uzman başvurularını görmek ve içerik akışını yönetmek için temel alanlar hazır.',
    badge: 'Yönetici başlangıcı',
    cards: [
      {
        icon: TrendingUp,
        title: 'Platform özetini inceleyin',
        desc: 'Kullanıcı, uzman ve rapor durumlarını ana sayfadan takip edin.',
        to: '/anasayfa',
        cta: 'Özeti aç',
      },
      {
        icon: ShieldCheck,
        title: 'Uzman başvurularını yönetin',
        desc: 'Bekleyen uzmanları ve doğrulama durumlarını yönetim panelinden kontrol edin.',
        to: '/admin/experts',
        cta: 'Başvurular',
      },
      {
        icon: BookOpen,
        title: 'İçerikleri gözden geçirin',
        desc: 'Bilgi bankası ve destek içeriklerinin yayına hazır olduğundan emin olun.',
        to: '/admin/content',
        cta: 'İçerikler',
      },
    ],
  },
} as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setOnboardingCompleted, user, isOnboardingCompleted } = useAuthStore();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    diagnosisInfo: '',
    primaryFocus: '',
    communicationLevel: '',
    supportNeed: '',
  });
  const [nameError, setNameError] = useState('');
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);

  // Step 2
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTagsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return tagsByCategory;
    const q = searchQuery.toLocaleLowerCase('tr-TR');
    const result: Record<string, Tag[]> = {};
    for (const [cat, tags] of Object.entries(tagsByCategory)) {
      const filtered = tags.filter(t => t.name.toLocaleLowerCase('tr-TR').includes(q));
      if (filtered.length > 0) {
        result[cat] = filtered;
      }
    }
    return result;
  }, [tagsByCategory, searchQuery]);

  // Step 3
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Step 4
  const [selectedTherapies, setSelectedTherapies] = useState<Set<string>>(new Set());
  const [therapyFrequency, setTherapyFrequency] = useState('');

  // Step 5
  const [experts, setExperts] = useState<User[]>([]);

  useEffect(() => {
    tagService.getTagsByCategory().then(setTagsByCategory).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 3) groupService.search('').then(setGroups).catch(() => {});
    if (step === 5) expertService.getAll().then(exps => setExperts(exps.slice(0, 3))).catch(() => {});
  }, [step]);

  const handleStep1 = async () => {
    if (!form.name.trim()) {
      setNameError('Çocuğun adı zorunludur.');
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const child = await childService.create({
        name: form.name,
        birthDate: form.birthDate,
        diagnosisInfo: form.diagnosisInfo,
        educationProgram: form.primaryFocus ? `Başlangıç odağı: ${form.primaryFocus}` : undefined,
        therapies: [form.communicationLevel, form.supportNeed].filter(Boolean).join(' · ') || undefined,
        privacySettings: {
          onboardingPlan: {
            primaryFocus: form.primaryFocus,
            communicationLevel: form.communicationLevel,
            supportNeed: form.supportNeed,
          },
        },
      });
      setCreatedChildId(child.id);
      setStep(2);
    } catch {
      toast.error('Profil oluşturulamadı. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  const handleStep2 = async () => {
    if (createdChildId && selectedTagIds.size > 0) {
      setLoading(true);
      try {
        await childService.update(createdChildId, { tagIds: Array.from(selectedTagIds) });
      } catch { /* skip */ }
      setLoading(false);
    }
    setStep(3);
  };

  const handleJoinGroup = async (id: string) => {
    setJoiningId(id);
    try {
      await groupService.join(id);
      setJoinedIds(prev => new Set([...prev, id]));
    } catch { toast.error('Gruba katılınamadı.'); }
    setJoiningId(null);
  };

  const handleStep4 = async () => {
    if (createdChildId && selectedTherapies.size > 0) {
      setLoading(true);
      try {
        const therapiesStr = [
          ...Array.from(selectedTherapies),
          therapyFrequency ? `Sıklık: ${therapyFrequency}` : '',
        ].filter(Boolean).join(' · ');
        await childService.update(createdChildId, { therapies: therapiesStr });
      } catch { /* skip */ }
      setLoading(false);
    }
    setStep(5);
  };

  const handleFinish = () => {
    setOnboardingCompleted();
    navigate('/', { replace: true });
  };

  // Guard: eğer bu kullanıcı zaten tamamladıysa direkt dashboard'a
  if (isOnboardingCompleted()) {
    navigate('/', { replace: true });
    return null;
  }

  const progress = step === 0 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;
  const lineProgress = step <= 1 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;
  const roleStart = user?.role === 'EXPERT' || user?.role === 'ADMIN' ? ROLE_STARTS[user.role] : null;

  if (roleStart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="font-semibold text-gray-800 hidden sm:block">Otizm Destek Platformu</span>
          </div>
          <button
            onClick={handleFinish}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            Ana sayfaya geç
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="flex flex-1 items-start justify-center px-4 py-12">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-7 py-7 sm:px-9 sm:py-8 border-b border-gray-50">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                <Sparkles size={13} />
                {roleStart.badge}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{roleStart.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{roleStart.subtitle}</p>
            </div>

            <div className="grid gap-3 px-7 py-6 sm:px-9 sm:grid-cols-3">
              {roleStart.cards.map(({ icon: Icon, title, desc, to, cta }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    setOnboardingCompleted();
                    navigate(to);
                  }}
                  className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm"
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 ring-1 ring-indigo-100 transition-transform group-hover:scale-105">
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-bold text-gray-900">{title}</span>
                  <span className="mt-1.5 flex-1 text-xs leading-5 text-gray-500">{desc}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                    {cta}
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-50 bg-slate-50/70 px-7 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9">
              <p className="text-xs font-medium leading-5 text-slate-500">
                Bu seçimler yalnızca başlangıç yönlendirmesidir; tüm sayfalara menüden daha sonra ulaşabilirsiniz.
              </p>
              <Button onClick={() => {
                setOnboardingCompleted();
                navigate('/anasayfa', { replace: true });
              }}>
                Ana sayfaya geç
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_48%,_#f0fdfa_100%)] flex flex-col relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-teal-100/30 blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-100/20 blur-[100px] pointer-events-none z-0" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/40 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200">
            <span className="text-white font-extrabold text-sm">O</span>
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight hidden sm:block">Otizm Destek Platformu</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-slate-100 relative z-10">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step pills / Stepper */}
      {step > 0 && (
        <div className="w-full max-w-3xl mx-auto px-4 pt-8 pb-4 relative z-10">
          <div className="relative flex items-center justify-between">
            {/* Connecting Line background */}
            <div className="absolute left-[20px] right-[20px] top-5 h-0.5 bg-slate-100 -z-10" />
            {/* Connecting Line active fill */}
            <div 
              className="absolute left-[20px] top-5 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out -z-10" 
              style={{ width: `${lineProgress}%` }}
            />

            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              const Icon = s.icon;
              
              return (
                <div key={n} className="flex flex-col items-center flex-1 relative group">
                  {/* Circle Button */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                    done ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50' :
                    active ? 'bg-white text-indigo-600 border-2 border-indigo-500 shadow-md ring-4 ring-indigo-50 scale-110' :
                    'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                  }`}>
                    {done ? (
                      <Check size={18} className="stroke-[3]" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <span className={`mt-2.5 text-xs font-bold transition-all duration-300 hidden sm:block ${
                    active ? 'text-indigo-600 scale-105' : 
                    done ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card content */}
      <div className={`flex-1 flex ${step === 0 ? 'items-center' : 'items-start'} justify-center px-4 relative z-10 ${step === 0 ? 'py-8' : 'pb-16'}`}>
        <div className={step === 0 ? 'w-full max-w-5xl' : 'w-full max-w-2xl'}>

          {/* ──── STEP 0 — Tanıtım ──── */}
          {step === 0 && (
            <div className="overflow-hidden rounded-[32px] bg-white border border-white/60 shadow-2xl shadow-indigo-100/30 flex flex-col sm:flex-row">

              {/* ── SOL — Gradient hero ── */}
              <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex flex-col px-8 pt-9 pb-9 overflow-hidden sm:w-[42%] shrink-0">
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
                {/* Orbs */}
                <div className="absolute -right-14 -top-14 h-64 w-64 rounded-full bg-white/8 blur-3xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-56 w-56 rounded-full bg-purple-300/20 blur-3xl pointer-events-none" />
                <div className="absolute right-8 bottom-12 h-24 w-24 rounded-full bg-violet-300/25 blur-2xl pointer-events-none" />

                {/* Badge */}
                <div className="relative z-10 inline-flex items-center gap-2 self-start rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Otizm Destek Platformu</span>
                </div>

                {/* Başlık */}
                <div className="relative z-10 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                    Hoş geldiniz
                    {user?.fullName ? (
                      <span className="block text-indigo-200 mt-0.5">{user.fullName.split(' ')[0]}! 👋</span>
                    ) : '!'}
                  </h1>
                  <p className="mt-3 text-sm font-medium text-indigo-100/75 leading-relaxed">
                    Çocuğunuza en iyi desteği sunabilmek için kişiselleştirilmiş bir platform hazırladık.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    {[
                      { label: 'Kişisel terapi planı', emoji: '🎯' },
                      { label: 'Uzman desteği',        emoji: '👨‍⚕️' },
                      { label: 'Aile toplulukları',    emoji: '👨‍👩‍👧' },
                      { label: 'İlerleme takibi',      emoji: '📊' },
                    ].map(p => (
                      <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/20 px-3 py-1.5 text-[11px] font-bold text-white/90">
                        <span>{p.emoji}</span>{p.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Güven şeridi */}
                <div className="relative z-10 mt-7 flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <HeartHandshake size={16} className="text-white/80" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white/90">Güvenli &amp; Gizli</p>
                    <p className="text-[10px] font-medium text-white/50">Verileriniz yalnızca size aittir.</p>
                  </div>
                </div>
              </div>

              {/* ── SAĞ — Adımlar + özellikler + CTA ── */}
              <div className="bg-white flex flex-col px-8 py-8 flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Kurulum — 3 Adım</p>

                <div className="space-y-2.5">
                  {[
                    { n: 1, title: 'Çocuk Profili',      desc: 'İsim, doğum tarihi, tanı ve destek ihtiyaçları.',   icon: Baby,          g: 'from-indigo-500 to-indigo-600', glow: 'shadow-indigo-200' },
                    { n: 2, title: 'Semptom & Topluluk', desc: 'Belirtileri işaretleyin, benzer ailelerle buluşun.', icon: Users,         g: 'from-violet-500 to-purple-600', glow: 'shadow-violet-200' },
                    { n: 3, title: 'Terapi & Uzman',     desc: 'Terapi programı ve uzman eşleştirme.',              icon: GraduationCap, g: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-200' },
                  ].map(item => (
                    <div key={item.n} className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200 cursor-default">
                      <div className={`relative shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${item.g} flex items-center justify-center shadow-sm ${item.glow} group-hover:scale-105 transition-transform duration-200`}>
                        <item.icon size={18} className="text-white" />
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[8px] font-black text-slate-500">{item.n}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-800">{item.title}</p>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-slate-100 my-5" />

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6">
                  {[
                    { icon: Sparkles,      text: 'Size özel ana sayfa' },
                    { icon: TrendingUp,    text: 'Gelişim grafikleri' },
                    { icon: MessageCircle, text: 'Güvenli mesajlaşma' },
                    { icon: BookOpen,      text: 'Güncel rehberler' },
                  ].map(f => (
                    <div key={f.text} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <f.icon size={12} className="text-indigo-500" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">{f.text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <button
                    onClick={() => setStep(1)}
                    className="relative w-full overflow-hidden inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                    <Sparkles size={15} className="relative z-10" />
                    <span className="relative z-10">Kuruluma Başlayalım</span>
                    <ChevronRight size={16} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                  <p className="text-center text-[10px] font-medium text-slate-400 mt-2.5">
                    ⏱ Ortalama kurulum süresi: <span className="text-indigo-500 font-bold">3 dakika</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 1 ──── */}
          {step === 1 && (
            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[28px] overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[240px] shrink-0 bg-gradient-to-br from-indigo-50/80 to-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 p-7 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200/60">
                  <Baby size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Adım 1 / 5</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Çocuk Profili</h2>
                  <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">Temel bilgilerle başlayın. Bu profil benzer ailelerle eşleşmenizi sağlar.</p>
                </div>
                <div className="hidden sm:flex flex-col gap-2.5 mt-1">
                  {['Ad ve doğum tarihi', 'Tanı bilgisi', 'Başlangıç odağı ve iletişim düzeyi'].map(item => (
                    <div key={item} className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                      <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={9} className="text-indigo-600 stroke-[3]" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {/* Form */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-7 py-7 space-y-4 overflow-y-auto">
                  <div>
                    <Input
                      label="Çocuğun Adı *"
                      value={form.name}
                      onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                      placeholder="Adını giriniz"
                      className="border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl h-11"
                    />
                    {nameError && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                        {nameError}
                      </p>
                    )}
                  </div>
                  <Input
                    label="Doğum Tarihi"
                    type="date"
                    value={form.birthDate}
                    onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                    className="border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl h-11"
                  />
                  <TextArea
                    label="Tanı Bilgisi"
                    value={form.diagnosisInfo}
                    onChange={e => setForm(f => ({ ...f, diagnosisInfo: e.target.value }))}
                    placeholder="Otizm spektrum bozukluğu, seviye... gibi"
                    className="border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl min-h-[72px]"
                  />
                  <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100/60 p-4 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Başlangıç odağı</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Ana sayfa önerileri bu bilgiyle kişiselleşir.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {FOCUS_OPTIONS.map(option => {
                        const sel = form.primaryFocus === option;
                        return (
                          <button key={option} type="button"
                            onClick={() => setForm(f => ({ ...f, primaryFocus: f.primaryFocus === option ? '' : option }))}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between text-left cursor-pointer transition-all duration-200 ${sel ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200'}`}
                          >
                            <span>{option}</span>
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${sel ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                              {sel && <Check size={8} className="stroke-[3] text-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'İletişim düzeyi', key: 'communicationLevel' as const, opts: COMMUNICATION_OPTIONS },
                      { label: 'En gerekli destek', key: 'supportNeed' as const, opts: SUPPORT_OPTIONS },
                    ].map(({ label, key, opts }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                        <div className="relative">
                          <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 transition-all outline-none cursor-pointer appearance-none text-slate-800">
                            <option value="">Seçiniz</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-3 pointer-events-none text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100">
                  <Button onClick={handleStep1} loading={loading}
                    className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-bold rounded-2xl shadow-md shadow-indigo-100 cursor-pointer text-white">
                    Devam Et <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 2 ──── */}
          {step === 2 && (
            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[28px] overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[240px] shrink-0 bg-gradient-to-br from-purple-50/80 to-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 p-7 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200/60">
                  <TagIcon size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Adım 2 / 5</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Semptom Etiketleri</h2>
                  <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">Gözlemlenen belirtileri seçin. Eşleştirme ve öneriler için kullanılır.</p>
                </div>
                <div className="hidden sm:flex flex-col gap-2.5 mt-1">
                  {['Kategori bazlı etiketler', 'Hızlı arama desteği', 'Benzer aile eşleşmesi'].map(item => (
                    <div key={item} className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                      <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={9} className="text-purple-600 stroke-[3]" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                {selectedTagIds.size > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mt-auto rounded-xl bg-purple-600 px-3 py-2">
                    <Check size={13} className="text-white stroke-[3] shrink-0" />
                    <span className="text-xs font-black text-white">{selectedTagIds.size} etiket seçildi</span>
                  </div>
                )}
              </div>
              {/* İçerik */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-7 py-6 space-y-4 overflow-y-auto">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input placeholder="Semptomlarda ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl h-10 w-full" />
                  </div>
                  <div className="relative">
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 pb-8">
                      {Object.keys(filteredTagsByCategory).length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8 font-medium">Aramanıza uygun etiket bulunamadı.</p>
                      )}
                      {Object.entries(filteredTagsByCategory).map(([cat, tags]) => (
                        <div key={cat} className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{CATEGORY_LABELS[cat] || cat}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => {
                              const sel = selectedTagIds.has(tag.id);
                              return (
                                <button key={tag.id}
                                  onClick={() => setSelectedTagIds(prev => { const n = new Set(prev); sel ? n.delete(tag.id) : n.add(tag.id); return n; })}
                                  className={`px-3 py-1.5 rounded-full text-xs border font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${sel ? (CATEGORY_SELECTED_COLORS[cat] || 'bg-indigo-600 border-indigo-600 text-white') : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30'}`}
                                >
                                  {sel ? <Check size={10} className="stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* scroll fade + hint */}
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <ChevronDown size={12} className="animate-bounce" />
                        kaydır
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl cursor-pointer">
                    <ChevronLeft size={16} className="mr-1" /> Geri
                  </Button>
                  <Button onClick={handleStep2} loading={loading} className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 font-bold rounded-2xl shadow-md shadow-indigo-100 cursor-pointer text-white">
                    {selectedTagIds.size === 0 ? 'Atla' : 'Devam Et'} <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 3 ──── */}
          {step === 3 && (
            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[28px] overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[240px] shrink-0 bg-gradient-to-br from-emerald-50/80 to-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 p-7 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200/60">
                  <Users size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Adım 3 / 5</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Topluluk Grupları</h2>
                  <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">Benzer ailelerin bulunduğu destek gruplarına katılın.</p>
                </div>
                <div className="hidden sm:flex flex-col gap-2.5 mt-1">
                  {['Özel destek grupları', 'Anında katılım', 'İstediğinizde ayrılabilirsiniz'].map(item => (
                    <div key={item} className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={9} className="text-emerald-600 stroke-[3]" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                {joinedIds.size > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mt-auto rounded-xl bg-emerald-600 px-3 py-2">
                    <Check size={13} className="text-white stroke-[3] shrink-0" />
                    <span className="text-xs font-black text-white">{joinedIds.size} gruba katıldınız</span>
                  </div>
                )}
              </div>
              {/* İçerik */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="relative flex-1">
                  <div className="px-7 py-6 space-y-3 max-h-[400px] overflow-y-auto pb-10">
                    {groups.length === 0 && (
                      <div className="text-center py-12">
                        <Users size={32} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Henüz grup bulunmuyor.</p>
                        <p className="text-xs text-slate-300 mt-1">Topluluklar oluştukça burada görünecek.</p>
                      </div>
                    )}
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 font-extrabold text-white text-sm shadow-sm">
                          {group.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{group.name}</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">{group.category || 'Destek'}</span>
                            {group.memberCount} üye
                          </p>
                        </div>
                        <button onClick={() => handleJoinGroup(group.id)} disabled={joinedIds.has(group.id) || joiningId === group.id}
                          className={`shrink-0 h-8 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer ${joinedIds.has(group.id) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-70`}>
                          {joiningId === group.id ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" /> : joinedIds.has(group.id) ? <><Check size={11} className="stroke-[3]" /> Katıldı</> : 'Katıl'}
                        </button>
                      </div>
                    ))}
                  </div>
                  {groups.length > 3 && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <ChevronDown size={12} className="animate-bounce" /> kaydır
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl cursor-pointer">
                    <ChevronLeft size={16} className="mr-1" /> Geri
                  </Button>
                  <Button onClick={() => setStep(4)} className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 font-bold rounded-2xl shadow-md shadow-indigo-100 cursor-pointer text-white">
                    Devam Et <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 4 ──── */}
          {step === 4 && (
            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[28px] overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[240px] shrink-0 bg-gradient-to-br from-orange-50/80 to-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 p-7 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200/60">
                  <Activity size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Adım 4 / 5</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Terapi Programı</h2>
                  <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">Alınan veya planlanan terapileri ve sıklığını belirleyin.</p>
                </div>
                <div className="hidden sm:flex flex-col gap-2.5 mt-1">
                  {['Terapi türü seçimi', 'Seans sıklığı', 'Uzman önerileri için veri'].map(item => (
                    <div key={item} className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                      <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={9} className="text-orange-500 stroke-[3]" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                {selectedTherapies.size > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mt-auto rounded-xl bg-orange-500 px-3 py-2">
                    <Check size={13} className="text-white stroke-[3] shrink-0" />
                    <span className="text-xs font-black text-white">{selectedTherapies.size} terapi seçildi</span>
                  </div>
                )}
              </div>
              {/* İçerik */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-7 py-6 space-y-5 overflow-y-auto">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Terapi türleri</p>
                    <div className="relative">
                      <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 pb-8">
                        {THERAPY_OPTIONS.map(t => {
                          const sel = selectedTherapies.has(t);
                          return (
                            <button key={t} type="button"
                              onClick={() => setSelectedTherapies(prev => { const n = new Set(prev); sel ? n.delete(t) : n.add(t); return n; })}
                              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between text-left cursor-pointer transition-all duration-200 ${sel ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-700 hover:border-orange-300 hover:bg-orange-50/20'}`}>
                              <span>{t}</span>
                              <span className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${sel ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                                {sel && <Check size={7} className="stroke-[3] text-white" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <ChevronDown size={12} className="animate-bounce" /> kaydır
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Haftalık seans sıklığı</label>
                    <div className="relative">
                      <select value={therapyFrequency} onChange={e => setTherapyFrequency(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/30 transition-all outline-none cursor-pointer appearance-none">
                        <option value="">Seçiniz</option>
                        {['Haftada 1','Haftada 2-3','Haftada 4-5','Her gün'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-11 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl cursor-pointer">
                    <ChevronLeft size={16} className="mr-1" /> Geri
                  </Button>
                  <Button onClick={handleStep4} loading={loading} className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 font-bold rounded-2xl shadow-md shadow-indigo-100 cursor-pointer text-white">
                    {selectedTherapies.size === 0 ? 'Atla' : 'Kaydet ve Devam'} <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 5 ──── */}
          {step === 5 && (
            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[28px] overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[240px] shrink-0 bg-gradient-to-br from-teal-50/80 to-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 p-7 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-200/60">
                  <GraduationCap size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Adım 5 / 5</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Uzman Eşleştirme</h2>
                  <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">Platformumuzdaki onaylı uzman kadromuzu keşfedin.</p>
                </div>
                <div className="hidden sm:flex flex-col gap-2.5 mt-1">
                  {['Onaylı uzman profilleri', 'Detaylı filtreleme', 'Online randevu kolaylığı'].map(item => (
                    <div key={item} className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                      <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={9} className="text-teal-600 stroke-[3]" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block mt-auto rounded-2xl bg-teal-50 border border-teal-100/60 p-3">
                  <p className="text-[10px] font-black text-teal-700 flex items-center gap-1.5 mb-1">
                    <Sparkles size={11} className="text-teal-600" /> Son adım
                  </p>
                  <p className="text-[10px] font-medium text-teal-600 leading-relaxed">
                    Kurulum sonrası Uzmanlar sayfasından tüm kadroyu filtreleyebilirsiniz.
                  </p>
                </div>
              </div>
              {/* İçerik */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-7 py-6 space-y-3 overflow-y-auto">
                  {experts.length === 0 && (
                    <div className="text-center py-12">
                      <GraduationCap size={32} className="mx-auto text-slate-200 mb-3 animate-pulse" />
                      <p className="text-sm font-bold text-slate-400">Uzmanlar yükleniyor...</p>
                    </div>
                  )}
                  <div className="relative">
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 pb-8">
                      {experts.map(expert => (
                        <div key={expert.id} className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-teal-200 hover:shadow-sm transition-all duration-200">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center shrink-0 font-extrabold text-white text-sm shadow-md shadow-teal-100/50">
                            {expert.fullName?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-slate-800">{expert.fullName}</p>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">{expert.expertTitle || 'Uzman Danışman'}</p>
                          </div>
                          {expert.verified && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg">
                              <Check size={10} className="stroke-[3]" /> Onaylı
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {experts.length > 3 && (
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-1.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <ChevronDown size={12} className="animate-bounce" /> kaydır
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1 h-11 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl cursor-pointer">
                    <ChevronLeft size={16} className="mr-1" /> Geri
                  </Button>
                  <Button onClick={handleFinish} className="flex-1 h-11 bg-gradient-to-r from-teal-600 to-emerald-600 font-bold rounded-2xl shadow-md shadow-teal-100 cursor-pointer text-white flex items-center justify-center gap-1.5">
                    <Sparkles size={14} /> Platforma Başla
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-[10px] font-semibold text-slate-400 mt-4">
            {step === 0 ? 'Başlangıç kurulumu · Profil sonrası adımları ana sayfada tamamlayabilirsiniz' : `Adım ${step} / ${STEPS.length} · İstediğiniz zaman atlayabilirsiniz`}
          </p>
        </div>
      </div>
    </div>
  );
}
