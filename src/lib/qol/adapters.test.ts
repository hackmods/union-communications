import { describe, it, expect } from "vitest";
import { snippetStore } from "@/lib/snippets/memory-adapter";
import { marketplaceStore } from "@/lib/marketplace/memory-adapter";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import {
  canDeleteSharedContent,
  canManageQolContent,
  canPublishMarketplace,
} from "@/lib/qol/access";

describe("snippet adapter", () => {
  it("lists only same-union snippets and supports search", async () => {
    const all = await snippetStore.list({ unionId: "union-opseu" });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((s) => s.unionId === "union-opseu")).toBe(true);

    const filtered = await snippetStore.list({
      unionId: "union-opseu",
      query: "just cause",
    });
    expect(filtered.some((s) => s.id === "snip-001")).toBe(true);
  });

  it("creates and updates a snippet", async () => {
    const created = await snippetStore.create(
      {
        title: "Test clause",
        clauseRef: "Art. 99",
        body: "Test body",
        tags: ["test"],
        localId: "local-243",
      },
      {
        unionId: "union-opseu",
        createdById: "user-president-243",
        createdByName: "President",
      },
    );
    expect(created.id).toBeTruthy();
    const updated = await snippetStore.update(created.id, {
      title: "Updated clause",
    });
    expect(updated?.title).toBe("Updated clause");
    await snippetStore.remove(created.id);
    expect(await snippetStore.getById(created.id)).toBeNull();
  });
});

describe("marketplace adapter", () => {
  it("isolates by unionId and filters by kind", async () => {
    const all = await marketplaceStore.list({ unionId: "union-opseu" });
    expect(all.every((t) => t.unionId === "union-opseu")).toBe(true);

    const emails = await marketplaceStore.list({
      unionId: "union-opseu",
      kind: "email",
    });
    expect(emails.every((t) => t.kind === "email")).toBe(true);
    expect(emails.length).toBeGreaterThan(0);
  });

  it("creates a within-union template", async () => {
    const created = await marketplaceStore.create(
      {
        kind: "other",
        title: "Temp",
        description: "desc",
        body: "body",
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        sharedById: "user-steward-243",
        sharedByName: "Steward",
      },
    );
    expect(created.unionId).toBe("union-opseu");
    await marketplaceStore.remove(created.id);
  });
});

describe("grievance communications and meetings", () => {
  it("logs a member communication", async () => {
    const entry = await grievanceStore.addCommunication(
      "grev-001",
      {
        channel: "email",
        direction: "outbound",
        summary: "Sent update",
        occurredAt: new Date().toISOString(),
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        loggedById: "user-steward-243",
        loggedByName: "Steward",
      },
    );
    expect(entry?.grievanceId).toBe("grev-001");
    const list = await grievanceStore.listCommunications("grev-001");
    expect(list.some((c) => c.id === entry?.id)).toBe(true);
  });

  it("schedules a meeting and adds timeline event", async () => {
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();
    const meeting = await grievanceStore.addMeeting(
      "grev-001",
      {
        title: "Step 1 meeting",
        startsAt: start,
        endsAt: end,
        location: "HR office",
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-steward-243",
      },
    );
    expect(meeting?.title).toBe("Step 1 meeting");
    const full = await grievanceStore.getById("grev-001");
    expect(
      full?.events.some((e) => e.type === "meeting_scheduled"),
    ).toBe(true);
  });
});

describe("qol access helpers", () => {
  it("gates handoff-related publish and delete", () => {
    expect(canManageQolContent(["local_steward"])).toBe(true);
    expect(canPublishMarketplace(["local_exec"])).toBe(false);
    expect(canPublishMarketplace(["local_steward"])).toBe(true);
    expect(
      canDeleteSharedContent(["local_steward"], "owner", "other"),
    ).toBe(false);
    expect(
      canDeleteSharedContent(["local_steward"], "owner", "owner"),
    ).toBe(true);
    expect(
      canDeleteSharedContent(["local_president"], "owner", "other"),
    ).toBe(true);
  });
});
