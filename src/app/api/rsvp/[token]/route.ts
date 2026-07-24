import { NextResponse } from "next/server";
import { maybeSendRsvpConfirmation } from "@/lib/email/rsvp-confirm";
import {
  checkRsvpSubmitRateLimit,
  extractRsvpClientIp,
  hashRsvpClientIp,
} from "@/lib/meetings/rsvp-rate-limit";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { parseJsonBody } from "@/lib/validation/parse";
import { submitPublicRsvpSchema } from "@/lib/validation/meetings-rsvp";

function isTokenUsable(expiresAt?: string, revokedAt?: string): boolean {
  if (revokedAt) return false;
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return false;
  return true;
}

/**
 * Public tokenized RSVP submit (Calendar R1 / ADR-015).
 * No auth. Rate-limited by hashed IP only — raw IP is never stored.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const resolved = await meetingsRsvpStore.resolvePublicToken(token);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isTokenUsable(resolved.tokenRow.expiresAt, resolved.tokenRow.revokedAt)) {
    return NextResponse.json(
      { error: "This RSVP link is no longer accepting responses." },
      { status: 410 },
    );
  }

  const ip = extractRsvpClientIp(request);
  const ipHash = hashRsvpClientIp(ip);
  if (!checkRsvpSubmitRateLimit(ipHash)) {
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

  const parsed = parseJsonBody(submitPublicRsvpSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { consentEmailConfirm, email: rawEmail, ...rsvpFields } = parsed.data;
  const result = await meetingsRsvpStore.submitResponse(
    resolved.tokenRow.meetingId,
    {
      ...rsvpFields,
      email: rawEmail || undefined,
      consentAccepted: parsed.data.consentAccepted === true,
    },
    { source: "public_form", ipHash },
  );

  if (result.error || !result.response) {
    return NextResponse.json(
      { error: result.error ?? "Submit failed" },
      { status: 400 },
    );
  }

  let confirmationEmailSent: boolean | undefined;
  const confirmEmail =
    consentEmailConfirm === true ? (rawEmail || "").trim() : "";
  if (confirmEmail) {
    const fullMeeting = await meetingsRsvpStore.getMeetingById(
      resolved.tokenRow.meetingId,
    );
    const sendResult = await maybeSendRsvpConfirmation({
      to: confirmEmail,
      meeting: {
        id: resolved.tokenRow.meetingId,
        title: resolved.meeting.title,
        startsAt: resolved.meeting.startsAt,
        location: resolved.meeting.location,
        unionId: fullMeeting?.unionId,
        localId: fullMeeting?.localId,
      },
      attending: parsed.data.attending,
      joinMode: parsed.data.joinMode,
    });
    confirmationEmailSent = sendResult.ok;
  }

  return NextResponse.json(
    {
      ok: true,
      responseId: result.response.id,
      ...(confirmationEmailSent !== undefined
        ? { confirmationEmailSent }
        : {}),
    },
    { status: 201 },
  );
}
