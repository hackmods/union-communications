/**
 * Platform gate for Workforce Time (clock, sites/geofence GPS, scheduling, shifts).
 *
 * Code and Hub routes stay in the tree for future refactor. When this flag is
 * off (default), Time is omitted from Hub nav discovery and president toggles
 * so stewards are not steered into it. Locals that already have `time` in
 * `enabledModules` keep API access; UI chrome simply stops advertising it.
 *
 * Opt back in: `NEXT_PUBLIC_WORKFORCE_TIME_ENABLED=true`.
 *
 * IMPORTANT: default args must statically read the env key so Next can inline
 * it into the client bundle (same pattern as `isOfficerHubPublic`).
 */
export function isWorkforceTimeEnabled(
  env: Partial<NodeJS.ProcessEnv> = {
    NEXT_PUBLIC_WORKFORCE_TIME_ENABLED:
      process.env.NEXT_PUBLIC_WORKFORCE_TIME_ENABLED,
  },
): boolean {
  const raw = env.NEXT_PUBLIC_WORKFORCE_TIME_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
