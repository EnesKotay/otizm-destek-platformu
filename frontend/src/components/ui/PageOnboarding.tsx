import type { ReactNode } from 'react';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PageOnboarding(_props: PageOnboardingProps) {
  return null;
}
