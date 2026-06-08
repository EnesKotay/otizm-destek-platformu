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
      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100/60 p-1.5 backdrop-blur-md" role="tablist" aria-label="Oyun filtreleri">
        {gameFilterTabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeGameFilter === value}
            onClick={() => onFilterChange(value)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition-all duration-300',
              activeGameFilter === value
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
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
                'group/game rounded-[2rem] border bg-white/70 p-6 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.03)] transition-all duration-500 hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] hover:-translate-y-1 relative overflow-hidden',
                game.tone === 'sky'    && 'border-sky-100/60 hover:border-sky-200',
                game.tone === 'emerald' && 'border-emerald-100/60 hover:border-emerald-200',
                game.tone === 'amber'  && 'border-amber-100/60 hover:border-amber-200',
                isDone && 'ring-2 ring-emerald-400 bg-emerald-50/10'
              )}
            >
              <div className={cn(
                "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none transition-opacity duration-500 group-hover/game:opacity-40",
                game.tone === 'sky'    && 'bg-sky-400',
                game.tone === 'emerald' && 'bg-emerald-400',
                game.tone === 'amber'  && 'bg-amber-400'
              )} />
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

              <div className="mt-5 flex items-start justify-between gap-3 relative z-10">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{game.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{game.skill}</p>
                </div>
                <div className="inline-flex shrink-0 rounded-full bg-slate-100/80 px-3 py-1.5 text-[11px] font-black tracking-wider text-slate-600 shadow-sm border border-slate-200/50">
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
      <div className="group rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-7 sm:p-9 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Oyun Geçmişi</h3>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Oynadığınız etkinliklerin geçmişi burada görünür.</p>
          </div>
          <span className="rounded-xl bg-indigo-50 border border-indigo-100/50 px-4 py-2 text-xs font-black text-indigo-600 shadow-sm">
            {gameSessions.length} TOPLAM KAYIT
          </span>
        </div>

        {challengingCount > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 text-sm font-medium leading-6 text-amber-800 shadow-sm">
            💪 {challengingCount} etkinlikte "Zorlandı" işaretlenmiş. Zorlanılan etkinlikleri tekrar denerken daha küçük adımlara bölmeyi ya da uzmanınıza bildirmeyi düşünebilirsiniz.
          </div>
        )}

        <div className="mt-6 space-y-3.5">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => {
              const game = allGames.find((item) => item.id === session.gameId);
              const feedback = getGameFeedbackMeta(session.status);
              return (
                <div key={`${session.gameId}-${session.completedAt}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{game?.title || session.linkedGoal}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">{getDateKey(session.completedAt)}</p>
                    </div>
                    <span className={cn('rounded-full border px-3 py-1 text-[11px] font-bold shadow-sm', feedback.className)}>
                      {feedback.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl bg-slate-50/80 px-5 py-6 text-sm font-medium leading-6 text-slate-500 text-center border border-dashed border-slate-200">
              Henüz oyun kaydı yok. İlk kayıt oluşturulduğunda geçmiş burada görünür.
            </p>
          )}
        </div>
      </div>

      {/* Social stories */}
      <div className="group rounded-[2.5rem] border border-slate-200/60 bg-white/70 p-7 sm:p-9 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Sosyal Hikâyeler ve Görsel Akış</h3>
            <p className="mt-1.5 text-sm font-medium text-slate-500">Bir etkinliğe başlamadan önce çocuğunuza "Ne olacak?" sorusunu yanıtlayan kısa resimli hikayeler — geçişleri kolaylaştırır.</p>
          </div>
          <Link
            to="/sosyal-hikayeler"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md"
          >
            Yeni Hikâye Ekle
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {socialStories.map((story) => (
            <div key={story.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <span className="text-4xl drop-shadow-sm">{story.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{story.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed font-medium text-slate-500">{story.meta}</p>
                  <div className="mt-3 inline-flex rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-100/50">
                    BAĞLI HEDEF: {story.linkedGoal}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
