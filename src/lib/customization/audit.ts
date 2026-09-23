import type { CustomizationTransaction } from "@/lib/customization/adapter";
import { idSchema } from "@/lib/customization/schemas";

export type CustomizationAuditAction =
  | "draft.save"
  | "preview"
  | "publish"
  | "rollback"
  | "withdraw"
  | "policy"
  | "inherit";

/** Audit writes must share the publication transaction; failure aborts the mutation. */
export async function writeCustomizationAudit(
  tx: CustomizationTransaction,
  input: {
    id?: string;
    scopeId: string;
    unionId: string | null;
    actorId: string;
    action: CustomizationAuditAction;
    resourceId?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Customization audit reason is required");
  await tx.insert("audit", {
    id: input.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    scopeId: idSchema.parse(input.scopeId),
    unionId: input.unionId,
    actorId: idSchema.parse(input.actorId),
    action: input.action,
    resourceId: input.resourceId,
    reason,
    metadata: input.metadata ?? {},
  });
}
