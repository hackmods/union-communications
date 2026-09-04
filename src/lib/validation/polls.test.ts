import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import {
  createPollSchema,
  submitPollResponseSchema,
  updatePollSchema,
} from "@/lib/validation/polls";

const validQuestion = {
  id: "q1",
  text: "Will you attend?",
  type: "single_choice" as const,
  options: ["Yes", "No"],
};

const validCreate = {
  slug: "meeting-rsvp",
  title: "Membership meeting RSVP",
  questions: [validQuestion],
};

describe("polls request schemas", () => {
  it("rejects tenant identity keys on create", () => {
    expect(parseJsonBody(createPollSchema, validCreate).ok).toBe(true);
    expect(
      parseJsonBody(createPollSchema, {
        ...validCreate,
        unionId: "union-other",
        localId: "local-evil",
      }).ok,
    ).toBe(false);
  });

  it("rejects single_choice without two options and extra update keys", () => {
    expect(
      parseJsonBody(createPollSchema, {
        ...validCreate,
        questions: [{ id: "q1", text: "Attend?", type: "single_choice" }],
      }).ok,
    ).toBe(false);
    expect(parseJsonBody(updatePollSchema, { status: "closed" }).ok).toBe(true);
    expect(
      parseJsonBody(updatePollSchema, {
        status: "closed",
        unionId: "union-other",
      }).ok,
    ).toBe(false);
  });

  it("rejects extra keys on public submit", () => {
    expect(
      parseJsonBody(submitPollResponseSchema, {
        answers: { q1: "Yes" },
        consentAccepted: true,
      }).ok,
    ).toBe(true);
    expect(
      parseJsonBody(submitPollResponseSchema, {
        answers: { q1: "Yes" },
        consentAccepted: true,
        ip: "1.2.3.4",
      }).ok,
    ).toBe(false);
  });
});
