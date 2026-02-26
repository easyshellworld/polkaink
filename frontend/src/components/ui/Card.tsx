import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const paddings: Record<string, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, hover, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${paddings[padding]} ${
        hover ? 'hover:border-[var(--color-primary)] transition-colors' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
