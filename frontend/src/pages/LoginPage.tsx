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
  ArrowRight, Loader2, Sparkles,
  Brain, Users, CalendarCheck, CheckCircle2,
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
    let fadeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const t = setInterval(() => {
      setQuoteFade(false);
      fadeTimeoutId = setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteFade(true);
      }, 400);
    }, 5500);
    return () => {
      clearInterval(t);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
    };
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
      if (!res.accessToken) throw new Error('Oturum başlatılamadı');
      setAuth(res.user, res.accessToken);
      const needsOnboarding =
        ['PARENT', 'EXPERT', 'ADMIN'].includes(res.user.role) &&
        !res.user.onboardingCompleted;
      navigate(needsOnboarding ? '/baslangic' : '/', { replace: true });
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
                <span className="bg-gradient-to-r from-white via-indigo-200 to-primary-300 bg-clip-text text-transparent drop-shadow-sm">
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
                  aria-label={`${i + 1}. sözü göster`}
                  aria-pressed={i === quoteIdx}
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
            {FEATURES.map(f => {
              const FeatureIcon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-110 group-hover:rotate-3 transition-all duration-300', f.color)}>
                    <FeatureIcon className={f.iconColor} size={24} />
                  </div>
                  <div className="pt-0.5">
                    <h4 className="text-sm font-bold text-white tracking-wide">{f.title}</h4>
                    <p className="text-sm text-slate-300 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
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
          'w-full max-w-md my-6',
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
          <div className="mb-8 text-center lg:text-left">
            <div className="inline-flex items-center justify-center lg:justify-start gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <p className="text-sm font-bold tracking-wide text-indigo-600 uppercase">Tekrar Hoş Geldiniz</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Hesabınıza Giriş Yapın
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              Günlük kayıtlarınıza, randevularınıza ve mesajlarınıza kaldığınız yerden devam edin.
            </p>
          </div>

          {/* Hata */}
          {errorMsg && (
            <div role="alert" aria-live="assertive" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">!</div>
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Form Kartı */}
          <div className="rounded-[24px] border border-slate-200/60 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* E-posta */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">E-posta</label>
                <div className="group relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                    <Mail size={18} />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                      errors.email
                        ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email?.message && <p id="login-email-error" role="alert" className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              {/* Şifre */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">Şifre</label>
                  <Link to="/sifremi-unuttum" className="text-xs font-bold text-primary-600 transition-colors hover:text-primary-700">
                    Şifremi Unuttum
                  </Link>
                </div>
                <div className="group relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                    <Lock size={18} />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Şifrenizi girin"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    className={`h-12 w-full rounded-xl border pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                      errors.password
                        ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600 cursor-pointer"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password?.message && <p id="login-password-error" role="alert" className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
              </div>

              {/* Beni hatırla */}
              <label className="flex w-fit cursor-pointer select-none items-center gap-3 group">
                <div className="relative w-5 h-5 shrink-0">
                  <input type="checkbox" className="peer sr-only" {...register('rememberMe')} />
                  <div className="h-5 w-5 rounded-md border border-slate-400 bg-white transition-colors peer-checked:border-primary-600 peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2" />
                  <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-800">Beni hatırla</span>
              </label>

              {/* Buton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                           disabled:bg-slate-300 disabled:cursor-not-allowed
                           text-white font-bold text-sm rounded-xl shadow-sm shadow-indigo-600/20
                           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                           flex items-center justify-center gap-2 group
                           transition-all duration-200 cursor-pointer mt-4 hover:shadow-md hover:shadow-indigo-600/30"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Giriş Yapılıyor...</>
                ) : (
                  <><span>Giriş Yap</span><ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          </div>

          <section className="mt-8 pt-6" aria-labelledby="signup-title">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Hesabınız yok mu?
                </span>
              </div>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { to: '/kayit', icon: Users, title: 'Veli Hesabı', detail: 'Ücretsiz Kaydol', color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-100 hover:border-indigo-300', shadow: 'hover:shadow-indigo-500/10' },
                { to: '/kayit/uzman', icon: Brain, title: 'Uzman Hesabı', detail: 'Başvuru Yap', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-100 hover:border-emerald-300', shadow: 'hover:shadow-emerald-500/10' },
              ].map(({ to, icon: Icon, title, detail, color, bg, border, shadow }) => (
                <Link key={to} to={to} className={`group flex items-center gap-3.5 rounded-2xl border bg-white p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${border} ${shadow}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${bg}`}>
                    <Icon size={20} className={color} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 font-medium">{detail}</p>
                  </div>
                  <ArrowRight size={16} className={`shrink-0 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 ${color}`} aria-hidden="true" />
                </Link>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <Link to="/tanitim" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Platformu keşfedin <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>
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
