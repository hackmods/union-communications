import { test, expect } from "@playwright/test";
import { LAYOUT_CLASS_QR_BOARD } from "../src/lib/comms/layout-class-matrix";
import { seedCanvasFonts } from "./helpers/canvas-fonts";
import {
  enableShowUrl,
  expectPlateGeometry,
  expectPresetSelected,
  expectPreviewFitsColumn,
  expectUrlLayout,
  measurePlateFill,
  measurePreviewFit,
  measureUrlLayout,
  openPreviewTab,
  selectPrintSize,
  waitForQrPreview,
} from "./helpers/canvas-layout";

const LONG_URL =
  "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees";

test.describe("QR share URL captions @smoke", () => {
  test("qr-card cold load shows Get support plate copy", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-card/");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "getSupport");
    await waitForQrPreview(page);
    const root = page.locator("[data-export-root]");
    await expect(root.getByText(/Get support/i)).toBeVisible();
    expectPlateGeometry(await measurePlateFill(page), {
      label: "qr-card-cold",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "qr-card-cold");
  });

  test("qr-board cold load shows Membership application title", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-board/");
    await expect(
      page.getByRole("heading", { name: "QR Board Poster Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "membershipFtPt");
    await waitForQrPreview(page);
    const root = page.locator("[data-export-root]");
    await expect(
      root.getByText(/Membership application/i),
    ).toBeVisible();
    expectPlateGeometry(await measurePlateFill(page), {
      label: "qr-board-cold",
      slots: 2,
      minImgPx: 72,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "qr-board-cold");
  });

  test("qr-card shows wrapped URL below QR and scales with size", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-card/?preset=getSupport");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "getSupport");

    await enableShowUrl(page, /Show URL under tagline/i);
    await page.getByLabel(/Link or text to encode/i).fill(LONG_URL);

    const root = await waitForQrPreview(page);
    await expect(root.locator("[data-canvas-url]")).toBeVisible();
    await expect(root.locator("[data-canvas-url]")).toContainText("ontario.ca");
    await expect(root.locator("[data-canvas-url]")).not.toHaveCSS(
      "text-overflow",
      "ellipsis",
    );

    const quarter = await measureUrlLayout(page);
    expectUrlLayout(quarter, { urlCount: 1, label: "quarter" });
    expect(quarter.minFontPx).toBeGreaterThanOrEqual(9);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "quarter",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "quarter");

    const quarterBox = await root.boundingBox();
    expect(quarterBox?.width).toBeTruthy();

    await selectPrintSize(page, /Letter \(8\.5/i);
    await expect(
      page.getByText(/Preview at Letter/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(root.locator("[data-canvas-url]")).toBeVisible();

    const letterBox = await root.boundingBox();
    expect(letterBox?.width ?? 0).toBeGreaterThan((quarterBox?.width ?? 0) + 40);

    const letter = await measureUrlLayout(page);
    expectUrlLayout(letter, { label: "letter" });
    expect(letter.minFontPx).toBeGreaterThanOrEqual(quarter.minFontPx);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "letter",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "letter");
  });

  test("qr-card reference preset keeps a square QR on quarter and Letter", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-card/?preset=rightToRefuse");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "rightToRefuse");

    await enableShowUrl(page, /Show URL under tagline/i);
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "reference-quarter",
      slots: 1,
    });
    expectUrlLayout(await measureUrlLayout(page), { label: "reference-quarter" });

    await selectPrintSize(page, /Letter \(8\.5/i);
    await expect(
      page.getByText(/Preview at Letter/i),
    ).toBeVisible({ timeout: 10_000 });
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "reference-letter",
      slots: 1,
    });
    expectUrlLayout(await measureUrlLayout(page), { label: "reference-letter" });
    expectPreviewFitsColumn(await measurePreviewFit(page), "reference-letter");
  });

  test("qr-card rightToRefuse quarter packs readable description without dead clamp", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-card/?preset=rightToRefuse");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "rightToRefuse");
    const root = await waitForQrPreview(page);

    const body = root.locator("[data-wallet-body]");
    await expect(body).toBeVisible();
    await expect(body).toContainText(/OHSA/i);
    await expect(body).toContainText(/Not legal advice/i);
    await expect(body).not.toHaveCSS("display", "-webkit-box");

    const report = await root.evaluate((el) => {
      const bodyEl = el.querySelector("[data-wallet-body]") as HTMLElement | null;
      const plateEl = el.querySelector("[data-qr-plate]") as HTMLElement | null;
      const copyEl = el.querySelector("[data-wallet-copy]") as HTMLElement | null;
      if (!bodyEl || !plateEl || !copyEl) return null;
      const bodyRect = bodyEl.getBoundingClientRect();
      const plateRect = plateEl.getBoundingClientRect();
      const rootRect = el.getBoundingClientRect();
      const scale = rootRect.height / Math.max(1, (el as HTMLElement).offsetHeight);
      return {
        bodyFontPx: parseFloat(getComputedStyle(bodyEl).fontSize),
        designGapPx: (plateRect.top - bodyRect.bottom) / scale,
        clamped: copyEl.getAttribute("data-wallet-copy-clamped") === "true",
        text: (bodyEl.textContent ?? "").trim(),
      };
    });

    expect(report).not.toBeNull();
    expect(report!.bodyFontPx).toBeGreaterThanOrEqual(13);
    expect(report!.clamped).toBe(false);
    expect(report!.text.endsWith("…") || report!.text.endsWith("...")).toBe(
      false,
    );
    // Content gap is small; do not leave a large unused band while copy fits.
    expect(report!.designGapPx).toBeLessThan(48);
  });

  test("qr-card square 5×5 keeps plate geometry and readable type", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-card/?preset=joinPartTime");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "joinPartTime");

    await selectPrintSize(page, /Square 5×5/i);
    await expect(page.getByText(/Preview at Square 5×5/i)).toBeVisible({
      timeout: 10_000,
    });
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "square5-link",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "square5-link");

    const titleSize = await page
      .locator("[data-export-root] h2")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // Preferred square title is larger; WalletCopyBlock may shrink to fit body.
    expect(titleSize).toBeGreaterThanOrEqual(18);
  });

  test("qr-card Letter stays uncropped at phone width", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/tools/qr-card/?preset=getSupport");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await enableShowUrl(page, /Show URL under tagline/i);
    await selectPrintSize(page, /Letter \(8\.5/i);
    await openPreviewTab(page);
    const root = await waitForQrPreview(page);
    const fit = page.locator("[data-fit-width]");
    await expect(fit).toBeVisible();
    const fitBox = await fit.boundingBox();
    const rootBox = await root.boundingBox();
    expect(rootBox?.width ?? 0).toBeLessThanOrEqual((fitBox?.width ?? 0) + 2);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "qr-card-390-letter",
      slots: 1,
    });
    expectUrlLayout(await measureUrlLayout(page), { label: "qr-card-390-letter" });
    expectPreviewFitsColumn(await measurePreviewFit(page), "qr-card-390-letter");
  });

  test("qr-board presets keep QRs uncropped and branding in the header", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page);

    for (const preset of LAYOUT_CLASS_QR_BOARD) {
      await page.goto(`/en/tools/qr-board/?preset=${preset.id}`);
      await expect(
        page.getByRole("heading", { name: "QR Board Poster Maker" }),
      ).toBeVisible();
      await expectPresetSelected(page, preset.id);
      await enableShowUrl(page, /Show URL under each QR/i);

      const root = await waitForQrPreview(page);
      const captions = root.locator("[data-canvas-url]");
      await expect(captions).toHaveCount(preset.slots, { timeout: 15_000 });
      await expect(root).toHaveAttribute(
        "data-qr-board-density",
        preset.slots <= 2 ? "roomy" : preset.slots <= 4 ? "regular" : "compact",
      );

      if (preset.id === "fullBoard") {
        await expect(captions.nth(4)).toContainText("ontario.ca");
        await expect(captions.nth(4)).not.toContainText("https://");
      }

      const layout = await measureUrlLayout(page);
      expectUrlLayout(layout, { urlCount: preset.slots, label: preset.id });
      expect(layout.minFontPx, preset.id).toBeGreaterThanOrEqual(9);

      expectPlateGeometry(await measurePlateFill(page), {
        label: preset.id,
        slots: preset.slots,
        minImgPx: preset.minImgPx,
      });
    }
  });

  test("qr-board 4-up stays uncropped when the preview column shrinks", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/tools/qr-board/?preset=coreLinks");
    await expect(
      page.getByRole("heading", { name: "QR Board Poster Maker" }),
    ).toBeVisible();
    await enableShowUrl(page, /Show URL under each QR/i);
    await openPreviewTab(page);

    const root = await waitForQrPreview(page);
    await expect(root.locator("[data-canvas-url]")).toHaveCount(4, {
      timeout: 15_000,
    });

    const fit = page.locator("[data-fit-width]");
    await expect(fit).toBeVisible();
    const fitBox = await fit.boundingBox();
    const rootBox = await root.boundingBox();
    expect(fitBox?.width ?? 0).toBeGreaterThan(0);
    expect(rootBox?.width ?? 0).toBeLessThanOrEqual((fitBox?.width ?? 0) + 2);

    expectPlateGeometry(await measurePlateFill(page), {
      label: "4-up-390",
      slots: 4,
      minImgPx: 40,
    });
    expectUrlLayout(await measureUrlLayout(page), { label: "4-up-390" });
  });

  test("qr-board tabloid FitWidth keeps 4-up inside the column", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-board/?preset=coreLinks");
    await expect(
      page.getByRole("heading", { name: "QR Board Poster Maker" }),
    ).toBeVisible();
    await enableShowUrl(page, /Show URL under each QR/i);
    await selectPrintSize(page, /Tabloid \(11/i);
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "tabloid",
      slots: 4,
    });
    expectUrlLayout(await measureUrlLayout(page), { urlCount: 4, label: "tabloid" });
    expectPreviewFitsColumn(await measurePreviewFit(page), "tabloid");
  });

  test("action-card URL caption stays below QR when shown", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/action-card/?preset=signPetition");
    await expect(
      page.getByRole("heading", { name: "Action Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "signPetition");

    await enableShowUrl(page, /Show URL under the call to action/i);
    await page.getByLabel(/Petition \/ sign-on link/i).fill(LONG_URL);

    const root = await waitForQrPreview(page);
    await expect(root.locator("[data-canvas-url]")).toContainText("ontario.ca");

    expectUrlLayout(await measureUrlLayout(page), {
      urlCount: 1,
      label: "action-quarter",
    });
    expectPlateGeometry(await measurePlateFill(page), {
      label: "action-quarter",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "action-quarter");

    await selectPrintSize(page, /Letter \(8\.5/i);
    await expect(
      page.getByText(/Preview at Letter/i),
    ).toBeVisible({ timeout: 10_000 });
    await waitForQrPreview(page);
    expectUrlLayout(await measureUrlLayout(page), { label: "action-letter" });
    expectPlateGeometry(await measurePlateFill(page), {
      label: "action-letter",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "action-letter");
  });
});
