export function shouldRedirectToOnboarding(
  user: { onboardedAt: Date | null | undefined },
  pathname: string
): boolean {
  if (user.onboardedAt) return false;
  if (!pathname.startsWith("/dashboard")) return false;
  if (pathname.startsWith("/dashboard/onboarding")) return false;
  return true;
}
