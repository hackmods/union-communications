import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  defaultLadderPresetForBargainingUnitCode,
  patchActiveProfileLadder,
  resolveDisciplineLadder,
  resolveLadderPresetId,
} from "./discipline-ladder-presets";

describe("discipline ladder presets", () => {
  it("maps college bargaining-unit codes to college presets", () => {
    expect(defaultLadderPresetForBargainingUnitCode("ft")).toBe(
      "college-support-progressive",
    );
    expect(defaultLadderPresetForBargainingUnitCode("pt")).toBe(
      "college-support-progressive",
    );
    expect(defaultLadderPresetForBargainingUnitCode("academic")).toBe(
      "college-academic-progressive",
    );
    expect(defaultLadderPresetForBargainingUnitCode(undefined)).toBe(
      "generic-progressive-4",
    );
  });

  it("resolves preset labels via the label callback", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      local: {
        ...DEFAULT_BRAND_KIT.local,
        bargainingUnitCode: "academic",
      },
      profiles: [
        {
          id: "p1",
          label: "Faculty",
          localNumber: "243",
          subText: "Faculty",
          bargainingUnitCode: "academic",
        },
      ],
      activeProfileId: "p1",
    };
    expect(resolveLadderPresetId(kit)).toBe("college-academic-progressive");
    const resolved = resolveDisciplineLadder(kit, (key) => `L:${key}`);
    expect(resolved.isCustom).toBe(false);
    expect(resolved.rungs.map((r) => r.label)).toEqual([
      "L:coaching",
      "L:written",
      "L:suspension",
      "L:termination",
    ]);
  });

  it("prefers custom rungs on the active collection profile", () => {
    const kit = patchActiveProfileLadder(
      {
        ...DEFAULT_BRAND_KIT,
        profiles: [
          {
            id: "p1",
            label: "Support",
            localNumber: "243",
            subText: "Support",
            bargainingUnitCode: "ft",
          },
        ],
        activeProfileId: "p1",
      },
      {
        ladderPresetId: "ol-verbal-4",
        disciplineLadderCustom: {
          sourcePresetId: "ol-verbal-4",
          rungs: [
            { id: "a", label: "Coaching letter" },
            { id: "b", label: "Written" },
            { id: "c", label: "Short suspension" },
            { id: "d", label: "Discharge" },
          ],
        },
      },
    );
    const resolved = resolveDisciplineLadder(kit, (key) => key);
    expect(resolved.isCustom).toBe(true);
    expect(resolved.presetId).toBe("ol-verbal-4");
    expect(resolved.rungs[0]?.label).toBe("Coaching letter");
  });
});
