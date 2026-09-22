import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listBylaws,
  POST as createBylaw,
} from "@/app/api/bylaws/route";
import {
  DELETE as deleteBylaw,
  GET as getBylaw,
  PATCH as patchBylaw,
} from "@/app/api/bylaws/[id]/route";
import {
  GET as listProposals,
  POST as createProposal,
} from "@/app/api/proposals/route";
import {
  DELETE as deleteProposal,
  GET as getProposal,
  PATCH as patchProposal,
} from "@/app/api/proposals/[id]/route";
import { POST as addProposalRow } from "@/app/api/proposals/[id]/rows/route";
import {
  DELETE as deleteProposalRow,
  PATCH as patchProposalRow,
} from "@/app/api/proposals/[id]/rows/[rowId]/route";
import { POST as addProposalEvent } from "@/app/api/proposals/[id]/events/route";
import {
  GET as listPublications,
  POST as publishProposal,
} from "@/app/api/proposals/[id]/publications/route";
import { PATCH as archivePublication } from "@/app/api/proposals/publications/[id]/route";
import { GET as listPortalPublications } from "@/app/api/portal/proposals/route";
import { createEmptyBylawForm } from "@/lib/bylaws/build-template";
import { memoryBylawsStore } from "./bylaws-memory-adapter";
import { memoryProposalsStore } from "./proposals-memory-adapter";
import { resetGovernanceStores } from "./store";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-7",
      name: input?.name ?? "Local 777 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params<E extends Record<string, string> = Record<string, never>>(
  id: string,
  extra?: E,
): { params: Promise<{ id: string } & E> } {
  return {
    params: Promise.resolve({ id, ...(extra ?? ({} as E)) } as { id: string } & E),
  };
}

const stewardSession = () =>
  session({
    id: "user-steward-7",
    name: "Local 777 Steward",
    roles: ["local_steward"],
  });

async function seedBylaw(input?: {
  unionId?: string;
  localId?: string;
  title?: string;
}) {
  return memoryBylawsStore.create({
    unionId: input?.unionId ?? "union-b7p",
    localId: input?.localId ?? "local-7",
    title: input?.title ?? "Local 777 revision",
    mode: "template",
    form: { ...createEmptyBylawForm(), localName: "Local 777" },
    updatedById: "user-president-7",
  });
}

async function seedPackage(input?: {
  unionId?: string;
  localId?: string;
  name?: string;
  caucusNote?: string;
}) {
  return memoryProposalsStore.createPackage({
    unionId: input?.unionId ?? "union-b7p",
    localId: input?.localId ?? "local-7",
    name: input?.name ?? "2026 round",
    roundLabel: "Round 4",
    status: "active",
    caucusNote: input?.caucusNote ?? "Keep the wage grid off the table",
    createdById: "user-president-7",
    updatedById: "user-president-7",
  });
}

describe("bylaws / proposals HTTP tenancy", () => {
  beforeEach(() => {
    resetGovernanceStores();
    authMock.mockReset();
    vi.stubEnv("BYLAWS_DB_BACKEND", "memory");
    vi.stubEnv("PROPOSALS_DB_BACKEND", "memory");
  });

  afterEach(() => {
    resetGovernanceStores();
    vi.unstubAllEnvs();
  });

  describe("bylaws", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listBylaws()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listBylaws();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets stewards read the home local and forbids writes", async () => {
      const home = await seedBylaw();
      await seedBylaw({ localId: "local-1337", title: "Sister local" });
      authMock.mockResolvedValue(stewardSession());

      const list = await listBylaws();
      expect(list.status).toBe(200);
      const body = (await list.json()) as { drafts: Array<{ id: string }> };
      expect(body.drafts.map((draft) => draft.id)).toEqual([home.id]);

      const created = await createBylaw(jsonRequest({ title: "Steward draft" }));
      expect(created.status).toBe(403);
    });

    it("lists only the president's local and stamps session tenant on create", async () => {
      await seedBylaw({ title: "Home" });
      await seedBylaw({ localId: "local-1337", title: "Sister" });
      await seedBylaw({ unionId: "union-other", localId: "local-1", title: "Other union" });
      authMock.mockResolvedValue(session());

      const list = await listBylaws();
      expect(list.status).toBe(200);
      const listed = (await list.json()) as { drafts: Array<{ title: string }> };
      expect(listed.drafts.map((draft) => draft.title)).toEqual(["Home"]);

      const created = await createBylaw(
        jsonRequest({
          title: "New draft",
          unionId: "union-other",
          localId: "local-1",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        draft: { unionId: string; localId: string; title: string };
      };
      expect(body.draft).toMatchObject({
        title: "New draft",
        unionId: "union-b7p",
        localId: "local-7",
      });
    });

    it("returns 400 for empty title and missing local on create", async () => {
      authMock.mockResolvedValue(session({ localId: null }));
      expect((await createBylaw(jsonRequest({ title: "Needs a local" }))).status).toBe(
        400,
      );

      authMock.mockResolvedValue(session());
      const invalid = await createBylaw(jsonRequest({ title: "" }));
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({ error: "Validation failed" });
    });

    it("does not mutate another union's draft on GET/PATCH/DELETE", async () => {
      const foreign = await seedBylaw({
        unionId: "union-other",
        localId: "local-1",
        title: "Keep me",
      });
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

      expect((await getBylaw(new Request("http://localhost"), params(foreign.id))).status).toBe(
        403,
      );

      const patched = await patchBylaw(
        jsonRequest({ title: "Hijacked" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(403);
      expect((await memoryBylawsStore.get(foreign.id))?.title).toBe("Keep me");

      expect((await deleteBylaw(new Request("http://localhost"), params(foreign.id))).status).toBe(
        403,
      );
      expect(await memoryBylawsStore.get(foreign.id)).not.toBeNull();
    });
  });

  describe("proposals", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listProposals()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listProposals()).status).toBe(403);
    });

    it("lets stewards read home packages but not write, publish, or unpublish", async () => {
      const home = await seedPackage();
      const publication = await memoryProposalsStore.publish({
        packageId: home.id,
        unionId: home.unionId,
        localId: home.localId,
        headline: "What we are asking",
        bullets: ["Wage grid"],
        publishedById: "user-president-7",
      });
      authMock.mockResolvedValue(stewardSession());

      const list = await listProposals();
      expect(list.status).toBe(200);
      const body = (await list.json()) as { packages: Array<{ id: string }> };
      expect(body.packages.map((pkg) => pkg.id)).toEqual([home.id]);

      expect((await createProposal(jsonRequest({ name: "Steward package" }))).status).toBe(
        403,
      );
      expect(
        (await publishProposal(jsonRequest({ headline: "Leak", bullets: [] }), params(home.id)))
          .status,
      ).toBe(403);
      expect(
        (await archivePublication(jsonRequest({ archived: true }), params(publication.id)))
          .status,
      ).toBe(403);
      expect(await memoryProposalsStore.listPublications("union-b7p", "local-7")).toHaveLength(
        1,
      );
    });

    it("lists only the home local and stamps session tenant on create", async () => {
      await seedPackage({ name: "Home round" });
      await seedPackage({ localId: "local-1337", name: "Sister round" });
      await seedPackage({
        unionId: "union-other",
        localId: "local-1",
        name: "Other union",
      });
      authMock.mockResolvedValue(session());

      const list = await listProposals();
      expect(list.status).toBe(200);
      const listed = (await list.json()) as { packages: Array<{ name: string }> };
      expect(listed.packages.map((pkg) => pkg.name)).toEqual(["Home round"]);

      const created = await createProposal(
        jsonRequest({
          name: "New package",
          unionId: "union-other",
          localId: "local-1",
          caucusNote: "Stay off the record",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        package: { unionId: string; localId: string; name: string };
      };
      expect(body.package).toMatchObject({
        name: "New package",
        unionId: "union-b7p",
        localId: "local-7",
      });
    });

    it("returns 404 for another union on package, row, event, and publication writes", async () => {
      const foreign = await seedPackage({
        unionId: "union-other",
        localId: "local-1",
        name: "Foreign",
        caucusNote: "Secret caucus",
      });
      const row = await memoryProposalsStore.upsertRow({
        id: "pr-foreign",
        packageId: foreign.id,
        unionId: foreign.unionId,
        localId: foreign.localId,
        article: "12.01",
        currentLanguage: "current",
        unionProposal: "ask",
        employerCounter: "no",
        status: "open",
        notes: "caucus only",
        sortOrder: 0,
        assigneeIds: [],
      });
      const publication = await memoryProposalsStore.publish({
        packageId: foreign.id,
        unionId: foreign.unionId,
        localId: foreign.localId,
        headline: "Do not leak",
        bullets: ["Hidden"],
        publishedById: "user-x",
      });
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

      expect((await getProposal(new Request("http://localhost"), params(foreign.id))).status).toBe(
        404,
      );
      expect((await patchProposal(jsonRequest({ name: "Hijack" }), params(foreign.id))).status).toBe(
        404,
      );
      expect(
        (await deleteProposal(new Request("http://localhost"), params(foreign.id))).status,
      ).toBe(404);
      expect(
        (await addProposalRow(jsonRequest({ article: "x" }), params(foreign.id))).status,
      ).toBe(404);
      expect(
        (
          await patchProposalRow(
            jsonRequest({ notes: "leaked" }),
            params(foreign.id, { rowId: row.id }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await deleteProposalRow(
            new Request("http://localhost"),
            params(foreign.id, { rowId: row.id }),
          )
        ).status,
      ).toBe(404);
      expect(
        (await addProposalEvent(jsonRequest({ body: "hi" }), params(foreign.id))).status,
      ).toBe(404);
      expect(
        (await listPublications(new Request("http://localhost"), params(foreign.id))).status,
      ).toBe(404);
      expect(
        (await publishProposal(jsonRequest({ headline: "Leak", bullets: [] }), params(foreign.id)))
          .status,
      ).toBe(404);
      expect(
        (await archivePublication(jsonRequest({ archived: true }), params(publication.id)))
          .status,
      ).toBe(404);

      expect((await memoryProposalsStore.getPackage(foreign.id))?.name).toBe("Foreign");
      expect((await memoryProposalsStore.listRows(foreign.id))[0]?.notes).toBe("caucus only");
      expect(await memoryProposalsStore.listPublications("union-other", "local-1")).toHaveLength(
        1,
      );
    });

    it("publishes a member-safe snapshot and hides it from the Portal after archive", async () => {
      const pkg = await seedPackage();
      authMock.mockResolvedValue(session());

      const published = await publishProposal(
        jsonRequest({
          headline: "What we are taking to the table",
          bullets: ["Wage grid protection"],
          guideHref: "/guide/bargaining",
        }),
        params(pkg.id),
      );
      expect(published.status).toBe(201);
      const publication = (
        (await published.json()) as {
          publication: { id: string; headline: string; caucusNote?: string };
        }
      ).publication;
      expect(publication.headline).toBe("What we are taking to the table");
      expect(publication).not.toHaveProperty("caucusNote");

      authMock.mockResolvedValue(
        session({
          id: "user-member-7",
          name: "Local 777 Member",
          roles: ["local_member"],
        }),
      );
      const portal = await listPortalPublications();
      expect(portal.status).toBe(200);
      const feed = (await portal.json()) as {
        publications: Array<{ headline: string; caucusNote?: string }>;
      };
      expect(feed.publications).toHaveLength(1);
      expect(feed.publications[0]?.headline).toBe("What we are taking to the table");
      expect(feed.publications[0]).not.toHaveProperty("caucusNote");

      authMock.mockResolvedValue(session());
      expect(
        (await archivePublication(jsonRequest({ archived: true }), params(publication.id)))
          .status,
      ).toBe(200);

      authMock.mockResolvedValue(
        session({
          id: "user-member-7",
          roles: ["local_member"],
        }),
      );
      const after = (await (await listPortalPublications()).json()) as {
        publications: unknown[];
      };
      expect(after.publications).toEqual([]);
    });

    it("returns 401 for Portal publications without a session and hides sister-local snapshots", async () => {
      const home = await seedPackage({ name: "Home" });
      await memoryProposalsStore.publish({
        packageId: home.id,
        unionId: home.unionId,
        localId: home.localId,
        headline: "Home snapshot",
        bullets: [],
        publishedById: "user-president-7",
      });
      const sister = await seedPackage({ localId: "local-1337", name: "Sister" });
      await memoryProposalsStore.publish({
        packageId: sister.id,
        unionId: sister.unionId,
        localId: sister.localId,
        headline: "Sister snapshot",
        bullets: [],
        publishedById: "user-president-7",
      });

      authMock.mockResolvedValue(null);
      expect((await listPortalPublications()).status).toBe(401);

      authMock.mockResolvedValue(
        session({
          id: "user-member-7",
          roles: ["local_member"],
        }),
      );
      const feed = (await (await listPortalPublications()).json()) as {
        publications: Array<{ headline: string }>;
      };
      expect(feed.publications.map((item) => item.headline)).toEqual(["Home snapshot"]);
    });
  });
});
