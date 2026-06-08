import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import {
  HeartHandshake,
  CheckCircle,
  User,
  Briefcase,
  ShieldCheck,
  Lock,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Building2,
  FileText,
  Mail,
  Users,
  Award,
  Sparkles,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  X,
} from 'lucide-react';

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1 – Kişisel Bilgiler
  fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string()
    .refine(
      (val) => !val || /^(\+90|0)?\d{10,11}$/.test(val.replace(/[\s\-\(\)]/g, '')),
      { message: 'Geçerli bir telefon numarası giriniz (Örn: 05XX XXX XX XX)' }
    )
    .optional(),
  city: z.string().optional(),

  // Step 2 – Uzmanlık Bilgileri
  expertTitle: z.string().min(2, 'Uzmanlık alanı zorunludur'),
  institution: z.string().optional(),
  licenseNumber: z.string().min(3, 'Lisans veya diploma numarası zorunludur'),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),

  // Step 3 – Güvenlik
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  confirmPassword: z.string().min(1, 'Şifre tekrarını giriniz'),
  kvkkConsent: z.boolean().refine((val) => val, 'KVKK onayı zorunludur'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

// ─── Steps Config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Kişisel Bilgiler', icon: User,      desc: 'Ad, e-posta, konum' },
  { id: 2, label: 'Uzmanlık',         icon: Briefcase, desc: 'Mesleki bilgileriniz' },
  { id: 3, label: 'Güvenlik',         icon: Lock,      desc: 'Şifre ve onay' },
];

const SPECIALIZATION_OPTIONS = [
  'Otizm Spektrum Bozukluğu (OSB)',
  'Erken Müdahale',
  'ABA Terapisi',
  'Dil & Konuşma Terapisi',
  'Duyu Bütünleme (SI)',
  'Ergoterapi',
  'Oyun Terapisi',
  'Aile Danışmanlığı',
  'Sosyal Beceri Eğitimi',
  'Akademik Destek',
  'PECS & AAC',
  'Davranış Analizi',
];

const EXPERT_TITLES = [
  'Çocuk Psikoloğu',
  'Özel Eğitim Uzmanı',
  'Konuşma ve Dil Terapisti',
  'Ergoterapi Uzmanı',
  'Çocuk Psikiyatristi',
  'Nörolog',
  'Davranış Analisti (BCBA)',
  'Sosyal Hizmet Uzmanı',
  'Diğer',
];

const WHY_JOIN = [
  {
    icon: Users,
    title: 'Binlerce aileye ulaşın',
    desc: 'Platformumuzda yer alan ailelere güvenilir rehberlik sunun',
  },
  {
    icon: Award,
    title: 'Onaylı uzman rozeti',
    desc: 'Doğrulanmış kimliğinizle güven ve itibar kazanın',
  },
  {
    icon: Sparkles,
    title: 'Bilgi bankası oluşturun',
    desc: 'Makaleler ve rehberler paylaşarak etki alanınızı genişletin',
  },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Çok zayıf', color: 'bg-red-400' };
  if (score === 2) return { score, label: 'Zayıf', color: 'bg-orange-400' };
  if (score === 3) return { score, label: 'Orta', color: 'bg-yellow-400' };
  if (score === 4) return { score, label: 'Güçlü', color: 'bg-emerald-400' };
  return { score, label: 'Çok güçlü', color: 'bg-emerald-500' };
}

export function ExpertRegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [kvkk, setKvkk] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedPassword = watch('password', '');
  const strength = getPasswordStrength(watchedPassword || passwordValue);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const stepFields: Record<number, (keyof FormData)[]> = {
    1: ['fullName', 'email', 'phone', 'city'],
    2: ['expertTitle', 'institution', 'licenseNumber', 'bio', 'specializations'],
    3: ['password', 'confirmPassword', 'kvkkConsent'],
  };

  const toggleSpec = (spec: string) => {
    const next = selectedSpecs.includes(spec)
      ? selectedSpecs.filter(s => s !== spec)
      : [...selectedSpecs, spec];
    setSelectedSpecs(next);
    setValue('specializations', next, { shouldValidate: true });
  };

  const goNext = async () => {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => s + 1);
  };

  const goPrev = () => setStep((s) => s - 1);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const authResponse = await authService.register({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        password: data.password,
        kvkkConsent: data.kvkkConsent,
        role: 'EXPERT',
        expertTitle: data.expertTitle,
        institution: data.institution,
        licenseNumber: data.licenseNumber,
        bio: data.bio,
        specializations: selectedSpecs,
      });
      setAuth(authResponse.user, authResponse.accessToken, authResponse.refreshToken);
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        (err instanceof Error ? err.message : 'Kayıt olurken bir hata oluştu');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Already logged in as EXPERT ─────────────────────────────────────────────

  if (isAuthenticated && user?.role === 'EXPERT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4">
        <div className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/60 border border-white p-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-200/50 mb-6">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Zaten Uzmansınız</h1>
          <p className="text-gray-500 mb-6 text-sm">
            <span className="font-semibold text-gray-700">{user.fullName}</span> hesabınız halihazırda uzman olarak tanımlı.
          </p>
          <Button className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 border-0 h-11" onClick={() => navigate('/uzmanlar')}>
            Uzmanlar Sayfasına Dön
          </Button>
        </div>
      </div>
    );
  }

  // ── Already logged in as PARENT ──────────────────────────────────────────────

  if (isAuthenticated && user?.role !== 'EXPERT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/60 border border-white p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mb-5">
              <ShieldCheck size={28} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Uzman Başvurusu</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Şu an <span className="font-semibold text-gray-700">{user?.fullName}</span> olarak giriş yaptınız.
              Uzman hesabı oluşturmak için <strong>yeni bir kayıt</strong> gerekiyor.
              Önce çıkış yapıp, ardından uzman kaydı oluşturabilirsiniz.
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 border-0 h-11 text-white font-semibold"
                onClick={() => { logout(); }}
              >
                Çıkış Yap ve Başvur
              </Button>
              <Button variant="outline" className="w-full rounded-xl border-gray-200 text-gray-600" onClick={() => navigate('/uzmanlar')}>
                Geri Dön
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success Screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4">
        <div className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/60 border border-white p-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
            }}
          >
            <CheckCircle size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Başvurunuz Alındı!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Uzman hesabınız oluşturuldu ve oturumunuz açıldı. Hesabınızı hemen kullanabilirsiniz.
            Ekibimiz belgelerinizi inceledikten sonra{' '}
            <span className="text-indigo-600 font-bold">Onaylı Uzman</span>{' '}
            rozetiniz aktifleşecektir.
          </p>
          <div
            className="rounded-2xl p-5 mb-6 text-left border"
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderColor: '#fcd34d',
            }}
          >
            <p className="text-sm text-amber-800 font-bold mb-1">📋 Sonraki adımlar:</p>
            <ul className="text-xs text-amber-700 space-y-1.5 mt-2">
              <li>• Hesabınıza hemen giriş yapabilirsiniz — bazı özellikler onay sonrası açılır.</li>
              <li>• Ekibimiz başvurunuzu 1-3 iş günü içinde inceler.</li>
              <li>• Onay sonrası profilinizde "Onaylı Uzman" rozeti aktif olur.</li>
            </ul>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 border-0 h-11"
            size="lg"
            onClick={() => navigate('/')}
          >
            Dashboard'a Git
          </Button>
        </div>
      </div>
    );
  }

  // ── Main Layout ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* ── Left Panel (Hidden on Mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-primary-950 text-white p-12 flex-col justify-between">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />
        
        {/* Logo and Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <HeartHandshake size={24} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Otizm Destek
            </span>
            <span className="block text-[10px] tracking-widest uppercase text-primary-400 font-semibold">
              Uzman Platformu
            </span>
          </div>
        </div>

        {/* Dynamic Centerpiece */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-primary-300 font-medium">
              <Sparkles size={12} className="animate-pulse text-yellow-400" />
              <span>Otizm Aileleri İçin Rehberlik Ağı</span>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-[1.15]">
              Bilgi ve Deneyiminizle <br />
              <span className="bg-gradient-to-r from-primary-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                Ailelere Umut Olun
              </span>
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm">
              Otizm Destek Platformu'na katılarak mesleki uzmanlığınızı paylaşın, binlerce aileye doğru rehberlik sunun ve onaylı uzman profilinizle görünürlüğünüzü artırın.
            </p>
          </div>

          {/* Value Propositions */}
          <div className="space-y-4">
            {WHY_JOIN.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0 border border-primary-500/30 group-hover:scale-110 transition-transform">
                  <item.icon className="text-primary-400" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info link */}
        <div className="relative z-10 border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">
            Ebeveyn misiniz?{' '}
            <Link to="/kayit" className="text-primary-400 font-semibold hover:text-primary-300 transition-colors">
              Ebeveyn Kaydı Yapın →
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 my-8">
          
          {/* Mobile header */}
          <div className="text-center lg:text-left">
            <div className="lg:hidden inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-200/50 mb-4">
              <HeartHandshake size={26} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Uzman Başvurusu</h1>
            <p className="text-gray-500 text-sm mt-2">
              Platformumuza uzman olarak katılmak için bilgilerinizi eksiksiz girin.
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator current={step} />

          {/* Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/60 border border-white p-8 mt-4">
            
            {/* Step Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              {STEPS.map((s) =>
                s.id === step ? (
                  <div
                    key={s.id}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary-100"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    }}
                  >
                    <s.icon size={20} />
                  </div>
                ) : null
              )}
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  {STEPS.find((s) => s.id === step)?.label}
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {STEPS.find((s) => s.id === step)?.desc}
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">!</div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* ══ STEP 1 ══ */}
              {step === 1 && (
                <>
                  {/* Ad Soyad */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ad Soyad</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Dr. Ayşe Kaya"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                          errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm'
                        }`}
                        {...register('fullName')}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
                  </div>

                  {/* E-posta */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">E-posta</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        placeholder="ornek@hastane.com"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                          errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm'
                        }`}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                  </div>

                  {/* Telefon */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Telefon (opsiyonel)</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Phone size={18} />
                      </div>
                      <input
                        type="tel"
                        placeholder="05XX XXX XX XX"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        {...register('phone')}
                      />
                    </div>
                  </div>

                  {/* Şehir */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Şehir (opsiyonel)</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <MapPin size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Örn: İstanbul, Ankara, İzmir"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        {...register('city')}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ══ STEP 2 ══ */}
              {step === 2 && (
                <>
                  {/* Uzmanlık Alanı – Quick Select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Uzmanlık Alanı</label>
                    <div className="flex flex-wrap gap-2 mb-3.5">
                      {EXPERT_TITLES.map((title) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => {
                            setSelectedTitle(title);
                            setValue('expertTitle', title, { shouldValidate: true });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                            selectedTitle === title
                              ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white border-transparent shadow-sm'
                              : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                          }`}
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <GraduationCap size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="veya buraya yazın..."
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                          errors.expertTitle ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm'
                        }`}
                        {...register('expertTitle')}
                        onChange={(e) => {
                          setSelectedTitle(e.target.value);
                          register('expertTitle').onChange(e);
                        }}
                      />
                    </div>
                    {errors.expertTitle && (
                      <p className="text-xs text-red-600 mt-1">{errors.expertTitle.message}</p>
                    )}
                  </div>

                  {/* Kurum */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kurum / Klinik (opsiyonel)</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Building2 size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Örn: Ankara Çocuk Hastanesi"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        {...register('institution')}
                      />
                    </div>
                  </div>

                  {/* Lisans No */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Lisans / Diploma No *</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <FileText size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Mesleki lisans numaranız (Örn: Tescil No)"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                          errors.licenseNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm'
                        }`}
                        {...register('licenseNumber')}
                      />
                    </div>
                    {errors.licenseNumber && <p className="text-xs text-red-600 mt-1">{errors.licenseNumber.message}</p>}
                  </div>

                  {/* Uzmanlık Alt Alanları */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Uzmanlık Alt Alanları
                      {selectedSpecs.length > 0 && (
                        <span className="ml-2 text-primary-600 normal-case font-bold">({selectedSpecs.length} seçildi)</span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATION_OPTIONS.map(spec => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleSpec(spec)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                            selectedSpecs.includes(spec)
                              ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white border-transparent shadow-sm'
                              : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                          }`}
                        >
                          {spec}
                          {selectedSpecs.includes(spec) && <X size={11} />}
                        </button>
                      ))}
                    </div>
                    {selectedSpecs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setSelectedSpecs([]); setValue('specializations', []); }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors mt-1"
                      >
                        Tümünü temizle
                      </button>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Kendinizi Tanıtın (opsiyonel)</label>
                    <textarea
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400 shadow-sm transition-all duration-200"
                      rows={3}
                      placeholder="Deneyimleriniz ve ailelere nasıl yardımcı olabileceğinizi anlatın..."
                      {...register('bio')}
                    />
                  </div>
                </>
              )}

              {/* ══ STEP 3 ══ */}
              {step === 3 && (
                <>
                  {/* Şifre */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Şifre</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="En az 8 karakter"
                        className={`w-full pl-11 pr-10 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                          errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm'
                        }`}
                        {...register('password', {
                          onChange: (e) => setPasswordValue(e.target.value),
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}

                    {/* Password strength bar */}
                    {(watchedPassword || passwordValue) && (
                      <div className="mt-2.5 space-y-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i <= strength.score ? strength.color : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">Şifre Gücü:</span>
                          <span className={`text-[10px] font-bold ${
                            strength.score <= 1 ? 'text-red-500' :
                            strength.score === 2 ? 'text-orange-500' :
                            strength.score === 3 ? 'text-yellow-600' : 'text-emerald-600'
                          }`}>
                            {strength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Şifre Tekrar */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Şifre Tekrar</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifrenizi tekrar girin"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                          errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm'
                        }`}
                        {...register('confirmPassword')}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Info note */}
                  <div
                    className="rounded-xl p-4 text-xs flex items-start gap-3 border bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border-indigo-100/50"
                  >
                    <ShieldCheck size={18} className="text-primary-600 shrink-0 mt-0.5" />
                    <p className="text-indigo-700 leading-relaxed">
                      Uzman hesabınız güvenlik protokolleri gereği ekibimizin onayından sonra aktifleşecektir.
                      Başvuru onaylandığında size e-posta göndereceğiz.
                    </p>
                  </div>

                  {/* KVKK */}
                  <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-2xl border border-indigo-100/50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          {...register('kvkkConsent')}
                          onChange={(e) => setKvkk(e.target.checked)}
                        />
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                          kvkk
                            ? 'bg-primary-600 border-primary-600 shadow-md shadow-primary-200'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}>
                          {kvkk && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed select-none">
                        <strong className="text-gray-700">KVKK Aydınlatma Metni:</strong> Kişisel verilerimin otizm destek platformu tarafından işlenmesine, saklanmasına ve korunmasına ilişkin{' '}
                        <Link to="/kvkk" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-semibold underline hover:text-primary-700">
                          aydınlatma metnini
                        </Link>{' '}
                        okudum ve onaylıyorum.
                      </span>
                    </label>
                    {errors.kvkkConsent && (
                      <p className="text-xs text-red-600 mt-2 ml-8 font-medium">{errors.kvkkConsent.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* ── Navigation Buttons ── */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none"
                  >
                    <ChevronLeft size={16} />
                    Geri
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:opacity-95 active:scale-[0.99] focus:outline-none"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      boxShadow: '0 8px 24px rgba(79,70,229,0.25)',
                    }}
                  >
                    Devam Et
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 border-0 h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary-200/50"
                    size="lg"
                    loading={loading}
                  >
                    Başvuruyu Tamamla
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Footer links */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Zaten hesabınız var mı?{' '}
            <Link to="/giris" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator Component ─────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, idx) => {
        const isCompleted = current > step.id;
        const isActive = current === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={
                  isCompleted
                    ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }
                    : isActive
                    ? {
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                      }
                    : { background: '#f1f5f9', color: '#94a3b8' }
                }
              >
                {isCompleted ? <CheckCircle size={18} /> : step.id}
              </div>
              <p
                className="text-[10px] mt-1.5 font-semibold whitespace-nowrap"
                style={{ color: isActive ? '#4f46e5' : isCompleted ? '#10b981' : '#94a3b8' }}
              >
                {step.label}
              </p>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500"
                style={{
                  background: isCompleted ? 'linear-gradient(to right, #10b981, #059669)' : '#e2e8f0',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
