import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { applyIdentityPack, getIdentityPack } from "@/lib/brand/identity-packs";
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
      platesLabel: "Campaign plate",
      "plates.primary": "Coral plate",
      "plates.accent": "Gold plate",
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
      name: /College Support \(CAAT-S\)/,
    });
    expect(caatS).toHaveClass(
      "max-w-full",
      "min-w-0",
      "overflow-hidden",
      "w-[min(18rem,100%)]",
    );
    expect(caatS.className).not.toMatch(/min-w-\[14rem\]/);

    const description = screen.getByText(
      /Coral and gold bilingual College Support lockup preferred by many CAAT-S locals/,
    );
    expect(description).toHaveClass("break-words");
  });

  it("still offers both OPSEU Looks for College Support", () => {
    render(<IdentityPackPicker />);

    expect(
      screen.getByRole("radio", { name: /OPSEU \/ SEFPO blue/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /College Support \(CAAT-S\)/ }),
    ).toBeChecked();
  });

  it("lets a steward pick the gold campaign plate", () => {
    render(<IdentityPackPicker />);

    const gold = screen.getByRole("radio", { name: /Gold plate/ });
    expect(gold).toHaveAttribute("aria-checked", "false");
    fireEvent.click(gold);

    expect(useBrandStore.getState().brandKit.campaignPlate).toBe("accent");
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
