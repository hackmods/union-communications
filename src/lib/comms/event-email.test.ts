import { describe, expect, it } from "vitest";
import { buildEventInviteEmail, buildMailto } from "@/lib/comms/event-email";

describe("event-email", () => {
  const fields = {
    title: "LEC meeting",
    date: "Tuesday, August 12",
    time: "12:00–1:00 pm",
    location: "Boardroom + video link",
    quorumNeeded: "8",
    contactName: "Local executive",
  };

  it("asks for attending, on-site/remote, and food in EN", () => {
    const email = buildEventInviteEmail(fields, {
      locale: "en",
      localNumber: "110",
    });
    expect(email.subject).toContain("RSVP");
    expect(email.subject).toContain("Local 110");
    expect(email.body).toContain("Attending: Yes / No / Maybe");
    expect(email.body).toContain("On site or Remote");
    expect(email.body).toContain("quorum");
    expect(email.body).toContain("Quorum needed: 8");
    expect(email.body).toContain("food order");
    expect(email.body).toContain("No auto-send");
  });

  it("localizes to FR", () => {
    const email = buildEventInviteEmail(fields, {
      locale: "fr",
      localNumber: "110",
    });
    expect(email.subject).toContain("section locale 110");
    expect(email.body).toContain("Sur place ou À distance");
    expect(email.body).toContain("quorum");
  });

  it("falls back to placeholder contact and omits empty when/where", () => {
    const email = buildEventInviteEmail(
      { title: "Meeting" },
      { locale: "en", localNumber: "243" },
    );
    expect(email.body).toContain("[Contact name]");
    expect(email.body).not.toContain("When:");
    expect(email.body).not.toContain("Where:");
    expect(email.body).not.toContain("Quorum needed:");
  });

  it("builds a mailto with %20-encoded subject and body", () => {
    const email = buildEventInviteEmail(fields, {
      locale: "en",
      localNumber: "110",
    });
    const mailto = buildMailto(email);
    expect(mailto.startsWith("mailto:?")).toBe(true);
    expect(mailto).toContain("subject=");
    expect(mailto).toContain("body=");
    expect(mailto).not.toContain("+");
  });
});
