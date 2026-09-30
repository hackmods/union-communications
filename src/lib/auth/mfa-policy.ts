/**
 * MFA verification policy (SEC-002 / Phase 7 close-out).
 *
 * General switch: AUTH_MFA_ENABLED (default **off** for demo/usability).
 * UNIONOPS_HOSTED_CUSTOMER_MODE overrides it and requires production TOTP for
 * privileged roles/capabilities.
 * When enabled:
 * - production requires AUTH_MFA_MODE=totp unless AUTH_ALLOW_SHARED_MFA_IN_PROD
 * - non-production defaults to shared_code_insecure for local/CI
 */

import type { MfaClientCode } from "@/lib/auth/mfa-client-codes";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
import {
  hostedCustomerProfileEnabled,
  sessionRequiresMfa,
} from "@/lib/auth/mfa-requirements";
import { matchTotpCounter } from "@/lib/auth/totp";
import { consumeTotpCounterForUser } from "@/lib/auth/mfa-totp-counters";
import { reserveMfaVerificationAttempt } from "@/lib/auth/mfa-attempt-limits";

export type MfaMode = "shared_code_insecure" | "totp";

/** Explicit profile for UnionOps-operated customer instances. */
export function isHostedCustomerMode(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return hostedCustomerProfileEnabled(env);
}

export type MfaPolicyResult =
  | { ok: true; mode: MfaMode }
  | {
      ok: false;
      status: 400 | 429 | 503;
      error: string;
      code: MfaClientCode;
      retryAfterSeconds?: number;
    };

/**
 * Hosted customer mode enables the TOTP policy. Protected access is required
 * for users whose account or current hosted role has privileged capabilities.
 * Outside that profile, AUTH_MFA_ENABLED retains the existing host-level policy.
 */
export function isMfaEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (isHostedCustomerMode(env)) return true;
  const raw = env.AUTH_MFA_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Whether the session may access MFA-gated Hub surfaces. Basic local members
 * can use non-privileged surfaces in hosted mode without forced enrollment.
 */
export function sessionMfaOk(
  session: {
    user?: {
      mfaVerified?: boolean | null;
      mfaRequired?: boolean | null;
      roles?: readonly string[] | null;
    };
  } | null | undefined,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (!sessionRequiresMfa(session?.user, isMfaEnabled(env), isHostedCustomerMode(env))) {
    return true;
  }
  return Boolean(session?.user?.mfaVerified);
}

export function resolveMfaMode(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): MfaMode | null {
  if (!isMfaEnabled(env)) return null;
  const raw = env.AUTH_MFA_MODE?.trim().toLowerCase();
  if (isHostedCustomerMode(env)) {
    // The hosted customer profile fails closed: no development shared code or
    // production break-glass can weaken the required per-user TOTP factor.
    return env.NODE_ENV === "production" && raw === "totp" ? "totp" : null;
  }
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
    !isHostedCustomerMode(env) &&
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
  /** Used when a caller has already reserved an attempt before checking a recovery code. */
  attemptAlreadyReserved?: boolean;
}): Promise<MfaPolicyResult> {
  const env = input.env ?? process.env;

  const code = input.code.trim();
  if (!code) {
    return {
      ok: false,
      status: 400,
      error: "Enter a verification code.",
      code: "empty",
    };
  }

  if (!isMfaEnabled(env)) {
    return {
      ok: false,
      status: 503,
      error:
        "MFA is disabled on this host. Set AUTH_MFA_ENABLED=true to require a second factor.",
      code: "storage_unavailable",
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
      code: "storage_unavailable",
    };
  }

  if (!input.attemptAlreadyReserved) {
    try {
      const attempt = await reserveMfaVerificationAttempt(input.userId, Date.now(), env);
      if (!attempt.allowed) {
        return {
          ok: false,
          status: 429,
          error: "Too many verification attempts. Try again after the limit resets.",
          code: "limited",
          retryAfterSeconds: attempt.retryAfterSeconds,
        };
      }
    } catch (error) {
      console.error("[auth] MFA verification safeguards unavailable", {
        userId: input.userId,
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        ok: false,
        status: 503,
        error: "MFA verification safeguards are unavailable.",
        code: "storage_unavailable",
      };
    }
  }

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, error: "Invalid code", code: "invalid" };
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
        code: "storage_unavailable",
      };
    }
    if (code !== expected) {
      return { ok: false, status: 400, error: "Invalid code", code: "invalid" };
    }
    return { ok: true, mode };
  }

  const secret = await getTotpSecretForUser(input.userId);
  if (!secret) {
    return {
      ok: false,
      status: 503,
      error: "TOTP is not enrolled for this account.",
      code: "not_enrolled",
    };
  }
  const counter = matchTotpCounter(secret, code);
  if (counter === null) {
    return { ok: false, status: 400, error: "Invalid code", code: "invalid" };
  }
  try {
    if (!(await consumeTotpCounterForUser(input.userId, counter, env as NodeJS.ProcessEnv))) {
      return {
        ok: false,
        status: 400,
        error: "That code was already used.",
        code: "replayed",
      };
    }
  } catch (error) {
    console.error("[auth] TOTP replay protection unavailable", {
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      status: 503,
      error: "TOTP replay protection is unavailable.",
      code: "storage_unavailable",
    };
  }
  return { ok: true, mode };
}

/** Whether the user must enroll TOTP before verifying (MFA on, mode=totp, no secret). */
export async function needsTotpEnrollment(
  userId: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  required = true,
): Promise<boolean> {
  if (!isMfaEnabled(env) || !required) return false;
  return resolveMfaMode(env) === "totp" && !(await getTotpSecretForUser(userId));
}
