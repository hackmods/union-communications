import { requestProductNewsPreferences } from "@/lib/email/product-news-subscriptions";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim() ?? "unknown";
  try {
    const result = await requestProductNewsPreferences({
      email: body.email,
      locale: body.locale,
      clientIp: ip,
    });
    if (result === "invalid") return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (result === "unavailable") return Response.json({ error: "Email preferences are unavailable right now." }, { status: 503 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Email preferences are unavailable right now." }, { status: 503 });
  }
}
