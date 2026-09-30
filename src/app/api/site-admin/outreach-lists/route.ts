import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { outreachLists, outreachSubscribers, unions } from "@/lib/db/schema";
import {
  authorizeOutreachListsAdmin,
  outreachAdminJson,
} from "@/lib/email/outreach-lists-admin";
import {
  getEnterpriseEmailHostFlags,
  setUnionEmailEntitlements,
} from "@/lib/email/enterprise-gates";
import { marketingEmailLookupKey } from "@/lib/email/marketing-consent";
import { readOutreachListsConfig } from "@/lib/email/outreach-config";
import { OUTREACH_LIST_NOTICE_VERSION } from "@/lib/email/outreach-list-notice";

const patchSchema = z.object({
  unionId: z.string().min(1).max(120),
  outreachListsEnabled: z.boolean(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("pause_list"),
    unionId: z.string().min(1),
    listId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("resume_list"),
    unionId: z.string().min(1),
    listId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("search"),
    unionId: z.string().min(1),
    email: z.string().email(),
  }),
  z.object({
    action: z.literal("export_audit"),
    unionId: z.string().min(1),
  }),
]);

export async function GET() {
  const authorization = await authorizeOutreachListsAdmin();
  if (!authorization.ok) return authorization.response;
  const config = readOutreachListsConfig();
  const host = getEnterpriseEmailHostFlags();
  if (!isPostgresConfigured()) {
    return outreachAdminJson({
      durable: false,
      host,
      config: {
        enabled: config.enabled,
        reason: config.reason,
        noticeVersion: OUTREACH_LIST_NOTICE_VERSION,
        approvalReferencePresent: Boolean(config.approvalReference),
      },
      unions: [],
      lists: [],
    });
  }
  return withRlsContext(authorization.access.rlsContext, async () => {
    const unionRows = await getDb()
      .select({
        id: unions.id,
        name: unions.name,
        slug: unions.slug,
        outreachListsEnabled: unions.outreachListsEnabled,
      })
      .from(unions)
      .where(isNull(unions.archivedAt))
      .orderBy(unions.name);
    const lists = await getDb()
      .select({
        id: outreachLists.id,
        unionId: outreachLists.unionId,
        name: outreachLists.name,
        slug: outreachLists.slug,
        status: outreachLists.status,
        createdAt: outreachLists.createdAt,
      })
      .from(outreachLists)
      .orderBy(desc(outreachLists.createdAt))
      .limit(200);
    const listStats = await getDb().execute(sql`
      SELECT list_id,
        count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
        count(*) FILTER (WHERE status = 'pending_confirmation')::int AS pending,
        count(*) FILTER (WHERE status = 'suppressed')::int AS suppressed
      FROM outreach_subscribers
      GROUP BY list_id`);
    return outreachAdminJson({
      durable: true,
      host,
      config: {
        enabled: config.enabled,
        reason: config.reason,
        noticeVersion: OUTREACH_LIST_NOTICE_VERSION,
        approvalReferencePresent: Boolean(config.approvalReference),
      },
      unions: unionRows.map((u) => ({
        id: u.id,
        name: u.name,
        slug: u.slug,
        outreachListsEnabled: u.outreachListsEnabled === true,
      })),
      lists: lists.map((list) => {
        const stats = listStats.find((row) => row.list_id === list.id);
        return {
          ...list,
          createdAt: list.createdAt.toISOString(),
          confirmed: Number(stats?.confirmed ?? 0),
          pending: Number(stats?.pending ?? 0),
          suppressed: Number(stats?.suppressed ?? 0),
        };
      }),
    });
  });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeOutreachListsAdmin();
  if (!authorization.ok) return authorization.response;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return outreachAdminJson({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return outreachAdminJson({ error: "Invalid body" }, { status: 400 });
  }
  if (!hostAllowsOutreach()) {
    return outreachAdminJson({ error: "Host flag is off" }, { status: 409 });
  }
  const ok = await setUnionEmailEntitlements(parsed.data.unionId, {
    outreachListsEnabled: parsed.data.outreachListsEnabled,
  });
  if (!ok) return outreachAdminJson({ error: "Union not found" }, { status: 404 });
  const { requestId, responseHeaders } = createAuditRequestContext();
  await auditLog.log({
    userId: authorization.access.actorId,
    action: "site_admin.outreach_lists.entitlements.update",
    resourceType: "union",
    resourceId: parsed.data.unionId,
    unionId: parsed.data.unionId,
    metadata: {
      requestId,
      outreachListsEnabled: String(parsed.data.outreachListsEnabled),
    },
  });
  return outreachAdminJson({ ok: true }, { headers: responseHeaders() });
}

function hostAllowsOutreach(): boolean {
  return getEnterpriseEmailHostFlags().outreach_lists;
}

export async function POST(request: Request) {
  const authorization = await authorizeOutreachListsAdmin();
  if (!authorization.ok) return authorization.response;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return outreachAdminJson({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return outreachAdminJson({ error: "Invalid action" }, { status: 400 });
  }
  const { requestId, responseHeaders } = createAuditRequestContext();
  if (!isPostgresConfigured()) {
    return outreachAdminJson({ error: "Durable database required" }, { status: 503 });
  }
  const unionId = parsed.data.unionId;
  return withRlsContext(
    { ...authorization.access.rlsContext, unionId, crossLocal: true },
    async () => {
      const db = getDb();
      if (parsed.data.action === "pause_list" || parsed.data.action === "resume_list") {
        const status = parsed.data.action === "pause_list" ? "paused" : "active";
        await db
          .update(outreachLists)
          .set({ status, updatedAt: new Date() })
          .where(eq(outreachLists.id, parsed.data.listId));
        await auditLog.log({
          userId: authorization.access.actorId,
          action: `outreach_list.${status}`,
          resourceType: "outreach_list",
          resourceId: parsed.data.listId,
          metadata: { requestId },
        });
        return outreachAdminJson({ ok: true }, { headers: responseHeaders() });
      }
      if (parsed.data.action === "export_audit") {
        const lines = [
          "record_type,list_id,status,created_at",
          ...(
            await db
              .select()
              .from(outreachLists)
              .where(eq(outreachLists.unionId, parsed.data.unionId))
          ).map((list) =>
            ["list", list.id, list.status, list.createdAt.toISOString()].join(","),
          ),
        ];
        await auditLog.log({
          userId: authorization.access.actorId,
          action: "outreach_list.audit.export",
          resourceType: "union",
          resourceId: parsed.data.unionId,
          metadata: { requestId },
        });
        return new Response(lines.join("\r\n"), {
          headers: responseHeaders({
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=outreach-lists-audit.csv",
          }),
        });
      }
      const lookup = marketingEmailLookupKey(parsed.data.email);
      if (!lookup) {
        return outreachAdminJson({ error: "Enter a valid address" }, { status: 400 });
      }
      const rows = await db
        .select({
          id: outreachSubscribers.id,
          listId: outreachSubscribers.listId,
          status: outreachSubscribers.status,
          locale: outreachSubscribers.locale,
          wordingVersion: outreachSubscribers.wordingVersion,
          createdAt: outreachSubscribers.createdAt,
        })
        .from(outreachSubscribers)
        .where(
          and(
            eq(outreachSubscribers.unionId, parsed.data.unionId),
            eq(outreachSubscribers.lookupKey, lookup),
          ),
        );
      await auditLog.log({
        userId: authorization.access.actorId,
        action: "outreach_list.consent.search",
        resourceType: "outreach_subscriber",
        resourceId: lookup,
        metadata: { requestId, found: String(rows.length > 0) },
      });
      return outreachAdminJson(
        {
          found: rows.length > 0,
          rows: rows.map((row) => ({
            id: row.id,
            listId: row.listId,
            status: row.status,
            locale: row.locale,
            wordingVersion: row.wordingVersion,
            createdAt: row.createdAt.toISOString(),
          })),
        },
        { headers: responseHeaders() },
      );
    },
  );
}
