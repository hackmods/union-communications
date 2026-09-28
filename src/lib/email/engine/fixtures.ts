/** Sample payloads for Site Admin preview / test send (no live PII). */

export const EMAIL_ENGINE_FIXTURES = {
  invite_accept: {
    inviteeName: "Alex Steward",
    acceptUrl: "https://example.test/app/invite/sample-token",
    expiresAt: "2026-12-31T17:00:00.000Z",
    kind: "officer" as const,
  },
  password_reset: {
    name: "Alex Steward",
    resetUrl: "https://example.test/app/reset-password/sample-token",
    expiresAt: "2026-12-31T17:00:00.000Z",
  },
  sign_in_link: {
    name: "Alex Steward",
    signInUrl: "https://example.test/app/sign-in/sample-token",
    expiresAt: "2026-12-31T17:00:00.000Z",
  },
  officer_meeting_reminder: {
    title: "Local executive meeting",
    startsAt: "2026-10-15T18:00:00.000Z",
    location: "Union hall",
    meetingUrl: "https://example.test/app/meetings",
  },
  rsvp_confirmation: {
    title: "Membership meeting",
    startsAt: "2026-10-20T18:30:00.000Z",
    location: "Union hall",
    attending: "Yes",
    joinMode: "on_site",
  },
} as const;
