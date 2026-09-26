import { describe, expect, it } from "vitest";
import {
  mapScopeApiError,
  readApiErrorMessage,
  readMappedScopeApiError,
} from "@/lib/hub/parse-api-error";

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

describe("readApiErrorMessage", () => {
  it("uses a trimmed JSON error and falls back for empty or non-JSON bodies", async () => {
    expect(
      await readApiErrorMessage(
        new Response(JSON.stringify({ error: "  Union required  " }), {
          headers: { "content-type": "application/json" },
        }),
        "fallback",
      ),
    ).toBe("Union required");

    expect(
      await readApiErrorMessage(
        new Response(JSON.stringify({ error: "   " }), {
          headers: { "content-type": "application/json" },
        }),
        "fallback",
      ),
    ).toBe("fallback");

    expect(await readApiErrorMessage(new Response("not-json"), "fallback")).toBe(
      "fallback",
    );
  });
});

describe("readMappedScopeApiError", () => {
  const t = (key: "writeNoUnion" | "writeNoLocal") =>
    key === "writeNoUnion" ? "No union assigned" : "No local assigned";

  it("maps a JSON union-required body to the steward i18n string", async () => {
    expect(
      await readMappedScopeApiError(
        new Response(JSON.stringify({ error: "Union required" }), {
          headers: { "content-type": "application/json" },
        }),
        "fallback",
        t,
      ),
    ).toBe("No union assigned");
  });
});
