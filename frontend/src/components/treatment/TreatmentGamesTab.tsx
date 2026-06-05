import { CheckCircle2, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { getDateKey, getGameFeedbackMeta } from '@/features/treatment/treatmentPlan';
import type { FocusKey, GameReflection, GameSession, StoryCard, TherapyGame } from '@/features/treatment/types';

interface TreatmentGamesTabProps {
  activeGameFilter: 'all' | FocusKey;
  allGames: TherapyGame[];
  filteredGames: TherapyGame[];
  gameFeedback: Record<string, GameReflection>;
  gameSessions: GameSession[];
  recommendedGameCount: number;
  savingTreatment: boolean;
  showMilestoneBanner: boolean;
  socialStories: StoryCard[];
  todayCompletedGames: string[];
  onFilterChange: (value: 'all' | FocusKey) => void;
  onSaveGameFeedback: (gameId: string, status: GameReflection) => void;
  onToggleGameCompletion: (gameId: string) => void;
}

const gameFilterTabs = [
  ['all', 'Tümü'],
  ['communication', 'İletişim'],
  ['social', 'Sosyal'],
  ['sensory', 'Duyusal'],
] as const;

// Feedback button styles
const FEEDBACK_STYLES: Record<GameReflection, { idle: string; active: string; emoji: string }> = {
  easy:        { idle: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50', active: 'border-emerald-500 bg-emerald-500 text-white', emoji: '😊' },
  assisted:    { idle: 'border-sky-200    text-sky-700    hover:bg-sky-50',    active: 'border-sky-500    bg-sky-500    text-white', emoji: '🤝' },
  independent: { idle: 'border-violet-200 text-violet-700 hover:bg-violet-50', active: 'border-violet-500 bg-violet-500 text-white', emoji: '⭐' },
  challenging: { idle: 'border-amber-200  text-amber-700  hover:bg-amber-50',  active: 'border-amber-500  bg-amber-500  text-white', emoji: '💪' },
};

export function TreatmentGamesTab({
  activeGameFilter,
  allGames,
  filteredGames,
  gameFeedback,
  gameSessions,
  recommendedGameCount,
  savingTreatment,
  showMilestoneBanner,
  socialStories,
  todayCompletedGames,
  onFilterChange,
  onSaveGameFeedback,
  onToggleGameCompletion,
}: TreatmentGamesTabProps) {
  const recentSessions = [...gameSessions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
  const challengingCount = gameSessions.filter((session) => session.status === 'challenging').length;

  return (
    <div className="space-y-6">
      {/* Milestone banner */}
      {showMilestoneBanner && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">🎉 Bugünün tüm oyunları tamamlandı. Harika gidiyorsunuz!</p>
          <p className="mt-1 text-sm text-emerald-700">Bugünkü destek akışını tamamladınız; isterseniz notlar bölümüne kısa bir gözlem ekleyebilirsiniz.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Günlük Aktiviteler</h3>
          <p className="mt-1 text-sm text-slate-500">Çocuğunuzun terapi hedeflerine göre önerilen kısa etkinlikler. Oynadıktan sonra nasıl gittiğini seçin.</p>
        </div>
        <div className={cn(
          'rounded-full px-4 py-2 text-sm font-semibold',
          todayCompletedGames.length === recommendedGameCount && recommendedGameCount > 0
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-700'
        )}>
          {todayCompletedGames.length}/{recommendedGameCount} bugün tamamlandı
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Oyun filtreleri">
        {gameFilterTabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeGameFilter === value}
            onClick={() => onFilterChange(value)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              activeGameFilter === value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Game cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {filteredGames.map((game) => {
          const isDone = todayCompletedGames.includes(game.id);
          const feedbackMeta = getGameFeedbackMeta(gameFeedback[game.id]);

          return (
            <div
              key={game.id}
              className={cn(
                'rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
                game.tone === 'sky'    && 'border-sky-100',
                game.tone === 'emerald' && 'border-emerald-100',
                game.tone === 'amber'  && 'border-amber-100',
                isDone && 'ring-2 ring-emerald-200'
              )}
            >
              {/* Card top */}
              <div className="flex items-center justify-between gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-2xl ring-1',
                  game.tone === 'sky'    && 'bg-sky-50 text-sky-700 ring-sky-100',
                  game.tone === 'emerald' && 'bg-emerald-50 text-emerald-700 ring-emerald-100',
                  game.tone === 'amber'  && 'bg-amber-50 text-amber-700 ring-amber-100'
                )}>
                  {game.icon}
                </div>
                <Badge variant={isDone ? 'success' : 'info'}>
                  {isDone ? '✅ Yapıldı' : 'Hazır'}
                </Badge>
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{game.title}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">{game.skill}</p>
                </div>
                <div className="inline-flex shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {game.duration}
                </div>
              </div>

              <div className="mt-2 inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Yöntem: {game.approach}
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{game.instruction}</p>

              {/* Benefit */}
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Neden iyi gelir?</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{game.benefit}</p>
              </div>

              {/* Linked badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="default" className="px-3 py-1 text-[11px]">Hedef: {game.linkedGoal}</Badge>
                <Badge variant="default" className="px-3 py-1 text-[11px]">Araç: {game.linkedTool}</Badge>
              </div>

              {/* Expert tip — callout style */}
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <Lightbulb size={15} className="shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
                <p className="text-sm leading-6 text-amber-800">{game.tip}</p>
              </div>

              {/* Toggle button */}
              <button
                type="button"
                onClick={() => onToggleGameCompletion(game.id)}
                disabled={savingTreatment}
                className={cn(
                  'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  isDone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                {isDone ? 'Yapıldı olarak işaretli' : 'Bugün oynat'}
              </button>

              {/* Feedback */}
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Nasıl gitti? (isteğe bağlı)</p>
                <div className={cn('rounded-2xl border px-4 py-3 text-sm font-medium', feedbackMeta.className)}>
                  {feedbackMeta.label}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.entries(FEEDBACK_STYLES) as [GameReflection, typeof FEEDBACK_STYLES[GameReflection]][]).map(
                    ([value, style]) => {
                      const isSelected = gameFeedback[game.id] === value;
                      const labels: Record<GameReflection, { short: string; hint: string }> = {
                        easy:        { short: 'Çok kolay',  hint: 'Yardımsız, hızlı tamamladı' },
                        assisted:    { short: 'Yardımla',   hint: 'Yönlendirme veya gösterimle yaptı' },
                        independent: { short: 'Kendi başına', hint: 'Yardımsız, kendi başına başardı ⭐' },
                        challenging: { short: 'Zorlandı',   hint: 'Güçlük çekti, daha fazla destek gerekti' },
                      };
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => onSaveGameFeedback(game.id, value)}
                          disabled={savingTreatment}
                          aria-pressed={isSelected}
                          title={labels[value].hint}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            isSelected ? style.active : style.idle
                          )}
                        >
                          <span className="text-base">{style.emoji}</span>
                          <span>{labels[value].short}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          Bu alanda henüz etkinlik önerilmiyor. Çocuğunuzun profil sayfasına terapi bilgisi eklediğinizde etkinlikler burada görünür.
        </div>
      )}

      {/* Game history */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Oyun geçmişi</h3>
            <p className="mt-1 text-sm text-slate-500">Oynadığınız etkinliklerin geçmişi burada görünür.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {gameSessions.length} toplam kayıt
          </span>
        </div>

        {challengingCount > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            💪 {challengingCount} etkinlikte "Zorlandı" işaretlenmiş. Zorlanılan etkinlikleri tekrar denerken daha küçük adımlara bölmeyi ya da uzmanınıza bildirmeyi düşünebilirsiniz.
          </div>
        )}

        <div className="mt-5 space-y-3">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => {
              const game = allGames.find((item) => item.id === session.gameId);
              const feedback = getGameFeedbackMeta(session.status);
              return (
                <div key={`${session.gameId}-${session.completedAt}`} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{game?.title || session.linkedGoal}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{getDateKey(session.completedAt)}</p>
                    </div>
                    <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', feedback.className)}>
                      {feedback.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
              Henüz oyun kaydı yok. İlk kayıt oluşturulduğunda geçmiş burada görünür.
            </p>
          )}
        </div>
      </div>

      {/* Social stories */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Sosyal hikâyeler ve görsel akış</h3>
            <p className="mt-1 text-sm text-slate-500">Bir etkinliğe başlamadan önce çocuğunuza "Ne olacak?" sorusunu yanıtlayan kısa resimli hikayeler — geçişleri kolaylaştırır.</p>
          </div>
          <Link
            to="/sosyal-hikayeler"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Yeni hikâye
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {socialStories.map((story) => (
            <div key={story.title} className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{story.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{story.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{story.meta}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Bağlı hedef: {story.linkedGoal}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
