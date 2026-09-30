import { describe, expect, it } from "vitest";
import {
  activeFloorMessages,
  floorPresentNames,
  FLOOR_PRESENCE_TTL_MS,
  validateFloorParent,
} from "@/lib/portal/floor";
import type { CircleMembership, FloorMessage } from "@/types/portal";
import { portalAdapterForMemoryTests } from "@/lib/portal/adapter";

describe("portal floor helpers", () => {
  it("counts present members within the TTL", () => {
    const now = Date.parse("2026-09-30T12:00:00.000Z");
    const roster: CircleMembership[] = [
      {
        id: "cm-1",
        circleId: "c1",
        userId: "u1",
        userName: "Alex",
        role: "member",
        muted: false,
        mutedTools: [],
        starred: false,
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastFloorSeenAt: new Date(now - 60_000).toISOString(),
      },
      {
        id: "cm-2",
        circleId: "c1",
        userId: "u2",
        userName: "Sam",
        role: "member",
        muted: false,
        mutedTools: [],
        starred: false,
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastFloorSeenAt: new Date(now - FLOOR_PRESENCE_TTL_MS - 1).toISOString(),
      },
    ];
    expect(floorPresentNames(roster, now)).toEqual(["Alex"]);
  });

  it("rejects nested Floor replies", () => {
    const messages: FloorMessage[] = [
      {
        id: "top",
        circleId: "c1",
        unionId: "u",
        authorId: "a1",
        authorName: "A",
        body: "top",
        createdAt: "2026-09-30T10:00:00.000Z",
      },
      {
        id: "reply",
        circleId: "c1",
        unionId: "u",
        authorId: "a2",
        authorName: "B",
        body: "reply",
        parentId: "top",
        createdAt: "2026-09-30T10:01:00.000Z",
      },
    ];
    expect(validateFloorParent(messages, "c1", "reply")).toBe(
      "Replies cannot be nested",
    );
    expect(activeFloorMessages(messages)).toHaveLength(2);
  });
});

describe("memory portal adapter floor threads", () => {
  it("stores shallow parentId on addFloorMessage", async () => {
    const portal = portalAdapterForMemoryTests();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const unionId = "union-b7p";
    const authorId = `floor-author-${suffix}`;

    const circle = await portal.createCircle({
      unionId,
      kind: "ad_hoc",
      name: `Floor thread ${suffix}`,
      visibility: "invited",
      createdById: authorId,
      createdByName: "Floor Author",
    });

    const top = await portal.addFloorMessage({
      circleId: circle.id,
      unionId,
      authorId,
      authorName: "Floor Author",
      body: "Top line",
    });
    const reply = await portal.addFloorMessage({
      circleId: circle.id,
      unionId,
      authorId,
      authorName: "Floor Author",
      body: "One-level reply",
      parentId: top.id,
    });
    expect(reply.parentId).toBe(top.id);

    try {
      await portal.addFloorMessage({
        circleId: circle.id,
        unionId,
        authorId,
        authorName: "Floor Author",
        body: "Too deep",
        parentId: reply.id,
      });
      expect.fail("expected nested Floor reply to be rejected");
    } catch (err) {
      expect(err).toMatchObject({ message: "Replies cannot be nested" });
    }

    const detail = await portal.getCircleDetail(unionId, authorId, circle.id);
    expect(detail?.floor.find((m) => m.id === top.id)?.parentId).toBeUndefined();
    expect(detail?.floor.find((m) => m.id === reply.id)?.parentId).toBe(top.id);
  });
});
