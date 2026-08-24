/**
 * Client-safe demo login catalog. Keep password hashes and bcrypt out of this
 * module so the Officer login page can list sample accounts without bundling
 * server auth code.
 */

/** Reserved RFC 2606 `.test` domain — not a real union or local mailbox. */
export const DEMO_EMAIL_DOMAIN = "unionops.test";

export function demoEmail(localPart: string): string {
  return `${localPart}@${DEMO_EMAIL_DOMAIN}`;
}

/** Shared plaintext for every sample account — same as the login Callout. */
export const DEMO_SHARED_PASSWORD = "demo123";

export const DEMO_LOGIN_ROLE_KEYS = [
  "president243",
  "steward243",
  "stewardPt243",
  "jointLead145",
  "divisionAdmin",
  "president415",
  "president560",
  "stability243",
  "member243",
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
    userId: "user-president-243",
    roleKey: "president243",
    email: demoEmail("president.243"),
  },
  {
    userId: "user-steward-243",
    roleKey: "steward243",
    email: demoEmail("steward.243"),
  },
  {
    userId: "user-steward-243-pt",
    roleKey: "stewardPt243",
    email: demoEmail("steward-pt.243"),
  },
  {
    userId: "user-eerc-145",
    roleKey: "jointLead145",
    email: demoEmail("eerc.145"),
  },
  {
    userId: "user-division-admin",
    roleKey: "divisionAdmin",
    email: demoEmail("caat-admin"),
  },
  {
    userId: "user-president-415",
    roleKey: "president415",
    email: demoEmail("president.415"),
  },
  {
    userId: "user-president-560",
    roleKey: "president560",
    email: demoEmail("president.560"),
  },
  {
    userId: "user-stability-243",
    roleKey: "stability243",
    email: demoEmail("stability.243"),
  },
  {
    userId: "user-member-243",
    roleKey: "member243",
    email: demoEmail("member.243"),
  },
  {
    userId: "user-solo",
    roleKey: "solo",
    email: demoEmail("solo"),
  },
];
