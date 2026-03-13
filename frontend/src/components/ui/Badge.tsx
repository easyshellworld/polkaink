import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
  primary: 'bg-[var(--color-primary-10)] text-[var(--color-primary)]',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  pill?: boolean;
}

export function Badge({ variant = 'neutral', children, className = '', pill = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium ${
        pill ? 'rounded-full px-2.5 py-0.5' : 'rounded px-2 py-0.5'
      } ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
