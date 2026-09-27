import { describe, expect, it } from "vitest";
import { hasPublishedContractDocument } from "./contract-routes";

const current = {
  payload: {
    kind: "policy",
    humanApproved: true,
    effectiveAt: "2026-09-01T00:00:00.000Z",
    content: { en: "Current English terms", fr: "Conditions actuelles" },
  },
};

describe("contract document availability", () => {
  it("opens only approved, effective, bilingual managed policy text", () => {
    expect(
      hasPublishedContractDocument(current, new Date("2026-09-27T12:00:00Z")),
    ).toBe(true);
  });

  it("keeps drafts, unpublished records, and incomplete policies out of the effective path", () => {
    expect(hasPublishedContractDocument(null)).toBe(false);
    expect(hasPublishedContractDocument({ unpublished: true })).toBe(false);
    expect(
      hasPublishedContractDocument({
        ...current,
        payload: { ...current.payload, humanApproved: false },
      }),
    ).toBe(false);
    expect(
      hasPublishedContractDocument({
        ...current,
        payload: { ...current.payload, effectiveAt: "not-a-date" },
      }),
    ).toBe(false);
    expect(
      hasPublishedContractDocument(
        {
          ...current,
          payload: { ...current.payload, effectiveAt: "2026-10-01T00:00:00.000Z" },
        },
        new Date("2026-09-27T12:00:00Z"),
      ),
    ).toBe(false);
    expect(
      hasPublishedContractDocument({
        ...current,
        payload: { ...current.payload, content: { en: "Draft", fr: " " } },
      }),
    ).toBe(false);
  });
});
