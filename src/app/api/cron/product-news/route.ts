import { assertCronSecret } from "@/lib/meetings/officer-reminder-cron";
import { dispatchProductNewsBatch } from "@/lib/email/product-news-delivery";

/** A single bounded batch; CapRover calls this on a schedule after release. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!assertCronSecret(request.headers.get("authorization"), secret)
    && !assertCronSecret(request.headers.get("x-cron-secret"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await dispatchProductNewsBatch();
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Product-news dispatch failed." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
