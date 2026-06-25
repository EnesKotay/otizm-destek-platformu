import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface OnboardingStep {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClick?: () => void;
}

interface PageOnboardingProps {
  pageId: string;
  title: ReactNode;
  description?: ReactNode;
  steps?: OnboardingStep[];
  className?: string;
}

export function PageOnboarding({ pageId, title, description, steps = [], className }: PageOnboardingProps) {
  const sectionRef = useRef<HTMLElement>(null);
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

  const handleStepClick = (onClick?: () => void) => {
    if (onClick) {
      onClick();
      return;
    }

    sectionRef.current?.nextElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!visible) return null;

  return (
    <section ref={sectionRef} className={cn('relative rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5', className)}>
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
          {steps.map((step, index) => {
            const content = (
              <>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  {step.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                {step.description && <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>}
              </>
            );

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleStepClick(step.onClick)}
                className="w-full cursor-pointer rounded-xl bg-white/80 p-3 text-left ring-1 ring-indigo-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm hover:ring-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
