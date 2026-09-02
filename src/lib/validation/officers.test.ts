import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createOfficerRosterSchema,
  updateOfficerRosterSchema,
} from "@/lib/validation/officers";

const validCreate = {
  name: "Sam Okonkwo",
  role: "Secretary",
  termStart: "2026-09-01",
  termEnd: "2028-08-31",
  email: "secretary.243@unionops.test",
};

describe("officer roster request schemas", () => {
  it("accepts a president-authored create body and rejects tenant identity keys", () => {
    expect(parseJsonBody(createOfficerRosterSchema, validCreate).ok).toBe(true);
    expect(
      parseJsonBody(createOfficerRosterSchema, {
        ...validCreate,
        unionId: "other-union",
        localId: "other-local",
      }).ok,
    ).toBe(false);
  });

  it("rejects empty name, invalid dates, and extra keys", () => {
    expect(
      parseJsonBody(createOfficerRosterSchema, { ...validCreate, name: "" }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createOfficerRosterSchema, {
        ...validCreate,
        termStart: "yesterday",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createOfficerRosterSchema, {
        ...validCreate,
        id: "off-forged",
      }).ok,
    ).toBe(false);
  });

  it("allows partial updates, nullable optional fields, and still blocks mass-assigned tenant fields", () => {
    expect(
      parseJsonBody(updateOfficerRosterSchema, { email: null, termEnd: null }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(updateOfficerRosterSchema, {
        role: "Treasurer",
        unionId: "other-union",
      }).ok,
    ).toBe(false);
  });
});
