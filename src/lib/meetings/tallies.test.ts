import { describe, expect, it } from "vitest";
import { computeRsvpTallies } from "@/lib/meetings/tallies";
import type { RsvpResponse } from "@/types/meetings";

function row(
  partial: Pick<RsvpResponse, "attending" | "joinMode" | "guestsOnSite">,
): RsvpResponse {
  return {
    id: "r1",
    meetingId: "m1",
    unionId: "u1",
    localId: "l1",
    displayName: "Test",
    source: "public_form",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("computeRsvpTallies", () => {
  it("counts quorum as yes any joinMode and food heads as on-site yes + guests", () => {
    const tallies = computeRsvpTallies(
      [
        row({ attending: "yes", joinMode: "on_site", guestsOnSite: 2 }),
        row({ attending: "yes", joinMode: "remote" }),
        row({ attending: "maybe", joinMode: "on_site", guestsOnSite: 1 }),
        row({ attending: "no" }),
      ],
      5,
    );
    expect(tallies.quorumCount).toBe(2);
    expect(tallies.quorumShortfall).toBe(3);
    expect(tallies.onSiteYes).toBe(1);
    expect(tallies.remoteYes).toBe(1);
    expect(tallies.foodHeads).toBe(3);
    expect(tallies.maybeCount).toBe(1);
    expect(tallies.noCount).toBe(1);
    expect(tallies.responseCount).toBe(4);
  });
});
