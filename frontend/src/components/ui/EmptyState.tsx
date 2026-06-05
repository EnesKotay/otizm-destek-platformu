import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center', className)}>
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
