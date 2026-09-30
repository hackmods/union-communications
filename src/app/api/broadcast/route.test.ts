import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/mfa-policy", () => ({
  sessionMfaOk: vi.fn(() => true),
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: vi.fn(),
}));
vi.mock("@/lib/email/member-broadcast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/member-broadcast")>();
  return {
    ...actual,
    listBroadcastRoster: vi.fn(),
    listBroadcastCampaigns: vi.fn(),
    sendMemberBroadcast: vi.fn(),
    setOwnBroadcastConsent: vi.fn(),
  };
});
vi.mock("@/lib/audit/store", () => ({
  auditLog: { log: vi.fn(async () => undefined) },
}));
vi.mock("@/lib/email/send", () => ({
  readSmtpEnv: vi.fn(() => ({ value: "noreply@example.com" })),
}));

import { auth } from "@/auth";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import {
  listBroadcastCampaigns,
  listBroadcastRoster,
  sendMemberBroadcast,
} from "@/lib/email/member-broadcast";
import { GET, POST } from "@/app/api/broadcast/route";

const mocks = {
  auth: vi.mocked(auth),
  verifyFreshMfaStepUp: vi.mocked(verifyFreshMfaStepUp),
  listBroadcastRoster: vi.mocked(listBroadcastRoster),
  listBroadcastCampaigns: vi.mocked(listBroadcastCampaigns),
  sendMemberBroadcast: vi.mocked(sendMemberBroadcast),
};

describe("/api/broadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: "officer-1",
        unionId: "union-1",
        localId: "local-1",
        email: "officer@example.com",
        roles: ["local_president"],
      },
    } as never);
    mocks.listBroadcastRoster.mockResolvedValue([]);
    mocks.listBroadcastCampaigns.mockResolvedValue([]);
    mocks.verifyFreshMfaStepUp.mockResolvedValue({ ok: true, required: false });
    mocks.sendMemberBroadcast.mockResolvedValue({
      ok: true,
      campaignId: "campaign-1",
      accepted: 1,
      failed: 0,
      recipientCount: 1,
      trackingApplied: false,
    });
  });

  it("returns campaigns for officers", async () => {
    mocks.listBroadcastCampaigns.mockResolvedValue([
      {
        id: "c-1",
        subject: "Hello",
        recipientCount: 2,
        acceptedCount: 2,
        failedCount: 0,
        createdAt: "2026-09-30T12:00:00.000Z",
        openTrackingApplied: false,
      },
    ]);
    const response = await GET();
    const body = await response.json();
    expect(body.campaigns).toHaveLength(1);
    expect(body.mode).toBe("officer");
  });

  it("requires fresh MFA before send", async () => {
    mocks.verifyFreshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 428,
      code: "required",
      outcome: "denied",
    });
    const response = await POST(
      new Request("https://unionops.org/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          subject: "Hi",
          body: "News",
          recipientUserIds: ["user-1"],
        }),
      }),
    );
    expect(response.status).toBe(428);
    expect(mocks.sendMemberBroadcast).not.toHaveBeenCalled();
  });

  it("returns dry-run counts without MFA", async () => {
    mocks.sendMemberBroadcast.mockResolvedValue({
      ok: true,
      dryRun: true,
      recipientCount: 2,
      accepted: 0,
      failed: 0,
      trackingApplied: false,
    });
    const response = await POST(
      new Request("https://unionops.org/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          subject: "Hi",
          body: "News",
          recipientUserIds: ["user-1", "user-2"],
          dryRun: true,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.verifyFreshMfaStepUp).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ dryRun: true, recipientCount: 2 }),
    );
  });

  it("rejects more than fifty recipients before send", async () => {
    const response = await POST(
      new Request("https://unionops.org/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          subject: "Hi",
          body: "News",
          recipientUserIds: Array.from({ length: 51 }, (_, i) => `user-${i}`),
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.sendMemberBroadcast).not.toHaveBeenCalled();
  });
});
