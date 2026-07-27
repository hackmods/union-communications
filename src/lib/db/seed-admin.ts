/**
 * Bootstrap the first durable Hub admin when AUTH_USERS_BACKEND=postgres.
 *
 * Usage (owner URL recommended):
 *   DATABASE_URL=postgres://unionops:…@localhost:5432/unionops npm run db:seed-admin -- \
 *     --email president@example.ca \
 *     --name "Local President" \
 *     --password 'change-me-8+' \
 *     --union-id union-opseu \
 *     --local-id local-243 \
 *     --roles local_president,union_admin
 *
 * Run `npm run db:seed` first so union/local FKs exist.
 * Safe to re-run — upserts by email.
 */
import { isPostgresConfigured, resetDbClient } from "@/lib/db/client";
import { seedReferenceTenant } from "@/lib/db/seed";
import { upsertPostgresUser } from "@/lib/auth/invite-postgres";
import type { UserRole } from "@/types/tenant";

const VALID_ROLES = new Set<UserRole>([
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
  "local_steward",
  "stability_member",
  "solo_account",
]);

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required");
  }

  const email = readArg("--email");
  const name = readArg("--name");
  const password = readArg("--password");
  const unionId = readArg("--union-id");
  const localId = readArg("--local-id");
  const divisionId = readArg("--division-id");
  const bargainingUnitId = readArg("--bargaining-unit-id");
  const rolesRaw = readArg("--roles") ?? "local_president";

  if (!email || !name || !password || !unionId) {
    throw new Error(
      "Required: --email --name --password --union-id (optional: --local-id --division-id --bargaining-unit-id --roles)",
    );
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const roles = rolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean) as UserRole[];
  if (roles.length === 0 || roles.some((r) => !VALID_ROLES.has(r))) {
    throw new Error(`Invalid --roles. Allowed: ${[...VALID_ROLES].join(", ")}`);
  }

  await seedReferenceTenant();

  const result = await upsertPostgresUser({
    email,
    name,
    password,
    unionId,
    localId,
    divisionId,
    bargainingUnitId,
    roles,
  });

  resetDbClient();
  console.log(
    `[db:seed-admin] ${result.created ? "created" : "updated"} user ${result.id} (${email}) roles=${roles.join(",")}`,
  );
}

main().catch((err) => {
  console.error("[db:seed-admin] failed:", err);
  process.exitCode = 1;
});
