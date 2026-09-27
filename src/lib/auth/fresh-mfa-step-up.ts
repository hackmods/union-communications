import {
  isHostedCustomerMode,
  resolveMfaMode,
  verifyMfaCode,
} from "@/lib/auth/mfa-policy";

export type FreshMfaStepUpFailure = {
  ok: false;
  status: 400 | 428 | 429 | 503;
  code: "required" | "failed" | "limited" | "unavailable";
  outcome: "denied" | "error";
  retryAfterSeconds?: number;
};

export type FreshMfaStepUpResult =
  | { ok: true; required: boolean }
  | FreshMfaStepUpFailure;

/** Verify a fresh challenge before a privileged mutation; never returns the code. */
export async function verifyFreshMfaStepUp(input: {
  userId: string;
  code?: string;
}): Promise<FreshMfaStepUpResult> {
  const mode = resolveMfaMode();
  if (isHostedCustomerMode() && mode !== "totp") {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      outcome: "error",
    };
  }

  if (mode === null) return { ok: true, required: false };
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
