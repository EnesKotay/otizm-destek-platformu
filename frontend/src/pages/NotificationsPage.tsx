import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellRing, Check, CheckCheck, Trash2, Filter, ChevronDown, Loader2,
  Settings, Volume2, VolumeX, Sparkles, X,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';
import {
  getNotificationIconConfig,
  getNotificationCategory,
  groupNotificationsByDate,
  NOTIFICATION_PREF_ITEMS,
  getPreferenceValue,
  setPreferenceValue,
  CATEGORY_LABELS,
  type NotificationCategory,
} from '@/utils/notificationUtils';
import { formatRelative } from '@/utils/date';
import type { Notification } from '@/types';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Push Notification & Settings states
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => pushNotificationService.getPermission());
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => getPreferenceValue('notif_sound', true));
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NOTIFICATION_PREF_ITEMS.forEach(item => {
      initial[item.key] = getPreferenceValue(item.key, true);
    });
    return initial;
  });

  const navigate = useNavigate();

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    try {
      const data = await notificationService.getPaged(pageNum, 20);
      setNotifications(prev => reset ? data.content : [...prev, ...data.content]);
      setHasMore(!data.last);
      setPage(pageNum);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPage(0, true).finally(() => setLoading(false));
  }, [fetchPage]);

  const handleEnablePush = async () => {
    setPushSubscribing(true);
    try {
      const granted = await pushNotificationService.requestPermission();
      if (granted) {
        await pushNotificationService.subscribe();
      }
      setPushPermission(pushNotificationService.getPermission());
    } catch {
      /* ignore */
    } finally {
      setPushSubscribing(false);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setPreferenceValue('notif_sound', next);
  };

  const handleTogglePref = (key: string) => {
    const next = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: next }));
    setPreferenceValue(key, next);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchPage(page + 1);
    setLoadingMore(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch { /* ignore */ }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await notificationService.deleteNotifications([...selectedIds]);
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
    } catch { /* ignore */ }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link);
  };

  // Filtreleme
  const filtered = notifications.filter(n => {
    if (activeCategory !== 'all' && getNotificationCategory(n.type) !== activeCategory) return false;
    if (showUnreadOnly && n.read) return false;
    return true;
  });

  const grouped = groupNotificationsByDate(filtered);
  const unreadCount = notifications.filter(n => !n.read).length;
  const categories: NotificationCategory[] = ['all', 'appointments', 'messages', 'forum', 'tasks', 'social', 'system'];

  const dateGroups = [
    { title: 'Bugün', items: grouped.today },
    { title: 'Dün', items: grouped.yesterday },
    { title: 'Bu Hafta', items: grouped.thisWeek },
    { title: 'Daha Eski', items: grouped.older },
  ].filter(g => g.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Başlık ve Aksiyonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-md shadow-primary-600/20">
            <Bell size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bildirimler</h1>
            <p className="text-sm font-medium text-slate-500">
              {unreadCount > 0 ? `${unreadCount} okunmamış bildiriminiz var` : 'Tüm bildirimleriniz okunmuş'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Settings size={15} className="text-slate-500" />
            <span>Ayarlar</span>
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              {selectedIds.size} seçili sil
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors cursor-pointer"
            >
              <CheckCheck size={15} />
              Tümünü oku
            </button>
          )}
        </div>
      </div>

      {/* Web Push İzin Banner'ı */}
      <NotificationPermissionBanner onPermissionChange={setPushPermission} />

      {/* Kategori Sekmeleri */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => {
          const count = cat === 'all'
            ? notifications.length
            : notifications.filter(n => getNotificationCategory(n.type) === cat).length;
          if (cat !== 'all' && count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              {CATEGORY_LABELS[cat]}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                activeCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              showUnreadOnly
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            <Filter size={14} />
            Okunmamış
          </button>
        </div>
      </div>

      {/* Bildirim Listesi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500 font-bold">Bildirimler yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-slate-100 shadow-inner">
              <BellRing size={36} className="text-slate-300" />
            </div>
            <p className="text-lg font-extrabold text-slate-900">
              {showUnreadOnly ? 'Okunmamış bildirim yok' : 'Bildirim bulunamadı'}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-1.5">
              {showUnreadOnly
                ? 'Tüm bildirimleriniz okunmuş durumda.'
                : activeCategory !== 'all'
                  ? 'Bu kategoride henüz bildirim yok.'
                  : 'Yeni bir gelişme olduğunda size haber vereceğiz.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dateGroups.map(group => (
              <div key={group.title}>
                <div className="bg-slate-50/80 px-4 py-2 border-y border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {group.title} ({group.items.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map(n => {
                    const config = getNotificationIconConfig(n.type);
                    const Icon = config.icon;
                    const isSelected = selectedIds.has(n.id);

                    return (
                      <div
                        key={n.id}
                        className={`group relative flex items-start gap-4 p-4 sm:p-5 transition-all duration-200 ${
                          n.link ? 'cursor-pointer hover:bg-slate-50/80' : ''
                        } ${!n.read ? 'bg-primary-50/30' : ''} ${isSelected ? 'bg-primary-50/50 ring-1 ring-primary-200' : ''}`}
                      >
                        {!n.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 rounded-r-full" />
                        )}

                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(n.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                        </div>

                        {/* İkon */}
                        <div
                          onClick={() => handleClick(n)}
                          className={`mt-0.5 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${config.bg} ${config.border}`}
                        >
                          <Icon size={20} className={config.color} />
                        </div>

                        {/* İçerik */}
                        <div className="flex-1 min-w-0" onClick={() => handleClick(n)}>
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!n.read ? 'font-extrabold text-slate-950' : 'font-bold text-slate-700'}`}>
                              {n.title}
                            </p>
                            <span className={`text-[11px] whitespace-nowrap font-bold shrink-0 ${!n.read ? 'text-primary-600' : 'text-slate-400'}`}>
                              {formatRelative(n.createdAt)}
                            </span>
                          </div>
                          {n.body && (
                            <p className={`text-[13px] mt-1 ${!n.read ? 'text-slate-700 font-medium' : 'text-slate-500'} line-clamp-2 leading-relaxed`}>
                              {n.body}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${config.bg} ${config.color}`}>
                              {CATEGORY_LABELS[getNotificationCategory(n.type)]}
                            </span>
                          </div>
                        </div>

                        {/* Aksiyon butonları */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1">
                          {!n.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                              className="p-2 rounded-xl hover:bg-primary-100 bg-white shadow-sm border border-slate-200 transition-all cursor-pointer text-primary-600"
                              title="Okundu olarak işaretle"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                            className="p-2 rounded-xl hover:bg-rose-100 bg-white shadow-sm border border-slate-200 transition-all cursor-pointer text-rose-600"
                            title="Bildirimi sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Daha Fazla Yükle */}
        {hasMore && !loading && filtered.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary-700 bg-primary-50/50 hover:bg-primary-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Daha fazla yükle
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bildirim Tercihleri Modalı */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Bildirim Tercihleri</h3>
                  <p className="text-xs font-medium text-slate-500">Ses ve kategori izinlerini yönetin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Ses efekti toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 size={18} className="text-primary-600" /> : <VolumeX size={18} className="text-slate-400" />}
                  <div>
                    <p className="text-xs font-bold text-slate-900">Sesli Uyarı Sesi</p>
                    <p className="text-[11px] font-medium text-slate-500">Yeni bildirim geldiğinde hafif ses çal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    soundEnabled ? 'bg-primary-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Kategori izinleri */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Kategori İzinleri</p>
                {NOTIFICATION_PREF_ITEMS.map(item => (
                  <div key={item.key} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.label}</p>
                      <p className="text-[11px] font-medium text-slate-500 leading-snug mt-0.5">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePref(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        prefs[item.key] ? 'bg-primary-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          prefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-primary-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-primary-700 transition-colors cursor-pointer"
              >
                Kaydet ve Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
