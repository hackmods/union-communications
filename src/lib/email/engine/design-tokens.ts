import { resolveHostBrandWithOverlay } from "@/lib/brand/host-brand-overlay";
import type { EmailBrandTokens } from "./types";

const PRODUCT_NAME = "UnionOps";

/**
 * Platform SMTP chrome from host-brand (env → overlay → host-brand.json).
 * Steward draft Brand Kit tokens are a separate path (draft lane).
 */
export function resolvePlatformEmailBrand(opts?: {
  logoUrl?: string;
  signOff?: string;
}): EmailBrandTokens {
  const host = resolveHostBrandWithOverlay();
  return {
    productName: PRODUCT_NAME,
    primaryColor: host.primaryColor,
    secondaryColor: host.secondaryColor,
    accentColor: host.accentColor,
    ...(opts?.logoUrl ? { logoUrl: opts.logoUrl } : {}),
    signOff: opts?.signOff ?? `— ${PRODUCT_NAME}`,
  };
}
