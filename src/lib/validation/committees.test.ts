import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createCommitteeSchema,
  updateCommitteeSchema,
} from "@/lib/validation/committees";

const validCreate = {
  name: "Grievance",
  description: "Casework triage.",
  memberOfficerIds: ["off-003"],
};

describe("committee request schemas", () => {
  it("accepts a president-authored create body and rejects tenant identity keys", () => {
    expect(parseJsonBody(createCommitteeSchema, validCreate).ok).toBe(true);
    expect(
      parseJsonBody(createCommitteeSchema, {
        ...validCreate,
        unionId: "other-union",
        localId: "other-local",
      }).ok,
    ).toBe(false);
  });

  it("rejects empty name and extra keys", () => {
    expect(
      parseJsonBody(createCommitteeSchema, { ...validCreate, name: "" }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createCommitteeSchema, {
        ...validCreate,
        id: "com-forged",
      }).ok,
    ).toBe(false);
  });

  it("allows partial updates, nullable description, and still blocks mass-assigned tenant fields", () => {
    expect(
      parseJsonBody(updateCommitteeSchema, {
        description: null,
        memberOfficerIds: ["off-001"],
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(updateCommitteeSchema, {
        name: "Renamed",
        unionId: "other-union",
      }).ok,
    ).toBe(false);
  });
});
