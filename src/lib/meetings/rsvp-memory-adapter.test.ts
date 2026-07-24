import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryMeetingsRsvpAdapter,
  resetMemoryMeetingsRsvpStore,
} from "@/lib/meetings/rsvp-memory-adapter";

describe("MemoryMeetingsRsvpAdapter", () => {
  beforeEach(() => {
    resetMemoryMeetingsRsvpStore();
  });

  it("creates meeting, token, public response, and tallies", async () => {
    const store = new MemoryMeetingsRsvpAdapter();
    const meeting = await store.createMeeting(
      {
        title: "LEC",
        startsAt: "2026-08-01T23:00:00.000Z",
        endsAt: "2026-08-02T01:00:00.000Z",
        location: "Room 1",
        quorumNeeded: 4,
        hybrid: true,
      },
      { unionId: "u1", localId: "l1", createdById: "officer-1" },
    );

    const token = await store.createToken(meeting.id, {
      createdById: "officer-1",
    });
    expect(token?.token).toBeTruthy();

    const publicYes = await store.submitResponse(
      meeting.id,
      {
        attending: "yes",
        joinMode: "on_site",
        displayName: "Alex",
        guestsOnSite: 1,
        consentAccepted: true,
      },
      { source: "public_form" },
    );
    expect(publicYes.response?.id).toBeTruthy();

    const walkIn = await store.submitResponse(
      meeting.id,
      {
        attending: "yes",
        joinMode: "remote",
        displayName: "Blair",
      },
      { source: "officer_entry" },
    );
    expect(walkIn.response?.source).toBe("officer_entry");

    const tallies = await store.tallies(meeting.id);
    expect(tallies?.quorumCount).toBe(2);
    expect(tallies?.foodHeads).toBe(2);
    expect(tallies?.quorumShortfall).toBe(2);

    const resolved = await store.resolvePublicToken(token!.token);
    expect(resolved?.meeting.title).toBe("LEC");
    expect(resolved?.meeting.tokenRevoked).toBe(false);
  });

  it("rejects public submit without consent or joinMode", async () => {
    const store = new MemoryMeetingsRsvpAdapter();
    const meeting = await store.createMeeting(
      {
        title: "LEC",
        startsAt: "2026-08-01T23:00:00.000Z",
        endsAt: "2026-08-02T01:00:00.000Z",
        location: "Room 1",
      },
      { unionId: "u1", localId: "l1", createdById: "officer-1" },
    );

    const noConsent = await store.submitResponse(
      meeting.id,
      {
        attending: "yes",
        joinMode: "on_site",
        displayName: "Alex",
        consentAccepted: false,
      },
      { source: "public_form" },
    );
    expect(noConsent.error).toBe("Consent required");

    const noJoin = await store.submitResponse(
      meeting.id,
      {
        attending: "yes",
        displayName: "Alex",
        consentAccepted: true,
      },
      { source: "public_form" },
    );
    expect(noJoin.error).toMatch(/joinMode/);
  });
});
