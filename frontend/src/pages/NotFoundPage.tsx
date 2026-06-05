import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { HeartHandshake } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <HeartHandshake size={64} className="text-indigo-400 mb-6" />
      <h1 className="text-6xl font-bold text-indigo-600 mb-2">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Sayfa Bulunamadı</h2>
      <p className="text-gray-500 mb-8 text-center max-w-sm">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link to="/">
        <Button>Ana Sayfaya Dön</Button>
      </Link>
    </div>
  );
}
