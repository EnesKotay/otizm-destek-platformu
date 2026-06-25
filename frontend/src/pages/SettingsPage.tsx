import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Globe,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  PanelLeftClose,
  Shield,
  Smartphone,
  Trash2,
  TrendingUp,
  Type,
  User,
  Users,
  Wind,
  X,
  ZapOff,
  Contrast,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from '@/store/toastStore';
import { uploadService } from '@/services/uploadService';
import { userService } from '@/services/userService';
import { cn } from '@/utils/cn';

const CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli',
  'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop',
  'Sivas', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];

function readPreference(key: string, fallback = true) {
  return localStorage.getItem(key) !== String(!fallback);
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary-600' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function SettingRow({
  checked,
  description,
  disabled,
  icon: Icon,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-100">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{label}</span>
          <span className="block text-xs text-slate-500">{description}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn('hidden text-[11px] font-bold sm:inline', checked ? 'text-primary-600' : 'text-slate-400')}>
          {checked ? 'Açık' : 'Kapalı'}
        </span>
        <Switch checked={checked} disabled={disabled} onChange={onChange} />
      </div>
    </div>
  );
}

function PasswordVisibilityButton({
  isVisible,
  onClick,
}: {
  isVisible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-9 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
    >
      {isVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
    </button>
  );
}

export function SettingsPage() {
  return <SettingsCore />;
}

function SettingsCore() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushPermissionDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  useEffect(() => {
    pushNotificationService.isSubscribed().then(setPushEnabled).catch(() => {});
  }, []);

  const handleTogglePush = async (value: boolean) => {
    if (pushPermissionDenied) {
      toast.error('Tarayıcı bildirim iznini engelledi. Adres çubuğundaki kilit ikonuna tıklayıp "Bildirimler → İzin Ver" seçin, sonra sayfayı yenileyin.');
      return;
    }
    setPushLoading(true);
    try {
      if (value) {
        const granted = await pushNotificationService.requestPermission();
        if (!granted) {
          toast.error('Bildirim izni verilmedi. Tarayıcı ayarlarından bu site için bildirimlere izin verin.');
          setPushLoading(false);
          return;
        }
        const ok = await pushNotificationService.subscribe();
        if (ok) { setPushEnabled(true); toast.success('Push bildirimler açıldı.'); }
        else toast.error('Push bildirim aktif edilemedi.');
      } else {
        await pushNotificationService.unsubscribe();
        setPushEnabled(false);
        toast.success('Push bildirimler kapatıldı.');
      }
    } catch { toast.error('İşlem başarısız.'); }
    setPushLoading(false);
  };

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  // Uzman alanları
  const [bio, setBio] = useState(user?.bio || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.licenseNumber || '');
  const [expertTitle, setExpertTitle] = useState(user?.expertTitle || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [notifMessages, setNotifMessages] = useState(() => readPreference('notif_messages'));
  const [notifForum, setNotifForum] = useState(() => readPreference('notif_forum'));
  const [notifMatching, setNotifMatching] = useState(() => readPreference('notif_matching'));
  const [notifCalendar, setNotifCalendar] = useState(() => readPreference('notif_calendar'));
  const [notifAppointmentRequest, setNotifAppointmentRequest] = useState(() => readPreference('notif_appointment_request'));
  const [notifPatientConnection, setNotifPatientConnection] = useState(() => readPreference('notif_patient_connection'));
  const [expertPublicProfile, setExpertPublicProfile] = useState(() => localStorage.getItem('expert-public-profile') !== 'false');

  // Parent-specific state
  const [notifExpertNote, setNotifExpertNote] = useState(() => readPreference('notif_expert_note'));
  const [notifTaskAssigned, setNotifTaskAssigned] = useState(() => readPreference('notif_task_assigned'));
  const [notifApptConfirm, setNotifApptConfirm] = useState(() => readPreference('notif_appt_confirm'));
  const [apptPreferOnline, setApptPreferOnline] = useState(() => localStorage.getItem('appt_prefer_online') === 'true');
  const [apptPreferWeekend, setApptPreferWeekend] = useState(() => localStorage.getItem('appt_prefer_weekend') === 'true');
  const [apptReminder24h, setApptReminder24h] = useState(() => readPreference('appt_reminder_24h'));
  const [privacyShowProfile, setPrivacyShowProfile] = useState(() => localStorage.getItem('privacy_show_profile') !== 'false');
  const [privacyAllowMessages, setPrivacyAllowMessages] = useState(() => localStorage.getItem('privacy_allow_messages') !== 'false');
  const [privacyShareProgress, setPrivacyShareProgress] = useState(() => localStorage.getItem('privacy_share_progress') !== 'false');

  const [sidebarCompact, setSidebarCompact] = useState(() => localStorage.getItem('sidebar-compact') === 'true');
  const [sidebarBadges, setSidebarBadges] = useState(() => localStorage.getItem('sidebar-show-badges') !== 'false');
  const [sidebarDescriptions, setSidebarDescriptions] = useState(() => localStorage.getItem('sidebar-show-descriptions') === 'true');
  const [rememberGroups, setRememberGroups] = useState(() => localStorage.getItem('sidebar-remember-groups') !== 'false');
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('settings-focus-mode') === 'true');

  // Accessibility preferences
  const [a11yLargeText, setA11yLargeText] = useState(() => localStorage.getItem('access-large-text') === 'true');
  const [a11yReduceMotion, setA11yReduceMotion] = useState(() => localStorage.getItem('access-reduce-motion') === 'true');
  const [a11yCalmMode, setA11yCalmMode] = useState(() => localStorage.getItem('access-calm-mode') === 'true');
  const [a11yHighContrast, setA11yHighContrast] = useState(() => localStorage.getItem('access-high-contrast') === 'true');
  const [a11yKeyboardFocus, setA11yKeyboardFocus] = useState(() => localStorage.getItem('access-keyboard-focus') === 'true');

  const roleLabel = user?.role === 'ADMIN' ? 'Yönetici' : user?.role === 'EXPERT' ? 'Uzman' : 'Aile';
  const isExpert = user?.role === 'EXPERT';
  const isParent = user?.role !== 'EXPERT' && user?.role !== 'ADMIN';
  const profileChanged = fullName !== (user?.fullName || '') || phone !== (user?.phone || '') || city !== (user?.city || '')
    || (isExpert && (bio !== (user?.bio || '') || institution !== (user?.institution || '') || licenseNumber !== (user?.licenseNumber || '') || expertTitle !== (user?.expertTitle || '')));

  // Uzman için genişletilmiş tamamlanma hesabı
  const completedProfileFields = isExpert
    ? [user?.fullName, user?.email, user?.phone, user?.city, user?.profileImageUrl, user?.bio, user?.institution, user?.licenseNumber, user?.expertTitle].filter(Boolean).length
    : [user?.fullName, user?.email, user?.phone, user?.city, user?.profileImageUrl].filter(Boolean).length;
  const totalProfileFields = isExpert ? 9 : 5;
  const profileCompletion = Math.round((completedProfileFields / totalProfileFields) * 100);

  const passwordScore = useMemo(() => {
    const checks = [
      newPassword.length >= 8,
      /[A-ZÇĞİÖŞÜ]/.test(newPassword),
      /[a-zçğıöşü]/.test(newPassword),
      /\d/.test(newPassword),
      /[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(newPassword),
    ];
    return checks.filter(Boolean).length;
  }, [newPassword]);

  const handlePreference = (
    key: string,
    value: boolean,
    setter: (value: boolean) => void,
    successText = value ? 'Tercih açıldı.' : 'Tercih kapatıldı.'
  ) => {
    localStorage.setItem(key, String(value));
    setter(value);
    window.dispatchEvent(new CustomEvent('sidebar-preference-change', { detail: { key, value } }));
    toast.success(successText);
  };

  const handleSidebarCompact = (value: boolean) => {
    localStorage.setItem('sidebar-compact', String(value));
    setSidebarCompact(value);
    window.dispatchEvent(new CustomEvent('sidebar-compact-change', { detail: value }));
    toast.success(value ? 'Kompakt menü açıldı.' : 'Geniş menü açıldı.');
  };

  const handleA11y = (
    key: string,
    cssClass: string,
    value: boolean,
    setter: (v: boolean) => void,
    label: string,
  ) => {
    localStorage.setItem(key, String(value));
    setter(value);
    if (value) document.documentElement.classList.add(cssClass);
    else document.documentElement.classList.remove(cssClass);
    toast.success(value ? `${label} açıldı.` : `${label} kapatıldı.`);
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Ad soyad alanı boş bırakılamaz.');
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await userService.updateProfile({
        fullName: fullName.trim(), phone: phone.trim(), city,
        ...(isExpert && { bio: bio.trim(), institution: institution.trim(), licenseNumber: licenseNumber.trim(), expertTitle: expertTitle.trim() }),
      });
      setUser(updated);
      toast.success('Profil bilgileri güncellendi.');
    } catch {
      toast.error('Güncelleme başarısız oldu.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    if (passwordScore < 3) {
      toast.error('Daha güçlü bir şifre seçin.');
      return;
    }

    setPasswordSaving(true);
    try {
      await userService.changePassword({ currentPassword, newPassword });
      toast.success('Şifre başarıyla değiştirildi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch {
      toast.error('Mevcut şifre yanlış veya bir hata oluştu.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seçin.');
      return;
    }

    setPhotoUploading(true);
    try {
      const url = await uploadService.upload(file);
      const updated = await userService.updateProfile({ fullName, phone, city, profileImageUrl: url });
      setUser(updated);
      toast.success('Profil fotoğrafı güncellendi.');
    } catch {
      toast.error('Fotoğraf yüklenemedi.');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadData = async () => {
    try {
      const res = await userService.downloadData();
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'verilerim.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Veriler indirilemedi.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SİL') return;

    setDeleting(true);
    try {
      await userService.deleteAccount();
      logout();
      navigate('/giris');
    } catch {
      toast.error('Hesap silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 bg-gradient-to-r from-primary-50 via-white to-sky-50 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-primary-100 ring-4 ring-white">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Profil" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary-700">{user?.fullName?.charAt(0) || 'K'}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200 transition-colors hover:bg-primary-700 disabled:opacity-60"
                title="Fotoğraf değiştir"
              >
                <Camera size={16} aria-hidden="true" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-slate-950">Ayarlar</h1>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-700 ring-1 ring-primary-100">{roleLabel}</span>
                {user?.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                    <CheckCircle2 size={13} aria-hidden="true" /> Doğrulandı
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">{user?.email}</p>
              {photoUploading && <p className="mt-1 text-xs font-semibold text-primary-600">Fotoğraf yükleniyor...</p>}
            </div>
          </div>

          <div className="min-w-[14rem] rounded-3xl bg-white/80 p-4 ring-1 ring-slate-100">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Profil tamamlanma</span>
              <span className={profileCompletion === 100 ? 'text-emerald-600' : 'text-primary-700'}>{profileCompletion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-all', profileCompletion === 100 ? 'bg-emerald-500' : 'bg-primary-600')}
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            {profileCompletion === 100 ? (
              <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 size={11} /> Profil eksiksiz!
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {(isExpert
                  ? [
                      { key: user?.fullName, label: 'Ad Soyad' },
                      { key: user?.phone, label: 'Telefon' },
                      { key: user?.city, label: 'Şehir' },
                      { key: user?.profileImageUrl, label: 'Profil fotoğrafı' },
                      { key: user?.bio, label: 'Biyografi' },
                      { key: user?.institution, label: 'Kurum' },
                      { key: user?.licenseNumber, label: 'Lisans No' },
                      { key: user?.expertTitle, label: 'Unvan' },
                    ]
                  : [
                      { key: user?.fullName, label: 'Ad Soyad' },
                      { key: user?.phone, label: 'Telefon' },
                      { key: user?.city, label: 'Şehir' },
                      { key: user?.profileImageUrl, label: 'Profil fotoğrafı' },
                    ]
                ).filter(f => !f.key).slice(0, 3).map(f => (
                  <li key={f.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                    {f.label} eksik
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <User size={20} aria-hidden="true" /> Profil Bilgileri
                </div>
              </CardTitle>
              <Button onClick={handleUpdateProfile} loading={profileSaving} disabled={!profileChanged || profileSaving} size="sm">
                Kaydet
              </Button>
            </CardHeader>

            <div className="px-5 pb-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Ad Soyad" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              <Input label="E-posta" value={user?.email || ''} disabled />
              <Input label="Telefon" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="05XX XXX XX XX" />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Şehir</label>
                <select
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Şehir seçin</option>
                  {CITIES.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Uzman profil alanları */}
            {isExpert && (
              <div className="pt-5 border-t border-gray-100 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Uzman Profil Bilgileri</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Uzmanlık Unvanı"
                    value={expertTitle}
                    onChange={e => setExpertTitle(e.target.value)}
                    placeholder="Örn: Çocuk Psikologu, Dil Terapisti"
                  />
                  <Input
                    label="Kurum / Klinik"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="Örn: Özel Klinik, Devlet Hastanesi"
                  />
                  <Input
                    label="Lisans / Diploma No"
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                    placeholder="Meslek belgesi numarası"
                  />
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <SettingRow
                    icon={Globe}
                    label="Profilim herkese açık"
                    description="Aileler sizi uzman arama listesinde bulabilsin"
                    checked={expertPublicProfile}
                    onChange={(value) => {
                      localStorage.setItem('expert-public-profile', String(value));
                      setExpertPublicProfile(value);
                      toast.success(value ? 'Profil herkese açık.' : 'Profil gizlendi.');
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Biyografi</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Kendinizi tanıtın — uzmanlık alanlarınız, deneyimleriniz ve ailelere nasıl yardımcı olduğunuz..."
                    className={cn(
                      'w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 transition-all focus:border-transparent focus:outline-none focus:ring-2 resize-none',
                      bio.length >= 500 ? 'border-red-300 focus:ring-red-400' : bio.length > 470 ? 'border-amber-300 focus:ring-amber-400' : 'border-gray-300 focus:ring-primary-500'
                    )}
                  />
                  <p className={cn(
                    'text-xs',
                    bio.length >= 500 ? 'text-red-500 font-semibold' : bio.length > 470 ? 'text-amber-500' : 'text-gray-400'
                  )}>
                    {bio.length}/500 karakter
                    {bio.length >= 500 && ' — limite ulaşıldı!'}
                    {bio.length > 470 && bio.length < 500 && ` — ${500 - bio.length} karakter kaldı`}
                  </p>
                </div>
              </div>
            )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Lock size={20} aria-hidden="true" /> Güvenlik
                </div>
              </CardTitle>
              {!showPasswordForm && (
                <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
                  Şifre Değiştir
                </Button>
              )}
            </CardHeader>

            {showPasswordForm ? (
              <div className="px-5 pb-5 space-y-4">
                <div className="relative">
                  <Input
                    label="Mevcut Şifre"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                  <PasswordVisibilityButton isVisible={showCurrent} onClick={() => setShowCurrent((value) => !value)} />
                </div>
                <div className="relative">
                  <Input
                    label="Yeni Şifre"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="En az 8 karakter"
                  />
                  <PasswordVisibilityButton isVisible={showNew} onClick={() => setShowNew((value) => !value)} />
                </div>
                <Input
                  label="Yeni Şifre Tekrar"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Şifre gücü</span>
                    <span className={passwordScore < 3 ? 'text-red-500' : passwordScore < 5 ? 'text-amber-600' : 'text-emerald-600'}>
                      {passwordScore < 3 ? 'Zayıf' : passwordScore < 5 ? 'İyi' : 'Güçlü'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={index}
                        className={cn(
                          'h-2 rounded-full transition-colors',
                          index < passwordScore
                            ? passwordScore < 3 ? 'bg-red-400' : passwordScore < 5 ? 'bg-amber-400' : 'bg-emerald-500'
                            : 'bg-slate-200'
                        )}
                      />
                    ))}
                  </div>
                  {newPassword.length > 0 && (
                    <ul className="space-y-1.5">
                      {[
                        { label: 'En az 8 karakter', pass: newPassword.length >= 8 },
                        { label: 'Büyük harf (A-Z)', pass: /[A-ZÇĞİÖŞÜ]/.test(newPassword) },
                        { label: 'Küçük harf (a-z)', pass: /[a-zçğıöşü]/.test(newPassword) },
                        { label: 'Rakam (0-9)', pass: /\d/.test(newPassword) },
                        { label: 'Özel karakter (!@#...)', pass: /[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(newPassword) },
                      ].map(({ label, pass }) => (
                        <li key={label} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {pass
                            ? <CheckCircle2 size={12} className="shrink-0" />
                            : <X size={12} className="shrink-0" />
                          }
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="sm:flex-1"
                  >
                    İptal
                  </Button>
                  <Button onClick={handleChangePassword} loading={passwordSaving} className="sm:flex-1">
                    Şifreyi Güncelle
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 pb-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Oturum aktif</p>
                  <p className="mt-1 text-xs text-emerald-700">Hesabınız korumalı alanda çalışıyor.</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">E-posta</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Bell size={20} aria-hidden="true" /> Bildirim Tercihleri
                </div>
              </CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 space-y-3">
              <SettingRow
                icon={Mail}
                label="Yeni mesajlar"
                description="Mesaj geldiğinde bildirim göster"
                checked={notifMessages}
                onChange={(value) => handlePreference('notif_messages', value, setNotifMessages, value ? 'Mesaj bildirimleri açıldı.' : 'Mesaj bildirimleri kapatıldı.')}
              />
              <SettingRow
                icon={Bell}
                label="Forum bildirimleri"
                description="Yanıt ve yorumlar için uyarı al"
                checked={notifForum}
                onChange={(value) => handlePreference('notif_forum', value, setNotifForum, value ? 'Forum bildirimleri açıldı.' : 'Forum bildirimleri kapatıldı.')}
              />
              <SettingRow
                icon={User}
                label="Benzer aile eşleşmesi"
                description="Yeni eşleşme önerilerini bildir"
                checked={notifMatching}
                onChange={(value) => handlePreference('notif_matching', value, setNotifMatching, value ? 'Eşleşme bildirimleri açıldı.' : 'Eşleşme bildirimleri kapatıldı.')}
              />
              <SettingRow
                icon={Smartphone}
                label="Takvim hatırlatıcıları"
                description="Randevu ve etkinliklerden önce hatırlat"
                checked={notifCalendar}
                onChange={(value) => handlePreference('notif_calendar', value, setNotifCalendar, value ? 'Takvim hatırlatıcıları açıldı.' : 'Takvim hatırlatıcıları kapatıldı.')}
              />
              {isExpert && (
                <>
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Uzman Bildirimleri</p>
                  </div>
                  <SettingRow
                    icon={Calendar}
                    label="Yeni randevu isteği"
                    description="Aile size randevu talebi gönderdiğinde bildir"
                    checked={notifAppointmentRequest}
                    onChange={(value) => handlePreference('notif_appointment_request', value, setNotifAppointmentRequest, value ? 'Randevu bildirimleri açıldı.' : 'Randevu bildirimleri kapatıldı.')}
                  />
                  <SettingRow
                    icon={Users}
                    label="Yeni bağlantı isteği"
                    description="Danışan bağlantı isteği geldiğinde bildir"
                    checked={notifPatientConnection}
                    onChange={(value) => handlePreference('notif_patient_connection', value, setNotifPatientConnection, value ? 'Bağlantı bildirimleri açıldı.' : 'Bağlantı bildirimleri kapatıldı.')}
                  />
                </>
              )}
              {isParent && (
                <>
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Aile Bildirimleri</p>
                  </div>
                  <SettingRow
                    icon={FileText}
                    label="Uzman not gönderdi"
                    description="Bağlı uzman çocuğunuz için not veya rapor eklediğinde bildir"
                    checked={notifExpertNote}
                    onChange={(value) => handlePreference('notif_expert_note', value, setNotifExpertNote, value ? 'Not bildirimleri açıldı.' : 'Not bildirimleri kapatıldı.')}
                  />
                  <SettingRow
                    icon={ClipboardList}
                    label="Yeni görev atandı"
                    description="Uzman çocuğunuz için egzersiz veya görev atadığında bildir"
                    checked={notifTaskAssigned}
                    onChange={(value) => handlePreference('notif_task_assigned', value, setNotifTaskAssigned, value ? 'Görev bildirimleri açıldı.' : 'Görev bildirimleri kapatıldı.')}
                  />
                  <SettingRow
                    icon={Calendar}
                    label="Randevu onayı / iptali"
                    description="Uzman randevunuzu onayladığında veya iptal ettiğinde bildir"
                    checked={notifApptConfirm}
                    onChange={(value) => handlePreference('notif_appt_confirm', value, setNotifApptConfirm, value ? 'Randevu bildirimleri açıldı.' : 'Randevu bildirimleri kapatıldı.')}
                  />
                </>
              )}
            </div>
          </Card>

          {isParent && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Calendar size={20} aria-hidden="true" /> Randevu Tercihleri
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="px-5 pb-5 space-y-3">
                <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700 leading-relaxed">
                  Bu tercihler kayıt altına alınır; uzmanlar randevu teklifi yaparken bu bilgileri görebilir.
                </div>
                <SettingRow
                  icon={Smartphone}
                  label="Online seans tercih ederim"
                  description="Uzman önerisinde video görüşmeyi ön plana çıkarır"
                  checked={apptPreferOnline}
                  onChange={(value) => {
                    localStorage.setItem('appt_prefer_online', String(value));
                    setApptPreferOnline(value);
                    toast.success(value ? 'Online tercih kaydedildi.' : 'Yüz yüze tercih kaydedildi.');
                  }}
                />
                <SettingRow
                  icon={Clock}
                  label="Hafta sonu uygunluk"
                  description="Cumartesi ve Pazar günleri müsait olduğumu belirtir"
                  checked={apptPreferWeekend}
                  onChange={(value) => {
                    localStorage.setItem('appt_prefer_weekend', String(value));
                    setApptPreferWeekend(value);
                    toast.success(value ? 'Hafta sonu uygunluğu eklendi.' : 'Hafta sonu uygunluğu kaldırıldı.');
                  }}
                />
                <SettingRow
                  icon={Bell}
                  label="24 saat önceden hatırlat"
                  description="Randevudan bir gün önce hatırlatma bildirimi gönder"
                  checked={apptReminder24h}
                  onChange={(value) => handlePreference('appt_reminder_24h', value, setApptReminder24h, value ? 'Hatırlatma açıldı.' : 'Hatırlatma kapatıldı.')}
                />
              </div>
            </Card>
          )}

          {isParent && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Shield size={20} aria-hidden="true" /> Gizlilik Tercihleri
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="px-5 pb-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                  Bu ayarlar yalnızca onaylı bağlantılarınız olan uzmanları etkiler.
                </div>
                <SettingRow
                  icon={Eye}
                  label="Profilim uzmanlara görünsün"
                  description="Onaylı uzmanlar profil kartınızı ve çocuk bilgilerinizi görebilir"
                  checked={privacyShowProfile}
                  onChange={(value) => {
                    localStorage.setItem('privacy_show_profile', String(value));
                    setPrivacyShowProfile(value);
                    toast.success(value ? 'Profil görünürlüğü açıldı.' : 'Profil görünürlüğü kapatıldı.');
                  }}
                />
                <SettingRow
                  icon={Mail}
                  label="Doğrudan mesaj izni"
                  description="Bağlı uzmanlar size uygulama içinden mesaj gönderebilir"
                  checked={privacyAllowMessages}
                  onChange={(value) => {
                    localStorage.setItem('privacy_allow_messages', String(value));
                    setPrivacyAllowMessages(value);
                    toast.success(value ? 'Mesaj izni verildi.' : 'Mesaj izni kaldırıldı.');
                  }}
                />
                <SettingRow
                  icon={TrendingUp}
                  label="Gelişim notları paylaşımı"
                  description="Uzmanlar çocuğunuzun not ve ilerleme kayıtlarını görebilir"
                  checked={privacyShareProgress}
                  onChange={(value) => {
                    localStorage.setItem('privacy_share_progress', String(value));
                    setPrivacyShareProgress(value);
                    toast.success(value ? 'Gelişim paylaşımı açıldı.' : 'Gelişim paylaşımı kapatıldı.');
                  }}
                />
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={20} aria-hidden="true" /> Görünüm
                </div>
              </CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 space-y-3">
              <SettingRow
                icon={PanelLeftClose}
                label="Kompakt yan menü"
                description="Menüyü ikon odaklı daralt"
                checked={sidebarCompact}
                onChange={handleSidebarCompact}
              />
              <SettingRow
                icon={Bell}
                label="Menü rozetleri"
                description="Mesaj ve randevu sayılarını göster"
                checked={sidebarBadges}
                onChange={(value) => handlePreference('sidebar-show-badges', value, setSidebarBadges)}
              />
              <SettingRow
                icon={Eye}
                label="Menü açıklamaları"
                description="Menülerin kısa kullanım amacını göster"
                checked={sidebarDescriptions}
                onChange={(value) => handlePreference('sidebar-show-descriptions', value, setSidebarDescriptions)}
              />
              <SettingRow
                icon={LayoutDashboard}
                label="Grup durumunu hatırla"
                description="Açık/kapalı menü grupları saklansın"
                checked={rememberGroups}
                onChange={(value) => handlePreference('sidebar-remember-groups', value, setRememberGroups)}
              />
              <SettingRow
                icon={Bell}
                label="Push Bildirimler"
                description={
                  pushPermissionDenied
                    ? 'Tarayıcı engelledi — kilit ikonundan izin verin'
                    : 'İlaç hatırlatmaları ve mesajlar için anlık bildirim'
                }
                checked={pushEnabled}
                disabled={pushLoading || !pushNotificationService.isSupported() || pushPermissionDenied}
                onChange={handleTogglePush}
              />
              <SettingRow
                icon={Eye}
                label="Odak modu"
                description="Daha sakin tercihleri yerelde sakla"
                checked={focusMode}
                onChange={(value) => handlePreference('settings-focus-mode', value, setFocusMode)}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Shield size={20} aria-hidden="true" /> Hesap Durumu
                </div>
              </CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <User size={18} className="text-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{roleLabel} hesabı</p>
                  <p className="truncate text-xs text-slate-500">{user?.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <MapPin size={18} className="text-slate-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.city || 'Şehir seçilmedi'}</p>
                  <p className="text-xs text-slate-500">Yakındaki öneriler için kullanılır</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <Shield size={18} className="text-slate-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.kvkkConsent ? 'KVKK onayı var' : 'KVKK onayı eksik'}</p>
                  <p className="text-xs text-slate-500">Veri işleme tercihleri hesabınızda tutulur</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Eye size={20} aria-hidden="true" /> Erişilebilirlik
                </div>
              </CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 space-y-3">
              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-700 leading-relaxed">
                Bu ayarlar anında uygulanır ve tarayıcıda kalıcı olarak saklanır.
              </div>
              <SettingRow
                icon={Type}
                label="Büyük yazı modu"
                description="Tüm metinleri daha büyük gösterir"
                checked={a11yLargeText}
                onChange={v => handleA11y('access-large-text', 'a11y-large-text', v, setA11yLargeText, 'Büyük yazı modu')}
              />
              <SettingRow
                icon={Wind}
                label="Sakin mod"
                description="Renk yoğunluğunu azaltır, göz yormayan görünüm"
                checked={a11yCalmMode}
                onChange={v => handleA11y('access-calm-mode', 'a11y-calm', v, setA11yCalmMode, 'Sakin mod')}
              />
              <SettingRow
                icon={ZapOff}
                label="Animasyonları azalt"
                description="Tüm geçiş efektlerini ve animasyonları kapatır"
                checked={a11yReduceMotion}
                onChange={v => handleA11y('access-reduce-motion', 'a11y-reduce-motion', v, setA11yReduceMotion, 'Animasyon azaltma')}
              />
              <SettingRow
                icon={Contrast}
                label="Yüksek kontrast"
                description="Metin ve arka plan arasındaki zıtlığı artırır"
                checked={a11yHighContrast}
                onChange={v => handleA11y('access-high-contrast', 'a11y-high-contrast', v, setA11yHighContrast, 'Yüksek kontrast')}
              />
              <SettingRow
                icon={KeyRound}
                label="Klavye odak göstergesi"
                description="Tab ile gezerken belirgin odak halkası gösterir"
                checked={a11yKeyboardFocus}
                onChange={v => handleA11y('access-keyboard-focus', 'a11y-keyboard-focus', v, setA11yKeyboardFocus, 'Klavye odak göstergesi')}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Shield size={20} aria-hidden="true" /> KVKK ve Gizlilik
                </div>
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                Kişisel verileriniz korumalı biçimde saklanır. Hesabınıza ait dışa aktarma ve silme işlemlerini buradan yönetebilirsiniz.
              </div>
              <div className="grid gap-3">
                <Button variant="outline" onClick={handleDownloadData} className="w-full">
                  <Download size={16} className="mr-2" aria-hidden="true" /> Verilerimi İndir
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="w-full">
                  <Trash2 size={16} className="mr-2" aria-hidden="true" /> Hesabımı Sil
                </Button>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirm(''); }} title="Hesabı Sil">
        <div className="space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Bu işlem geri alınamaz.</p>
            <p className="mt-1 text-sm text-red-700">
              Tüm çocuk profilleri, notlar, takvim etkinlikleri ve mesajlar kalıcı olarak silinecektir.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">
              Devam etmek için <strong>SİL</strong> yazın:
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }} className="flex-1">
              İptal
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={deleting}
              disabled={deleteConfirm !== 'SİL'}
              className="flex-1"
            >
              Hesabı Kalıcı Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
