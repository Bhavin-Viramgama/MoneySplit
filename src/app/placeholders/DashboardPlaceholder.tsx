import { Logo } from '../../components/ui/Logo';

/**
 * Dashboard placeholder for Milestone 1.
 * Will be replaced with the full dashboard in a future milestone.
 */
export function DashboardPlaceholder() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="ms-animate-slide-up">
        {/* Welcome card */}
        <div
          className="
            ms-glass rounded-[var(--radius-ms-xl)]
            p-8 sm:p-12
            text-center
            max-w-2xl mx-auto
          "
        >
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-ms-text-primary)] mb-3">
            You're in! 🎉
          </h2>
          <p className="text-[var(--color-ms-text-secondary)] mb-8 max-w-md mx-auto">
            Your account is ready. The dashboard, friend invitations, finance tracking,
            and settlement features are coming in the next milestones.
          </p>

          {/* Feature preview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <FeatureCard
              icon="👥"
              title="Friends"
              description="Invite friends via secure links"
              delay={100}
            />
            <FeatureCard
              icon="📊"
              title="Ledger"
              description="Track who owes what, transparently"
              delay={200}
            />
            <FeatureCard
              icon="💸"
              title="Settlements"
              description="Clear balances with UPI payments"
              delay={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="
        ms-animate-fade-in
        p-4 rounded-[var(--radius-ms-lg)]
        bg-[var(--color-ms-bg-card)]
        border border-[var(--color-ms-border)]/50
        hover:border-[var(--color-ms-accent)]/30
        transition-all duration-[var(--duration-ms-normal)]
      "
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm text-[var(--color-ms-text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-ms-text-muted)]">{description}</p>
    </div>
  );
}
