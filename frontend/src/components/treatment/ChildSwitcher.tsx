import type { Child } from '@/types';
import { cn } from '@/utils/cn';
import { getChildInitial, splitTherapies } from '@/features/treatment/treatmentPlan';

interface ChildSwitcherProps {
  childrenList: Child[];
  activeChildId: string;
  onSelect: (child: Child) => void;
}

export function ChildSwitcher({ childrenList, activeChildId, onSelect }: ChildSwitcherProps) {
  if (childrenList.length <= 1) return null;

  return (
    <section className="flex flex-wrap gap-3" aria-label="Çocuk profili seçimi">
      {childrenList.map((child) => {
        const isActive = child.id === activeChildId;

        return (
          <button
            key={child.id}
            type="button"
            onClick={() => onSelect(child)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition-all',
              isActive
                ? 'border-primary-200 bg-primary-50 text-slate-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-semibold text-primary-700 ring-1 ring-slate-100">
              {getChildInitial(child.name)}
            </div>
            <div>
              <p className="text-sm font-semibold">{child.name}</p>
              <p className="text-xs text-slate-400">{splitTherapies(child.therapies).length || 1} terapi başlığı</p>
            </div>
          </button>
        );
      })}
    </section>
  );
}
