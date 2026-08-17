import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireSiteFeedbackInboxSession } from "@/lib/auth/platform-feedback-session";
import { toInboxItem } from "@/lib/platform-feedback/source";
import { platformFeedbackStore } from "@/lib/platform-feedback/store";
import {
  SITE_FEEDBACK_CATEGORIES,
  SITE_FEEDBACK_SOURCES,
  SITE_FEEDBACK_STATUSES,
  type SiteFeedbackCategory,
  type SiteFeedbackSource,
  type SiteFeedbackStatus,
} from "@/types/platform-feedback";

function asEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/** platform_admin inbox list. */
export async function GET(request: Request) {
  const authResult = await requireSiteFeedbackInboxSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const url = new URL(request.url);
  const items = await platformFeedbackStore.list({
    status: asEnum(url.searchParams.get("status"), SITE_FEEDBACK_STATUSES) as
      | SiteFeedbackStatus
      | undefined,
    category: asEnum(
      url.searchParams.get("category"),
      SITE_FEEDBACK_CATEGORIES,
    ) as SiteFeedbackCategory | undefined,
    source: asEnum(url.searchParams.get("source"), SITE_FEEDBACK_SOURCES) as
      | SiteFeedbackSource
      | undefined,
  });

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "feedback.list",
    resourceType: "platform_feedback",
    resourceId: "*",
  });

  return NextResponse.json({ items: items.map(toInboxItem) });
}
