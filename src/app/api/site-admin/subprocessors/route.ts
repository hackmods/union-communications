import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import {
  subprocessorAuditEvents,
  subprocessorPublicProjections,
  subprocessorRegistry,
} from "@/lib/db/schema";
import {
  authorizeSubprocessorAdmin,
  noStoreJson,
} from "@/lib/site-admin/subprocessor-http";
import { subprocessorFieldsSchema } from "@/lib/site-admin/subprocessor-validation";

function snapshot(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/** GET /api/site-admin/subprocessors */
export async function GET() {
  const access = await authorizeSubprocessorAdmin();
  if (!access.ok) return access.response;
  try {
    return await withRlsContext(access.rlsContext, async () => {
      const db = getDb();
      await db.insert(subprocessorAuditEvents).values({
        id: crypto.randomUUID(),
        actorId: access.actorId,
        providerId: null,
        action: "viewed",
        beforeRecord: null,
        afterRecord: null,
      });
      const records = await db
        .select()
        .from(subprocessorRegistry)
        .orderBy(desc(subprocessorRegistry.updatedAt));
      const events = await db
        .select()
        .from(subprocessorAuditEvents)
        .orderBy(desc(subprocessorAuditEvents.createdAt))
        .limit(100);
      const published = await db
        .select({ id: subprocessorPublicProjections.id })
        .from(subprocessorPublicProjections);
      return noStoreJson({ records, events, publishedIds: published.map((row) => row.id) });
    });
  } catch {
    return noStoreJson({ error: "Could not load the subprocessor register." }, { status: 500 });
  }
}

/** POST /api/site-admin/subprocessors */
export async function POST(request: Request) {
  const access = await authorizeSubprocessorAdmin();
  if (!access.ok) return access.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = subprocessorFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: "Check the provider details and try again." }, { status: 400 });
  }
  const now = new Date();
  const id = crypto.randomUUID();
  try {
    return await withRlsContext(access.rlsContext, async () => {
      const db = getDb();
      const [record] = await db
        .insert(subprocessorRegistry)
        .values({
          id,
          ...parsed.data,
          reviewStatus: "unreviewed",
          dpaStatus: "unreviewed",
          publicDisclosureApproved: false,
          reviewOwner: null,
          reviewedBy: null,
          reviewedAt: null,
          createdBy: access.actorId,
          updatedBy: access.actorId,
          updatedAt: now,
        })
        .returning();
      await db.insert(subprocessorAuditEvents).values({
        id: crypto.randomUUID(),
        actorId: access.actorId,
        providerId: id,
        action: "created",
        beforeRecord: null,
        afterRecord: snapshot(record),
      });
      return noStoreJson({ record }, { status: 201 });
    });
  } catch {
    return noStoreJson({ error: "Could not save the provider record." }, { status: 500 });
  }
}
