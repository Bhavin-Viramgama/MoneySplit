interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

/**
 * Animated loading spinner.
 */
export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`
        rounded-full
        border-[var(--color-ms-border)]
        border-t-[var(--color-ms-accent)]
        animate-spin
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ animationDuration: '0.6s' }}
    />
  );
}
