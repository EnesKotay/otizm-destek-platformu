import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie-notice-ack-v1';

/**
 * Çerez/yerel depolama bildirimi. Platform yalnızca oturum, güvenlik ve
 * erişilebilirlik tercihleri için zorunlu depolama kullanır; izleme veya
 * reklam çerezi yoktur. Bu yüzden bildirim "kabul et/reddet" seçimi değil,
 * KVKK md. 10 kapsamında bir aydınlatmadır — zorunlu çerezler için ayrıca
 * açık rıza aranmaz, ancak kullanıcının bilgilendirilmesi gerekir.
 *
 * İleride analitik/izleme eklenirse bu bileşen gerçek bir rıza seçimine
 * dönüştürülmeli ve seçim ConsentType.PAZARLAMA_ILETISIMI gibi deftere yazılmalıdır.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      // Depolama kapalıysa bildirim gösterilmez; zaten kalıcı veri de yazılamaz.
      return false;
    }
  });

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // yok sayılır
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Çerez bilgilendirmesi"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Cookie size={20} aria-hidden="true" />
          </span>
          <p className="text-sm leading-6 text-slate-600">
            Bu platform yalnızca <strong>oturumunuzun açık kalması, güvenlik ve erişilebilirlik
            tercihleriniz</strong> için zorunlu çerez ve yerel depolama kullanır. Reklam veya
            izleme çerezi kullanılmaz. Ayrıntılar için{' '}
            <Link to="/gizlilik" className="font-bold text-blue-700 underline">Gizlilik Politikası</Link>{' '}
            ve{' '}
            <Link to="/kvkk" className="font-bold text-blue-700 underline">KVKK Aydınlatma Metni</Link>.
          </p>
        </div>
        <button
          type="button"
          onClick={acknowledge}
          className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-slate-800 sm:ml-auto"
        >
          Anladım
        </button>
      </div>
    </div>
  );
}
