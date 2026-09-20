import { beforeEach, describe, expect, it } from "vitest";
import { resetGovernanceStores } from "./store";
import { memoryBylawsStore } from "./bylaws-memory-adapter";
import { memoryProposalsStore } from "./proposals-memory-adapter";
import { createEmptyBylawForm } from "@/lib/bylaws/build-template";
import type { HubBylawDraft } from "@/types/hub-bylaws";

const UNION = "union-b7p";
const LOCAL_A = "local-7";
const LOCAL_B = "local-404";

function form(overrides: Partial<HubBylawDraft["form"]> = {}): HubBylawDraft["form"] {
  return { ...createEmptyBylawForm(), ...overrides };
}

describe("Hub bylaws adapter (memory)", () => {
  beforeEach(() => {
    resetGovernanceStores();
  });

  it("creates, lists (tenant-scoped), updates, and removes drafts", async () => {
    const draft = await memoryBylawsStore.create({
      unionId: UNION,
      localId: LOCAL_A,
      title: "Bylaw revision 2026",
      mode: "committee",
      form: form({
        localName: "Behind 7 Proxies Local 7",
        vicePresidents: "2",
        stewards: "One steward per unit",
        articleOverrides: { name: "Article 1 — Name override" },
        committeeNotes: { name: "Committee to renumber articles" },
        articleSet: "opseu",
        existingBylaws: "",
      }),
      updatedById: "officer-1",
    });
    expect(draft.status).toBe("draft");

    await memoryBylawsStore.create({
      unionId: UNION,
      localId: LOCAL_B,
      title: "Other local draft",
      mode: "template",
      form: form({ localName: "404", vicePresidents: "1" }),
      updatedById: "officer-1",
    });

    const localAList = await memoryBylawsStore.list(UNION, LOCAL_A);
    expect(localAList).toHaveLength(1);
    expect(localAList[0]?.title).toBe("Bylaw revision 2026");

    // Cross-local (elevated) listing returns every local's drafts.
    const unionWide = await memoryBylawsStore.list(UNION);
    expect(unionWide).toHaveLength(2);

    const updated = await memoryBylawsStore.update(draft.id, {
      status: "pending_gmm",
      updatedById: "officer-2",
    });
    expect(updated?.status).toBe("pending_gmm");
    const updatedForm = updated?.form as { localName: string };
    expect(updatedForm.localName).toBe("Behind 7 Proxies Local 7");

    expect(await memoryBylawsStore.remove(draft.id)).toBe(true);
    expect(await memoryBylawsStore.get(draft.id)).toBeNull();
  });
});

describe("Hub proposals adapter (memory)", () => {
  beforeEach(() => {
    resetGovernanceStores();
  });

  it("holds package + rows + events and scopes lists to tenant", async () => {
    const pkg = await memoryProposalsStore.createPackage({
      unionId: UNION,
      localId: LOCAL_A,
      name: "2026 round",
      roundLabel: "Round 4",
      status: "active",
      caucusNote: "Caucus wants the wage grid untouched",
      createdById: "officer-1",
      updatedById: "officer-1",
    });

    await memoryProposalsStore.createPackage({
      unionId: UNION,
      localId: LOCAL_B,
      name: "Part-time round",
      roundLabel: "",
      status: "active",
      caucusNote: "",
      createdById: "officer-1",
      updatedById: "officer-1",
    });

    expect(await memoryProposalsStore.listPackages(UNION, LOCAL_A)).toHaveLength(1);
    expect(await memoryProposalsStore.listPackages(UNION)).toHaveLength(2);

    const row = await memoryProposalsStore.upsertRow({
      id: "pr-1",
      packageId: pkg.id,
      unionId: UNION,
      localId: LOCAL_A,
      article: "Article 12.01",
      currentLanguage: "…",
      unionProposal: "Add chosen-family leave",
      employerCounter: "Rejected; family defined in CA 12",
      status: "open",
      notes: "",
      sortOrder: 0,
      assigneeIds: ["officer-2"],
    });

    // Upsert with the same id updates in place.
    const updatedRow = await memoryProposalsStore.upsertRow({
      ...row,
      status: "tentativelyAgreed",
    });
    expect(updatedRow.status).toBe("tentativelyAgreed");
    const rows = await memoryProposalsStore.listRows(pkg.id);
    expect(rows).toHaveLength(1);

    await memoryProposalsStore.addEvent({
      packageId: pkg.id,
      unionId: UNION,
      localId: LOCAL_A,
      authorId: "officer-1",
      authorName: "President",
      kind: "comment",
      body: "Employer countered on bereavement",
    });
    const events = await memoryProposalsStore.listEvents(pkg.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.body).toContain("bereavement");

    expect(await memoryProposalsStore.removeRow(row.id)).toBe(true);
    expect(await memoryProposalsStore.listRows(pkg.id)).toHaveLength(0);
  });

  it("publishes member-safe snapshots and hides archived ones", async () => {
    const pkg = await memoryProposalsStore.createPackage({
      unionId: UNION,
      localId: LOCAL_A,
      name: "2026 round",
      roundLabel: "",
      status: "active",
      caucusNote: "Secret note",
      createdById: "officer-1",
      updatedById: "officer-1",
    });

    const pub = await memoryProposalsStore.publish({
      packageId: pkg.id,
      unionId: UNION,
      localId: LOCAL_A,
      headline: "2026 round: what we are asking for",
      bullets: ["Wage grid protection", "Chosen-family leave"],
      publishedById: "officer-1",
    });
    expect(pub.guideHref).toBeUndefined();

    const portalFeed = await memoryProposalsStore.listPublications(UNION, LOCAL_A);
    expect(portalFeed).toHaveLength(1);
    // Member-safe snapshot never carries the caucus note.
    expect(portalFeed[0]).not.toHaveProperty("caucusNote");

    expect(await memoryProposalsStore.archivePublication(pub.id)).toBe(true);
    expect(await memoryProposalsStore.listPublications(UNION, LOCAL_A)).toHaveLength(0);
  });

  it("removing a package cascades rows, events, and publications", async () => {
    const pkg = await memoryProposalsStore.createPackage({
      unionId: UNION,
      localId: LOCAL_A,
      name: "Round",
      roundLabel: "",
      status: "active",
      caucusNote: "",
      createdById: "officer-1",
      updatedById: "officer-1",
    });
    await memoryProposalsStore.upsertRow({
      id: "pr-1",
      packageId: pkg.id,
      unionId: UNION,
      localId: LOCAL_A,
      article: "A",
      currentLanguage: "",
      unionProposal: "",
      employerCounter: "",
      status: "open",
      notes: "",
      sortOrder: 0,
      assigneeIds: [],
    });
    await memoryProposalsStore.addEvent({
      packageId: pkg.id,
      unionId: UNION,
      localId: LOCAL_A,
      authorId: "officer-1",
      authorName: "P",
      kind: "comment",
      body: "hello",
    });
    await memoryProposalsStore.publish({
      packageId: pkg.id,
      unionId: UNION,
      localId: LOCAL_A,
      headline: "H",
      bullets: [],
      publishedById: "officer-1",
    });

    expect(await memoryProposalsStore.removePackage(pkg.id)).toBe(true);
    expect(await memoryProposalsStore.listRows(pkg.id)).toHaveLength(0);
    expect(await memoryProposalsStore.listEvents(pkg.id)).toHaveLength(0);
    expect(await memoryProposalsStore.listPublications(UNION, LOCAL_A)).toHaveLength(0);
  });
});