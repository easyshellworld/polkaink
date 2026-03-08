import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-[var(--color-secondary)] text-white hover:opacity-90',
  danger:
    'bg-[var(--color-error)] text-white hover:opacity-90',
  outline:
    'border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]',
  ghost:
    'hover:bg-[var(--color-surface-alt)]',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
