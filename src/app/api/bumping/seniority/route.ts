import { NextResponse } from "next/server";
import {
  listFiltersForBumpingSession,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { rankEligibleBumpers } from "@/lib/bumping/seniority";
import { listSeniorityRoster } from "@/lib/bumping/seniority-roster";

/**
 * Advisory seniority ranking for a vacancy classification.
 * Not a binding decision engine — committee DecisionRecord remains authoritative.
 */
export async function GET(request: Request) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const classification = url.searchParams.get("classification")?.trim();
  if (!classification) {
    return NextResponse.json(
      { error: "classification query parameter required" },
      { status: 400 },
    );
  }

  const filters = listFiltersForBumpingSession(session);
  const roster = listSeniorityRoster(filters);
  const ranked = rankEligibleBumpers(classification, roster);

  return NextResponse.json({
    advisory: true,
    notice:
      "Suggested eligibility order only — not a binding decision. Committee judgment and DecisionRecord prevail.",
    classification,
    ranked,
  });
}
