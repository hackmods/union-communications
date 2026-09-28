import {
  assertEnterpriseEmailCapability,
} from "@/lib/email/enterprise-gates";

/**
 * Open/click tracking only when:
 * 1) CapRover + union tracking entitlement (dual gate), AND
 * 2) the operator explicitly opts in on this send.
 */
export async function resolveOpenTracking(input: {
  unionId: string;
  explicitOptIn: boolean;
}): Promise<{ apply: boolean; reason?: string }> {
  if (!input.explicitOptIn) {
    return { apply: false, reason: "not_requested" };
  }
  const gate = await assertEnterpriseEmailCapability(
    "tracking_pixels",
    input.unionId,
  );
  if (!gate.ok) {
    return { apply: false, reason: gate.reason };
  }
  return { apply: true };
}
