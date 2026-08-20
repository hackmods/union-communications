import { describe, expect, it } from "vitest";
import { buildInviteAcceptEmail } from "@/lib/email/messages";

describe("buildInviteAcceptEmail", () => {
  it("names early local setup for officers and presidents", () => {
    const officer = buildInviteAcceptEmail({
      inviteeName: "Alex",
      acceptUrl: "https://example.test/app/invite/abc",
      expiresAt: "2026-08-21T00:00:00.000Z",
    });
    expect(officer.subject).toMatch(/Officer Hub/);
    expect(officer.text).toMatch(/early local setup/);

    const president = buildInviteAcceptEmail({
      inviteeName: "Sam",
      acceptUrl: "https://example.test/app/invite/abc",
      expiresAt: "2026-08-21T00:00:00.000Z",
      kind: "president",
    });
    expect(president.subject).toMatch(/Set up your local/);
    expect(president.text).toMatch(/invite your officers and members/);
  });

  it("sends members to Hall, not Officer Hub casework", () => {
    const member = buildInviteAcceptEmail({
      inviteeName: "Jordan",
      acceptUrl: "https://example.test/app/invite/abc",
      expiresAt: "2026-08-21T00:00:00.000Z",
      kind: "member",
    });
    expect(member.subject).not.toMatch(/Officer Hub/);
    expect(member.text).toMatch(/Hall/);
    expect(member.text).toMatch(/not a mailing list/);
  });
});
