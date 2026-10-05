const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/TreatmentPage.tsx', 'utf8');

const startMarker = "{/* ── 4 Sakin ve Belirgin Dokunma Kutusu (Sensory-Friendly Pastel) ── */}";
const endMarker = "{children.length > 1 && (";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

const newSection = `{/* ── Günlük Özet ve Hızlı Erişim Kartları ── */}
      <div className="flex flex-col gap-5">
        {/* 1. Bugünkü Plan (Öncelikli Büyük Kart) */}
        <button
          type="button"
          onClick={() => setActiveDetailTab('today')}
          className="group relative flex flex-col justify-between rounded-3xl bg-gradient-to-br from-blue-50 to-white p-6 sm:p-8 text-slate-900 border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer text-left w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 ring-1 ring-blue-200">
                  <CalendarDays size={24} />
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950">Bugünün Planı</h2>
              </div>
              <p className="mt-3 text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                Bugün yapacağınız işlere hızlıca göz atın. {todayRemainingCount > 0 ? \`Tamamlanmayı bekleyen \${todayRemainingCount} göreviniz var.\` : 'Bugün tüm görevleri tamamladınız, harika!'}
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-600">{todayRemainingCount}</div>
                <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mt-1">İş Kaldı</div>
              </div>
            </div>
          </div>
          
          {/* Görev Önizlemesi */}
          {todayPlan.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              {todayPlan.slice(0, 2).map((step) => {
                const isDone = todayCompletedPlanSteps.has(step.id);
                return (
                  <div key={step.id} className={cn("flex items-center gap-3 rounded-xl bg-white p-3 border border-slate-100 shadow-sm", isDone ? "opacity-50" : "")}>
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2", isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>
                      {isDone && <span className="text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold truncate", isDone ? "text-slate-400 line-through" : "text-slate-700")}>{step.title}</p>
                    </div>
                  </div>
                );
              })}
              {todayPlan.length > 2 && (
                <div className="text-xs font-bold text-blue-600 mt-2 ml-1">
                  +{todayPlan.length - 2} görev daha...
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end border-t border-blue-100/50 pt-4">
            <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 font-extrabold px-4 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              Tüm Planı Gör <ArrowRight size={16} />
            </span>
          </div>
        </button>

        {/* Diğer 3 İkincil Kart */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 2. Ev Oyunları */}
          <button
            type="button"
            onClick={() => setActiveDetailTab('games')}
            className="group relative flex flex-col justify-between rounded-3xl bg-white p-5 text-slate-900 border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <Gamepad2 size={20} />
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                  {todayCompletedGames.length}/{recommendedGames.length}
                </span>
              </div>
              <h2 className="mt-4 text-base font-extrabold text-slate-950">Oyun & Egzersiz</h2>
              <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                Evde 5 dakikada oynanabilecek oyunlar.
              </p>
            </div>
          </button>

          {/* 3. Hedeflerim */}
          <button
            type="button"
            onClick={() => setActiveDetailTab('goals')}
            className="group relative flex flex-col justify-between rounded-3xl bg-white p-5 text-slate-900 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <Target size={20} />
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                  {completedGoalCount}/{totalGoalCount || 0}
                </span>
              </div>
              <h2 className="mt-4 text-base font-extrabold text-slate-950">Gelişim Hedefleri</h2>
              <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                Konuşma, sosyalleşme vb. yeni hedefler.
              </p>
            </div>
          </button>

          {/* 4. Sakinleşme & Araçlar */}
          <button
            type="button"
            onClick={() => setActiveDetailTab('tools')}
            className="group relative flex flex-col justify-between rounded-3xl bg-white p-5 text-slate-900 border border-slate-200/90 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer text-left shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <Sparkles size={20} />
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 ring-1 ring-amber-100">
                  {toolCards.length || 5} Araç
                </span>
              </div>
              <h2 className="mt-4 text-base font-extrabold text-slate-950">Yardımcı Araçlar</h2>
              <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                Sakinleşme kartları, hikayeler, tablolar.
              </p>
            </div>
          </button>
        </div>
      </div>

      `;

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newSection + content.substring(endIdx);
  fs.writeFileSync('frontend/src/pages/TreatmentPage.tsx', content);
  console.log('Updated successfully.');
} else {
  console.log('Could not find markers.');
}
