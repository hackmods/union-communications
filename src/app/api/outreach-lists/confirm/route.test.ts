import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/outreach-confirm", () => ({
  verifyOutreachConfirmToken: vi.fn(),
  confirmOutreachListFromTokenHash: vi.fn(),
}));
vi.mock("@/lib/email/outreach-config", () => ({
  readOutreachListsConfig: vi.fn(() => ({
    enabled: true,
    tokenKeys: ["x".repeat(32)],
  })),
}));

import {
  confirmOutreachListFromTokenHash,
  verifyOutreachConfirmToken,
} from "@/lib/email/outreach-confirm";
import { GET } from "@/app/api/outreach-lists/confirm/route";

describe("/api/outreach-lists/confirm", () => {
  it("returns 400 for invalid token", async () => {
    vi.mocked(verifyOutreachConfirmToken).mockReturnValue(null);
    const response = await GET(
      new Request("https://unionops.org/api/outreach-lists/confirm?token=bad"),
    );
    expect(response.status).toBe(400);
    expect(confirmOutreachListFromTokenHash).not.toHaveBeenCalled();
  });

  it("confirms when token hash consumes", async () => {
    vi.mocked(verifyOutreachConfirmToken).mockReturnValue("a".repeat(64));
    vi.mocked(confirmOutreachListFromTokenHash).mockResolvedValue(true);
    const response = await GET(
      new Request("https://unionops.org/api/outreach-lists/confirm?token=good.token"),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, confirmed: true });
  });
});
