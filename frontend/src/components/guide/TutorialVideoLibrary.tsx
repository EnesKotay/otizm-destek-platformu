import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Play,
  PlayCircle,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { ROLE_LABELS, type UserRole } from '@/config/roleAccess';
import {
  TUTORIAL_LEARNING_PATHS,
  TUTORIAL_VIDEOS,
  type TutorialVideo,
  type TutorialVideoAudience,
} from '@/data/tutorialVideos';
import { cn } from '@/utils/cn';

const WATCHED_STORAGE_KEY_PREFIX = 'otizm-tutorial-videos-watched-v2';
const ALL_FILTER = 'ALL' as const;

type AudienceFilter = typeof ALL_FILTER | TutorialVideoAudience;
type CategoryFilter = typeof ALL_FILTER | string;

type TutorialVideoLibraryProps = {
  role: UserRole;
  userId?: string;
  initialVideoId?: string | null;
};

function readWatchedVideoIds(storageKey: string) {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeWatchedVideoIds(storageKey: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...ids]));
    window.dispatchEvent(new CustomEvent('tutorial-video-progress', { detail: { storageKey } }));
  } catch {
    // The gallery remains usable when storage is disabled by the browser.
  }
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ı', 'i');
}

function audienceLabel(audience: AudienceFilter, role: UserRole) {
  if (audience === ALL_FILTER) return 'Tümü';
  if (audience === 'GENERAL') return 'Genel';
  if (audience === role) return ROLE_LABELS[role];
  return ROLE_LABELS[audience];
}

export function TutorialVideoLibrary({ role, userId, initialVideoId }: TutorialVideoLibraryProps) {
  const watchedStorageKey = `${WATCHED_STORAGE_KEY_PREFIX}:${userId ?? 'guest'}:${role}`;
  const [query, setQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL_FILTER);
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(() => {
    if (!initialVideoId) return null;
    return TUTORIAL_VIDEOS.find((video) => (
      video.id === initialVideoId
      && (video.audience === 'GENERAL' || video.audience === role)
    )) ?? null;
  });
  const [watchedVideoIds, setWatchedVideoIds] = useState<Set<string>>(
    () => readWatchedVideoIds(watchedStorageKey),
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const isDialogOpen = selectedVideo !== null;
  const learningPath = TUTORIAL_LEARNING_PATHS[role];

  const roleVideos = useMemo(() => {
    const eligibleVideos = TUTORIAL_VIDEOS.filter(
      (video) => video.audience === 'GENERAL' || video.audience === role,
    );
    const eligibleById = new Map(eligibleVideos.map((video) => [video.id, video]));
    const orderedIds = learningPath.flatMap((stage) => stage.videoIds);
    const orderedIdSet = new Set(orderedIds);
    const orderedVideos = orderedIds.flatMap((id) => {
      const video = eligibleById.get(id);
      return video ? [video] : [];
    });

    // Keep newly added videos discoverable until their explicit path position is defined.
    return [...orderedVideos, ...eligibleVideos.filter((video) => !orderedIdSet.has(video.id))];
  }, [learningPath, role]);

  const roleVideoById = useMemo(
    () => new Map(roleVideos.map((video) => [video.id, video])),
    [roleVideos],
  );

  const coreVideos = useMemo(() => learningPath
    .filter((stage) => stage.kind === 'CORE')
    .flatMap((stage) => stage.videoIds)
    .flatMap((id) => {
      const video = roleVideoById.get(id);
      return video ? [video] : [];
    }), [learningPath, roleVideoById]);

  const videoStepById = useMemo(
    () => new Map(coreVideos.map((video, index) => [video.id, index + 1])),
    [coreVideos],
  );

  const categories = useMemo(
    () => [...new Set(roleVideos
      .filter((video) => audienceFilter === ALL_FILTER || video.audience === audienceFilter)
      .map((video) => video.category))],
    [audienceFilter, roleVideos],
  );

  const audienceOptions: AudienceFilter[] = [ALL_FILTER, 'GENERAL', role];
  const normalizedQuery = normalizeSearchText(query);

  const visibleVideos = useMemo(() => roleVideos.filter((video) => {
    const matchesAudience = audienceFilter === ALL_FILTER || video.audience === audienceFilter;
    const matchesCategory = categoryFilter === ALL_FILTER || video.category === categoryFilter;
    const searchableText = normalizeSearchText([
      video.title,
      video.description,
      video.category,
      ...video.keywords,
    ].join(' '));
    const searchableWords = searchableText.split(/[^a-z0-9]+/).filter(Boolean);
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
    const matchesQuery = queryWords.length === 0
      || queryWords.every((queryWord) => searchableWords.some((word) => word.startsWith(queryWord)));

    return matchesAudience && matchesCategory && matchesQuery;
  }), [audienceFilter, categoryFilter, normalizedQuery, roleVideos]);

  const visibleStages = useMemo(() => {
    const visibleIds = new Set(visibleVideos.map((video) => video.id));
    let coreStageNumber = 0;

    return learningPath.map((stage) => {
      const stageNumber = stage.kind === 'CORE' ? ++coreStageNumber : null;
      const videos = stage.videoIds.flatMap((id) => {
        const video = roleVideoById.get(id);
        return video && visibleIds.has(id) ? [video] : [];
      });

      return { ...stage, stageNumber, videos };
    }).filter((stage) => stage.videos.length > 0);
  }, [learningPath, roleVideoById, visibleVideos]);

  const watchedInRoleCount = coreVideos.filter((video) => watchedVideoIds.has(video.id)).length;
  const completedLearningPath = coreVideos.length > 0 && watchedInRoleCount === coreVideos.length;
  const nextRecommendedVideo = coreVideos.find((video) => !watchedVideoIds.has(video.id))
    ?? coreVideos[0]
    ?? null;
  const recommendationLabel = watchedInRoleCount === 0
    ? 'Buradan başla'
    : completedLearningPath
      ? 'Baştan izle'
      : 'Sıradaki video';
  const selectedVideoStep = selectedVideo ? videoStepById.get(selectedVideo.id) : undefined;
  const selectedCoreIndex = selectedVideo
    ? coreVideos.findIndex((video) => video.id === selectedVideo.id)
    : -1;
  const nextSelectedVideo = selectedCoreIndex >= 0 ? coreVideos[selectedCoreIndex + 1] : undefined;
  const hasActiveFilters = Boolean(normalizedQuery)
    || audienceFilter !== ALL_FILTER
    || categoryFilter !== ALL_FILTER;

  useEffect(() => {
    const reloadTimer = window.setTimeout(() => {
      setWatchedVideoIds(readWatchedVideoIds(watchedStorageKey));
    }, 0);

    return () => window.clearTimeout(reloadTimer);
  }, [watchedStorageKey]);

  useEffect(() => {
    if (!isDialogOpen) return;

    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedVideo(null);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [isDialogOpen]);

  const markVideoWatched = (videoId: string) => {
    setWatchedVideoIds((current) => {
      if (current.has(videoId)) return current;
      const next = new Set(current);
      next.add(videoId);
      writeWatchedVideoIds(watchedStorageKey, next);
      return next;
    });
  };

  const openVideo = (video: TutorialVideo, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setSelectedVideo(video);
  };

  const openNextVideo = (video: TutorialVideo) => {
    setSelectedVideo(video);
    window.requestAnimationFrame(() => dialogTitleRef.current?.focus());
  };

  const clearFilters = () => {
    setQuery('');
    setAudienceFilter(ALL_FILTER);
    setCategoryFilter(ALL_FILTER);
  };

  return (
    <section
      aria-labelledby="tutorial-video-library-title"
      className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-teal-50 shadow-sm"
    >
      <div className="border-b border-indigo-100/80 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white shadow-sm shadow-indigo-200">
              <PlayCircle size={14} aria-hidden="true" />
              Video kütüphanesi
            </span>
            <h2 id="tutorial-video-library-title" className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              Sırayla izleyin, adım adım öğrenin
            </h2>
            <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600">
              {ROLE_LABELS[role]} rolünüze göre hazırlanan öğrenme yolunu ilk adımdan başlayarak takip edin.
              İsteğe bağlı genel rehberler ana adımlarınızdan ayrı gösterilir.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-white bg-white/80 px-3 py-2 shadow-sm lg:self-auto">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xs font-black text-slate-800">{watchedInRoleCount} / {coreVideos.length} adım tamamlandı</span>
              <span className="block text-[10px] font-bold text-slate-500">Bu hesap için bu cihazda kaydedilir</span>
            </span>
          </div>
        </div>

        {nextRecommendedVideo && (
          <div className={cn(
            'mt-5 flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between',
            completedLearningPath
              ? 'border-emerald-200 bg-emerald-50/90'
              : 'border-indigo-200 bg-white/90',
          )}>
            <div className="min-w-0">
              <p className={cn(
                'text-[10px] font-black uppercase tracking-widest',
                completedLearningPath ? 'text-emerald-700' : 'text-indigo-600',
              )}>
                {completedLearningPath
                  ? 'Öğrenme yolunu tamamladınız'
                  : `${recommendationLabel} · Adım ${videoStepById.get(nextRecommendedVideo.id)} / ${coreVideos.length}`}
              </p>
              <p className="mt-1 text-sm font-black text-slate-950 sm:text-base">{nextRecommendedVideo.title}</p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                {nextRecommendedVideo.description}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => openVideo(nextRecommendedVideo, event.currentTarget)}
              aria-haspopup="dialog"
              className={cn(
                'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-4',
                completedLearningPath
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-200',
              )}
            >
              <Play size={15} fill="currentColor" aria-hidden="true" />
              {recommendationLabel}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Kullanım videolarında ara</span>
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Video, özellik veya işlem ara..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </label>

          <div role="group" aria-label="Video rolü" className="flex w-full gap-1 rounded-2xl bg-slate-100 p-1 lg:w-auto">
            {audienceOptions.map((audience) => {
              const selected = audienceFilter === audience;
              const count = audience === ALL_FILTER
                ? roleVideos.length
                : roleVideos.filter((video) => video.audience === audience).length;

              return (
                <button
                  key={audience}
                  type="button"
                  onClick={() => {
                    setAudienceFilter(audience);
                    setCategoryFilter(ALL_FILTER);
                  }}
                  aria-pressed={selected}
                  disabled={count === 0}
                  className={cn(
                    'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition lg:flex-none',
                    selected
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-800',
                    count === 0 && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <span className="truncate">{audienceLabel(audience, role)}</span>
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                    selected ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-600',
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Konuya göre filtrele</p>
            <p aria-live="polite" className="text-[10px] font-extrabold text-slate-400">
              {visibleVideos.length} video gösteriliyor
            </p>
          </div>
          <div role="group" aria-label="Video kategorisi" className="flex flex-wrap gap-2">
            {[ALL_FILTER, ...categories].map((category) => {
              const selected = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] font-extrabold ring-1 transition',
                    selected
                      ? 'bg-indigo-600 text-white ring-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 ring-slate-200 hover:text-indigo-700 hover:ring-indigo-200',
                  )}
                >
                  {category === ALL_FILTER ? 'Tüm konular' : category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {visibleVideos.length > 0 ? (
          <div className="space-y-9">
            {visibleStages.map((stage) => {
              const stageWatchedCount = stage.videoIds.filter((id) => watchedVideoIds.has(id)).length;

              return (
                <section key={stage.id} aria-labelledby={`tutorial-stage-${stage.id}`}>
                  <div className={cn(
                    'mb-4 flex flex-col gap-2 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between',
                    stage.kind === 'OPTIONAL'
                      ? 'border-slate-200 bg-slate-50/90'
                      : 'border-indigo-100 bg-indigo-50/75',
                  )}>
                    <div className="min-w-0">
                      <p className={cn(
                        'text-[10px] font-black uppercase tracking-widest',
                        stage.kind === 'OPTIONAL' ? 'text-slate-500' : 'text-indigo-600',
                      )}>
                        {stage.kind === 'OPTIONAL' ? 'Ek rehberler · İsteğe bağlı' : `Aşama ${stage.stageNumber}`}
                      </p>
                      <h3 id={`tutorial-stage-${stage.id}`} className="mt-1 text-base font-black text-slate-950">
                        {stage.title}
                      </h3>
                      <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">{stage.description}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 self-start rounded-full px-3 py-1.5 text-[10px] font-black sm:self-auto',
                      stageWatchedCount === stage.videoIds.length
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-200',
                    )}>
                      {stageWatchedCount} / {stage.videoIds.length} izlendi
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {stage.videos.map((video) => {
                      const isWatched = watchedVideoIds.has(video.id);
                      const step = videoStepById.get(video.id);
                      const isRecommended = !completedLearningPath && nextRecommendedVideo?.id === video.id;

                      return (
                        <article
                          key={video.id}
                          className={cn(
                            'group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5',
                            isRecommended
                              ? 'border-indigo-400 ring-4 ring-indigo-100'
                              : 'border-slate-200 hover:border-indigo-200',
                          )}
                        >
                          <button
                            type="button"
                            onClick={(event) => openVideo(video, event.currentTarget)}
                            aria-label={`${step ? `Adım ${step}: ` : ''}${video.title} videosunu aç`}
                            aria-haspopup="dialog"
                            className="flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-indigo-300"
                          >
                            <span className="relative block aspect-video overflow-hidden bg-slate-900">
                              <img
                                src={video.poster}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                              />
                              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                              <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">
                                {step ? `Adım ${step} / ${coreVideos.length}` : 'İsteğe bağlı'}
                              </span>
                              {isWatched && (
                                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                                  <CheckCircle2 size={12} aria-hidden="true" />
                                  İzlendi
                                </span>
                              )}
                              <span className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg transition group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                                <Play size={18} fill="currentColor" aria-hidden="true" />
                              </span>
                              {video.duration && (
                                <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">
                                  {video.duration}
                                </span>
                              )}
                            </span>

                            <span className="flex flex-1 flex-col p-4">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                                {isRecommended ? `${recommendationLabel} · ${video.category}` : video.category}
                              </span>
                              <span className="mt-1.5 text-sm font-black leading-5 text-slate-900 transition-colors group-hover:text-indigo-800">
                                {video.title}
                              </span>
                              <span className="mt-2 flex-1 text-xs font-semibold leading-5 text-slate-500">{video.description}</span>
                              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
                                {isRecommended ? recommendationLabel : 'Videoyu izle'}
                                <Play size={12} fill="currentColor" aria-hidden="true" />
                              </span>
                            </span>
                          </button>

                          <div className="border-t border-slate-100 px-4 py-3">
                            <a
                              href={video.src}
                              download
                              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 transition-colors hover:text-indigo-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                            >
                              <Download size={13} aria-hidden="true" />
                              Çevrimdışı izlemek için indir
                            </a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
            <Search size={28} aria-hidden="true" className="mx-auto text-slate-300" />
            <h3 className="mt-3 text-sm font-black text-slate-900">Bu filtrelerle video bulunamadı</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Arama kelimesini kısaltın veya filtreleri temizleyin.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Filtreleri temizle
              </button>
            )}
          </div>
        )}
      </div>

      {selectedVideo && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedVideo(null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-video-dialog-title"
            aria-describedby="tutorial-video-dialog-description"
            className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0" aria-live="polite" aria-atomic="true">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  {selectedVideoStep
                    ? `Adım ${selectedVideoStep} / ${coreVideos.length}`
                    : 'İsteğe bağlı video'} · {selectedVideo.category}
                </p>
                <h2
                  ref={dialogTitleRef}
                  id="tutorial-video-dialog-title"
                  tabIndex={-1}
                  className="mt-1 truncate text-base font-black text-slate-950 outline-none sm:text-lg"
                >
                  {selectedVideo.title}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                aria-label="Video penceresini kapat"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto">
              <div className="bg-slate-950">
                <video
                  key={selectedVideo.src}
                  controls
                  playsInline
                  preload="metadata"
                  poster={selectedVideo.poster}
                  onEnded={() => markVideoWatched(selectedVideo.id)}
                  onTimeUpdate={(event) => {
                    const player = event.currentTarget;
                    if (player.duration > 0 && player.currentTime / player.duration >= 0.9) {
                      markVideoWatched(selectedVideo.id);
                    }
                  }}
                  className="aspect-video max-h-[68vh] w-full bg-slate-950 object-contain"
                  aria-label={`${selectedVideo.title} kullanım videosu`}
                >
                  <source src={selectedVideo.src} type="video/webm" />
                  {selectedVideo.captions && (
                    <track
                      kind="captions"
                      src={selectedVideo.captions}
                      srcLang="tr"
                      label="Türkçe"
                      default
                    />
                  )}
                  Tarayıcınız video oynatmayı desteklemiyor.
                </video>
              </div>

              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <p id="tutorial-video-dialog-description" className="text-sm font-semibold leading-6 text-slate-600">
                    {selectedVideo.description}
                  </p>
                  {watchedVideoIds.has(selectedVideo.id) && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Bu videoyu izlediniz
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <a
                    href={selectedVideo.src}
                    download
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                  >
                    <Download size={16} aria-hidden="true" />
                    Videoyu indir
                  </a>
                  {nextSelectedVideo && (
                    <button
                      type="button"
                      onClick={() => openNextVideo(nextSelectedVideo)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                    >
                      Sonraki video
                      <ArrowRight size={16} aria-hidden="true" />
                      <span className="sr-only">: {nextSelectedVideo.title}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
