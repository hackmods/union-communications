import { unionExists } from "@/lib/tenant/union-exists";

/**
 * Soften orphan `unionId` values before a Postgres audit insert.
 * Returns `undefined` when the id is missing from `unions` so the nullable
 * FK column stays null and login / API writers are not blocked by logging.
 */
export async function resolveAuditUnionId(
  unionId: string | undefined | null,
): Promise<string | undefined> {
  if (unionId == null) return undefined;
  const trimmed = unionId.trim();
  if (!trimmed) return undefined;
  // Synthetic list filter / solo placeholders are never real tenant rows.
  if (trimmed === "__none__" || trimmed.startsWith("solo-union-")) {
    console.warn(
      `[audit] dropping non-tenant unionId=${trimmed} (not a unions row)`,
    );
    return undefined;
  }
  if (!(await unionExists(trimmed))) {
    console.warn(
      `[audit] dropping orphan unionId=${trimmed} (not present in unions)`,
    );
    return undefined;
  }
  return trimmed;
}
