import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestSubscription, requireSiteAdmin } = vi.hoisted(() => ({
  requestSubscription: vi.fn(),
  requireSiteAdmin: vi.fn(),
}));
vi.mock("@/lib/email/product-news-subscriptions", () => ({
  requestProductNewsSubscription: requestSubscription,
}));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: requireSiteAdmin,
}));

import { POST as subscribe } from "@/app/api/product-news/subscribe/route";
import { GET as adminOverview, POST as adminAction } from "@/app/api/site-admin/product-news/route";
import { PRODUCT_NEWS_NOTICE_VERSION } from "./product-news-config";

describe("product-news API boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSiteAdmin.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
    requestSubscription.mockResolvedValue("accepted");
  });

  it("does not accept an unchecked or stale public consent notice", async () => {
    for (const body of [
      { email: "reader@example.org", locale: "en", consent: false, noticeVersion: PRODUCT_NEWS_NOTICE_VERSION },
      { email: "reader@example.org", locale: "en", consent: true, noticeVersion: "old-notice" },
    ]) {
      const response = await subscribe(new Request("https://unionops.org/api/product-news/subscribe", {
        method: "POST", body: JSON.stringify(body),
      }));
      expect(response.status).toBe(400);
    }
    expect(requestSubscription).not.toHaveBeenCalled();
  });

  it("passes only the public-form source after explicit consent", async () => {
    const response = await subscribe(new Request("https://unionops.org/api/product-news/subscribe", {
      method: "POST", body: JSON.stringify({
        email: "reader@example.org", locale: "fr", consent: true, noticeVersion: PRODUCT_NEWS_NOTICE_VERSION,
      }),
    }));
    expect(response.status).toBe(200);
    expect(requestSubscription).toHaveBeenCalledWith(expect.objectContaining({
      email: "reader@example.org", locale: "fr", source: "public_form",
    }));
  });

  it("rejects direct site-admin reads and releases without an authorized MFA session", async () => {
    const overview = await adminOverview();
    expect(overview.status).toBe(403);
    const release = await adminAction(new Request("https://unionops.org/api/site-admin/product-news", {
      method: "POST", body: JSON.stringify({ action: "release", campaignId: crypto.randomUUID() }),
    }));
    expect(release.status).toBe(403);
  });
});
