import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellRing, Check, CheckCheck, Trash2, Filter, ChevronDown, Loader2,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import {
  getNotificationIconConfig,
  getNotificationCategory,
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const categories: NotificationCategory[] = ['all', 'appointments', 'messages', 'forum', 'tasks', 'social', 'system'];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Bell size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okunmuş'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              {selectedIds.size} seçili sil
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
            >
              <CheckCheck size={14} />
              Tümünü oku
            </button>
          )}
        </div>
      </div>

      {/* Kategori Sekmeleri */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => {
          const count = cat === 'all'
            ? notifications.length
            : notifications.filter(n => getNotificationCategory(n.type) === cat).length;
          if (cat !== 'all' && count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {CATEGORY_LABELS[cat]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-all cursor-pointer ${
              showUnreadOnly
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <Filter size={14} />
            Okunmamış
          </button>
        </div>
      </div>

      {/* Bildirim Listesi */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-10 h-10 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500 font-medium">Bildirimler yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <BellRing size={36} className="text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {showUnreadOnly ? 'Okunmamış bildirim yok' : 'Bildirim bulunamadı'}
            </p>
            <p className="text-sm text-gray-500 mt-1.5">
              {showUnreadOnly
                ? 'Tüm bildirimleriniz okunmuş durumda.'
                : activeCategory !== 'all'
                  ? 'Bu kategoride henüz bildirim yok.'
                  : 'Yeni bir gelişme olduğunda size haber vereceğiz.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(n => {
              const config = getNotificationIconConfig(n.type);
              const Icon = config.icon;
              const isSelected = selectedIds.has(n.id);

              return (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-4 p-4 sm:p-5 transition-all duration-200 ${
                    n.link ? 'cursor-pointer hover:bg-slate-50/80' : ''
                  } ${!n.read ? 'bg-indigo-50/20' : ''} ${isSelected ? 'bg-indigo-50/40 ring-1 ring-indigo-200' : ''}`}
                >
                  {!n.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                  )}

                  {/* Checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(n.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* İkon */}
                  <div
                    onClick={() => handleClick(n)}
                    className={`mt-0.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${config.bg} ${config.border}`}
                  >
                    <Icon size={20} className={config.color} />
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0" onClick={() => handleClick(n)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      <span className={`text-[11px] whitespace-nowrap font-medium shrink-0 ${!n.read ? 'text-indigo-500' : 'text-gray-400'}`}>
                        {formatRelative(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className={`text-[13px] mt-1 ${!n.read ? 'text-gray-600' : 'text-gray-500'} line-clamp-2 leading-relaxed`}>
                        {n.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
                        {CATEGORY_LABELS[getNotificationCategory(n.type)]}
                      </span>
                    </div>
                  </div>

                  {/* Aksiyon butonları */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1">
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        className="p-2 rounded-full hover:bg-indigo-100 bg-white shadow-sm border border-gray-100 transition-all cursor-pointer text-indigo-600"
                        title="Okundu olarak işaretle"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="p-2 rounded-full hover:bg-red-100 bg-white shadow-sm border border-gray-100 transition-all cursor-pointer text-red-500"
                      title="Bildirimi sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Daha Fazla Yükle */}
        {hasMore && !loading && filtered.length > 0 && (
          <div className="p-4 border-t border-gray-50">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
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
    </div>
  );
}
