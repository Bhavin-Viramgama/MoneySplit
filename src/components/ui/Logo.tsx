interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const sizeMap = {
  sm: { width: 28, height: 28, fontSize: 'text-lg' },
  md: { width: 40, height: 40, fontSize: 'text-2xl' },
  lg: { width: 56, height: 56, fontSize: 'text-4xl' },
};

/**
 * MoneySplit logo — inline SVG with optional float animation.
 */
export function Logo({ size = 'md', className = '', animated = false }: LogoProps) {
  const { width, height, fontSize } = sizeMap[size];

  return (
    <div
      className={`
        inline-flex items-center gap-2.5
        ${animated ? 'ms-animate-float' : ''}
        ${className}
      `}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-ms-accent-light)" />
            <stop offset="100%" stopColor="var(--color-ms-accent)" />
          </linearGradient>
          <linearGradient id="logo-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-ms-accent)" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#logo-grad-dark)" opacity="0.25" />
        <circle cx="20" cy="20" r="18" stroke="url(#logo-grad)" strokeWidth="2" opacity="0.8" />

        {/* Rupee symbol */}
        <text
          x="20.5"
          y="26.5"
          textAnchor="middle"
          fill="url(#logo-grad)"
          fontSize="20"
          fontWeight="800"
          fontFamily="Outfit, system-ui, sans-serif"
        >
          ₹
        </text>

        {/* Dynamic decorative dots */}
        <circle cx="10" cy="14" r="2" fill="var(--color-ms-accent-light)" />
        <circle cx="30" cy="26" r="2" fill="var(--color-ms-accent)" />
      </svg>
      <span
        className={`
          font-extrabold tracking-tight
          bg-gradient-to-r from-[var(--color-ms-accent)] via-[#818cf8] to-[var(--color-ms-accent-light)]
          bg-clip-text text-transparent
          ms-animate-gradient
          ${fontSize}
        `}
      >
        MoneySplit
      </span>
    </div>
  );
}
