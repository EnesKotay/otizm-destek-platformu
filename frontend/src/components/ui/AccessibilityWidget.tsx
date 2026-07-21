import { useState, useEffect, useRef } from 'react';
import { Eye, Type, Wind, Contrast, Sparkles, Check, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { toast } from '@/store/toastStore';

export function AccessibilityWidget() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // States initialized from localStorage / document
  const [largeText, setLargeText] = useState(() => localStorage.getItem('access-large-text') === 'true');
  const [calmMode, setCalmMode] = useState(() => localStorage.getItem('access-calm-mode') === 'true');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('access-high-contrast') === 'true');
  const [simpleMode, setSimpleMode] = useState(() => localStorage.getItem('access-simple-mode') === 'true');

  // Apply classes on mount / state change.
  // NOT: Sınıf adları index.css ve SettingsPage ile birebir aynı olmalı (a11y- ön eki),
  // aksi halde stiller uygulanmaz.
  useEffect(() => {
    document.documentElement.classList.toggle('a11y-large-text', largeText);
    localStorage.setItem('access-large-text', String(largeText));
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle('a11y-calm', calmMode);
    localStorage.setItem('access-calm-mode', String(calmMode));
  }, [calmMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('a11y-high-contrast', highContrast);
    localStorage.setItem('access-high-contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('access-simple-mode', String(simpleMode));
    window.dispatchEvent(new CustomEvent('a11y-simple-mode-change', { detail: simpleMode }));
  }, [simpleMode]);

  // Load accessibility settings from user profile on mount
  useEffect(() => {
    const userPrefs = user?.privacySettings?.accessibility;
    if (userPrefs) {
      if (typeof userPrefs.largeText === 'boolean') setLargeText(userPrefs.largeText);
      if (typeof userPrefs.calmMode === 'boolean') setCalmMode(userPrefs.calmMode);
      if (typeof userPrefs.highContrast === 'boolean') setHighContrast(userPrefs.highContrast);
      if (typeof userPrefs.simpleMode === 'boolean') setSimpleMode(userPrefs.simpleMode);
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync to user profile backend asynchronously
  const syncToProfile = async (updates: Partial<{ largeText: boolean; calmMode: boolean; highContrast: boolean; simpleMode: boolean }>) => {
    if (!user) return;
    const currentAcc = user.privacySettings?.accessibility || {};
    const newAcc = { ...currentAcc, ...updates };
    const updatedPrivacy = {
      ...user.privacySettings,
      accessibility: newAcc,
    };

    try {
      const updatedUser = await userService.updateProfile({ bio: user.bio, city: user.city });
      setUser({ ...updatedUser, privacySettings: updatedPrivacy });
    } catch {
      /* skip background sync error */
    }
  };

  const toggleLargeText = () => {
    const next = !largeText;
    setLargeText(next);
    syncToProfile({ largeText: next });
    toast.info(next ? 'Büyük yazı modu açıldı' : 'Normal yazı moduna geçildi');
  };

  const toggleCalmMode = () => {
    const next = !calmMode;
    setCalmMode(next);
    syncToProfile({ calmMode: next });
    toast.info(next ? 'Sakin mod açıldı' : 'Sakin mod kapatıldı');
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    syncToProfile({ highContrast: next });
    toast.info(next ? 'Yüksek kontrast açıldı' : 'Normal kontrast');
  };

  const toggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    syncToProfile({ simpleMode: next });
    toast.info(next ? 'Basit Mod (Sade Görünüm) Açıldı' : 'Standart Görünüme Geçildi');
  };

  const activeCount = [largeText, calmMode, highContrast, simpleMode].filter(Boolean).length;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all cursor-pointer shadow-sm"
        title="Kolay Okuma ve Görünüm Ayarları"
      >
        <Eye size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="hidden sm:inline font-extrabold">Erişilebilirlik</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Eye size={14} /> Kolay Görünüm Ayarları
            </span>
            <span className="text-[10px] text-slate-400">Cihazla eşitleme aktif</span>
          </div>

          <div className="space-y-1">
            {/* Basit Mod */}
            <button
              type="button"
              onClick={toggleSimpleMode}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-extrabold transition-all text-left cursor-pointer ${
                simpleMode
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${simpleMode ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Sparkles size={14} />
                </div>
                <div>
                  <p className="font-bold">Basit Mod (Sade Görünüm)</p>
                  <p className="text-[10px] font-normal text-slate-400 leading-tight">Menüleri 5 temel eyleme indirger</p>
                </div>
              </div>
              {simpleMode && <Check size={16} className="text-emerald-600 shrink-0" />}
            </button>

            {/* Büyük Yazı Modu */}
            <button
              type="button"
              onClick={toggleLargeText}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-extrabold transition-all text-left cursor-pointer ${
                largeText
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 text-indigo-800 dark:text-indigo-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${largeText ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Type size={14} />
                </div>
                <div>
                  <p className="font-bold">Büyük Yazı Modu</p>
                  <p className="text-[10px] font-normal text-slate-400 leading-tight">Metinleri daha büyük gösterir</p>
                </div>
              </div>
              {largeText && <Check size={16} className="text-indigo-600 shrink-0" />}
            </button>

            {/* Sakin Mod */}
            <button
              type="button"
              onClick={toggleCalmMode}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-extrabold transition-all text-left cursor-pointer ${
                calmMode
                  ? 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 text-purple-800 dark:text-purple-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${calmMode ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Wind size={14} />
                </div>
                <div>
                  <p className="font-bold">Sakin Görünüm Modu</p>
                  <p className="text-[10px] font-normal text-slate-400 leading-tight">Göz yormayan yumuşak tonlar</p>
                </div>
              </div>
              {calmMode && <Check size={16} className="text-purple-600 shrink-0" />}
            </button>

            {/* Yüksek Kontrast */}
            <button
              type="button"
              onClick={toggleHighContrast}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-extrabold transition-all text-left cursor-pointer ${
                highContrast
                  ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${highContrast ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Contrast size={14} />
                </div>
                <div>
                  <p className="font-bold">Yüksek Kontrast</p>
                  <p className="text-[10px] font-normal text-slate-400 leading-tight">Yazıları en belirgin renkte tutar</p>
                </div>
              </div>
              {highContrast && <Check size={16} className="text-amber-600 shrink-0" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
