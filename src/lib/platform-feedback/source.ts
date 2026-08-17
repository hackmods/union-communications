import type { SiteFeedbackSource } from "@/types/platform-feedback";

/**
 * Stamp source from the signed-in session + surface hint.
 * Anonymous visitors are always `public`. Client-supplied identity is ignored.
 */
export function resolveFeedbackSource(opts: {
  hasSession: boolean;
  surfaceHeader?: string | null;
  referer?: string | null;
}): SiteFeedbackSource {
  if (!opts.hasSession) return "public";
  const header = opts.surfaceHeader?.trim().toLowerCase();
  if (header === "hub" || header === "portal") return header;
  const ref = opts.referer ?? "";
  if (ref.includes("/portal")) return "portal";
  if (ref.includes("/app/")) return "hub";
  return "public";
}

export function toInboxItem<
  T extends { ipHash?: string; submitterUserId?: string },
>(row: T): Omit<T, "ipHash"> & { signedIn: boolean } {
  const rest = { ...row };
  delete rest.ipHash;
  return { ...rest, signedIn: Boolean(row.submitterUserId) };
}
