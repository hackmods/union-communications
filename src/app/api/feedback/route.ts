import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  extractFeedbackClientIp,
} from "@/lib/platform-feedback/rate-limit";
import { submitSiteFeedback } from "@/lib/platform-feedback/submit";

/**
 * Public + signed-in site feedback submit (ADR-018).
 * Auth optional. Rate-limited by hashed IP — raw IP is never stored.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const session = await auth();
  const result = await submitSiteFeedback({
    raw,
    ip: extractFeedbackClientIp(request),
    sessionUserId: session?.user?.id,
    surfaceHeader: request.headers.get("x-unionops-surface"),
    referer: request.headers.get("referer"),
  });

  return NextResponse.json(result.body, { status: result.status });
}
