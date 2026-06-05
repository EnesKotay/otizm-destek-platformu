import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Power, Users, Cpu, HardDrive, Coins,
  AlertTriangle, RefreshCw, Loader2, Database,
  Activity, Check, ChevronDown, CheckCircle2,
  Server, CpuIcon, Layers
} from 'lucide-react';
import { toast } from '@/store/toastStore';
import { adminService } from '@/services/adminService';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { PlatformSettings } from '@/services/adminService';

interface ToggleProps {
  field: keyof PlatformSettings;
  color: string;
  settings: PlatformSettings;
  saving: keyof PlatformSettings | null;
  loading: boolean;
  onToggle: (field: keyof PlatformSettings) => void;
}

function Toggle({ field, color, settings, saving, loading, onToggle }: ToggleProps) {
  const isOn = settings[field];
  const isSaving = saving === field;
  return (
    <button
      onClick={() => onToggle(field)}
      disabled={saving !== null || loading}
      aria-pressed={isOn}
      aria-label={`${field} toggle`}
      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-inner ${isOn ? color : 'bg-slate-200 dark:bg-slate-800'}`}
    >
      {isSaving ? (
        <Loader2 size={14} className="absolute left-1/2 -translate-x-1/2 text-white animate-spin" />
      ) : (
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isOn ? 'translate-x-8' : 'translate-x-1'}`} />
      )}
    </button>
  );
}

interface TokenStats {
  used: number;
  budget: number;
  remaining: number;
  cost: number;
  updatedAt: string;
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    registrationsOpen: true,
    aiEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof PlatformSettings | null>(null);
  const [settingsError, setSettingsError] = useState(false);

  // Token stats
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Backup
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(
    () => localStorage.getItem('admin_last_backup') ?? null
  );

  // Maintenance mode onay dialog
  const [pendingMaintenance, setPendingMaintenance] = useState<boolean | null>(null);

  // Uptime
  const [uptime, setUptime] = useState<string>('Hesaplanıyor...');

  // Gerçek JVM/OS metrikleri
  const [cpuUsage, setCpuUsage] = useState<number>(-1);
  const [heapUsedMb, setHeapUsedMb] = useState<number>(-1);
  const [heapMaxMb, setHeapMaxMb] = useState<number>(-1);

  // Gelişmiş AI Yapılandırması (Local Cache / Settings)
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('admin_ai_model') ?? 'Gemini 1.5 Flash (Hızlı)'
  );
  const [aiModules, setAiModules] = useState<{ chatbot: boolean; analytics: boolean; bep: boolean }>(() => {
    const cached = localStorage.getItem('admin_ai_modules');
    return cached ? JSON.parse(cached) : { chatbot: true, analytics: true, bep: true };
  });

  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Gerçek sunucu metrikleri — JVM/OS'dan her 15 saniyede bir güncellenir
  useEffect(() => {
    const fetchMetrics = () => {
      adminService.getSystemMetrics()
        .then(m => {
          if (m.cpuUsage >= 0) setCpuUsage(Number((m.cpuUsage).toFixed(1)));
          if (m.heapUsedMb >= 0) setHeapUsedMb(m.heapUsedMb);
          if (m.heapMaxMb >= 0) setHeapMaxMb(m.heapMaxMb);
          if (m.uptimeMs > 0) {
            const d = Math.floor(m.uptimeMs / 86400000);
            const h = Math.floor((m.uptimeMs % 86400000) / 3600000);
            const min = Math.floor((m.uptimeMs % 3600000) / 60000);
            setUptime(d > 0 ? `${d}g ${h}s ${min}dk` : h > 0 ? `${h}s ${min}dk` : `${min} dakika`);
          }
        })
        .catch(() => {});
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);


  // Ayarları Yükleme - Hata Dayanıklı & Cache'li
  const loadSettings = useCallback(() => {
    setLoading(true);
    setSettingsError(false);
    adminService.getSettings()
      .then((data) => {
        setSettings(data);
        localStorage.setItem('admin_settings_cache', JSON.stringify(data));
      })
      .catch(() => {
        setSettingsError(true);
        const cached = localStorage.getItem('admin_settings_cache');
        if (cached) {
          setSettings(JSON.parse(cached));
          toast.info('Sistem ayarları yerel önbellekten yüklendi (Salt Okunur).');
        } else {
          toast.error('Ayarlar yüklenemedi.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Token İstatistiklerini Yükleme - Hata Dayanıklı & Cache'li
  const fetchTokenStats = useCallback(() => {
    setTokenLoading(true);
    setTokenError(false);
    adminService.getTokenStats()
      .then((data) => {
        setTokenStats(data);
        localStorage.setItem('admin_token_stats_cache', JSON.stringify(data));
      })
      .catch(() => {
        setTokenError(true);
        const cached = localStorage.getItem('admin_token_stats_cache');
        if (cached) {
          setTokenStats(JSON.parse(cached));
          toast.info('Yapay zeka kota verileri önbellekten yüklendi.');
        } else {
          toast.error('Token istatistikleri alınamadı.');
        }
      })
      .finally(() => setTokenLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTokenStats();
  }, [loadSettings, fetchTokenStats]);

  // Toggle Ayarlar
  const handleToggle = async (key: keyof PlatformSettings) => {
    const newValue = !settings[key];
    if (key === 'maintenanceMode' && newValue) {
      setPendingMaintenance(true);
      return;
    }
    await applyToggle(key, newValue);
  };

  const applyToggle = async (key: keyof PlatformSettings, newValue: boolean) => {
    const optimistic = { ...settings, [key]: newValue };
    setSettings(optimistic);
    setSaving(key);
    try {
      const updated = await adminService.updateSettings({ [key]: newValue });
      setSettings(updated);
      localStorage.setItem('admin_settings_cache', JSON.stringify(updated));
      const messages: Record<keyof PlatformSettings, [string, string]> = {
        maintenanceMode: ['Sistem bakıma alındı! Tüm kullanıcı girişleri engellendi.', 'Bakım modu kapatıldı. Site aktif.'],
        registrationsOpen: ['Yeni kayıtlar tekrar açıldı.', 'Kayıtlar donduruldu.'],
        aiEnabled: ['AI özellikleri aktif edildi.', 'AI özellikleri devre dışı bırakıldı.'],
      };
      toast.success(newValue ? messages[key][0] : messages[key][1]);
    } catch {
      setSettings(settings); // rollback
      toast.error('Ayar sunucuya kaydedilemedi. Önbellekte tutuluyor.');
    } finally {
      setSaving(null);
    }
  };

  // Yapay Zeka Model Değişimi
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('admin_ai_model', model);
    setShowModelDropdown(false);
    toast.success(`Varsayılan AI Modeli: ${model} olarak güncellendi.`);
  };

  // Yapay Zeka Mikro Modül Değişimi
  const handleAiModuleToggle = (moduleKey: keyof typeof aiModules) => {
    const updated = { ...aiModules, [moduleKey]: !aiModules[moduleKey] };
    setAiModules(updated);
    localStorage.setItem('admin_ai_modules', JSON.stringify(updated));
    toast.success('Yapay zeka modül yapılandırması güncellendi.');
  };

  // Veritabanı Yedeği Tetikleyici
  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await adminService.triggerBackup();
      const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      const ts = `${today} ${now}`;
      setLastBackupTime(ts);
      localStorage.setItem('admin_last_backup', ts);
      toast.success('Veritabanı yedeği başarıyla alındı!');
    } catch {
      toast.error('Yedekleme başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setBackupLoading(false);
    }
  };

  const usagePct = tokenStats
    ? Math.min(100, Math.round((tokenStats.used / tokenStats.budget) * 100))
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Akıllı Bağlantı Hata Bildirimi */}
      {(settingsError || tokenError) && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-3xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Sunucu Bağlantısı Çevrimdışı</h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 font-medium mt-0.5">
                Canlı verilere ulaşılamadı. Platform ayarları ve kota verileri son başarılı önbellekten salt okunur modda yüklenmiştir.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              loadSettings();
              fetchTokenStats();
            }}
            className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 px-4 py-2 rounded-2xl cursor-pointer transition-all border border-amber-200/20 shadow-sm shrink-0"
          >
            <RefreshCw size={13} className="animate-pulse" />
            Sunucuya Yeniden Bağlan
          </button>
        </div>
      )}

      {/* Platform Controls - Glassmorphism */}
      <div className="rounded-[28px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm overflow-hidden transition-all hover:border-slate-300/50">
        <div className="px-6 py-5 border-b border-slate-100/60 dark:border-slate-800/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Sistem ve Platform Ayarları</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Platformun genel çalışma kurallarını ve modlarını buradan yönetin.</p>
            </div>
          </div>
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-2xl animate-pulse">
              <Loader2 size={13} className="animate-spin" /> Ayarlar Güncelleniyor...
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100/60 dark:divide-slate-800/30">
          {loading && !settings ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 size={18} className="animate-spin text-indigo-500" />
              <span className="text-xs font-semibold">Platform ayarları yükleniyor...</span>
            </div>
          ) : (
            <>
              {/* Bakım Modu */}
              <div className="flex items-center justify-between px-6 py-5 gap-6 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${settings.maintenanceMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Power size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-950 dark:text-white">Sistem Bakım Modu</h4>
                      {settings.maintenanceMode && (
                        <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-700 font-extrabold px-2 py-0.5 rounded-full animate-pulse dark:bg-amber-950/50 dark:text-amber-400">BAKIMDA</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl font-medium">
                      Aktif edildiğinde siteye sadece yöneticiler erişebilir. Kullanıcılar ve uzmanlar bakım ekranıyla karşılaşır.
                    </p>
                  </div>
                </div>
                <Toggle field="maintenanceMode" color="bg-amber-500" settings={settings} saving={saving} loading={loading} onToggle={handleToggle} />
              </div>

              {/* Yeni Kayıtlar */}
              <div className="flex items-center justify-between px-6 py-5 gap-6 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${settings.registrationsOpen ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950 dark:text-white">Yeni Kullanıcı Kayıtları</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl font-medium">
                      Kapatılırsa platforma yeni üye kabulü durdurulur. Özel davetiye linkleri hariç yeni kayıt alınmaz.
                    </p>
                  </div>
                </div>
                <Toggle field="registrationsOpen" color="bg-emerald-500 animate-all" settings={settings} saving={saving} loading={loading} onToggle={handleToggle} />
              </div>

              {/* AI Motoru */}
              <div className="flex items-center justify-between px-6 py-5 gap-6 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${settings.aiEnabled ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950 dark:text-white">Yapay Zeka (AutiBot) Motoru</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl font-medium">
                      Tüm AI özelliklerini (chatbot, BEP asistanı, otomatik analizler) global olarak kapatıp açar.
                    </p>
                  </div>
                </div>
                <Toggle field="aiEnabled" color="bg-purple-500" settings={settings} saving={saving} loading={loading} onToggle={handleToggle} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Token + Backup GRID */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* AI Yapılandırması ve Kota - 2/3 kolon */}
        <div className="lg:col-span-2 rounded-[28px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100/60 dark:border-slate-800/30 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="text-purple-500" size={18} />
                AI Motoru Kota ve Token Tüketimi
              </h3>
              <button
                onClick={fetchTokenStats}
                disabled={tokenLoading}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer disabled:opacity-50 border border-slate-200/20"
              >
                <RefreshCw size={12} className={tokenLoading ? 'animate-spin' : ''} />
                Yenile
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {tokenLoading && !tokenStats ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                  <span className="text-xs font-semibold">Token verileri güncelleniyor...</span>
                </div>
              ) : tokenStats ? (
                <>
                  {/* Premium Kota Progress Barı */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span>Gemini API Token Kullanımı</span>
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] ${usagePct >= 80 ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : usagePct >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20'}`}>
                        {usagePct}% Tüketildi
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden border border-slate-200/30 p-0.5 relative">
                      <div
                        className={`h-full rounded-full transition-all duration-700 shadow-sm ${usagePct >= 80 ? 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse' : usagePct >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600'}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-slate-400 font-semibold">
                      <span>Kullanılan: {tokenStats.used.toLocaleString('tr-TR')} tkn</span>
                      <span>Aylık Bütçe: {tokenStats.budget.toLocaleString('tr-TR')} tkn</span>
                    </div>
                  </div>

                  {usagePct >= 80 && (
                    <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-2xl px-4 py-3">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 animate-bounce" />
                      <p className="text-xs text-red-700 dark:text-red-400 font-bold">Token bütçesi kritik seviyede! AI servislerini bakım moduna almayı düşünebilirsiniz.</p>
                    </div>
                  )}

                  {/* 3'lü AI Finansal & Kota Özeti */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/30 text-center">
                      <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tahmini Maliyet</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white mt-1">${tokenStats.cost.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Bu ay harcanan</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/30 text-center">
                      <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kalan Bütçe</p>
                      <p className={`text-xl font-black mt-1 ${tokenStats.remaining < 500000 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {tokenStats.remaining.toLocaleString('tr-TR')}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Kullanılabilir tkn</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/30 text-center">
                      <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bütçe Verimi</p>
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{100 - usagePct}%</p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Mevcut tasarruf</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs font-semibold">Kota istatistikleri alınamadı.</p>
                  <button onClick={fetchTokenStats} className="mt-2 text-xs text-indigo-500 hover:underline font-bold cursor-pointer">Tekrar dene</button>
                </div>
              )}
            </div>
          </div>

          {/* İleri AI Yapılandırması Paneli - NEW PREMUM ELEMENT */}
          {settings.aiEnabled && (
            <div className="p-6 pt-0 border-t border-slate-100/60 dark:border-slate-800/30 mt-2 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">İleri AI Motoru Yapılandırması</h4>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Model Seçim Dropdown */}
                <div className="space-y-1.5 relative">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">Varsayılan Yapay Zeka Modeli</label>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="w-full flex items-center justify-between border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} className="text-purple-500" />
                      {selectedModel}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showModelDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 animate-in slide-in-from-top-2 duration-200">
                      {[
                        'Gemini 1.5 Flash (Hızlı)',
                        'Gemini 1.5 Pro (Gelişmiş)',
                        'OpenAI GPT-4o (Premium)',
                        'AutiBot Custom Fine-tuned'
                      ].map(model => (
                        <button
                          key={model}
                          onClick={() => handleModelChange(model)}
                          className="w-full px-4 py-2.5 text-xs text-left font-bold text-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-400 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          {model}
                          {selectedModel === model && <Check size={12} strokeWidth={3} className="text-purple-600 dark:text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Modül Alt Toggle'ları */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">Aktif AI Modülleri</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'chatbot', label: 'Chatbot' },
                      { key: 'analytics', label: 'Analiz' },
                      { key: 'bep', label: 'BEP Plan' },
                    ].map(mod => {
                      const isActive = aiModules[mod.key as keyof typeof aiModules];
                      return (
                        <button
                          key={mod.key}
                          type="button"
                          onClick={() => handleAiModuleToggle(mod.key as keyof typeof aiModules)}
                          className={`py-2 px-2.5 rounded-xl border text-[10px] font-extrabold text-center transition-all cursor-pointer truncate ${
                            isActive
                              ? 'bg-purple-50/60 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40 font-black shadow-sm'
                              : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500 font-semibold'
                          }`}
                        >
                          {mod.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Yedekleme, Bakım & Canlı Sunucu Telemetrisi - 1/3 kolon */}
        <div className="space-y-6">
          
          {/* Yedekleme & Bakım Kartı */}
          <div className="rounded-[28px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm overflow-hidden hover:border-slate-300/50 transition-all">
            <div className="px-6 py-5 border-b border-slate-100/60 dark:border-slate-800/30">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="text-indigo-500" size={18} />
                Yedekleme & Bakım
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* DB Yedeği */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-slate-500" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Veritabanı SQL Yedeği</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 ml-5 leading-normal">
                    {lastBackupTime ? `Son: ${lastBackupTime}` : 'Henüz yedek alınmadı'}
                  </p>
                </div>
                <Badge className={`text-[10px] font-extrabold border ${lastBackupTime ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'}`}>
                  {lastBackupTime ? 'Güvenli' : 'Bekliyor'}
                </Badge>
              </div>

              {/* Uptime */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 dark:border-slate-800/30">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-500" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Uptime (Çalışma Süresi)</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 ml-5">Platform kesintisiz aktif</p>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 text-[10px]">
                  {uptime}
                </Badge>
              </div>

              {/* DB Durumu */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 dark:border-slate-800/30">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">PostgreSQL Sağlığı</p>
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 ml-5">Kararlı & Optimize</p>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>

              <Button
                onClick={handleBackup}
                loading={backupLoading}
                variant="outline"
                className="w-full h-9.5 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-[11px] mt-2 transition-all cursor-pointer shadow-sm"
              >
                {!backupLoading && <RefreshCw size={12} className="mr-1.5 text-slate-400" />}
                Anlık SQL Yedeği Al
              </Button>
            </div>
          </div>

          {/* Canlı Sunucu Telemetrisi Kartı - NEW HIGHLY PREMIUM COMPONENT */}
          <div className="rounded-[28px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm overflow-hidden hover:border-slate-300/50 transition-all">
            <div className="px-6 py-4.5 border-b border-slate-100/60 dark:border-slate-800/30">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="text-purple-500" size={17} />
                Canlı Sunucu Sağlığı
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              
              {/* CPU Yükü */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CpuIcon size={13} className="text-purple-500" />
                    Sunucu CPU Yükü
                  </span>
                  <span>{cpuUsage >= 0 ? `%${cpuUsage}` : '—'}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: cpuUsage >= 0 ? `${Math.min(cpuUsage, 100)}%` : '0%' }}
                  />
                </div>
              </div>

              {/* JVM Heap Belleği */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100/50 dark:border-slate-800/20">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Database size={13} className="text-rose-400" />
                    JVM Heap Belleği
                  </span>
                  <span className="font-black text-slate-700 dark:text-slate-300">
                    {heapUsedMb >= 0 ? `${heapUsedMb} MB / ${heapMaxMb} MB` : '—'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: heapMaxMb > 0 ? `${Math.min((heapUsedMb / heapMaxMb) * 100, 100)}%` : '0%' }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bakım modu onay dialog */}
      <ConfirmModal
        isOpen={pendingMaintenance !== null}
        title="Bakım modunu aktif et?"
        message="Bu işlem tüm kullanıcıların siteye erişimini anında keser. Sadece yöneticiler giriş yapabilir. Emin misiniz?"
        confirmLabel="Evet, bakıma al"
        variant="danger"
        onConfirm={async () => {
          setPendingMaintenance(null);
          await applyToggle('maintenanceMode', true);
        }}
        onCancel={() => setPendingMaintenance(null)}
      />
    </div>
  );
}
