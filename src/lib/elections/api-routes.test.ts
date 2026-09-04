import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listElections,
  POST as createElection,
} from "@/app/api/elections/route";
import { POST as addNomination } from "@/app/api/elections/[id]/nominations/route";
import { POST as recordTallies } from "@/app/api/elections/[id]/tallies/route";
import { POST as promote } from "@/app/api/elections/[id]/promote/route";
import {
  memoryElectionsStore,
  resetElectionsMemoryForTests,
} from "./memory-adapter";
import { resetElectionsStore } from "./store";
import {
  memoryOfficerRosterStore,
  resetOfficerRosterMemoryForTests,
} from "@/lib/officers/memory-adapter";
import { resetOfficerRosterStore } from "@/lib/officers/store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/elections${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const promoteBody = {
  position: "President",
  nomineeName: "Alex Rivera",
};

const nominationBody = {
  position: "Secretary",
  nomineeName: "Lee Park",
  nominator: "Alex Rivera",
};

const talliesBody = {
  tallies: [
    { position: "President", nomineeName: "Alex Rivera", votes: 12 },
    { position: "Vice-President", nomineeName: "Sam Okonkwo", votes: 9 },
  ],
};

describe("elections promote API", () => {
  beforeEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
  });

  it("returns 401 without a session and 403 for members, stewards, and local_exec", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (await promote(jsonRequest(promoteBody), params("elec-001"))).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    expect(
      (await promote(jsonRequest(promoteBody), params("elec-001"))).status,
    ).toBe(403);

    authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
    expect(
      (await promote(jsonRequest(promoteBody), params("elec-001"))).status,
    ).toBe(403);

    authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
    const exec = await promote(jsonRequest(promoteBody), params("elec-001"));
    expect(exec.status).toBe(403);
    expect(await exec.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 for a missing cycle", async () => {
    authMock.mockResolvedValue(session());
    const missing = await promote(
      jsonRequest(promoteBody),
      params("elec-does-not-exist"),
    );
    expect(missing.status).toBe(404);
  });

  it("returns 403 for another union, including platform_admin, and does not write a roster row", async () => {
    const foreign = await memoryElectionsStore.create(
      { title: "Other union exec", positions: ["President"] },
      { unionId: "union-other", localId: "local-1" },
    );
    const before = await memoryOfficerRosterStore.list({
      unionId: "union-other",
      localId: "local-1",
    });

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const res = await promote(jsonRequest(promoteBody), params(foreign.id));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });

    const after = await memoryOfficerRosterStore.list({
      unionId: "union-other",
      localId: "local-1",
    });
    expect(after).toHaveLength(before.length);
  });

  it("rejects forged tenant keys, then stamps the cycle tenant onto the roster row", async () => {
    authMock.mockResolvedValue(session());
    const forged = await promote(
      jsonRequest({
        ...promoteBody,
        unionId: "union-other",
        localId: "local-evil",
      }),
      params("elec-001"),
    );
    expect(forged.status).toBe(400);

    const created = await promote(jsonRequest(promoteBody), params("elec-001"));
    expect(created.status).toBe(200);
    const body = (await created.json()) as {
      officer: {
        name: string;
        role: string;
        unionId: string;
        localId: string;
        termStart: string;
      };
      cycle: { id: string; unionId: string; localId: string };
    };
    expect(body.cycle.id).toBe("elec-001");
    expect(body.officer.name).toBe("Alex Rivera");
    expect(body.officer.role).toBe("President");
    expect(body.officer.unionId).toBe("union-opseu");
    expect(body.officer.localId).toBe("local-243");
    expect(body.officer.termStart).toBe("2026-09-01");
  });
});

describe("elections list/create/nominations/tallies API", () => {
  beforeEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetElectionsMemoryForTests();
    resetElectionsStore();
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
  });

  it("returns 401 without a session and 403 for members, stewards, and local_exec", async () => {
    authMock.mockResolvedValue(null);
    expect((await listElections(listRequest())).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    expect((await listElections(listRequest())).status).toBe(403);

    authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
    expect(
      (await addNomination(jsonRequest(nominationBody), params("elec-001")))
        .status,
    ).toBe(403);

    authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
    const exec = await recordTallies(
      jsonRequest(talliesBody),
      params("elec-001"),
    );
    expect(exec.status).toBe(403);
    expect(await exec.json()).toEqual({ error: "Forbidden" });
  });

  it("does not list another union or another local for a president", async () => {
    await memoryElectionsStore.create(
      { title: "Other union exec", positions: ["President"] },
      { unionId: "union-other", localId: "local-243" },
    );
    await memoryElectionsStore.create(
      { title: "Other local exec", positions: ["President"] },
      { unionId: "union-opseu", localId: "local-560" },
    );

    authMock.mockResolvedValue(session());
    const res = await listElections(listRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cycles: Array<{ title: string; unionId: string; localId: string }>;
    };
    expect(body.cycles.every((c) => c.unionId === "union-opseu")).toBe(true);
    expect(body.cycles.every((c) => c.localId === "local-243")).toBe(true);
    expect(body.cycles.map((c) => c.title)).not.toContain("Other union exec");
    expect(body.cycles.map((c) => c.title)).not.toContain("Other local exec");
    expect(body.cycles.map((c) => c.title)).toContain("2026 Executive election");
  });

  it("rejects forged tenant keys on create, then stamps the session union/local", async () => {
    authMock.mockResolvedValue(session());
    const forged = await createElection(
      jsonRequest({
        title: "Special election",
        positions: ["Treasurer"],
        unionId: "union-other",
        localId: "local-evil",
      }),
    );
    expect(forged.status).toBe(400);

    const created = await createElection(
      jsonRequest({ title: "Special election", positions: ["Treasurer"] }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      cycle: {
        title: string;
        unionId: string;
        localId: string;
        status: string;
      };
    };
    expect(body.cycle.title).toBe("Special election");
    expect(body.cycle.unionId).toBe("union-opseu");
    expect(body.cycle.localId).toBe("local-243");
    expect(body.cycle.status).toBe("open");
  });

  it("returns 404 for a missing cycle and 403 for another union, including platform_admin, without writing a nomination", async () => {
    const foreign = await memoryElectionsStore.create(
      { title: "Other union exec", positions: ["President"] },
      { unionId: "union-other", localId: "local-1" },
    );

    authMock.mockResolvedValue(session());
    expect(
      (
        await addNomination(
          jsonRequest(nominationBody),
          params("elec-does-not-exist"),
        )
      ).status,
    ).toBe(404);

    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const res = await addNomination(
      jsonRequest(nominationBody),
      params(foreign.id),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect((await memoryElectionsStore.getById(foreign.id))?.nominations).toEqual(
      [],
    );
  });

  it("rejects extra nomination keys, then appends the nominee on the session cycle", async () => {
    authMock.mockResolvedValue(session());
    const forged = await addNomination(
      jsonRequest({
        ...nominationBody,
        unionId: "union-other",
        id: "nom-forged",
      }),
      params("elec-001"),
    );
    expect(forged.status).toBe(400);

    const created = await addNomination(
      jsonRequest(nominationBody),
      params("elec-001"),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      cycle: {
        id: string;
        nominations: Array<{
          position: string;
          nomineeName: string;
          status: string;
        }>;
      };
    };
    expect(body.cycle.id).toBe("elec-001");
    expect(body.cycle.nominations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          position: "Secretary",
          nomineeName: "Lee Park",
          status: "pending",
        }),
      ]),
    );
  });

  it("rejects negative votes, then records offline tallies and marks the cycle tallied", async () => {
    const foreign = await memoryElectionsStore.create(
      { title: "Other union exec", positions: ["President"] },
      { unionId: "union-other", localId: "local-1" },
    );
    authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
    const crossUnion = await recordTallies(
      jsonRequest(talliesBody),
      params(foreign.id),
    );
    expect(crossUnion.status).toBe(403);
    expect((await memoryElectionsStore.getById(foreign.id))?.tallies).toEqual([]);
    expect((await memoryElectionsStore.getById(foreign.id))?.status).toBe("open");

    authMock.mockResolvedValue(session());
    const negative = await recordTallies(
      jsonRequest({
        tallies: [
          { position: "President", nomineeName: "Alex Rivera", votes: -1 },
        ],
      }),
      params("elec-001"),
    );
    expect(negative.status).toBe(400);

    const recorded = await recordTallies(
      jsonRequest(talliesBody),
      params("elec-001"),
    );
    expect(recorded.status).toBe(200);
    const body = (await recorded.json()) as {
      cycle: {
        status: string;
        tallies: Array<{ nomineeName: string; votes: number }>;
      };
    };
    expect(body.cycle.status).toBe("tallied");
    expect(body.cycle.tallies).toEqual([
      { position: "President", nomineeName: "Alex Rivera", votes: 12 },
      { position: "Vice-President", nomineeName: "Sam Okonkwo", votes: 9 },
    ]);
  });
});
