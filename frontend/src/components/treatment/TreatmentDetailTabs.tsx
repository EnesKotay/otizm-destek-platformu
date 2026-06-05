import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TreatmentDetailTabItem<TValue extends string> {
  value: TValue;
  label: string;
  icon: ReactNode;
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
    <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label={label}>
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
              'inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold transition-all',
              isActive
                ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
