import { ArrowRight, FileText, PlusCircle, Puzzle, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getChildInitial, splitTherapies } from '@/features/treatment/treatmentPlan';
import type { FocusArea } from '@/features/treatment/types';
import type { Child } from '@/types';

interface TreatmentHeroProps {
  childName: string;
  focusAreas: FocusArea[];
  activeProgramLabel: string;
  onDownloadPdf: () => void;
  childrenList?: Child[];
  activeChildId?: string;
  onSelectChild?: (child: Child) => void;
  onAddGoalClick: () => void;
}

const FOCUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  communication: { bg: 'bg-sky-500/20',    text: 'text-sky-100',    dot: 'bg-sky-300'    },
  social:        { bg: 'bg-violet-500/20', text: 'text-violet-100', dot: 'bg-violet-300' },
  sensory:       { bg: 'bg-amber-500/20',  text: 'text-amber-100',  dot: 'bg-amber-300'  },
};

export function TreatmentHero({
  childName,
  focusAreas,
  activeProgramLabel,
  onDownloadPdf,
  childrenList = [],
  activeChildId,
  onSelectChild,
  onAddGoalClick,
}: TreatmentHeroProps) {
  const showSwitcher = childrenList.length > 1 && onSelectChild;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 text-white sm:p-8">
      {/* Decorative dots */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative">
        {/* Top row */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Puzzle size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Günlük Destek Planı
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {childName}
              </h1>
              <p className="mt-1 text-sm text-indigo-200">{activeProgramLabel} planı aktif</p>

              {/* Focus area badges */}
              <div className="mt-3 flex flex-wrap gap-2">
                {focusAreas.map((area) => {
                  const meta = FOCUS_META[area.key] ?? { bg: 'bg-white/10', text: 'text-white', dot: 'bg-white' };
                  return (
                    <span
                      key={area.key}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm',
                        meta.bg, meta.text
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                      {area.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <FileText size={16} aria-hidden="true" />
              Rapor indir
            </button>
            <button
              type="button"
              onClick={onAddGoalClick}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
            >
              <PlusCircle size={16} aria-hidden="true" />
              Hedef ekle
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Child switcher — inline in hero when multiple children */}
        {showSwitcher && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                <Users size={12} />Profil seç
              </span>
              {childrenList.map((child) => {
                const isActive = child.id === activeChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectChild(child)}
                    aria-pressed={isActive}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all',
                      isActive
                        ? 'border-white/40 bg-white text-indigo-700 shadow-sm'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold',
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-white/20 text-white'
                    )}>
                      {getChildInitial(child.name)}
                    </div>
                    <span>{child.name}</span>
                    <span className={cn('text-xs', isActive ? 'text-indigo-400' : 'text-indigo-300')}>
                      {splitTherapies(child.therapies).length || 1} terapi
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
