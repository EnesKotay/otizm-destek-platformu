import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';

interface TrustAndPrivacyPanelProps {
  showExactLocation: boolean;
  onToggleExactLocation: () => void;
}

export function TrustAndPrivacyPanel({
  showExactLocation,
  onToggleExactLocation,
}: TrustAndPrivacyPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900">Güven ve gizlilik kontrolü</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Eşleştirme; çocuğunuzun etiketleri, yaş aralığı, terapi/eğitim notları ve isteğe bağlı şehir/konum bilgisini kullanır. Kesin konum karşı tarafa gösterilmez.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['İsteğe bağlı görünürlük', 'Notlu bağlantı isteği', 'Önce mesajla tanışma'].map(item => (
                <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={12} /> {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-900">Konum hassasiyeti</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Yakındaki velilerde koordinatı sadece kendi ekranınızda görmeyi seçebilirsiniz.
            </p>
          </div>
          <LockKeyhole size={17} className="text-slate-400 shrink-0" />
        </div>
        <button
          type="button"
          onClick={onToggleExactLocation}
          className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
            showExactLocation
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <span>{showExactLocation ? 'Kesin koordinat görünür' : 'Yaklaşık konum modu'}</span>
          <span className={`relative h-5 w-9 rounded-full transition-colors ${showExactLocation ? 'bg-indigo-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${showExactLocation ? 'translate-x-5' : 'translate-x-1'}`} />
          </span>
        </button>
      </div>
    </div>
  );
}
