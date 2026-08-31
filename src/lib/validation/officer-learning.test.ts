import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  officerLearningLocalSettingsPutSchema,
  officerLearningMePutSchema,
} from "@/lib/validation/officer-learning";

const validMe = {
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
};

describe("officerLearningMePutSchema", () => {
  it("accepts a valid sync payload", () => {
    const parsed = parseJsonBody(officerLearningMePutSchema, validMe);
    expect(parsed.ok).toBe(true);
  });

  it("rejects tenant identity keys and unknown fields", () => {
    const parsed = parseJsonBody(officerLearningMePutSchema, {
      ...validMe,
      unionId: "other-union",
      userId: "forged",
    });
    expect(parsed.ok).toBe(false);
  });

  it("requires hub sync before sharing with the local", () => {
    const parsed = parseJsonBody(officerLearningMePutSchema, {
      ...validMe,
      hubSyncEnabled: false,
      shareWithLocal: true,
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects out-of-range scroll depth", () => {
    const parsed = parseJsonBody(officerLearningMePutSchema, {
      ...validMe,
      modules: {
        "module-1": {
          status: "in_progress",
          scrollDepth: 140,
          quizPassed: false,
        },
      },
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("officerLearningLocalSettingsPutSchema", () => {
  it("accepts reportingEnabled only", () => {
    expect(
      parseJsonBody(officerLearningLocalSettingsPutSchema, {
        reportingEnabled: true,
      }).ok,
    ).toBe(true);
  });

  it("rejects extra keys such as unionId", () => {
    expect(
      parseJsonBody(officerLearningLocalSettingsPutSchema, {
        reportingEnabled: true,
        unionId: "other-union",
      }).ok,
    ).toBe(false);
  });
});
