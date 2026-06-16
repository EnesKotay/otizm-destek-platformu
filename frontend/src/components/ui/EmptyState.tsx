import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  steps?: string[];
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, steps, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center', className)}>
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {steps && steps.length > 0 && (
        <div className="mx-auto mt-5 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-100">
              <span className="mr-1 text-primary-700">{index + 1}.</span>
              {step}
            </div>
          ))}
        </div>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
