/**
 * Whether Officer Hub is publicly advertised (header CTA, home path, hub-forward copy).
 * Routes under `/app` stay reachable for demos and CI regardless.
 *
 * Set `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true` when launching.
 * Default: off (not officially launched).
 *
 * IMPORTANT: the default argument must statically read
 * `process.env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC` so Next can inline it into the
 * client bundle. Passing `process.env` as a whole is NOT inlined, which made
 * SSR render hub UI while the browser hydrated the soft-launch UI (React #418).
 */
export function isOfficerHubPublic(
  env: Partial<NodeJS.ProcessEnv> = {
    NEXT_PUBLIC_OFFICER_HUB_PUBLIC: process.env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC,
  },
): boolean {
  const raw = env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
