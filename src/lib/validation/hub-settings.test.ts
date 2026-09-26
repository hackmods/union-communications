import { describe, expect, it } from "vitest";
import { brandKitInputSchema, brandKitPutSchema } from "@/lib/validation/hub-settings";

const baseKit = {
  version: "2.0" as const,
  local: { number: "243" },
  primaryColor: "#D65B60",
  secondaryColor: "#FFFFFF",
  accentColor: "#9B0D1C",
  useOfficialLogo: true,
  updatedAt: "2026-09-25T00:00:00.000Z",
};

describe("brandKitInputSchema designTreatment", () => {
  it("accepts and retains designTreatment on Hub Brand Kit PUT bodies", () => {
    const parsed = brandKitInputSchema.parse({
      ...baseKit,
      designTreatment: "balanced",
    });
    expect(parsed.designTreatment).toBe("balanced");

    const put = brandKitPutSchema.parse({
      brandKit: { ...baseKit, designTreatment: "paper" },
    });
    expect(put.brandKit?.designTreatment).toBe("paper");
  });

  it("rejects unknown designTreatment values", () => {
    const result = brandKitInputSchema.safeParse({
      ...baseKit,
      designTreatment: "neon",
    });
    expect(result.success).toBe(false);
  });

  it("allows kits without designTreatment (legacy Full / omit)", () => {
    const parsed = brandKitInputSchema.parse(baseKit);
    expect(parsed.designTreatment).toBeUndefined();
  });
});
