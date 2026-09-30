import { NextResponse } from "next/server";
import {
  confirmOutreachListFromTokenHash,
  verifyOutreachConfirmToken,
} from "@/lib/email/outreach-confirm";
import { readOutreachListsConfig } from "@/lib/email/outreach-config";

/** Signed-token confirmation for outreach list double opt-in (ADR-023). */
export async function GET(request: Request) {
  const config = readOutreachListsConfig();
  if (!config.enabled && !config.tokenKeys.length) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
  const token = new URL(request.url).searchParams.get("token");
  const hash = verifyOutreachConfirmToken(token, config);
  if (!hash) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }
  const ok = await confirmOutreachListFromTokenHash(hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }
  return NextResponse.json(
    { ok: true, confirmed: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
