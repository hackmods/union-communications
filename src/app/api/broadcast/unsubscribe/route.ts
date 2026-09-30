import { unsubscribeMemberBroadcast } from "@/lib/email/member-broadcast-unsubscribe";

export const dynamic = "force-dynamic";

async function extractToken(request: Request): Promise<string | undefined> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) return fromQuery;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { token?: unknown };
      return typeof body.token === "string" ? body.token : undefined;
    } catch {
      return undefined;
    }
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const form = await request.formData();
      const token = form.get("token");
      if (typeof token === "string" && token.trim()) {
        return token.trim();
      }
      const oneClick = form.get("List-Unsubscribe");
      if (
        typeof oneClick === "string" &&
        oneClick.trim() &&
        oneClick.trim() !== "One-Click"
      ) {
        return oneClick.trim();
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function handleUnsubscribe(request: Request) {
  const token = await extractToken(request);
  if (!token) {
    return Response.json({ error: "Missing token." }, { status: 400 });
  }
  try {
    const ok = await unsubscribeMemberBroadcast(token);
    return Response.json(
      { ok },
      { status: ok ? 200 : 400, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Unsubscribe is unavailable right now." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  return handleUnsubscribe(request);
}

export async function POST(request: Request) {
  return handleUnsubscribe(request);
}
