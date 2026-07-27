/**
 * Bootstrap steward platform admin (ryan@ryanmorris.ca by default).
 * Password: SEED_PLATFORM_ADMIN_PASSWORD, else auto-generated.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { upsertPostgresUser } from "@/lib/auth/invite-postgres";
import type { UserRole } from "@/types/tenant";

const DEFAULT_EMAIL = "ryan@ryanmorris.ca";
const DEFAULT_NAME = "Ryan Morris";
const DEFAULT_UNION = "union-opseu";
const DEFAULT_LOCAL = "local-243";
const DEFAULT_DIVISION = "division-caat";
const DEFAULT_ROLES: UserRole[] = ["platform_admin", "union_admin"];

export type SeedPlatformAdminResult = {
  email: string;
  id: string;
  created: boolean;
  passwordGenerated: boolean;
  password?: string;
};

export function shouldSeedPlatformAdmin(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flag = env.SEED_PLATFORM_ADMIN?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export async function seedPlatformAdmin(
  env: NodeJS.ProcessEnv = process.env,
): Promise<SeedPlatformAdminResult | null> {
  if (!shouldSeedPlatformAdmin(env)) return null;

  const email = (
    env.SEED_PLATFORM_ADMIN_EMAIL?.trim() || DEFAULT_EMAIL
  ).toLowerCase();
  const name = env.SEED_PLATFORM_ADMIN_NAME?.trim() || DEFAULT_NAME;
  const unionId = env.SEED_PLATFORM_ADMIN_UNION_ID?.trim() || DEFAULT_UNION;
  const localId = env.SEED_PLATFORM_ADMIN_LOCAL_ID?.trim() || DEFAULT_LOCAL;
  const divisionId =
    env.SEED_PLATFORM_ADMIN_DIVISION_ID?.trim() || DEFAULT_DIVISION;

  let password = env.SEED_PLATFORM_ADMIN_PASSWORD?.trim();
  let passwordGenerated = false;
  if (!password || password.length < 8) {
    password = randomBytes(12).toString("base64url").slice(0, 16);
    passwordGenerated = true;
  }

  const result = await upsertPostgresUser({
    email,
    name,
    password,
    unionId,
    localId,
    divisionId,
    accessibleLocalIds: [localId],
    roles: DEFAULT_ROLES,
  });

  const out: SeedPlatformAdminResult = {
    email,
    id: result.id,
    created: result.created,
    passwordGenerated,
  };
  if (passwordGenerated) {
    out.password = password;
    const bootstrapPath = env.SEED_PLATFORM_ADMIN_BOOTSTRAP_FILE?.trim();
    if (bootstrapPath) {
      writeFileSync(
        bootstrapPath,
        `email=${email}\npassword=${password}\n`,
        { mode: 0o600 },
      );
    }
  }
  return out;
}
