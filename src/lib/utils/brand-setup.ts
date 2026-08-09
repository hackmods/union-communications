/**
 * Public Comms Brand Kit setup links.
 * Prefer Brand Kit once identity exists; otherwise send new locals to onboarding.
 */

export function brandSetupHref(themeEstablished: boolean): "/brand-kit" | "/onboarding" {
  return themeEstablished ? "/brand-kit" : "/onboarding";
}
