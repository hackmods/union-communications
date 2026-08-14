import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

/**
 * Pulse Poll authoring (`/tools/pulse-poll`) needs Officer Hub login.
 * Soft-launch off (`NEXT_PUBLIC_OFFICER_HUB_PUBLIC` unset/false) → hide entirely.
 * Hub public but anonymous → redirect to login (exports stay behind the gate).
 * Member answer URLs (`/poll/[slug]`) stay public.
 */
export function isPulsePollAuthoringEnabled(
  env: Partial<NodeJS.ProcessEnv> = {
    NEXT_PUBLIC_OFFICER_HUB_PUBLIC: process.env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC,
  },
): boolean {
  return isOfficerHubPublic(env);
}
