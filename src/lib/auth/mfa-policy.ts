/**
 * MFA verification policy (SEC-002 / Phase 7 close-out).
 *
 * Master switch: AUTH_MFA_ENABLED (default **off** for demo/usability).
 * When enabled:
 * - production requires AUTH_MFA_MODE=totp unless AUTH_ALLOW_SHARED_MFA_IN_PROD
 * - non-production defaults to shared_code_insecure for local/CI
 */

import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
import { verifyTotp } from "@/lib/auth/totp";

export type MfaMode = "shared_code_insecure" | "totp";

export type MfaPolicyResult =
  | { ok: true; mode: MfaMode }
  | { ok: false; status: 400 | 503; error: string };

/**
 * MFA is opt-in. Unset / false → Hub works after password login (demo-friendly).
 * Set AUTH_MFA_ENABLED=true for real casework hosts.
 */
export function isMfaEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.AUTH_MFA_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Whether the session may access MFA-gated Hub surfaces.
 * When MFA is disabled for the host, always true (no second factor required).
 */
export function sessionMfaOk(
  session: { user?: { mfaVerified?: boolean | null } } | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (!isMfaEnabled(env)) return true;
  return Boolean(session?.user?.mfaVerified);
}

export function resolveMfaMode(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): MfaMode | null {
  if (!isMfaEnabled(env)) return null;
  const raw = env.AUTH_MFA_MODE?.trim().toLowerCase();
  if (raw === "totp") return "totp";
  if (raw === "shared_code_insecure") {
    if (env.NODE_ENV === "production") {
      if (env.AUTH_ALLOW_SHARED_MFA_IN_PROD === "true") {
        return "shared_code_insecure";
      }
      return null;
    }
    return "shared_code_insecure";
  }
  if (raw) return null;
  if (env.NODE_ENV === "production") return null;
  return "shared_code_insecure";
}

/** True when shared-code mode is active only via explicit prod break-glass. */
export function isSharedMfaBreakGlass(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    isMfaEnabled(env) &&
    env.NODE_ENV === "production" &&
    env.AUTH_MFA_MODE?.trim().toLowerCase() === "shared_code_insecure" &&
    env.AUTH_ALLOW_SHARED_MFA_IN_PROD === "true"
  );
}

function expectedSharedCode(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | null {
  const productionCode = env.AUTH_MFA_CODE?.trim();
  if (productionCode) return productionCode;
  if (env.NODE_ENV === "production") return null;
  return env.AUTH_DEV_MFA_CODE?.trim() || "000000";
}

export async function verifyMfaCode(input: {
  userId: string;
  code: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<MfaPolicyResult> {
  const env = input.env ?? process.env;

  if (!isMfaEnabled(env)) {
    return {
      ok: false,
      status: 503,
      error:
        "MFA is disabled on this host. Set AUTH_MFA_ENABLED=true to require a second factor.",
    };
  }

  const mode = resolveMfaMode(env);

  if (!mode) {
    const sharedRejected =
      env.NODE_ENV === "production" &&
      env.AUTH_MFA_MODE?.trim().toLowerCase() === "shared_code_insecure" &&
      env.AUTH_ALLOW_SHARED_MFA_IN_PROD !== "true";
    return {
      ok: false,
      status: 503,
      error: sharedRejected
        ? "AUTH_MFA_MODE=shared_code_insecure is not allowed in production. Set AUTH_MFA_MODE=totp, or AUTH_ALLOW_SHARED_MFA_IN_PROD=true for workshop hosts only."
        : "MFA is enabled but not configured. Set AUTH_MFA_MODE=totp (required in production when AUTH_MFA_ENABLED=true).",
    };
  }

  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, error: "Invalid code" };
  }

  if (mode === "shared_code_insecure") {
    if (isSharedMfaBreakGlass(env)) {
      console.warn(
        "[auth] AUTH_ALLOW_SHARED_MFA_IN_PROD=true — shared MFA code is insecure; use totp for real casework.",
      );
    }
    const expected = expectedSharedCode(env);
    if (!expected) {
      return {
        ok: false,
        status: 503,
        error:
          "AUTH_MFA_CODE is required when AUTH_MFA_MODE=shared_code_insecure.",
      };
    }
    if (code !== expected) {
      return { ok: false, status: 400, error: "Invalid code" };
    }
    return { ok: true, mode };
  }

  const secret = await getTotpSecretForUser(input.userId);
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

/** Whether the user must enroll TOTP before verifying (MFA on, mode=totp, no secret). */
export async function needsTotpEnrollment(
  userId: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (!isMfaEnabled(env)) return false;
  return resolveMfaMode(env) === "totp" && !(await getTotpSecretForUser(userId));
}
