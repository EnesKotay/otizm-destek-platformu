import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { toast } from '@/store/toastStore';
import {
  HeartHandshake, Mail, Lock, Eye, EyeOff,
  ArrowRight, Loader2, Shield, Sparkles,
  Brain, Users, CalendarCheck, CheckCircle2,
  BadgeCheck, FileCheck2, PlayCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const schema = z.object({
  email:      z.string().email('Geçerli bir e-posta adresi giriniz'),
  password:   z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

const QUOTES = [
  'Bugün için küçük, uygulanabilir bir adım yeterli olabilir.',
  'Düzenli notlar, zor günleri daha anlaşılır hale getirir.',
  'Gelişim takibi sakin, kısa ve sürdürülebilir olduğunda işe yarar.',
  'Aile ve uzman aynı bilgiyi gördüğünde görüşmeler daha net ilerler.',
  'Her kayıt, bir sonraki adımı biraz daha görünür kılar.',
];

const FEATURES = [
  {
    icon: Brain,
    color: 'bg-primary-500/20 border-primary-500/30',
    iconColor: 'text-primary-400',
    title: 'BEP ve hedef hazırlığı',
    desc: 'Uzmanın düzenleyip tamamlayabileceği hedef ve rapor taslakları.',
  },
  {
    icon: Users,
    color: 'bg-emerald-500/20 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    title: 'Uzman ve aile iletişimi',
    desc: 'Randevu, mesaj ve paylaşım izinlerini aynı yerden takip edin.',
  },
  {
    icon: CalendarCheck,
    color: 'bg-indigo-400/20 border-indigo-400/30',
    iconColor: 'text-indigo-300',
    title: 'Günlük takip akışı',
    desc: 'Duygu, uyku, ilaç ve kısa gözlemleri yorulmadan kaydedin.',
  },
];

const TRUST_ITEMS = [
  { icon: Shield, label: 'İzin ve gizlilik akışı' },
  { icon: BadgeCheck, label: 'Onaylı uzman profilleri' },
  { icon: FileCheck2, label: 'Çocuk verisi için güvenli kayıt' },
];

export function LoginPage() {
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake]               = useState(false);
  const [quoteIdx, setQuoteIdx]         = useState(0);
  const [quoteFade, setQuoteFade]       = useState(true);
  const { setAuth }                     = useAuthStore();
  const navigate                        = useNavigate();
  const location                        = useLocation();

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => { setQuoteIdx(i => (i + 1) % QUOTES.length); setQuoteFade(true); }, 400);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const initialEmail = location.state?.email || '';

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail, rememberMe: false },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authService.login(data);
      setAuth(res.user, res.accessToken, res.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        (err instanceof Error ? err.message : 'Giriş yapılırken bir hata oluştu');
      setErrorMsg(msg);
      toast.error(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ══════════════════════════════════════
          SOL PANEL — RegisterPage ile birebir aynı yapı
      ══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-primary-950 text-white p-12 flex-col justify-between">

        {/* Glow efektleri — RegisterPage ile aynı */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

        {/* Logo — RegisterPage ile aynı */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <HeartHandshake size={24} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Otizm Destek
            </span>
            <span className="block text-[10px] tracking-widest uppercase text-primary-400 font-semibold">
              Gelişim Platformu
            </span>
          </div>
        </div>

        {/* Orta içerik */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-primary-300 font-medium">
              <Sparkles size={12} className="text-primary-300" />
              <span>Günlük takip ve güvenli paylaşım</span>
            </div>

            {/* Dönen alıntı — login'e özgü */}
            <div
              className="transition-all duration-500"
              style={{ opacity: quoteFade ? 1 : 0, transform: quoteFade ? 'translateY(0)' : 'translateY(6px)' }}
            >
              <h2 className="text-4xl font-extrabold tracking-tight leading-[1.15]">
                <span className="bg-gradient-to-r from-primary-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                  "{QUOTES[quoteIdx]}"
                </span>
              </h2>
            </div>

            {/* Nokta göstergesi */}
            <div className="flex items-center gap-1.5 pt-1">
              {QUOTES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setQuoteIdx(i); setQuoteFade(true); }}
                  className={cn(
                    'rounded-full transition-all duration-300 cursor-pointer',
                    i === quoteIdx ? 'w-6 h-1.5 bg-primary-400' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40',
                  )}
                />
              ))}
            </div>

            <p className="text-slate-300 leading-relaxed text-sm">
              Otizm Destek Platformu, çocuk bilgilerini, günlük kayıtları ve uzman iletişimini tek düzenli çalışma alanında toplar.
            </p>
          </div>

          {/* Özellik kartları — RegisterPage ile aynı yapı */}
          <div className="space-y-4">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300 group">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-110 transition-transform', f.color)}>
                  <f.icon className={f.iconColor} size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{f.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alt — RegisterPage ile aynı */}
        <div className="relative z-10 border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">© 2025 Otizm Destek Platformu</p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SAĞ PANEL
      ══════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-5 sm:p-8 md:p-12 overflow-y-auto">
        <div className={cn(
          'w-full max-w-lg my-6',
          shake && 'animate-[shake_0.45s_ease-in-out]',
        )}>

          {/* Mobil logo */}
          <div className="lg:hidden flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200/50">
              <HeartHandshake size={22} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-gray-900 leading-none">Otizm Destek</p>
              <p className="text-xs text-gray-400 mt-0.5">Gelişim Platformu</p>
            </div>
          </div>

          {/* Başlık */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-3 py-1.5 shadow-sm">
              <CheckCircle2 size={14} className="text-primary-600" />
              <span className="text-xs font-bold text-primary-700">Tekrar hoş geldiniz</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Hesabınıza giriş yapın
            </h1>
            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-slate-600">
              Bugünün kaydı, randevular ve mesajlar tek düzenli alanda sizi bekliyor.
            </p>
          </div>

          {/* Hata */}
          {errorMsg && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">!</div>
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Form Kartı */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Giriş bilgileri</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">E-posta ve şifrenizle devam edin.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                Güvenli
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* E-posta */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">E-posta</label>
                <div className="group relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    className={`h-12 w-full rounded-2xl border pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                      errors.email
                        ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white focus:border-primary-300 focus:bg-white focus:ring-primary-100'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email?.message && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              {/* Şifre */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Şifre</label>
                  <Link to="/sifremi-unuttum" className="text-xs font-bold text-primary-600 transition-colors hover:text-primary-700">
                    Şifremi Unuttum
                  </Link>
                </div>
                <div className="group relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="En az 8 karakter"
                    className={`h-12 w-full rounded-2xl border pl-11 pr-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                      errors.password
                        ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white focus:border-primary-300 focus:bg-white focus:ring-primary-100'
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password?.message && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>

              {/* Beni hatırla */}
              <label className="flex w-fit cursor-pointer select-none items-center gap-3 group">
                <div className="relative w-5 h-5 shrink-0">
                  <input type="checkbox" className="peer sr-only" {...register('rememberMe')} />
                  <div className="h-5 w-5 rounded-lg border-2 border-slate-300 bg-white shadow-sm transition-all duration-200 peer-checked:border-primary-600 peer-checked:bg-primary-600" />
                  <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-800">Beni hatırla</span>
              </label>

              {/* Buton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary-600 hover:bg-primary-700
                           disabled:bg-slate-300 disabled:cursor-not-allowed
                           text-white font-black text-sm rounded-2xl
                           shadow-lg shadow-primary-200/60 hover:shadow-primary-300/60
                           flex items-center justify-center gap-2 group
                           hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
                           transition-all duration-150 cursor-pointer mt-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Giriş Yapılıyor...</>
                ) : (
                  <><span>Giriş Yap</span><ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-700 shadow-sm">
                <item.icon size={15} className="shrink-0 text-primary-600" />
                <span className="text-xs font-bold leading-snug">{item.label}</span>
              </div>
            ))}
          </div>

          {/* ── Kaydol bölümü ── */}
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Hesabınız yok mu?</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Size uygun hesap türünü seçin.</p>
              </div>
              <Link to="/tanitim" className="hidden text-xs font-black text-primary-600 hover:text-primary-700 sm:inline-flex">
                Keşfet
              </Link>
            </div>

            {/* Kartlar */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/kayit"
                className="group flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-700 ring-1 ring-primary-100">
                  <Users size={18} className="text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">Veli hesabı</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Ücretsiz kaydol</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-primary-600 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link to="/kayit/uzman"
                className="group flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-700 ring-1 ring-indigo-100">
                  <Brain size={18} className="text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">Uzman hesabı</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Başvuru yap</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Platform keşfet — kompakt */}
            <Link
              to="/tanitim"
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:border-primary-100 hover:bg-white group sm:hidden"
            >
              <span className="flex items-center gap-2.5">
                <PlayCircle size={15} className="text-primary-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 group-hover:text-primary-700 transition-colors">Platformu önce keşfedin</span>
              </span>
              <ArrowRight size={13} className="text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>

          {/* SSL */}
          <div className="mt-5 flex items-center justify-center gap-2">
            <Shield size={13} className="text-slate-400" />
            <p className="text-center text-xs font-semibold text-slate-400">Verileriniz SSL ile korunur.</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{ transform:translateX(0) }
          20%    { transform:translateX(-6px) }
          40%    { transform:translateX(6px) }
          60%    { transform:translateX(-4px) }
          80%    { transform:translateX(4px) }
        }
      `}</style>
    </div>
  );
}
