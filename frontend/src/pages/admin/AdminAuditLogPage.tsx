import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ListChecks, Search, ChevronLeft, ChevronRight, X,
  Download, RefreshCw, ChevronDown, ChevronUp, Filter,
  User, Calendar,
} from 'lucide-react';
import { adminService, type AuditLogEntry, type AuditLogFilters } from '@/services/adminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

// İşlem türüne göre renk + Türkçe etiket + ikon
const ACTION_META: Record<string, { color: string; dot: string; label: string; icon: string }> = {
  LOGIN:                 { color: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500',    label: 'Giriş Yapıldı',          icon: '🔑' },
  LOGOUT:                { color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400',   label: 'Çıkış Yapıldı',          icon: '🚪' },
  REGISTER:              { color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500',  label: 'Kayıt Olundu',           icon: '✍️' },
  APPOINTMENT_CREATED:   { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Randevu Oluşturuldu',  icon: '📅' },
  APPOINTMENT_CONFIRMED: { color: 'bg-teal-50 text-teal-700 border-teal-200',       dot: 'bg-teal-500',    label: 'Randevu Onaylandı',      icon: '✅' },
  APPOINTMENT_CANCELLED: { color: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500',     label: 'Randevu İptal Edildi',   icon: '❌' },
  APPOINTMENT_COMPLETED: { color: 'bg-sky-50 text-sky-700 border-sky-200',          dot: 'bg-sky-500',     label: 'Randevu Tamamlandı',     icon: '🏁' },
  TASK_ASSIGNED:         { color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-500',   label: 'Görev Atandı',           icon: '📋' },
  TASK_COMPLETED:        { color: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500',   label: 'Görev Tamamlandı',       icon: '🎯' },
  EXPERT_APPROVED:       { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500',  label: 'Uzman Onaylandı',        icon: '🎓' },
  EXPERT_REJECTED:       { color: 'bg-rose-50 text-rose-700 border-rose-200',       dot: 'bg-rose-500',    label: 'Uzman Reddedildi',       icon: '🚫' },
  USER_DEACTIVATED:      { color: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500',     label: 'Kullanıcı Askıya Alındı',icon: '🔒' },
  USER_ACTIVATED:        { color: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500',   label: 'Kullanıcı Aktif Edildi', icon: '🔓' },
  AVAILABILITY_UPDATED:  { color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       dot: 'bg-cyan-500',    label: 'Uygunluk Güncellendi',   icon: '🕐' },
  BACKUP_TRIGGERED:      { color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500',  label: 'Yedekleme Alındı',       icon: '💾' },
  SETTINGS_UPDATED:      { color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500',  label: 'Ayarlar Güncellendi',    icon: '⚙️' },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? {
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    icon: '📌',
  };
}

// Hedef tür Türkçe etiket + ikon
const RESOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  APPOINTMENT: { label: 'Randevu',       icon: '📅', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  USER:        { label: 'Kullanıcı',     icon: '👤', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  TASK:        { label: 'Görev',         icon: '📋', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  CHILD:       { label: 'Çocuk Profili', icon: '🧒', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  NOTE:        { label: 'Not',           icon: '📝', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  REPORT:      { label: 'Rapor',         icon: '📊', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  SYSTEM:      { label: 'Sistem',        icon: '⚙️', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  FORUM_POST:  { label: 'Forum Gönderisi', icon: '💬', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  GROUP:       { label: 'Grup',          icon: '👥', color: 'text-green-700 bg-green-50 border-green-200' },
};

function getResourceMeta(type?: string) {
  if (!type) return null;
  return RESOURCE_META[type.toUpperCase()] ?? { label: type, icon: '🔗', color: 'text-slate-600 bg-slate-100 border-slate-200' };
}

// Hızlı filtre presetleri
const QUICK_FILTERS = [
  { label: 'Giriş', value: 'LOGIN' },
  { label: 'Randevu', value: 'APPOINTMENT' },
  { label: 'Görev', value: 'TASK' },
  { label: 'Uzman', value: 'EXPERT' },
  { label: 'Yedek', value: 'BACKUP' },
];

function exportCsv(logs: AuditLogEntry[]) {
  if (!logs.length) return;
  const header = 'Tarih,Saat,Kullanıcı,E-posta,İşlem,Hedef Tür,Hedef ID,IP';
  const rows = logs.map(l => {
    const { date, time } = formatDateTime(l.createdAt);
    return [
      date, time,
      l.userFullName ?? '',
      l.userEmail ?? '',
      l.action,
      l.resourceType ?? '',
      l.resourceId ?? '',
      l.ipAddress ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZES = [25, 50, 100] as const;

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<typeof PAGE_SIZES[number]>(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [actionSearch, setActionSearch] = useState('');
  const [debouncedAction, setDebouncedAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFilters = actionSearch || fromDate || toDate;

  const handleActionChange = (value: string) => {
    setActionSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedAction(value); setPage(0); }, 300);
  };

  const clearFilters = () => {
    setActionSearch('');
    setDebouncedAction('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  const loadLogs = useCallback(() => {
    const filters: AuditLogFilters = {};
    if (debouncedAction) filters.action = debouncedAction.toUpperCase();
    if (fromDate) filters.from = fromDate;
    if (toDate) filters.to = toDate;

    setLoading(true);
    adminService.getAuditLogs(page, pageSize, filters)
      .then(res => {
        setLogs(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, pageSize, debouncedAction, fromDate, toDate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <ListChecks className="text-slate-600" size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Aktivite Kaydı</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Yükleniyor...' : `${totalElements.toLocaleString('tr-TR')} kayıt`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>
            <button
              onClick={() => exportCsv(logs)}
              disabled={!logs.length}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 font-medium px-3 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-40"
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>

        {/* Filtreler */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {/* İşlem arama */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="İşlem türü (LOGIN, TASK…)"
              value={actionSearch}
              onChange={e => handleActionChange(e.target.value)}
              className="h-9 w-52 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Tarih aralığı */}
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(0); }}
              title="Başlangıç tarihi"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
            <span className="text-slate-400 text-xs">—</span>
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(0); }}
              title="Bitiş tarihi"
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Temizle */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2.5 py-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
            >
              <X size={12} /> Temizle
            </button>
          )}

          {/* Sayfa boyutu */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Göster:</span>
            {PAGE_SIZES.map(s => (
              <button
                key={s}
                onClick={() => { setPageSize(s); setPage(0); }}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${pageSize === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Hızlı filtre pill'leri */}
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <Filter size={10} /> Hızlı:
          </span>
          {QUICK_FILTERS.map(f => {
            const isActive = actionSearch.toUpperCase().includes(f.value);
            return (
              <button
                key={f.value}
                onClick={() => handleActionChange(isActive ? '' : f.value)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-6 py-4 animate-pulse">
              <div className="w-28 h-4 bg-slate-100 rounded" />
              <div className="w-32 h-4 bg-slate-100 rounded" />
              <div className="w-40 h-5 bg-slate-100 rounded-full" />
              <div className="w-36 h-4 bg-slate-100 rounded" />
              <div className="w-24 h-4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <ListChecks size={44} className="mx-auto mb-4 opacity-20" />
          <p className="text-base font-semibold text-slate-600">Kayıt bulunamadı</p>
          <p className="text-sm mt-1">
            {hasFilters ? 'Farklı filtreler deneyin.' : 'Henüz sistem aktivitesi yok.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-3 text-xs text-indigo-500 hover:underline cursor-pointer">
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tarih / Saat</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kullanıcı</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">İşlem</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Hedef</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">IP Adresi</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(log => {
                const { date, time } = formatDateTime(log.createdAt);
                const meta = getActionMeta(log.action);
                const isExpanded = expandedId === log.id;
                const hasDetails = log.details && Object.keys(log.details).length > 0;
                return (
                  <>
                    <tr
                      key={log.id}
                      className={`transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      {/* Tarih */}
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold text-slate-800">{date}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{time}</p>
                      </td>

                      {/* Kullanıcı */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <User size={13} className="text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                              {log.userFullName || log.userEmail || 'Sistem'}
                            </p>
                            {log.userFullName && log.userEmail && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{log.userEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* İşlem */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.color}`}>
                            <span>{meta.icon}</span>
                            {meta.label}
                          </span>
                          {/* Ham değer küçük gri alt etiket */}
                          <p className="text-[9px] text-slate-400 font-mono pl-0.5">{log.action}</p>
                        </div>
                      </td>

                      {/* Hedef */}
                      <td className="px-5 py-3.5">
                        {(() => {
                          const resMeta = getResourceMeta(log.resourceType);
                          if (!resMeta) return <span className="text-slate-300">—</span>;
                          return (
                            <div className="space-y-0.5">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${resMeta.color}`}>
                                <span>{resMeta.icon}</span>
                                {resMeta.label}
                              </span>
                              {log.resourceId && (
                                <p className="text-[9px] text-slate-400 font-mono pl-0.5">
                                  {log.resourceId.slice(0, 8)}…
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* IP */}
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                        {log.ipAddress || '—'}
                      </td>

                      {/* Expand */}
                      <td className="px-5 py-3.5 text-slate-300">
                        {hasDetails
                          ? isExpanded
                            ? <ChevronUp size={14} className="text-indigo-400" />
                            : <ChevronDown size={14} />
                          : null}
                      </td>
                    </tr>

                    {/* Genişletilmiş detaylar */}
                    {isExpanded && hasDetails && (
                      <tr key={`${log.id}-detail`} className="bg-indigo-50/30">
                        <td colSpan={6} className="px-5 py-3 pb-4">
                          <div className="ml-9">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detaylar</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(log.details!).map(([k, v]) => (
                                <div key={k} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                                  <span className="text-slate-400 font-semibold">{k}: </span>
                                  <span className="text-slate-700 font-mono">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
          <span className="text-xs text-slate-500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} / {totalElements.toLocaleString('tr-TR')} kayıt
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Sayfa numaraları */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i;
                } else if (page <= 2) {
                  p = i;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 5 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${p === page ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {p + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
