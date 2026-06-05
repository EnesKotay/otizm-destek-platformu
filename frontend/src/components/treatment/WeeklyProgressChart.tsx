interface WeeklyProgressItem {
  key: string;
  label: string;
  gameCount: number;
  goalPercent: number;
}

interface WeeklyProgressChartProps {
  items: WeeklyProgressItem[];
  recommendedGameCount: number;
}

export function WeeklyProgressChart({ items, recommendedGameCount }: WeeklyProgressChartProps) {
  return (
    <div className="mt-5 grid grid-cols-7 gap-2" aria-label="Haftalık oyun ve hedef ilerlemesi">
      {items.map((item) => (
        <div key={item.key} className="rounded-2xl bg-slate-50 px-2 py-3 text-center">
          <div className="flex h-20 items-end justify-center gap-1.5">
            <div className="flex w-2.5 flex-col justify-end rounded-full bg-sky-100" aria-hidden="true">
              <div
                className="rounded-full bg-sky-400"
                style={{ height: `${Math.max((item.gameCount / Math.max(recommendedGameCount, 1)) * 100, item.gameCount > 0 ? 10 : 0)}%` }}
              />
            </div>
            <div className="flex w-2.5 flex-col justify-end rounded-full bg-emerald-100" aria-hidden="true">
              <div
                className="rounded-full bg-emerald-400"
                style={{ height: `${Math.max(item.goalPercent, item.goalPercent > 0 ? 10 : 0)}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-400">{item.label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{item.gameCount} oyun</p>
          <p className="text-xs text-slate-500">%{item.goalPercent} hedef</p>
        </div>
      ))}
    </div>
  );
}
