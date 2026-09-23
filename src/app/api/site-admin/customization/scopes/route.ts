import { z } from "zod";
import { createCustomizationScope, listCustomizationScopes } from "@/lib/customization/admin";
import { noStoreJson, targetScopeSchema } from "@/lib/customization/http";
import { requireCustomizationSession } from "@/lib/auth/customization-session";
import { getCustomizationAdapter } from "@/lib/customization/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";

const listSchema = z.object({
  action: z.literal("list").default("list"),
  target: targetScopeSchema,
}).strict();

const createSchema = z.object({
  action: z.literal("create"),
  target: targetScopeSchema,
  scope: targetScopeSchema,
}).strict();

export async function GET() {
  return noStoreJson({ error: "POST with explicit target scope required" }, { status: 405 });
}

/** POST /api/site-admin/customization/scopes */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof raw === "object" && raw && "action" in raw
    ? String((raw as { action?: string }).action ?? "list")
    : "list";

  if (action === "create") {
    const parsed = parseJsonBody(createSchema, raw);
    if (!parsed.ok) return noStoreJson({ error: "Validation failed", issues: parsed.issues }, { status: 400 });
    const gate = await requireCustomizationSession(parsed.data.target, "customization.edit");
    if (!gate.ok) return noStoreJson({ error: gate.error }, { status: gate.status });
    try {
      const adapter = getCustomizationAdapter();
      const created = await createCustomizationScope(adapter, gate.rlsContext, parsed.data.scope);
      return noStoreJson({ ok: true, scope: created });
    } catch (err) {
      reportApiFailure(err, "/api/site-admin/customization/scopes");
      return noStoreJson({ error: "Customization service unavailable" }, { status: 503 });
    }
  }

  const parsed = parseJsonBody(listSchema, { ...((raw as object) ?? {}), action: "list" });
  if (!parsed.ok) return noStoreJson({ error: "Validation failed", issues: parsed.issues }, { status: 400 });
  const gate = await requireCustomizationSession(parsed.data.target, "customization.readDraft");
  if (!gate.ok) return noStoreJson({ error: gate.error }, { status: gate.status });
  try {
    const adapter = getCustomizationAdapter();
    const scopes = await listCustomizationScopes(adapter, gate.rlsContext);
    return noStoreJson({ scopes });
  } catch (err) {
    reportApiFailure(err, "/api/site-admin/customization/scopes");
    return noStoreJson({ error: "Customization service unavailable" }, { status: 503 });
  }
}
