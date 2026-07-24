import type { MeetingRsvpTallies, RsvpResponse } from "@/types/meetings";

/**
 * Quorum / food tallies matching R0 Document Generator RSVP meaning:
 * - Quorum = attending yes (any joinMode)
 * - Food heads = on-site yes + their guestsOnSite
 */
export function computeRsvpTallies(
  responses: RsvpResponse[],
  quorumNeeded?: number,
): MeetingRsvpTallies {
  let quorumCount = 0;
  let onSiteYes = 0;
  let remoteYes = 0;
  let maybeCount = 0;
  let noCount = 0;
  let foodHeads = 0;

  for (const row of responses) {
    if (row.attending === "yes") {
      quorumCount += 1;
      if (row.joinMode === "on_site") {
        onSiteYes += 1;
        foodHeads += 1 + Math.max(0, row.guestsOnSite ?? 0);
      } else if (row.joinMode === "remote") {
        remoteYes += 1;
      }
    } else if (row.attending === "maybe") {
      maybeCount += 1;
    } else if (row.attending === "no") {
      noCount += 1;
    }
  }

  return {
    quorumCount,
    quorumNeeded,
    quorumShortfall:
      quorumNeeded != null ? Math.max(0, quorumNeeded - quorumCount) : 0,
    onSiteYes,
    remoteYes,
    maybeCount,
    noCount,
    foodHeads,
    responseCount: responses.length,
  };
}
