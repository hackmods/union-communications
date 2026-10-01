import {
  isHostedCustomerMode,
  resolveMfaMode,
  verifyMfaCode,
} from "@/lib/auth/mfa-policy";
import { isMfaOperatorBypassEmail } from "@/lib/auth/mfa-operator-bypass";
import { loadAuthAccountById } from "@/lib/auth/sign-inable-account";
import { auditLog } from "@/lib/audit/store";
import { mfaErrorMetadata } from "@/lib/auth/mfa-durable-fallback-signal";

export type FreshMfaStepUpFailure = {
  ok: false;
  status: 400 | 428 | 429 | 503;
  code: "required" | "failed" | "limited" | "unavailable";
  outcome: "denied" | "error";
  retryAfterSeconds?: number;
};

export type FreshMfaStepUpResult =
  | { ok: true; required: boolean; bypassed?: boolean }
  | FreshMfaStepUpFailure;

/** Verify a fresh challenge before a privileged mutation; never returns the code. */
export async function verifyFreshMfaStepUp(input: {
  userId: string;
  code?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<FreshMfaStepUpResult> {
  const env = input.env ?? process.env;
  const mode = resolveMfaMode(env);
  if (isHostedCustomerMode(env) && mode !== "totp") {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      outcome: "error",
    };
  }

  if (mode === null) return { ok: true, required: false };

  try {
    const account = await loadAuthAccountById(input.userId);
    if (isMfaOperatorBypassEmail(account?.email, env)) {
      console.warn("[auth] MFA operator bypass used", { userId: input.userId });
      try {
        await auditLog.log({
          userId: input.userId,
          action: "auth.mfa_operator_bypass",
          resourceType: "session",
          resourceId: input.userId,
          outcome: "success",
          metadata: { gate: "fresh_step_up" },
        });
      } catch (error) {
        console.error("[auth] MFA operator bypass audit failed", {
          userId: input.userId,
          ...mfaErrorMetadata(error),
        });
      }
      return { ok: true, required: false, bypassed: true };
    }
  } catch (error) {
    console.error("[auth] MFA operator bypass account lookup failed", {
      userId: input.userId,
      ...mfaErrorMetadata(error),
    });
    // Fail closed into normal step-up rather than granting a silent bypass.
  }

  if (!input.code?.trim()) {
    return {
      ok: false,
      status: 428,
      code: "required",
      outcome: "denied",
    };
  }

  try {
    const result = await verifyMfaCode({
      userId: input.userId,
      code: input.code,
      env,
    });
    if (result.ok) return { ok: true, required: true };
    if (result.status === 503) {
      return {
        ok: false,
        status: 503,
        code: "unavailable",
        outcome: "error",
      };
    }
    if (result.status === 429) {
      return {
        ok: false,
        status: 429,
        code: "limited",
        outcome: "denied",
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
    return {
      ok: false,
      status: 400,
      code: "failed",
      outcome: "denied",
    };
  } catch {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      outcome: "error",
    };
  }
}
