import type { DemoUser } from "@/types/auth";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import { verifyPassword } from "@/lib/auth/password";

/**
 * bcrypt hash of plaintext `demo123` (cost 10).
 * Used only when demo auth is enabled — never compare plaintext in authorize().
 */
export const DEMO_PASSWORD_HASH =
  "$2b$10$f09Lh9HIYNa/jyqKg1XVku27IJ4amiXw/ypJeL2SATVlXpn0l3jTW";

/** Dev/demo roster — passwords are bcrypt hashes only (SEC-007). */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "user-president-243",
    email: "president@local243.ca",
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 243 President",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243"],
    roles: ["local_president"],
    requiresMfa: true,
    // Demo TOTP secret (AUTH_MFA_MODE=totp). Shared-code mode is the default for demos.
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-steward-243",
    email: "steward@local243.ca",
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 243 Steward (FT)",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243"],
    roles: ["local_steward"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-steward-243-pt",
    email: "steward-pt@local243.ca",
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Local 243 Steward (PT)",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-pt",
    accessibleLocalIds: ["local-243"],
    roles: ["local_steward"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-division-admin",
    email: "caat-admin@opseu.org",
    passwordHash: DEMO_PASSWORD_HASH,
    name: "CAAT Division Admin",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243", "local-560"],
    roles: ["division_admin"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-stability-243",
    email: "stability@local243.ca",
    passwordHash: DEMO_PASSWORD_HASH,
    name: "Stability Committee Rep",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    accessibleLocalIds: ["local-243"],
    roles: ["stability_member"],
    requiresMfa: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "user-solo",
    email: "solo@example.ca",
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
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}
