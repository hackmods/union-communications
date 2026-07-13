/**
 * Whether this deployment is a demo / workshop instance.
 * When on, authenticated Officer Hub surfaces show a persistent demo banner
 * so visitors know data is sample-only and not live production.
 *
 * Set `NEXT_PUBLIC_DEMO_SITE=true` on demo hosts. Default: off.
 */
export function isDemoSite(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): boolean {
  const raw = env.NEXT_PUBLIC_DEMO_SITE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
