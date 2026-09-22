/**
 * Demo Hub roster — Behind 7 Proxies (B7P).
 * Meme locals (777 / 404 / 502 / 1337) avoid IRL OPSEU/CAAT number collisions.
 * Passwords are bcrypt hashes only (SEC-007).
 */
import type { DemoUser } from "@/types/auth";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import { demoEmail } from "@/lib/auth/demo-login-accounts";
import { verifyPassword } from "@/lib/auth/password";

export {
  DEMO_EMAIL_DOMAIN,
  demoEmail,
} from "@/lib/auth/demo-login-accounts";

/**
 * bcrypt hash of plaintext `demo123` (cost 10).
 * Used only when demo auth is enabled — never compare plaintext in authorize().
 */
export const DEMO_PASSWORD_HASH =
  "$2b$10$f09Lh9HIYNa/jyqKg1XVku27IJ4amiXw/ypJeL2SATVlXpn0l3jTW";

/** Dev/demo roster — passwords are bcrypt hashes only (SEC-007). */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "user-president-7",
    email: demoEmail("president.7"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 777 President",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-7",
    bargainingUnitId: "bu-7-ft",
    accessibleLocalIds: ["local-7"],
    roles: ["local_president"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-steward-7",
    email: demoEmail("steward.7"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 777 Steward (FT)",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-7",
    bargainingUnitId: "bu-7-ft",
    accessibleLocalIds: ["local-7"],
    roles: ["local_steward"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-steward-7-pt",
    email: demoEmail("steward-pt.7"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 777 Steward (PT)",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-7",
    bargainingUnitId: "bu-7-pt",
    accessibleLocalIds: ["local-7"],
    roles: ["local_steward"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-division-admin",
    email: demoEmail("b7p-admin"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "B7P Division Admin",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-7",
    bargainingUnitId: "bu-7-ft",
    accessibleLocalIds: ["local-7", "local-404", "local-502", "local-1337"],
    roles: ["division_admin"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-joint-404",
    email: demoEmail("joint.404"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 404 joint-committee lead",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-404",
    bargainingUnitId: "bu-404-pt",
    accessibleLocalIds: ["local-404"],
    roles: ["local_president"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-president-502",
    email: demoEmail("president.502"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 502 President",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-502",
    bargainingUnitId: "bu-502-ft",
    accessibleLocalIds: ["local-502"],
    roles: ["local_president"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-president-1337",
    email: demoEmail("president.1337"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 1337 President",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-1337",
    bargainingUnitId: "bu-1337-ft",
    accessibleLocalIds: ["local-1337"],
    roles: ["local_president"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-stability-7",
    email: demoEmail("stability.7"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Stability Committee Rep",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-7",
    accessibleLocalIds: ["local-7"],
    roles: ["stability_member"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-member-7",
    email: demoEmail("member.7"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 777 Member",
    unionId: "union-b7p",
    divisionId: "division-b7p",
    localId: "local-7",
    bargainingUnitId: "bu-7-ft",
    accessibleLocalIds: ["local-7"],
    roles: ["local_member"],
    requiresMfa: false,
  },
  {
    id: "user-solo",
    email: demoEmail("solo"),
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Solo Steward",
    roles: ["solo_account"],
    requiresMfa: false,
  },
];

export async function findDemoUser(
  email: string,
  password: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<DemoUser | null> {
  if (!isDemoAuthEnabled(env)) return null;
  const user = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user) return null;
  const ok = await verifyPassword(password.toLowerCase(), user.passwordHash);
  return ok ? user : null;
}
