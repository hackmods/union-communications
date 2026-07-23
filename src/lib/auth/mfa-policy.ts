/**
 * MFA verification policy (SEC-002).
 * - production: AUTH_MFA_MODE required; shared_code needs AUTH_MFA_CODE (no silent 000000)
 * - non-production: defaults to shared_code_insecure for demos/CI
 */

import { DEMO_USERS } from "@/lib/auth/demo-users";
import { verifyTotp } from "@/lib/auth/totp";

export type MfaMode = "shared_code_insecure" | "totp";

export type MfaPolicyResult =
  | { ok: true; mode: MfaMode }
  | { ok: false; status: 400 | 503; error: string };

export function resolveMfaMode(
  env: NodeJS.ProcessEnv = process.env,
): MfaMode | null {
  const raw = env.AUTH_MFA_MODE?.trim().toLowerCase();
  if (raw === "shared_code_insecure" || raw === "totp") return raw;
  if (raw) return null;
  if (env.NODE_ENV === "production") return null;
  return "shared_code_insecure";
}

function expectedSharedCode(env: NodeJS.ProcessEnv): string | null {
  const productionCode = env.AUTH_MFA_CODE?.trim();
  if (productionCode) return productionCode;
  if (env.NODE_ENV === "production") return null;
  return env.AUTH_DEV_MFA_CODE?.trim() || "000000";
}

export function verifyMfaCode(input: {
  userId: string;
  code: string;
  env?: NodeJS.ProcessEnv;
}): MfaPolicyResult {
  const env = input.env ?? process.env;
  const mode = resolveMfaMode(env);

  if (!mode) {
    return {
      ok: false,
      status: 503,
      error:
        "MFA is not configured. Set AUTH_MFA_MODE=totp or AUTH_MFA_MODE=shared_code_insecure (demo hosts only).",
    };
  }

  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, error: "Invalid code" };
  }

  if (mode === "shared_code_insecure") {
    if (env.NODE_ENV === "production") {
      console.warn(
        "[auth] AUTH_MFA_MODE=shared_code_insecure is insecure — use totp for real member casework.",
      );
    }
    const expected = expectedSharedCode(env);
    if (!expected) {
      return {
        ok: false,
        status: 503,
        error:
          "AUTH_MFA_CODE is required in production when AUTH_MFA_MODE=shared_code_insecure.",
      };
    }
    if (code !== expected) {
      return { ok: false, status: 400, error: "Invalid code" };
    }
    return { ok: true, mode };
  }

  const user = DEMO_USERS.find((u) => u.id === input.userId);
  const secret = user?.totpSecret;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "TOTP is not enrolled for this account.",
    };
  }
  if (!verifyTotp(secret, code)) {
    return { ok: false, status: 400, error: "Invalid code" };
  }
  return { ok: true, mode };
}
