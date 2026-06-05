import { useState, useEffect } from 'react';
import { Target, Gamepad2, TrendingUp, X } from 'lucide-react';

interface TreatmentOnboardingProps {
  onNavigateToTab: (tab: 'goals' | 'games') => void;
  hasData: boolean; // if true, don't show the onboarding at all
}

export function TreatmentOnboarding({ onNavigateToTab, hasData }: TreatmentOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user has no data and hasn't dismissed it
    if (!hasData) {
      const dismissed = localStorage.getItem('treatment_onboarding_dismissed');
      if (dismissed !== 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsVisible(true);
      }
    }
  }, [hasData]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('treatment_onboarding_dismissed', 'true');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-indigo-50 border border-indigo-100 p-5 sm:p-6 mb-5">
      <div className="absolute right-3 top-3">
        <button
          onClick={handleDismiss}
          className="rounded-full p-1.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
          title="Bunu gizle"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-indigo-900">Merhaba! Çocuğunuz için 3 adımda başlayın 👋</h3>
        <p className="text-sm text-indigo-700/80 mt-1">
          Bu sayfa, her gün çocuğunuzla yapabileceğiniz küçük destekleri takip etmenizi sağlar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Step 1 */}
        <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-indigo-100/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Target size={20} />
            </div>
            <h4 className="font-semibold text-slate-900">1. Hedef Belirleyin</h4>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 flex-1">
            "Hedefler" sekmesinden bugün çocuğunuz için takip etmek istediğiniz küçük bir şey yazın. Örn: "2 kez göz teması kurdu."
          </p>
          <button
            onClick={() => onNavigateToTab('goals')}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            Hedeflere Git
          </button>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-indigo-100/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Gamepad2 size={20} />
            </div>
            <h4 className="font-semibold text-slate-900">2. Oyunları Oynayın</h4>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 flex-1">
            "Oyunlar" sekmesindeki kısa etkinlikleri çocuğunuzla deneyin — her biri 5-10 dakikadır, talimatlar içinde yazılıdır.
          </p>
          <button
            onClick={() => onNavigateToTab('games')}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Oyunlara Git
          </button>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-indigo-100/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <TrendingUp size={20} />
            </div>
            <h4 className="font-semibold text-slate-900">3. Nasıl Gittiğini Seçin</h4>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 flex-1">
            Oyunu oynadıktan sonra "Kolay geldi / Zorlandı" gibi bir seçenek işaretleyin. Bu kadar — sistem gerisini halleder.
          </p>
          <button
            onClick={() => onNavigateToTab('games')}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
          >
            Oyunlara Git
          </button>
        </div>
      </div>
    </div>
  );
}
