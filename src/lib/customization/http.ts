import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireCustomizationSession } from "@/lib/auth/customization-session";
import { getCustomizationAdapter } from "@/lib/customization/store";
import { idSchema, scopeSchema } from "@/lib/customization/schemas";
import { parseJsonBody } from "@/lib/validation/parse";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type { CustomizationCapability } from "@/lib/customization/authorization";
import type { CustomizationScope } from "@/lib/customization/types";
import { mayEditHostedCustomization } from "@/lib/customization/entitlements";

export const targetScopeSchema = scopeSchema;
export const resourceIdSchema = idSchema;

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}

type MutationBody = { target: CustomizationScope };

const WRITE_CAPABILITIES = new Set<CustomizationCapability>([
  "customization.edit",
  "customization.publish",
  "customization.policy.manage",
  "customization.localParameters.edit",
  "customization.grants.manage",
]);

export async function withCustomizationMutation<S extends z.ZodTypeAny>(
  req: Request,
  capability: CustomizationCapability,
  schema: S,
  run: (input: {
    data: z.output<S> & MutationBody;
    gate: Extract<Awaited<ReturnType<typeof requireCustomizationSession>>, { ok: true }>;
    adapter: ReturnType<typeof getCustomizationAdapter>;
  }) => Promise<Response>,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(schema, raw);
  if (!parsed.ok) return noStoreJson({ error: "Validation failed", issues: parsed.issues }, { status: 400 });
  const data = parsed.data as z.output<S> & MutationBody;
  const gate = await requireCustomizationSession(data.target, capability);
  if (!gate.ok) return noStoreJson({ error: gate.error }, { status: gate.status });

  if (WRITE_CAPABILITIES.has(capability) && data.target.kind !== "system") {
    const entitlement = await mayEditHostedCustomization({ unionId: data.target.unionId });
    if (!entitlement.allowed) {
      return noStoreJson({ error: "Hosted maintenance entitlement required", reason: entitlement.reason }, { status: 403 });
    }
  }

  try {
    const adapter = getCustomizationAdapter();
    return await run({ data, gate, adapter });
  } catch (err) {
    reportApiFailure(err, req.url);
    return noStoreJson({ error: "Customization service unavailable" }, { status: 503 });
  }
}
