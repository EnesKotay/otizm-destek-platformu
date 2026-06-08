import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, ArrowLeft, Mail, SendHorizonal, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from '@/store/toastStore';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const token = await authService.forgotPassword(email.trim());
      if (token) setDevToken(token);
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'E-posta gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sol panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-primary-950 text-white p-12 flex-col justify-between">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

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

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-primary-300 font-medium">
            <Mail size={12} />
            <span>Şifre Sıfırlama</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-[1.15]">
            Şifrenizi mi{' '}
            <span className="bg-gradient-to-r from-primary-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              unuttunuz?
            </span>
          </h2>
          <p className="text-slate-300 leading-relaxed text-sm">
            Endişelenmeyin. Kayıtlı e-posta adresinize bir sıfırlama bağlantısı gönderiyoruz.
            Birkaç dakika içinde yeni şifrenizle giriş yapabilirsiniz.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'E-posta adresinizi girin',
              'Sıfırlama bağlantısına tıklayın',
              'Yeni şifrenizi belirleyin',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-xs font-black text-primary-400 border border-primary-500/30">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">
            Şifrenizi hatırladınız mı?{' '}
            <Link to="/giris" className="text-primary-400 font-semibold hover:text-primary-300 transition-colors">
              Giriş Yapın →
            </Link>
          </p>
        </div>
      </div>

      {/* Sağ panel – form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 my-8">

          {/* Mobile logo */}
          <div className="text-center lg:text-left">
            <div className="lg:hidden inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-200/50 mb-4">
              <HeartHandshake size={26} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Şifremi Unuttum</h1>
            <p className="text-gray-500 text-sm mt-2">
              E-posta adresinize sıfırlama bağlantısı göndereceğiz.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/60 border border-white p-8">
            {submitted ? (
              <div className="text-center space-y-5">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-lg mb-2"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 10px 30px rgba(16,185,129,0.3)' }}
                >
                  <CheckCircle2 size={36} className="text-white" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900">Bağlantı Gönderildi</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  <strong className="text-gray-700">{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
                  Gelen kutunuzu ve spam klasörünüzü kontrol edin.
                </p>

                {devToken && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left space-y-2">
                    <p className="text-xs font-bold text-amber-800">Geliştirici Modu — E-posta Aktif Değil</p>
                    <p className="text-xs text-amber-700">
                      Yerel ortamda çalıştığınız için e-posta gönderilmedi. Şifrenizi sıfırlamak için:
                    </p>
                    <Link
                      to={`/sifre-sifirla?token=${devToken}`}
                      className="block text-xs font-semibold text-primary-600 hover:text-primary-700 break-all underline"
                    >
                      /sifre-sifirla?token={devToken}
                    </Link>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setSubmitted(false); setDevToken(null); }}
                    className="w-full h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Farklı e-posta dene
                  </button>
                  <Link
                    to="/giris"
                    className="flex items-center justify-center gap-1.5 w-full h-11 rounded-xl text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Giriş sayfasına dön
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    E-posta Adresi
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/70 hover:bg-white focus:bg-white shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-white text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(79,70,229,0.25)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Gönderiliyor...
                    </span>
                  ) : (
                    <>
                      Sıfırlama Bağlantısı Gönder
                      <SendHorizonal size={16} />
                    </>
                  )}
                </button>

                <Link
                  to="/giris"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Giriş sayfasına dön
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
