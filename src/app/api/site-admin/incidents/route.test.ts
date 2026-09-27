import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeIncidentAdmin: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/site-admin/incident-http", () => ({
  authorizeIncidentAdmin: mocks.authorizeIncidentAdmin,
  consumeIncidentStepUp: vi.fn(),
  noStoreJson: (data: unknown, init?: ResponseInit) => Response.json(data, init),
  recordIncidentAction: vi.fn(),
  requestId: () => "9d15d931-3e2a-47e8-8dd5-b6417a2e8702",
}));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/rls-context", () => ({ withRlsContext: vi.fn() }));

import { GET } from "@/app/api/site-admin/incidents/route";

describe("site-admin incident API boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects direct API access before any data query when the site-admin gate fails", async () => {
    mocks.authorizeIncidentAdmin.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const response = await GET(new Request("https://unionops.example/api/site-admin/incidents"));
    expect(response.status).toBe(403);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
