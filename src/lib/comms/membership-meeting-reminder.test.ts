import { describe, expect, it } from "vitest";
import { buildMembershipMeetingReminder } from "@/lib/comms/membership-meeting-reminder";

const base = {
  title: "LEC hybrid meeting",
  startsAt: "2026-08-01T18:00:00.000Z",
  location: "Board room A",
  localNumber: "243",
  quorumNeeded: 5,
  quorumCount: 3,
  foodHeads: 4,
  rsvpUrl: "https://unionops.org/en/r/tok123",
};

describe("buildMembershipMeetingReminder", () => {
  it("builds EN subject/body with RSVP link and tallies", () => {
    const email = buildMembershipMeetingReminder(base, { locale: "en" });
    expect(email.subject).toContain("Reminder");
    expect(email.subject).toContain("LEC hybrid meeting");
    expect(email.body).toContain("Board room A");
    expect(email.body).toContain("Quorum: 3 / 5");
    expect(email.body).toContain("Food heads (on site): 4");
    expect(email.body).toContain("https://unionops.org/en/r/tok123");
    expect(email.body).toContain("copy-only");
  });

  it("builds FR draft and notes missing token", () => {
    const email = buildMembershipMeetingReminder(
      { ...base, rsvpUrl: undefined, foodHeads: null },
      { locale: "fr" },
    );
    expect(email.subject).toContain("Rappel");
    expect(email.body).toContain("jeton RSVP");
    expect(email.body).toContain("Quorum : 3 / 5");
  });
});
