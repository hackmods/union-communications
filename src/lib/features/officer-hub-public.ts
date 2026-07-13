/**
 * Whether Officer Hub is publicly advertised (header CTA, home path, hub-forward copy).
 * Routes under `/app` stay reachable for demos and CI regardless.
 *
 * Set `NEXT_PUBLIC_OFFICER_HUB_PUBLIC=true` when launching.
 * Default: off (not officially launched).
 */
export function isOfficerHubPublic(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): boolean {
  const raw = env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
