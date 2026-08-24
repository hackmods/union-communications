import { describe, expect, it } from "vitest";
import { portalStore } from "@/lib/portal/memory-adapter";

const UNION = "union-opseu";
const HALL = "circle-hall-243";
const LEC = "circle-lec-243";

describe("portal circle-scoped mutations (IDOR guards)", () => {
  it("rejects comments on bulletin posts in another Circle", () => {
    const post = portalStore.addBulletin({
      circleId: LEC,
      unionId: UNION,
      authorId: "user-president-243",
      authorName: "President",
      title: "LEC only",
      body: "Private to LEC",
    });

    const comment = portalStore.addComment({
      circleId: HALL,
      unionId: UNION,
      postId: post.id,
      authorId: "user-member-243",
      authorName: "Member",
      body: "Cross-circle comment",
    });

    expect(comment).toBeNull();
  });

  it("rejects completing actions from another Circle", () => {
    const action = portalStore.addAction({
      circleId: LEC,
      unionId: UNION,
      listName: "Actions",
      title: "LEC task",
      createdById: "user-president-243",
    });

    expect(
      portalStore.completeAction(action.id, HALL, UNION),
    ).toBeNull();
    expect(portalStore.completeAction(action.id, LEC, UNION)).not.toBeNull();
  });

  it("rejects soft-delete on resources outside the route Circle", () => {
    const post = portalStore.addBulletin({
      circleId: LEC,
      unionId: UNION,
      authorId: "user-president-243",
      authorName: "President",
      title: "Do not delete from Hall",
      body: "Still here",
    });

    expect(
      portalStore.softDelete(
        "bulletin",
        post.id,
        HALL,
        UNION,
        "user-member-243",
      ),
    ).toBe(false);

    expect(
      portalStore.softDelete(
        "bulletin",
        post.id,
        LEC,
        UNION,
        "user-president-243",
      ),
    ).toBe(true);
  });

  it("rejects pipeline card writes for boards in another Circle", () => {
    const board = portalStore.ensurePipelineBoard({
      circleId: LEC,
      unionId: UNION,
    });
    expect(board).not.toBeNull();
    const detail = portalStore.getCircleDetail(
      UNION,
      "user-president-243",
      LEC,
    );
    const columnId = detail?.pipelineColumns[0]?.id;
    expect(columnId).toBeTruthy();

    expect(
      portalStore.addPipelineCard({
        circleId: HALL,
        unionId: UNION,
        boardId: board!.id,
        columnId: columnId!,
        title: "Sneak card",
      }),
    ).toBeNull();
  });

  it("rejects roll-call answers when question belongs to another Circle", () => {
    const question = portalStore.addRollCallQuestion({
      circleId: LEC,
      unionId: UNION,
      question: "LEC check-in",
      cadence: "weekly",
    });

    expect(
      portalStore.addRollCallAnswer({
        questionId: question.id,
        circleId: HALL,
        authorId: "user-member-243",
        authorName: "Member",
        body: "Wrong circle",
      }),
    ).toBeNull();
  });

  it("rejects pin on bulletin posts outside the Circle", () => {
    const post = portalStore.addBulletin({
      circleId: LEC,
      unionId: UNION,
      authorId: "user-president-243",
      authorName: "President",
      title: "Pin target",
      body: "Body",
    });

    expect(portalStore.pinBulletin(post.id, HALL, UNION, true)).toBeNull();
    expect(portalStore.pinBulletin(post.id, LEC, UNION, true)).not.toBeNull();
  });

  it("rejects momentum updates for items in another Circle", () => {
    const item = portalStore.upsertMomentum({
      circleId: LEC,
      unionId: UNION,
      title: "LEC progress",
      progress: 10,
      updatedById: "user-president-243",
      updatedByName: "President",
    });

    const cross = portalStore.upsertMomentum({
      id: item.id,
      circleId: HALL,
      unionId: UNION,
      title: "Hijacked",
      progress: 99,
      updatedById: "user-member-243",
      updatedByName: "Member",
    });

    expect(cross).toBeNull();
    const detail = portalStore.getCircleDetail(
      UNION,
      "user-president-243",
      LEC,
    );
    expect(detail?.momentum.find((m) => m.id === item.id)?.progress).toBe(10);
  });
});
