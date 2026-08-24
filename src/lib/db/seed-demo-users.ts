/**
 * Upsert DEMO_USERS into Postgres so durable hosts match the login demo hint
 * (president.243@unionops.test / demo123, etc.). Skip with SEED_DEMO_USERS=false.
 */
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { upsertPostgresUser } from "@/lib/auth/invite-postgres";
import type { UserRole } from "@/types/tenant";

/** Plaintext shared by the demo roster — same as login page hint. */
export const DEMO_ROSTER_PASSWORD = "demo123";

export function shouldSeedDemoUsers(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flag = env.SEED_DEMO_USERS?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export async function seedDemoUsersToPostgres(): Promise<{
  upserted: number;
}> {
  let upserted = 0;
  for (const user of DEMO_USERS) {
    await upsertPostgresUser({
      email: user.email,
      name: user.name,
      password: DEMO_ROSTER_PASSWORD,
      unionId: user.unionId,
      divisionId: user.divisionId,
      localId: user.localId,
      bargainingUnitId: user.bargainingUnitId,
      accessibleLocalIds: user.accessibleLocalIds,
      roles: user.roles as UserRole[],
      totpSecret: user.totpSecret ?? null,
      mfaEnabled: Boolean(user.totpSecret),
    });
    upserted += 1;
  }
  return { upserted };
}
