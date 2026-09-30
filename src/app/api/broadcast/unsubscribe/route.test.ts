import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/member-broadcast-unsubscribe", () => ({
  unsubscribeMemberBroadcast: vi.fn(),
}));

import { unsubscribeMemberBroadcast } from "@/lib/email/member-broadcast-unsubscribe";
import { GET, POST } from "@/app/api/broadcast/unsubscribe/route";

describe("/api/broadcast/unsubscribe", () => {
  it("revokes consent from a signed token query", async () => {
    vi.mocked(unsubscribeMemberBroadcast).mockResolvedValue(true);
    const response = await GET(
      new Request("https://unionops.org/api/broadcast/unsubscribe?token=abc.def"),
    );
    expect(response.status).toBe(200);
    expect(unsubscribeMemberBroadcast).toHaveBeenCalledWith("abc.def");
  });

  it("accepts one-click POST bodies", async () => {
    vi.mocked(unsubscribeMemberBroadcast).mockResolvedValue(true);
    const response = await POST(
      new Request("https://unionops.org/api/broadcast/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click&token=signed.token",
      }),
    );
    expect(response.status).toBe(200);
    expect(unsubscribeMemberBroadcast).toHaveBeenCalledWith("signed.token");
  });
});
