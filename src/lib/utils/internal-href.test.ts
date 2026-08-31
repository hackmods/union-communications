import { describe, expect, it } from "vitest";
import { withTrailingSlash } from "./internal-href";

describe("withTrailingSlash", () => {
  it("adds a slash before a query string", () => {
    expect(withTrailingSlash("/tools/qr-card?preset=joinUnion")).toBe(
      "/tools/qr-card/?preset=joinUnion",
    );
    expect(withTrailingSlash("/tools/document-generator?preset=grievance-intake")).toBe(
      "/tools/document-generator/?preset=grievance-intake",
    );
  });

  it("leaves paths that already end with a slash", () => {
    expect(withTrailingSlash("/guide/print/?foo=bar")).toBe("/guide/print/?foo=bar");
  });

  it("adds a trailing slash to plain paths", () => {
    expect(withTrailingSlash("/guide/print")).toBe("/guide/print/");
  });

  it("preserves hash fragments", () => {
    expect(withTrailingSlash("/guide/steward-101#step-1")).toBe(
      "/guide/steward-101/#step-1",
    );
  });

  it("passes through external URLs", () => {
    expect(withTrailingSlash("https://unionops.org/en/guide/")).toBe(
      "https://unionops.org/en/guide/",
    );
  });
});
