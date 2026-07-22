import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary-600 text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/30 focus-visible:ring-primary-500',
  secondary: 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400',
  outline: 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-primary-500',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-primary-500 shadow-none',
  danger: 'border-transparent bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500',
  success: 'border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs font-bold',
  md: 'h-10 px-4 text-sm font-bold',
  lg: 'h-12 px-6 text-base font-bold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition-all duration-200 active:scale-[0.98] cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-60',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
