import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { HeartHandshake, CheckCircle, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from '@/store/toastStore';
import { validatePassword } from '@/utils/password';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) { toast.error(passwordError); return; }
    if (password !== confirm) { toast.error('Şifreler eşleşmiyor.'); return; }
    if (!token) { toast.error('Geçersiz sıfırlama bağlantısı.'); return; }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch {
      toast.error('Bağlantı geçersiz veya süresi dolmuş. Yeni bir talep gönderin.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <HeartHandshake size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Şifre Belirle</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">Şifreniz güncellendi</h2>
              <p className="text-gray-500 text-sm">Yeni şifrenizle giriş yapabilirsiniz.</p>
              <Button onClick={() => navigate('/giris')} className="w-full">Giriş Yap</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                  Geçersiz veya eksik sıfırlama bağlantısı. Lütfen e-postanızdaki linki kullanın.
                </p>
              )}
              <Input
                label="Yeni Şifre"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Güçlü bir şifre girin"
                required
              />
              <p className="text-sm text-gray-500 -mt-2">
                En az 8 karakter; bir büyük harf, bir rakam ve bir özel karakter (! ? * . -) içermelidir.
              </p>
              <Input
                label="Şifre Tekrar"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
                required
              />
              <Button type="submit" loading={loading} className="w-full" disabled={!token}>
                Şifremi Güncelle
              </Button>
              <div className="text-center">
                <Link to="/giris" className="text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Giriş sayfasına dön
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
