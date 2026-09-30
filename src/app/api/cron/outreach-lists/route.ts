import { assertCronSecret } from "@/lib/meetings/officer-reminder-cron";
import { dispatchOutreachBatch } from "@/lib/email/outreach-lists";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (
    !assertCronSecret(request.headers.get("authorization"), secret) &&
    !assertCronSecret(request.headers.get("x-cron-secret"), secret)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchOutreachBatch();
  return Response.json({ ok: true, sent: result.sent });
}
