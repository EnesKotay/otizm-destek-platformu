import { RefreshCw } from 'lucide-react';
import { useSwUpdateStore } from '@/store/swUpdateStore';

export function UpdateBanner() {
  const updateAvailable = useSwUpdateStore((s) => s.updateAvailable);
  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-lg shadow-slate-900/10">
        <p className="text-sm font-semibold text-gray-800">
          Yeni bir sürüm hazır.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} /> Yenile
        </button>
      </div>
    </div>
  );
}
