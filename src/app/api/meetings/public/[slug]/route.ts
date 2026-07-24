import { NextResponse } from "next/server";
import { computeNextMeeting } from "@/lib/meetings/recurrence";
import { meetingsStore } from "@/lib/meetings/store";

type Params = { params: Promise<{ slug: string }> };

/**
 * Public, unauthenticated — no PII, no union/local ids in the response.
 * Backs the `/meetings/[slug]` page and any external embed/share widget.
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const schedule = await meetingsStore.getBySlug(slug);
  if (!schedule) {
    return NextResponse.json({ nextMeeting: null }, { status: 404 });
  }
  const nextMeeting = computeNextMeeting(schedule);
  return NextResponse.json({ nextMeeting });
}
