import { NextResponse } from "next/server";
import {
  checkPollSubmitRateLimit,
  extractClientIp,
  hashClientIp,
} from "@/lib/polls/rate-limit";
import { pollsStore } from "@/lib/polls/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { submitPollResponseSchema } from "@/lib/validation/polls";

/**
 * Public anonymous poll submit (FUTURE-006 / ADR-015).
 * No auth. Rate-limited by hashed IP only — raw IP is never stored.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const poll = await pollsStore.getBySlug(slug);
  if (!poll || poll.status !== "open") {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const ip = extractClientIp(request);
  const ipHash = hashClientIp(ip);
  if (!checkPollSubmitRateLimit(ipHash)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again shortly." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(submitPollResponseSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const result = await pollsStore.submitResponse(poll.id, parsed.data, {
    ipHash,
  });
  if (result.error || !result.response) {
    return NextResponse.json(
      { error: result.error ?? "Submit failed" },
      { status: result.error === "Consent required" ? 400 : 400 },
    );
  }

  return NextResponse.json(
    { ok: true, responseId: result.response.id },
    { status: 201 },
  );
}
