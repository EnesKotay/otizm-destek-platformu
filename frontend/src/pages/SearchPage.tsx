import { useEffect, useState } from 'react';
import { Search, BookOpen, FileText, Users, GraduationCap, Clock, SlidersHorizontal, X, ChevronDown, Tag, Baby, CalendarCheck, MessageCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { searchService } from '@/services/searchService';
import { tagService } from '@/services/tagService';
import type { SearchParams } from '@/services/searchService';
import { formatRelative } from '@/utils/date';
import { toast } from '@/store/toastStore';
import type { SearchResult, Tag as TagType } from '@/types';

type FilterType = '' | 'POST' | 'ARTICLE' | 'GROUP' | 'EXPERT';
type SortOption = 'relevance' | 'newest' | 'oldest';

const FILTERS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: '', label: 'Tümü', icon: <Search size={14} /> },
  { key: 'POST', label: 'Gönderi', icon: <BookOpen size={14} /> },
  { key: 'ARTICLE', label: 'Makale', icon: <FileText size={14} /> },
  { key: 'GROUP', label: 'Grup', icon: <Users size={14} /> },
  { key: 'EXPERT', label: 'Uzman', icon: <GraduationCap size={14} /> },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'relevance', label: 'Alakalılık' },
  { key: 'newest', label: 'En Yeni' },
  { key: 'oldest', label: 'En Eski' },
];

const TYPE_COLORS: Record<string, string> = {
  POST: 'bg-blue-100 text-blue-700',
  ARTICLE: 'bg-green-100 text-green-700',
  GROUP: 'bg-purple-100 text-purple-700',
  EXPERT: 'bg-indigo-100 text-indigo-700',
};

const TYPE_LABELS: Record<string, string> = {
  POST: 'Gönderi',
  ARTICLE: 'Makale',
  GROUP: 'Grup',
  EXPERT: 'Uzman',
};

const TYPE_ROUTES: Record<string, string> = {
  POST: '/forum',
  ARTICLE: '/bilgi-bankasi',
  GROUP: '/gruplar',
  EXPERT: '/uzmanlar',
};

function highlight(text: string, query: string): string {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">$1</mark>'
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState<FilterType>('' as FilterType);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [popularTags, setPopularTags] = useState<TagType[]>([]);
  const quickCommands = [
    { label: 'Çocuk profili ekle', detail: 'İlk kurulum', icon: Baby, to: '/cocuklarim' },
    { label: 'Bugünün kaydını gir', detail: 'Ruh hali, uyku, ilaç', icon: CalendarCheck, to: '/gunluk-takip' },
    { label: 'Uzman bul', detail: 'Randevu ve profil', icon: GraduationCap, to: '/uzmanlar' },
    { label: 'Mesajları aç', detail: 'Uzman ve aile yazışmaları', icon: MessageCircle, to: '/mesajlar' },
    { label: 'Zor an rehberi', detail: 'Sakinleşme adımları', icon: AlertTriangle, to: '/kriz-rehberi' },
  ];

  useEffect(() => {
    tagService.getAllTags().then(tags => {
      // Show first 20 tags across all categories as popular tags
      setPopularTags(tags.slice(0, 20));
    }).catch(() => {});
  }, []);

  const doSearch = async (params: SearchParams) => {
    if (params.q.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchService.search(params);
      setResults(data);
    } catch { toast.error('Arama sırasında bir hata oluştu.'); }
    setLoading(false);
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(q);
       
      doSearch({ q, type: activeFilter || undefined, sort: sortBy });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildParams = (overrides: Partial<SearchParams> = {}): SearchParams => ({
    q: query.trim(),
    type: activeFilter || undefined,
    sort: sortBy,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    ...overrides,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearchParams({ q: query.trim() });
    doSearch(buildParams());
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (query.trim().length >= 2) {
      doSearch(buildParams({ type: filter || undefined }));
    }
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    if (query.trim().length >= 2 && searched) {
      doSearch(buildParams({ sort }));
    }
  };

  const handleApplyAdvanced = () => {
    if (query.trim().length >= 2) doSearch(buildParams());
  };

  const handleClearAdvanced = () => {
    setDateFrom('');
    setDateTo('');
    setSortBy('relevance');
    if (query.trim().length >= 2 && searched) {
      doSearch(buildParams({ dateFrom: undefined, dateTo: undefined, sort: 'relevance' }));
    }
  };

  const hasActiveAdvancedFilters = dateFrom || dateTo || sortBy !== 'relevance';

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'POST':
        navigate('/forum', { state: { openPostId: result.id } });
        break;
      case 'ARTICLE':
        navigate('/bilgi-bankasi', { state: { openArticleId: result.id } });
        break;
      default:
        navigate(TYPE_ROUTES[result.type] || '/');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Arama</h1>
        <p className="text-gray-500 mt-1">Platform genelinde arama yapın</p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Arama yapın (min. 2 karakter)..."
          className="w-full pl-12 pr-36 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              showAdvanced || hasActiveAdvancedFilters
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Gelişmiş filtreler"
          >
            <SlidersHorizontal size={14} />
            {hasActiveAdvancedFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Ara
          </button>
        </div>
      </form>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-indigo-500" /> Gelişmiş Filtreler
            </h3>
            {hasActiveAdvancedFilters && (
              <button
                onClick={handleClearAdvanced}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X size={12} /> Temizle
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Sort */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Sıralama</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => handleSortChange(e.target.value as SortOption)}
                  className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer pr-8"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Başlangıç Tarihi</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Bitiş Tarihi</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <button
            onClick={handleApplyAdvanced}
            disabled={query.trim().length < 2}
            className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            Filtreleri Uygula
          </button>

          {/* Popular tag chips */}
          {popularTags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Tag size={12} /> Hızlı Konu Etiketleri
              </p>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const tagName = tag.name.toLowerCase();
                      const newQuery = query.trim()
                        ? query.includes(tagName) ? query : `${query} ${tagName}`
                        : tagName;
                      setQuery(newQuery);
                      setSearchParams({ q: newQuery });
                      doSearch({ ...buildParams(), q: newQuery });
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                      query.toLowerCase().includes(tag.name.toLowerCase())
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Type filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === f.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">Aranıyor...</div>
      ) : searched && results.length === 0 ? (
        <EmptyState
          icon={<Search size={32} />}
          title="Sonuç bulunamadı"
          description={`"${query}" için herhangi bir sonuç bulunamadı. Farklı bir arama terimi deneyin.`}
          steps={['Daha kısa bir kelime deneyin.', 'Sayfa adı yazabilirsiniz: randevu, not, uzman.', 'Hazır komutlardan doğrudan ilgili sayfaya geçin.']}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {quickCommands.slice(0, 3).map(({ label, to }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(to)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {results.length} sonuç
              {sortBy !== 'relevance' && ` · ${SORT_OPTIONS.find(s => s.key === sortBy)?.label} sırayla`}
            </p>
            {(dateFrom || dateTo) && (
              <p className="text-xs text-gray-400">
                {dateFrom && `${dateFrom} `}—{dateTo && ` ${dateTo}`} tarih aralığı
              </p>
            )}
          </div>
          {results.map(result => (
            <Card
              key={`${result.type}-${result.id}`}
              hover
              onClick={() => handleResultClick(result)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[result.type]}`}>
                  {result.type === 'POST' && <BookOpen size={16} />}
                  {result.type === 'ARTICLE' && <FileText size={16} />}
                  {result.type === 'GROUP' && <Users size={16} />}
                  {result.type === 'EXPERT' && <GraduationCap size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[result.type]}`}>
                      {TYPE_LABELS[result.type]}
                    </span>
                    {result.rank > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <span
                            className="h-full bg-indigo-400 rounded-full block"
                            style={{ width: `${Math.min(result.rank * 200, 100)}%` }}
                          />
                        </span>
                        Eşleşme
                      </span>
                    )}
                    {result.createdAt && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} /> {formatRelative(result.createdAt)}
                      </span>
                    )}
                  </div>
                  <h3
                    className="font-semibold text-gray-900 line-clamp-1"
                    dangerouslySetInnerHTML={{ __html: highlight(result.title, query) }}
                  />
                  {result.excerpt && (
                    <p
                      className="text-sm text-gray-600 mt-0.5 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: highlight(result.excerpt, query) }}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !searched ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Hızlı Komutlar</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Ne yapmak istiyorsunuz?</h2>
              <p className="mt-1 text-sm text-slate-500">Sayfa adı, konu veya doğrudan işlem yazabilirsiniz. Kısa yollarla da başlayabilirsiniz.</p>
            </div>
            <kbd className="hidden rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400 sm:block">⌘K</kbd>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickCommands.map(({ label, detail, icon: Icon, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(to)}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500">{detail}</span>
                </span>
                <ArrowRight size={14} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
