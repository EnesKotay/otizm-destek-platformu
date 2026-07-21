import { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronDown, HeartHandshake, LockKeyhole, LogOut, PlusCircle, Search, Settings, Sparkles } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { appointmentService } from '@/services/appointmentService';
import { childService } from '@/services/childService';
import { messagingService } from '@/services/messagingService';
import { searchService } from '@/services/searchService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { cn } from '@/utils/cn';
import { prefetchRoute } from '@/utils/routePrefetch';
import { getNavGroups, isNavItemActive, type NavGroupConfig, type NavItemConfig } from './navConfig';
import {
  filterCommandItems,
  flattenNavItems,
  getBadgeLabel,
  getDisabledReason,
  getGroupBadgeTotal,
  moveSelection,
  type BadgeMap,
} from './navUtils';
import type { SearchResult } from '@/types';

const MESSAGE_UNREAD_REFRESH_EVENT = 'message-unread-refresh';

function NavBadge({ value }: { value?: number | string }) {
  const label = getBadgeLabel(value);
  if (!label) return null;

  return (
    <span className="ml-auto min-w-[1.15rem] rounded-full bg-primary-600 px-1.5 py-0.5 text-center text-[9px] font-extrabold leading-4 text-white">
      {label}
    </span>
  );
}

function NavItem({
  badge,
  compact,
  disabledAction,
  disabledReason,
  item,
  showBadges,
  showDescriptions,
}: {
  badge?: number | string;
  compact: boolean;
  disabledAction?: { label: string; to: string };
  disabledReason?: string | null;
  item: NavItemConfig;
  showBadges: boolean;
  showDescriptions: boolean;
}) {
  const { to, icon: Icon, label, description } = item;
  const title = description ? `${label}: ${description}` : label;
  const navigate = useNavigate();
  const content = ({ isActive, reason }: { isActive: boolean; reason?: string | null }) => (
    <>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          isActive
            ? 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
            : 'bg-transparent text-slate-400 dark:text-slate-500 group-hover:bg-slate-100/60 dark:group-hover:bg-slate-800/60 group-hover:text-slate-600 dark:group-hover:text-slate-300'
        )}
      >
        <Icon size={18} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center">
            <span className={cn("block min-w-0 whitespace-normal break-words leading-snug [overflow-wrap:anywhere] transition-colors", isActive ? "font-bold text-primary-700 dark:text-primary-300" : "font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white")}>{label}</span>
          </span>
          {description && showDescriptions && !reason && (
            <span className={cn(
              "mt-1 block text-[11px] font-medium leading-4 transition-colors",
              "whitespace-normal break-words",
              isActive ? "text-primary-600/85 dark:text-primary-400/85" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-600"
            )}>
              {description}
            </span>
          )}
          {reason && (
            <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
              <LockKeyhole size={11} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 whitespace-normal break-words">{reason}</span>
            </span>
          )}
        </span>
      )}
      {!compact && showBadges && !reason && <NavBadge value={badge} />}
    </>
  );

  if (disabledReason) {
    return (
      <div
        title={compact ? `${title} (${disabledReason})` : undefined}
        aria-label={`${label} kapalı: ${disabledReason}`}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-2.5 text-left text-sm font-semibold text-slate-500 opacity-90 ring-1 ring-slate-100/70',
          compact && 'justify-center px-2',
          !compact && disabledAction && 'pr-2'
        )}
      >
        {content({ isActive: false, reason: disabledReason })}
        {!compact && disabledAction && (
          <button
            type="button"
            onClick={() => navigate(disabledAction.to)}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-2 py-1 text-[10px] font-extrabold text-primary-600 ring-1 ring-primary-100 transition-colors hover:bg-primary-50"
          >
            <PlusCircle size={11} aria-hidden="true" />
            {disabledAction.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={compact ? title : undefined}
      aria-label={title}
      onFocus={() => prefetchRoute(to)}
      onMouseEnter={() => prefetchRoute(to)}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
          compact && 'justify-center px-2',
          isActive
            ? 'bg-primary-50/60 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-100/50 dark:ring-primary-900/30'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-gray-800/40 hover:text-slate-900 dark:hover:text-slate-100'
        )
      }
    >
      {content}
    </NavLink>
  );
}

function buildInitialOpenState(groups: NavGroupConfig[]) {
  return Object.fromEntries(groups.map((group) => [group.label, group.defaultOpen !== false]));
}

function filterNavGroupsByChildState(groups: NavGroupConfig[], hasChild: boolean) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasChild || !item.requiresChild),
    }))
    .filter((group) => group.items.length > 0);
}

function getStoredOpenState(role: string, groups: NavGroupConfig[]) {
  try {
    const raw = localStorage.getItem(`sidebar-open-groups:${role}`);
    return raw ? { ...buildInitialOpenState(groups), ...JSON.parse(raw) } : buildInitialOpenState(groups);
  } catch {
    return buildInitialOpenState(groups);
  }
}

const ONBOARDING_HELP_COMMANDS = [
  {
    to: '/cocuklarim',
    label: 'Yeni Çocuk Profili Ekle',
    description: 'Çocuğunuzun yaş, gelişim ve tanı bilgilerini içeren yeni bir profil oluşturun.',
    group: 'Yardım & Başlangıç',
    kind: 'nav' as const,
    icon: Sparkles,
  },
  {
    to: '/gunluk-takip',
    label: 'Günlük Kayıt Nasıl Girilir?',
    description: 'Ruh hali, uyku kalitesi ve ilaç takibinizi 1 dakikada kaydedin.',
    group: 'Yardım & Başlangıç',
    kind: 'nav' as const,
    icon: Sparkles,
  },
  {
    to: '/kriz-rehberi',
    label: 'Zor An Rehberi / Kriz Müdahale',
    description: 'Kriz anlarında sakinleşmek ve doğru adımları atmak için kılavuz.',
    group: 'Yardım & Başlangıç',
    kind: 'nav' as const,
    icon: Sparkles,
  },
  {
    to: '/yardim',
    label: 'Yardım Merkezi',
    description: 'Platformdaki temel akışları ve destek seçeneklerini tek yerde görün.',
    group: 'Yardım & Başlangıç',
    kind: 'nav' as const,
    icon: Sparkles,
  }
];

const SEARCH_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'POST', label: 'Forum' },
  { value: 'ARTICLE', label: 'Makale' },
  { value: 'GROUP', label: 'Grup' },
  { value: 'EXPERT', label: 'Uzman' },
];

function CommandPalette({
  badges,
  context,
  groups,
  onClose,
}: {
  badges: BadgeMap;
  context: { hasChild: boolean; isExpertVerified: boolean };
  groups: NavGroupConfig[];
  onClose: () => void;
}) {
  type CommandItem =
    | (NavItemConfig & { group: string; kind: 'nav' })
    | (SearchResult & { group: string; icon?: never; kind: 'search'; to: string; label: string });
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const navigate = useNavigate();
  const navItems = useMemo(
    () => flattenNavItems(groups).map((item) => ({ ...item, kind: 'nav' as const })),
    [groups]
  );
  const remoteItems = remoteResults.map((result) => ({
    ...result,
    group: result.type,
    kind: 'search' as const,
    label: result.title,
    to: result.type === 'ARTICLE' ? '/bilgi-bankasi' : result.type === 'GROUP' ? '/gruplar' : result.type === 'EXPERT' ? '/uzmanlar' : '/forum',
  }));

  const matchedOnboarding = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ONBOARDING_HELP_COMMANDS;
    
    const triggers = ['nasıl', 'yardım', 'ekle', 'nerede', 'kayıt', 'kriz', 'rehber', 'profil', 'başlangıç', 'tanıtım', 'onboarding'];
    const isTriggerWord = triggers.some(t => q.includes(t));
    
    if (isTriggerWord) {
      return ONBOARDING_HELP_COMMANDS;
    }
    
    return ONBOARDING_HELP_COMMANDS.filter(item => 
      item.label.toLowerCase().includes(q) || 
      item.description.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredItems: CommandItem[] = [
    ...matchedOnboarding,
    ...filterCommandItems(navItems, query),
    ...remoteItems,
  ].slice(0, 12);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((index) => moveSelection(index, 1, filteredItems.length));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((index) => moveSelection(index, -1, filteredItems.length));
      }
      if (event.key === 'Enter' && filteredItems[selectedIndex]) {
        event.preventDefault();
        const item = filteredItems[selectedIndex];
        const disabledReason = item.kind === 'nav' ? getDisabledReason(item, context) : null;
        if (!disabledReason) {
          navigate(item.to);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [context, filteredItems, navigate, onClose, selectedIndex]);

  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(0));
    if (query.trim().length < 2) {
      queueMicrotask(() => setRemoteResults([]));
      return;
    }

    const timeout = window.setTimeout(() => {
      searchService.search({
        q: query,
        type: typeFilter || undefined,
        category: categoryFilter.trim() || undefined,
      }).then(setRemoteResults).catch(() => setRemoteResults([]));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query, typeFilter, categoryFilter]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 px-4 py-20 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Search size={20} className="text-slate-400" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Doktor, okul, kriz, ödev veya sayfa ara..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400">Esc</kbd>
        </div>
        {query.trim().length >= 2 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2.5">
            <div className="flex flex-wrap gap-1">
              {SEARCH_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(option.value)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    typeFilter === option.value ? 'bg-primary-50 text-primary-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              placeholder="Kategoriye göre daralt..."
              className="ml-auto min-w-0 max-w-[10rem] rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 outline-none placeholder:text-slate-400"
            />
          </div>
        )}
        <div className="max-h-[26rem] overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const Icon = item.kind === 'nav' ? item.icon : Search;
              const disabledReason = item.kind === 'nav' ? getDisabledReason(item, context) : null;
              const isSelected = selectedIndex === filteredItems.indexOf(item);
              return (
                <button
                  key={`${item.kind}-${item.group}-${item.to}-${item.label}`}
                  type="button"
                  disabled={Boolean(disabledReason)}
                  onClick={() => {
                    if (disabledReason) return;
                    navigate(item.to);
                    onClose();
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    isSelected ? 'bg-primary-50' : 'hover:bg-slate-50'
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {disabledReason || (item.kind === 'nav' ? item.description : item.excerpt) || item.group}
                    </span>
                  </span>
                  {item.kind === 'nav' && <NavBadge value={item.badgeKey ? badges[item.badgeKey] : undefined} />}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Sonuç bulunamadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const { user, logout, accessToken } = useAuthStore();
  const storedChildCount = useChildStore((state) => state.children.length);
  const setChildren = useChildStore((state) => state.setChildren);
  const { subscribe, unsubscribe } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'PARENT';
  const navGroups = useMemo(() => getNavGroups(user?.role), [user?.role]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [badges, setBadges] = useState<BadgeMap>({});
  const [hasChild, setHasChild] = useState(true);
  const [childrenLoaded, setChildrenLoaded] = useState(user?.role !== 'PARENT');
  const [isSimpleMode, setIsSimpleMode] = useState(() => localStorage.getItem('access-simple-mode') === 'true');

  useEffect(() => {
    const handleSimpleModeChange = (e: Event) => {
      setIsSimpleMode(Boolean((e as CustomEvent<boolean>).detail));
    };
    window.addEventListener('a11y-simple-mode-change', handleSimpleModeChange);
    return () => window.removeEventListener('a11y-simple-mode-change', handleSimpleModeChange);
  }, []);

  const [compact, setCompact] = useState(() => localStorage.getItem('sidebar-compact') === 'true');
  const [showBadges, setShowBadges] = useState(() => localStorage.getItem('sidebar-show-badges') !== 'false');
  const [showDescriptions, setShowDescriptions] = useState(() => localStorage.getItem('sidebar-show-descriptions') === 'true');
  const [rememberGroups, setRememberGroups] = useState(() => localStorage.getItem('sidebar-remember-groups') !== 'false');
  const context = { hasChild: user?.role !== 'PARENT' || !childrenLoaded || hasChild, isExpertVerified: Boolean(user?.verified) };
  const baseDisplayNavGroups = useMemo(
    () => navGroups,
    [navGroups]
  );
  const rawNavGroups = useMemo(
    () => filterNavGroupsByChildState(baseDisplayNavGroups, context.hasChild),
    [baseDisplayNavGroups, context.hasChild]
  );

  const displayNavGroups = useMemo(() => {
    if (!isSimpleMode || role !== 'PARENT') return rawNavGroups;

    const primaryPaths = new Set(['/anasayfa', '/gunluk-takip', '/kriz-rehberi', '/uzmanlar', '/randevular', '/mesajlar', '/bilgi-bankasi']);
    const primaryItems: NavItemConfig[] = [];
    const secondaryItems: NavItemConfig[] = [];

    rawNavGroups.forEach((g) => {
      g.items.forEach((item) => {
        if (primaryPaths.has(item.to)) {
          if (!primaryItems.some((p) => p.to === item.to)) {
            primaryItems.push(item);
          }
        } else {
          secondaryItems.push(item);
        }
      });
    });

    return [
      {
        label: 'Öncelikli Eylemler (Basit Mod)',
        items: primaryItems,
        defaultOpen: true,
      },
      {
        label: 'Diğer Tüm Araçlar',
        items: secondaryItems,
        defaultOpen: false,
      },
    ];
  }, [isSimpleMode, rawNavGroups, role]);

  const commandNavGroups = useMemo(
    () => filterNavGroupsByChildState(navGroups, context.hasChild),
    [navGroups, context.hasChild]
  );
  const storageRole = `${role}:full:${context.hasChild ? 'child' : 'no-child'}`;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => getStoredOpenState(storageRole, displayNavGroups));
  const effectiveShowDescriptions = showDescriptions;

  const isCompact = compact && !onClose;
  const currentPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== currentPath.current) {
      currentPath.current = location.pathname;
      if (onClose) onClose();
    }
  }, [location.pathname, onClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroups(getStoredOpenState(storageRole, displayNavGroups));
  }, [displayNavGroups, storageRole]);

  useEffect(() => {
    if (rememberGroups) localStorage.setItem(`sidebar-open-groups:${storageRole}`, JSON.stringify(openGroups));
  }, [openGroups, rememberGroups, storageRole]);

  useEffect(() => {
    if (onClose) return; // Mobil drawer modunda compact event dispatch etme
    localStorage.setItem('sidebar-compact', String(compact));
    window.dispatchEvent(new CustomEvent('sidebar-compact-change', { detail: compact }));
  }, [compact, onClose]);

  useEffect(() => {
    const handleCompactChange = (event: Event) => {
      setCompact(Boolean((event as CustomEvent<boolean>).detail));
    };
    const handlePreferenceChange = (event: Event) => {
      const { key, value } = (event as CustomEvent<{ key: string; value: boolean }>).detail || {};
      if (key === 'sidebar-show-badges') setShowBadges(value);
      if (key === 'sidebar-show-descriptions') setShowDescriptions(value);
      if (key === 'sidebar-remember-groups') setRememberGroups(value);
    };

    window.addEventListener('sidebar-compact-change', handleCompactChange);
    window.addEventListener('sidebar-preference-change', handlePreferenceChange);
    return () => {
      window.removeEventListener('sidebar-compact-change', handleCompactChange);
      window.removeEventListener('sidebar-preference-change', handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-show-badges', String(showBadges));
  }, [showBadges]);

  useEffect(() => {
    localStorage.setItem('sidebar-show-descriptions', String(showDescriptions));
  }, [showDescriptions]);

  useEffect(() => {
    localStorage.setItem('sidebar-remember-groups', String(rememberGroups));
    if (!rememberGroups) {
      queueMicrotask(() => setOpenGroups(buildInitialOpenState(displayNavGroups)));
    }
  }, [displayNavGroups, rememberGroups]);

  useEffect(() => {
    if (user?.role !== 'PARENT') {
      queueMicrotask(() => {
        setChildrenLoaded(true);
        setHasChild(true);
      });
      return;
    }

    if (storedChildCount > 0) {
      queueMicrotask(() => {
        setChildrenLoaded(true);
        setHasChild(true);
      });
      return;
    }

    if (childrenLoaded) {
      queueMicrotask(() => setHasChild(false));
    }
  }, [childrenLoaded, storedChildCount, user?.role]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    const handleOpenCommandPalette = () => setPaletteOpen(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenCommandPalette);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenCommandPalette);
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBadges({});
      return;
    }

    let cancelled = false;

    const loadBadges = async () => {
      try {
        const [messageCount, appointments] = await Promise.all([
          messagingService.getUnreadCount().catch(() => 0),
          appointmentService.getAll().catch(() => []),
        ]);
        const children = user?.role === 'PARENT' ? await childService.getAll().catch(() => null) : null;
        if (cancelled) return;
        // Uzman: sadece onay bekleyen (aksiyon gerektiren) randevular
        // Ebeveyn: bekleyen + onaylanan aktif randevular
        const activeAppointmentCount = user?.role === 'EXPERT'
          ? appointments.filter((item) => item.status === 'PENDING').length
          : appointments.filter((item) => item.status === 'PENDING' || item.status === 'CONFIRMED').length;
        setBadges({
          messages: messageCount || undefined,
          appointments: activeAppointmentCount || undefined,
        });
        if (user?.role === 'PARENT' && children) {
          setChildren(children);
          setChildrenLoaded(true);
          setHasChild(children.length > 0);
        }
      } catch {
        if (!cancelled) setBadges({ crisis: '!' });
      }
    };

    loadBadges();
    const interval = window.setInterval(loadBadges, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [accessToken, setChildren, user?.role]);

  useEffect(() => {
    if (!accessToken) return;
    const notificationTopic = `/user/queue/notifications`;
    const conversationTopic = `/user/queue/conversation-update`;
    const refreshMessageBadge = () => {
      messagingService.getUnreadCount()
        .then(count => setBadges(prev => ({ ...prev, messages: count || undefined })))
        .catch(() => {});
    };

    window.addEventListener(MESSAGE_UNREAD_REFRESH_EVENT, refreshMessageBadge);
    subscribe(notificationTopic, refreshMessageBadge);
    subscribe(conversationTopic, refreshMessageBadge);
    return () => {
      window.removeEventListener(MESSAGE_UNREAD_REFRESH_EVENT, refreshMessageBadge);
      unsubscribe(notificationTopic);
      unsubscribe(conversationTopic);
    };
  }, [accessToken, subscribe, unsubscribe]);

  const handleLogout = async () => {
    await logout();
    navigate('/giris');
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const recommendedItems = useMemo(() => {

    const allItems = navGroups.flatMap((group) => group.items);
    // Zaten açık grupta görünen path'ler — bunları duplike etme (badge olmadıkça)
    const openGroupPaths = new Set(
      displayNavGroups.filter((g) => g.defaultOpen !== false).flatMap((g) => g.items.map((i) => i.to))
    );
    const badgePaths = new Set<string>();
    if (badges.appointments) badgePaths.add('/randevular');
    if (badges.messages) badgePaths.add('/mesajlar');

    const paths: string[] = [];
    if (user?.role === 'PARENT') {
      if (childrenLoaded && !hasChild) paths.push('/cocuklarim');
      if (badges.appointments) paths.push('/randevular');
      if (badges.messages) paths.push('/mesajlar');
      paths.push(hasChild ? '/uzmanlar' : '/anasayfa', '/bilgi-bankasi', '/cocuklarim');
    } else if (user?.role === 'EXPERT') {
      if (badges.appointments) paths.push('/randevular');
      if (badges.messages) paths.push('/mesajlar');
      paths.push('/danisanlarim', '/randevular', '/bilgi-bankasi');
    } else {
      paths.push('/admin/experts', '/admin/analytics', '/admin/reports');
    }

    return [...new Set(paths)]
      // Açık grupta zaten görünüyorsa ve badge yoksa dahil etme
      .filter((path) => badgePaths.has(path) || !openGroupPaths.has(path))
      .map((path) => allItems.find((item) => item.to === path))
      .filter(Boolean)
      .slice(0, 3) as NavItemConfig[];
  }, [badges.appointments, badges.messages, childrenLoaded, displayNavGroups, hasChild, navGroups, user?.role]);

  const childRequiredAction = { label: 'Çocuk ekle', to: '/cocuklarim' };
  const showRecommendedItems = user?.role !== 'PARENT' && recommendedItems.length > 0;

  return (
    <aside className={cn(
      onClose ? 'relative h-full' : 'fixed left-0 top-0 z-40 h-full',
      'flex flex-col border-r border-slate-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 transition-[width]',
      isCompact ? 'w-20' : 'w-80',
      className
    )}>
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 shadow-sm">
              <HeartHandshake size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          {!isCompact && <div className="min-w-0">
            <h1 className="text-[15px] font-bold leading-tight tracking-tight text-slate-900">Otizm Destek</h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-500">Aile Platformu</p>
          </div>}
        </div>
      </div>

      <div className="px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-100/70 hover:text-slate-700"
        >
          <Search size={18} aria-hidden="true" className="transition-transform group-hover:scale-105" />
          {!isCompact && <span className="min-w-0 flex-1 truncate text-left font-medium">Sayfa veya konu arayın...</span>}
        </button>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {showRecommendedItems && (
          <div>
            <div className={cn(
              'mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary-600',
              isCompact && 'justify-center px-1'
            )}>
              <Sparkles size={13} aria-hidden="true" />
              {!isCompact && <span>Önerilen</span>}
            </div>
            <div className="space-y-1">
              {recommendedItems.map((item) => (
                <NavItem
                  key={`recommended-${item.to}`}
                  item={item}
                  compact={isCompact}
                  showBadges={showBadges}
                  showDescriptions={effectiveShowDescriptions}
                  disabledReason={getDisabledReason(item, context)}
                  disabledAction={item.requiresChild && !context.hasChild ? childRequiredAction : undefined}
                  badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {displayNavGroups.map((group) => {
          const isGroupActive = group.items.some((item) => isNavItemActive(location.pathname, item.to));
          const isOpen = openGroups[group.label] ?? (isGroupActive || group.defaultOpen !== false);
          const groupBadgeTotal = showBadges ? getGroupBadgeTotal(group, badges) : 0;

          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={isOpen}
                className={cn(
                  'mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors',
                  'focus:outline-none focus-visible:bg-slate-50/50',
                  isCompact && 'justify-center px-1',
                  isGroupActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                )}
              >
                {!isCompact && <span>{group.label}</span>}
                {!isCompact && groupBadgeTotal > 0 && <NavBadge value={groupBadgeTotal} />}
                {!isCompact && (
                  <ChevronDown
                    size={13}
                    className={cn('transition-transform duration-200 text-slate-400', isOpen ? 'rotate-0' : '-rotate-90')}
                    aria-hidden="true"
                  />
                )}
              </button>
              {isOpen && (
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.to}
                      item={item}
                      compact={isCompact}
                      showBadges={showBadges}
                      showDescriptions={effectiveShowDescriptions}
                      disabledReason={getDisabledReason(item, context)}
                      disabledAction={item.requiresChild && !context.hasChild ? childRequiredAction : undefined}
                      badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-100 px-4 py-4">
        {user?.role !== 'ADMIN' && (
          <NavItem item={{ to: '/ayarlar', icon: Settings, label: 'Ayarlar', description: 'Profil ve görünüm tercihleri' }} compact={isCompact} showBadges={showBadges} showDescriptions={effectiveShowDescriptions} />
        )}

        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-100/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-primary-500 to-indigo-600 ring-2 ring-primary-100/50 dark:ring-primary-950/50">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profil" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white uppercase">
                {user?.fullName?.charAt(0) || 'K'}
              </span>
            )}
          </div>
          {!isCompact && <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight leading-tight">{user?.fullName}</p>
            <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{user?.email}</p>
          </div>}
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-all duration-150"
            title="Çıkış Yap"
            aria-label="Çıkış Yap"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {paletteOpen && <CommandPalette badges={badges} context={context} groups={commandNavGroups} onClose={() => setPaletteOpen(false)} />}
    </aside>
  );
}
