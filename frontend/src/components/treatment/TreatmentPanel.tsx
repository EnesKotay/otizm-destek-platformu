import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface TreatmentPanelProps {
  children: ReactNode;
  className?: string;
}

export function TreatmentPanel({ children, className }: TreatmentPanelProps) {
  return (
    <div className={cn('rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]', className)}>
      {children}
    </div>
  );
}
