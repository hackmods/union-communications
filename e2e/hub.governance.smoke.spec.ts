import { test, expect } from "@playwright/test";
import {
  clearAuthSession,
  loginAsMember,
  loginAsPresident,
} from "./helpers/auth";

/**
 * Hub governance: bylaw draft lifecycle, proposal package casework, and the
 * member-safe Portal snapshot. Uses the B7P demo roster (Behind 7 Proxies).
 */
test.describe("Hub governance (bylaws + proposals) @smoke", () => {
  // Two demo accounts in one file — serialize to avoid session/MFA racing.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsPresident(page);
  });

  test("bylaws board lists and creates a draft", async ({ page }) => {
    await page.goto("/en/app/bylaws");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Local bylaws|Règlements locaux/i,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: /New draft|Nouveau brouillon/i }).click();
    await page.getByLabel(/Title|Titre/i).fill("Smoke bylaw revision");
    await page.getByRole("button", { name: /Save draft|Enregistrer le brouillon/i }).click();

    // Title can appear in the list row and the open editor — assert any one.
    await expect(
      page.getByText(/Smoke bylaw revision/, { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: /Preview|Aperçu/i }).first().click();
    await expect(page.getByText(/Draft created|Brouillon créé/i).first()).toBeVisible();
  });

  test("proposals board creates a package and opens casework", async ({
    page,
  }) => {
    await page.goto("/en/app/proposals");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Bargaining proposals|Propositions de négociation/i,
      }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /New package|Nouveau paquet/i })
      .click();
    await page.getByLabel(/Package name|Nom du paquet/i).fill("Smoke 2026 round");
    await page.getByRole("button", { name: /Save|Enregistrer/i }).click();

    const openLink = page.getByRole("link", { name: /Open|Ouvrir/i }).first();
    await expect(openLink).toBeVisible();
    await openLink.click();

    // Package workspace heading + row editor + publish form.
    await expect(
      page.getByRole("heading", { level: 1, name: "Smoke 2026 round" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Add row|Ajouter une ligne/i }).click();
    await page
      .getByLabel(/Article \/ Section/i)
      .first()
      .fill("Article 12.01");

    // Publish a member-safe snapshot.
    await page.getByLabel(/Headline|Titre/i).first().fill("Smoke round: what we are asking for");
    await page.getByLabel(/Key points|Points clés/i).fill("Wage grid protection");
    await page.getByRole("button", { name: /^Publish|Publier$/i }).click();
    // Badge shows on the header and on the publication card — assert any one.
    await expect(page.getByText(/Published to Local Portal/i).first()).toBeVisible();
  });

  test("member Portal shows the published proposal snapshot", async ({
    page,
  }) => {
    await clearAuthSession(page);
    await loginAsMember(page);

    await page.goto("/en/portal/proposals");
    await expect(
      page.getByRole("heading", {
        // PortalPanel clusters titles at level 2 inside the page region.
        name: /Bargaining proposals|Propositions de négociation/i,
      }),
    ).toBeVisible();
    // Headline / key points can render in the card chrome and body.
    await expect(
      page.getByText("Smoke round: what we are asking for", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Wage grid protection", { exact: true }).first(),
    ).toBeVisible();
  });
});