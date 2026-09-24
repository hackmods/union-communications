import { z } from "zod";

export const ENTITLEMENT_FEATURE_KEYS = [
  "customization.maintenance",
  "customization.private_guides",
  /** Future paid: org-wide hosted CA clause library management. */
  "ca_library_hosted",
] as const;

export type EntitlementFeatureKey = (typeof ENTITLEMENT_FEATURE_KEYS)[number];

export const entitlementRecordSchema = z.object({
  id: z.string().min(1),
  unionId: z.string().min(1),
  featureKey: z.enum(ENTITLEMENT_FEATURE_KEYS),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  state: z.enum(["active", "expired", "suspended"]),
  operatorAuditRef: z.string().min(1).max(200),
}).strict();

export type EntitlementRecord = z.infer<typeof entitlementRecordSchema>;

export interface EntitlementProvider {
  hasEntitlement(unionId: string, featureKey: EntitlementFeatureKey, at?: Date): Promise<boolean>;
  listForUnion(unionId: string): Promise<EntitlementRecord[]>;
  upsert(record: EntitlementRecord): Promise<EntitlementRecord>;
}

/** In-memory operator store for tests and nonproduction demos. Not a production failover. */
export class MemoryEntitlementProvider implements EntitlementProvider {
  private readonly records = new Map<string, EntitlementRecord>();

  async hasEntitlement(unionId: string, featureKey: EntitlementFeatureKey, at = new Date()): Promise<boolean> {
    for (const record of this.records.values()) {
      if (record.unionId !== unionId || record.featureKey !== featureKey) continue;
      if (record.state !== "active") continue;
      if (Date.parse(record.startsAt) > at.getTime()) continue;
      if (record.endsAt && Date.parse(record.endsAt) <= at.getTime()) continue;
      return true;
    }
    return false;
  }

  async listForUnion(unionId: string): Promise<EntitlementRecord[]> {
    return [...this.records.values()].filter((row) => row.unionId === unionId);
  }

  async upsert(record: EntitlementRecord): Promise<EntitlementRecord> {
    const parsed = entitlementRecordSchema.parse(record);
    this.records.set(parsed.id, parsed);
    return parsed;
  }
}

let provider: EntitlementProvider | null = null;

export function getEntitlementProvider(): EntitlementProvider {
  if (!provider) provider = new MemoryEntitlementProvider();
  return provider;
}

export function setEntitlementProviderForTests(next: EntitlementProvider | null) {
  provider = next;
}

/**
 * Expired maintenance entitlement blocks new hosted edits but preserves published reads.
 * Never gates free public Comms tools. If no entitlement rows exist for the union,
 * editing stays open (operator has not configured commercial gates yet).
 */
export async function mayEditHostedCustomization(input: {
  unionId: string;
  at?: Date;
  provider?: EntitlementProvider;
}): Promise<{ allowed: boolean; reason: string }> {
  const store = input.provider ?? getEntitlementProvider();
  const configured = await store.listForUnion(input.unionId);
  if (configured.length === 0) return { allowed: true, reason: "entitlements_not_configured" };
  const entitled = await store.hasEntitlement(input.unionId, "customization.maintenance", input.at);
  if (!entitled) return { allowed: false, reason: "maintenance_entitlement_required" };
  return { allowed: true, reason: "entitled" };
}

/**
 * Org-wide CA clause library (Hub `/app/snippets`) — future paid feature seed.
 * When no entitlement rows exist for the union, management stays open (demos).
 * Never gates free public Comms `/tools/ca-snippets`.
 */
export async function mayManageHostedCaLibrary(input: {
  unionId: string;
  at?: Date;
  provider?: EntitlementProvider;
}): Promise<{ allowed: boolean; reason: string }> {
  const store = input.provider ?? getEntitlementProvider();
  const configured = await store.listForUnion(input.unionId);
  if (configured.length === 0) {
    return { allowed: true, reason: "entitlements_not_configured" };
  }
  const entitled = await store.hasEntitlement(
    input.unionId,
    "ca_library_hosted",
    input.at,
  );
  if (!entitled) {
    return { allowed: false, reason: "ca_library_entitlement_required" };
  }
  return { allowed: true, reason: "entitled" };
}

export function isFreePublicCommsTool(_toolId: string): boolean {
  // Public Comms stay free forever — entitlements never paywall these.
  return true;
}
