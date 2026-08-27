import { describe, expect, it, beforeEach } from "vitest";
import {
  getOfficerLearningLocalSettings,
  getOfficerLearningUser,
  listSharedCompletionsForLocal,
  resetOfficerLearningHubStoreForTests,
  saveOfficerLearningLocalSettings,
  upsertOfficerLearningUser,
} from "./hub-store";
import { canManageOfficerLearningReport } from "./access";

describe("officer learning hub store", () => {
  beforeEach(() => {
    resetOfficerLearningHubStoreForTests();
  });

  it("hides shared rows until local reporting is enabled", () => {
    upsertOfficerLearningUser({
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

    expect(listSharedCompletionsForLocal("union-a", "local-1")).toEqual([]);

    saveOfficerLearningLocalSettings({
      unionId: "union-a",
      localId: "local-1",
      reportingEnabled: true,
      updatedById: "pres-1",
      updatedAt: new Date().toISOString(),
    });

    const rows = listSharedCompletionsForLocal("union-a", "local-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].displayName).toBe("Alex Steward");
    expect(rows[0].modules["module-1"]?.quizPassed).toBe(true);
  });

  it("requires hub sync before local share is meaningful", () => {
    upsertOfficerLearningUser({
      userId: "u2",
      unionId: "union-a",
      localId: "local-1",
      displayName: "Hidden",
      hubSyncEnabled: false,
      shareWithLocal: true,
      modules: {},
    });
    saveOfficerLearningLocalSettings({
      unionId: "union-a",
      localId: "local-1",
      reportingEnabled: true,
      updatedById: "pres-1",
      updatedAt: new Date().toISOString(),
    });
    expect(listSharedCompletionsForLocal("union-a", "local-1")).toEqual([]);
  });

  it("defaults local reporting to off", () => {
    expect(getOfficerLearningLocalSettings("union-a", "local-1").reportingEnabled).toBe(
      false,
    );
    expect(getOfficerLearningUser("union-a", "missing")).toBeNull();
  });
});

describe("officer learning access", () => {
  it("allows presidents and execs to manage reports", () => {
    expect(canManageOfficerLearningReport(["local_president"])).toBe(true);
    expect(canManageOfficerLearningReport(["local_exec"])).toBe(true);
    expect(canManageOfficerLearningReport(["local_steward"])).toBe(false);
  });
});
