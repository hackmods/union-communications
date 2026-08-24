import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  CAAT_S_GOLD_PLATE_ID,
  applyIdentityPack,
  getIdentityPack,
} from "@/lib/brand/identity-packs";
import { useBrandStore } from "@/store/brand-store";
import type { BrandKit } from "@/types/entities";
import { IdentityPackPicker } from "./IdentityPackPicker";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const copy: Record<string, string> = {
      label: "Look",
      hint: "Pick the collective colours and lockup.",
      coloursDiffer: "Your colours no longer match this Look.",
      resetToPack: "Reset to Look colours",
      "packs.opseu-national.name": "OPSEU / SEFPO blue",
      "packs.opseu-national.description":
        "National blue lockup and mark — the default for most locals.",
      "packs.opseu-caat-s.name": "College Support (CAAT-S)",
      "packs.opseu-caat-s.description":
        "Coral and gold bilingual College Support lockup preferred by many CAAT-S locals.",
      "packs.opseu-caat-s.plates.coral.name": "College Support — coral",
      "packs.opseu-caat-s.plates.coral.description":
        "Coral campaign field with the white-and-gold College Support lockup.",
      "packs.opseu-caat-s.plates.gold.name": "College Support — gold",
      "packs.opseu-caat-s.plates.gold.description":
        "Gold campaign field with the white-and-coral College Support lockup.",
      "plates.coral": "Coral",
      "plates.gold": "Gold",
    };
    return copy[key] ?? key;
  },
}));

function seedOpseuCaatSKit() {
  const pack = getIdentityPack("opseu-caat-s")!;
  useBrandStore.setState({
    hydrated: true,
    brandKit: {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-support",
      ...applyIdentityPack(pack),
    } as BrandKit,
  });
}

describe("IdentityPackPicker layout", () => {
  beforeEach(() => {
    seedOpseuCaatSKit();
  });

  afterEach(() => {
    cleanup();
    useBrandStore.setState({ brandKit: DEFAULT_BRAND_KIT, hydrated: false });
  });

  it("keeps Look cards width-capped so CAAT-S copy wraps instead of overflowing", () => {
    render(<IdentityPackPicker />);

    const gallery = screen.getByTestId("identity-pack-gallery");
    expect(gallery).toHaveClass("min-w-0", "overflow-x-auto", "max-w-full");
    expect(gallery.className).toContain("min-w-0");

    const caatS = screen.getByRole("radio", {
      name: /College Support — coral/,
    });
    expect(caatS).toHaveClass(
      "max-w-full",
      "min-w-0",
      "overflow-hidden",
      "w-[min(18rem,100%)]",
    );
    expect(caatS.className).not.toMatch(/min-w-\[14rem\]/);

    const description = screen.getByText(
      /Coral campaign field with the white-and-gold College Support lockup/,
    );
    expect(description).toHaveClass("break-words");
  });

  it("offers national plus coral and gold as peer Look cards", () => {
    render(<IdentityPackPicker />);

    expect(
      screen.getByRole("radio", { name: /OPSEU \/ SEFPO blue/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /College Support — coral/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /College Support — gold/ }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("campaign-plate-picker")).not.toBeInTheDocument();
  });

  it("lets a steward pick gold from the Look gallery in one click", () => {
    render(<IdentityPackPicker />);

    const gold = screen.getByRole("radio", { name: /College Support — gold/ });
    expect(gold).toHaveAttribute("aria-checked", "false");
    fireEvent.click(gold);

    expect(useBrandStore.getState().brandKit.campaignPlate).toBe(
      CAAT_S_GOLD_PLATE_ID,
    );
    expect(useBrandStore.getState().brandKit.primaryColor).toBe("#FFB837");
    expect(useBrandStore.getState().brandKit.accentColor).toBe("#EA5A4F");
    expect(gold).toHaveAttribute("aria-checked", "true");
  });
});

describe("IdentityPackPicker overflow guards", () => {
  it("does not use unbounded min-width on Look cards", () => {
    const source = readFileSync(
      join(__dirname, "IdentityPackPicker.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/min-w-\[14rem\]/);
    expect(source).toMatch(/w-\[min\(18rem,100%\)\]/);
    expect(source).toMatch(/data-testid="identity-pack-gallery"/);
    expect(source).toMatch(/break-words/);
    expect(source).toMatch(/max-w-full/);
  });
});
