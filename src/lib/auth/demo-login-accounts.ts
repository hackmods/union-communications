/**
 * Client-safe demo login catalog. Keep password hashes and bcrypt out of this
 * module so the Officer login page can list sample accounts without bundling
 * server auth code.
 *
 * Roster is Behind 7 Proxies (B7P) with meme locals — never real OPSEU numbers.
 */

/** Reserved RFC 2606 `.test` domain — not a real union or local mailbox. */
export const DEMO_EMAIL_DOMAIN = "unionops.test";

export function demoEmail(localPart: string): string {
  return `${localPart}@${DEMO_EMAIL_DOMAIN}`;
}

/** Shared plaintext for every sample account — same as the login Callout. */
export const DEMO_SHARED_PASSWORD = "demo123";

export const DEMO_LOGIN_ROLE_KEYS = [
  "president7",
  "steward7",
  "stewardPt7",
  "jointLead404",
  "divisionAdmin",
  "president502",
  "president1337",
  "stability7",
  "member7",
  "solo",
] as const;

export type DemoLoginRoleKey = (typeof DEMO_LOGIN_ROLE_KEYS)[number];

export type DemoLoginAccount = {
  userId: string;
  roleKey: DemoLoginRoleKey;
  email: string;
};

/** Display order for the login Callout — workshop roles first. */
export const DEMO_LOGIN_ACCOUNTS: readonly DemoLoginAccount[] = [
  {
    userId: "user-president-7",
    roleKey: "president7",
    email: demoEmail("president.7"),
  },
  {
    userId: "user-steward-7",
    roleKey: "steward7",
    email: demoEmail("steward.7"),
  },
  {
    userId: "user-steward-7-pt",
    roleKey: "stewardPt7",
    email: demoEmail("steward-pt.7"),
  },
  {
    userId: "user-joint-404",
    roleKey: "jointLead404",
    email: demoEmail("joint.404"),
  },
  {
    userId: "user-division-admin",
    roleKey: "divisionAdmin",
    email: demoEmail("b7p-admin"),
  },
  {
    userId: "user-president-502",
    roleKey: "president502",
    email: demoEmail("president.502"),
  },
  {
    userId: "user-president-1337",
    roleKey: "president1337",
    email: demoEmail("president.1337"),
  },
  {
    userId: "user-stability-7",
    roleKey: "stability7",
    email: demoEmail("stability.7"),
  },
  {
    userId: "user-member-7",
    roleKey: "member7",
    email: demoEmail("member.7"),
  },
  {
    userId: "user-solo",
    roleKey: "solo",
    email: demoEmail("solo"),
  },
];
