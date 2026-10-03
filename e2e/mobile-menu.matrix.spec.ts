import { test, expect, type Page } from "@playwright/test";
import { loginAsDemoOfficer, loginAsPlatformAdmin } from "./helpers/auth";
import {
  assertMobileSheetCoversScrolledPage,
  assertNoHorizontalOverflow,
} from "./helpers/layout";

const PUBLIC_MENU_LABELS = [
  "Brand Kit",
  "Create",
  "Worksheets",
  "Learn",
  "Platform",
] as const;

async function assertScrolledPublicMenu(page: Page, width: number) {
  await page.setViewportSize({ width, height: 812 });
  if (!page.url().includes("/en/")) {
    await page.goto("/en/");
  }
  const scrolledCopy = page.getByText("What stays free?", { exact: true });
  await scrolledCopy.scrollIntoViewIfNeeded();

  const toggle = page.getByTestId("mobile-nav-toggle");
  await toggle.click();
  const drawer = page.getByTestId("mobile-nav-drawer");
  await expect(drawer).toBeVisible();
  for (const label of PUBLIC_MENU_LABELS) {
    await expect(
      drawer.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }

  await assertMobileSheetCoversScrolledPage(page, {
    drawer,
    chrome: toggle,
    covered: scrolledCopy,
  });
  await assertNoHorizontalOverflow(page);

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
}

/**
 * Mobile menu layout-state matrix from the 2026-09-25 mobile nav audit
 * (prompt 13). Public hamburger is below 1280px; Hub hamburger below 1536px.
 * Large-text cases cover Accessibility one-tap access (2026-09-26).
 */
const PUBLIC_WIDTHS = [360, 390, 768] as const;
const LARGE_TEXT_WIDTHS = [320, 360] as const;

test.describe("Public mobile menu matrix @smoke @mobile", () => {
  for (const width of PUBLIC_WIDTHS) {
    test(`public menu open/close/Escape at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/en/create/");
      const toggle = page.getByTestId("mobile-nav-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const drawer = page.getByTestId("mobile-nav-drawer");
      await expect(drawer).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(drawer).toHaveCount(0);

      await toggle.click();
      await expect(drawer).toBeVisible();
      await drawer.getByRole("link", { name: "Brand Kit", exact: true }).click();
      await expect(page).toHaveURL(/\/en\/create\/brand-kit\/?/);
      await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
    });
  }

  for (const width of LARGE_TEXT_WIDTHS) {
    test(`public menu + Accessibility at ${width}px with maximum text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/en/create/");
      await page.evaluate(() => {
        document.documentElement.dataset.fontSize = "maximum";
        document.documentElement.style.setProperty("--text-scale", "1.5");
      });

      await assertNoHorizontalOverflow(page);

      const accessibility = page.getByTestId("display-settings-toggle");
      await expect(accessibility).toBeVisible();
      await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);

      await accessibility.click();
      const panel = page.getByTestId("display-settings-panel");
      await expect(panel).toBeVisible();
      const radios = panel.getByRole("radio");
      await expect(radios.first()).toBeVisible();
      const radioBox = await radios.first().boundingBox();
      expect(radioBox).toBeTruthy();
      if (radioBox) {
        expect(radioBox.x).toBeGreaterThanOrEqual(0);
        expect(radioBox.x + radioBox.width).toBeLessThanOrEqual(width + 1);
      }

      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);

      const toggle = page.getByTestId("mobile-nav-toggle");
      await expect(toggle).toContainText(/Menu/i);
      await toggle.click();
      await expect(page.getByTestId("mobile-nav-drawer")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
    });
  }

  for (const width of PUBLIC_WIDTHS) {
    test(`public menu covers scrolled Home at ${width}px`, async ({ page }) => {
      await page.goto("/en/");
      await assertScrolledPublicMenu(page, width);
    });
  }

  for (const width of LARGE_TEXT_WIDTHS) {
    test(`public menu covers scrolled Home at ${width}px with maximum text`, async ({
      page,
    }) => {
      await page.goto("/en/");
      await page.evaluate(() => {
        document.documentElement.dataset.fontSize = "maximum";
        document.documentElement.style.setProperty("--text-scale", "1.5");
      });
      await assertScrolledPublicMenu(page, width);
    });
  }
});

test.describe("Hub mobile menu matrix @smoke @mobile", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsDemoOfficer(page);
  });

  for (const width of PUBLIC_WIDTHS) {
    test(`hub menu open/close/Escape at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en/app/");
      await expect(page.getByTestId("mobile-nav-toggle")).toHaveCount(0);
      const toggle = page.getByTestId("hub-nav-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const drawer = page.getByTestId("hub-nav-drawer");
      await expect(drawer).toBeVisible();
      await expect(page.getByTestId("mobile-site-section")).toBeVisible();
      await expect(drawer.getByTestId("hub-workspace-peers")).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Officer Hub", exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Local Portal", exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Grievances", exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Platform", exact: true }),
      ).toHaveCount(0);
      await expect(
        drawer.getByTestId("platform-operator-nav-link"),
      ).toHaveCount(0);

      await page.keyboard.press("Escape");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(drawer).toHaveCount(0);
    });
  }

  test("hub hamburger names the tool menu from sm widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/en/app/");
    const toggle = page.getByTestId("hub-nav-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("Tools");
  });

  for (const width of LARGE_TEXT_WIDTHS) {
    test(`hub menu + Accessibility at ${width}px with maximum text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en/app/");
      await page.evaluate(() => {
        document.documentElement.dataset.fontSize = "maximum";
        document.documentElement.style.setProperty("--text-scale", "1.5");
      });
      // Give sticky header / hub bar ResizeObservers a frame to remeasure.
      await page.waitForTimeout(50);

      await assertNoHorizontalOverflow(page);

      const accessibility = page.getByTestId("display-settings-toggle");
      await expect(accessibility).toBeVisible();
      await accessibility.click();
      const panel = page.getByTestId("display-settings-panel");
      await expect(panel).toBeVisible();
      const panelBox = await panel.boundingBox();
      expect(panelBox).toBeTruthy();
      if (panelBox) {
        expect(panelBox.x).toBeGreaterThanOrEqual(0);
        expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width + 1);
        expect(panelBox.y).toBeGreaterThanOrEqual(0);
        expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(900 + 1);
      }
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);

      const toggle = page.getByTestId("hub-nav-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toContainText("Tools");
      // Public Menu stays off on Hub — one hamburger only.
      await expect(page.getByTestId("mobile-nav-toggle")).toHaveCount(0);
      const toggleBox = await toggle.boundingBox();
      expect(toggleBox).toBeTruthy();
      if (toggleBox) {
        expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(width + 1);
      }

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      // Visible label stays short even while open; aria-label carries close.
      await expect(toggle).toContainText("Tools");
      await expect(toggle).not.toContainText(/Close hub menu|Fermer le menu/i);

      const drawer = page.getByTestId("hub-nav-drawer");
      await expect(drawer).toBeVisible();
      await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
      await expect(page.getByTestId("mobile-site-section")).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Brand Kit", exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Local Portal", exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Officer Hub", exact: true }),
      ).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Platform", exact: true }),
      ).toHaveCount(0);
      await expect
        .poll(async () => {
          const box = await drawer.boundingBox();
          return box ? Math.round(box.x + box.width) : Infinity;
        })
        .toBeLessThanOrEqual(width + 1);
      const drawerBox = await drawer.boundingBox();
      const toggleAfterOpen = await toggle.boundingBox();
      expect(drawerBox).toBeTruthy();
      expect(toggleAfterOpen).toBeTruthy();
      if (drawerBox && toggleAfterOpen) {
        // Drawer pins under the live Hub bar (below dual sticky chrome).
        expect(drawerBox.y).toBeGreaterThanOrEqual(
          toggleAfterOpen.y + toggleAfterOpen.height - 2,
        );
        const live = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          clientWidth: document.documentElement.clientWidth,
          visualWidth: window.visualViewport?.width ?? null,
          mq480: window.matchMedia("(min-width: 480px)").matches,
          styleWidth: document.querySelector("[data-testid='hub-nav-drawer']")
            ?.getAttribute("style"),
        }));
        expect(
          drawerBox.x + drawerBox.width,
          `drawer right=${drawerBox.x + drawerBox.width} requested=${width} live=${JSON.stringify(live)}`,
        ).toBeLessThanOrEqual(width + 1);
      }
      await assertNoHorizontalOverflow(page);

      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
  }

  test("hub menu stays under chrome after scroll with maximum text", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/en/app/");
    await page.evaluate(() => {
      document.documentElement.dataset.fontSize = "maximum";
      document.documentElement.style.setProperty("--text-scale", "1.5");
      window.scrollTo(0, 480);
    });
    const toggle = page.getByTestId("hub-nav-toggle");
    await toggle.click();
    const drawer = page.getByTestId("hub-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Brand Kit", exact: true }),
    ).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    const drawerBox = await drawer.boundingBox();
    expect(toggleBox).toBeTruthy();
    expect(drawerBox).toBeTruthy();
    expect(toggleBox!.y).toBeGreaterThanOrEqual(-1);
    expect(drawerBox!.y).toBeGreaterThanOrEqual(
      toggleBox!.y + toggleBox!.height - 2,
    );
    await expect(page.getByTestId("mobile-sheet-scrim")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
  });
});

test.describe("Hub mobile menu — platform operator @smoke @mobile", () => {
  test("operator drawer has Hub, Portal, and Site Admin — not the public Platform page", async ({
    page,
  }) => {
    await loginAsPlatformAdmin(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/en/app/");
    await page.getByTestId("hub-nav-toggle").click();
    const drawer = page.getByTestId("hub-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Officer Hub", exact: true }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Local Portal", exact: true }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Platform admin", exact: true }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Platform", exact: true }),
    ).toHaveCount(0);
    await expect(
      drawer.getByRole("link", { name: "Grievances", exact: true }),
    ).toBeVisible();
    await expect(drawer.getByTestId("hub-drawer-empty-work")).toHaveCount(0);
  });
});

