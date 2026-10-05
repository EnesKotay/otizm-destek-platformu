import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import {
  HeartHandshake,
  User,
  Mail,
  Lock,
  Shield,
  Sparkles,
  Brain,
  Users,
  ArrowRight,
  Eye,
  EyeOff,
  CalendarCheck,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { validatePassword } from '@/utils/password';

const schema = z.object({
  fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().superRefine((val, ctx) => {
    const error = validatePassword(val);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }),
  confirmPassword: z.string().min(1, 'Şifre tekrarını giriniz'),
  kvkkConsent: z.boolean().refine(val => val, 'KVKK onayı zorunludur'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const PASSWORD_RULES = [
  { label: 'En az 8 karakter', test: (p: string) => p.length >= 8 },
  { label: 'Bir büyük harf', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Bir rakam', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Bir özel karakter', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
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

export function RegisterPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [emailCheckedStatus, setEmailCheckedStatus] = useState<{ checked: boolean; exists: boolean; email: string }>({
    checked: false,
    exists: false,
    email: '',
  });

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedPassword = watch('password', '');
  const strength = getPasswordStrength(watchedPassword || passwordValue);

  const handleEmailBlur = async (email: string) => {
    if (!email || errors.email) return;
    try {
      const res = await authService.checkEmail(email);
      setEmailCheckedStatus({ checked: true, exists: !res.available, email });
    } catch {
      // Ignore network check-email error silently
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        kvkkConsent: data.kvkkConsent,
        role: 'PARENT',
        captchaToken,
      });
      if (response.pendingEmailVerification) {
        navigate(`/eposta-dogrula?email=${encodeURIComponent(data.email)}`);
        return;
      }
      if (!response.accessToken) throw new Error('Oturum başlatılamadı');
      setAuth(response.user, response.accessToken);
      navigate('/baslangic', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kayıt olurken bir hata oluştu';
      setError(message);
      if (message.includes('zaten') || message.includes('kullanılıyor')) {
        setEmailCheckedStatus({ checked: true, exists: true, email: data.email });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* LEFT SIDE - Premium Branding & Info Panel (Hidden on mobile) */}
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
              Gelişim Platformu
            </span>
          </div>
        </div>

        {/* Dynamic Centerpiece */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-primary-300 font-medium">
              <Sparkles size={12} className="text-primary-300" />
              <span>Günlük takip ve uzman paylaşımı</span>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-[1.15]">
              Çocuğunuzun gelişim sürecini <br />
              <span className="bg-gradient-to-r from-white via-indigo-200 to-primary-300 bg-clip-text text-transparent drop-shadow-sm">
                daha düzenli takip edin
              </span>
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm">
              Otizm Destek Platformu; çocuk profili, günlük kayıt, randevu ve uzman iletişimini sakin bir akışta bir araya getirir.
            </p>
          </div>

          {/* Value Propositions */}
          <div className="space-y-4">
            {/* Prop 1 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0 border border-primary-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Brain className="text-primary-400" size={24} />
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white tracking-wide">BEP ve hedef hazırlığı</h4>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">Uzmanın düzenleyip tamamlayabileceği hedef ve rapor taslakları.</p>
              </div>
            </div>

            {/* Prop 2 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Users className="text-emerald-400" size={24} />
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white tracking-wide">Uzman ve aile iletişimi</h4>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">Randevu, mesaj ve paylaşım izinlerini aynı yerden takip edin.</p>
              </div>
            </div>

            {/* Prop 3 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-400/20 flex items-center justify-center shrink-0 border border-indigo-400/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <CalendarCheck className="text-indigo-300" size={24} />
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-white tracking-wide">Günlük takip akışı</h4>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">Duygu, uyku, ilaç ve kısa gözlemleri yorulmadan kaydedin.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">© 2025 Otizm Destek Platformu</p>
        </div>
      </div>

      {/* RIGHT SIDE - Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-5 sm:p-8 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-6">
          
          {/* Header Mobile Only Logo */}
          <div className="mb-8 text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-7">
              <div className="w-11 h-11 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200/50">
                <HeartHandshake size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-extrabold text-gray-900 leading-none">Otizm Destek</p>
                <p className="text-xs text-gray-400 mt-0.5">Gelişim Platformu</p>
              </div>
            </div>
            
            <div className="hidden lg:inline-flex items-center justify-start gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-primary-500"></span>
              <p className="text-sm font-bold tracking-wide text-indigo-600 uppercase">Aramıza Katılın</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Kayıt Ol
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              Temel bilgileri ekleyip günlük takip akışını kullanmaya başlayın.
            </p>
          </div>

          {emailCheckedStatus.exists ? (
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/80 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 font-extrabold text-lg">⚠️</div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-950">Bu E-posta Zaten Kayıtlı</h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-semibold">{emailCheckedStatus.email}</span> adresiyle zaten bir hesap oluşturulmuş. Şifrenizi sıfırlayabilir veya doğrudan giriş yapabilirsiniz.
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5 pt-1 pl-13">
                <Link
                  to="/giris"
                  state={{ email: emailCheckedStatus.email }}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-primary-200 text-xs transition-all"
                >
                  Giriş Yap
                </Link>
                <Link
                  to="/sifremi-unuttum"
                  state={{ email: emailCheckedStatus.email }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
                >
                  Şifremi Sıfırla
                </Link>
              </div>
            </div>
          ) : error ? (
            <div role="alert" aria-live="assertive" className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">!</div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : null}

          <div className="rounded-[24px] border border-slate-200/60 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-indigo-500"></div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              Bu form veli hesabı içindir. Uzman başvuruları doğrulama süreci olan ayrı formdan alınır.
            </p>

            {/* Ad Soyad */}
            <div className="space-y-1.5">
              <label htmlFor="register-full-name" className="block text-sm font-semibold text-slate-700">Ad Soyad</label>
              <div className="group relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                  <User size={18} />
                </div>
                <input
                  id="register-full-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Adınız Soyadınız"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'register-full-name-error' : undefined}
                  className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                    errors.fullName
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  {...register('fullName')}
                />
              </div>
              {errors.fullName && <p id="register-full-name-error" role="alert" className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
            </div>

            {/* E-posta */}
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="block text-sm font-semibold text-slate-700">E-posta</label>
              <div className="group relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                  <Mail size={18} />
                </div>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@email.com"
                  aria-invalid={Boolean(errors.email || emailCheckedStatus.exists)}
                  aria-describedby={errors.email ? 'register-email-error' : undefined}
                  className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                    errors.email || emailCheckedStatus.exists
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  {...register('email', {
                    onBlur: (e) => handleEmailBlur(e.target.value),
                    onChange: () => {
                      setEmailCheckedStatus({ checked: false, exists: false, email: '' });
                      setError('');
                    }
                  })}
                />
              </div>
              {errors.email && <p id="register-email-error" role="alert" className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            {/* Şifre */}
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="block text-sm font-semibold text-slate-700">Şifre</label>
              <div className="group relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                  <Lock size={18} />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="En az 8 karakter"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'register-password-error' : 'register-password-help'}
                  className={`h-12 w-full rounded-xl border pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                    errors.password
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  {...register('password', {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p id="register-password-error" role="alert" className="text-xs text-red-600 mt-1">{errors.password.message}</p>}

              {/* Password requirements checklist */}
              {(watchedPassword || passwordValue) && (
                <div id="register-password-help" aria-live="polite" className="mt-2.5 space-y-2 p-3 bg-indigo-50/40 border border-indigo-100/60 rounded-xl">
                  <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                    <span>💡 Güçlü Şifre İpuçları</span>
                    <span className="text-[10px] font-normal text-indigo-500">(İsteğe Bağlı)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(watchedPassword || passwordValue);
                      return (
                        <div key={rule.label} className="flex items-center gap-1.5">
                          {met ? (
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                          ) : (
                            <Circle size={13} className="shrink-0 text-slate-300" />
                          )}
                          <span className={`text-[11px] font-medium ${met ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-indigo-100/60 pt-1.5">
                    <span className="text-[10px] font-semibold text-slate-500">Güvenlik Seviyesi:</span>
                    <span className={`text-[10px] font-extrabold ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score === 2 ? 'text-orange-500' :
                      strength.score === 3 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Şifre Tekrar */}
            <div className="space-y-1.5">
              <label htmlFor="register-confirm-password" className="block text-sm font-semibold text-slate-700">Şifre Tekrar</label>
              <div className="group relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-600">
                  <Lock size={18} />
                </div>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Şifrenizi tekrar girin"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
                  className={`h-12 w-full rounded-xl border pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                    errors.confirmPassword
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Şifreleri gizle' : 'Şifreleri göster'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="register-confirm-password-error" role="alert" className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* KVKK */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-2xl border border-indigo-100/50">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    aria-invalid={Boolean(errors.kvkkConsent)}
                    aria-describedby={errors.kvkkConsent ? 'register-kvkk-error' : undefined}
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
                  <strong className="text-gray-700">KVKK Aydınlatma Metni:</strong>{' '}
                  <Link to="/kvkk" target="_blank" className="font-bold text-primary-600 hover:text-primary-700">
                    KVKK aydınlatma metnini
                  </Link>
                  ,{' '}
                  <Link to="/gizlilik" target="_blank" className="font-bold text-primary-600 hover:text-primary-700">
                    gizlilik politikasını
                  </Link>
                  {' '}ve{' '}
                  <Link to="/kullanim-sartlari" target="_blank" className="font-bold text-primary-600 hover:text-primary-700">
                    kullanım şartlarını
                  </Link>
                  {' '}okudum ve kabul ediyorum.
                </span>
              </label>
              {errors.kvkkConsent && (
                <p id="register-kvkk-error" role="alert" className="text-xs text-red-600 mt-2 ml-8 font-medium">{errors.kvkkConsent.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <TurnstileWidget onToken={setCaptchaToken} />
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-lg shadow-primary-200/50 border-0 rounded-xl font-bold flex items-center justify-center gap-2 group mt-2"
              size="lg"
              loading={loading}
              disabled={Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY) && !captchaToken}
            >
              <span>Hesap Oluştur</span>
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </form>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                veya
              </span>
            </div>
          </div>

          {/* Footer links */}
          <div className="space-y-4 text-center">
            <p className="text-sm font-medium text-slate-500">
              Zaten hesabınız var mı?{' '}
              <Link to="/giris" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
                Giriş Yapın
              </Link>
            </p>
            <p className="text-sm font-medium text-slate-500">
              Uzman mısınız?{' '}
              <Link to="/kayit/uzman" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                Uzman Başvurusu Yapın &rarr;
              </Link>
            </p>
            
            <div className="mt-8 pt-6 border-t border-slate-200">
              <Link to="/tanitim" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Platformu keşfedin <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield size={14} className="text-slate-400" />
            <p className="text-center text-xs font-medium text-slate-400">Bilgileriniz güvenli bağlantı üzerinden iletilir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
