import { customizationConfigurationError } from "@/lib/auth/customization-session";
import {
  createCustomizationResource,
  createCustomizationScope,
  listCustomizationScopes,
} from "@/lib/customization/admin";
import { draftContentHash, getDraft, saveDraft } from "@/lib/customization/drafts";
import { publishAtomically } from "@/lib/customization/publish";
import { getCustomizationAdapter } from "@/lib/customization/store";
import type { CustomizationScope } from "@/lib/customization/types";
import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";
import type { RlsSessionContext } from "@/lib/db/rls-context";

const systemScope: CustomizationScope = {
  id: "system",
  kind: "system",
  archived: false,
};

function unionScope(unionId: string): CustomizationScope {
  return {
    id: `union-${unionId}`,
    kind: "union",
    unionId,
    parentScopeId: "system",
    archived: false,
  };
}

export function isCustomizationPublishAvailable(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return customizationConfigurationError(env) === null;
}

function brandBaselineLayer(
  scopeId: string,
  unionName: string,
  theme: UnionBrandTheme,
) {
  const key = "brand:baseline" as const;
  return {
    schemaVersion: 1 as const,
    key,
    scopeId,
    revisionId: "draft-brand-styles",
    mode: "define" as const,
    resource: {
      schemaVersion: 1 as const,
      key,
      policy: {
        audience: "public" as const,
        enabled: true,
        editableFields: [
          "label",
          "primaryColor",
          "secondaryColor",
          "accentColor",
          "headlineFontId",
          "bodyFontId",
          "logoAssetId",
        ],
      },
      payload: {
        kind: "brand" as const,
        label: {
          en: `${unionName} brand`,
          fr: `Marque ${unionName}`,
        },
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        headlineFontId: theme.headlineFontId ?? "montserrat",
        bodyFontId: theme.bodyFontId ?? "sourceSans",
        logoAssetId: null,
      },
    },
  };
}

/**
 * Draft (and optionally publish) `brand:baseline` from a Brand Styles theme.
 * Requires a customization-capable RLS context (MFA when enabled).
 */
export async function draftBrandBaselineFromTheme(input: {
  unionId: string;
  unionName: string;
  theme: UnionBrandTheme;
  actorId: string;
  rlsContext: RlsSessionContext;
  publish?: boolean;
  reason?: string;
}): Promise<
  | {
      ok: true;
      resourceId: string;
      lockVersion: number;
      published?: boolean;
      releaseId?: string;
    }
  | { ok: false; status: number; error: string }
> {
  if (!isCustomizationPublishAvailable()) {
    return {
      ok: false,
      status: 503,
      error: "Customization is not configured on this host",
    };
  }

  const adapter = getCustomizationAdapter();
  const target = unionScope(input.unionId);
  let scopes = await listCustomizationScopes(adapter, input.rlsContext);
  if (!scopes.some((s) => s.id === "system")) {
    await createCustomizationScope(adapter, input.rlsContext, systemScope);
  }
  if (!scopes.some((s) => s.id === target.id)) {
    await createCustomizationScope(adapter, input.rlsContext, target);
  }
  scopes = await listCustomizationScopes(adapter, input.rlsContext);

  const resources = await adapter.transaction(input.rlsContext, async (tx) =>
    tx.read("resources", { unionId: input.unionId }),
  );
  let resourceId = resources.find((row) => row.key === "brand:baseline")?.id;
  if (!resourceId) {
    const created = await createCustomizationResource(
      adapter,
      input.rlsContext,
      {
        scopeId: target.id,
        unionId: input.unionId,
        key: "brand:baseline",
        kind: "brand",
        actorId: input.actorId,
      },
    );
    resourceId = created.resourceId;
  }

  const existing = await getDraft(adapter, input.rlsContext, resourceId);
  const layer = brandBaselineLayer(target.id, input.unionName, input.theme);
  const reason =
    input.reason?.trim() || "Brand Styles theme → brand:baseline draft";
  const reviewedAt = new Date().toISOString();
  const hash = draftContentHash(layer);
  const saved = await saveDraft(adapter, input.rlsContext, {
    resourceId,
    scopeId: target.id,
    unionId: input.unionId,
    actorId: input.actorId,
    expectedLockVersion: existing?.lockVersion ?? 0,
    payload: layer,
    reviews: {
      en: { hash, reviewedBy: input.actorId, reviewedAt },
      fr: { hash, reviewedBy: input.actorId, reviewedAt },
    },
    reason,
  });
  if (!saved.ok) {
    return { ok: false, status: saved.status, error: saved.error };
  }

  if (!input.publish) {
    return {
      ok: true,
      resourceId,
      lockVersion: saved.lockVersion,
      published: false,
    };
  }

  const [head] = await adapter.transaction(input.rlsContext, async (tx) =>
    tx.read("heads", { resourceId }),
  );
  const published = await publishAtomically(adapter, input.rlsContext, {
    resourceId,
    actorId: input.actorId,
    expectedDraftLockVersion: saved.lockVersion,
    expectedGeneration: head?.generation ?? 1,
    expectedAncestorHeads: {},
    reason: `${reason} (publish)`,
    scopes: [
      systemScope,
      target,
      ...scopes.filter((s) => s.id !== target.id && s.id !== "system"),
    ],
    requireBilingualReview: true,
    idempotencyKey: `brand-styles-baseline-${resourceId}-${saved.lockVersion}`,
  });
  if (!published.ok) {
    return {
      ok: false,
      status: published.status,
      error: published.error,
    };
  }
  return {
    ok: true,
    resourceId,
    lockVersion: saved.lockVersion,
    published: true,
    releaseId: published.releaseId,
  };
}
