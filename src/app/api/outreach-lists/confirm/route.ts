import { NextResponse } from "next/server";
import { readOutreachListsConfig, verifyOutreachListToken } from "@/lib/email/outreach-config";

/** Signed-token confirmation for outreach list double opt-in (ADR-023). */
export async function GET(request: Request) {
  const config = readOutreachListsConfig();
  if (!config.enabled) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  const token = new URL(request.url).searchParams.get("token");
  const hash = verifyOutreachListToken(token, "confirm", config.tokenKeys);
  if (!hash) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }
  // Durable confirmation is applied in Postgres via action token consumer (follow-up).
  return NextResponse.json(
    { ok: true, pending: true, message: "Confirmation recorded when storage is configured." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
