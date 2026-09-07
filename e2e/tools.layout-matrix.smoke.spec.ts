import { test, expect } from "@playwright/test";
import { FLYER_PRESETS } from "../src/lib/comms/flyer-presets";
import { QUOTE_PRESETS } from "../src/lib/comms/quote-presets";
import {
  LAYOUT_CLASS_FLYER,
  LAYOUT_CLASS_GRAPHIC,
  LAYOUT_CLASS_GRAPHIC_LAYOUT,
  LAYOUT_CLASS_MEETING,
  LAYOUT_CLASS_QUOTE,
  LAYOUT_CLASS_SOLIDARITY,
} from "../src/lib/comms/layout-class-matrix";
import { seedCanvasFonts } from "./helpers/canvas-fonts";
import {
  expectCanvasProportions,
  expectLeadReadable,
  expectMetaSupport,
  expectPlateGeometry,
  expectPreviewFitsColumn,
  expectTypeMetaClear,
  expectUrlLayout,
  measureCanvasProportions,
  measureLeadReadable,
  measureLeadTypeOverlap,
  measureMetaSupport,
  measurePlateFill,
  measurePreviewFit,
  measureTypeMetaOverlap,
  measureUrlLayout,
  openLayoutSection,
  openPreviewTab,
  waitForExportRoot,
  waitForQrPreview,
} from "./helpers/canvas-layout";

const FLYER_LAYOUT_RADIO: Record<string, RegExp> = {
  band: /Colour band/i,
  stack: /^Stack$/i,
  split: /^Split$/i,
};

const GRAPHIC_LAYOUT_RADIO: Record<string, RegExp> = {
  notice: /^Notice$/i,
  solidarity: /^Solidarity$/i,
  spotlight: /^Spotlight$/i,
};

const QUOTE_LAYOUT_RADIO: Record<string, RegExp> = {
  stripe: /^Stripe$/i,
  centered: /^Centered$/i,
  mark: /^Large mark$/i,
};

const SOLIDARITY_LAYOUT_RADIO: Record<string, RegExp> = {
  stack: /^Stack/i,
  split: /^Split/i,
  banner: /^Banner/i,
};

const FLYER_PRESET_COPY: Record<
  (typeof LAYOUT_CLASS_FLYER)[number],
  { headline: RegExp; body: RegExp }
> = {
  picket: {
    headline: /PICKET LINE/i,
    body: /Stand with your co-workers/i,
  },
  rally: {
    headline: /RALLY FOR A FAIR CONTRACT/i,
    body: /Hear updates from the bargaining team/i,
  },
  meeting: {
    headline: /General Membership Meeting/i,
    body: /All members welcome/i,
  },
  walkabout: {
    headline: /UNION WALKABOUT/i,
    body: /Meet your stewards/i,
  },
};

const GRAPHIC_PRESET_HEADLINE: Record<
  (typeof LAYOUT_CLASS_GRAPHIC)[number],
  RegExp
> = {
  agmNotice: /Annual General Meeting/i,
  bargainingUpdate: /Bargaining Update/i,
  strikeAction: /Strike Action/i,
  memberSpotlight: /Member Spotlight/i,
};

async function expectLayoutRadio(
  page: import("@playwright/test").Page,
  name: RegExp,
): Promise<void> {
  await openLayoutSection(page);
  await expect(
    page.getByRole("radiogroup", { name: /^Layout$/i }).getByRole("radio", {
      name,
    }),
  ).toBeChecked();
}

async function expectExportCopy(
  page: import("@playwright/test").Page,
  patterns: RegExp[],
  label: string,
): Promise<void> {
  const root = page.locator("[data-export-root]").first();
  await expect(root, label).toBeVisible();
  for (const pattern of patterns) {
    await expect(root.getByText(pattern), `${label} ${pattern}`).toBeVisible();
  }
}

test.describe("Canvas layout-class matrix @smoke", () => {
  test("flyer presets apply unique layouts without cropping", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page);

    for (const id of LAYOUT_CLASS_FLYER) {
      const preset = FLYER_PRESETS[id];
      const copy = FLYER_PRESET_COPY[id];
      await page.goto(`/en/tools/flyer-maker/?preset=${id}`);
      await expect(
        page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
      ).toBeVisible();
      await expectLayoutRadio(page, FLYER_LAYOUT_RADIO[preset.layout]);

      if (preset.showQr) {
        await waitForQrPreview(page);
        expectPlateGeometry(await measurePlateFill(page), {
          label: id,
          slots: 1,
        });
        expectUrlLayout(await measureUrlLayout(page), { label: id });
      } else {
        await waitForExportRoot(page);
        const fill = await measurePlateFill(page);
        expect(fill.imgCount, id).toBe(0);
      }
      expectPreviewFitsColumn(await measurePreviewFit(page), id);
      if (id === "picket" || id === "rally") {
        const props = await measureCanvasProportions(page);
        expectCanvasProportions(props, {
          label: `flyer-${id}-logo`,
          maxLogoPct: 42,
        });
      }
      await expectExportCopy(page, [copy.headline, copy.body], `flyer-${id}`);
      expectMetaSupport(await measureMetaSupport(page), `flyer-${id}-meta`);
      if (id === "picket" || id === "rally" || id === "walkabout") {
        expectTypeMetaClear(
          await measureTypeMetaOverlap(page),
          `flyer-${id}-type/meta`,
        );
      }
    }
  });

  test("flyer logo share stays stable across paper sizes", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/flyer-maker/?preset=rally");
    await expect(
      page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
    ).toBeVisible();
    await waitForQrPreview(page);

    const sizes = [
      { name: "Letter (8.5×11)", id: "letter" },
      { name: "Half letter (5.5×8.5)", id: "halfLetter" },
      { name: "Tabloid (11×17)", id: "tabloid" },
    ] as const;
    const logoPcts: number[] = [];
    for (const size of sizes) {
      await openLayoutSection(page);
      await page
        .getByRole("radiogroup", { name: /^Paper size$/i })
        .getByRole("radio", { name: size.name, exact: true })
        .click();
      await waitForQrPreview(page);
      const props = await measureCanvasProportions(page);
      expectCanvasProportions(props, {
        label: `flyer-${size.id}`,
        maxLogoPct: 42,
      });
      logoPcts.push(props.logoPct);
    }
    const spread = Math.max(...logoPcts) - Math.min(...logoPcts);
    expect(spread, "logo% spread across paper sizes").toBeLessThanOrEqual(12);
  });

  test("flyer cold load matches Picket line starter", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/flyer-maker/");
    await expect(
      page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Picket line/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expectLayoutRadio(page, FLYER_LAYOUT_RADIO.band);
    await waitForExportRoot(page);
    await expectExportCopy(
      page,
      [FLYER_PRESET_COPY.picket.headline, FLYER_PRESET_COPY.picket.body],
      "flyer-cold-picket",
    );
  });

  test("flyer walkabout split has no type/meta overlap", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/flyer-maker/?preset=walkabout");
    await expect(
      page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
    ).toBeVisible();
    await expectLayoutRadio(page, FLYER_LAYOUT_RADIO.split);
    await waitForQrPreview(page);
    expectTypeMetaClear(
      await measureTypeMetaOverlap(page),
      "flyer-walkabout-type/meta",
    );
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "flyer-walkabout",
    );
    await expectExportCopy(
      page,
      [
        /UNION WALKABOUT/i,
        /Meet your stewards/i,
        /Your department/i,
      ],
      "flyer-walkabout",
    );
  });

  test("flyer meeting stack keeps supporting details readable", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/flyer-maker/?preset=meeting");
    await expectLayoutRadio(page, FLYER_LAYOUT_RADIO.stack);
    await waitForQrPreview(page);
    expectTypeMetaClear(
      await measureTypeMetaOverlap(page),
      "flyer-meeting-type/meta",
    );
    await expectExportCopy(
      page,
      [/General Membership Meeting/i, /All members welcome/i],
      "flyer-meeting",
    );
  });

  test("flyer letter stays uncropped at phone width", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/tools/flyer-maker/?preset=rally");
    await expect(
      page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
    ).toBeVisible();
    await expectLayoutRadio(page, FLYER_LAYOUT_RADIO.stack);
    await openPreviewTab(page);
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "flyer-390-letter",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "flyer-390-letter");
    await expectExportCopy(
      page,
      [FLYER_PRESET_COPY.rally.headline, FLYER_PRESET_COPY.rally.body],
      "flyer-390-rally",
    );
  });

  test("flyer half-letter walkabout keeps full location line", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/flyer-maker/?preset=walkabout");
    await expect(
      page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
    ).toBeVisible();
    await openLayoutSection(page);
    await expect(
      page
        .getByRole("radiogroup", { name: /^Paper size$/i })
        .getByRole("radio", { name: /Half letter/i }),
    ).toHaveAttribute("aria-checked", "true");
    await waitForQrPreview(page);
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "flyer-half-letter-walkabout",
    );
    expectTypeMetaClear(
      await measureTypeMetaOverlap(page),
      "flyer-half-letter-type/meta",
    );
    await expectExportCopy(
      page,
      [
        /UNION WALKABOUT/i,
        /Meet your stewards/i,
        /Your department/i,
      ],
      "flyer-half-letter-walkabout",
    );
  });

  test("graphic maker presets apply layout classes", async ({ page }) => {
    test.setTimeout(120_000);
    await seedCanvasFonts(page);

    for (const id of LAYOUT_CLASS_GRAPHIC) {
      const layout = LAYOUT_CLASS_GRAPHIC_LAYOUT[id];
      await page.goto(`/en/tools/graphic-maker/?preset=${id}`);
      await expect(
        page.getByRole("heading", { name: "Graphic Maker" }),
      ).toBeVisible();
      await expectLayoutRadio(page, GRAPHIC_LAYOUT_RADIO[layout]);
      await waitForExportRoot(page);
      expectPreviewFitsColumn(await measurePreviewFit(page), id);
      await expectExportCopy(
        page,
        [GRAPHIC_PRESET_HEADLINE[id]],
        `graphic-${id}`,
      );
    }

    await page.goto(
      "/en/tools/graphic-maker/?preset=strikeAction&aspect=portrait",
    );
    await expect(
      page.getByRole("heading", { name: "Graphic Maker" }),
    ).toBeVisible();
    await openLayoutSection(page);
    await expect(
      page.getByRole("radiogroup", { name: /^Format$/i }).getByRole("radio", {
        name: /Portrait \(Reels\)/i,
      }),
    ).toBeChecked();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "graphic-portrait-9-16",
    );
  });

  test("graphic maker cold load is Member Spotlight", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: "Graphic Maker" }),
    ).toBeVisible();
    await expectLayoutRadio(page, GRAPHIC_LAYOUT_RADIO.spotlight);
    await waitForExportRoot(page);
    await expectExportCopy(
      page,
      [/Member Spotlight/i],
      "graphic-cold-spotlight",
    );
  });
  test("solidarity one slogan per layout plus 16:9", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page);

    for (const row of LAYOUT_CLASS_SOLIDARITY) {
      await page.goto(`/en/tools/solidarity-poster/?preset=${row.id}`);
      await expect(
        page.getByRole("heading", { name: "Solidarity Poster Maker" }),
      ).toBeVisible();
      await expect(page.locator("#slogan-preset")).toHaveValue(row.id);
      await expectLayoutRadio(page, SOLIDARITY_LAYOUT_RADIO[row.layout]);
      await waitForQrPreview(page);
      expectPlateGeometry(await measurePlateFill(page), {
        label: row.id,
        slots: 1,
      });
      expectPreviewFitsColumn(await measurePreviewFit(page), row.id);
    }

    await page.goto("/en/tools/solidarity-poster/?preset=solidarity-forever");
    await expect(page.locator("#slogan-preset")).toHaveValue(
      "solidarity-forever",
    );
    await openLayoutSection(page);
    await page.getByRole("radio", { name: /^Digital$/i }).click();
    await page.getByRole("radio", { name: /Desktop 16:9/i }).click();
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "solidarity-16-9",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "solidarity-16-9");

    // Default stack + lockup: type must not paint over lead/logo or footer/QR.
    await page.goto("/en/tools/solidarity-poster/?preset=solidarity-forever");
    await expect(page.locator("#slogan-preset")).toHaveValue(
      "solidarity-forever",
    );
    await waitForQrPreview(page);
    expectTypeMetaClear(
      await measureTypeMetaOverlap(page),
      "solidarity-forever-type/footer",
    );
    expectTypeMetaClear(
      await measureLeadTypeOverlap(page),
      "solidarity-forever-lead/type",
    );
    expectLeadReadable(
      await measureLeadReadable(page),
      "solidarity-forever-lead-width",
    );
    await expectExportCopy(
      page,
      [/Keep calm and/i, /SOLIDARITY/i, /Together we win/i],
      "solidarity-forever-copy",
    );
  });

  test("meeting background bold then minimal", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto(
      `/en/tools/meeting-background/?preset=${LAYOUT_CLASS_MEETING}`,
    );
    await expect(
      page.getByRole("heading", { name: "Meeting Background Maker" }),
    ).toBeVisible();
    await expect(page.locator("#meeting-preset")).toHaveValue(
      LAYOUT_CLASS_MEETING,
    );
    // Design/Layout SegControls live in ToolFormDetails (collapsed by default).
    const layoutDetails = page
      .locator("details")
      .filter({ hasText: /Layout and design/i });
    await expect(layoutDetails).toHaveCount(1);
    await layoutDetails.locator("summary").click();
    await expect(
      page.getByRole("radiogroup", { name: /^Design$/i }).getByRole("radio", {
        name: /^Bold$/i,
      }),
    ).toBeChecked();
    await expect(
      page.getByRole("radiogroup", { name: /^Layout$/i }).getByRole("radio", {
        name: /Lower third/i,
      }),
    ).toBeChecked();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "meeting-bold");
    await expectExportCopy(
      page,
      [/Keep calm and/i, /SOLIDARITY/i, /Together we win/i],
      "meeting-bold-copy",
    );

    await page
      .getByRole("radiogroup", { name: /^Design$/i })
      .getByRole("radio", { name: /^Minimal$/i })
      .click();
    await expect
      .poll(async () => {
        return page
          .getByRole("radiogroup", { name: /^Layout$/i })
          .getByRole("radio", { name: /Footer/i })
          .isChecked();
      }, { timeout: 10_000 })
      .toBe(true);
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "meeting-minimal");
    await expectExportCopy(
      page,
      [/Keep calm and/i, /SOLIDARITY/i, /Together we win/i],
      "meeting-minimal-copy",
    );
  });

  test("meeting background cold load shows default slogan copy", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/meeting-background/");
    await expect(
      page.getByRole("heading", { name: "Meeting Background Maker" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    await expectExportCopy(
      page,
      [/Keep calm and/i, /SOLIDARITY/i, /Together we win/i],
      "meeting-cold",
    );
  });

  test("quote card presets apply unique layouts without cropping", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page);

    for (const id of LAYOUT_CLASS_QUOTE) {
      const preset = QUOTE_PRESETS[id];
      await page.goto(`/en/tools/quote-card/?preset=${id}`);
      await expect(
        page.getByRole("heading", { name: "Quote Card Generator" }),
      ).toBeVisible();
      await waitForExportRoot(page);
      expectPreviewFitsColumn(await measurePreviewFit(page), `quote-${id}`);
      const patterns = [new RegExp(preset.quote.slice(0, 24), "i")];
      if (preset.role.trim()) {
        patterns.push(new RegExp(preset.role, "i"));
      }
      await expectExportCopy(page, patterns, `quote-${id}`);
      await expectLayoutRadio(page, QUOTE_LAYOUT_RADIO[preset.layout]);
    }
  });

  test("quote card default export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/quote-card/");
    await expect(
      page.getByRole("heading", { name: "Quote Card Generator" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "quote-card");
    await expectExportCopy(
      page,
      [
        /We will not accept anything less/i,
        /Bargaining committee/i,
      ],
      "quote-cold-bargaining",
    );
  });

  test("quote card portrait export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/quote-card/?aspect=portrait");
    await expect(
      page.getByRole("heading", { name: "Quote Card Generator" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "quote-card-portrait",
    );
  });

  test("board notice default export root fits the column without type/meta overlap", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/board-notice/");
    await expect(
      page.getByRole("heading", { name: "Board Notice Maker" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "board-notice");
    expectTypeMetaClear(
      await measureTypeMetaOverlap(page),
      "board-notice-type-meta",
    );
    const root = page.locator("[data-export-root]");
    await expect(root.getByText(/GENERAL MEMBERSHIP MEETING/i)).toBeVisible();
    await expect(
      root.getByText(/All members are invited to attend/i),
    ).toBeVisible();
    await expect(root.getByText(/Union office, Room S206/i)).toBeVisible();
    await expect(
      root.getByText(/Questions\? Email your steward or local executive/i),
    ).toBeVisible();

    const contactInBounds = await page.evaluate(() => {
      const exportRoot = document.querySelector("[data-export-root]");
      const meta = exportRoot?.querySelector("[data-canvas-meta]");
      if (!exportRoot || !meta) return { ok: false, reason: "missing nodes" };
      const rootBox = exportRoot.getBoundingClientRect();
      const metaBox = meta.getBoundingClientRect();
      const pad = 1;
      if (metaBox.bottom > rootBox.bottom + pad) {
        return {
          ok: false,
          reason: `meta bottom ${metaBox.bottom} past root ${rootBox.bottom}`,
        };
      }
      if (metaBox.left < rootBox.left - pad) {
        return {
          ok: false,
          reason: `meta left ${metaBox.left} before root ${rootBox.left}`,
        };
      }
      return { ok: true, reason: "" };
    });
    expect(contactInBounds.ok, contactInBounds.reason).toBe(true);
    expectMetaSupport(await measureMetaSupport(page), "board-notice-meta");
  });

  test("board notice stack survives long steward copy without type/meta overlap", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/tools/board-notice/");
    await expect(
      page.getByRole("heading", { name: "Board Notice Maker" }),
    ).toBeVisible();
    await page.getByLabel(/^Headline$/i).fill(
      "GENERAL MEMBERSHIP MEETING — BARGAINING UPDATE AND STEWARD ELECTIONS FOR THE FULL MEMBERSHIP",
    );
    await page.getByLabel(/^Details$/i).fill(
      "All members are invited to attend. Agenda: bargaining update, steward reports, committee nominations, and an extended Q&A so every shift can be heard.",
    );
    await openPreviewTab(page);
    await waitForExportRoot(page);
    expectTypeMetaClear(
      await measureTypeMetaOverlap(page),
      "board-notice-long-copy",
    );
  });

  test("board banner default trim export root fits the column", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/board-banner/");
    await expect(
      page.getByRole("heading", { name: "Board Banner & Trim" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("radiogroup", { name: /^What to print$/i })
        .getByRole("radio", { name: /Frame trim/i }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Download ZIP" })).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "board-banner-trim-default",
    );
  });

  test("board banner header export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/board-banner/");
    await expect(
      page.getByRole("heading", { name: "Board Banner & Trim" }),
    ).toBeVisible();
    await page
      .getByRole("radiogroup", { name: /^What to print$/i })
      .getByRole("radio", { name: /Header banner/i })
      .click();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "board-banner-header");
  });

  test("pulse poll default export root when Hub-reachable", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const { loginAsDemoOfficer } = await import("./helpers/auth");
    await loginAsDemoOfficer(page);
    await seedCanvasFonts(page);
    await page.goto("/en/tools/pulse-poll/");
    if (!/\/tools\/pulse-poll/.test(page.url())) {
      test.skip(true, `Pulse Poll Hub not reachable (${page.url()})`);
    }
    const headingVisible = await page
      .getByRole("heading", {
        level: 1,
        name: /Pulse Poll Creator|Créateur de sondage éclair/i,
      })
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!headingVisible) {
      test.skip(true, "Pulse Poll canvas not on this host");
    }
    const appeared = await page
      .locator("[data-export-root]")
      .waitFor({ state: "visible", timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      test.skip(true, "Pulse Poll canvas not on this host");
    }
    expectPreviewFitsColumn(await measurePreviewFit(page), "pulse-poll");
  });
});
