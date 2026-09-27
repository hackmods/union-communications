import { describe, expect, it } from "vitest";
import {
  incidentStepUpSchema,
  platformIncidentCreateSchema,
  platformIncidentUpdateSchema,
} from "@/lib/site-admin/incident-validation";

const validFields = {
  kind: "privacy",
  occurredAt: null,
  discoveredAt: "2026-09-27T14:30:00.000Z",
  affectedSystem: "Hosted Hub",
  dataCategories: ["Account profile"],
  affectedPartyCategories: ["members", "unknown"],
  affectedIndividualEstimate: null,
  lastReviewedAt: null,
  severity: "high",
  scopeSummary: "A limited service event is under investigation.",
  containmentSummary: "Affected integration disabled.",
  riskAssessment: "Scope is being verified.",
  notificationDecision: "not_assessed",
  notificationDecisionAt: null,
  notificationRationale: "Awaiting the documented risk assessment.",
  remediationSummary: "Recovery work is in progress.",
  lessonsLearned: "Review after containment.",
};

describe("restricted incident register validation", () => {
  it("accepts a bounded incident record and only opens it on creation", () => {
    const created = platformIncidentCreateSchema.safeParse({ ...validFields, status: "open" });
    expect(created.success).toBe(true);
    if (created.success) expect(created.data.discoveredAt).toBeInstanceOf(Date);
    expect(platformIncidentCreateSchema.safeParse({ ...validFields, status: "closed" }).success).toBe(false);
  });

  it("rejects unknown fields, invalid classifications, and oversized narrative", () => {
    expect(platformIncidentUpdateSchema.safeParse({ ...validFields, status: "open", password: "secret" }).success).toBe(false);
    expect(platformIncidentUpdateSchema.safeParse({ ...validFields, status: "open", severity: "urgent" }).success).toBe(false);
    expect(platformIncidentUpdateSchema.safeParse({ ...validFields, status: "open", scopeSummary: "x".repeat(5001) }).success).toBe(false);
    expect(platformIncidentUpdateSchema.safeParse({ ...validFields, status: "open", notificationDecision: "required" }).success).toBe(false);
  });

  it("binds step-up challenges to exactly the actions that need a resource id", () => {
    const code = "123456";
    const id = "75f1d25a-7a6f-49f1-bb98-c4abc3ef2401";
    expect(incidentStepUpSchema.safeParse({ code, action: "view" }).success).toBe(true);
    expect(incidentStepUpSchema.safeParse({ code, action: "update", resourceId: id }).success).toBe(true);
    expect(incidentStepUpSchema.safeParse({ code, action: "update" }).success).toBe(false);
    expect(incidentStepUpSchema.safeParse({ code, action: "view", resourceId: id }).success).toBe(false);
    expect(incidentStepUpSchema.safeParse({ code: "12345", action: "view" }).success).toBe(false);
  });

  it("rejects occurrence and notification decisions dated after or before their valid timeline", () => {
    expect(platformIncidentCreateSchema.safeParse({
      ...validFields,
      occurredAt: "2026-09-27T15:30:00.000Z",
      status: "open",
    }).success).toBe(false);
    expect(platformIncidentUpdateSchema.safeParse({
      ...validFields,
      status: "open",
      notificationDecision: "required",
      notificationDecisionAt: "2026-09-27T13:30:00.000Z",
    }).success).toBe(false);
  });
});
