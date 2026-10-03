import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { locals } from "@/lib/db/schema/tenant";
import { accountRequiresMfa } from "@/lib/auth/mfa-requirements";

/** True when the Local has opted into officer MFA. Missing Local → false. */
export async function localMfaRequired(
  localId: string | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (!localId?.trim()) return false;
  if (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() !== "postgres" ||
    !isPostgresConfigured(env as NodeJS.ProcessEnv)
  ) {
    return false;
  }
  try {
    const [row] = await getDb()
      .select({ mfaRequired: locals.mfaRequired })
      .from(locals)
      .where(eq(locals.id, localId))
      .limit(1);
    return Boolean(row?.mfaRequired);
  } catch {
    return false;
  }
}

/** Login/JWT MFA flag: host operators always, Local officers only after opt-in or enroll. */
export async function accountRequiresMfaForLocal(input: {
  email?: string | null;
  roles: readonly string[];
  localId?: string | null;
  explicitMfaEnabled: boolean;
  legacyRequiresMfa: boolean;
  hostedCustomerMode: boolean;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<boolean> {
  return accountRequiresMfa({
    email: input.email,
    roles: input.roles,
    explicitMfaEnabled: input.explicitMfaEnabled,
    legacyRequiresMfa: input.legacyRequiresMfa,
    hostedCustomerMode: input.hostedCustomerMode,
    localMfaRequired: await localMfaRequired(input.localId, input.env),
    env: input.env,
  });
}
