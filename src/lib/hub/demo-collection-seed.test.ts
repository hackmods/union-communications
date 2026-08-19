import { describe, expect, it } from "vitest";
import { checkinsStore } from "@/lib/checkins/store";
import { discussionsStore } from "@/lib/discussions/store";
import { grievanceStore } from "@/lib/grievance/store";
import { informalLogStore } from "@/lib/informal-log/store";
import { snippetStore } from "@/lib/snippets/memory-adapter";
import { taskStore } from "@/lib/tasks/store";

const unionId = "union-opseu";
const localId = "local-243";

describe("demo collection seeds (FT vs PT)", () => {
  it("keeps PT-only casework off the FT collection filter", async () => {
    const [grievances, tasks, logs, snippets, threads, checkins] =
      await Promise.all([
        grievanceStore.list({ unionId, localId, bargainingUnitId: "bu-243-ft" }),
        taskStore.list({ unionId, localId, bargainingUnitId: "bu-243-ft" }),
        informalLogStore.list({
          unionId,
          localId,
          bargainingUnitId: "bu-243-ft",
        }),
        snippetStore.list({
          unionId,
          localId,
          bargainingUnitId: "bu-243-ft",
        }),
        discussionsStore.listThreads({
          unionId,
          localId,
          bargainingUnitId: "bu-243-ft",
        }),
        checkinsStore.listSchedules({
          unionId,
          localId,
          bargainingUnitId: "bu-243-ft",
        }),
      ]);

    expect(grievances.map((g) => g.id)).toContain("grev-001");
    expect(grievances.map((g) => g.id)).not.toContain("grev-002");
    expect(tasks.map((t) => t.id)).toContain("task-001");
    expect(tasks.map((t) => t.id)).not.toContain("task-004");
    expect(logs.map((e) => e.id)).toContain("ilog-001");
    expect(logs.map((e) => e.id)).not.toContain("ilog-003");
    expect(snippets.map((s) => s.id)).toContain("snip-001");
    expect(snippets.map((s) => s.id)).not.toContain("snip-002");
    expect(snippets.map((s) => s.id)).not.toContain("snip-004");
    expect(threads.map((t) => t.id)).toContain("disc-thread-002");
    expect(threads.map((t) => t.id)).not.toContain("disc-thread-003");
    expect(checkins.map((s) => s.id)).toContain("checkin-sched-001");
    expect(checkins.map((s) => s.id)).not.toContain("checkin-sched-003");
  });

  it("shows distinct PT Support examples when the PT collection is active", async () => {
    const [grievances, tasks, logs, snippets, threads, checkins, grev] =
      await Promise.all([
        grievanceStore.list({ unionId, localId, bargainingUnitId: "bu-243-pt" }),
        taskStore.list({ unionId, localId, bargainingUnitId: "bu-243-pt" }),
        informalLogStore.list({
          unionId,
          localId,
          bargainingUnitId: "bu-243-pt",
        }),
        snippetStore.list({
          unionId,
          localId,
          bargainingUnitId: "bu-243-pt",
        }),
        discussionsStore.listThreads({
          unionId,
          localId,
          bargainingUnitId: "bu-243-pt",
        }),
        checkinsStore.listSchedules({
          unionId,
          localId,
          bargainingUnitId: "bu-243-pt",
        }),
        grievanceStore.getById("grev-002"),
      ]);

    expect(grievances.map((g) => g.id)).toEqual(["grev-002"]);
    expect(tasks.map((t) => t.id)).toContain("task-004");
    expect(tasks.map((t) => t.id)).not.toContain("task-001");
    expect(logs.map((e) => e.id)).toContain("ilog-003");
    expect(logs.map((e) => e.id)).not.toContain("ilog-001");
    expect(snippets.map((s) => s.id)).toEqual(
      expect.arrayContaining(["snip-002", "snip-003", "snip-004"]),
    );
    expect(snippets.map((s) => s.id)).not.toContain("snip-001");
    expect(threads.map((t) => t.id)).toEqual(["disc-thread-003"]);
    expect(checkins.map((s) => s.id)).toEqual(["checkin-sched-003"]);

    expect(grev?.notes.some((n) => n.id === "note-002")).toBe(true);
    expect(grev?.communications?.some((c) => c.id === "comm-002")).toBe(true);
    expect(grev?.meetings?.some((m) => m.id === "meet-002")).toBe(true);

    const ptTask = tasks.find((t) => t.id === "task-004");
    expect(ptTask?.relatedGrievanceId).toBe("grev-002");
    expect(ptTask?.assigneeId).toBe("user-steward-243-pt");

    const hoursLog = logs.find((e) => e.id === "ilog-003");
    expect(hoursLog?.topic).toMatch(/additional hours/i);

    const hoursSnippet = snippets.find((s) => s.id === "snip-004");
    expect(hoursSnippet?.title).toMatch(/additional hours/i);

    const ptCheckin = checkins[0];
    expect(ptCheckin?.question).toMatch(/additional-hours/i);
  });

  it("keeps local-wide rows visible in both collections", async () => {
    const [ftTasks, ptTasks] = await Promise.all([
      taskStore.list({ unionId, localId, bargainingUnitId: "bu-243-ft" }),
      taskStore.list({ unionId, localId, bargainingUnitId: "bu-243-pt" }),
    ]);
    expect(ftTasks.map((t) => t.id)).toContain("task-002");
    expect(ptTasks.map((t) => t.id)).toContain("task-002");
  });
});
