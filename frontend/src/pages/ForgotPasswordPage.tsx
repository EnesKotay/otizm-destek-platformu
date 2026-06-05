import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { HeartHandshake, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from '@/store/toastStore';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      toast.error('E-posta gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <HeartHandshake size={48} className="text-indigo-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Şifremi Unuttum</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✉️</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">E-posta Gönderildi</h2>
              <p className="text-gray-500 text-sm mb-6">
                <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
                Gelen kutunuzu ve spam klasörünüzü kontrol edin.
              </p>
              <Link to="/giris">
                <Button variant="outline" className="w-full">Giriş sayfasına dön</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-gray-500 text-sm">
                Kayıtlı e-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.
              </p>
              <Input
                label="E-posta"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="ornek@email.com"
              />
              <Button type="submit" className="w-full" loading={loading}>
                Sıfırlama Bağlantısı Gönder
              </Button>
              <Link to="/giris" className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 justify-center">
                <ArrowLeft size={14} /> Giriş sayfasına dön
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
