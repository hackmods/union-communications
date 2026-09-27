import { beforeEach, describe, expect, it, vi } from "vitest";

const { hostedModeMock, modeMock, verifyMock } = vi.hoisted(() => ({
  hostedModeMock: vi.fn(),
  modeMock: vi.fn(),
  verifyMock: vi.fn(),
}));

vi.mock("@/lib/auth/mfa-policy", () => ({
  isHostedCustomerMode: hostedModeMock,
  resolveMfaMode: modeMock,
  verifyMfaCode: verifyMock,
}));

import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";

describe("verifyFreshMfaStepUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hostedModeMock.mockReturnValue(false);
    modeMock.mockReturnValue("totp");
    verifyMock.mockResolvedValue({ ok: true, mode: "totp" });
  });

  it("keeps non-hosted MFA-off deployments compatible", async () => {
    modeMock.mockReturnValue(null);

    await expect(verifyFreshMfaStepUp({ userId: "actor-1" })).resolves.toEqual({
      ok: true,
      required: false,
    });
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("fails closed when the hosted profile cannot resolve production TOTP", async () => {
    hostedModeMock.mockReturnValue(true);
    modeMock.mockReturnValue(null);

    await expect(verifyFreshMfaStepUp({ userId: "actor-1" })).resolves.toMatchObject({
      ok: false,
      status: 503,
      code: "unavailable",
      outcome: "error",
    });
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("requires a challenge before a privileged write", async () => {
    await expect(verifyFreshMfaStepUp({ userId: "actor-1" })).resolves.toMatchObject({
      ok: false,
      status: 428,
      code: "required",
      outcome: "denied",
    });
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("verifies the supplied code and returns no code material", async () => {
    await expect(
      verifyFreshMfaStepUp({ userId: "actor-1", code: "123456" }),
    ).resolves.toEqual({ ok: true, required: true });
    expect(verifyMock).toHaveBeenCalledWith({ userId: "actor-1", code: "123456" });
  });

  it.each([
    [{ ok: false, status: 400, error: "Invalid code" }, 400, "failed", "denied"],
    [{ ok: false, status: 429, error: "Limited", retryAfterSeconds: 60 }, 429, "limited", "denied"],
    [{ ok: false, status: 503, error: "Unavailable" }, 503, "unavailable", "error"],
  ])("maps verifier failures without exposing verifier details", async (mockResult, status, code, outcome) => {
    verifyMock.mockResolvedValue(mockResult);

    await expect(
      verifyFreshMfaStepUp({ userId: "actor-1", code: "123456" }),
    ).resolves.toMatchObject({ ok: false, status, code, outcome });
  });

  it("maps thrown verifier errors to a fail-closed result", async () => {
    verifyMock.mockRejectedValue(new Error("database details"));

    await expect(
      verifyFreshMfaStepUp({ userId: "actor-1", code: "123456" }),
    ).resolves.toMatchObject({
      ok: false,
      status: 503,
      code: "unavailable",
      outcome: "error",
    });
  });
});
