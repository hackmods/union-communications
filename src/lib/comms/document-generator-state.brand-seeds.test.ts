import { describe, expect, it } from "vitest";
import { applyBrandKitFieldSeeds } from "@/lib/comms/document-generator-state";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import type { BrandKit } from "@/types/entities";

function kit(partial: Partial<BrandKit>): BrandKit {
  return { ...DEFAULT_BRAND_KIT, ...partial };
}

describe("applyBrandKitFieldSeeds", () => {
  it("overwrites demo steward name when overwriteNames is set", () => {
    const fields = applyBrandKitFieldSeeds(
      { stewardName: "Steward name", contactName: "Chief steward" },
      kit({
        signatureName: "Alex Steward",
        signatureTitle: "Local 110 Executive Committee",
        contactEmail: "local@example.org",
      }),
      { overwriteNames: true },
    );
    expect(fields.stewardName).toBe("Alex Steward");
    expect(fields.signatureTitle).toBe("Local 110 Executive Committee");
    expect(fields.contactName).toBe("Alex Steward");
  });

  it("fills placeholders without wiping user-edited values", () => {
    const fields = applyBrandKitFieldSeeds(
      {
        stewardName: "Pat Already",
        contactName: "Chief steward",
        stewardContact: "steward@example.org",
        officeEmail: "",
      },
      kit({
        signatureName: "Alex Steward",
        contactEmail: "local@example.org",
        contactPhone: "555-0100",
      }),
    );
    expect(fields.stewardName).toBe("Pat Already");
    expect(fields.contactName).toBe("Alex Steward");
    expect(fields.stewardContact).toBe("local@example.org · 555-0100");
    expect(fields.officeEmail).toBe("local@example.org");
  });

  it("composes letterhead contact from office lines when contactName is empty", () => {
    const fields = applyBrandKitFieldSeeds(
      { contactName: "" },
      kit({
        contactEmail: "local@example.org",
        contactPhone: "555-0100",
        contactAddress: "1 Union Hall",
      }),
    );
    expect(fields.contactName).toBe(
      "local@example.org · 555-0100 · 1 Union Hall",
    );
  });
});
