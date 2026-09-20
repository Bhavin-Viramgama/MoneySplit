/**
 * Application-wide constants.
 *
 * These values are used for validation, auth identity construction,
 * and UI constraints. Keep them in sync with database CHECK constraints.
 */

/** Domain used for synthetic auth emails. Never shown to users. */
export const SYNTHETIC_EMAIL_DOMAIN = 'moneysplit.local';

/** Username validation */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
export const USERNAME_ALLOWED_CHARS_DISPLAY = 'letters, numbers, and underscores';

/** Password constraints */
export const PASSWORD_MIN_LENGTH = 8;

/** App identity */
export const APP_NAME = 'MoneySplit';

/** Amount constraints (paise — 1 INR = 100 paise) */
export const AMOUNT_MIN_MINOR = 1; // 0.01 INR
export const AMOUNT_MAX_MINOR = 10_000_000; // 1,00,000 INR

/**
 * Constructs the synthetic email used for Supabase Auth.
 * This email is NEVER shown to users or stored in profiles.
 */
export function buildSyntheticEmail(username: string): string {
  const normalized = username.toLowerCase().trim();
  return `${normalized}@${SYNTHETIC_EMAIL_DOMAIN}`;
}
