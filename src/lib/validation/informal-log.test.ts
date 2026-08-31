import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createInformalLogSchema,
  updateInformalLogSchema,
} from "@/lib/validation/informal-log";

const validCreate = {
  topic: "Overtime skipped",
  channel: "in_person" as const,
  summary: "Supervisor used the wrong list.",
  occurredAt: "2026-08-20T14:00:00.000Z",
};

describe("informal log request schemas", () => {
  it("accepts a steward-authored create body and rejects tenant identity keys", () => {
    expect(parseJsonBody(createInformalLogSchema, validCreate).ok).toBe(true);
    expect(
      parseJsonBody(createInformalLogSchema, {
        ...validCreate,
        unionId: "other-union",
        localId: "other-local",
        loggedById: "attacker",
      }).ok,
    ).toBe(false);
  });

  it("rejects empty topic, unknown channel, and non-ISO dates", () => {
    expect(
      parseJsonBody(createInformalLogSchema, { ...validCreate, topic: "" }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createInformalLogSchema, {
        ...validCreate,
        channel: "sms",
      }).ok,
    ).toBe(false);
    expect(
      parseJsonBody(createInformalLogSchema, {
        ...validCreate,
        occurredAt: "yesterday",
      }).ok,
    ).toBe(false);
  });

  it("allows partial updates and still blocks mass-assigned tenant fields", () => {
    expect(
      parseJsonBody(updateInformalLogSchema, { summary: "Updated note" }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(updateInformalLogSchema, {
        summary: "Updated note",
        unionId: "other-union",
        convertedToGrievanceId: "grev-forged",
      }).ok,
    ).toBe(false);
  });
});
