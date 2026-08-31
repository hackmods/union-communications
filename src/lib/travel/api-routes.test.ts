import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as getClaim,
  PATCH as patchClaim,
  POST as createClaim,
} from "@/app/api/travel/[id]/claim/route";
import { memoryTravelStore, resetMemoryTravelStore } from "./memory-adapter";
import { resetTravelStore } from "./store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: "Local 243 Steward (FT)",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const lineItems = [
  {
    date: "2026-09-01",
    category: "travel",
    amount: 120,
    description: "Train",
  },
];

async function seedAuthorization(input?: {
  unionId?: string;
  localId?: string;
  requestedById?: string;
  status?: "requested" | "approved";
}) {
  const auth = await memoryTravelStore.createAuthorization(
    {
      purpose: "Convention",
      eventName: "Annual",
      eventStartDate: "2026-09-01",
      eventEndDate: "2026-09-03",
      estimatedCosts: {
        travel: 100,
        lodging: 200,
        meals: 50,
        registration: 75,
        other: 0,
      },
    },
    {
      unionId: input?.unionId ?? "union-opseu",
      localId: input?.localId ?? "local-243",
      requestedById: input?.requestedById ?? "user-steward-243",
      requestedByName: "Local 243 Steward (FT)",
    },
  );
  if (input?.status === "approved") {
    const approved = await memoryTravelStore.approveAuthorization(
      auth.id,
      "user-president-243",
    );
    if (!approved) throw new Error("failed to approve test authorization");
    return approved;
  }
  return auth;
}

describe("travel claim API", () => {
  beforeEach(() => {
    resetMemoryTravelStore();
    resetTravelStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryTravelStore();
    resetTravelStore();
  });

  it("returns 401 without a session and 403 for members", async () => {
    const auth = await seedAuthorization({ status: "approved" });
    authMock.mockResolvedValue(null);
    expect((await getClaim(new Request("http://localhost"), params(auth.id))).status).toBe(
      401,
    );

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    const forbidden = await createClaim(jsonRequest({ lineItems }), params(auth.id));
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for another union, including platform_admin", async () => {
    const foreign = await seedAuthorization({
      unionId: "union-other",
      localId: "local-1",
      requestedById: "user-other",
      status: "approved",
    });
    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const res = await getClaim(new Request("http://localhost"), params(foreign.id));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("requires an approved authorization before a claim can be filed", async () => {
    const requested = await seedAuthorization({ status: "requested" });
    authMock.mockResolvedValue(session());
    const res = await createClaim(jsonRequest({ lineItems }), params(requested.id));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Claims require an approved authorization",
    });
  });

  it("lets a same-local steward view another officer's claim but not create one", async () => {
    const auth = await seedAuthorization({ status: "approved" });
    authMock.mockResolvedValue(
      session({ id: "user-steward-243-pt", roles: ["local_steward"] }),
    );
    const viewed = await getClaim(new Request("http://localhost"), params(auth.id));
    expect(viewed.status).toBe(200);

    const created = await createClaim(jsonRequest({ lineItems }), params(auth.id));
    expect(created.status).toBe(403);
    expect(await created.json()).toEqual({ error: "Forbidden" });
  });

  it("rejects forged tenant keys and empty line items, then stamps the authorization tenant", async () => {
    const auth = await seedAuthorization({ status: "approved" });
    authMock.mockResolvedValue(session());

    const forged = await createClaim(
      jsonRequest({
        lineItems,
        unionId: "union-other",
        localId: "local-evil",
        claimantId: "attacker",
      }),
      params(auth.id),
    );
    expect(forged.status).toBe(400);

    const empty = await createClaim(jsonRequest({ lineItems: [] }), params(auth.id));
    expect(empty.status).toBe(400);

    const created = await createClaim(jsonRequest({ lineItems }), params(auth.id));
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      claim: {
        unionId: string;
        localId: string;
        claimantId: string;
        travelAuthorizationId: string;
        status: string;
      };
    };
    expect(body.claim.unionId).toBe("union-opseu");
    expect(body.claim.localId).toBe("local-243");
    expect(body.claim.claimantId).toBe("user-steward-243");
    expect(body.claim.travelAuthorizationId).toBe(auth.id);
    expect(body.claim.status).toBe("draft");

    const duplicate = await createClaim(jsonRequest({ lineItems }), params(auth.id));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({ error: "Claim already exists" });
  });

  it("lets the claimant patch a draft and forbids another steward", async () => {
    const auth = await seedAuthorization({ status: "approved" });
    authMock.mockResolvedValue(session());
    const created = await createClaim(jsonRequest({ lineItems }), params(auth.id));
    expect(created.status).toBe(201);

    authMock.mockResolvedValue(
      session({ id: "user-steward-243-pt", roles: ["local_steward"] }),
    );
    const forbidden = await patchClaim(
      jsonRequest({
        lineItems: [{ ...lineItems[0], amount: 50, description: "Taxi" }],
      }),
      params(auth.id),
    );
    expect(forbidden.status).toBe(403);

    authMock.mockResolvedValue(session());
    const patched = await patchClaim(
      jsonRequest({
        lineItems: [{ ...lineItems[0], amount: 80, description: "Bus" }],
      }),
      params(auth.id),
    );
    expect(patched.status).toBe(200);
    const body = (await patched.json()) as {
      claim: { lineItems: Array<{ amount: number; description: string }> };
    };
    expect(body.claim.lineItems[0]?.amount).toBe(80);
    expect(body.claim.lineItems[0]?.description).toBe("Bus");
  });
});
