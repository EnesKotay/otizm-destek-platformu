import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/80', className)} {...props} />;
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 rounded-2xl border border-slate-100 bg-white p-5', className)}>
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 rounded-2xl border border-slate-100 bg-white p-5', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
