import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-ms-accent)] hover:bg-[var(--color-ms-accent-hover)] text-slate-950 font-semibold shadow-[var(--shadow-ms-sm)] hover:shadow-[var(--shadow-ms-glow)]',
  secondary:
    'bg-[var(--color-ms-bg-card)] hover:bg-[var(--color-ms-bg-card-hover)] text-[var(--color-ms-text-primary)] border border-[var(--color-ms-border)]',
  ghost:
    'bg-transparent hover:bg-[var(--color-ms-accent-muted)] text-[var(--color-ms-text-secondary)] hover:text-[var(--color-ms-accent-light)]',
  danger:
    'bg-[var(--color-ms-negative)] hover:bg-[var(--color-ms-negative-light)] text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Button component with variants, sizes, loading state, and animations.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium
          rounded-[var(--radius-ms-md)]
          transition-all duration-[var(--duration-ms-normal)] ease-out
          cursor-pointer
          active:scale-[0.95]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
