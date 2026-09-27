import { describe, expect, it } from "vitest";
import {
  fromExclusiveEndBoundary,
  isSubprocessorPublishable,
  toExclusiveEndBoundary,
  toSubprocessorPublicProjection,
} from "@/lib/site-admin/subprocessor-registry";

const activeReviewedRecord = {
  id: "processor-1",
  serviceName: "Verified service",
  purpose: { en: "Send transactional email", fr: "Envoi de courriels transactionnels" },
  dataCategories: { en: ["account contact details"], fr: ["coordonnées du compte"] },
  dataSubjects: { en: ["account holders"], fr: ["titulaires de compte"] },
  publicNotes: { en: "", fr: "" },
  processingRegion: "Canada",
  transferStatus: "within_canada" as const,
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null,
  reviewStatus: "approved" as const,
  publicDisclosureApproved: true,
  reviewedBy: "reviewer-2",
  reviewedAt: new Date("2026-02-01T00:00:00.000Z"),
  verificationEvidence: "Provider security review completed",
  createdBy: "operator-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedBy: "operator-1",
  updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  reviewOwner: "privacy officer",
  dpaStatus: "under_review" as const,
  internalNotes: "Internal assessment only",
};

describe("subprocessor registry publication boundary", () => {
  it("requires a second-person approval and an active effective period", () => {
    expect(isSubprocessorPublishable(activeReviewedRecord, new Date("2026-06-01"))).toBe(true);
    expect(isSubprocessorPublishable({ ...activeReviewedRecord, reviewedBy: "operator-1" }, new Date("2026-06-01"))).toBe(false);
    expect(isSubprocessorPublishable({ ...activeReviewedRecord, updatedBy: "reviewer-2" }, new Date("2026-06-01"))).toBe(false);
    expect(isSubprocessorPublishable({ ...activeReviewedRecord, publicDisclosureApproved: false }, new Date("2026-06-01"))).toBe(false);
    expect(isSubprocessorPublishable({ ...activeReviewedRecord, effectiveFrom: new Date("2027-01-01") }, new Date("2026-06-01"))).toBe(false);
    expect(isSubprocessorPublishable({ ...activeReviewedRecord, effectiveTo: new Date("2026-05-01") }, new Date("2026-06-01"))).toBe(false);
  });

  it("copies only the approved public fields into the public projection", () => {
    const projection = toSubprocessorPublicProjection(activeReviewedRecord);
    expect(projection).toMatchObject({ id: "processor-1", serviceName: "Verified service" });
    expect(projection).not.toHaveProperty("internalNotes");
    expect(projection).not.toHaveProperty("reviewOwner");
    expect(projection).not.toHaveProperty("dpaStatus");
    expect(projection).not.toHaveProperty("reviewedBy");
  });

  it("stores inclusive end dates as the next UTC midnight boundary", () => {
    expect(toExclusiveEndBoundary("2026-06-30")).toBe("2026-07-01T00:00:00.000Z");
    expect(fromExclusiveEndBoundary(new Date("2026-07-01T00:00:00.000Z"))).toBe("2026-06-30");
  });
});
