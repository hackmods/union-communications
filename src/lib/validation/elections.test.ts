import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createElectionCycleSchema,
  promoteToRosterSchema,
} from "@/lib/validation/elections";

describe("elections request schemas", () => {
  it("rejects tenant identity keys on create", () => {
    expect(
      parseJsonBody(createElectionCycleSchema, {
        title: "2026 Executive",
        positions: ["President"],
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(createElectionCycleSchema, {
        title: "2026 Executive",
        positions: ["President"],
        unionId: "union-other",
        localId: "local-evil",
      }).ok,
    ).toBe(false);
  });

  it("rejects tenant identity keys and empty names on promote", () => {
    expect(
      parseJsonBody(promoteToRosterSchema, {
        position: "President",
        nomineeName: "Alex Rivera",
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(promoteToRosterSchema, {
        position: "President",
        nomineeName: "Alex Rivera",
        unionId: "union-other",
        localId: "local-evil",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(promoteToRosterSchema, {
        position: "",
        nomineeName: "Alex Rivera",
      }).ok,
    ).toBe(false);
  });
});
