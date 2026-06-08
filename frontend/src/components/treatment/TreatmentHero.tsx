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

const FOCUS_META: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  communication: { bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    text: 'text-sky-100',    dot: 'bg-sky-400',    glow: 'shadow-[0_0_15px_rgba(56,189,248,0.3)]' },
  social:        { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-100', dot: 'bg-violet-400', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.3)]' },
  sensory:       { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-100',  dot: 'bg-amber-400',  glow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]' },
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
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 text-white sm:p-10 shadow-2xl shadow-indigo-900/20 transition-all duration-500 group">
      {/* Background gradients and animated glows */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-fuchsia-900 opacity-95" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/30 blur-[100px] animate-pulse-slow" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Modern subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col gap-8">
        {/* Top row */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl shadow-black/10 ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <Puzzle size={26} className="text-white/90 drop-shadow-md" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 drop-shadow-sm">
                Günlük Destek Planı
              </p>
              <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-white drop-shadow-sm">
                {childName}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-indigo-200/90 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {activeProgramLabel} planı aktif
              </p>

              {/* Focus area badges */}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {focusAreas.map((area) => {
                  const meta = FOCUS_META[area.key] ?? { bg: 'bg-white/10', border: 'border-white/20', text: 'text-white', dot: 'bg-white', glow: '' };
                  return (
                    <span
                      key={area.key}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md border transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 cursor-default',
                        meta.bg, meta.border, meta.text, meta.glow
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full shadow-sm', meta.dot)} />
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
              className="group/btn inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
            >
              <FileText size={18} className="text-indigo-200 transition-colors group-hover/btn:text-white" aria-hidden="true" />
              Rapor indir
            </button>
            <button
              type="button"
              onClick={onAddGoalClick}
              className="group/btn relative inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-indigo-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite]" />
              <PlusCircle size={18} className="text-indigo-600" aria-hidden="true" />
              Hedef ekle
              <ArrowRight size={18} className="text-indigo-400 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Child switcher */}
        {showSwitcher && (
          <div className="mt-2 border-t border-white/10 pt-6 flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-widest">
              <Users size={14} className="opacity-70" /> Profil seç
            </span>
            <div className="flex flex-wrap gap-2.5">
              {childrenList.map((child) => {
                const isActive = child.id === activeChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectChild(child)}
                    aria-pressed={isActive}
                    className={cn(
                      'group/child inline-flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-300',
                      isActive
                        ? 'border-white/40 bg-white/10 backdrop-blur-md text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                        : 'border-white/10 bg-black/10 text-indigo-200 hover:bg-white/5 hover:border-white/20 hover:text-white'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold shadow-inner transition-transform duration-300 group-hover/child:scale-110',
                      isActive ? 'bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-indigo-500/50' : 'bg-white/10 text-white/70 group-hover/child:bg-white/20'
                    )}>
                      {getChildInitial(child.name)}
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span>{child.name}</span>
                      <span className={cn('text-[10px] font-medium uppercase tracking-wider', isActive ? 'text-indigo-200' : 'text-indigo-400')}>
                        {splitTherapies(child.therapies).length || 1} terapi
                      </span>
                    </div>
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

