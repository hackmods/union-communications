import { describe, expect, it, beforeEach } from "vitest";
import {
  getOfficerLearningLocalSettings,
  getOfficerLearningUser,
  listSharedCompletionsForLocal,
  resetOfficerLearningHubStoreForTests,
  saveOfficerLearningLocalSettings,
  upsertOfficerLearningUser,
} from "./hub-store";
import {
  canManageOfficerLearningReport,
  canSyncOfficerLearning,
} from "./access";
import { officerLearningDbBackend } from "@/lib/db/backend";

describe("officer learning hub store", () => {
  beforeEach(() => {
    resetOfficerLearningHubStoreForTests();
  });

  it("hides shared rows until local reporting is enabled", async () => {
    await upsertOfficerLearningUser({
      userId: "u1",
      unionId: "union-a",
      localId: "local-1",
      displayName: "Alex Steward",
      hubSyncEnabled: true,
      shareWithLocal: true,
      modules: {
        "module-1": {
          status: "completed",
          scrollDepth: 100,
          quizPassed: true,
        },
      },
    });

    expect(await listSharedCompletionsForLocal("union-a", "local-1")).toEqual([]);

    await saveOfficerLearningLocalSettings({
      unionId: "union-a",
      localId: "local-1",
      reportingEnabled: true,
      updatedById: "pres-1",
      updatedAt: new Date().toISOString(),
    });

    const rows = await listSharedCompletionsForLocal("union-a", "local-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].displayName).toBe("Alex Steward");
    expect(rows[0].modules["module-1"]?.quizPassed).toBe(true);
  });

  it("requires hub sync before local share is meaningful", async () => {
    await upsertOfficerLearningUser({
      userId: "u2",
      unionId: "union-a",
      localId: "local-1",
      displayName: "Hidden",
      hubSyncEnabled: false,
      shareWithLocal: true,
      modules: {},
    });
    await saveOfficerLearningLocalSettings({
      unionId: "union-a",
      localId: "local-1",
      reportingEnabled: true,
      updatedById: "pres-1",
      updatedAt: new Date().toISOString(),
    });
    expect(await listSharedCompletionsForLocal("union-a", "local-1")).toEqual([]);
  });

  it("defaults local reporting to off", async () => {
    expect(
      (await getOfficerLearningLocalSettings("union-a", "local-1")).reportingEnabled,
    ).toBe(false);
    expect(await getOfficerLearningUser("union-a", "missing")).toBeNull();
  });

  it("never lists completions from another union, even with a matching localId", async () => {
    await saveOfficerLearningLocalSettings({
      unionId: "union-a",
      localId: "local-1",
      reportingEnabled: true,
      updatedById: "pres-1",
      updatedAt: new Date().toISOString(),
    });
    await upsertOfficerLearningUser({
      userId: "u-b",
      unionId: "union-b",
      localId: "local-1",
      displayName: "Other union",
      hubSyncEnabled: true,
      shareWithLocal: true,
      modules: {
        "module-1": { status: "completed", scrollDepth: 100, quizPassed: true },
      },
    });

    expect(await listSharedCompletionsForLocal("union-a", "local-1")).toEqual(
      [],
    );
  });

  it("never lists completions from another local in the same union", async () => {
    await saveOfficerLearningLocalSettings({
      unionId: "union-a",
      localId: "local-1",
      reportingEnabled: true,
      updatedById: "pres-1",
      updatedAt: new Date().toISOString(),
    });
    await upsertOfficerLearningUser({
      userId: "u-other-local",
      unionId: "union-a",
      localId: "local-2",
      displayName: "Other local",
      hubSyncEnabled: true,
      shareWithLocal: true,
      modules: {
        "module-1": { status: "completed", scrollDepth: 100, quizPassed: true },
      },
    });

    expect(await listSharedCompletionsForLocal("union-a", "local-1")).toEqual(
      [],
    );
  });
});

describe("officer learning access", () => {
  it("allows presidents and execs to manage reports", () => {
    expect(canManageOfficerLearningReport(["local_president"])).toBe(true);
    expect(canManageOfficerLearningReport(["local_exec"])).toBe(true);
    expect(canManageOfficerLearningReport(["union_admin"])).toBe(true);
    expect(canManageOfficerLearningReport(["local_steward"])).toBe(false);
    expect(canManageOfficerLearningReport([])).toBe(false);
  });

  it("lets any signed-in role sync personal progress", () => {
    expect(canSyncOfficerLearning(["local_steward"])).toBe(true);
    expect(canSyncOfficerLearning(["local_member"])).toBe(true);
    expect(canSyncOfficerLearning([])).toBe(false);
  });
});

describe("officer learning backend flag", () => {
  it("defaults to memory without DATABASE_URL", () => {
    expect(officerLearningDbBackend({})).toBe("memory");
    expect(
      officerLearningDbBackend({ OFFICER_LEARNING_DB_BACKEND: "postgres" }),
    ).toBe("memory");
  });

  it("resolves postgres when DATABASE_URL is set", () => {
    expect(
      officerLearningDbBackend({
        DATABASE_URL: "postgres://localhost/unionops",
        OFFICER_LEARNING_DB_BACKEND: "postgres",
      }),
    ).toBe("postgres");
  });
});
