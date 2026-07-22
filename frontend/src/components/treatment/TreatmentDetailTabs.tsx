import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TreatmentDetailTabItem<TValue extends string> {
  value: TValue;
  label: string;
  icon: ReactNode;
  count?: string | number;
  badgeColor?: string;
}

interface TreatmentDetailTabsProps<TValue extends string> {
  tabs: readonly TreatmentDetailTabItem<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  label: string;
}

export function TreatmentDetailTabs<TValue extends string>({
  tabs,
  value,
  onChange,
  label,
}: TreatmentDetailTabsProps<TValue>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1.5 border border-slate-200/60" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const isActive = value === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all cursor-pointer select-none',
              isActive
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent'
            )}
          >
            <span className={cn('transition-colors', isActive ? 'text-primary-600' : 'text-slate-400')}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none transition-colors',
                  isActive
                    ? (tab.badgeColor || 'bg-primary-50 text-primary-700 ring-1 ring-primary-200/60')
                    : 'bg-slate-200/70 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
