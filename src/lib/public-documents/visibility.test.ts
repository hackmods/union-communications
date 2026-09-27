import { describe, expect, it } from "vitest";
import {
  isInternalDocumentPayload,
  isPublicDocumentPayload,
  validateDocumentVisibility,
} from "./visibility";

describe("managed document visibility", () => {
  it("keeps legacy records public when visibility is omitted", () => {
    expect(isPublicDocumentPayload({})).toBe(true);
    expect(isInternalDocumentPayload({})).toBe(false);
  });

  it("separates explicit public and internal records", () => {
    expect(isPublicDocumentPayload({ visibility: "public" })).toBe(true);
    expect(isInternalDocumentPayload({ visibility: "internal" })).toBe(true);
    expect(isPublicDocumentPayload({ visibility: "internal" })).toBe(false);
  });

  it("fails closed for malformed explicit visibility values", () => {
    expect(isPublicDocumentPayload({ visibility: "private" })).toBe(false);
    expect(isPublicDocumentPayload({ visibility: null })).toBe(false);
  });

  it("allows internal operating documents only as non-required policy drafts", () => {
    const draft = {
      visibility: "internal",
      kind: "policy",
      status: "draft",
      requiresAcceptance: false,
      required: false,
    };
    expect(validateDocumentVisibility(draft)).toBeNull();
    expect(validateDocumentVisibility({ ...draft, status: "published" })).toContain("policy drafts");
    expect(validateDocumentVisibility({ ...draft, kind: "file" })).toContain("policy drafts");
    expect(validateDocumentVisibility({ ...draft, requiresAcceptance: true })).toContain("policy drafts");
    expect(validateDocumentVisibility({ ...draft, required: true })).toContain("policy drafts");
  });

  it("keeps omitted legacy visibility eligible for public publication", () => {
    expect(validateDocumentVisibility({ kind: "policy", status: "published" })).toBeNull();
  });
});
