import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface OnboardingStep {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}

interface PageOnboardingProps {
  pageId: string;
  title: ReactNode;
  description?: ReactNode;
  steps?: OnboardingStep[];
  className?: string;
}

export function PageOnboarding({ pageId, title, description, steps = [], className }: PageOnboardingProps) {
  const storageKey = `page-onboarding:${pageId}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(localStorage.getItem(storageKey) !== 'dismissed');
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className={cn('relative rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5', className)}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-indigo-400 transition hover:bg-white/70 hover:text-indigo-700"
        aria-label="Rehberi kapat"
      >
        <X size={16} />
      </button>
      <div className="pr-9">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {steps.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="rounded-xl bg-white/80 p-3 ring-1 ring-indigo-100">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                {step.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
              {step.description && <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
