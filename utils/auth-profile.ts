/** User fields that indicate post-onboarding profile completion (camelCase or snake_case). */
export type HasProfileUserFields = {
  hasProfile?: boolean;
  has_profile?: boolean;
  role?: string;
};

/** User fields for email verification (camelCase or alternate API shape). */
export type EmailVerifiedUserFields = {
  emailVerified?: boolean;
  isEmailVerified?: boolean;
};

/**
 * Whether the user has completed profile / app-preference onboarding.
 * Matches logic used across auth-store, oauth.service, and app/index.tsx.
 */
export function resolveHasProfile(
  user: HasProfileUserFields | null | undefined
): boolean {
  if (!user) return false;
  if (user.hasProfile === true || user.has_profile === true) return true;
  if (user.role === 'admin' || user.role === 'tutor') return true;
  return false;
}

/**
 * Whether the user's email is verified.
 * Matches logic used in auth-store sync and navigation routing.
 */
export function resolveEmailVerified(
  user: EmailVerifiedUserFields | null | undefined
): boolean {
  if (!user) return false;
  return user.emailVerified === true || user.isEmailVerified === true;
}
