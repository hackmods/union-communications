import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listTravel,
  POST as createAuthorization,
} from "@/app/api/travel/route";
import { POST as approveTravel } from "@/app/api/travel/[id]/approve/route";
import { POST as denyTravel } from "@/app/api/travel/[id]/deny/route";
import { POST as issueAdvance } from "@/app/api/travel/[id]/advance/route";
import { POST as reconcileTravel } from "@/app/api/travel/[id]/reconcile/route";
import {
  GET as getClaim,
  PATCH as patchClaim,
  POST as createClaim,
} from "@/app/api/travel/[id]/claim/route";
import {
  memoryLedgerStore,
  resetLedgerMemoryForTests,
} from "@/lib/ledger/memory-adapter";
import { resetLedgerStore } from "@/lib/ledger/store";
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
    resetLedgerMemoryForTests();
    resetLedgerStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryTravelStore();
    resetTravelStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
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

describe("travel list/create and elevate HTTP routes", () => {
  beforeEach(() => {
    resetMemoryTravelStore();
    resetTravelStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryTravelStore();
    resetTravelStore();
    resetLedgerMemoryForTests();
    resetLedgerStore();
  });

  describe("GET/POST /api/travel", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (await listTravel(new Request("http://localhost/api/travel"))).status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listTravel(
        new Request("http://localhost/api/travel"),
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or sister local for a president", async () => {
      const home = await seedAuthorization();
      const sister = await seedAuthorization({
        localId: "local-560",
        requestedById: "user-560",
      });
      const foreign = await seedAuthorization({
        unionId: "union-other",
        localId: "local-1",
        requestedById: "user-other",
      });

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const res = await listTravel(new Request("http://localhost/api/travel"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        items: Array<{
          authorization: { id: string; unionId: string; localId: string };
        }>;
      };
      const ids = body.items.map((row) => row.authorization.id);
      expect(ids).toContain(home.id);
      expect(ids).not.toContain(sister.id);
      expect(ids).not.toContain(foreign.id);
      expect(
        body.items.every((row) => row.authorization.unionId === "union-opseu"),
      ).toBe(true);
      expect(
        body.items.every((row) => row.authorization.localId === "local-243"),
      ).toBe(true);
    });

    it("rejects forged tenant keys then stamps the session union/local", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const payload = {
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
      };

      const forged = await createAuthorization(
        jsonRequest({
          ...payload,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createAuthorization(jsonRequest(payload));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        authorization: {
          unionId: string;
          localId: string;
          requestedById: string;
          status: string;
        };
      };
      expect(body.authorization.unionId).toBe("union-opseu");
      expect(body.authorization.localId).toBe("local-243");
      expect(body.authorization.requestedById).toBe("user-president-243");
      expect(body.authorization.status).toBe("requested");
    });
  });

  describe("POST /api/travel/[id]/approve and deny", () => {
    it("returns 401 without a session and 403 for members and stewards", async () => {
      const auth = await seedAuthorization();
      authMock.mockResolvedValue(null);
      expect(
        (await approveTravel(new Request("http://localhost"), params(auth.id)))
          .status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect(
        (await approveTravel(new Request("http://localhost"), params(auth.id)))
          .status,
      ).toBe(403);

      authMock.mockResolvedValue(session());
      const steward = await denyTravel(
        jsonRequest({ reason: "No" }),
        params(auth.id),
      );
      expect(steward.status).toBe(403);
      expect(await steward.json()).toEqual({ error: "Forbidden" });
      expect((await memoryTravelStore.getAuthorization(auth.id))?.status).toBe(
        "requested",
      );
    });

    it("returns 404 for another union, including platform_admin", async () => {
      const foreign = await seedAuthorization({
        unionId: "union-other",
        localId: "local-1",
        requestedById: "user-other",
      });
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const approved = await approveTravel(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(approved.status).toBe(404);
      expect(await approved.json()).toEqual({ error: "Not found" });

      const denied = await denyTravel(
        jsonRequest({ reason: "Hijack" }),
        params(foreign.id),
      );
      expect(denied.status).toBe(404);
      expect((await memoryTravelStore.getAuthorization(foreign.id))?.status).toBe(
        "requested",
      );
    });

    it("lets a president approve, then 409s a second approve and a deny", async () => {
      const auth = await seedAuthorization();
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const approved = await approveTravel(
        new Request("http://localhost"),
        params(auth.id),
      );
      expect(approved.status).toBe(200);
      const body = (await approved.json()) as {
        authorization: { status: string; approvedById: string };
      };
      expect(body.authorization.status).toBe("approved");
      expect(body.authorization.approvedById).toBe("user-president-243");

      const again = await approveTravel(
        new Request("http://localhost"),
        params(auth.id),
      );
      expect(again.status).toBe(409);
      expect(await again.json()).toEqual({
        error: "Only requested authorizations can be approved",
      });

      const denied = await denyTravel(
        jsonRequest({ reason: "Too late" }),
        params(auth.id),
      );
      expect(denied.status).toBe(409);
    });

    it("rejects extra deny keys then records the president's reason", async () => {
      const auth = await seedAuthorization();
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const extra = await denyTravel(
        jsonRequest({ reason: "Budget", unionId: "union-other" }),
        params(auth.id),
      );
      expect(extra.status).toBe(400);

      const denied = await denyTravel(
        jsonRequest({ reason: "Over budget" }),
        params(auth.id),
      );
      expect(denied.status).toBe(200);
      const body = (await denied.json()) as {
        authorization: { status: string; deniedReason?: string };
      };
      expect(body.authorization.status).toBe("denied");
      expect(body.authorization.deniedReason).toBe("Over budget");
    });
  });

  describe("POST /api/travel/[id]/advance and reconcile", () => {
    it("403s a steward, 409s before approval, and 404s another union", async () => {
      const requested = await seedAuthorization();
      const foreign = await seedAuthorization({
        unionId: "union-other",
        localId: "local-1",
        requestedById: "user-other",
        status: "approved",
      });

      authMock.mockResolvedValue(session());
      expect(
        (await issueAdvance(jsonRequest({ amount: 50 }), params(requested.id)))
          .status,
      ).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const tooSoon = await issueAdvance(
        jsonRequest({ amount: 50 }),
        params(requested.id),
      );
      expect(tooSoon.status).toBe(409);
      expect(await tooSoon.json()).toEqual({
        error: "Advance requires an approved authorization",
      });

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const crossUnion = await issueAdvance(
        jsonRequest({ amount: 50 }),
        params(foreign.id),
      );
      expect(crossUnion.status).toBe(404);
    });

    it("rejects invalid amounts then stamps the authorization tenant on the ledger", async () => {
      const auth = await seedAuthorization({ status: "approved" });
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );

      expect(
        (await issueAdvance(jsonRequest({ amount: -10 }), params(auth.id)))
          .status,
      ).toBe(400);
      expect(
        (
          await issueAdvance(
            jsonRequest({ amount: 80, unionId: "union-other" }),
            params(auth.id),
          )
        ).status,
      ).toBe(400);

      const issued = await issueAdvance(
        jsonRequest({ amount: 80 }),
        params(auth.id),
      );
      expect(issued.status).toBe(201);
      const body = (await issued.json()) as {
        advance: {
          unionId: string;
          localId: string;
          amount: number;
          issuedById: string;
          travelAuthorizationId: string;
          ledgerEntryId: string;
        };
        ledgerEntry: {
          unionId: string;
          localId: string;
          amount: number;
          type: string;
          category: string;
        };
      };
      expect(body.advance.unionId).toBe("union-opseu");
      expect(body.advance.localId).toBe("local-243");
      expect(body.advance.amount).toBe(80);
      expect(body.advance.issuedById).toBe("user-president-243");
      expect(body.advance.travelAuthorizationId).toBe(auth.id);
      expect(body.ledgerEntry.unionId).toBe("union-opseu");
      expect(body.ledgerEntry.localId).toBe("local-243");
      expect(body.ledgerEntry.amount).toBe(80);
      expect(body.ledgerEntry.type).toBe("expense");
      expect(body.ledgerEntry.category).toBe("travel_advance");

      const stored = await memoryLedgerStore.getById(body.advance.ledgerEntryId);
      expect(stored?.unionId).toBe("union-opseu");
      expect(stored?.localId).toBe("local-243");

      const duplicate = await issueAdvance(
        jsonRequest({ amount: 10 }),
        params(auth.id),
      );
      expect(duplicate.status).toBe(409);
      expect(await duplicate.json()).toEqual({
        error: "Advance already issued",
      });
    });

    it("404s a missing claim, forbids a steward, then reconciles with a local ledger row", async () => {
      const auth = await seedAuthorization({ status: "approved" });
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const missing = await reconcileTravel(
        new Request("http://localhost"),
        params(auth.id),
      );
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ error: "No claim to reconcile" });

      await memoryTravelStore.createClaim(
        { travelAuthorizationId: auth.id, lineItems },
        {
          unionId: auth.unionId,
          localId: auth.localId,
          claimantId: auth.requestedById,
          advanceAmount: 50,
        },
      );

      authMock.mockResolvedValue(session());
      expect(
        (
          await reconcileTravel(
            new Request("http://localhost"),
            params(auth.id),
          )
        ).status,
      ).toBe(403);

      const foreign = await seedAuthorization({
        unionId: "union-other",
        localId: "local-1",
        requestedById: "user-other",
        status: "approved",
      });
      await memoryTravelStore.createClaim(
        { travelAuthorizationId: foreign.id, lineItems },
        {
          unionId: "union-other",
          localId: "local-1",
          claimantId: "user-other",
          advanceAmount: 0,
        },
      );
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      expect(
        (
          await reconcileTravel(
            new Request("http://localhost"),
            params(foreign.id),
          )
        ).status,
      ).toBe(404);

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const reconciled = await reconcileTravel(
        new Request("http://localhost"),
        params(auth.id),
      );
      expect(reconciled.status).toBe(200);
      const body = (await reconciled.json()) as {
        claim: {
          status: string;
          unionId: string;
          localId: string;
          difference: number;
          reconcileLedgerEntryId?: string;
          reconciledById?: string;
        };
        difference: number;
      };
      expect(body.claim.status).toBe("reconciled");
      expect(body.claim.unionId).toBe("union-opseu");
      expect(body.claim.localId).toBe("local-243");
      expect(body.difference).toBe(70);
      expect(body.claim.difference).toBe(70);
      expect(body.claim.reconciledById).toBe("user-president-243");

      const ledger = await memoryLedgerStore.getById(
        body.claim.reconcileLedgerEntryId ?? "",
      );
      expect(ledger?.unionId).toBe("union-opseu");
      expect(ledger?.localId).toBe("local-243");
      expect(ledger?.type).toBe("expense");
      expect(ledger?.category).toBe("travel_reconcile");
      expect(ledger?.amount).toBe(70);

      const again = await reconcileTravel(
        new Request("http://localhost"),
        params(auth.id),
      );
      expect(again.status).toBe(409);
      expect(await again.json()).toEqual({ error: "Already reconciled" });
    });
  });
});
