import { confirmProductNewsSubscription } from "@/lib/email/product-news-subscriptions";

export async function POST(request: Request) {
  let body: { token?: unknown };
  try { body = await request.json() as { token?: unknown }; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  try {
    const ok = await confirmProductNewsSubscription(body.token);
    return Response.json({ ok }, { status: ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Confirmation is unavailable right now." }, { status: 503 });
  }
}
