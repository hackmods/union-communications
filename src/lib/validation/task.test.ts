import { describe, expect, it } from "vitest";
import { parseJsonBody } from "@/lib/validation/parse";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/task";

const validCreate = {
  title: "Prep Step 2 notes",
};

describe("task request schemas", () => {
  it("accepts a steward-authored create body and rejects tenant identity keys", () => {
    expect(parseJsonBody(createTaskSchema, validCreate).ok).toBe(true);
    expect(
      parseJsonBody(createTaskSchema, {
        ...validCreate,
        unionId: "other-union",
        localId: "other-local",
        createdById: "attacker",
      }).ok,
    ).toBe(false);
  });

  it("rejects an empty title and a non-ISO due date", () => {
    expect(parseJsonBody(createTaskSchema, { title: "" }).ok).toBe(false);
    expect(
      parseJsonBody(createTaskSchema, {
        ...validCreate,
        dueAt: "tomorrow",
      }).ok,
    ).toBe(false);
  });

  it("allows partial updates and still blocks mass-assigned tenant fields", () => {
    expect(parseJsonBody(updateTaskSchema, { status: "done" }).ok).toBe(true);
    expect(
      parseJsonBody(updateTaskSchema, {
        title: "Updated",
        unionId: "other-union",
        createdById: "attacker",
      }).ok,
    ).toBe(false);
  });
});
