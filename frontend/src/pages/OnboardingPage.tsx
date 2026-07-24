import { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Baby, Tag as TagIcon, Users, ChevronRight, ChevronDown,
  ChevronLeft, Check, Sparkles, ArrowRight, Activity,
  TrendingUp, BookOpen,
  CalendarCheck, FileText, ShieldAlert, ShieldCheck, Search
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { childService } from '@/services/childService';
import { tagService } from '@/services/tagService';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { toast } from '@/store/toastStore';
import type { Tag, Child } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  ILETISIM: 'İletişim',
  SOSYAL: 'Sosyal',
  DUYUSAL: 'Duyusal',
  DAVRANIS: 'Davranış',
  MOTOR: 'Motor',
  EGITIM: 'Eğitim',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  ILETISIM: 'Konuşma, anlama ve kendini ifade etme',
  SOSYAL: 'Göz teması, arkadaşlık, paylaşma',
  DUYUSAL: 'Ses, ışık, dokunma ve hareket hassasiyeti',
  DAVRANIS: 'Tekrarlayan hareketler, rutin ve uyum güçlükleri',
  MOTOR: 'Yürüme, koşma, el ve parmak becerileri',
  EGITIM: 'Dikkat, öğrenme ve okul becerileri',
};

const CATEGORY_SELECTED_COLORS: Record<string, string> = {
  ILETISIM: 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-600 text-white shadow-md shadow-blue-100',
  SOSYAL: 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-100',
  DUYUSAL: 'bg-gradient-to-r from-purple-600 to-purple-500 border-purple-600 text-white shadow-md shadow-purple-100',
  DAVRANIS: 'bg-gradient-to-r from-orange-500 to-orange-400 border-orange-500 text-white shadow-md shadow-orange-100',
  MOTOR: 'bg-gradient-to-r from-rose-500 to-rose-400 border-rose-500 text-white shadow-md shadow-rose-100',
  EGITIM: 'bg-gradient-to-r from-teal-600 to-teal-500 border-teal-600 text-white shadow-md shadow-teal-100',
};


const STEPS = [
  { label: 'Çocuk Profili',   icon: Baby,           color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { label: 'Destek Alanları', icon: TagIcon,         color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Başlangıç Planı', icon: Sparkles,        color: 'text-teal-600',   bg: 'bg-teal-100'   },
];

const FOCUS_OPTIONS = ['İletişim', 'Sosyal oyun', 'Duyusal düzenleme', 'Davranış takibi'];
const COMMUNICATION_OPTIONS = ['Tek sözcük', 'Kısa cümle', 'Jest/mimik', 'Henüz sınırlı'];
const SUPPORT_OPTIONS = ['Görsel destek', 'Kısa yönerge', 'Rutin planı', 'Duyusal mola'];



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
        to: '/ayarlar?view=sharing',
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
  const { addChild } = useChildStore();

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
  const [birthDateError, setBirthDateError] = useState('');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);
  const [createdChild, setCreatedChild] = useState<Child | null>(null);
  const [existingCheckDone, setExistingCheckDone] = useState(false);
  const [existingCheckError, setExistingCheckError] = useState(false);
  const [existingCheckAttempt, setExistingCheckAttempt] = useState(0);
  const [completionLoading, setCompletionLoading] = useState(false);

  // Step 2
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsLoadError, setTagsLoadError] = useState(false);

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

  const selectedTags = useMemo(() => {
    const allTags = Object.values(tagsByCategory).flat();
    return allTags.filter(tag => selectedTagIds.has(tag.id));
  }, [selectedTagIds, tagsByCategory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTagsLoading(true);
    setTagsLoadError(false);
    tagService.getTagsByCategory()
      .then(setTagsByCategory)
      .catch(() => setTagsLoadError(true))
      .finally(() => setTagsLoading(false));
  }, []);

  const userId = user?.id;
  const userRole = user?.role;

  // Yerel saat dilimine göre bugünün tarihi (doğum tarihi üst sınırı)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Mükerrer çocuk kaydını önle: kullanıcının zaten çocuğu varsa (ör. sayfa
  // yenilendi veya farklı cihazdan girildi) 1. adımı atlayıp mevcut kayıtla devam et.
  useEffect(() => {
    if (!userId) return;
    if (userRole !== 'PARENT') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExistingCheckDone(true);
      return;
    }
    let active = true;
    setExistingCheckDone(false);
    setExistingCheckError(false);
    childService.getAll()
      .then(children => {
        if (!active || children.length === 0) return;
        const child = children[0];
        setCreatedChildId(child.id);
        setCreatedChild(child);
        setForm(f => ({ ...f, name: child.name ?? '', birthDate: child.birthDate ?? '' }));
        setStep(s => (s < 2 ? 2 : s));
      })
      .catch(() => {
        if (active) setExistingCheckError(true);
      })
      .finally(() => { if (active) setExistingCheckDone(true); });
    return () => { active = false; };
  }, [userId, userRole, existingCheckAttempt]);

  const handleStep1 = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError('Çocuğun adı zorunludur.');
      return;
    }
    setNameError('');
    if (form.birthDate && form.birthDate > todayStr) {
      setBirthDateError('Doğum tarihi gelecekte olamaz.');
      return;
    }
    setBirthDateError('');
    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        birthDate: form.birthDate || undefined,
        diagnosisInfo: form.diagnosisInfo.trim() || undefined,
        educationProgram: form.primaryFocus ? `Başlangıç odağı: ${form.primaryFocus}` : undefined,
        therapies: [form.communicationLevel, form.supportNeed].filter(Boolean).join(' · ') || undefined,
      };
      // Geri dönülüp tekrar ilerlendiğinde yeni kayıt açmak yerine mevcut kayıt güncellenir.
      const child = createdChildId
        ? await childService.update(createdChildId, payload)
        : await childService.create(payload);
      setCreatedChildId(child.id);
      setCreatedChild(child);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : '';
      toast.error(message || 'Profil oluşturulamadı. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  const handleStep2 = async () => {
    if (createdChildId && selectedTagIds.size > 0) {
      setLoading(true);
      try {
        const updatedChild = await childService.update(createdChildId, { tagIds: Array.from(selectedTagIds) });
        setCreatedChild(updatedChild);
      } catch {
        toast.error('Destek alanları kaydedilemedi. Tekrar deneyin veya bu adımı daha sonra çocuk profilinden tamamlayın.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setStep(3);
  };

  const completeAndNavigate = async (to: string) => {
    if (completionLoading) return;
    setCompletionLoading(true);
    try {
      await setOnboardingCompleted();
      if (createdChild) addChild(createdChild);
      navigate(to, { replace: true });
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : 'Başlangıç tamamlanamadı. Lütfen tekrar deneyin.';
      toast.error(message);
      setCompletionLoading(false);
    }
  };

  const handleFinish = () => void completeAndNavigate('/anasayfa');

  // Guard: eğer bu kullanıcı zaten tamamladıysa direkt dashboard'a
  if (isOnboardingCompleted()) {
    return <Navigate to="/" replace />;
  }

  const progress = step === 0 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;
  const lineProgress = step <= 1 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;
  const roleStart = user?.role === 'EXPERT' || user?.role === 'ADMIN' ? ROLE_STARTS[user.role] : null;

  // Çocuk oluşturma akışı yalnızca ebeveynler içindir; rol ekranı olmayan
  // diğer roller (ör. TEACHER) doğrudan ana sayfaya yönlendirilir.
  if (user && user.role !== 'PARENT' && !roleStart) {
    return <Navigate to="/anasayfa" replace />;
  }

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
            disabled={completionLoading}
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
                    void completeAndNavigate(to);
                  }}
                  disabled={completionLoading}
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
                void completeAndNavigate('/anasayfa');
              }} loading={completionLoading}>
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
      <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-slate-200/70 bg-white/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">O</span>
          </div>
          <span className="font-bold text-slate-800 tracking-tight">Otizm Destek Platformu</span>
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
        <div className="w-full max-w-3xl mx-auto px-5 pt-6 pb-4 relative z-10">
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
      <div className={`flex-1 flex ${step === 0 ? 'items-center' : 'items-start'} justify-center px-4 sm:px-5 relative z-10 ${step === 0 ? 'py-6 sm:py-10' : 'pb-10'}`}>
        <div className="w-full max-w-3xl">

          {/* ──── STEP 0 — Tanıtım ──── */}
          {step === 0 && (
            <div className="overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-xl shadow-indigo-100/40">
              <div className="px-6 py-7 text-center sm:px-10 sm:pt-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                  <Sparkles size={14} />
                  Yaklaşık 1 dakika
                </span>
                <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {user?.fullName ? `Hoş geldin, ${user.fullName.split(' ')[0]}` : 'Hoş geldiniz'}
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  Çocuğunuz için temel bir profil oluşturalım. Yalnızca adı zorunlu; diğer bilgileri şimdi atlayabilir veya daha sonra değiştirebilirsiniz.
                </p>
              </div>

              <div className="grid gap-3 px-5 sm:grid-cols-3 sm:px-8">
                {[
                  { title: 'Temel bilgiler', desc: 'Ad ve isteğe bağlı kısa bilgiler', icon: Baby, tone: 'bg-indigo-50 text-indigo-600' },
                  { title: 'Destek alanları', desc: 'Gözlemlediğiniz alanları seçin', icon: TagIcon, tone: 'bg-violet-50 text-violet-600' },
                  { title: 'Başlangıç önerisi', desc: 'İlk yapabileceklerinizi görün', icon: Sparkles, tone: 'bg-teal-50 text-teal-600' },
                ].map(({ title, desc, icon: Icon, tone }, index) => (
                  <div key={title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:block">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                      <Icon size={19} />
                    </span>
                    <div className="sm:mt-4">
                      <p className="text-sm font-bold text-slate-900">{index + 1}. {title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:px-8">
                <p className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 sm:mb-0 sm:justify-start">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  Bilgileriniz gizlidir ve yalnızca hesabınıza aittir.
                </p>
                <div className="sm:text-right">
                  {existingCheckError && (
                    <p role="alert" className="mb-2 text-xs font-semibold text-red-600">
                      Mevcut çocuk profilleri kontrol edilemedi.
                    </p>
                  )}
                  <Button
                    onClick={() => {
                      if (existingCheckError) {
                        setExistingCheckAttempt(attempt => attempt + 1);
                        return;
                      }
                      setStep(1);
                    }}
                    loading={!existingCheckDone}
                    className="w-full rounded-xl bg-indigo-600 px-7 font-bold text-white hover:bg-indigo-700 sm:w-auto"
                  >
                    {existingCheckError ? 'Tekrar dene' : 'Başlayalım'}
                    <ChevronRight size={17} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 1 ──── */}
          {step === 1 && (
            <div className="bg-white border border-slate-200/80 shadow-xl shadow-slate-100/70 rounded-3xl overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[210px] shrink-0 bg-indigo-50/60 border-b sm:border-b-0 sm:border-r border-indigo-100/70 p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200/60">
                  <Baby size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Adım 1 / 3</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Temel bilgiler</h2>
                  <p className="mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">Yalnızca çocuğun adı zorunludur.</p>
                </div>
              </div>
              {/* Form */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-5 py-6 sm:px-7 sm:py-7 space-y-4 overflow-y-auto">
                  <div>
                    <Input
                      label="Çocuğun adı"
                      value={form.name}
                      onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                      placeholder="Adını yazın"
                      className="border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl h-11"
                    />
                    {nameError && (
                      <div className="mt-2 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <span className="w-2 h-2 rounded-full bg-red-500 block" />
                        </span>
                        <p className="text-sm text-red-700 font-semibold">{nameError}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      label="Doğum tarihi (isteğe bağlı)"
                      type="date"
                      value={form.birthDate}
                      max={todayStr}
                      onChange={e => { setForm(f => ({ ...f, birthDate: e.target.value })); setBirthDateError(''); }}
                      className="border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl h-11"
                    />
                    {birthDateError && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">{birthDateError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOptionalDetails(value => !value)}
                    aria-expanded={showOptionalDetails}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Birkaç ayrıntı daha ekle
                    <ChevronDown size={16} className={`transition-transform ${showOptionalDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showOptionalDetails && (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <TextArea
                        label="Tanı veya kısa not (isteğe bağlı)"
                        value={form.diagnosisInfo}
                        onChange={e => setForm(f => ({ ...f, diagnosisInfo: e.target.value }))}
                        placeholder="Önemli bir not veya hassasiyet yazabilirsiniz"
                        className="border-slate-200 rounded-xl min-h-[72px]"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Öncelikli destek alanı</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {FOCUS_OPTIONS.map(option => {
                            const sel = form.primaryFocus === option;
                            return (
                              <button key={option} type="button"
                                onClick={() => setForm(f => ({ ...f, primaryFocus: f.primaryFocus === option ? '' : option }))}
                                className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-colors ${sel ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { label: 'İletişim şekli', key: 'communicationLevel' as const, opts: COMMUNICATION_OPTIONS },
                          { label: 'Yararlı olabilecek destek', key: 'supportNeed' as const, opts: SUPPORT_OPTIONS },
                        ].map(({ label, key, opts }) => (
                          <div key={key}>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
                            <div className="relative">
                              <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500">
                                <option value="">Seçim yapın</option>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-3 pointer-events-none text-slate-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100">
                  <Button onClick={handleStep1} loading={loading}
                    className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-bold rounded-2xl shadow-md shadow-indigo-100 cursor-pointer text-white">
                    Devam et <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 2 ──── */}
          {step === 2 && (
            <div className="bg-white border border-slate-200/80 shadow-xl shadow-slate-100/70 rounded-3xl overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[210px] shrink-0 bg-purple-50/60 border-b sm:border-b-0 sm:border-r border-purple-100/70 p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-md shadow-purple-200/60">
                  <TagIcon size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Adım 2 / 3</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Destek alanları</h2>
                  <p className="mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">İsterseniz gözlemlediğiniz alanları seçin.</p>
                </div>
                {selectedTagIds.size > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mt-auto rounded-xl bg-purple-600 px-3 py-2">
                    <Check size={13} className="text-white stroke-[3] shrink-0" />
                    <span className="text-xs font-black text-white">{selectedTagIds.size} alan seçildi</span>
                  </div>
                )}
              </div>
              {/* İçerik */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-5 py-6 sm:px-7 space-y-4 overflow-y-auto">
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3">
                    <p className="text-xs font-semibold leading-5 text-purple-800">
                      Bu adım isteğe bağlıdır. Emin değilseniz atlayabilirsiniz.
                    </p>
                  </div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input placeholder="Destek alanlarında ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/40 rounded-xl h-10 w-full" />
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black text-slate-800">{selectedTags.length} alan seçildi</p>
                        <button
                          type="button"
                          onClick={() => setSelectedTagIds(new Set())}
                          className="text-[11px] font-bold text-slate-400 transition-colors hover:text-purple-600"
                        >
                          Temizle
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedTags.slice(0, 5).map(tag => (
                          <span key={tag.id} className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
                            {tag.name}
                          </span>
                        ))}
                        {selectedTags.length > 5 && (
                          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            +{selectedTags.length - 5} daha
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 pb-8">
                      {tagsLoading && (
                        <p className="text-sm text-slate-400 text-center py-8 font-medium">Destek alanları yükleniyor...</p>
                      )}
                      {!tagsLoading && tagsLoadError && (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center">
                          <p className="text-sm font-bold text-amber-900">Destek alanları yüklenemedi</p>
                          <p className="mt-1 text-xs font-medium leading-5 text-amber-700">Bu adımı sonra çocuk profilinden tamamlayabilirsiniz.</p>
                        </div>
                      )}
                      {!tagsLoading && !tagsLoadError && Object.keys(filteredTagsByCategory).length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-8 font-medium">
                          {searchQuery.trim() ? 'Aramanıza uygun destek alanı bulunamadı.' : 'Henüz destek alanı bulunmuyor. Bu adımı sonra tamamlayabilirsiniz.'}
                        </p>
                      )}
                      {!tagsLoading && !tagsLoadError && Object.entries(filteredTagsByCategory).map(([cat, tags]) => (
                        <div key={cat} className="space-y-2">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{CATEGORY_LABELS[cat] || cat}</p>
                            {CATEGORY_DESCRIPTIONS[cat] && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{CATEGORY_DESCRIPTIONS[cat]}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => {
                              const sel = selectedTagIds.has(tag.id);
                              return (
                                <button key={tag.id}
                                  onClick={() => setSelectedTagIds(prev => { const n = new Set(prev); if (sel) { n.delete(tag.id); } else { n.add(tag.id); } return n; })}
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
                    {selectedTagIds.size === 0 ? 'Şimdilik atla' : 'Devam et'} <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ──── STEP 3 ──── */}
          {step === 3 && (
            <div className="bg-white border border-slate-200/80 shadow-xl shadow-slate-100/70 rounded-3xl overflow-hidden flex flex-col sm:flex-row">
              {/* Sidebar */}
              <div className="sm:w-[210px] shrink-0 bg-teal-50/60 border-b sm:border-b-0 sm:border-r border-teal-100/70 p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-200/60">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Adım 3 / 3</span>
                  <h2 className="mt-1 text-lg font-black text-slate-900 leading-snug">Profil hazır</h2>
                  <p className="mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">Şimdi ilk adımınızı seçebilirsiniz.</p>
                </div>
              </div>
              {/* İçerik */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 px-5 py-6 sm:px-7 space-y-4">
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
                    <p className="text-sm font-black text-teal-950">Her şey hazır</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-teal-700">
                      Aşağıdan bir alan seçebilir veya doğrudan ana sayfaya geçebilirsiniz.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {[
                      {
                        icon: Activity,
                        title: 'Günlük kayıt ekle',
                        desc: 'Uyku, duygu durumu veya kısa bir gözlem girin.',
                        to: '/gunluk-takip',
                        tone: 'bg-rose-50 text-rose-600 border-rose-100',
                      },
                      {
                        icon: CalendarCheck,
                        title: 'Uzmanları incele',
                        desc: 'Uzmanlara göz atın veya randevu talebi oluşturun.',
                        to: '/uzmanlar',
                        tone: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                      },
                      {
                        icon: Users,
                        title: 'Bilgi ve kaynakları keşfet',
                        desc: 'Bilgi bankasındaki güvenilir içeriklere göz atın.',
                        to: '/bilgi-bankasi',
                        tone: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                      },
                    ].map(({ icon: Icon, title, desc, to, tone }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          void completeAndNavigate(to);
                        }}
                        disabled={completionLoading}
                        className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left transition-all hover:border-teal-200 hover:bg-teal-50/20 hover:shadow-sm"
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
                          <Icon size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold text-slate-900">{title}</span>
                          <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{desc}</span>
                        </span>
                        <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-7 pb-7 pt-5 border-t border-slate-100 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl cursor-pointer">
                    <ChevronLeft size={16} className="mr-1" /> Geri
                  </Button>
                  <Button onClick={handleFinish} loading={completionLoading} className="flex-1 h-11 bg-gradient-to-r from-teal-600 to-emerald-600 font-bold rounded-2xl shadow-md shadow-teal-100 cursor-pointer text-white">
                    Ana sayfaya geç <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step > 0 && (
            <p className="text-center text-[11px] font-medium text-slate-400 mt-4">
              Seçimlerinizi daha sonra değiştirebilirsiniz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
