import { describe, expect, it } from "vitest";
import { mapScopeApiError } from "@/lib/hub/parse-api-error";

describe("mapScopeApiError", () => {
  const t = (key: "writeNoUnion" | "writeNoLocal") =>
    key === "writeNoUnion" ? "No union assigned" : "No local assigned";

  it("maps union required/missing to writeNoUnion", () => {
    expect(mapScopeApiError("Union required", t)).toBe("No union assigned");
    expect(mapScopeApiError("Missing union context", t)).toBe("No union assigned");
  });

  it("maps local required/membership to writeNoLocal", () => {
    expect(mapScopeApiError("Local required", t)).toBe("No local assigned");
    expect(mapScopeApiError("An active local membership is required", t)).toBe(
      "No local assigned",
    );
  });

  it("leaves unrelated messages unchanged", () => {
    expect(mapScopeApiError("Forbidden", t)).toBe("Forbidden");
    expect(mapScopeApiError("Slug already taken", t)).toBe("Slug already taken");
  });
});
