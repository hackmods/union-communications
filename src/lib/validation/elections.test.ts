import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createElectionCycleSchema,
  createNominationSchema,
  promoteToRosterSchema,
  recordTalliesSchema,
  updateNominationSchema,
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

  it("rejects tenant identity keys, empty names, and illegal status on nominations", () => {
    expect(
      parseJsonBody(createNominationSchema, {
        position: "Secretary",
        nomineeName: "Lee Park",
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(createNominationSchema, {
        position: "Secretary",
        nomineeName: "Lee Park",
        unionId: "union-other",
        id: "nom-forged",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createNominationSchema, {
        position: "",
        nomineeName: "Lee Park",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(updateNominationSchema, { status: "accepted" }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(updateNominationSchema, {
        status: "winner",
        unionId: "union-other",
      }).ok,
    ).toBe(false);
  });

  it("rejects extra keys, fractional votes, and negatives on tally records", () => {
    expect(
      parseJsonBody(recordTalliesSchema, {
        tallies: [
          { position: "President", nomineeName: "Alex Rivera", votes: 12 },
        ],
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(recordTalliesSchema, {
        tallies: [
          { position: "President", nomineeName: "Alex Rivera", votes: -1 },
        ],
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(recordTalliesSchema, {
        tallies: [
          { position: "President", nomineeName: "Alex Rivera", votes: 1.5 },
        ],
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(recordTalliesSchema, {
        tallies: [
          { position: "President", nomineeName: "Alex Rivera", votes: 12 },
        ],
        unionId: "union-other",
      }).ok,
    ).toBe(false);
  });
});
