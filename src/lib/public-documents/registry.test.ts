import { describe, expect, it } from "vitest";
import { localizedPublicDocument, PUBLIC_DOCUMENTS } from "./registry";

describe("public document registry", () => {
  it("has unique stable slugs and a provenance/hosting record for each item", () => {
    expect(new Set(PUBLIC_DOCUMENTS.map((doc) => doc.slug)).size).toBe(PUBLIC_DOCUMENTS.length);
    for (const doc of PUBLIC_DOCUMENTS) {
      expect(doc.purpose).toBeTruthy();
      expect(doc.audience).toBeTruthy();
      expect(doc.owner).toBeTruthy();
      expect(doc.source).toBeTruthy();
      expect(doc.hosting).toBeTruthy();
      if (doc.externalUrl) expect(doc.externalUrl.startsWith("https://")).toBe(true);
      if (doc.file) expect(doc.hosting).toBe("UnionOps");
    }
  });

  it("localizes the public catalogue and keeps baseline policy routes stable", () => {
    expect(localizedPublicDocument("privacy", "fr")?.title).toBe("Politique de confidentialité");
    expect(localizedPublicDocument("privacy", "en")?.title).toBe("Privacy policy");
    expect(localizedPublicDocument("not-a-document", "en")).toBeUndefined();
  });
});
