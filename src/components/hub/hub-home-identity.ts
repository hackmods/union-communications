/**
 * Logged-in Hub home identity — tenant names only, never a preview wink.
 * Empty local numbers stay omitted rather than resolving to 777.
 */

export function hubIdentityHeading(input: {
  unionName?: string | null;
  pendingFallback: string;
}): string {
  const name = input.unionName?.trim();
  return name ? name : input.pendingFallback;
}

export function hubIdentityLocalLine(input: {
  localNumber?: string | null;
  localLabel: (number: string) => string;
}): string | null {
  const number = input.localNumber?.trim();
  return number ? input.localLabel(number) : null;
}
