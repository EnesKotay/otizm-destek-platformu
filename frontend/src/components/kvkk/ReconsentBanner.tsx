import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { kvkkService } from '@/services/kvkkService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/**
 * Aydınlatma metni güncellendiğinde kullanıcıya yeniden onay sunar.
 * KVKK md. 10 aydınlatma yükümlülüğü metin değiştiğinde yeniden doğar;
 * eski sürüme verilmiş onay yeni işleme faaliyetlerini kapsamaz.
 */
export function ReconsentBanner() {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [needed, setNeeded] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    kvkkService
      .getConsents()
      .then(overview => {
        if (!active) return;
        setNeeded(overview.requiresReconsent);
        setVersion(overview.policyVersion);
      })
      .catch(() => {
        if (active) setNeeded(false);
      });
    return () => { active = false; };
  }, [isAuthenticated, user?.id]);

  // Oturum kapandığında effect'te state sıfırlamak yerine görünürlüğü türetiyoruz.
  if (!isAuthenticated || !needed) return null;

  const accept = async () => {
    setSaving(true);
    try {
      const updated = await kvkkService.reconsent();
      if (updated) setUser(updated);
      setNeeded(false);
      toast.success('Güncel aydınlatma metni onayınız kaydedildi.');
    } catch {
      toast.error('Onay kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Aydınlatma metni güncellendi"
      className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-lg backdrop-blur sm:inset-x-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm leading-6 text-amber-900">
            <strong>KVKK Aydınlatma Metni güncellendi{version ? ` (sürüm ${version})` : ''}.</strong>{' '}
            Verilerinizin nasıl işlendiğini{' '}
            <Link to="/kvkk" className="font-bold underline">buradan</Link> okuyup onaylayın.
          </p>
        </div>
        <button
          type="button"
          onClick={accept}
          disabled={saving}
          className="shrink-0 rounded-xl bg-amber-900 px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-amber-800 disabled:opacity-60 sm:ml-auto"
        >
          {saving ? 'Kaydediliyor…' : 'Okudum, onaylıyorum'}
        </button>
      </div>
    </div>
  );
}
