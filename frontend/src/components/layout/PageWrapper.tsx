import type { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`mx-auto max-w-4xl px-4 py-8 pb-20 md:pb-8 ${className}`}>
      {children}
    </div>
  );
}
