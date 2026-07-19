import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const email = params.get('email') || '';
  const [status, setStatus] = useState<'waiting' | 'loading' | 'success' | 'error'>(token ? 'loading' : 'waiting');
  const [message, setMessage] = useState(token ? 'E-posta adresiniz doğrulanıyor…' : 'Doğrulama bağlantısını e-posta adresinize gönderdik.');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    authService.verifyEmail(token)
      .then(() => { setStatus('success'); setMessage('E-posta adresiniz doğrulandı. Artık giriş yapabilirsiniz.'); })
      .catch((error) => {
        setStatus('error');
        setMessage(error?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.');
      });
  }, [token]);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authService.resendVerification(email);
      setMessage('Yeni doğrulama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.');
      setStatus('waiting');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm" aria-live="polite">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          {status === 'success' ? <CheckCircle2 size={32} /> : status === 'error' ? <XCircle size={32} /> : <Mail size={32} />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">E-posta doğrulama</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-7 space-y-3">
          {status === 'success' && <Link className="block rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white" to="/giris">Giriş yap</Link>}
          {status !== 'success' && email && <Button className="w-full" onClick={resend} loading={resending}>E-postayı yeniden gönder</Button>}
          <Link className="block text-sm font-medium text-primary-700" to="/giris">Giriş sayfasına dön</Link>
        </div>
      </section>
    </main>
  );
}
