import type { AuthorizationActor } from "@/lib/authorization/model";
import { COMPILED_DEFAULTS } from "@/lib/customization/defaults";
import { readPublishedContent } from "@/lib/customization/compile";
import { getCustomizationAdapter } from "@/lib/customization/store";
import type { ReaderContentResult } from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";

const systemScope = { id: "system", kind: "system" as const, archived: false };

/**
 * Server delivery for pages/APIs. Missing Postgres or missing content falls back to
 * compiled defaults; database exceptions become unavailable (never silent empty).
 */
export async function loadCustomizationContent(input: {
  key: string;
  locale: "en" | "fr";
  targetScopeId?: string;
  scopes?: readonly unknown[];
  context?: RlsSessionContext;
  actor?: AuthorizationActor | null;
  locals?: Array<{ unionId: string; localId: string; divisionId?: string; active: boolean }>;
}): Promise<ReaderContentResult> {
  const scopes = input.scopes ?? [systemScope];
  try {
    const adapter = getCustomizationAdapter();
    return await readPublishedContent({
      adapter,
      context: input.context ?? {},
      key: input.key,
      locale: input.locale,
      scopes,
      targetScopeId: input.targetScopeId,
      actor: input.actor ?? null,
      locals: input.locals ?? [],
      manifest: COMPILED_DEFAULTS,
    });
  } catch {
    return readPublishedContent({
      adapter: {
        readerTransaction: async (_context, run) => run({
          read: async () => [],
        }),
        transaction: async () => {
          throw new Error("Customization PostgreSQL is unavailable");
        },
      },
      context: {},
      key: input.key,
      locale: input.locale,
      scopes,
      targetScopeId: input.targetScopeId,
      actor: null,
      locals: [],
      manifest: COMPILED_DEFAULTS,
    });
  }
}
