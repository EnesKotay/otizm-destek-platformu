import { CheckCircle2, Info, AlertTriangle, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastType } from '@/store/toastStore';
import { cn } from '@/utils/cn';

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-950',
  error: 'border-red-100 bg-red-50 text-red-950',
  warning: 'border-amber-100 bg-amber-50 text-amber-950',
  info: 'border-blue-100 bg-blue-50 text-blue-950',
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg shadow-slate-900/10',
              toastStyles[toast.type]
            )}
          >
            <Icon size={20} className={cn('mt-0.5 shrink-0', iconStyles[toast.type])} />
            <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-lg p-1 text-current opacity-50 transition hover:bg-white/60 hover:opacity-80"
              aria-label="Bildirimi kapat"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
