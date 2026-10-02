import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { requireSiteFeedbackInboxSession } from "@/lib/auth/platform-feedback-session";
import { platformFeedbackStore } from "@/lib/platform-feedback/store";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  SITE_FEEDBACK_STATUSES,
  type SiteFeedbackStatus,
} from "@/types/platform-feedback";

const bulkSiteFeedbackSchema = z
  .object({
    ids: z.array(z.string().min(1).max(128)).min(1).max(100),
    action: z.enum(["set_status", "delete"]),
    status: z.enum(SITE_FEEDBACK_STATUSES).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.action === "set_status" && !value.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "status is required for set_status",
        path: ["status"],
      });
    }
  });

/** platform_admin bulk triage on filtered inbox rows. */
export async function POST(request: Request) {
  const authResult = await requireSiteFeedbackInboxSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(bulkSiteFeedbackSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { ids, action, status } = parsed.data;
  let updated = 0;
  let deleted = 0;
  const notFound: string[] = [];

  for (const id of ids) {
    if (action === "delete") {
      const existing = await platformFeedbackStore.getById(id);
      if (!existing) {
        notFound.push(id);
        continue;
      }
      const ok = await platformFeedbackStore.delete(id);
      if (ok) deleted += 1;
      else notFound.push(id);
      continue;
    }

    const item = await platformFeedbackStore.update(id, {
      status: status as SiteFeedbackStatus,
    });
    if (item) updated += 1;
    else notFound.push(id);
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "feedback.bulk",
    resourceType: "platform_feedback",
    resourceId: action,
    metadata: {
      count: String(ids.length),
      updated: String(updated),
      deleted: String(deleted),
      notFound: String(notFound.length),
    },
  });

  return NextResponse.json({
    ok: true,
    updated,
    deleted,
    notFound,
  });
}
